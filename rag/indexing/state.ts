import { randomUUID } from "node:crypto";
import { object, strings } from "../shared/config.js";
import type { LocalStore } from "../shared/storage.js";
import { RagError } from "../shared/logging.js";
import type { Attributes } from "./openai-client.js";

export type FileStatus =
  "uploaded" | "indexing" | "indexed" | "failed" | "removing" | "removed";
export interface IndexedFile {
  fileId: string;
  pmid: string;
  sha256: string;
  fingerprint: string;
  filename: string;
  attributes: Attributes;
  topics: string[];
  title: string | null;
  status: FileStatus;
  batchId: string | null;
  lastError: string | null;
}
export interface StoreState {
  id: string;
  name: string;
  createdAt: number;
  owned: boolean;
  smokeTest: boolean;
  deleted: boolean;
  files: IndexedFile[];
  lastSync: string | null;
  manifestHash: string | null;
  pendingUpload: { pmid: string; filename: string; at: string } | null;
  pendingBatch: { fileIds: string[]; id: string | null } | null;
}
export interface VectorState {
  schemaVersion: 1;
  ownerId: string;
  currentStoreId: string | null;
  pendingCreate: { token: string; at: string } | null;
  stores: Record<string, StoreState>;
}
export function attributes(value: unknown): value is Attributes {
  return (
    object(value) &&
    Object.keys(value).length <= 16 &&
    Object.entries(value).every(
      ([key, item]) =>
        key.length <= 64 &&
        (typeof item === "boolean" ||
          (typeof item === "number" && Number.isFinite(item)) ||
          (typeof item === "string" && item.length <= 512)),
    )
  );
}
const nullableString = (value: unknown): value is string | null =>
  value === null || typeof value === "string";
export async function readState(store: LocalStore): Promise<VectorState> {
  const data = await store.json("vector-state.json");
  if (data === null)
    return {
      schemaVersion: 1,
      ownerId: randomUUID(),
      currentStoreId: null,
      pendingCreate: null,
      stores: {},
    };
  if (
    !object(data) ||
    data["schemaVersion"] !== 1 ||
    typeof data["ownerId"] !== "string" ||
    !/^[a-f0-9-]{36}$/.test(data["ownerId"]) ||
    !nullableString(data["currentStoreId"]) ||
    !object(data["stores"])
  )
    throw new RagError("storage", "Invalid local vector state.");
  let pendingCreate: VectorState["pendingCreate"] = null;
  if (data["pendingCreate"] !== null) {
    const pending = data["pendingCreate"];
    if (
      !object(pending) ||
      typeof pending["token"] !== "string" ||
      typeof pending["at"] !== "string"
    )
      throw new RagError("storage", "Invalid pending store creation.");
    pendingCreate = { token: pending["token"], at: pending["at"] };
  }
  const stores: VectorState["stores"] = {};
  for (const [id, value] of Object.entries(data["stores"])) {
    if (
      !/^vs_[a-zA-Z0-9_-]+$/.test(id) ||
      !object(value) ||
      value["id"] !== id ||
      typeof value["name"] !== "string" ||
      typeof value["createdAt"] !== "number" ||
      typeof value["owned"] !== "boolean" ||
      typeof value["smokeTest"] !== "boolean" ||
      typeof value["deleted"] !== "boolean" ||
      !Array.isArray(value["files"]) ||
      !nullableString(value["lastSync"]) ||
      !nullableString(value["manifestHash"])
    )
      throw new RagError("storage", "Invalid vector store state.");
    const files: IndexedFile[] = [];
    for (const file of value["files"] as unknown[]) {
      if (
        !object(file) ||
        typeof file["fileId"] !== "string" ||
        !/^file[-_][a-zA-Z0-9_-]+$/.test(file["fileId"]) ||
        typeof file["pmid"] !== "string" ||
        !/^[1-9]\d{0,8}$/.test(file["pmid"]) ||
        typeof file["sha256"] !== "string" ||
        !/^[a-f0-9]{64}$/.test(file["sha256"]) ||
        typeof file["fingerprint"] !== "string" ||
        !/^[a-f0-9]{64}$/.test(file["fingerprint"]) ||
        typeof file["filename"] !== "string" ||
        !attributes(file["attributes"]) ||
        !strings(file["topics"]) ||
        !nullableString(file["title"]) ||
        !nullableString(file["batchId"]) ||
        !nullableString(file["lastError"]) ||
        (file["status"] !== "uploaded" &&
          file["status"] !== "indexing" &&
          file["status"] !== "indexed" &&
          file["status"] !== "failed" &&
          file["status"] !== "removing" &&
          file["status"] !== "removed")
      )
        throw new RagError("storage", "Invalid indexed file state.");
      files.push({
        fileId: file["fileId"],
        pmid: file["pmid"],
        sha256: file["sha256"],
        fingerprint: file["fingerprint"],
        filename: file["filename"],
        attributes: file["attributes"],
        topics: file["topics"],
        title: file["title"],
        status: file["status"],
        batchId: file["batchId"],
        lastError: file["lastError"],
      });
    }
    if (new Set(files.map((file) => file.fileId)).size !== files.length)
      throw new RagError("storage", "Duplicate local file receipts.");
    let pendingUpload: StoreState["pendingUpload"] = null;
    if (value["pendingUpload"] !== null) {
      const pending = value["pendingUpload"];
      if (
        !object(pending) ||
        typeof pending["pmid"] !== "string" ||
        typeof pending["filename"] !== "string" ||
        typeof pending["at"] !== "string"
      )
        throw new RagError("storage", "Invalid pending upload.");
      pendingUpload = {
        pmid: pending["pmid"],
        filename: pending["filename"],
        at: pending["at"],
      };
    }
    let pendingBatch: StoreState["pendingBatch"] = null;
    if (value["pendingBatch"] !== null) {
      const pending = value["pendingBatch"];
      if (
        !object(pending) ||
        !strings(pending["fileIds"]) ||
        !nullableString(pending["id"])
      )
        throw new RagError("storage", "Invalid pending batch.");
      pendingBatch = { fileIds: pending["fileIds"], id: pending["id"] };
    }
    stores[id] = {
      id,
      name: value["name"],
      createdAt: value["createdAt"],
      owned: value["owned"],
      smokeTest: value["smokeTest"],
      deleted: value["deleted"],
      files,
      lastSync: value["lastSync"],
      manifestHash: value["manifestHash"],
      pendingUpload,
      pendingBatch,
    };
  }
  return {
    schemaVersion: 1,
    ownerId: data["ownerId"],
    currentStoreId: data["currentStoreId"],
    pendingCreate,
    stores,
  };
}
export async function saveState(
  store: LocalStore,
  state: VectorState,
): Promise<void> {
  await store.versionedJson("vector-state.json", state);
}
export function selectedId(
  state: VectorState,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const id = env["OPENAI_RAG_VECTOR_STORE_ID"] ?? state.currentStoreId;
  if (!id || !/^vs_[a-zA-Z0-9_-]+$/.test(id))
    throw new RagError(
      "configuration",
      "Configure a development vector store or run rag:vector:create.",
    );
  return id;
}
export function currentStore(state: VectorState, id: string): StoreState {
  const current = state.stores[id];
  if (!current || current.deleted)
    throw new RagError(
      "configuration",
      "Development store is not registered locally; run rag:vector:create to register the configured store.",
    );
  return current;
}
