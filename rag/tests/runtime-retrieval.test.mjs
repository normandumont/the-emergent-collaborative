import test from "node:test";
import assert from "node:assert/strict";
import { exportRuntimeManifest } from "../lib/scripts/runtime-manifest.js";
import {
  runtimeSource,
  parseRuntimeManifest,
} from "../lib/retrieval/runtime-manifest.js";
import { retrieveResearch } from "../lib/retrieval/pipeline.js";
import { searchVector } from "../lib/retrieval/search.js";
import { synchronize } from "../lib/indexing/reconcile.js";
import { vectorFixture } from "./vector-helpers.mjs";
import { OpenAIVectorApi } from "../lib/indexing/openai-client.js";
import OpenAI from "openai";
import { createHash } from "node:crypto";
import { verifyRuntimeManifest } from "../lib/retrieval/runtime-manifest.js";

test("verified runtime snapshot produces identical retrieval to the filesystem adapter without copying corpus text", async (t) => {
  const { store, api } = await vectorFixture(t);
  await synchronize(api, store, { pause: async () => {}, pollAttempts: 2 }, {});
  const snapshot = await exportRuntimeManifest(store, "vs_1");
  const local = await searchVector(
    api,
    store,
    "What evidence supports exercise?",
    { debugRanking: true },
    {},
  );
  const runtime = await retrieveResearch(
    runtimeSource(snapshot, (request) => api.search("vs_1", request)),
    "What evidence supports exercise?",
    { debugRanking: true },
  );
  assert.deepEqual(runtime, local);
  assert.ok(snapshot.papers.some((p) => !p.entry.retrievalEnabled));
  assert.doesNotMatch(
    JSON.stringify(snapshot),
    /rawPath|baseNormalizedSha256|retrieval\/.*\.md|Authored research fixture chunk/,
  );
  const corrupted = structuredClone(snapshot);
  corrupted.papers.find((paper) => paper.entry.retrievalEnabled).fingerprint =
    "0".repeat(64);
  assert.throws(() => parseRuntimeManifest(corrupted));
  const missing = structuredClone(snapshot);
  missing.papers.find((paper) => paper.entry.retrievalEnabled).fileId = null;
  assert.throws(() => parseRuntimeManifest(missing));
});

test("runtime manifest checksum, schema, unique identity and required safety fields are verified", async (t) => {
  const { store, api } = await vectorFixture(t);
  await synchronize(api, store, { pause: async () => {}, pollAttempts: 2 }, {});
  const snapshot = await exportRuntimeManifest(store, "vs_1");
  const text = JSON.stringify(snapshot);
  const hash = createHash("sha256").update(text).digest("hex");
  assert.deepEqual(verifyRuntimeManifest(text, hash), snapshot);
  assert.throws(() => verifyRuntimeManifest(text + " ", hash));
  assert.throws(() => verifyRuntimeManifest(text, ""));
  for (const mutate of [
    (value) => {
      value.schemaVersion = 2;
    },
    (value) => {
      value.papers.push(value.papers[0]);
    },
    (value) => {
      value.taxonomy.push(value.taxonomy[0]);
    },
    (value) => {
      delete value.papers[0].entry.retracted;
    },
    (value) => {
      delete value.papers[0].entry.retrievalEnabled;
    },
    (value) => {
      delete value.papers[0].entry.expressionOfConcern;
    },
  ]) {
    const changed = structuredClone(snapshot);
    mutate(changed);
    assert.throws(() => parseRuntimeManifest(changed));
  }
});

test("runtime retry override permits exactly one provider search even during outage", async () => {
  let searches = 0;
  const client = new OpenAI({
    apiKey: "test-not-a-key",
    maxRetries: 0,
    fetch: async () => {
      searches++;
      return new Response(
        JSON.stringify({ error: { message: "provider-secret" } }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    },
  });
  const api = new OpenAIVectorApi(client, async () => {}, 0);
  await assert.rejects(
    api.search("vs_fixture", {
      query: "exercise",
      maxResults: 50,
      rewriteQuery: true,
      scoreThreshold: 0,
      filters: { type: "eq", key: "retracted", value: false },
    }),
  );
  assert.equal(searches, 1);
});

test("runtime rejects unknown files, stale attributes, disabled/retracted/concern records without ranking them", async (t) => {
  const { store, api } = await vectorFixture(t);
  await synchronize(api, store, { pause: async () => {}, pollAttempts: 2 }, {});
  for (const patch of [
    { retrievalEnabled: false },
    { retracted: true },
    { expressionOfConcern: true },
    { superseded: true },
    { eligible: false },
  ]) {
    const snapshot = await exportRuntimeManifest(store, "vs_1");
    Object.assign(
      snapshot.papers.find((p) => p.entry.pmid === "10001").entry,
      patch,
    );
    const result = await retrieveResearch(
      runtimeSource(snapshot, (request) => api.search("vs_1", request)),
      "exercise",
    );
    assert.ok(result.results.every((p) => p.pmid !== "10001"));
  }
  const snapshot = await exportRuntimeManifest(store, "vs_1");
  api.remote[0].attributes.document_sha256 = "stale";
  const result = await retrieveResearch(
    runtimeSource(snapshot, (request) => api.search("vs_1", request)),
    "exercise",
  );
  assert.equal(result.suppressed["stale-metadata-or-hash"], 1);
  assert.equal(api.removals.length, 0);
});
test("signal-aware vector request cancels SDK retries and releases its queue", async () => {
  let attempts = 0;
  const client = new OpenAI({
    apiKey: "test-not-a-key",
    maxRetries: 0,
    fetch: async (_url, init) => {
      attempts++;
      if (attempts === 1)
        return new Promise((_resolve, reject) => {
          init.signal.addEventListener(
            "abort",
            () => reject(init.signal.reason),
            { once: true },
          );
        });
      return new Response(
        JSON.stringify({
          data: [],
          search_query: ["exercise"],
          has_more: false,
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    },
  });
  const api = new OpenAIVectorApi(client, async () => {});
  const controller = new AbortController();
  const request = {
    query: "exercise",
    maxResults: 50,
    rewriteQuery: true,
    scoreThreshold: 0,
    filters: { type: "eq", key: "retracted", value: false },
  };
  const pending = api.search("vs_fixture", {
    ...request,
    signal: controller.signal,
  });
  await new Promise((resolve) => setTimeout(resolve, 10));
  controller.abort();
  await assert.rejects(pending);
  assert.equal((await api.search("vs_fixture", request)).hits.length, 0);
  assert.equal(attempts, 2);
});
