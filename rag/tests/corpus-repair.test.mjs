import test from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { config, fixture, temporaryStore, clock } from "./helpers.mjs";
import { PubmedClient, retryDelay } from "../lib/discovery/pubmed-client.js";
import { parsePubmed, fetchPubmed } from "../lib/ingestion/fetch-pubmed.js";
import { ingest } from "../lib/ingestion/ingest.js";
import { repairCachedIngestion } from "../lib/ingestion/repair.js";
import { prepareCorpus } from "../lib/corpus/prepare.js";
import { loadCorpusConfig } from "../lib/corpus/config.js";
import {
  generateCorpusReport,
  buildCorpusReport,
} from "../lib/corpus/report.js";
import { portablePath, hash } from "../lib/shared/storage.js";
const id = "42928476";

async function good(t) {
  const store = await temporaryStore(t);
  const cfg = await config();
  const source = `<PubmedArticleSet>${(await fixture("pubmed.xml")).match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/)[0].replaceAll("10001", id)}</PubmedArticleSet>`;
  let network = 0;
  const client = new PubmedClient(
    cfg,
    async (url) => {
      network++;
      return new Response(
        String(url).endsWith("efetch.fcgi")
          ? source
          : (
              await fixture(
                new URL(url).searchParams.get("metadataPrefix") === "pmc_fm"
                  ? "pmc-metadata.xml"
                  : "pmc-full.xml",
              )
            ).replaceAll("10001", id),
      );
    },
    clock(),
  );
  assert.equal((await ingest(client, store, cfg, [id])).errors, 0);
  const catalog = await store.catalog();
  catalog.articles[id].queryIds = ["pd_exercise"];
  catalog.articles[id].topics = ["exercise"];
  await store.saveCatalog(catalog);
  const first = await prepareCorpus(store, cfg);
  assert.equal(first.errors, 0);
  assert.equal(first.manifest.entries[0].eligible, true);
  return {
    store,
    cfg,
    source,
    first: first.manifest.entries[0],
    client,
    network: () => network,
  };
}

test("42928476-shaped legacy cached RCT remains valid after expanded discovery relationships without changing content provenance", async (t) => {
  const { store, cfg, first, network } = await good(t);
  const base = await store.read(`normalized/${id}.json`);
  const version = await store.read(
    `corpus/versions/${id}/${first.normalizedRecordSha256}.json`,
  );
  const calls = network();
  const catalog = await store.catalog();
  assert.equal(catalog.articles[id].discoveredBy, undefined);
  catalog.articles[id].queryIds.push("pd_core_trials", "pd_sleep");
  catalog.articles[id].topics.push("clinical-trials", "sleep");
  catalog.articles[id].discoveredBy = [
    { queryId: "pd_exercise", topics: ["exercise"] },
    { queryId: "pd_core_trials", topics: ["clinical-trials"] },
    { queryId: "pd_sleep", topics: ["sleep"] },
  ];
  await store.saveCatalog(catalog);
  const result = await prepareCorpus(store, cfg);
  assert.equal(result.errors, 0);
  const next = result.manifest.entries[0];
  assert.equal(next.eligible, true);
  assert.equal(next.retrievalEnabled, true);
  assert.deepEqual(next.sourceSha256, first.sourceSha256);
  assert.equal(next.baseNormalizedSha256, first.baseNormalizedSha256);
  assert.equal(await store.read(`normalized/${id}.json`), base);
  assert.equal(
    await store.read(
      `corpus/versions/${id}/${first.normalizedRecordSha256}.json`,
    ),
    version,
  );
  assert.notEqual(next.normalizedRecordSha256, first.normalizedRecordSha256);
  assert.ok(next.topics.includes("sleep"));
  assert.equal(network(), calls);
});

