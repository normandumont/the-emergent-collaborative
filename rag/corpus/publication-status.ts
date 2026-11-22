import type {
  PublicationStatus,
  RelatedArticle,
} from "../shared/article-schema.js";

export function publicationStatus(
  types: string[],
  relationships: RelatedArticle[],
  historyRetracted = false,
): PublicationStatus {
  const has = (...names: string[]) =>
    relationships.some((item) => names.includes(item.type));
  return {
    retracted:
      historyRetracted ||
      types.includes("Retracted Publication") ||
      has("RetractionIn", "RetractedandRepublishedIn"),
    expressionOfConcern: has("ExpressionOfConcernIn"),
    corrected:
      types.includes("Corrected and Republished Article") ||
      has(
        "ErratumIn",
        "CorrectedandRepublishedIn",
        "CorrectedandRepublishedFrom",
      ),
    superseded: has(
      "UpdateIn",
      "RepublishedIn",
      "CorrectedandRepublishedIn",
      "RetractedandRepublishedIn",
    ),
    updatedPublication:
      types.includes("Corrected and Republished Article") ||
      has(
        "UpdateIn",
        "UpdateOf",
        "RepublishedIn",
        "RepublishedFrom",
        "CorrectedandRepublishedIn",
        "CorrectedandRepublishedFrom",
        "RetractedandRepublishedIn",
        "RetractedandRepublishedFrom",
      ),
    duplicatePublication: types.includes("Duplicate Publication"),
    retractionNotice:
      types.includes("Retraction of Publication") || has("RetractionOf"),
    correctionNotice: types.includes("Published Erratum") || has("ErratumFor"),
    concernNotice:
      types.includes("Expression of Concern") || has("ExpressionOfConcernFor"),
    relatedPmids: [
      ...new Set(
        relationships
          .map((item) => item.pmid)
          .filter((id): id is string => id !== null),
      ),
    ].sort(),
    relationships: [...relationships].sort((a, b) =>
      `${a.sourcePmid}:${a.type}:${a.pmid}`.localeCompare(
        `${b.sourcePmid}:${b.type}:${b.pmid}`,
      ),
    ),
  };
}

const reverse: Record<string, string> = {
  RetractionOf: "RetractionIn",
  ErratumFor: "ErratumIn",
  ExpressionOfConcernFor: "ExpressionOfConcernIn",
  UpdateOf: "UpdateIn",
  RepublishedFrom: "RepublishedIn",
  CorrectedandRepublishedFrom: "CorrectedandRepublishedIn",
  RetractedandRepublishedFrom: "RetractedandRepublishedIn",
};

export function incomingRelationships(
  id: string,
  records: Iterable<{ pmid: string; publicationStatus: PublicationStatus }>,
): RelatedArticle[] {
  const result: RelatedArticle[] = [];
  for (const record of records) {
    for (const relationship of record.publicationStatus.relationships) {
      const type = reverse[relationship.type];
      if (relationship.pmid === id && type)
        result.push({
          ...relationship,
          pmid: record.pmid,
          type,
          sourcePmid: record.pmid,
        });
    }
  }
  return result;
}
