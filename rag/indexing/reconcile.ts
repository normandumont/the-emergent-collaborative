import { object } from "../shared/config.js";
import { RagError, category, log } from "../shared/logging.js";
import type { LocalStore } from "../shared/storage.js";
import {
  CHUNKING,
  sleep,
  type RemoteFile,
  type VectorApi,
} from "./openai-client.js";
import {
  currentStore,
  readState,
  saveState,
  selectedId,
  type IndexedFile,
  type StoreState,
  type VectorState,
} from "./state.js";
import {
  fileAttributes,
  fingerprint,
  indexable,
  sameAttributes,
} from "./metadata.js";
import {
  indexingManifest,
  unchangedManifest,
  verifyDocument,
} from "./manifest-input.js";
import { removeIndexedFile } from "./remove.js";
import { uploadDocument } from "./upload.js";

export interface SyncOptions {
  allowLargeSync?: boolean;
  batchSize?: number;
  pollAttempts?: number;
  pause?: (ms: number) => Promise<void>;
}
export interface SyncSummary {
  storeId: string;
  desired: number;
  uploaded: number;
  removed: number;
  unchanged: number;
  pending: number;
  failed: number;
  failures: { pmid: string; fileId: string; code: string | null }[];
  mismatches: string[];
  unknownRemote: string[];
  errors: number;
}
export function chunkingMatches(value: unknown): boolean {
  return (
    object(value) &&
    value["type"] === "static" &&
    object(value["static"]) &&
    value["static"]["max_chunk_size_tokens"] ===
      CHUNKING.static.max_chunk_size_tokens &&
    value["static"]["chunk_overlap_tokens"] ===
      CHUNKING.static.chunk_overlap_tokens
  );
}
function reconcileReceipt(file: IndexedFile, remote: RemoteFile): void {
  if (file.status === "removed" || file.status === "removing") return;
  if (remote.status === "completed") file.status = "indexed";
  else if (remote.status === "in_progress") file.status = "indexing";
  else if (remote.status === "failed" || remote.status === "cancelled") {
    file.status = "failed";
    file.lastError = remote.errorCode ?? `indexing-${remote.status}`;
  } else
    throw new RagError(
      "malformed-source",
      "Unexpected remote indexing status.",
    );
}
async function finishBatch(
  api: VectorApi,
  store: LocalStore,
  state: VectorState,
  target: StoreState,
  options: SyncOptions,
): Promise<RemoteFile[]> {
  const batch = target.pendingBatch;
  if (!batch) return api.listFiles(target.id);
  const activeIds = batch.fileIds.filter((id) =>
    target.files.some(
      (file) => file.fileId === id && file.status !== "removed",
    ),
  );
  if (!activeIds.length) {
    target.pendingBatch = null;
    await saveState(store, state);
    return api.listFiles(target.id);
  }
  const attempts = options.pollAttempts ?? 60;
  const pause = options.pause ?? sleep;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const status = batch.id
      ? await api.getBatch(target.id, batch.id)
      : "unknown";
    const remote = await api.listFiles(target.id);
    for (const file of target.files) {
      const current = remote.find((item) => item.id === file.fileId);
      if (current) reconcileReceipt(file, current);
    }
    const allPresent = activeIds.every((id) =>
      remote.some((file) => file.id === id),
    );
    const terminal =
      allPresent &&
      activeIds.every((id) =>
        remote.some((file) => file.id === id && file.status !== "in_progress"),
      );
    if (terminal || status === "failed" || status === "cancelled") {
      for (const file of target.files.filter((item) =>
        activeIds.includes(item.fileId),
      )) {
        if (!remote.some((item) => item.id === file.fileId)) {
          file.status = "failed";
          file.lastError = "batch-file-missing";
        }
      }
      target.pendingBatch = null;
      await saveState(store, state);
      return remote;
    }
    await saveState(store, state);
    if (!batch.id && !allPresent)
      throw new RagError(
        "policy-limit",
        "Uncertain batch attachment; inspect pending file IDs before retrying.",
      );
    await pause(2000);
  }
  throw new RagError(
    "timeout",
    "Indexing is still pending; rerun sync to resume polling without re-uploading.",
  );
}