test("acquisition-only missing sources do not poison healthy inventory and technical errors are not policy exclusions", async (t) => {
  const { store, cfg } = await good(t);
  const catalog = await store.catalog();
  catalog.articles["888888"] = {
    ...catalog.articles[id],
    pmid: "888888",
    status: "error",
    errorCategory: "timeout",
    corpus: undefined,
  };
  await store.saveCatalog(catalog);
  const result = await prepareCorpus(store, cfg);
  assert.equal(result.errors, 1);
  assert.equal(
    result.manifest.entries.find((entry) => entry.pmid === id).eligible,
    true,
  );
  const bad = result.manifest.entries.find((entry) => entry.pmid === "888888");
  assert.ok(bad.reasons.includes("technical-error:normalized-record-missing"));
  const report = await generateCorpusReport(store, await loadCorpusConfig());
  assert.equal(report.summary.manifestEntries, 2);
  assert.equal(report.summary.governedRecords, 1);
  assert.equal(report.summary.technicalErrors, 1);
  assert.equal(report.summary.excluded, 0);
  assert.equal(
    report.governance.technicalErrors[0].acquisitionCategory,
    "timeout",
  );
  const manifest = {
    ...result.manifest,
    entries: [
      ...result.manifest.entries,
      {
        ...result.manifest.entries.find((entry) => entry.pmid === id),
        pmid: "777777",
        status: "excluded",
        eligible: false,
        retrievalEnabled: false,
        reasons: [
          "excluded-publication-type:Editorial",
          "parkinsons-topic-match",
          "abstract-available",
        ],
      },
    ],
  };
  const separated = buildCorpusReport(
    await store.catalog(),
    manifest,
    (await loadCorpusConfig()).topics,
    new Map(),
    2026,
  );
  assert.equal(separated.summary.technicalErrors, 1);
  assert.equal(separated.summary.excluded, 1);
  assert.equal(
    separated.contentScope.exclusionReasons[
      "excluded-publication-type:Editorial"
    ],
    1,
  );
  assert.equal(
    separated.contentScope.exclusionReasons["parkinsons-topic-match"],
    undefined,
  );
});

test("portable paths accept both separator styles but reject absolute paths and traversal", async (t) => {
  const store = await temporaryStore(t);
  assert.equal(portablePath("raw\\pubmed\\123.json"), "raw/pubmed/123.json");
  await store.writeJson("raw/pubmed/123.json", { authored: true });
  assert.deepEqual(await store.json("raw\\pubmed\\123.json"), {
    authored: true,
  });
  for (const path of [
    "C:\\private\\source.json",
    "\\\\host\\share\\file",
    "../outside.json",
    "/absolute/file",
    "raw\\..\\outside",
  ])
    assert.throws(() => store.resolve(path), {
      failureCode: "normalized-path-invalid",
    });
});

for (const [name, expected, damage] of [
  [
    "missing normalized",
    "normalized-record-missing",
    async (store) => rm(store.resolve(`normalized/${id}.json`)),
  ],
  [
    "missing source reference",
    "provenance-file-missing",
    async (store) => rm(store.resolve(`raw/pubmed/${id}.json`)),
  ],
  [
    "missing raw",
    "raw-source-missing",
    async (store) =>
      rm(store.resolve((await store.json(`raw/pubmed/${id}.json`)).rawPath)),
  ],
  [
    "raw hash mismatch",
    "hash-mismatch",
    async (store) =>
      store.write(
        (await store.json(`raw/pubmed/${id}.json`)).rawPath,
        "<changed/>",
        true,
      ),
  ],
  [
    "missing version",
    "version-record-missing",
    async (store, first) =>
      rm(
        store.resolve(
          `corpus/versions/${id}/${first.normalizedRecordSha256}.json`,
        ),
      ),
  ],
  [
    "JSON read error",
    "JSON-read-error",
    async (store) => store.write(`normalized/${id}.json`, "{bad", true),
  ],
  [
    "unsupported normalized version",
    "unsupported-record-version",
    async (store) =>
      store.writeJson(
        `normalized/${id}.json`,
        { ...(await store.json(`normalized/${id}.json`)), schemaVersion: 2 },
        true,
      ),
  ],
])
  test(`${name} has an explicit safe preparation diagnostic`, async (t) => {
    const { store, cfg, first } = await good(t);
    await damage(store, first);
    const result = await prepareCorpus(store, cfg);
    assert.equal(result.errors, 1);
    const failed = result.manifest.entries[0];
    assert.equal(failed.status, "error");
    assert.equal(failed.retrievalEnabled, false);
    assert.ok(
      failed.reasons.includes(`technical-error:${expected}`),
      failed.reasons.join(", "),
    );
    assert.ok(
      failed.reasons.some((reason) =>
        reason.startsWith("technical-reference:"),
      ),
    );
  });

