import type { ManifestEntry } from "../corpus/schema.js";
import type { LocalStore } from "../shared/storage.js";
import type { VectorApi } from "./openai-client.js";
import { fileAttributes, fingerprint } from "./metadata.js";
import { unchangedManifest } from "./manifest-input.js";
import {
  saveState,
  type IndexedFile,
  type StoreState,
  type VectorState,
} from "./state.js";

export async function uploadDocument(
  api: VectorApi,
  store: LocalStore,
  state: VectorState,
  target: StoreState,
  entry: ManifestEntry,
  document: { text: string; title: string | null },
  manifestHash: string,
): Promise<IndexedFile> {
  await unchangedManifest(store, manifestHash);
  const digest = fingerprint(entry);
  const filename = `${entry.pmid}-${digest}-${state.ownerId}.md`;
  target.pendingUpload = {
    pmid: entry.pmid,
    filename,
    at: new Date().toISOString(),
  };
  await saveState(store, state);
  const fileId = await api.upload(filename, document.text);
  const receipt: IndexedFile = {
    fileId,
    pmid: entry.pmid,
    sha256: entry.sha256 ?? "",
    fingerprint: digest,
    filename,
    attributes: fileAttributes(entry),
    topics: entry.topics,
    title: document.title,
    status: "uploaded",
    batchId: null,
    lastError: null,
  };
  target.files.push(receipt);
  target.pendingUpload = null;
  await saveState(store, state);
  return receipt;
}
