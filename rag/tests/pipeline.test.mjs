import test from "node:test";
import assert from "node:assert/strict";
import {
  config,
  fixture,
  temporaryStore,
  searchBody,
  clock,
} from "./helpers.mjs";
import { PubmedClient } from "../lib/discovery/pubmed-client.js";
import { discover } from "../lib/discovery/pubmed-search.js";
import { selectQuery } from "../lib/shared/config.js";
import { fetchPmc } from "../lib/ingestion/fetch-pmc.js";
import { fetchPubmed } from "../lib/ingestion/fetch-pubmed.js";
import { ingest } from "../lib/ingestion/ingest.js";
import { hash } from "../lib/shared/storage.js";

test("discovery-only uses stable history pages, unions catalog tags, and does not enrich", async (t) => {
  const store = await temporaryStore(t);
  const cfg = { ...(await config()), batchSize: 2 };
  const requests = [];
  const client = new PubmedClient(
    cfg,
    async (url, init) => {
      assert.ok(String(url).endsWith("esearch.fcgi"));
      const params = new URLSearchParams(init.body);
      requests.push(params);
      return new Response(
        searchBody(
          params.get("retstart") === "0" ? ["10001", "10002"] : ["10003"],
          10,
        ),
      );
    },
    clock(),
  );
  const query = selectQuery(cfg, "pd_exercise", 3);
  const first = await store.locked(() => discover(client, store, query, cfg));
  const second = await store.locked(() => discover(client, store, query, cfg));
  assert.equal(first.newPmids, 3);
  assert.equal(second.existingPmids, 3);
  assert.equal(requests[1].get("term"), "#1");
  assert.equal(requests[1].get("WebEnv"), "fixture-history");
  const catalog = await store.catalog();
  assert.equal(catalog.articles["10001"].status, "discovered");
  assert.deepEqual(catalog.articles["10001"].queryIds, ["pd_exercise"]);
  assert.equal(
    (await store.json(`discovery-runs/${first.runId}.json`)).totalMatches,
    10,
  );
  assert.equal(await store.read("normalized/10001.json"), null);
});

test("zero-match discovery writes an explicit empty summary", async (t) => {
  const store = await temporaryStore(t);
  const cfg = await config();
  const client = new PubmedClient(
    cfg,
    async () => new Response(searchBody([], 0)),
    clock(),
  );
  assert.equal(
    (await discover(client, store, selectQuery(cfg, "pd_exercise", 10), cfg))
      .retrievedPmids,
    0,
  );
});

test("fixture end-to-end discovery, batched PubMed, license-gated PMC, immutable raw, normalization and dedup", async (t) => {
  const store = await temporaryStore(t);
  const cfg = await config();
  const [pubmed, metadata, full] = await Promise.all(
    ["pubmed.xml", "pmc-metadata.xml", "pmc-full.xml"].map(fixture),
  );
  const calls = [];
  const client = new PubmedClient(
    cfg,
    async (url) => {
      calls.push(String(url));
      const endpoint = new URL(url);
      if (endpoint.pathname.endsWith("esearch.fcgi"))
        return new Response(searchBody(["10001", "10002", "10003"], 1250));
      if (endpoint.pathname.endsWith("efetch.fcgi"))
        return new Response(pubmed);
      return new Response(
        endpoint.searchParams.get("metadataPrefix") === "pmc_fm"
          ? metadata
          : full,
      );
    },
    clock(),
  );
  await store.locked(async () => {
    const discovery = await discover(
      client,
      store,
      selectQuery(cfg, "pd_exercise", 3),
      cfg,
    );
    const summary = await ingest(client, store, cfg, discovery.pmids);
    assert.equal(summary.errors, 0);
    assert.equal(summary.newArticles, 3);
    assert.equal(summary.normalizedWritten, 3);
    assert.equal(summary.abstractsRetrieved, 2);
    assert.equal(summary.reusableFullText, 1);
    const article = await store.json("normalized/10001.json");
    assert.equal(article.source.license.id, "CC-BY-4.0");
    assert.equal(article.source.provenance.length, 3);
    assert.deepEqual(article.classification.topics, ["exercise"]);
    const manifest = await store.json("raw/pubmed/10001.json");
    assert.equal(await store.read(manifest.rawPath), pubmed);
    assert.equal(manifest.sha256, hash(pubmed));
    assert.equal(await store.read("raw/pmc/PMC20001.xml"), full);
    const count = calls.length;
    const repeated = await ingest(client, store, cfg, discovery.pmids);
    assert.equal(repeated.existingArticles, 3);
    assert.equal(calls.length, count);
    assert.equal(
      (await store.catalog()).articles["10001"].status,
      "normalized",
    );
  });
});