export async function synchronize(
  api: VectorApi,
  store: LocalStore,
  options: SyncOptions = {},
  env: NodeJS.ProcessEnv = process.env,
): Promise<SyncSummary> {
  const batchSize = options.batchSize ?? 10;
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500)
    throw new RagError("configuration", "Batch size must be 1-500.");
  const { manifest, manifestHash } = await indexingManifest(store);
  const state = await readState(store);
  const target = currentStore(state, selectedId(state, env));
  const remoteStore = await api.getStore(target.id);
  if (remoteStore.id !== target.id || remoteStore.status === "expired")
    throw new RagError(
      "configuration",
      "Development vector store is unavailable or expired.",
    );
  let remote = await api.listFiles(target.id);
  const desired = manifest.entries.filter(indexable);
  const summary: SyncSummary = {
    storeId: target.id,
    desired: desired.length,
    uploaded: 0,
    removed: 0,
    unchanged: 0,
    pending: 0,
    failed: 0,
    failures: [],
    mismatches: [],
    unknownRemote: [],
    errors: 0,
  };
  console.log(
    `Estimated indexed document count: ${desired.length}. New uploads may incur storage/processing costs.`,
  );
  function inventory(): void {
    summary.unknownRemote = remote
      .filter(
        (file) => !target.files.some((receipt) => receipt.fileId === file.id),
      )
      .map((file) => file.id)
      .sort();
  }
  inventory();
  for (const file of target.files) {
    const entry = desired.find((item) => item.pmid === file.pmid);
    const current = remote.find((item) => item.id === file.fileId);
    if (current) reconcileReceipt(file, current);
    const obsolete =
      !entry ||
      file.fingerprint !== fingerprint(entry) ||
      (current &&
        (!sameAttributes(current.attributes, fileAttributes(entry)) ||
          !chunkingMatches(current.chunking))) ||
      file.status === "removing" ||
      (file.status === "failed" && file.lastError === "server_error");
    if (obsolete && file.status !== "removed") {
      await removeIndexedFile(api, store, state, target, file, manifestHash);
      summary.removed++;
    }
  }
  if (target.pendingBatch) {
    try {
      remote = await finishBatch(api, store, state, target, options);
    } catch (error) {
      await saveState(store, state);
      throw error;
    }
  }
  if (target.pendingUpload)
    throw new RagError(
      "policy-limit",
      `Uncertain upload for PMID ${target.pendingUpload.pmid}; inspect the pending filename in vector-state.json before clearing it.`,
    );
  const verified = new Map<
    string,
    Awaited<ReturnType<typeof verifyDocument>>
  >();
  for (const entry of desired) {
    try {
      verified.set(entry.pmid, await verifyDocument(store, entry));
    } catch (error) {
      summary.errors++;
      summary.mismatches.push(entry.pmid);
      log({
        pmid: entry.pmid,
        status: "vector-document-verification-failed",
        category: category(error),
      });
      if (error instanceof RagError) console.error(error.message);
      for (const file of target.files.filter(
        (file) => file.pmid === entry.pmid && file.status !== "removed",
      )) {
        await removeIndexedFile(api, store, state, target, file, manifestHash);
        summary.removed++;
      }
    }
  }
  const needed = desired.filter(
    (entry) =>
      verified.has(entry.pmid) &&
      !target.files.some(
        (file) =>
          file.pmid === entry.pmid &&
          file.fingerprint === fingerprint(entry) &&
          (file.status === "indexed" ||
            file.status === "indexing" ||
            file.status === "uploaded" ||
            file.status === "failed") &&
          (file.status === "uploaded" ||
            file.status === "failed" ||
            remote.some((item) => item.id === file.fileId)),
      ),
  );
  summary.unchanged = desired.filter(
    (entry) =>
      verified.has(entry.pmid) &&
      target.files.some(
        (file) =>
          file.pmid === entry.pmid &&
          file.status === "indexed" &&
          file.fingerprint === fingerprint(entry) &&
          remote.some((item) => item.id === file.fileId),
      ),
  ).length;
  if (
    (desired.length > 100 || needed.length > 100) &&
    !options.allowLargeSync
  ) {
    await saveState(store, state);
    throw new RagError(
      "policy-limit",
      "More than 100 desired documents requires --allow-large-sync; no new uploads performed.",
    );
  }
  for (const entry of needed) {
    const document = verified.get(entry.pmid);
    if (!document)
      throw new RagError("storage", "Verified document disappeared.");
    await uploadDocument(
      api,
      store,
      state,
      target,
      entry,
      document,
      manifestHash,
    );
    summary.uploaded++;
  }
  const unattached = target.files.filter(
    (file) =>
      file.status === "uploaded" &&
      desired.some(
        (entry) =>
          entry.pmid === file.pmid && fingerprint(entry) === file.fingerprint,
      ) &&
      !remote.some((item) => item.id === file.fileId),
  );
  for (let offset = 0; offset < unattached.length; offset += batchSize) {
    const files = unattached.slice(offset, offset + batchSize);
    await unchangedManifest(store, manifestHash);
    target.pendingBatch = {
      fileIds: files.map((file) => file.fileId),
      id: null,
    };
    await saveState(store, state);
    const batchId = await api.attachBatch(
      target.id,
      files.map((file) => ({
        fileId: file.fileId,
        attributes: file.attributes,
      })),
    );
    target.pendingBatch.id = batchId;
    for (const file of files) {
      file.batchId = batchId;
      file.status = "indexing";
    }
    await saveState(store, state);
    remote = await finishBatch(api, store, state, target, options);
  }
  for (const file of target.files) {
    const current = remote.find((item) => item.id === file.fileId);
    if (current) reconcileReceipt(file, current);
  }
  summary.pending = target.files.filter(
    (file) => file.status === "uploaded" || file.status === "indexing",
  ).length;
  summary.failed = target.files.filter(
    (file) => file.status === "failed",
  ).length;
  summary.failures = target.files
    .filter((file) => file.status === "failed")
    .map((file) => ({
      pmid: file.pmid,
      fileId: file.fileId,
      code: file.lastError,
    }));
  summary.errors += summary.failed;
  inventory();
  await unchangedManifest(store, manifestHash);
  target.manifestHash = manifestHash;
  if (!summary.errors && !summary.pending)
    target.lastSync = new Date().toISOString();
  await saveState(store, state);
  return summary;
}