test("invalid catalog entries have a catalog-schema diagnostic", async (t) => {
  const { store } = await good(t);
  const catalog = await store.catalog();
  catalog.articles[id].queryIds = "wrong representation";
  await store.writeJson("catalog.json", catalog, true);
  await assert.rejects(store.catalog(), {
    failureCode: "catalog-schema-mismatch",
    reference: "catalog.json",
  });
});

test("a damaged historically ingested record still blocks other papers even if its acquisition status becomes error", async (t) => {
  const { store, cfg, source } = await good(t);
  const xml = source
    .replaceAll(id, "888888")
    .replace(/<ArticleId IdType="pmc">PMC20001<\/ArticleId>/, "");
  const client = new PubmedClient(cfg, async () => new Response(xml), clock());
  await ingest(client, store, cfg, ["888888"]);
  await prepareCorpus(store, cfg);
  const catalog = await store.catalog();
  catalog.articles[id].status = "error";
  catalog.articles[id].errorCategory = "storage";
  await store.saveCatalog(catalog);
  await rm(store.resolve(`raw/pubmed/${id}.json`));
  await rm(store.resolve(`normalized/${id}.json`));
  const result = await prepareCorpus(store, cfg);
  assert.equal(result.errors, 2);
  assert.ok(result.manifest.entries.every((entry) => !entry.retrievalEnabled));
  assert.ok(
    result.manifest.entries
      .find((entry) => entry.pmid === "888888")
      .reasons.includes("technical-error:relationship-inventory-incomplete"),
  );
});

test("article identifiers are read only from its own ArticleIdList, never a cited reference", async () => {
  const source = (await fixture("pubmed.xml")).replace(
    "<PubmedData/>",
    '<PubmedData><ReferenceList><Reference><ArticleIdList><ArticleId IdType="pmc">8060093</ArticleId><ArticleId IdType="doi">10.0000/cited-only</ArticleId></ArticleIdList></Reference></ReferenceList></PubmedData>',
  );
  const article = parsePubmed(source).get("10002");
  assert.equal(article.pmcid, null);
  assert.equal(article.doi, null);
});

test("one invalid individual record does not discard a well-formed EFetch batch", async (t) => {
  const store = await temporaryStore(t);
  const cfg = await config();
  const source = (await fixture("pubmed.xml")).replace(
    "<PubmedData/>",
    '<PubmedData><ArticleIdList><ArticleId IdType="pmc">invalid</ArticleId></ArticleIdList></PubmedData>',
  );
  const nodes = source.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g);
  const calls = [];
  const client = new PubmedClient(
    cfg,
    async (url, init) => {
      if (String(url).endsWith("efetch.fcgi")) {
        const ids = new URLSearchParams(init.body).get("id").split(",");
        calls.push(ids);
        return new Response(
          `<PubmedArticleSet>${nodes.filter((node) => ids.some((id) => node.includes(`>${id}</PMID>`))).join("")}</PubmedArticleSet>`,
        );
      }
      return new Response(
        await fixture(
          new URL(url).searchParams.get("metadataPrefix") === "pmc_fm"
            ? "pmc-metadata.xml"
            : "pmc-full.xml",
        ),
      );
    },
    clock(),
  );
  const result = await ingest(client, store, cfg, ["10001", "10002", "10003"]);
  assert.equal(result.normalizedWritten, 2);
  assert.equal(result.errors, 1);
  assert.deepEqual(calls, [["10001", "10002", "10003"], ["10002"]]);
  assert.equal(
    (await store.catalog()).articles["10002"].errorCategory,
    "malformed-source",
  );
  assert.ok(await store.read("raw/pubmed/10001.json"));
  assert.ok(await store.read("raw/pubmed/10003.json"));
});

