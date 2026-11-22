import type { ManifestEntry } from "../corpus/schema.js";
import { createHash } from "node:crypto";
import { stableJson } from "../shared/json.js";
import type { Attributes } from "./openai-client.js";
import { CHUNKING } from "./chunking.js";
import { canonicalStudy } from "../shared/study-types.js";

export { canonicalStudy };
export type MetadataEntry = Pick<
  ManifestEntry,
  | "sha256"
  | "pmid"
  | "studyType"
  | "population"
  | "contentScope"
  | "retracted"
  | "topics"
  | "year"
  | "studyDesignTier"
  | "license"
>;
export function fileAttributes(entry: MetadataEntry): Attributes {
  return {
    pmid: entry.pmid,
    study_type: canonicalStudy(entry.studyType),
    population: entry.population,
    content_scope: entry.contentScope,
    retracted: entry.retracted,
    topic_primary: [...entry.topics].sort()[0] ?? "unknown",
    document_sha256: entry.sha256 ?? "none",
    ...(entry.year === null ? {} : { year: entry.year }),
    ...(entry.studyDesignTier === null
      ? {}
      : { study_tier: entry.studyDesignTier }),
    ...(entry.license === null ? {} : { license: entry.license }),
  };
}
export function fingerprint(entry: MetadataEntry): string {
  return createHash("sha256")
    .update(
      stableJson({
        sha256: entry.sha256,
        attributes: fileAttributes(entry),
        chunking: CHUNKING,
      }),
    )
    .digest("hex");
}
export function sameAttributes(a: Attributes | null, b: Attributes): boolean {
  return a !== null && stableJson(a) === stableJson(b);
}
export function indexable(
  entry: Pick<
    ManifestEntry,
    | "eligible"
    | "retrievalEnabled"
    | "retracted"
    | "expressionOfConcern"
    | "superseded"
    | "status"
    | "indexAction"
  >,
): boolean {
  return (
    entry.eligible &&
    entry.retrievalEnabled &&
    !entry.retracted &&
    !entry.expressionOfConcern &&
    !entry.superseded &&
    entry.status === "active" &&
    entry.indexAction === "upsert"
  );
}
