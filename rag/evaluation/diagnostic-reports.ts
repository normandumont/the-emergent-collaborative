import type { LocalStore } from "../shared/storage.js";
import { DEFAULT_CANDIDATE_LIMIT } from "../retrieval/search.js";
import type { DiagnosticReport, DiagnosticRow } from "./diagnostics.js";

const cell = (value: string) =>
  value.replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ");
const display = (value: number | null) =>
  value === null ? "-" : String(value);
function rawTable(row: DiagnosticRow): string[] {
  const { retrieval } = row;
  const trace = retrieval.diagnostics;
  if (!trace) return [];
  return [
    "### Full raw candidate pool (chunk ranks)",
    "",
    "| Raw rank | PMID | Semantic score | Safety | Adjustments | Local score | Reranked paper rank | Final rank |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...trace.rawCandidates.map((hit) => {
      const paper = hit.passedSafetyFilter
        ? trace.ranking.find((paper) => paper.pmid === hit.pmid)
        : undefined;
      const rank = paper ? trace.ranking.indexOf(paper) + 1 : null;
      const final = retrieval.results.find((paper) => paper.pmid === hit.pmid);
      return `| ${hit.rawRank} | ${hit.pmid ?? "unresolved"} | ${hit.semanticScore} | ${hit.passedSafetyFilter ? "PASS" : hit.filterReason} | ${paper ? cell(JSON.stringify(paper.adjustments)) : "-"} | ${paper?.finalScore ?? "-"} | ${display(rank)} | ${final?.rank ?? "-"} |`;
    }),
    "",
    "### Final top ten",
    "",
    ...retrieval.results.map(
      (paper) =>
        `${paper.rank}. ${paper.pmid} — ${cell(paper.title ?? "Untitled")}; semantic ${paper.semanticScore}; local ${paper.score}`,
    ),
    "",
  ];
}
export function diagnosticMarkdown(report: DiagnosticReport): string {
  const lines = [
    "# Gold retrieval pipeline diagnostics",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.goldStatus}; labels are not validated scientific ground truth.`,
    `Vector store: ${report.storeId}`,
    `Manifest SHA-256: ${report.manifestSha256}`,
    `Vector-state SHA-256: ${report.vectorStateSha256}`,
    `Gold-file SHA-256: ${report.questionsSha256}`,
    "",
    "## Interpretation and stage definitions",
    "",
    "Counts are question–PMID judgments (55 main, 38 highly relevant), not distinct papers. Primary classification uses K=5; K=10 is reported separately. Unlisted papers are unjudged, not automatically irrelevant.",
    "Raw candidates are the provider response AFTER remote attribute filtering and provider ranking. Their scores are provider-reported semantic scores; they are not raw embedding similarity guarantees. Remote exclusion cannot be observed in this response, so known gold safety/synchronization conflicts are reported independently.",
    "Raw rank is the best-scoring chunk's response position; raw paper rank collapses first PMID occurrence. Eligible semantic rank sorts unique verified papers by their maximum chunk score, with PMID tie-breaks. Reranked rank is the existing unique-paper score order before final paper cutoff.",
    "Candidate-retrieval-miss: no returned chunk and no known safety conflict. Local-filter-miss: known safety/synchronization conflict or all returned chunks rejected locally. Reranking-miss: semantic paper rank was within K but local score order moved it outside K. Diversification-miss: selected within the final paper limit but absent from final output. Outside-final-k: other eligible papers below K, including paper-limit cutoff. Gold-hit: final rank within K.",
    `Current diversification groups chunks by PMID and caps supporting chunks; it does not remove a whole selected paper. Duplicate chunk suppression is not a gold-paper miss. Scores, rewrite flag, final ten-paper/two-chunk limits and safety rules are unchanged. Development retrieval defaults to ${DEFAULT_CANDIDATE_LIMIT} candidates; ordinary evaluation depth remains 50.`,
    "Depths are independent sequential searches, not guaranteed nested candidate pools. Rewrite output/provider ordering may vary. Latency includes the existing client's queue, bounded retry and response parsing; it is not isolated server latency.",
    "",
    "## Safety conflicts requiring human adjudication",
    "",
    ...(Object.keys(report.safetyConflicts).length
      ? Object.entries(report.safetyConflicts).map(
          ([pmid, reasons]) => `- ${pmid}: ${reasons.join(", ")}`,
        )
      : ["None found among main or acceptable labels."]),
    "",
    "## Candidate-depth experiment",
    "",
    "| Depth | Status | Candidate recall (macro / micro) | Absent gold judgments | Present but outside top 5 / 10 | Unique PMIDs (mean / across questions) | Mean search ms |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const depth of report.depths) {
    const s = depth.summary;
    lines.push(
      s
        ? `| ${depth.candidateLimit} | completed | ${s.candidateRecallMacro.toFixed(4)} / ${s.candidateRecallMicro.toFixed(4)} | ${s.absentFromCandidates} | ${s.enteringCandidatesButMissingTop5} / ${s.enteringCandidatesButMissingTop10} | ${s.meanUniqueCandidatePmids.toFixed(2)} / ${s.uniqueCandidatePmids} | ${s.meanSearchElapsedMs.toFixed(0)} |`
        : `| ${depth.candidateLimit} | ${depth.status}: ${cell(depth.reason ?? "")} | - | - | - | - | - |`,
    );
  }
  lines.push(
    "",
    "## Recommended bottleneck to address next",
    "",
    report.recommendedBottleneck,
    "",
    "Recommendation only; no retrieval changes implemented.",
    "",
  );
  for (const depth of report.depths) {
    if (!depth.summary) continue;
    lines.push(
      `## Depth ${depth.candidateLimit}: stage counts`,
      "",
      "| Pool / cutoff | Judgments | Candidate miss | Filter miss | Reranking miss | Diversification miss | Outside K | Hit |",
      "| --- | --- | --- | --- | --- | --- | --- | --- |",
    );
    for (const [name, group] of [
      ["All relevant", depth.summary.allRelevant],
      ["Highly relevant", depth.summary.highlyRelevant],
    ] as const)
      for (const [cutoff, summary] of [
        ["5", group.top5],
        ["10", group.top10],
      ] as const) {
        const c = summary.counts;
        lines.push(
          `| ${name} / ${cutoff} | ${summary.goldPmids} | ${c["candidate-retrieval-miss"]} | ${c["local-filter-miss"]} | ${c["reranking-miss"]} | ${c["diversification-miss"]} | ${c["outside-final-k"]} | ${c["gold-hit"]} |`,
        );
      }
    lines.push("");
    for (const row of depth.questions) {
      const r = row.retrieval;
      lines.push(
        `### ${row.question.id} (depth ${depth.candidateLimit})`,
        "",
        `Question: ${cell(row.question.question)}`,
        `Curated intent: ${row.question.gold?.intent ?? "-"}; matched intent: ${r.intent}; rule: ${r.intentRule}`,
        `Matched topics: ${r.matchedTopics.join(", ") || "none"}`,
        `Original query sent with rewrite_query=true: ${cell(r.query)}`,
        `Provider-reported rewritten query: ${cell(JSON.stringify(r.rewrittenQuery))}`,
        `Rewrite preservation checks: ${cell(JSON.stringify(row.queryRewriteDiagnosis.lexicalPreservationChecks))}; possible rewrite problem: ${row.queryRewriteDiagnosis.possibleQueryRewriteProblem}`,
        row.queryRewriteDiagnosis.caveat,
        `Returned raw chunks: ${r.remoteCandidates}; unique eligible PMIDs: ${r.uniqueCandidates}; remote has more: ${r.remoteHasMore}`,
        "",
        "| Gold PMID | H | Raw present / chunks | Raw chunk / paper rank | Semantic | Safety passed | Eligible semantic rank | Adjustment | Reranked rank | Diversification / paper-limit suppressed | Final rank | Classification @5 / @10 |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
        ...row.goldPmids.map(
          (g) =>
            `| ${g.pmid} | ${g.highlyRelevant} | ${g.rawCandidatePresent} / ${g.rawChunkCount} | ${display(g.rawCandidateRank)} / ${display(g.rawPaperRank)} | ${display(g.semanticScore)} | ${g.passedSafetyFilter} | ${display(g.eligibleSemanticRank)} | ${display(g.localScoreAdjustment)} | ${display(g.rerankedRank)} | ${g.diversificationSuppressed} / ${g.finalPaperLimitSuppressed} | ${display(g.finalRank)} | ${g.classification} / ${g.classificationAt10} |`,
        ),
        "",
      );
      for (const g of row.goldPmids)
        if (
          g.filterReasons.length ||
          g.safetyConflicts.length ||
          g.rerankingReasons.length
        )
          lines.push(
            `PMID ${g.pmid}: ${[...g.safetyConflicts, ...g.filterReasons, ...g.rerankingReasons].join("; ")}`,
          );
      lines.push("");
      if (
        [
          "gold-exercise-clinical-001",
          "gold-disease-modification-001",
        ].includes(row.question.id)
      )
        lines.push(...rawTable(row));
    }
  }
  return lines.join("\n") + "\n";
}
export async function writeDiagnosticReports(
  store: LocalStore,
  report: DiagnosticReport,
): Promise<void> {
  await store.versionedJson("evaluation/gold-diagnostics-latest.json", report);
  await store.archive("evaluation/gold-diagnostics-latest.md");
  await store.write(
    "evaluation/gold-diagnostics-latest.md",
    diagnosticMarkdown(report),
    true,
  );
}