test("truncated XML gets one parse retry then split-batch isolation, without single-PMID normal fetching", async (t) => {
  const store = await temporaryStore(t);
  const cfg = await config();
  const nodes = (await fixture("pubmed.xml")).match(
    /<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g,
  );
  const calls = [];
  const client = new PubmedClient(
    cfg,
    async (_url, init) => {
      const ids = new URLSearchParams(init.body).get("id").split(",");
      calls.push(ids);
      if (ids.length === 3) return new Response("<PubmedArticleSet>");
      return new Response(
        `<PubmedArticleSet>${nodes.filter((node) => ids.some((id) => node.includes(`>${id}</PMID>`))).join("")}</PubmedArticleSet>`,
      );
    },
    clock(),
  );
  const failures = new Map();
  const result = await fetchPubmed(
    client,
    store,
    ["10001", "10002", "10003"],
    "authored-recovery",
    20,
    false,
    { failures },
  );
  assert.equal(result.size, 3);
  assert.equal(failures.size, 0);
  assert.deepEqual(
    calls.map((ids) => ids.length),
    [3, 3, 2, 1],
  );
});

test("cached repair restores original batch provenance and never refetches a healthy record", async (t) => {
  const { store, cfg, first, network, source } = await good(t);
  const catalog = await store.catalog();
  catalog.articles["888888"] = {
    ...catalog.articles[id],
    pmid: "888888",
    status: "error",
    errorCategory: "malformed-source",
    corpus: undefined,
  };
  await store.saveCatalog(catalog);
  const raw = source
    .replaceAll(id, "888888")
    .replace(/<ArticleId IdType="pmc">PMC20001<\/ArticleId>/, "");
  const url =
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=888888&retmode=xml";
  const provenance = await store.raw(
    "raw/pubmed/batches/orphaned-fixture.xml",
    raw,
    "pubmed-efetch",
    url,
    false,
  );
  const before = network();
  const result = await repairCachedIngestion(store, cfg, true);
  assert.deepEqual(result.restoredReferences, ["888888"]);
  assert.equal(result.normalizedWritten, 1);
  assert.deepEqual(await store.json("raw/pubmed/888888.json"), provenance);
  assert.equal(await store.read(provenance.rawPath), raw);
  assert.equal(hash(raw), provenance.sha256);
  assert.equal((await store.catalog()).articles["888888"].status, "normalized");
  assert.equal(network(), before);
  assert.equal((await store.json(`normalized/${id}.json`)).schemaVersion, 1);
  assert.ok(
    await store.read(
      `corpus/versions/${id}/${first.normalizedRecordSha256}.json`,
    ),
  );
});

test("HTTP-200 throttle HTML is retried, Retry-After respected, and jitter is bounded", async () => {
  const time = clock();
  let attempts = 0;
  const client = new PubmedClient(
    await config(),
    async () => {
      attempts++;
      return attempts < 3
        ? new Response("<html>Too many requests</html>", {
            headers: { "Retry-After": "2" },
          })
        : new Response("ok");
    },
    time,
    () => 0.5,
  );
  assert.equal(await client.eutils("efetch.fcgi", {}), "ok");
  assert.equal(attempts, 3);
  assert.deepEqual(time.delays, [2000, 2000]);
  assert.equal(
    retryDelay(null, 0, 1, () => 0.5),
    2250,
  );
});
