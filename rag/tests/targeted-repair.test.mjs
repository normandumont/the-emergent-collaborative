import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { fixture, config, clock, temporaryStore } from "./helpers.mjs";
import { PubmedClient } from "../lib/discovery/pubmed-client.js";
import { fetchPubmed } from "../lib/ingestion/fetch-pubmed.js";
import {
  repairOptions,
  repairCachedIngestion,
} from "../lib/ingestion/repair.js";
import {
  planAcquisitionRetry,
  retryAcquisition,
} from "../lib/ingestion/retry-acquisition.js";
import { REQUEST_TIMEOUT_MS } from "../lib/shared/constants.js";

const root = fileURLToPath(new URL("../", import.meta.url));

for (const args of [["--help"], ["-h"], [], ["--cached-only"]])
  test(`repair CLI ${args.join(" ") || "(default)"} performs zero network/OpenAI calls`, () => {
    const script = `
      import assert from "node:assert/strict";
      import { registerHooks } from "node:module";
      import { mkdtemp, rm } from "node:fs/promises";
      import path from "node:path";
      import { tmpdir } from "node:os";
      let network = 0, forbidden = 0, writes = [];
      registerHooks({ resolve(specifier, context, next) {
        if (/openai|[\\\\/]indexing[\\\\/]|vector-sync/.test(specifier)) {
          forbidden++; throw new Error("Forbidden provider import");
        }
        return next(specifier, context);
      }});
      globalThis.fetch = async () => { network++; throw new Error("Forbidden external request"); };
      const { LocalStore } = await import("./lib/shared/storage.js");
      const directory = await mkdtemp(path.join(tmpdir(), "meridian-help-test-"));
      LocalStore.prototype.resolve = relative => path.join(directory, ...relative.split("/"));
      LocalStore.prototype.locked = operation => operation();
      LocalStore.prototype.catalog = async () => ({ schemaVersion: 1, articles: {} });
      LocalStore.prototype.writeJson = async relative => { writes.push(relative); };
      process.argv = ["node", "repair-corpus.js", ...${JSON.stringify(args)}];
      ${args.some((arg) => ["--help", "-h"].includes(arg)) ? 'process.env.NCBI_TOOL = "invalid tool";' : ""}
      try {
        await import("./lib/scripts/repair-corpus.js");
        assert.equal(process.exitCode ?? 0, 0);
        assert.equal(network, 0);
        assert.equal(forbidden, 0);
        ${args.length && ["--help", "-h"].includes(args[0]) ? "assert.deepEqual(writes, []);" : 'assert.deepEqual(writes, ["reports/cache-repair-latest.json"]);'}
        console.log("ZERO_EXTERNAL_PROVIDER_CALLS");
      } finally { await rm(directory, { recursive: true, force: true }); }
    `;
    const result = spawnSync(
      process.execPath,
      ["--input-type=module", "--eval", script],
      { cwd: root, encoding: "utf8", timeout: 30_000 },
    );
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.ok(result.stdout.includes("ZERO_EXTERNAL_PROVIDER_CALLS"));
    if (args.some((arg) => ["--help", "-h"].includes(arg))) {
      assert.ok(result.stdout.includes("Usage:"));
      assert.ok(result.stdout.includes("--retry-acquisition"));
    } else assert.ok(result.stdout.includes('"mode": "cached-only"'));
  });

test("repair flags require explicit network opt-in and reject unsafe mode combinations", () => {
  assert.deepEqual(repairOptions([]), {
    mode: "cached-only",
    normalizeCached: false,
  });
  assert.equal(repairOptions(["--cached-only"]).mode, "cached-only");
  assert.equal(
    repairOptions(["--retry-acquisition"]).mode,
    "retry-acquisition",
  );
  assert.equal(repairOptions(["--normalize-cached"]).normalizeCached, true);
  for (const args of [
    ["--retry-acquisition", "--cached-only"],
    ["--retry-acquisition", "--normalize-cached"],
    ["--refresh"],
    ["--cached-only", "--cached-only"],
  ])
    assert.throws(() => repairOptions(args), { category: "configuration" });
});

