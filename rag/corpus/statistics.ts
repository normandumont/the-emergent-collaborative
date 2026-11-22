import type { LocalStore } from "../shared/storage.js";
import { RagError } from "../shared/logging.js";
import { readManifest } from "./manifest.js";

function counts(values: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const value of values) result[value] = (result[value] ?? 0) + 1;
  return Object.fromEntries(
    Object.entries(result).sort(([a], [b]) => a.localeCompare(b)),
  );
}
export async function corpusStatistics(store: LocalStore) {
  const catalog = await store.catalog();
  const manifest = await readManifest(store);
  if (!manifest)
    throw new RagError(
      "storage",
      "Corpus has not been prepared. Run npm run rag:prepare first.",
    );
  let normalized = 0;
  for (const id of Object.keys(catalog.articles))
    if ((await store.read(`normalized/${id}.json`)) !== null) normalized++;
  const entries = manifest.entries;
  return {
    discovered: Object.keys(catalog.articles).length,
    normalized,
    eligible: entries.filter((entry) => entry.eligible).length,
    retrievalEnabled: entries.filter((entry) => entry.retrievalEnabled).length,
    fullText: entries.filter(
      (entry) => entry.retrievalEnabled && entry.hasFullText,
    ).length,
    abstractOnly: entries.filter(
      (entry) =>
        entry.retrievalEnabled &&
        entry.contentScope === "abstract-only-retrievable",
    ).length,
    metadataOnly: entries.filter(
      (entry) => entry.contentScope === "metadata-only",
    ).length,
    excluded: entries.filter(
      (entry) => !entry.eligible && entry.status !== "error",
    ).length,
    retracted: entries.filter((entry) => entry.retracted).length,
    corrected: entries.filter((entry) => entry.corrected).length,
    expressionOfConcern: entries.filter((entry) => entry.expressionOfConcern)
      .length,
    superseded: entries.filter((entry) => entry.superseded).length,
    errors: entries.filter((entry) => entry.status === "error").length,
    unknownStudyType: entries.filter((entry) => entry.studyType === "unknown")
      .length,
    human: entries.filter((entry) => entry.population === "human").length,
    animal: entries.filter((entry) => entry.population === "animal").length,
    unknownPopulation: entries.filter((entry) => entry.population === "unknown")
      .length,
    byYear: counts(entries.map((entry) => String(entry.year ?? "unknown"))),
    byTopic: counts(entries.flatMap((entry) => entry.topics)),
    byStudyType: counts(entries.map((entry) => entry.studyType)),
    byEvidenceTier: counts(
      entries.map((entry) => String(entry.studyDesignTier ?? "unknown")),
    ),
  };
}

export function printStatistics(
  stats: Awaited<ReturnType<typeof corpusStatistics>>,
): void {
  console.log("Meridian Station Parkinson's Corpus\n");
  const totals: [string, number][] = [
    ["Articles discovered", stats.discovered],
    ["Normalized", stats.normalized],
    ["Eligible", stats.eligible],
    ["Retrieval enabled", stats.retrievalEnabled],
    ["Reusable full text", stats.fullText],
    ["Abstract only", stats.abstractOnly],
    ["Metadata only", stats.metadataOnly],
    ["Excluded", stats.excluded],
    ["Retracted", stats.retracted],
    ["Corrected", stats.corrected],
    ["Expression of concern", stats.expressionOfConcern],
    ["Superseded", stats.superseded],
    ["Errors", stats.errors],
    ["Unknown study type", stats.unknownStudyType],
    ["Human", stats.human],
    ["Animal", stats.animal],
    ["Unknown population", stats.unknownPopulation],
  ];
  for (const [name, count] of totals)
    console.log(`${name.padEnd(25)} ${count}`);
  for (const [name, values] of [
    ["Publication year", stats.byYear],
    ["Topics (multiple per paper)", stats.byTopic],
    ["Study design", stats.byStudyType],
    ["Study design tier (not quality)", stats.byEvidenceTier],
  ] as const) {
    console.log(`\n${name}:`);
    for (const [label, count] of Object.entries(values))
      console.log(`  ${label.padEnd(30)} ${count}`);
  }
}
