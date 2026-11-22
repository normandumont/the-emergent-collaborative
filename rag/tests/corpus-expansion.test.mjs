import test from "node:test";
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import {
  config,
  fixture,
  temporaryStore,
  clock,
  searchBody,
} from "./helpers.mjs";
import {
  discoveryOptions,
  discoveryPlan,
  discoverAll,
} from "../lib/discovery/discover-all.js";
import { PubmedClient } from "../lib/discovery/pubmed-client.js";
import { RagError } from "../lib/shared/logging.js";
import { fetchPubmed } from "../lib/ingestion/fetch-pubmed.js";

async function setup(t, overrides = {}) {
  const store = await temporaryStore(t);
  const base = await config();
  const cfg = {
    ...base,
    queries: base.queries.filter((query) =>
      ["pd_exercise", "pd_sleep"].includes(query.id),
    ),
    ...overrides,
  };
  const xml = await fixture("pubmed.xml");
  const articles = xml.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g);
  const calls = { search: [], fetch: [], pmc: [] };
  let sleepFailure = false,
    pmcFailure = false;
  const client = new PubmedClient(
    cfg,
    async (url, init) => {
      const endpoint = new URL(url);
      const params = new URLSearchParams(init?.body);
      if (endpoint.pathname.endsWith("esearch.fcgi")) {
        const query = cfg.queries.find(
          (query) => query.query === params.get("term"),
        );
        calls.search.push(query.id);
        if (query.id === "pd_sleep" && sleepFailure)
          throw new RagError("malformed-source", "Authored query failure.");
        return new Response(
          searchBody(
            query.id === "pd_exercise"
              ? ["10001", "10002"]
              : ["10001", "10003"],
            2,
          ),
        );
      }
      if (endpoint.pathname.endsWith("efetch.fcgi")) {
        const ids = params.get("id").split(",");
        calls.fetch.push(ids);
        return new Response(
          `<PubmedArticleSet>${articles
            .filter((article) =>
              ids.some((id) => article.includes(`>${id}</PMID>`)),
            )
            .join("")}</PubmedArticleSet>`,
        );
      }
      assert.equal(endpoint.hostname, "pmc.ncbi.nlm.nih.gov");
      calls.pmc.push(endpoint.searchParams.get("metadataPrefix"));
      if (pmcFailure)
        throw new RagError("malformed-source", "Authored PMC parsing failure.");
      return new Response(
        await fixture(
          endpoint.searchParams.get("metadataPrefix") === "pmc_fm"
            ? "pmc-metadata.xml"
            : "pmc-full.xml",
        ),
      );
    },
    clock(),
  );
  return {
    store,
    cfg,
    client,
    calls,
    failSleep: (value) => {
      sleepFailure = value;
    },
    failPmc: (value) => {
      pmcFailure = value;
    },
  };
}
const execute = discoveryOptions(["--limit-per-query", "75", "--execute"]);

test("enabled query loading ignores disabled queries and clamps configured caps", async () => {
  const cfg = await config();
  assert.equal(discoveryPlan(cfg, discoveryOptions([])).maximumCandidates, 600);
  cfg.queries[0].enabled = false;
  cfg.queries[1].maxResults = 50;
  const plan = discoveryPlan(cfg, execute);
  assert.equal(plan.enabledQueries, 7);
  assert.equal(plan.maximumCandidates, 6 * 75 + 50);
  assert.equal(plan.queries[0].limit, 50);
  for (const limit of [50, 75, 100])
    assert.equal(
      discoveryOptions(["--limit-per-query", String(limit)]).limitPerQuery,
      limit,
    );
});

test("invalid limits and conflicting/unknown/repeated flags fail explicitly", () => {
  for (const args of [
    ["--limit-per-query", "101"],
    ["--limit-per-query", "0"],
    ["--limit-per-query", "1.5"],
    ["--limit-per-query"],
    ["--execute", "--dry-run"],
    ["--vector-sync"],
    ["--execute", "--execute"],
  ])
    assert.throws(() => discoveryOptions(args), { category: "configuration" });
  assert.equal(discoveryOptions([]).execute, false);
});