async function scenario(t) {
  const store = await temporaryStore(t);
  const cfg = await config();
  const sourceNode = (await fixture("pubmed.xml")).match(
    /<PubmedArticle>[\s\S]*?<\/PubmedArticle>/,
  )[0];
  const ids = Array.from({ length: 8 }, (_, index) => String(10001 + index));
  const source = `<PubmedArticleSet>${ids
    .map((id) =>
      sourceNode
        .replaceAll("10001", id)
        .replaceAll("20001", String(Number(id) + 10000)),
    )
    .join("")}</PubmedArticleSet>`;
  const sourceClient = new PubmedClient(
    cfg,
    async (url) => {
      assert.ok(String(url).endsWith("efetch.fcgi"));
      return new Response(source);
    },
    clock(),
  );
  await fetchPubmed(
    sourceClient,
    store,
    ids,
    "authored-retry-source",
    20,
    false,
  );
  const articles = Object.fromEntries(
    ids.map((id) => [
      id,
      {
        pmid: id,
        queryIds: ["pd_exercise"],
        topics: ["exercise"],
        firstDiscoveredAt: "2026-01-01T00:00:00Z",
        lastDiscoveredAt: "2026-01-01T00:00:00Z",
        lastIngestedAt: null,
        status: "error",
        errorCategory: "throttled",
      },
    ]),
  );
  articles["10001"].status = "normalized";
  articles["10001"].errorCategory = null;
  articles["10006"].status = "discovered";
  articles["10006"].errorCategory = null;
  articles["10007"].errorCategory = "configuration";
  articles["10008"].status = "normalized";
  articles["10008"].errorCategory = null;
  for (const id of ["10001", "10008"])
    await store.writeJson(`normalized/${id}.json`, {
      schemaVersion: 1,
      identity: { pmid: id },
      status: { normalized: true },
    });
  await store.saveCatalog({ schemaVersion: 1, articles });
  const time = clock();
  const calls = [];
  const failures = new Map();
  const metadata = await fixture("pmc-metadata.xml"),
    full = await fixture("pmc-full.xml");
  function body(pmcid, prefix, denied = false) {
    const id = String(Number(pmcid.slice(3)) - 10000);
    const xml = (prefix === "pmc_fm" ? metadata : full)
      .replaceAll("10001", id)
      .replaceAll("20001", pmcid.slice(3));
    return denied ? xml.replace("/licenses/by/", "/licenses/by-nc/") : xml;
  }
  const client = new PubmedClient(
    cfg,
    async (url, init) => {
      const parsed = new URL(url);
      assert.equal(
        parsed.hostname,
        "pmc.ncbi.nlm.nih.gov",
        "Targeted retry must never search or EFetch",
      );
      const pmcid = `PMC${parsed.searchParams.get("identifier").split(":").at(-1)}`;
      const prefix = parsed.searchParams.get("metadataPrefix");
      calls.push({ pmcid, prefix });
      const failure = failures.get(`${pmcid}:${prefix}`);
      if (failure === "throttled")
        return new Response("", {
          status: 429,
          headers: { "Retry-After": "0" },
        });
      if (failure === "network")
        throw new TypeError("Authored transient connection error");
      if (failure === "timeout")
        return new Promise((_resolve, reject) =>
          init.signal.addEventListener(
            "abort",
            () => reject(new Error("Authored timeout")),
            { once: true },
          ),
        );
      if (failure === "license-mismatch")
        return new Response(body(pmcid, prefix, true));
      return new Response(body(pmcid, prefix, pmcid === "PMC20004"));
    },
    time,
    () => 0,
  );
  async function cache(id, prefix, denied = false) {
    const pmcid = `PMC${Number(id) + 10000}`;
    const path = `raw/pmc/${pmcid}${prefix === "pmc_fm" ? ".metadata" : ""}.xml`;
    await store.raw(
      path,
      body(pmcid, prefix, denied),
      prefix === "pmc_fm" ? "pmc-front-matter" : "pmc-full-text",
      client.oaiUrl(pmcid, prefix),
      false,
    );
  }
  await cache("10003", "pmc_fm");
  await cache("10004", "pmc_fm", true);
  await cache("10005", "pmc_fm");
  await cache("10005", "pmc");
  return { store, cfg, client, calls, failures, time, cache };
}

