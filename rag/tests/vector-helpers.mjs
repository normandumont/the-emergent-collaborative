import assert from "node:assert/strict";
import { config, clock, fixture, temporaryStore } from "./helpers.mjs";
import { PubmedClient } from "../lib/discovery/pubmed-client.js";
import { ingest } from "../lib/ingestion/ingest.js";
import { prepareCorpus } from "../lib/corpus/prepare.js";
import { readManifest } from "../lib/corpus/manifest.js";
import { createVectorStore } from "../lib/indexing/vector-store.js";
import { CHUNKING, VectorApiError } from "../lib/indexing/openai-client.js";

export class FakeVectorApi {
  stores = new Map();
  remote = [];
  uploads = [];
  attachments = [];
  removals = [];
  deletedFiles = [];
  searches = [];
  batchStatus = "completed";
  failures = new Set();
  failureCode = "unsupported_file";
  hits = null;
  uploadError = false;
  attachError = false;
  async createStore(name, metadata) {
    const remote = {
      id: `vs_${this.stores.size + 1}`,
      name,
      createdAt: 1_800_000_000,
      status: "completed",
      metadata,
      usageBytes: 123,
    };
    this.stores.set(remote.id, remote);
    return structuredClone(remote);
  }
  async getStore(id) {
    const value = this.stores.get(id);
    if (!value) throw new VectorApiError(404);
    return structuredClone(value);
  }
  async listStores() {
    return structuredClone([...this.stores.values()]);
  }
  async deleteStore(id) {
    this.stores.delete(id);
  }
  async listFiles() {
    return structuredClone(this.remote);
  }
  async upload(filename, text) {
    const id = `file-${this.uploads.length + 1}`;
    this.uploads.push({ id, filename, text });
    if (this.uploadError) throw new VectorApiError(null);
    return id;
  }
  async attachBatch(storeId, files) {
    this.attachments.push({ storeId, files: structuredClone(files) });
    for (const file of files)
      this.remote.push({
        id: file.fileId,
        attributes: file.attributes,
        chunking: structuredClone(CHUNKING),
        errorCode: this.failures.has(file.attributes.pmid)
          ? this.failureCode
          : null,
        status: this.failures.has(file.attributes.pmid)
          ? "failed"
          : this.batchStatus === "in_progress"
            ? "in_progress"
            : "completed",
      });
    if (this.attachError) throw new VectorApiError(null);
    return `batch-${this.attachments.length}`;
  }
  async getBatch() {
    return this.batchStatus;
  }
  async detach(storeId, fileId) {
    this.removals.push({ storeId, fileId });
    this.remote = this.remote.filter((file) => file.id !== fileId);
  }
  async deleteFile(fileId) {
    this.deletedFiles.push(fileId);
  }
  async search(storeId, request) {
    this.searches.push({ storeId, request });
    return {
      hits:
        this.hits ??
        this.remote.slice(0, request.maxResults).map((file, index) => ({
          fileId: file.id,
          filename:
            this.uploads.find((upload) => upload.id === file.id)?.filename ??
            "unknown.md",
          attributes: file.attributes,
          score: Math.max(0.01, 0.9 - index * 0.01),
          content: ["Authored research fixture chunk."],
        })),
      rewrittenQuery: [request.query],
      hasMore: false,
    };
  }
}
export async function vectorFixture(t) {
  const store = await temporaryStore(t);
  const cfg = await config();
  const xml = (await fixture("pubmed.xml")).replace(
    "Synthetic review",
    "Parkinson exercise synthetic review",
  );
  const metadata = await fixture("pmc-metadata.xml"),
    full = await fixture("pmc-full.xml");
  const client = new PubmedClient(
    cfg,
    async (url) =>
      new Response(
        String(url).includes("efetch.fcgi")
          ? xml
          : new URL(url).searchParams.get("metadataPrefix") === "pmc_fm"
            ? metadata
            : full,
      ),
    clock(),
  );
  assert.equal(
    (await ingest(client, store, cfg, ["10001", "10002", "10003"])).errors,
    0,
  );
  const catalog = await store.catalog();
  for (const entry of Object.values(catalog.articles))
    entry.queryIds = ["pd_exercise"];
  await store.saveCatalog(catalog);
  const prepared = await prepareCorpus(store, cfg);
  assert.equal(prepared.errors, 0);
  assert.deepEqual(
    prepared.manifest.entries
      .filter((entry) => entry.retrievalEnabled)
      .map((entry) => entry.pmid),
    ["10001", "10003"],
  );
  const api = new FakeVectorApi();
  await createVectorStore(api, store, {}, {});
  return { store, api };
}
export async function editEntry(store, pmid, update) {
  const manifest = await readManifest(store);
  assert.ok(manifest);
  const entry = manifest.entries.find((entry) => entry.pmid === pmid);
  assert.ok(entry);
  Object.assign(entry, update);
  await store.versionedJson("retrieval/manifest.json", manifest);
  return entry;
}
