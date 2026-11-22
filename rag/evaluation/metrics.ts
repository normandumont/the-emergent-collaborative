import type {
  RetrievalResult,
  RetrievalResponse,
} from "../retrieval/result-schema.js";
import type { Filters } from "../retrieval/filters.js";
import { canonicalStudy } from "../indexing/metadata.js";
import { classifyIntent, isClinicalIntent } from "../retrieval/intent.js";

export interface EvaluationQuestion {
  id: string;
  question: string;
  expectedTopics: string[];
  preferredStudyTypes: string[];
  expectedPmids: string[];
  notes: string;
  judgments: Record<string, "relevant" | "irrelevant">;
  filters: Filters;
  gold?: {
    intent: string;
    highlyRelevantPmids: string[];
    acceptablePmids: string[];
  };
}
export function uniquePapers(results: RetrievalResult[]): RetrievalResult[] {
  return results.filter(
    (result, index) =>
      results.findIndex((other) => other.pmid === result.pmid) === index,
  );
}
export function metrics(
  question: EvaluationQuestion,
  results: RetrievalResult[],
  retrieval?: Pick<
    RetrievalResponse,
    | "intent"
    | "eligibleCandidates"
    | "uniqueCandidates"
    | "duplicateChunksSuppressed"
  >,
) {
  const papers = uniquePapers(results);
  const chunks = papers.reduce((sum, paper) => sum + paper.chunks.length, 0);
  const candidateChunks = retrieval?.eligibleCandidates ?? chunks;
  const candidatePapers = retrieval?.uniqueCandidates ?? papers.length;
  const clinical = isClinicalIntent(
    retrieval?.intent ?? classifyIntent(question.question).intent,
  );
  const expected = [...new Set(question.expectedPmids)];
  const recall = (n: number) =>
    expected.length
      ? expected.filter((pmid) =>
          papers.slice(0, n).some((paper) => paper.pmid === pmid),
        ).length / expected.length
      : null;
  const rank = papers.findIndex((paper) => expected.includes(paper.pmid));
  const hit = (n: number) =>
    expected.length
      ? papers.slice(0, n).some((paper) => expected.includes(paper.pmid))
      : null;
  const topFive = papers.slice(0, 5);
  const label = (pmid: string) =>
    question.judgments[pmid] ??
    (expected.includes(pmid) ? "relevant" : undefined);
  const judged =
    Object.keys(question.judgments).length > 0 || expected.length > 0;
  return {
    recallAt5: recall(5),
    recallAt10: recall(10),
    precisionAt5:
      question.gold
        ? topFive.filter((paper) => expected.includes(paper.pmid)).length / 5
        : judged && topFive.every((paper) => label(paper.pmid) !== undefined)
        ? topFive.filter((paper) => label(paper.pmid) === "relevant").length / 5
        : null,
    reciprocalRank: expected.length ? (rank < 0 ? 0 : 1 / (rank + 1)) : null,
    firstRelevantRank: rank < 0 ? null : rank + 1,
    hitAt1: hit(1),
    hitAt3: hit(3),
    hitAt5: hit(5),
    highlyRelevantHitAt5: question.gold?.highlyRelevantPmids.length
      ? topFive.some((paper) => question.gold?.highlyRelevantPmids.includes(paper.pmid))
      : null,
    topicMatchRate:
      papers.length && question.expectedTopics.length
        ? papers.filter((paper) =>
            paper.metadata.topics.some((topic) =>
              question.expectedTopics.includes(topic),
            ),
          ).length / papers.length
        : null,
    humanOnlyCorrect:
      question.filters.humanOnly && papers.length
        ? papers.every((paper) => paper.metadata.population === "human")
        : null,
    retractedExcluded: papers.length
      ? papers.every((paper) => !paper.metadata.retracted)
      : null,
    retrievalDisabledExcluded: papers.length
      ? papers.every((paper) => paper.metadata.retrievalEnabled)
      : null,
    preferredEvidenceRetrieved:
      question.preferredStudyTypes.length && papers.length
        ? topFive.some((paper) =>
            question.preferredStudyTypes.includes(
              canonicalStudy(paper.metadata.studyType),
            ),
          )
        : null,
    preferredEvidenceFirst:
      question.preferredStudyTypes.length && papers[0]
        ? question.preferredStudyTypes.includes(
            canonicalStudy(papers[0].metadata.studyType),
          )
        : null,
    returnedPapers: papers.length,
    returnedChunks: chunks,
    uniquePmidRate: candidateChunks ? candidatePapers / candidateChunks : null,
    duplicateChunkSuppressionCount: retrieval?.duplicateChunksSuppressed ?? 0,
    uniquePapersInTop5: Math.min(5, papers.length),
    humanEvidencePresence:
      clinical && papers.length
        ? topFive.some((paper) => paper.metadata.population === "human")
        : null,
  };
}
export type QuestionMetrics = ReturnType<typeof metrics>;
export function aggregate(rows: QuestionMetrics[]) {
  const average = (
    key:
      | "recallAt5"
      | "recallAt10"
      | "precisionAt5"
      | "reciprocalRank"
      | "topicMatchRate"
      | "uniquePmidRate"
      | "duplicateChunkSuppressionCount"
      | "uniquePapersInTop5",
  ) => {
    const values = rows
      .map((row) => row[key])
      .filter((value): value is number => value !== null);
    return {
      value: values.length
        ? values.reduce((a, b) => a + b, 0) / values.length
        : null,
      evaluatedQuestions: values.length,
    };
  };
  const correctness = (
    key:
      | "humanOnlyCorrect"
      | "retractedExcluded"
      | "retrievalDisabledExcluded"
      | "preferredEvidenceRetrieved"
      | "humanEvidencePresence"
      | "hitAt1"
      | "hitAt3"
      | "hitAt5"
      | "highlyRelevantHitAt5",
  ) => {
    const values = rows
      .map((row) => row[key])
      .filter((value): value is boolean => value !== null);
    return {
      passed: values.filter(Boolean).length,
      evaluatedQuestions: values.length,
    };
  };
  const hitRate = (key: "hitAt1" | "hitAt3" | "hitAt5" | "highlyRelevantHitAt5") => {
    const result = correctness(key);
    return {
      ...result,
      value: result.evaluatedQuestions ? result.passed / result.evaluatedQuestions : null,
    };
  };
  return {
    recallAt5: average("recallAt5"),
    recallAt10: average("recallAt10"),
    precisionAt5: average("precisionAt5"),
    meanReciprocalRank: average("reciprocalRank"),
    hitAt1: hitRate("hitAt1"),
    hitAt3: hitRate("hitAt3"),
    hitAt5: hitRate("hitAt5"),
    highlyRelevantHitAt5: hitRate("highlyRelevantHitAt5"),
    topicMatchRate: average("topicMatchRate"),
    humanOnlyCorrect: correctness("humanOnlyCorrect"),
    retractedExcluded: correctness("retractedExcluded"),
    retrievalDisabledExcluded: correctness("retrievalDisabledExcluded"),
    uniquePmidRate: average("uniquePmidRate"),
    duplicateChunkSuppressionCount: average("duplicateChunkSuppressionCount"),
    uniquePapersInTop5: average("uniquePapersInTop5"),
    preferredEvidenceRetrieved: correctness("preferredEvidenceRetrieved"),
    humanEvidencePresence: correctness("humanEvidencePresence"),
  };
}