test("read-only plan targets only technical errors and identifies front matter, permitted full text and nothing", async (t) => {
  const { store, cfg, calls } = await scenario(t);
  const catalog = await store.read("catalog.json");
  const plan = await planAcquisitionRetry(store, cfg);
  assert.equal(plan.targetPmids, 4);
  assert.equal(plan.skippedNormalized, 2);
  assert.equal(plan.frontMatterNeeded, 1);
  assert.equal(plan.fullTextNeeded, 1);
  assert.equal(plan.fullTextUndetermined, 1);
  assert.equal(plan.nothingNeeded, 2);
  assert.deepEqual(
    plan.targets.map((target) => target.pmid),
    ["10002", "10003", "10004", "10005"],
  );
  assert.deepEqual(calls, []);
  assert.equal(await store.read("catalog.json"), catalog);
  assert.equal(await store.read("reports/acquisition-retry-latest.json"), null);
});

test("retry fetches only missing artifacts, preserves healthy/source files and is idempotent", async (t) => {
  const { store, cfg, client, calls } = await scenario(t);
  await store.writeJson("corpus/retrieval-manifest.json", {
    healthy: ["10001"],
  });
  await store.writeJson("corpus/versions/10001/original.json", {
    version: "original",
  });
  const paths = [
    "catalog.json",
    "normalized/10001.json",
    "normalized/10008.json",
    "raw/pubmed/10002.json",
    "raw/pubmed/batches/authored-retry-source-0.xml",
    "raw/pubmed/batches/authored-retry-source-0.xml.provenance.json",
    "raw/pmc/PMC20003.metadata.xml",
    "raw/pmc/PMC20003.metadata.xml.provenance.json",
    "corpus/retrieval-manifest.json",
    "corpus/versions/10001/original.json",
  ];
  const before = await Promise.all(paths.map((path) => store.read(path)));
  assert.ok(
    before.every((value) => value !== null),
    "Preservation assertions must cover existing files",
  );
  const result = await retryAcquisition(store, cfg, client);
  assert.equal(result.repaired, 2);
  assert.equal(result.alreadyCached, 2);
  assert.equal(result.remaining, 0);
  assert.deepEqual(calls, [
    { pmcid: "PMC20002", prefix: "pmc_fm" },
    { pmcid: "PMC20002", prefix: "pmc" },
    { pmcid: "PMC20003", prefix: "pmc" },
  ]);
  assert.deepEqual(
    await Promise.all(paths.map((path) => store.read(path))),
    before,
  );
  assert.equal(
    await store.read("normalized/10002.json"),
    null,
    "Acquisition mode must not normalize",
  );
  const count = calls.length;
  const repeated = await retryAcquisition(store, cfg, client);
  assert.equal(repeated.repaired, 0);
  assert.equal(repeated.alreadyCached, 4);
  assert.equal(repeated.remaining, 0);
  assert.equal(calls.length, count);
  assert.equal(
    (await store.json("reports/acquisition-retry-latest.json")).status,
    "completed",
  );
});

test("front-matter-only retry never fetches a license-denied body", async (t) => {
  const { store, cfg, client, calls } = await scenario(t);
  const { unlink } = await import("node:fs/promises");
  await unlink(store.resolve("raw/pmc/PMC20004.metadata.xml"));
  await unlink(store.resolve("raw/pmc/PMC20004.metadata.xml.provenance.json"));
  const result = await retryAcquisition(store, cfg, client);
  assert.equal(result.remaining, 0);
  assert.ok(
    calls.some((call) => call.pmcid === "PMC20004" && call.prefix === "pmc_fm"),
  );
  assert.ok(
    !calls.some((call) => call.pmcid === "PMC20004" && call.prefix === "pmc"),
  );
  assert.equal(await store.read("raw/pmc/PMC20004.xml"), null);
});

