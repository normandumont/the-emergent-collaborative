export type StudyType =
  | "rct"
  | "systematic-review"
  | "meta-analysis"
  | "clinical-trial"
  | "unknown"
  | "randomized-controlled-trial"
  | "cohort"
  | "longitudinal"
  | "case-control"
  | "cross-sectional"
  | "observational"
  | "case-report"
  | "basic-science"
  | "animal"
  | "in-vitro"
  | "editorial"
  | "commentary"
  | "guideline";
export type Population = "human" | "animal" | "unknown";

export const CORPUS_STATES = [
  "discovered",
  "ingested",
  "normalized",
  "eligible",
  "excluded",
  "active",
  "corrected",
  "retracted",
  "superseded",
  "retrieval-disabled",
  "error",
] as const;
export type CorpusState = (typeof CORPUS_STATES)[number];
export interface RelatedArticle {
  pmid: string | null;
  type: string;
  sourcePmid: string;
  refSource: string | null;
  note: string | null;
}
export interface PublicationStatus {
  retracted: boolean;
  expressionOfConcern: boolean;
  corrected: boolean;
  superseded: boolean;
  updatedPublication: boolean;
  duplicatePublication: boolean;
  retractionNotice: boolean;
  correctionNotice: boolean;
  concernNotice: boolean;
  relatedPmids: string[];
  relationships: RelatedArticle[];
}
export interface PublicationMetadata {
  keywords: string[];
  meshQualifiers: string[];
  pubmedPublicationStatus: string | null;
  retractionHistory: boolean;
}

export interface Author {
  name: string;
  givenName: string | null;
  familyName: string | null;
  collectiveName: string | null;
}

export interface License {
  id: string | null;
  url: string | null;
  urls: string[];
  statement: string;
  copyright: string | null;
  evidenceUrl: string;
}

export interface Provenance {
  api: "pubmed-efetch" | "pmc-front-matter" | "pmc-full-text";
  url: string;
  rawPath: string;
  sha256: string;
  retrievedAt: string;
}

export interface ArticleSection {
  heading: string | null;
  kind:
    | "introduction"
    | "background"
    | "methods"
    | "results"
    | "discussion"
    | "conclusions"
    | "limitations"
    | "other";
  text: string;
}

export interface Article {
  schemaVersion: 1;
  publicationStatus?: PublicationStatus;
  publicationMetadata?: PublicationMetadata;
  identity: { pmid: string; pmcid: string | null; doi: string | null };
  citation: {
    title: string | null;
    journal: string | null;
    publicationDate: string | null;
    year: number | null;
    authors: Author[];
  };
  classification: {
    articleTypes: string[];
    meshTerms: string[];
    topics: string[];
    population: Population;
    studyType: StudyType;
  };
  source: {
    pubmedUrl: string;
    pmcUrl: string | null;
    retrievedAt: string;
    sourceType: "pubmed" | "pubmed+pmc";
    license: License | null;
    reuseAllowed: boolean;
    fullTextSkipReason: string | null;
    provenance: Provenance[];
    queryIds: string[];
  };
  content: { abstract: string | null; sections: ArticleSection[] };
  status: { hasAbstract: boolean; hasFullText: boolean; normalized: true };
}

export interface CatalogEntry {
  pmid: string;
  queryIds: string[];
  topics: string[];
  firstDiscoveredAt: string;
  lastDiscoveredAt: string;
  discoveredBy?: { queryId: string; topics: string[] }[];
  status: "discovered" | "normalized" | "error";
  lastIngestedAt: string | null;
  errorCategory: string | null;
  corpus?: {
    state: CorpusState;
    decisionPath: string;
    retrievalEnabled: boolean;
  };
}

export interface Catalog {
  schemaVersion: 1;
  articles: Record<string, CatalogEntry>;
}