test("licensing denial never fetches or persists full text; mismatch after approval never persists body", async (t) => {
  const store = await temporaryStore(t);
  const cfg = await config();
  const metadata = await fixture("pmc-metadata.xml");
  let calls = 0;
  const denied = new PubmedClient(
    cfg,
    async (url) => {
      calls++;
      assert.equal(new URL(url).searchParams.get("metadataPrefix"), "pmc_fm");
      return new Response(
        metadata.replace("/licenses/by/", "/licenses/by-nc/"),
      );
    },
    clock(),
  );
  const result = await fetchPmc(denied, store, "PMC20001", "10001", false);
  assert.equal(result.reuseAllowed, false);
  assert.equal(calls, 1);
  assert.equal(await store.read("raw/pmc/PMC20001.xml"), null);
  const full = (await fixture("pmc-full.xml")).replace(
    "/licenses/by/",
    "/licenses/by-nd/",
  );
  const mismatch = new PubmedClient(
    cfg,
    async (url) =>
      new Response(
        new URL(url).searchParams.get("metadataPrefix") === "pmc_fm"
          ? metadata
          : full,
      ),
    clock(),
  );
  const refreshed = await fetchPmc(mismatch, store, "PMC20001", "10001", true);
  assert.equal(refreshed.reason, "full-text-license-mismatch");
  assert.equal(await store.read("raw/pmc/PMC20001.xml"), null);
});

test("source cache preserves retrieval timestamps, hashes, exact payloads and only refresh replaces raw", async (t) => {
  const store = await temporaryStore(t);
  const cfg = await config();
  const source = await fixture("pubmed.xml");
  const client = new PubmedClient(
    cfg,
    async () => new Response(source),
    clock(),
  );
  const fetched = await fetchPubmed(
    client,
    store,
    ["10001", "10002", "10003"],
    "fixture-first",
    20,
    false,
  );
  const offline = new PubmedClient(
    cfg,
    async () => {
      throw new Error("unexpected request");
    },
    clock(),
  );
  const cached = await fetchPubmed(
    offline,
    store,
    ["10001"],
    "fixture-second",
    20,
    false,
  );
  assert.deepEqual(
    cached.get("10001").provenance,
    fetched.get("10001").provenance,
  );
  const oldManifest = await store.json("raw/pubmed/10001.json");
  const refreshed = await fetchPubmed(
    client,
    store,
    ["10001", "10002", "10003"],
    "fixture-third",
    20,
    true,
  );
  assert.notEqual(
    refreshed.get("10001").provenance.rawPath,
    oldManifest.rawPath,
  );
  assert.equal(await store.read(oldManifest.rawPath), source);
  await assert.rejects(
    store
      .write("raw/test.xml", "replace", false)
      .then(() => store.write("raw/test.xml", "overwrite", false)),
    { code: "EEXIST" },
  );
  await store.write("raw/test.xml", "explicit refresh", true);
  assert.equal(await store.read("raw/test.xml"), "explicit refresh");
});