test("resume reuses successful front matter after bounded full-text failure", async (t) => {
  const { store, cfg, client, calls, failures } = await scenario(t);
  failures.set("PMC20002:pmc", "network");
  const first = await retryAcquisition(store, cfg, client);
  assert.equal(first.remaining, 1);
  assert.equal(first.failed, 1);
  assert.equal(
    calls.filter((call) => call.pmcid === "PMC20002" && call.prefix === "pmc")
      .length,
    3,
  );
  const front = await store.read(
    "raw/pmc/PMC20002.metadata.xml.provenance.json",
  );
  failures.clear();
  calls.length = 0;
  const resumed = await retryAcquisition(store, cfg, client);
  assert.equal(resumed.remaining, 0);
  assert.equal(resumed.frontMatterNeeded, 0);
  assert.equal(resumed.fullTextNeeded, 1);
  assert.deepEqual(calls, [{ pmcid: "PMC20002", prefix: "pmc" }]);
  assert.equal(
    await store.read("raw/pmc/PMC20002.metadata.xml.provenance.json"),
    front,
  );
  assert.equal(
    (await store.json(`ingestion-runs/${first.runId}.json`)).status,
    "partial",
  );
});

test("throttling remains bounded to three attempts and leaves resumable failures", async (t) => {
  const { store, cfg, client, calls, failures } = await scenario(t);
  failures.set("PMC20002:pmc_fm", "throttled");
  const result = await retryAcquisition(store, cfg, client);
  assert.equal(result.throttled, 1);
  assert.equal(result.remaining, 1);
  assert.equal(calls.filter((call) => call.pmcid === "PMC20002").length, 3);
  assert.equal(await store.read("raw/pmc/PMC20002.metadata.xml"), null);
});

test("timeouts retain the existing thirty-second, three-attempt bound", async (t) => {
  const { store, cfg, client, calls, failures } = await scenario(t);
  t.mock.timers.enable({ apis: ["setTimeout"] });
  failures.set("PMC20002:pmc_fm", "timeout");
  const operation = retryAcquisition(store, cfg, client);
  for (let attempt = 1; attempt <= 3; attempt++) {
    while (calls.length < attempt)
      await new Promise((resolve) => setImmediate(resolve));
    t.mock.timers.tick(REQUEST_TIMEOUT_MS);
    await new Promise((resolve) => setImmediate(resolve));
  }
  const result = await operation;
  assert.equal(result.timeouts, 1);
  assert.equal(result.remaining, 1);
  assert.equal(calls.filter((call) => call.pmcid === "PMC20002").length, 3);
});

test("missing PubMed provenance or corrupt cached PMC bytes cannot trigger refetch", async (t) => {
  const { store, cfg, client, calls } = await scenario(t);
  await store.write("raw/pmc/PMC20003.metadata.xml", "<changed/>", true);
  const { unlink } = await import("node:fs/promises");
  await unlink(store.resolve("raw/pubmed/10002.json"));
  const result = await retryAcquisition(store, cfg, client);
  assert.equal(result.failed, 2);
  assert.equal(result.remaining, 2);
  assert.deepEqual(calls, []);
  assert.equal(
    result.outcomes.find((outcome) => outcome.pmid === "10003").failure
      .failureCode,
    "hash-mismatch",
  );
});

test("a valid normalized record is skipped even if its catalog acquisition flag is stale", async (t) => {
  const { store, cfg } = await scenario(t);
  await store.writeJson("normalized/10002.json", {
    schemaVersion: 1,
    identity: { pmid: "10002" },
    status: { normalized: true },
  });
  const plan = await planAcquisitionRetry(store, cfg);
  assert.equal(plan.targetPmids, 3);
  assert.ok(!plan.targets.some((target) => target.pmid === "10002"));
  assert.equal(plan.skippedNormalized, 3);
});

test("cached-only reference repair remains offline and distinct from acquisition retry", async (t) => {
  const { store, cfg, calls } = await scenario(t);
  const result = await repairCachedIngestion(store, cfg, false);
  assert.equal(result.networkAllowed, false);
  assert.equal(result.normalizedWritten, 0);
  assert.deepEqual(calls, []);
});

