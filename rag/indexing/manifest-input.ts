import { readManifest } from "../corpus/manifest.js";
import { loadCorpusConfig } from "../corpus/config.js";
import type { ManifestEntry } from "../corpus/schema.js";
import { object } from "../shared/config.js";
import { hash, type LocalStore } from "../shared/storage.js";
import { RagError } from "../shared/logging.js";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

export async function indexingManifest(store: LocalStore) {
  const manifest = await readManifest(store);
  if (!manifest)
    throw new RagError(
      "storage",
      "Prepare the retrieval manifest before indexing.",
    );
  const config = await loadCorpusConfig();
  if (
    manifest.policyVersion !== config.policy.policyVersion ||
    manifest.policySha256 !== config.policySha256 ||
    manifest.taxonomySha256 !== config.taxonomySha256
  )
    throw new RagError(
      "policy-limit",
      "Corpus policy/taxonomy changed; rerun rag:prepare.",
    );
  const raw = await store.read("retrieval/manifest.json");
  if (raw === null)
    throw new RagError("storage", "Retrieval manifest disappeared.");
  return { manifest, manifestHash: hash(raw) };
}
export async function unchangedManifest(
  store: LocalStore,
  expected: string,
): Promise<void> {
  const current = await store.read("retrieval/manifest.json");
  if (current === null || hash(current) !== expected)
    throw new RagError(
      "policy-limit",
      "Retrieval manifest changed during operation; refusing further remote work.",
    );
}
export async function verifyDocument(
  store: LocalStore,
  entry: ManifestEntry,
): Promise<{ text: string; title: string | null }> {
  if (entry.path !== `${entry.pmid}.md` || entry.sha256 === null)
    throw new RagError(
      "storage",
      `PMID ${entry.pmid}: missing retrieval document path/hash.`,
    );
  let bytes: Buffer;
  try {
    bytes = await readFile(store.resolve(`retrieval/${entry.path}`));
  } catch {
    throw new RagError(
      "storage",
      `PMID ${entry.pmid}: cannot read retrieval document.`,
    );
  }
  const text = bytes.toString("utf8");
  if (
    createHash("sha256").update(bytes).digest("hex") !== entry.sha256 ||
    !Buffer.from(text, "utf8").equals(bytes)
  )
    throw new RagError(
      "storage",
      `PMID ${entry.pmid}: retrieval document SHA-256 mismatch or invalid UTF-8.`,
    );
  const normalizedPath = `corpus/versions/${entry.pmid}/${entry.normalizedRecordSha256}.json`;
  const normalized = await store.read(normalizedPath);
  const base = await store.read(`normalized/${entry.pmid}.json`);
  if (
    normalized === null ||
    hash(normalized) !== entry.normalizedRecordSha256 ||
    base === null ||
    hash(base) !== entry.baseNormalizedSha256
  )
    throw new RagError(
      "storage",
      `PMID ${entry.pmid}: normalized provenance mismatch; rerun preparation.`,
    );
  const record = await store.json(normalizedPath);
  if (
    !object(record) ||
    !object(record["identity"]) ||
    record["identity"]["pmid"] !== entry.pmid ||
    !object(record["citation"]) ||
    (record["citation"]["title"] !== null &&
      typeof record["citation"]["title"] !== "string") ||
    !object(record["source"]) ||
    !Array.isArray(record["source"]["provenance"])
  )
    throw new RagError(
      "storage",
      `PMID ${entry.pmid}: invalid governed record.`,
    );
  const sourceHashes: string[] = [];
  for (const source of record["source"]["provenance"] as unknown[]) {
    if (
      !object(source) ||
      typeof source["rawPath"] !== "string" ||
      typeof source["sha256"] !== "string"
    )
      throw new RagError(
        "storage",
        `PMID ${entry.pmid}: invalid source provenance.`,
      );
    const raw = await store.read(source["rawPath"]);
    if (raw === null || hash(raw) !== source["sha256"])
      throw new RagError(
        "storage",
        `PMID ${entry.pmid}: raw source SHA-256 mismatch.`,
      );
    sourceHashes.push(source["sha256"]);
  }
  if (JSON.stringify(sourceHashes) !== JSON.stringify(entry.sourceSha256))
    throw new RagError(
      "storage",
      `PMID ${entry.pmid}: source manifest mismatch.`,
    );
  return { text, title: record["citation"]["title"] };
}
