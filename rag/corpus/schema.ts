import type {
  Article,
  CorpusState,
  Population,
  PublicationStatus,
  StudyType,
} from "../shared/article-schema.js";

export type EvidenceCategory =
  | "human-synthesis"
  | "human-interventional"
  | "human-observational"
  | "human-mechanistic"
  | "animal"
  | "cellular"
  | "guidance"
  | "opinion"
  | "unknown";
export type ContentScope =
  | "full-text-retrievable"
  | "abstract-only-retrievable"
  | "metadata-only"
  | "excluded";
export interface TopicRule {
  id: string;
  queries: string[];
  mesh: string[];
  keywords: string[];
}
export interface TopicAssignment {
  topic: string;
  reasons: string[];
}
export interface CorpusPolicy {
  policyVersion: number;
  referenceDate: string;
  includedPublicationTypes: string[];
  excludedPublicationTypes: string[];
  allowedPopulations: Population[];
  minYear: number | null;
  maxYear: number | null;
  requirePublicationDate: boolean;
  requireTitle: boolean;
  requireAbstract: boolean;
  requireReusableFullText: boolean;
  blockedStates: (
    "retracted" | "expressionOfConcern" | "superseded" | "duplicatePublication"
  )[];
  retrievalDisabledPmids: string[];
  topicMeshTerms: string[];
  topicKeywords: string[];
  allowedEvidenceCategories: EvidenceCategory[];
}
export interface CorpusConfig {
  policy: CorpusPolicy;
  topics: TopicRule[];
  policyText: string;
  taxonomyText: string;
  policySha256: string;
  taxonomySha256: string;
}
export interface GovernedArticle extends Article {
  publicationStatus: PublicationStatus;
  classification: Article["classification"] & {
    studyDesignTier: number | null;
    evidenceCategory: EvidenceCategory;
    topicAssignments: TopicAssignment[];
  };
}
export interface CorpusDecision {
  pmid: string;
  evaluatedAt: string;
  policyVersion: number;
  policySha256: string;
  taxonomySha256: string;
  normalizedRecordSha256: string;
  baseNormalizedSha256: string;
  dependencySha256: string;
  eligible: boolean;
  retrievalEnabled: boolean;
  status: CorpusState;
  contentScope: ContentScope;
  reasons: string[];
  warnings: string[];
  lifecycle: { state: CorpusState; at: string }[];
}
export interface ManifestEntry {
  pmid: string;
  path: string | null;
  sha256: string | null;
  eligible: boolean;
  retrievalEnabled: boolean;
  status: CorpusState;
  contentScope: ContentScope;
  studyType: StudyType;
  studyDesignTier: number | null;
  population: Population;
  topics: string[];
  year: number | null;
  hasFullText: boolean;
  retracted: boolean;
  corrected: boolean;
  expressionOfConcern: boolean;
  superseded: boolean;
  license: string | null;
  policyVersion: number;
  policySha256: string;
  normalizedRecordSha256: string;
  baseNormalizedSha256: string;
  sourceSha256: string[];
  decisionPath: string;
  dependencySha256: string;
  reasons: string[];
  warnings: string[];
  reindexRequired: boolean;
  indexAction: "upsert" | "remove";
}
export interface RetrievalManifest {
  schemaVersion: 1;
  policyVersion: number;
  policySha256: string;
  taxonomySha256: string;
  entries: ManifestEntry[];
}