test("catalog, raw cache corruption, path traversal and concurrent writers fail explicitly", async (t) => {
  const store = await temporaryStore(t);
  assert.throws(() => store.resolve("../outside.json"), {
    category: "storage",
  });
  await store.write("catalog.json", "{malformed");
  await assert.rejects(store.catalog(), { category: "storage" });
  await store.writeJson(
    "catalog.json",
    { schemaVersion: 1, articles: { 10001: { pmid: "wrong" } } },
    true,
  );
  await assert.rejects(store.catalog(), { category: "storage" });
  await store.locked(async () => {
    await assert.rejects(
      store.locked(async () => {}),
      { category: "storage" },
    );
  });
  await assert.rejects(
    store.locked(async () => {
      throw new Error("fixture");
    }),
    /fixture/,
  );
  assert.equal(await store.read(".run.lock"), null);
});

test("changed PubMed raw hashes and missing source provenance fail rather than being normalized", async (t) => {
  const store = await temporaryStore(t);
  const cfg = await config();
  const source = await fixture("pubmed.xml");
  const client = new PubmedClient(
    cfg,
    async () => new Response(source),
    clock(),
  );
  await fetchPubmed(
    client,
    store,
    ["10001", "10002", "10003"],
    "fixture-cache",
    20,
    false,
  );
  const manifest = await store.json("raw/pubmed/10001.json");
  await store.write(manifest.rawPath, source + "\n", true);
  await assert.rejects(
    fetchPubmed(client, store, ["10001"], "fixture-retry", 20, false),
    { category: "storage" },
  );
  await store.write(
    "raw/pmc/PMC20001.metadata.xml",
    await fixture("pmc-metadata.xml"),
  );
  await assert.rejects(fetchPmc(client, store, "PMC20001", "10001", false), {
    category: "storage",
  });
});

test("cached reusable PMC text is license-checked without network calls and retains source timestamps", async (t) => {
  const store = await temporaryStore(t);
  const cfg = await config();
  const metadata = await fixture("pmc-metadata.xml");
  const full = await fixture("pmc-full.xml");
  const client = new PubmedClient(
    cfg,
    async (url) =>
      new Response(
        new URL(url).searchParams.get("metadataPrefix") === "pmc_fm"
          ? metadata
          : full,
      ),
    clock(),
  );
  const first = await fetchPmc(client, store, "PMC20001", "10001", false);
  const offline = new PubmedClient(
    cfg,
    async () => {
      throw new Error("must not request");
    },
    clock(),
  );
  const cached = await fetchPmc(offline, store, "PMC20001", "10001", false);
  assert.deepEqual(cached.provenance, first.provenance);
  assert.equal(cached.hasFullText, true);
});

test("missing records and malformed source runs have counted errors, without false normalization", async (t) => {
  const store = await temporaryStore(t);
  const cfg = await config();
  const client = new PubmedClient(
    cfg,
    async () => new Response("<PubmedArticleSet/>"),
    clock(),
  );
  const result = await ingest(client, store, cfg, ["10001"]);
  assert.equal(result.errors, 1);
  assert.equal(result.normalizedWritten, 0);
  assert.equal(
    (await store.catalog()).articles["10001"].errorCategory,
    "missing-record",
  );
  const malformed = new PubmedClient(
    cfg,
    async () => new Response("<malformed>"),
    clock(),
  );
  const bad = await ingest(malformed, store, cfg, ["10002"]);
  assert.equal(bad.errors, 1);
  assert.equal(
    (await store.catalog()).articles["10002"].errorCategory,
    "malformed-source",
  );
  assert.equal(await store.read("normalized/10002.json"), null);
});

test(
  "optional live ESearch/ingestion smoke is disabled unless RAG_LIVE_TEST=1",
  { skip: process.env.RAG_LIVE_TEST !== "1", timeout: 300_000 },
  async (t) => {
    const store = await temporaryStore(t);
    const cfg = await config();
    const client = new PubmedClient(cfg);
    await store.locked(async () => {
      const discovery = await discover(
        client,
        store,
        selectQuery(cfg, "pd_exercise", 1),
        cfg,
      );
      assert.equal(discovery.retrievedPmids, 1);
      const result = await ingest(client, store, cfg, discovery.pmids);
      assert.equal(result.errors, 0);
      assert.equal(result.normalizedWritten, 1);
    });
  },
);
