import type { ManifestEntry } from "../corpus/schema.js";
import type { Filters } from "./filters.js";
import type { QueryIntent } from "./intent.js";

export interface SupportingChunk {
  score: number;
  text: string;
  filename: string;
  fileId: string;
}
export interface PaperCandidate {
  pmid: string;
  title: string | null;
  metadata: Pick<
    ManifestEntry,
    | "year"
    | "studyType"
    | "studyDesignTier"
    | "population"
    | "contentScope"
    | "license"
    | "retracted"
    | "topics"
    | "retrievalEnabled"
    | "warnings"
    | "corrected"
    | "superseded"
    | "status"
  >;
  chunk: SupportingChunk;
}
export interface RetrievalResult {
  rank: number;
  pmid: string;
  title: string | null;
  score: number;
  semanticScore: number;
  metadata: PaperCandidate["metadata"];
  chunks: SupportingChunk[];
}
export interface RankingAdjustments {
  human: number;
  studyType: number;
  studyTier: number;
  topicMatch: number;
  unknownMetadata: number;
  futureDated: number;
  otherWarnings: number;
  corrected: number;
}
export interface PaperRankingDebug {
  pmid: string;
  semanticScore: number;
  adjustments: RankingAdjustments;
  finalScore: number;
  bonusesEligible: boolean;
  reasons: string[];
  chunkScores: number[];
  selected: boolean;
}
export interface CandidateTrace {
  rawRank: number;
  pmid: string | null;
  reportedPmid: string | null;
  fileId: string;
  semanticScore: number;
  passedSafetyFilter: boolean;
  filterReason: string | null;
}
export interface RetrievalTrace {
  searchElapsedMs: number;
  rawCandidates: CandidateTrace[];
  ranking: PaperRankingDebug[];
}
export interface RetrievalResponse {
  query: string;
  intent: QueryIntent;
  intentRule: string;
  matchedTopics: string[];
  rewrittenQuery: string[];
  results: RetrievalResult[];
  filters: Filters;
  filterMethod: string;
  candidateLimit: number;
  remoteCandidates: number;
  eligibleCandidates: number;
  uniqueCandidates: number;
  uniquePaperCount: number;
  chunkCount: number;
  duplicateChunksSuppressed: number;
  paperLimitSuppressed: number;
  papers: number;
  chunksPerPaper: number;
  ranking?: PaperRankingDebug[];
  diagnostics?: RetrievalTrace;
  remoteHasMore: boolean;
  suppressed: Record<string, number>;
}