test("dry run and missing execute guard make no network calls or local data writes", async (t) => {
  const { store, cfg, client, calls } = await setup(t);
  for (const args of [[], ["--dry-run"]]) {
    const plan = await discoverAll(cfg, store, discoveryOptions(args), client);
    assert.equal(plan.maximumCandidates, 150);
  }
  assert.deepEqual(calls, { search: [], fetch: [], pmc: [] });
  assert.deepEqual(await readdir(store.directory), []);
});

test("multi-query discovery deduplicates ingestion while retaining exact catalog and report relationships", async (t) => {
  const { store, cfg, client, calls } = await setup(t);
  const run = await discoverAll(cfg, store, execute, client);
  assert.equal(run.status, "completed");
  assert.equal(run.summary.returnedCandidateSlots, 4);
  assert.equal(run.summary.uniquePmids, 3);
  assert.equal(run.summary.duplicateCandidateSlots, 1);
  assert.deepEqual(calls.fetch, [["10001", "10002", "10003"]]);
  const catalog = await store.catalog();
  const entry = catalog.articles["10001"];
  assert.deepEqual(entry.queryIds, ["pd_exercise", "pd_sleep"]);
  assert.deepEqual(entry.discoveredBy, [
    { queryId: "pd_exercise", topics: ["exercise"] },
    { queryId: "pd_sleep", topics: ["sleep"] },
  ]);
  assert.deepEqual(run.articles[0].discoveredBy, entry.discoveredBy);
  assert.equal(run.queries[1].duplicatePmidsAcrossQueries, 1);
  assert.equal(run.queries[1].newlyDiscoveredPmids, 2);
  assert.equal(
    (await store.json(`discovery-runs/${run.runId}.json`)).summary.normalized,
    3,
  );
  assert.equal(await store.read("retrieval/manifest.json"), null);
});

test("completed reruns refresh discovery but reuse unchanged normalized and raw records", async (t) => {
  const { store, cfg, client, calls } = await setup(t);
  const first = await discoverAll(cfg, store, execute, client);
  const before = await store.catalog();
  const normalized = await store.read("normalized/10001.json");
  const raw = await store.read("raw/pubmed/10001.json");
  const second = await discoverAll(cfg, store, execute, client);
  assert.notEqual(second.runId, first.runId);
  assert.equal(second.summary.alreadyKnownPmids, 3);
  assert.equal(second.summary.newlyDiscoveredPmids, 0);
  assert.equal(calls.fetch.length, 1);
  assert.equal(calls.pmc.length, 2);
  assert.equal(await store.read("normalized/10001.json"), normalized);
  assert.equal(await store.read("raw/pubmed/10001.json"), raw);
  const after = await store.catalog();
  assert.equal(
    after.articles["10001"].firstDiscoveredAt,
    before.articles["10001"].firstDiscoveredAt,
  );
  assert.ok(
    after.articles["10001"].lastDiscoveredAt >=
      before.articles["10001"].lastDiscoveredAt,
  );
  assert.deepEqual(
    after.articles["10001"].discoveredBy,
    before.articles["10001"].discoveredBy,
  );
});

test("query failure is isolated and matching-plan resume retries only unfinished discovery", async (t) => {
  const state = await setup(t);
  state.failSleep(true);
  const first = await discoverAll(
    state.cfg,
    state.store,
    execute,
    state.client,
  );
  assert.equal(first.status, "partial");
  assert.equal(first.summary.queryErrors, 1);
  assert.equal(first.summary.normalized, 2);
  assert.equal(first.queries[1].error, "malformed-source");
  state.failSleep(false);
  const second = await discoverAll(
    state.cfg,
    state.store,
    execute,
    state.client,
  );
  assert.equal(second.runId, first.runId);
  assert.equal(second.status, "completed");
  assert.deepEqual(state.calls.search, ["pd_exercise", "pd_sleep", "pd_sleep"]);
  assert.deepEqual(state.calls.fetch, [["10001", "10002"], ["10003"]]);
});

