import { canonicalStudy, studyTypes } from "../shared/study-types.js";
import type { ManifestEntry } from "../corpus/schema.js";
import { RagError } from "../shared/logging.js";
import type { Filter } from "../indexing/openai-client.js";

export interface Filters {
  humanOnly?: boolean;
  yearFrom?: number;
  yearTo?: number;
  studyType?: string;
  maxTier?: number;
  topic?: string;
}
export function validateFilters(filters: Filters): void {
  for (const year of [filters.yearFrom, filters.yearTo]) {
    if (
      year !== undefined &&
      (!Number.isInteger(year) || year < 1 || year > 9999)
    )
      throw new RagError(
        "configuration",
        "Year filters must be integers from 1-9999.",
      );
  }
  if (
    filters.yearFrom !== undefined &&
    filters.yearTo !== undefined &&
    filters.yearFrom > filters.yearTo
  )
    throw new RagError("configuration", "year-from must not exceed year-to.");
  if (
    filters.maxTier !== undefined &&
    (!Number.isInteger(filters.maxTier) ||
      filters.maxTier < 1 ||
      filters.maxTier > 8)
  )
    throw new RagError(
      "configuration",
      "max-tier must be 1-8; unknown tiers are excluded.",
    );
  if (
    filters.studyType !== undefined &&
    !studyTypes.some((type) => type === filters.studyType)
  )
    throw new RagError("configuration", "Unknown study-type filter.");
  if (filters.topic !== undefined && !/^[a-z][a-z0-9-]+$/.test(filters.topic))
    throw new RagError("configuration", "Invalid topic filter.");
}
export function remoteFilters(filters: Filters): Filter {
  validateFilters(filters);
  const clauses: Filter[] = [{ type: "eq", key: "retracted", value: false }];
  if (filters.humanOnly)
    clauses.push({ type: "eq", key: "population", value: "human" });
  if (filters.yearFrom !== undefined)
    clauses.push({ type: "gte", key: "year", value: filters.yearFrom });
  if (filters.yearTo !== undefined)
    clauses.push({ type: "lte", key: "year", value: filters.yearTo });
  if (filters.studyType !== undefined)
    clauses.push({
      type: "eq",
      key: "study_type",
      value: canonicalStudy(filters.studyType),
    });
  if (filters.maxTier !== undefined)
    clauses.push({ type: "lte", key: "study_tier", value: filters.maxTier });
  return { type: "and", filters: clauses };
}
export function matchesFilters(
  entry: Pick<
    ManifestEntry,
    "population" | "year" | "studyType" | "studyDesignTier" | "topics"
  >,
  filters: Filters,
): boolean {
  return (
    (!filters.humanOnly || entry.population === "human") &&
    (filters.yearFrom === undefined ||
      (entry.year !== null && entry.year >= filters.yearFrom)) &&
    (filters.yearTo === undefined ||
      (entry.year !== null && entry.year <= filters.yearTo)) &&
    (filters.studyType === undefined ||
      canonicalStudy(entry.studyType) === canonicalStudy(filters.studyType)) &&
    (filters.maxTier === undefined ||
      (entry.studyDesignTier !== null &&
        entry.studyDesignTier <= filters.maxTier)) &&
    (filters.topic === undefined || entry.topics.includes(filters.topic))
  );
}
