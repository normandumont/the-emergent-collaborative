import type { ManifestEntry } from "../corpus/schema.js";
import {
  indexingManifest,
  unchangedManifest,
  verifyDocument,
} from "../indexing/manifest-input.js";
import { fingerprint, indexable } from "../indexing/metadata.js";
import {
  currentStore,
  readState,
  selectedId,
  type StoreState,
} from "../indexing/state.js";
import type { VectorApi } from "../indexing/openai-client.js";
import { RagError, category } from "../shared/logging.js";
import { hash, type LocalStore } from "../shared/storage.js";
import { searchVector } from "../retrieval/search.js";
import type {
  RankingAdjustments,
  RetrievalResponse,
} from "../retrieval/result-schema.js";
import { readGold } from "./gold.js";
import { aggregate, metrics, type EvaluationQuestion } from "./metrics.js";

export const missCategories = [
  "candidate-retrieval-miss",
  "local-filter-miss",
  "reranking-miss",
  "diversification-miss",
  "outside-final-k",
  "gold-hit",
] as const;
export type MissCategory = (typeof missCategories)[number];
export interface GoldDiagnostic {
  pmid: string;
  highlyRelevant: boolean;
  rawCandidatePresent: boolean;
  rawCandidateRank: number | null;
  rawPaperRank: number | null;
  semanticScore: number | null;
  rawChunkCount: number;
  passedSafetyFilter: boolean;
  filterReasons: string[];
  safetyConflicts: string[];
  eligibleSemanticRank: number | null;
  localScoreAdjustment: number | null;
  adjustments: RankingAdjustments | null;
  rerankingReasons: string[];
  localScore: number | null;
  rerankedRank: number | null;
  diversificationSuppressed: boolean;
  finalPaperLimitSuppressed: boolean;
  finalRank: number | null;
  classification: MissCategory;
  classificationAt10: MissCategory;
}
export function classifyMiss(
  diagnostic: Omit<GoldDiagnostic, "classification" | "classificationAt10">,
  k: number,
): MissCategory {
  if (diagnostic.safetyConflicts.length) return "local-filter-miss";
  if (!diagnostic.rawCandidatePresent) return "candidate-retrieval-miss";
  if (!diagnostic.passedSafetyFilter) return "local-filter-miss";
  if (diagnostic.finalRank !== null && diagnostic.finalRank <= k)
    return "gold-hit";
  if (diagnostic.diversificationSuppressed) return "diversification-miss";
  if (
    diagnostic.eligibleSemanticRank !== null &&
    diagnostic.eligibleSemanticRank <= k &&
    diagnostic.rerankedRank !== null &&
    diagnostic.rerankedRank > k
  )
    return "reranking-miss";
  return "outside-final-k";
}
export function diagnoseQuestion(
  question: EvaluationQuestion,
  retrieval: RetrievalResponse,
  conflicts: Record<string, string[]> = {},
): GoldDiagnostic[] {
  const trace = retrieval.diagnostics;
  if (!trace)
    throw new RagError(
      "configuration",
      "Retrieval diagnostics were not captured.",
    );
  const rawPaperIds = [
    ...new Set(
      trace.rawCandidates.map((hit) => hit.pmid).filter((id) => id !== null),
    ),
  ];
  const semanticOrder = [...trace.ranking].sort(
    (a, b) =>
      b.semanticScore - a.semanticScore || Number(a.pmid) - Number(b.pmid),
  );
  return [...new Set(question.expectedPmids)].map((pmid) => {
    const raw = trace.rawCandidates.filter((hit) => hit.pmid === pmid);
    const bestRaw = [...raw].sort(
      (a, b) => b.semanticScore - a.semanticScore || a.rawRank - b.rawRank,
    )[0];
    const rankIndex = trace.ranking.findIndex((paper) => paper.pmid === pmid);
    const paper = trace.ranking[rankIndex];
    const semanticIndex = semanticOrder.findIndex(
      (paper) => paper.pmid === pmid,
    );
    const final = retrieval.results.find((paper) => paper.pmid === pmid);
    const diagnostic = {
      pmid,
      highlyRelevant:
        question.gold?.highlyRelevantPmids.includes(pmid) ?? false,
      rawCandidatePresent: raw.length > 0,
      rawCandidateRank: bestRaw?.rawRank ?? null,
      rawPaperRank: raw.length ? rawPaperIds.indexOf(pmid) + 1 : null,
      semanticScore: bestRaw?.semanticScore ?? null,
      rawChunkCount: raw.length,
      passedSafetyFilter: raw.some((hit) => hit.passedSafetyFilter),
      filterReasons: [
        ...new Set(
          raw.flatMap((hit) => (hit.filterReason ? [hit.filterReason] : [])),
        ),
      ],
      safetyConflicts: conflicts[pmid] ?? [],
      eligibleSemanticRank: semanticIndex === -1 ? null : semanticIndex + 1,
      localScoreAdjustment: paper
        ? Number(
            Object.values(paper.adjustments)
              .reduce((sum, value) => sum + value, 0)
              .toFixed(6),
          )
        : null,
      adjustments: paper?.adjustments ?? null,
      rerankingReasons: paper?.reasons ?? [],
      localScore: paper?.finalScore ?? null,
      rerankedRank: rankIndex === -1 ? null : rankIndex + 1,
      diversificationSuppressed:
        paper !== undefined && paper.selected && !final,
      finalPaperLimitSuppressed: paper !== undefined && !paper.selected,
      finalRank: final?.rank ?? null,
    };
    return {
      ...diagnostic,
      classification: classifyMiss(diagnostic, 5),
      classificationAt10: classifyMiss(diagnostic, 10),
    };
  });
}
export function stageCounts(
  rows: GoldDiagnostic[],
  highlyOnly = false,
  k: 5 | 10 = 5,
) {
  const selected = rows.filter((row) => !highlyOnly || row.highlyRelevant);
  const counts: Record<MissCategory, number> = {
    "candidate-retrieval-miss": 0,
    "local-filter-miss": 0,
    "reranking-miss": 0,
    "diversification-miss": 0,
    "outside-final-k": 0,
    "gold-hit": 0,
  };
  for (const row of selected)
    counts[k === 5 ? row.classification : row.classificationAt10]++;
  return { goldPmids: selected.length, counts };
}
export function depthSummary(
  rows: GoldDiagnostic[][],
  retrievals: RetrievalResponse[],
) {
  const judgments = rows.flat();
  const present = judgments.filter((row) => row.rawCandidatePresent);
  return {
    goldPmids: judgments.length,
    candidateRecallMicro: present.length / judgments.length,
    candidateRecallMacro:
      rows.reduce(
        (sum, row) =>
          sum +
          row.filter((item) => item.rawCandidatePresent).length / row.length,
        0,
      ) / rows.length,
    absentFromCandidates: judgments.length - present.length,
    enteringCandidatesButMissingTop5: present.filter(
      (row) => row.finalRank === null || row.finalRank > 5,
    ).length,
    enteringCandidatesButMissingTop10: present.filter(
      (row) => row.finalRank === null || row.finalRank > 10,
    ).length,
    uniqueCandidatePmids: [
      ...new Set(
        retrievals.flatMap(
          (retrieval) =>
            retrieval.diagnostics?.rawCandidates.flatMap((hit) =>
              hit.pmid ? [hit.pmid] : [],
            ) ?? [],
        ),
      ),
    ].length,
    meanUniqueCandidatePmids:
      retrievals.reduce(
        (sum, retrieval) =>
          sum +
          new Set(
            retrieval.diagnostics?.rawCandidates.flatMap((hit) =>
              hit.pmid ? [hit.pmid] : [],
            ),
          ).size,
        0,
      ) / retrievals.length,
    meanSearchElapsedMs:
      retrievals.reduce(
        (sum, retrieval) => sum + (retrieval.diagnostics?.searchElapsedMs ?? 0),
        0,
      ) / retrievals.length,
    allRelevant: {
      top5: stageCounts(judgments),
      top10: stageCounts(judgments, false, 10),
    },
    highlyRelevant: {
      top5: stageCounts(judgments, true),
      top10: stageCounts(judgments, true, 10),
    },
  };
}
export function goldSafetyConflicts(
  entry: ManifestEntry | undefined,
  target: StoreState,
  pmid: string,
): string[] {
  if (!entry) return ["missing-from-local-manifest"];
  const reasons: string[] = [];
  if (entry.retracted) reasons.push("retracted");
  if (entry.expressionOfConcern) reasons.push("expression-of-concern");
  if (!entry.eligible) reasons.push("policy-excluded");
  if (!entry.retrievalEnabled) reasons.push("retrieval-disabled");
  if (entry.superseded) reasons.push("superseded");
  if (entry.status !== "active") reasons.push(`status:${entry.status}`);
  if (entry.indexAction !== "upsert")
    reasons.push(`index-action:${entry.indexAction}`);
  const receipt = target.files.find(
    (file) =>
      file.pmid === pmid &&
      file.status === "indexed" &&
      file.fingerprint === fingerprint(entry),
  );
  if (!receipt) reasons.push("unavailable-in-synchronized-manifest");
  return reasons;
}
export interface DiagnosticRow {
  question: EvaluationQuestion;
  retrieval: RetrievalResponse;
  goldPmids: GoldDiagnostic[];
  queryRewriteDiagnosis: ReturnType<typeof queryRewriteDiagnosis>;
}
export function queryRewriteDiagnosis(id: string, rewrittenQuery: string[]) {
  const query = rewrittenQuery.join(" ").toLowerCase();
  const checks: Record<string, boolean> = {};
  if (id === "gold-exercise-clinical-001") {
    checks["aerobicExercise"] = /aerobic/.test(query) && /exercise/.test(query);
    checks["parkinsonsDisease"] = /parkinson/.test(query);
    checks["motorSymptoms"] =
      /motor/.test(query) && /symptom|outcome|function/.test(query);
    checks["clinicalEvidence"] =
      /human|clinical|trial/.test(query) && /evidence|trial|stud/.test(query);
  } else if (id === "gold-disease-modification-001") {
    checks["symptomaticBenefit"] =
      /symptom/.test(query) &&
      /improv|benefit|relief|management|treatment/.test(query);
    checks["diseaseModification"] =
      /disease.modif|slow.{0,30}progress|neuroprotect/.test(query);
    checks["conceptualDistinction"] =
      /versus|\bvs\b|distinguish|differen|compar|rather than/.test(query);
  }
  return {
    lexicalPreservationChecks: checks,
    possibleQueryRewriteProblem: Object.values(checks).some(
      (preserved) => !preserved,
    ),
    caveat:
      "Lexical checks flag omitted concepts, not semantic correctness. The original question is sent with rewriting enabled; search_query is the provider-reported rewrite. Preservation alone cannot rule out poor semantic representation.",
  };
}
export interface DiagnosticDepth {
  candidateLimit: number;
  status: "completed" | "unsupported";
  reason?: string;
  summary?: ReturnType<typeof depthSummary>;
  finalMetrics?: ReturnType<typeof aggregate>;
  questions: DiagnosticRow[];
}
export interface DiagnosticReport {
  schemaVersion: 1;
  generatedAt: string;
  storeId: string;
  manifestSha256: string;
  vectorStateSha256: string;
  questionsSha256: string;
  goldStatus: "draft-human-review";
  safetyConflicts: Record<string, string[]>;
  depths: DiagnosticDepth[];
  recommendedBottleneck: string;
}
export function recommendBottleneck(
  depths: DiagnosticDepth[],
  conflicts: Record<string, string[]>,
): string {
  if (Object.keys(conflicts).length)
    return "gold-label adjudication: resolve reported safety/synchronization conflicts without weakening governance.";
  const completed = depths.filter(
    (depth) => depth.status === "completed" && depth.summary,
  );
  const deepest = completed.at(-1)?.summary;
  if (!deepest)
    return "No completed diagnostics; no intervention can be recommended.";
  const first = completed[0]?.summary;
  if (
    first &&
    first.absentFromCandidates > deepest.absentFromCandidates &&
    first.absentFromCandidates - deepest.absentFromCandidates >
      deepest.allRelevant.top10.counts["reranking-miss"]
  )
    return "candidate retrieval depth: controlled follow-up on gains from 30 to 50; do not change defaults from this draft evaluation alone.";
  if (
    deepest.allRelevant.top10.counts["candidate-retrieval-miss"] >
    deepest.allRelevant.top10.counts["reranking-miss"]
  )
    return "query rewriting: controlled original-versus-rewritten query comparison for candidate misses; candidate absence at depth 50 does not establish a rewrite defect.";
  if (deepest.allRelevant.top10.counts["diversification-miss"])
    return "diversification: inspect selected papers absent from final output.";
  if (deepest.allRelevant.top10.counts["reranking-miss"])
    return "local evidence reranking: inspect semantic-to-local cutoff crossings before changing any weight.";
  return "gold-label adjudication: review unjudged high-ranked papers and pool completeness; outside-final-k alone does not prove harmful reranking.";
}
export async function evaluateDiagnostics(
  api: Pick<VectorApi, "search">,
  store: LocalStore,
  env: NodeJS.ProcessEnv = process.env,
  candidateDepths = [50],
): Promise<DiagnosticReport> {
  if (
    !candidateDepths.length ||
    new Set(candidateDepths).size !== candidateDepths.length ||
    candidateDepths.some((depth) => ![30, 50, 100].includes(depth))
  )
    throw new RagError(
      "configuration",
      "Diagnostic depths must be distinct values from 30,50,100.",
    );
  const loaded = await readGold();
  const { manifest, manifestHash } = await indexingManifest(store);
  const stateText = await store.read("vector-state.json");
  if (stateText === null)
    throw new RagError("storage", "Missing synchronized vector state.");
  const stateHash = hash(stateText);
  const state = await readState(store);
  const target = currentStore(state, selectedId(state, env));
  const conflicts: Record<string, string[]> = {};
  const labeled = new Set(
    loaded.gold.questions.flatMap((q) => [
      ...q.relevantPmids,
      ...q.acceptablePmids,
    ]),
  );
  for (const pmid of labeled) {
    const entry = manifest.entries.find((entry) => entry.pmid === pmid);
    const reasons = goldSafetyConflicts(entry, target, pmid);
    if (entry && indexable(entry)) {
      try {
        await verifyDocument(store, entry);
      } catch (error) {
        reasons.push(`source-verification:${category(error)}`);
      }
    }
    if (reasons.length) conflicts[pmid] = reasons;
  }
  const assertUnchanged = async () => {
    await unchangedManifest(store, manifestHash);
    const text = await store.read("vector-state.json");
    if (text === null || hash(text) !== stateHash)
      throw new RagError(
        "storage",
        "Vector state changed during diagnostic evaluation.",
      );
  };
  // The evaluator exposes only search, even if its caller supplied mutation methods.
  const searchOnly = { search: api.search.bind(api) };
  const depths: DiagnosticDepth[] = [];
  for (const candidateLimit of [...candidateDepths].sort((a, b) => a - b)) {
    if (candidateLimit > 50) {
      depths.push({
        candidateLimit,
        status: "unsupported",
        reason:
          "OpenAI max_num_results supports 1-50; this SDK exposes no search continuation parameter. No depth-100 request was made.",
        questions: [],
      });
      continue;
    }
    const rows: DiagnosticRow[] = [];
    for (const question of loaded.questions) {
      await assertUnchanged();
      const retrieval = await searchVector(
        searchOnly,
        store,
        question.question,
        {
          ...question.filters,
          papers: 10,
          chunksPerPaper: 2,
          candidateLimit,
          debugRanking: true,
          diagnostics: true,
        },
        env,
      );
      rows.push({
        question,
        retrieval,
        goldPmids: diagnoseQuestion(question, retrieval, conflicts),
        queryRewriteDiagnosis: queryRewriteDiagnosis(
          question.id,
          retrieval.rewrittenQuery,
        ),
      });
    }
    depths.push({
      candidateLimit,
      status: "completed",
      summary: depthSummary(
        rows.map((row) => row.goldPmids),
        rows.map((row) => row.retrieval),
      ),
      finalMetrics: aggregate(
        rows.map((row) =>
          metrics(row.question, row.retrieval.results, row.retrieval),
        ),
      ),
      questions: rows,
    });
  }
  await assertUnchanged();
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    storeId: target.id,
    manifestSha256: manifestHash,
    vectorStateSha256: stateHash,
    questionsSha256: loaded.sha256,
    goldStatus: loaded.gold.status,
    safetyConflicts: conflicts,
    depths,
    recommendedBottleneck: recommendBottleneck(depths, conflicts),
  };
}