test("a full-text response that cannot be cached under licensing rules is not reported repaired", async (t) => {
  const { store, cfg, client, failures } = await scenario(t);
  failures.set("PMC20002:pmc", "license-mismatch");
  const result = await retryAcquisition(store, cfg, client);
  assert.equal(result.failed, 1);
  assert.equal(result.remaining, 1);
  assert.equal(await store.read("raw/pmc/PMC20002.xml"), null);
  const outcome = result.outcomes.find((entry) => entry.pmid === "10002");
  assert.equal(outcome.status, "failed");
  assert.equal(outcome.failure.failureCode, "raw-source-missing");
});

test("an interrupted raw/provenance pair is blocked before network, never overwritten", async (t) => {
  const { store, cfg, client, calls } = await scenario(t);
  const path = "raw/pmc/PMC20002.metadata.xml.provenance.json";
  await store.writeJson(path, { original: "orphaned provenance" });
  const original = await store.read(path);
  const result = await retryAcquisition(store, cfg, client);
  assert.equal(result.failed, 1);
  assert.ok(!calls.some((entry) => entry.pmcid === "PMC20002"));
  assert.equal(await store.read(path), original);
  assert.equal(await store.read("raw/pmc/PMC20002.metadata.xml"), null);
});

for (const [id, format] of [
  ["10002", "pmc_fm"],
  ["10003", "pmc"],
  ["10001", null],
  ["10005", null],
])
  test(`single-PMID diagnostic ${id} is read-only and fetches only ${format ?? "nothing"}`, async (t) => {
    const { store } = await scenario(t);
    const body = (
      await fixture(format === "pmc" ? "pmc-full.xml" : "pmc-metadata.xml")
    )
      .replaceAll("10001", id)
      .replaceAll("20001", String(Number(id) + 10000));
    const script = `
      import assert from "node:assert/strict";
      import path from "node:path";
      import { registerHooks } from "node:module";
      let requests = 0, forbidden = 0;
      registerHooks({ resolve(specifier, context, next) {
        if (/openai|[\\\\/]indexing[\\\\/]|vector-sync/.test(specifier)) {
          forbidden++; throw new Error("Forbidden provider import");
        }
        return next(specifier, context);
      }});
      const { LocalStore } = await import("./lib/shared/storage.js");
      LocalStore.prototype.resolve = relative => path.join(${JSON.stringify(store.directory)}, ...relative.split("/"));
      LocalStore.prototype.write = LocalStore.prototype.writeJson = LocalStore.prototype.locked =
        async () => { throw new Error("Diagnostic cannot modify data or acquire locks"); };
      globalThis.fetch = async (url, init) => {
        requests++;
        const parsed = new URL(url);
        assert.equal(parsed.hostname, "pmc.ncbi.nlm.nih.gov");
        assert.equal(parsed.searchParams.get("metadataPrefix"), ${JSON.stringify(format)});
        assert.equal(parsed.searchParams.get("identifier"), "oai:pubmedcentral.nih.gov:${Number(id) + 10000}");
        assert.equal(new Headers(init.headers).get("User-Agent"), "meridian-station-rag-prototype");
        return new Response(${JSON.stringify(body)});
      };
      process.argv = ["node", "test-pmc.js", ${JSON.stringify(id)}];
      await import("./lib/scripts/test-pmc.js");
      assert.equal(process.exitCode ?? 0, 0);
      assert.equal(requests, ${format ? 1 : 0});
      assert.equal(forbidden, 0);
      console.log("ZERO_EXTERNAL_PROVIDER_CALLS");
    `;
    const result = spawnSync(
      process.execPath,
      ["--input-type=module", "--eval", script],
      { cwd: root, encoding: "utf8", timeout: 30_000 },
    );
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.ok(result.stdout.includes('"cacheWrites":false'));
    assert.ok(result.stdout.includes("ZERO_EXTERNAL_PROVIDER_CALLS"));
  });
