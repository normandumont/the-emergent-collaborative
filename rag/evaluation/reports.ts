import type { LocalStore } from "../shared/storage.js";
import { uniquePapers } from "./metrics.js";
import type { EvaluationReport } from "./evaluate.js";

const inline = (text: string) =>
  text.replace(/[\r\n]+/g, " ").replace(/[\\`*_{}[\]<>]/g, "\\$&");
const assessment = (value: boolean | null) =>
  value === null ? "NOT EVALUATED" : value ? "PASS" : "FAIL";
export function markdownReport(report: EvaluationReport): string {
  const lines = [
    "# Development retrieval evaluation",
    "",
    `Generated: ${report.generatedAt}`,
    `Vector store: ${report.storeId}`,
    `Manifest SHA-256: ${report.manifestSha256}`,
    `Questions SHA-256: ${report.questionsSha256}`,
    ...(report.gold
      ? [`Gold status: ${report.gold.status}; version: ${report.gold.version}`]
      : []),
    "",
    report.methodology,
    "",
    "## Aggregate metrics",
    "",
    "| Metric | Value | Evaluated questions |",
    "| --- | --- | --- |",
  ];
  for (const [key, metric] of Object.entries(report.summary)) {
    lines.push(
      `| ${key} | ${"value" in metric ? (metric.value === null ? "NOT EVALUATED" : metric.value.toFixed(3)) : `${metric.passed} passed`} | ${metric.evaluatedQuestions} |`,
    );
  }
  lines.push(
    "",
    "No single RAG accuracy score is calculated. Relevance labels require human review. Exclusion checks describe returned sources, not independent proof of provider deletion.",
    "",
  );
  for (const row of report.questions) {
    const { question, retrieval, metrics } = row;
    lines.push(
      `## ${question.id}`,
      "",
      `Question: ${inline(question.question)}`,
      ...(question.gold
        ? [`Curated intent: ${question.gold.intent}; relevant pool: ${question.expectedPmids.join(", ")}; highly relevant: ${question.gold.highlyRelevantPmids.join(", ")}; acceptable (not scored): ${question.gold.acceptablePmids.join(", ") || "none"}`]
        : []),
      `Intent: ${retrieval.intent}; topic matches: ${retrieval.matchedTopics.join(", ") || "none"}`,
      `Remote candidates examined: ${retrieval.remoteCandidates}; eligible chunks: ${retrieval.eligibleCandidates}; unique candidates: ${retrieval.uniqueCandidates}; returned papers: ${retrieval.uniquePaperCount}; supporting chunks: ${retrieval.chunkCount}`,
      `Duplicate chunks suppressed by per-paper cap: ${retrieval.duplicateChunksSuppressed}; papers omitted by limit: ${retrieval.paperLimitSuppressed}`,
      "",
      "### Top 5 papers",
      "",
    );
    for (const [index, result] of uniquePapers(retrieval.results)
      .slice(0, 5)
      .entries()) {
      lines.push(
        `${index + 1}. PMID ${result.pmid} - ${inline(result.title ?? "Untitled")}`,
        `   Ranking score: ${result.score.toFixed(4)}; semantic score: ${result.semanticScore.toFixed(4)}; study type: ${result.metadata.studyType}; population: ${result.metadata.population}; topics: ${result.metadata.topics.join(", ")}`,
        `   Warnings: ${result.metadata.warnings.map(inline).join(", ") || "none"}`,
        "",
      );
      for (const chunk of result.chunks)
        lines.push(
          `   Chunk score: ${chunk.score.toFixed(4)}; source: ${inline(chunk.filename)} / ${chunk.fileId}`,
          "",
          ...chunk.text
            .slice(0, 1200)
            .split(/\r?\n/)
            .map((line) => `    ${line}`),
          "",
        );
    }
    if (!retrieval.results.length)
      lines.push("No locally eligible results returned.", "");
    lines.push(
      "### Assessment",
      "",
      `Topic-match rate (metadata proxy): ${metrics.topicMatchRate === null ? "NOT EVALUATED" : metrics.topicMatchRate.toFixed(3)}`,
      `Human-only: ${assessment(metrics.humanOnlyCorrect)}`,
      `Preferred evidence retrieved (metadata proxy): ${assessment(metrics.preferredEvidenceRetrieved)}`,
      `Preferred evidence first (metadata proxy): ${assessment(metrics.preferredEvidenceFirst)}`,
      `Human evidence present for clinical intent (metadata proxy): ${assessment(metrics.humanEvidencePresence)}`,
      `Unique-PMID rate among eligible candidates: ${metrics.uniquePmidRate ?? "NOT EVALUATED"}; unique papers in top 5: ${metrics.uniquePapersInTop5}`,
      `Retracted-source exclusion: ${assessment(metrics.retractedExcluded)}`,
      `Retrieval-disabled exclusion: ${assessment(metrics.retrievalDisabledExcluded)}`,
      `Recall@5: ${metrics.recallAt5 ?? "NOT EVALUATED"}; Recall@10: ${metrics.recallAt10 ?? "NOT EVALUATED"}; Precision@5: ${metrics.precisionAt5 ?? "NOT EVALUATED"}; RR: ${metrics.reciprocalRank ?? "NOT EVALUATED"}`,
      `First relevant rank: ${metrics.firstRelevantRank ?? "none/unlabeled"}; Hit@1: ${assessment(metrics.hitAt1)}; Hit@3: ${assessment(metrics.hitAt3)}; Hit@5: ${assessment(metrics.hitAt5)}; highly-relevant Hit@5: ${assessment(metrics.highlyRelevantHitAt5)}`,
      `Filtering: ${retrieval.filterMethod}; remote has more: ${retrieval.remoteHasMore}`,
      `Suppressed candidate counts: ${JSON.stringify(retrieval.suppressed)}`,
      `Assessment notes (curated, not an automated verdict): ${inline(question.notes)}`,
      "Human relevance assessment: pending review of this run.",
      "",
    );
  }
  return lines.join("\n") + "\n";
}
export async function writeReports(
  store: LocalStore,
  report: EvaluationReport,
): Promise<void> {
  const name = report.gold ? "gold-latest" : "latest";
  await store.versionedJson(`evaluation/${name}.json`, report);
  await store.archive(`evaluation/${name}.md`);
  await store.write(`evaluation/${name}.md`, markdownReport(report), true);
}
