import { object, strings } from "../shared/config.js";
import { isCorpusState, type LocalStore } from "../shared/storage.js";
import { RagError } from "../shared/logging.js";
import type { ManifestEntry, RetrievalManifest } from "./schema.js";
import type { StudyType } from "../shared/article-schema.js";

import { studyTypes } from "../shared/study-types.js";
export { studyTypes };
function isStudy(value: unknown): value is StudyType {
  return typeof value === "string" && studyTypes.some((type) => type === value);
}
const digest = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const nullableDigest = (value: unknown): value is string | null =>
  value === null || digest(value);

export function parseManifest(data: unknown): RetrievalManifest {
  if (
    !object(data) ||
    data["schemaVersion"] !== 1 ||
    typeof data["policyVersion"] !== "number" ||
    !digest(data["policySha256"]) ||
    !digest(data["taxonomySha256"]) ||
    !Array.isArray(data["entries"])
  )
    throw new RagError("storage", "Invalid retrieval manifest.");
  const entries: ManifestEntry[] = [];
  for (const entry of data["entries"] as unknown[]) {
    if (
      !object(entry) ||
      typeof entry["pmid"] !== "string" ||
      !/^[1-9]\d{0,8}$/.test(entry["pmid"]) ||
      (entry["path"] !== null && entry["path"] !== `${entry["pmid"]}.md`) ||
      !nullableDigest(entry["sha256"]) ||
      typeof entry["eligible"] !== "boolean" ||
      typeof entry["retrievalEnabled"] !== "boolean" ||
      !isCorpusState(entry["status"]) ||
      (entry["contentScope"] !== "full-text-retrievable" &&
        entry["contentScope"] !== "abstract-only-retrievable" &&
        entry["contentScope"] !== "metadata-only" &&
        entry["contentScope"] !== "excluded") ||
      !isStudy(entry["studyType"]) ||
      (entry["studyDesignTier"] !== null &&
        (typeof entry["studyDesignTier"] !== "number" ||
          !Number.isInteger(entry["studyDesignTier"]) ||
          entry["studyDesignTier"] < 1 ||
          entry["studyDesignTier"] > 8)) ||
      (entry["population"] !== "human" &&
        entry["population"] !== "animal" &&
        entry["population"] !== "unknown") ||
      !strings(entry["topics"]) ||
      (entry["year"] !== null &&
        (typeof entry["year"] !== "number" ||
          !Number.isInteger(entry["year"]))) ||
      typeof entry["hasFullText"] !== "boolean" ||
      typeof entry["retracted"] !== "boolean" ||
      typeof entry["corrected"] !== "boolean" ||
      typeof entry["expressionOfConcern"] !== "boolean" ||
      typeof entry["superseded"] !== "boolean" ||
      (entry["license"] !== null && typeof entry["license"] !== "string") ||
      typeof entry["policyVersion"] !== "number" ||
      !digest(entry["policySha256"]) ||
      !digest(entry["normalizedRecordSha256"]) ||
      !digest(entry["baseNormalizedSha256"]) ||
      !strings(entry["sourceSha256"]) ||
      !entry["sourceSha256"].every(digest) ||
      typeof entry["decisionPath"] !== "string" ||
      !/^corpus\/decisions\/[1-9]\d{0,8}\/[a-f0-9]{64}\.json$/.test(
        entry["decisionPath"],
      ) ||
      !digest(entry["dependencySha256"]) ||
      !strings(entry["reasons"]) ||
      !strings(entry["warnings"]) ||
      typeof entry["reindexRequired"] !== "boolean" ||
      (entry["indexAction"] !== "upsert" &&
        entry["indexAction"] !== "remove") ||
      (entry["retrievalEnabled"] &&
        (!entry["eligible"] ||
          entry["path"] === null ||
          entry["sha256"] === null ||
          entry["status"] !== "active" ||
          entry["retracted"] ||
          entry["expressionOfConcern"] ||
          entry["superseded"] ||
          entry["policyVersion"] !== data["policyVersion"] ||
          entry["policySha256"] !== data["policySha256"] ||
          (entry["contentScope"] !== "full-text-retrievable" &&
            entry["contentScope"] !== "abstract-only-retrievable")))
    ) {
      throw new RagError("storage", "Invalid retrieval manifest entry.");
    }
    entries.push({
      pmid: entry["pmid"],
      path: entry["path"],
      sha256: entry["sha256"],
      eligible: entry["eligible"],
      retrievalEnabled: entry["retrievalEnabled"],
      status: entry["status"],
      contentScope: entry["contentScope"],
      studyType: entry["studyType"],
      studyDesignTier: entry["studyDesignTier"],
      population: entry["population"],
      topics: entry["topics"],
      year: entry["year"],
      hasFullText: entry["hasFullText"],
      license: entry["license"],
      retracted: entry["retracted"],
      corrected: entry["corrected"],
      expressionOfConcern: entry["expressionOfConcern"],
      superseded: entry["superseded"],
      policyVersion: entry["policyVersion"],
      policySha256: entry["policySha256"],
      normalizedRecordSha256: entry["normalizedRecordSha256"],
      baseNormalizedSha256: entry["baseNormalizedSha256"],
      sourceSha256: entry["sourceSha256"],
      decisionPath: entry["decisionPath"],
      dependencySha256: entry["dependencySha256"],
      reasons: entry["reasons"],
      warnings: entry["warnings"],
      reindexRequired: entry["reindexRequired"],
      indexAction: entry["indexAction"],
    });
  }
  if (new Set(entries.map((entry) => entry.pmid)).size !== entries.length)
    throw new RagError("storage", "Duplicate retrieval manifest entries.");
  return {
    schemaVersion: 1,
    policyVersion: data["policyVersion"],
    policySha256: data["policySha256"],
    taxonomySha256: data["taxonomySha256"],
    entries,
  };
}

export async function readManifest(
  store: LocalStore,
): Promise<RetrievalManifest | null> {
  const data = await store.json("retrieval/manifest.json");
  return data === null ? null : parseManifest(data);
}

export async function disableManifest(
  store: LocalStore,
  reason: string,
  pmids?: string[],
): Promise<RetrievalManifest | null> {
  const manifest = await readManifest(store);
  if (!manifest) return null;
  const disabled: RetrievalManifest = {
    ...manifest,
    entries: manifest.entries.map((entry) =>
      !pmids || pmids.includes(entry.pmid)
        ? {
            ...entry,
            retrievalEnabled: false,
            status: "retrieval-disabled",
            indexAction: "remove",
            reindexRequired: true,
            reasons: [...new Set([...entry.reasons, reason])].sort(),
          }
        : entry,
    ),
  };
  await store.versionedJson("retrieval/manifest.json", disabled);
  return manifest;
}
