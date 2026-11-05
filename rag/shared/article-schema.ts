export type StudyType =
  "rct" | "systematic-review" | "meta-analysis" | "clinical-trial" | "unknown";
export type Population = "human" | "animal" | "unknown";

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
  status: "discovered" | "normalized" | "error";
  lastIngestedAt: string | null;
  errorCategory: string | null;
}

export interface Catalog {
  schemaVersion: 1;
  articles: Record<string, CatalogEntry>;
}