export async function vectorStatus(
  api: VectorApi,
  store: LocalStore,
  env: NodeJS.ProcessEnv = process.env,
) {
  const { manifest, manifestHash } = await indexingManifest(store);
  const state = await readState(store);
  const target = currentStore(state, selectedId(state, env));
  const remoteStore = await api.getStore(target.id);
  const remote = await api.listFiles(target.id);
  const mismatches: string[] = [];
  for (const entry of manifest.entries.filter(indexable)) {
    try {
      await verifyDocument(store, entry);
    } catch (error) {
      mismatches.push(entry.pmid);
      log({
        pmid: entry.pmid,
        status: "vector-status-source-verification-failed",
        category: category(error),
      });
    }
  }
  const pendingPmids = manifest.entries
    .filter(
      (entry) =>
        indexable(entry) &&
        !target.files.some(
          (file) =>
            file.pmid === entry.pmid &&
            file.fingerprint === fingerprint(entry) &&
            (file.status === "failed" ||
              (file.status === "indexed" &&
                remote.some(
                  (item) =>
                    item.id === file.fileId &&
                    item.status === "completed" &&
                    sameAttributes(item.attributes, fileAttributes(entry)) &&
                    chunkingMatches(item.chunking),
                ))),
        ),
    )
    .map((entry) => entry.pmid);
  if (target.pendingUpload) pendingPmids.push(target.pendingUpload.pmid);
  return {
    id: target.id,
    name: remoteStore.name,
    usageBytes: remoteStore.usageBytes,
    filesIndexed: remote.filter((file) => file.status === "completed").length,
    pending: new Set(pendingPmids).size,
    failed: new Set([
      ...remote
        .filter(
          (file) => file.status === "failed" || file.status === "cancelled",
        )
        .map((file) => file.id),
      ...target.files
        .filter((file) => file.status === "failed")
        .map((file) => file.fileId),
    ]).size,
    retrievalDisabled: manifest.entries.filter((entry) => !indexable(entry))
      .length,
    retractedRemoved: target.files.filter(
      (file) =>
        file.status === "removed" &&
        manifest.entries.some(
          (entry) => entry.pmid === file.pmid && entry.retracted,
        ),
    ).length,
    manifestMismatches: mismatches,
    synchronizedManifest: target.manifestHash === manifestHash,
    unknownRemote: remote
      .filter((file) => !target.files.some((known) => known.fileId === file.id))
      .map((file) => file.id),
    lastSync: target.lastSync,
    pendingBatch: target.pendingBatch,
    failures: target.files
      .filter((file) => file.status === "failed")
      .map((file) => ({
        pmid: file.pmid,
        fileId: file.fileId,
        code: file.lastError,
      })),
  };
}
