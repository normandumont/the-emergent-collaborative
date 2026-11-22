import type { LocalStore } from "../shared/storage.js";
import type { VectorApi } from "./openai-client.js";
import {
  saveState,
  type IndexedFile,
  type StoreState,
  type VectorState,
} from "./state.js";
import { unchangedManifest } from "./manifest-input.js";

export async function removeIndexedFile(
  api: VectorApi,
  store: LocalStore,
  state: VectorState,
  target: StoreState,
  file: IndexedFile,
  manifestHash: string,
): Promise<void> {
  if (file.status === "removed") return;
  await unchangedManifest(store, manifestHash);
  file.status = "removing";
  await saveState(store, state);
  await api.detach(target.id, file.fileId);
  file.status = "removed";
  file.lastError = null;
  await saveState(store, state);
}