test("PMID licensing/parsing errors are isolated; resume reuses downloaded PubMed and completed peers", async (t) => {
  const state = await setup(t);
  state.failPmc(true);
  const first = await discoverAll(
    state.cfg,
    state.store,
    execute,
    state.client,
  );
  assert.equal(first.status, "partial");
  assert.equal(first.summary.pmidErrors, 1);
  assert.equal(first.summary.normalized, 2);
  assert.equal(first.articles[0].error, "malformed-source");
  assert.equal(
    (await state.store.catalog()).articles["10001"].discoveredBy.length,
    2,
  );
  state.failPmc(false);
  const second = await discoverAll(
    state.cfg,
    state.store,
    execute,
    state.client,
  );
  assert.equal(second.status, "completed");
  assert.equal(second.runId, first.runId);
  assert.equal(state.calls.search.length, 2);
  assert.equal(state.calls.fetch.length, 1);
});

test("raw-cache recovery ingests previously downloaded records without another EFetch", async (t) => {
  const state = await setup(t);
  await fetchPubmed(
    state.client,
    state.store,
    ["10001", "10002", "10003"],
    "pre-interruption",
    20,
    false,
  );
  const run = await discoverAll(state.cfg, state.store, execute, state.client);
  assert.equal(run.summary.normalized, 3);
  assert.equal(state.calls.fetch.length, 1);
});

test("fatal storage interruption preserves journal; restart skips completed queries and downloads", async (t) => {
  const state = await setup(t);
  const original = state.store.writeJson.bind(state.store);
  let interrupted = false;
  state.store.writeJson = async (path, value, refresh) => {
    if (
      !interrupted &&
      path.startsWith("discovery-runs/multi-query-") &&
      !path.includes("progress") &&
      value.ingestionRuns?.length
    ) {
      interrupted = true;
      throw new RagError(
        "storage",
        "Authored interruption after durable ingestion.",
      );
    }
    return original(path, value, refresh);
  };
  await assert.rejects(
    discoverAll(state.cfg, state.store, execute, state.client),
    { category: "storage" },
  );
  const run = await discoverAll(state.cfg, state.store, execute, state.client);
  assert.equal(run.status, "completed");
  assert.equal(state.calls.search.length, 2);
  assert.equal(state.calls.fetch.length, 1);
  assert.equal(run.summary.normalized, 3);
});

test("corrupt resume journals fail before network acquisition", async (t) => {
  const state = await setup(t);
  const plan = discoveryPlan(state.cfg, execute);
  await state.store.writeJson(
    `discovery-runs/multi-query-progress-${plan.fingerprint}.json`,
    { runId: "../outside" },
  );
  await assert.rejects(
    discoverAll(state.cfg, state.store, execute, state.client),
    { category: "storage" },
  );
  assert.deepEqual(state.calls.search, []);
});

test("a failed EFetch batch does not abort later batches and is retried on resume", async (t) => {
  const state = await setup(t, { batchSize: 2 });
  const eutils = state.client.eutils.bind(state.client);
  let failFirstBatch = true;
  state.client.eutils = async (endpoint, parameters) => {
    if (
      endpoint === "efetch.fcgi" &&
      parameters.id === "10001,10002" &&
      failFirstBatch
    )
      throw new RagError("network", "Authored transient batch failure.");
    return eutils(endpoint, parameters);
  };
  const first = await discoverAll(
    state.cfg,
    state.store,
    execute,
    state.client,
  );
  assert.equal(first.status, "partial");
  assert.equal(first.summary.normalized, 1);
  assert.equal(first.summary.pmidErrors, 2);
  assert.equal(first.articles[0].error, "network");
  assert.deepEqual(state.calls.fetch, [["10003"]]);
  failFirstBatch = false;
  const resumed = await discoverAll(
    state.cfg,
    state.store,
    execute,
    state.client,
  );
  assert.equal(resumed.status, "completed");
  assert.equal(resumed.summary.normalized, 3);
  assert.deepEqual(state.calls.fetch, [["10003"], ["10001", "10002"]]);
  assert.equal(state.calls.search.length, 2);
});
