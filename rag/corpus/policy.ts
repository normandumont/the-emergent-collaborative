import type { CorpusState } from "../shared/article-schema.js";
import type { CorpusPolicy, GovernedArticle, ContentScope } from "./schema.js";
import { keywordMatch } from "./classification.js";

export function evaluateCorpus(
  article: GovernedArticle,
  policy: CorpusPolicy,
  knownQueries: string[],
  ingestionStatus: string,
): {
  eligible: boolean;
  retrievalEnabled: boolean;
  status: CorpusState;
  contentScope: ContentScope;
  reasons: string[];
  warnings: string[];
} {
  const reasons: string[] = [];
  const exclusions: string[] = [];
  const warnings: string[] = [];
  const pub = article.publicationStatus;
  // Retractions, concerns and supersession are unconditional safety gates.
  if (pub.retracted) exclusions.push("retracted");
  if (pub.expressionOfConcern) exclusions.push("expression-of-concern");
  if (pub.superseded) exclusions.push("superseded");
  if (pub.duplicatePublication) exclusions.push("duplicate-publication");
  if (pub.retractionNotice || pub.correctionNotice || pub.concernNotice)
    exclusions.push("publication-notice");
  if (ingestionStatus !== "normalized" || !article.status.normalized)
    exclusions.push("article-not-normalized");
  const topic =
    article.source.queryIds.some((id) => knownQueries.includes(id)) ||
    article.classification.meshTerms.some((term) =>
      policy.topicMeshTerms.includes(term),
    ) ||
    policy.topicKeywords.some(
      (term) =>
        keywordMatch(article.citation.title ?? "", term) ||
        article.publicationMetadata?.keywords.some((keyword) =>
          keywordMatch(keyword, term),
        ),
    );
  if (topic) reasons.push("parkinsons-topic-match");
  else exclusions.push("no-parkinsons-topic-match");
  const excludedTypes = article.classification.articleTypes.filter((type) =>
    policy.excludedPublicationTypes.includes(type),
  );
  exclusions.push(
    ...excludedTypes.map((type) => `excluded-publication-type:${type}`),
  );
  if (
    article.classification.articleTypes.some((type) =>
      policy.includedPublicationTypes.includes(type),
    )
  )
    reasons.push("supported-publication-type");
  else exclusions.push("unsupported-publication-type");
  if (!policy.allowedPopulations.includes(article.classification.population))
    exclusions.push("population-not-in-policy");
  if (article.classification.population === "unknown")
    warnings.push("population-unknown");
  if (
    !policy.allowedEvidenceCategories.includes(
      article.classification.evidenceCategory,
    )
  )
    exclusions.push("evidence-category-not-in-policy");
  if (article.classification.studyType === "unknown")
    warnings.push("study-type-unknown");
  if (article.classification.studyDesignTier === null)
    warnings.push("study-design-tier-unknown");
  if (policy.requireTitle && !article.citation.title)
    exclusions.push("title-missing");
  if (!article.citation.publicationDate || article.citation.year === null) {
    if (policy.requirePublicationDate)
      exclusions.push("publication-date-missing");
    else warnings.push("publication-date-unknown");
  }
  if (article.citation.year !== null) {
    if (policy.minYear !== null && article.citation.year < policy.minYear)
      exclusions.push("publication-before-policy-range");
    if (policy.maxYear !== null && article.citation.year > policy.maxYear)
      exclusions.push("publication-after-policy-range");
    if (article.citation.year > Number(policy.referenceDate.slice(0, 4)))
      warnings.push("future-dated-publication-metadata");
  }
  const full =
    article.status.hasFullText &&
    article.source.reuseAllowed &&
    article.content.sections.length > 0 &&
    article.source.provenance.some(
      (source) => source.api === "pmc-full-text",
    ) &&
    /^(CC-BY-(1\.0|2\.0|2\.5|3\.0|4\.0)|CC0-1\.0)$/.test(
      article.source.license?.id ?? "",
    );
  const abstract = !!article.content.abstract;
  if (policy.requireAbstract && !abstract) exclusions.push("abstract-required");
  if (policy.requireReusableFullText && !full)
    exclusions.push("reusable-full-text-required");
  if (!full && !abstract) exclusions.push("no-retrievable-source-content");
  if (abstract) reasons.push("abstract-available");
  if (full) reasons.push("reusable-full-text-available");
  if (!full && abstract) warnings.push("abstract-only-not-full-study-text");
  if (pub.corrected) warnings.push("correction-linked-original-text-retained");
  if (pub.updatedPublication && !pub.superseded)
    warnings.push("updated-publication-linked");
  const eligible = exclusions.length === 0;
  const manuallyDisabled = policy.retrievalDisabledPmids.includes(
    article.identity.pmid,
  );
  if (manuallyDisabled) reasons.push("retrieval-disabled-by-policy");
  const status: CorpusState = pub.retracted
    ? "retracted"
    : pub.superseded
      ? "superseded"
      : pub.expressionOfConcern || manuallyDisabled
        ? "retrieval-disabled"
        : ingestionStatus === "error"
          ? "error"
          : eligible
            ? "active"
            : "excluded";
  const contentScope: ContentScope =
    !full && !abstract
      ? "metadata-only"
      : !eligible
        ? "excluded"
        : full
          ? "full-text-retrievable"
          : "abstract-only-retrievable";
  return {
    eligible,
    retrievalEnabled: eligible && !manuallyDisabled,
    status,
    contentScope,
    reasons: [...new Set([...reasons, ...exclusions])].sort(),
    warnings: [...new Set(warnings)].sort(),
  };
}
