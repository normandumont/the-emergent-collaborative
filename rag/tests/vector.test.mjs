import test from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { temporaryStore } from "./helpers.mjs";
import { FakeVectorApi, vectorFixture, editEntry } from "./vector-helpers.mjs";
import { readManifest } from "../lib/corpus/manifest.js";
import { hash } from "../lib/shared/storage.js";
import {
  createVectorStore,
  deleteDevelopmentStore,
} from "../lib/indexing/vector-store.js";
import { synchronize, vectorStatus } from "../lib/indexing/reconcile.js";
import { verifyDocument } from "../lib/indexing/manifest-input.js";
import { fileAttributes } from "../lib/indexing/metadata.js";
import { readState, saveState } from "../lib/indexing/state.js";
import {
  OpenAIVectorApi,
  sdkClient,
  CHUNKING,
  VectorApiError,
} from "../lib/indexing/openai-client.js";
import { searchVector } from "../lib/retrieval/search.js";
import { remoteFilters } from "../lib/retrieval/filters.js";
import { vectorArguments, redactedOutput } from "../lib/scripts/vector-cli.js";

const sync = (api, store, options = {}) =>
  synchronize(
    api,
    store,
    { pause: async () => {}, pollAttempts: 2, ...options },
    {},
  );

test("manifest alone chooses uploads; orphan Markdown and disabled source histories never upload", async (t) => {
  const { store, api } = await vectorFixture(t);
  await store.write(
    "retrieval/99999.md",
    "An orphan file that must not be uploaded.",
  );
  await editEntry(store, "10003", {
    retrievalEnabled: false,
    status: "retrieval-disabled",
    indexAction: "remove",
  });
  const result = await sync(api, store);
  assert.equal(result.uploaded, 1);
  assert.deepEqual(
    api.attachments.flatMap((batch) =>
      batch.files.map((file) => file.attributes.pmid),
    ),
    ["10001"],
  );
  assert.equal(
    await store.read("retrieval/99999.md"),
    "An orphan file that must not be uploaded.",
  );
});
test("retracted records never upload, even while their historical Markdown remains", async (t) => {
  const { store, api } = await vectorFixture(t);
  await editEntry(store, "10001", {
    retrievalEnabled: false,
    retracted: true,
    status: "retracted",
    indexAction: "remove",
  });
  await sync(api, store);
  assert.ok(
    api.attachments.every((batch) =>
      batch.files.every((file) => file.attributes.pmid !== "10001"),
    ),
  );
  assert.ok(await store.read("retrieval/10001.md"));
});
test("explicit remove action overrides otherwise enabled eligibility flags", async (t) => {
  const { store, api } = await vectorFixture(t);
  await editEntry(store, "10001", { indexAction: "remove" });
  await sync(api, store);
  assert.deepEqual(
    api.attachments.flatMap((batch) =>
      batch.files.map((file) => file.attributes.pmid),
    ),
    ["10003"],
  );
});
test("document SHA mismatch reports the PMID, blocks its upload and removes any prior index", async (t) => {
  const { store, api } = await vectorFixture(t);
  await sync(api, store);
  await store.write("retrieval/10001.md", "Tampered content", true);
  const result = await sync(api, store);
  assert.deepEqual(result.mismatches, ["10001"]);
  assert.equal(result.uploaded, 0);
  assert.equal(result.removed, 1);
  assert.equal(result.errors, 1);
  assert.equal(api.uploads.length, 2);
});
test("hash verification uses exact bytes, not replacement-character decoding", async (t) => {
  const { store } = await vectorFixture(t);
  const entry = (await readManifest(store)).entries.find(
    (entry) => entry.pmid === "10001",
  );
  await writeFile(store.resolve("retrieval/10001.md"), Buffer.from([0xff]));
  await assert.rejects(
    verifyDocument(store, { ...entry, sha256: hash("\uFFFD") }),
    /10001.*SHA-256/,
  );
});
test("governed, base-normalized and raw-source hashes are verified before upload", async (t) => {
  const { store, api } = await vectorFixture(t);
  const base = await store.read("normalized/10001.json");
  await store.write("normalized/10001.json", `${base} `, true);
  assert.deepEqual((await sync(api, store)).mismatches, ["10001"]);
  assert.equal(api.uploads.length, 1);
});
test("a second unchanged sync performs no uploads or removals", async (t) => {
  const { store, api } = await vectorFixture(t);
  await sync(api, store);
  const second = await sync(api, store);
  assert.equal(second.uploaded, 0);
  assert.equal(second.removed, 0);
  assert.equal(second.unchanged, 2);
  assert.equal(api.uploads.length, 2);
  assert.equal(api.attachments.length, 1);
});
test("changed manifest document hash causes replacement, not duplicate active indexing", async (t) => {
  const { store, api } = await vectorFixture(t);
  await sync(api, store);
  const text = `${await store.read("retrieval/10001.md")}\nAuthored fixture update.\n`;
  await store.write("retrieval/10001.md", text, true);
  await editEntry(store, "10001", { sha256: hash(text) });
  const result = await sync(api, store);
  assert.equal(result.uploaded, 1);
  assert.equal(result.removed, 1);
  assert.equal(api.remote.length, 2);
  assert.equal((await sync(api, store)).uploaded, 0);
});
test("missing remote indexed file is uploaded again; unknown remote files are reported, never deleted", async (t) => {
  const { store, api } = await vectorFixture(t);
  await sync(api, store);
  api.remote.shift();
  api.remote.push({
    id: "file-unknown",
    status: "completed",
    attributes: {},
    chunking: CHUNKING,
  });
  const result = await sync(api, store);
  assert.equal(result.uploaded, 1);
  assert.deepEqual(result.unknownRemote, ["file-unknown"]);
  assert.ok(api.remote.some((file) => file.id === "file-unknown"));
  assert.equal(api.removals.length, 0);
});
test("retractions request removal once and preserve provenance/history", async (t) => {
  const { store, api } = await vectorFixture(t);
  await sync(api, store);
  await editEntry(store, "10001", {
    retrievalEnabled: false,
    retracted: true,
    status: "retracted",
    indexAction: "remove",
  });
  assert.equal((await sync(api, store)).removed, 1);
  assert.equal((await sync(api, store)).removed, 0);
  assert.equal((await vectorStatus(api, store, {})).retractedRemoved, 1);
  assert.ok(await store.read("normalized/10001.json"));
});
test("removal journal retries an interrupted detachment safely", async (t) => {
  const { store, api } = await vectorFixture(t);
  await sync(api, store);
  await editEntry(store, "10001", {
    retrievalEnabled: false,
    status: "retrieval-disabled",
    indexAction: "remove",
  });
  const original = api.detach.bind(api);
  api.detach = async () => {
    throw new VectorApiError(503);
  };
  await assert.rejects(sync(api, store));
  assert.equal(
    (await readState(store)).stores.vs_1.files[0].status,
    "removing",
  );
  api.detach = original;
  assert.equal((await sync(api, store)).removed, 1);
});
test("attributes are compact and deterministic, with unknown numeric fields omitted", async (t) => {
  const { store } = await vectorFixture(t);
  const entry = (await readManifest(store)).entries[0];
  const first = fileAttributes({
    ...entry,
    topics: ["mitochondria", "exercise"],
    year: null,
    studyDesignTier: null,
  });
  assert.deepEqual(
    first,
    fileAttributes({
      ...entry,
      topics: ["exercise", "mitochondria"],
      year: null,
      studyDesignTier: null,
    }),
  );
  assert.equal(first.topic_primary, "exercise");
  assert.equal("year" in first, false);
  assert.equal("study_tier" in first, false);
  assert.ok(Object.keys(first).length <= 16);
});
test("small batches finish polling and failed per-file receipts are retained", async (t) => {
  const { store, api } = await vectorFixture(t);
  api.failures.add("10003");
  const result = await sync(api, store, { batchSize: 1 });
  assert.equal(api.attachments.length, 2);
  assert.equal(result.failed, 1);
  assert.equal(result.errors, 1);
  assert.equal(result.unchanged, 0);
  assert.equal(
    (await readState(store)).stores.vs_1.files.find(
      (file) => file.pmid === "10003",
    ).status,
    "failed",
  );
});
test("poll timeout is resumable and does not repeat file uploads", async (t) => {
  const { store, api } = await vectorFixture(t);
  api.batchStatus = "in_progress";
  await assert.rejects(sync(api, store), { category: "timeout" });
  assert.equal((await vectorStatus(api, store, {})).pending, 2);
  api.batchStatus = "completed";
  for (const file of api.remote) file.status = "completed";
  assert.equal((await sync(api, store)).uploaded, 0);
  assert.equal(api.uploads.length, 2);
});
test("permanent indexing failures are reported without re-upload; known server errors can retry on a subsequent sync", async (t) => {
  const { store, api } = await vectorFixture(t);
  api.failures.add("10003");
  await sync(api, store);
  assert.equal((await sync(api, store)).uploaded, 0);
  assert.equal(api.uploads.length, 2);
  api.remote.find((file) => file.attributes.pmid === "10003").errorCode =
    "server_error";
  api.failures.clear();
  const recovered = await sync(api, store);
  assert.equal(recovered.uploaded, 1);
  assert.equal(recovered.removed, 1);
  assert.equal(recovered.failed, 0);
});
test("withdrawing all documents in a pending batch does not leave polling permanently blocked", async (t) => {
  const { store, api } = await vectorFixture(t);
  api.batchStatus = "in_progress";
  await assert.rejects(sync(api, store), { category: "timeout" });
  for (const pmid of ["10001", "10003"])
    await editEntry(store, pmid, {
      retrievalEnabled: false,
      status: "retrieval-disabled",
      indexAction: "remove",
    });
  const result = await sync(api, store);
  assert.equal(result.removed, 2);
  assert.equal(result.pending, 0);
  assert.equal((await readState(store)).stores.vs_1.pendingBatch, null);
});
test("ambiguous upload is journaled and blocks blind duplicate retries", async (t) => {
  const { store, api } = await vectorFixture(t);
  api.uploadError = true;
  await assert.rejects(sync(api, store));
  assert.equal(
    (await readState(store)).stores.vs_1.pendingUpload.pmid,
    "10001",
  );
  await assert.rejects(sync(api, store), /Uncertain upload/);
  assert.equal(api.uploads.length, 1);
});
test("ambiguous batch attachment recovers known file IDs without duplicate uploads/attachments", async (t) => {
  const { store, api } = await vectorFixture(t);
  api.attachError = true;
  await assert.rejects(sync(api, store));
  api.attachError = false;
  assert.equal((await sync(api, store)).uploaded, 0);
  assert.equal(api.uploads.length, 2);
  assert.equal(api.attachments.length, 1);
});
test("large desired corpus requires explicit consent, but safety removals still happen", async (t) => {
  const { store, api } = await vectorFixture(t);
  await sync(api, store);
  const manifest = await readManifest(store);
  const first = manifest.entries.find((entry) => entry.pmid === "10001");
  for (let index = 0; index < 101; index++)
    manifest.entries.push({
      ...first,
      pmid: String(20000 + index),
      path: `${20000 + index}.md`,
      decisionPath: `corpus/decisions/${20000 + index}/${first.dependencySha256}.json`,
    });
  const old = manifest.entries.find((entry) => entry.pmid === "10003");
  old.retrievalEnabled = false;
  old.indexAction = "remove";
  old.status = "retrieval-disabled";
  await store.versionedJson("retrieval/manifest.json", manifest);
  await assert.rejects(sync(api, store), /allow-large-sync/);
  assert.equal(api.uploads.length, 2);
  assert.equal(api.removals.length, 1);
});
test("create reuses current/configured stores; force-new is explicit and preserves prior receipts", async (t) => {
  const store = await temporaryStore(t),
    api = new FakeVectorApi();
  const first = await createVectorStore(api, store, {}, {});
  assert.equal((await createVectorStore(api, store, {}, {})).id, first.id);
  const second = await createVectorStore(api, store, { forceNew: true }, {});
  assert.notEqual(first.id, second.id);
  assert.equal(Object.keys((await readState(store)).stores).length, 2);
  assert.equal(
    (
      await createVectorStore(
        api,
        store,
        {},
        { OPENAI_RAG_VECTOR_STORE_ID: first.id },
      )
    ).id,
    first.id,
  );
  assert.equal(api.stores.size, 2);
});
test("ambiguous creation recovers from owner/token metadata instead of creating duplicates", async (t) => {
  const store = await temporaryStore(t),
    api = new FakeVectorApi();
  await createVectorStore(api, store, {}, {});
  const original = api.createStore.bind(api);
  api.createStore = async (...args) => {
    await original(...args);
    throw new VectorApiError(null);
  };
  await assert.rejects(createVectorStore(api, store, { forceNew: true }, {}));
  api.createStore = original;
  assert.equal((await createVectorStore(api, store, {}, {})).id, "vs_2");
  assert.equal(api.stores.size, 2);
});
test("status includes manifest documents awaiting their first sync", async (t) => {
  const { store, api } = await vectorFixture(t);
  const status = await vectorStatus(api, store, {});
  assert.equal(status.filesIndexed, 0);
  assert.equal(status.pending, 2);
  assert.equal(status.lastSync, null);
});
test("deletion requires exact confirmation and matching development ownership", async (t) => {
  const { store, api } = await vectorFixture(t);
  await assert.rejects(deleteDevelopmentStore(api, store, "vs_wrong", {}), {
    category: "policy-limit",
  });
  api.stores.get("vs_1").metadata.workspace = "someone-else";
  await assert.rejects(
    deleteDevelopmentStore(api, store, "vs_1", {}),
    /shared store/,
  );
  assert.equal(api.stores.size, 1);
});
test("filters encode supported attributes; full-topic matching is intentionally local", () => {
  assert.deepEqual(
    remoteFilters({
      humanOnly: true,
      yearFrom: 2020,
      yearTo: 2026,
      studyType: "rct",
      maxTier: 2,
      topic: "exercise",
    }),
    {
      type: "and",
      filters: [
        { type: "eq", key: "retracted", value: false },
        { type: "eq", key: "population", value: "human" },
        { type: "gte", key: "year", value: 2020 },
        { type: "lte", key: "year", value: 2026 },
        { type: "eq", key: "study_type", value: "randomized-controlled-trial" },
        { type: "lte", key: "study_tier", value: 2 },
      ],
    },
  );
  for (const value of [
    { yearFrom: 2026, yearTo: 2020 },
    { maxTier: 0 },
    { studyType: "guessed" },
  ])
    assert.throws(() => remoteFilters(value));
  assert.throws(() => vectorArguments("sync", ["--unknown"]));
  assert.throws(() => vectorArguments("search", ["--max-results"]));
});
test("search expands to fifty rewritten candidates; secondary topics use bounded post-filtering", async (t) => {
  const { store, api } = await vectorFixture(t);
  await editEntry(store, "10001", { topics: ["exercise", "mitochondria"] });
  await sync(api, store);
  const result = await searchVector(api, store, "exercise", {}, {});
  assert.equal(api.searches[0].request.maxResults, 50);
  assert.equal(api.searches[0].request.rewriteQuery, true);
  assert.equal(result.results.length, 2);
  const filtered = await searchVector(
    api,
    store,
    "mitophagy",
    { topic: "mitochondria" },
    {},
  );
  assert.equal(filtered.candidateLimit, 50);
  assert.deepEqual(
    filtered.results.map((result) => result.pmid),
    ["10001"],
  );
  assert.match(filtered.filterMethod, /post-filter/);
});
test("local filtering rejects unknown, stale, withdrawn and nonhuman hits during eventual consistency", async (t) => {
  const { store, api } = await vectorFixture(t);
  await sync(api, store);
  api.remote.push({
    id: "file-unknown",
    status: "completed",
    attributes: {},
    chunking: CHUNKING,
  });
  const human = await searchVector(
    api,
    store,
    "exercise",
    { humanOnly: true },
    {},
  );
  assert.deepEqual(
    human.results.map((result) => result.pmid),
    ["10001"],
  );
  assert.equal(human.suppressed.filter, 1);
  assert.equal(human.suppressed["unknown-or-unindexed"], 1);
  await editEntry(store, "10001", {
    retrievalEnabled: false,
    retracted: true,
    status: "retracted",
    indexAction: "remove",
  });
  const withdrawn = await searchVector(api, store, "exercise", {}, {});
  assert.ok(withdrawn.results.every((result) => result.pmid !== "10001"));
  assert.equal(withdrawn.suppressed.retracted, 1);
  api.remote[1].attributes.document_sha256 = "stale";
  assert.equal(
    (await searchVector(api, store, "exercise", {}, {})).results.length,
    0,
  );
});
test("search rejects corrupted local content and invalid query/filter limits without an answer call", async (t) => {
  const { store, api } = await vectorFixture(t);
  await sync(api, store);
  await store.write("retrieval/10001.md", "Changed", true);
  const result = await searchVector(api, store, "exercise", {}, {});
  assert.equal(result.suppressed["source-verification"], 1);
  assert.deepEqual(
    result.results.map((result) => result.pmid),
    ["10003"],
  );
  for (const options of [
    { maxResults: 51 },
    { scoreThreshold: 1.1 },
    { topic: "not-a-topic" },
  ])
    await assert.rejects(searchVector(api, store, "query", options, {}));
});
test("official SDK sends explicit per-file 800/100 chunking and parses search envelope without answer generation", async () => {
  const requests = [];
  const secret = "sk-fixture-never-log-this";
  const client = sdkClient({
    OPENAI_API_KEY: secret,
    OPENAI_BASE_URL: "https://ignored.invalid",
  }).withOptions({
    fetch: async (url, init) => {
      assert.equal(new URL(url).origin, "https://api.openai.com");
      requests.push({
        path: new URL(url).pathname,
        body: JSON.parse(init.body),
      });
      return Response.json(
        String(url).endsWith("/search")
          ? {
              object: "vector_store.search_results.page",
              search_query: ["rewritten exercise"],
              has_more: false,
              next_page: null,
              data: [
                {
                  file_id: "file-fixture",
                  filename: "10001.md",
                  score: 0.8,
                  attributes: { pmid: "10001" },
                  content: [{ type: "text", text: "Fixture chunk" }],
                },
              ],
            }
          : {
              id: "batch-fixture",
              object: "vector_store.files_batch",
              status: "completed",
              vector_store_id: "vs_fixture",
              file_counts: {},
            },
      );
    },
  });
  const api = new OpenAIVectorApi(client, async () => {});
  await api.attachBatch("vs_fixture", [
    { fileId: "file-fixture", attributes: { pmid: "10001" } },
  ]);
  assert.deepEqual(requests[0].body.files[0].chunking_strategy, CHUNKING);
  const result = await api.search("vs_fixture", {
    query: "exercise",
    maxResults: 10,
    rewriteQuery: true,
    scoreThreshold: 0.2,
    filters: remoteFilters({}),
  });
  assert.deepEqual(result.rewrittenQuery, ["rewritten exercise"]);
  assert.equal(result.hits[0].content[0], "Fixture chunk");
  assert.ok(requests.every((request) => !request.path.includes("responses")));
});
test("safe read retries and pagination are bounded; mutations never blindly retry or log API keys", async (t) => {
  const messages = [];
  for (const method of ["log", "warn", "error", "debug"])
    t.mock.method(console, method, (...args) => messages.push(args.join(" ")));
  const secret = "sk-test-secret-sentinel";
  let calls = 0;
  const client = sdkClient({ OPENAI_API_KEY: secret }).withOptions({
    fetch: async (url) => {
      if (url === "data:,") return new Response();
      calls++;
      return Response.json(
        { error: { message: `Provider echoed ${secret}` } },
        { status: 500 },
      );
    },
  });
  const api = new OpenAIVectorApi(client, async () => {});
  await assert.rejects(
    api.getStore("vs_fixture"),
    (error) => !error.message.includes(secret),
  );
  assert.equal(calls, 3);
  calls = 0;
  await assert.rejects(
    api.upload("10001.md", "Fixture text"),
    (error) => !error.message.includes(secret),
  );
  assert.equal(calls, 1);
  assert.ok(!messages.join("\n").includes(secret));
  assert.equal(
    redactedOutput(`bad ${secret}`, { OPENAI_API_KEY: secret }),
    "bad [REDACTED]",
  );
  assert.throws(() => sdkClient({}), { category: "configuration" });
  const urls = [];
  const pagedClient = sdkClient({ OPENAI_API_KEY: secret }).withOptions({
    fetch: async (url) => {
      urls.push(new URL(url));
      const second = urls.length === 2;
      return Response.json({
        object: "list",
        has_more: !second,
        data: [
          {
            id: second ? "file-two" : "file-one",
            status: "completed",
            attributes: {},
            chunking_strategy: CHUNKING,
          },
        ],
      });
    },
  });
  assert.equal(
    (
      await new OpenAIVectorApi(pagedClient, async () => {}).listFiles(
        "vs_fixture",
      )
    ).length,
    2,
  );
  assert.equal(urls[1].searchParams.get("after"), "file-one");
});
test("manifest mutation during an API call prevents subsequent uploads/attachments", async (t) => {
  const { store, api } = await vectorFixture(t);
  const original = api.upload.bind(api);
  api.upload = async (...args) => {
    const result = await original(...args);
    await editEntry(store, "10003", {
      retrievalEnabled: false,
      status: "retrieval-disabled",
      indexAction: "remove",
    });
    return result;
  };
  await assert.rejects(sync(api, store), /manifest changed/);
  assert.equal(api.attachments.length, 0);
  assert.equal(api.uploads.length, 1);
});
