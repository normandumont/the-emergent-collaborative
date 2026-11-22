import { randomUUID } from "node:crypto";
import { RagError } from "../shared/logging.js";
import type { LocalStore } from "../shared/storage.js";
import {
  readState,
  saveState,
  currentStore,
  selectedId,
  type VectorState,
  type StoreState,
} from "./state.js";
import type { RemoteStore, VectorApi } from "./openai-client.js";

export const DEVELOPMENT_SCOPE = "meridian-station-rag-development";
function register(state: VectorState, remote: RemoteStore): StoreState {
  const existing = state.stores[remote.id];
  if (existing?.deleted)
    throw new RagError(
      "configuration",
      "Configured store was locally marked deleted.",
    );
  const record: StoreState = existing ?? {
    id: remote.id,
    name: remote.name,
    createdAt: remote.createdAt,
    owned:
      remote.metadata?.["workspace"] === state.ownerId &&
      remote.metadata["scope"] === DEVELOPMENT_SCOPE,
    smokeTest: remote.metadata?.["mode"] === "smoke-test",
    deleted: false,
    files: [],
    lastSync: null,
    manifestHash: null,
    pendingUpload: null,
    pendingBatch: null,
  };
  state.stores[remote.id] = record;
  state.currentStoreId = remote.id;
  return record;
}
export async function createVectorStore(
  api: VectorApi,
  store: LocalStore,
  options: {
    forceNew?: boolean;
    expiresDays?: number;
    smokeTest?: boolean;
  } = {},
  env: NodeJS.ProcessEnv = process.env,
): Promise<RemoteStore> {
  const state = await readState(store);
  const expires = options.expiresDays ?? 7;
  if (!Number.isInteger(expires) || expires < 1 || expires > 365)
    throw new RagError("configuration", "Expiration days must be 1-365.");
  if (state.pendingCreate && !options.forceNew) {
    const matching = (await api.listStores()).filter(
      (remote) =>
        remote.metadata?.["workspace"] === state.ownerId &&
        remote.metadata["creation_token"] === state.pendingCreate?.token,
    );
    if (matching.length !== 1)
      throw new RagError(
        "policy-limit",
        "Unresolved store creation; inspect the OpenAI dashboard before --force-new.",
      );
    const recovered = matching[0];
    if (!recovered) throw new RagError("storage", "Missing recovered store.");
    register(state, recovered);
    state.pendingCreate = null;
    await saveState(store, state);
    return recovered;
  }
  if (
    !options.forceNew &&
    (env["OPENAI_RAG_VECTOR_STORE_ID"] || state.currentStoreId)
  ) {
    const id = selectedId(state, env);
    const existing = await api.getStore(id);
    if (existing.id !== id || existing.status === "expired")
      throw new RagError(
        "configuration",
        "Development vector store unavailable/expired; create a new store explicitly.",
      );
    register(state, existing);
    await saveState(store, state);
    return existing;
  }
  state.pendingCreate = { token: randomUUID(), at: new Date().toISOString() };
  await saveState(store, state);
  const remote = await api.createStore(
    `Meridian Station Parkinson's Research${options.smokeTest ? " (development smoke test)" : ""}`,
    {
      scope: DEVELOPMENT_SCOPE,
      workspace: state.ownerId,
      creation_token: state.pendingCreate.token,
      mode: options.smokeTest ? "smoke-test" : "development",
    },
    expires,
  );
  register(state, remote);
  state.pendingCreate = null;
  await saveState(store, state);
  return remote;
}
export async function deleteDevelopmentStore(
  api: VectorApi,
  store: LocalStore,
  confirmation: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const state = await readState(store);
  const id = selectedId(state, env);
  const local = currentStore(state, id);
  if (confirmation !== id || !local.owned)
    throw new RagError(
      "policy-limit",
      "Deletion requires the exact ID of a store created by this workspace.",
    );
  const remote = await api.getStore(id);
  if (
    remote.metadata?.["workspace"] !== state.ownerId ||
    remote.metadata["scope"] !== DEVELOPMENT_SCOPE
  )
    throw new RagError(
      "policy-limit",
      "Refusing to delete an unidentified/shared store.",
    );
  await api.deleteStore(id);
  local.deleted = true;
  if (state.currentStoreId === id) state.currentStoreId = null;
  await saveState(store, state);
}
