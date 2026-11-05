import type {
  Article,
  Population,
  StudyType,
} from "../shared/article-schema.js";
import type { EvidenceRules } from "../shared/config.js";
import type { FetchedPubmed } from "./fetch-pubmed.js";
import type { FetchedPmc } from "./fetch-pmc.js";

export function studyType(types: string[], rules: EvidenceRules): StudyType {
  return (
    rules.studyTypes.find((rule) =>
      rule.publicationTypes.some((type) => types.includes(type)),
    )?.studyType ?? "unknown"
  );
}
export function population(
  meshTerms: string[],
  rules: EvidenceRules,
): Population {
  const human = meshTerms.includes(rules.population.human);
  const animal = meshTerms.includes(rules.population.animal);
  return human === animal ? "unknown" : human ? "human" : "animal";
}

export function normalize(
  pubmed: FetchedPubmed,
  pmc: FetchedPmc,
  rules: EvidenceRules,
  topics: string[],
  queryIds: string[],
): Article {
  const record = pubmed.record;
  return {
    schemaVersion: 1,
    identity: { pmid: record.pmid, pmcid: record.pmcid, doi: record.doi },
    citation: {
      title: record.title,
      journal: record.journal,
      publicationDate: record.publicationDate,
      year: record.year,
      authors: record.authors,
    },
    classification: {
      articleTypes: record.articleTypes,
      meshTerms: record.meshTerms,
      topics: [...new Set(topics)],
      population: population(record.meshTerms, rules),
      studyType: studyType(record.articleTypes, rules),
    },
    source: {
      pubmedUrl: `https://pubmed.ncbi.nlm.nih.gov/${record.pmid}/`,
      pmcUrl: record.pmcid
        ? `https://pmc.ncbi.nlm.nih.gov/articles/${record.pmcid}/`
        : null,
      retrievedAt: pubmed.provenance.retrievedAt,
      sourceType: pmc.hasFullText ? "pubmed+pmc" : "pubmed",
      license: pmc.license,
      reuseAllowed: pmc.reuseAllowed,
      fullTextSkipReason: pmc.reason,
      provenance: [pubmed.provenance, ...pmc.provenance],
      queryIds: [...new Set(queryIds)],
    },
    content: { abstract: record.abstract, sections: pmc.sections },
    status: {
      hasAbstract: record.abstract !== null,
      hasFullText: pmc.hasFullText,
      normalized: true,
    },
  };
}
