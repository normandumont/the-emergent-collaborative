import { canonicalStudy } from "../shared/study-types.js";
import { isClinicalIntent, type QueryIntent } from "./intent.js";
import type {
  PaperCandidate,
  RankingAdjustments,
  RetrievalResult,
  SupportingChunk,
  PaperRankingDebug,
} from "./result-schema.js";

const clinicalDesign: Record<string, number> = {
  "systematic-review": 0.015,
  "meta-analysis": 0.015,
  "randomized-controlled-trial": 0.012,
  "clinical-trial": 0.008,
  cohort: 0.005,
  longitudinal: 0.005,
};
const lexical = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const rounded = (value: number) => Number(value.toFixed(6));
const chunksByScore = (a: SupportingChunk, b: SupportingChunk) =>
  b.score - a.score ||
  lexical(a.fileId, b.fileId) ||
  lexical(a.filename, b.filename) ||
  lexical(a.text, b.text);

export function diversify(
  candidates: PaperCandidate[],
  intent: QueryIntent,
  topics: string[],
  papers: number,
  chunksPerPaper: number,
) {
  const groups = new Map<
    string,
    { paper: PaperCandidate; chunks: SupportingChunk[] }
  >();
  for (const candidate of candidates) {
    const group = groups.get(candidate.pmid);
    if (group) group.chunks.push(candidate.chunk);
    else
      groups.set(candidate.pmid, {
        paper: candidate,
        chunks: [candidate.chunk],
      });
  }
  for (const group of groups.values()) group.chunks.sort(chunksByScore);
  const highest = Math.max(
    0,
    ...candidates.map((candidate) => candidate.chunk.score),
  );
  const ranked = [...groups.values()]
    .map(({ paper, chunks }) => {
      const semanticScore = Math.max(...chunks.map((chunk) => chunk.score));
      const metadata = paper.metadata;
      const clinical = isClinicalIntent(intent);
      const bonusesEligible =
        semanticScore >= 0.4 && semanticScore >= highest - 0.15;
      const type = canonicalStudy(metadata.studyType);
      const reasons: string[] = [];
      const missing = [
        ...(type === "unknown" ? ["studyType=unknown"] : []),
        ...(metadata.population === "unknown" ? ["population=unknown"] : []),
        ...(metadata.studyDesignTier === null ? ["studyDesignTier=null"] : []),
      ];
      reasons.push(...missing);
      const future = metadata.warnings.includes(
        "future-dated-publication-metadata",
      );
      if (future) reasons.push("future-dated-publication-metadata");
      const adjustments: RankingAdjustments = {
        human: 0,
        studyType: 0,
        studyTier: 0,
        topicMatch: 0,
        unknownMetadata: rounded(-0.003 * missing.length),
        futureDated: clinical && future ? -0.005 : 0,
        otherWarnings: clinical
          ? rounded(
              -0.001 *
                Math.min(
                  3,
                  new Set(
                    metadata.warnings.filter(
                      (warning) =>
                        warning !== "future-dated-publication-metadata",
                    ),
                  ).size,
                ),
            )
          : 0,
        corrected: clinical && metadata.corrected ? -0.002 : 0,
      };
      if (bonusesEligible) {
        if (clinical) {
          adjustments.human = metadata.population === "human" ? 0.015 : 0;
          adjustments.studyType = clinicalDesign[type] ?? 0;
          adjustments.studyTier =
            metadata.studyDesignTier === null
              ? 0
              : rounded(Math.max(0, 0.006 - metadata.studyDesignTier * 0.001));
        } else if (intent === "mechanism") {
          adjustments.studyType = [
            "basic-science",
            "animal",
            "in-vitro",
          ].includes(type)
            ? 0.005
            : 0;
        } else if (intent === "epidemiology") {
          adjustments.human = metadata.population === "human" ? 0.01 : 0;
          adjustments.studyType = [
            "cohort",
            "longitudinal",
            "systematic-review",
            "meta-analysis",
          ].includes(type)
            ? 0.01
            : 0;
        } else if (intent === "biomarkers") {
          adjustments.human = metadata.population === "human" ? 0.005 : 0;
          adjustments.studyType = ["cohort", "longitudinal"].includes(type)
            ? 0.005
            : 0;
        }
        adjustments.topicMatch = metadata.topics.some((topic) =>
          topics.includes(topic),
        )
          ? 0.008
          : 0;
      } else
        reasons.push(
          "positive adjustments gated: semantic score <0.4 or >0.15 behind best candidate",
        );
      const finalScore = rounded(
        semanticScore + Object.values(adjustments).reduce((a, b) => a + b, 0),
      );
      return {
        paper,
        chunks,
        semanticScore,
        adjustments,
        finalScore,
        bonusesEligible,
        reasons,
      };
    })
    .sort(
      (a, b) =>
        b.finalScore - a.finalScore ||
        b.semanticScore - a.semanticScore ||
        Number(a.paper.pmid) - Number(b.paper.pmid),
    );
  const results: RetrievalResult[] = ranked
    .slice(0, papers)
    .map((group, index) => ({
      rank: index + 1,
      pmid: group.paper.pmid,
      title: group.paper.title,
      score: group.finalScore,
      semanticScore: group.semanticScore,
      metadata: group.paper.metadata,
      chunks: group.chunks.slice(0, chunksPerPaper),
    }));
  const ranking: PaperRankingDebug[] = ranked.map((group, index) => ({
    pmid: group.paper.pmid,
    semanticScore: group.semanticScore,
    adjustments: group.adjustments,
    finalScore: group.finalScore,
    bonusesEligible: group.bonusesEligible,
    reasons: group.reasons,
    chunkScores: group.chunks.map((chunk) => chunk.score),
    selected: index < papers,
  }));
  return {
    results,
    ranking,
    uniqueCandidates: groups.size,
    duplicateChunksSuppressed: ranked.reduce(
      (sum, group) => sum + Math.max(0, group.chunks.length - chunksPerPaper),
      0,
    ),
    paperLimitSuppressed: Math.max(0, groups.size - papers),
  };
}
