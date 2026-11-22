import type { Article, StudyType } from "../shared/article-schema.js";
import type {
  EvidenceCategory,
  GovernedArticle,
  TopicAssignment,
  TopicRule,
} from "./schema.js";

export function keywordMatch(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(?:^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`,
    "iu",
  ).test(text);
}

export function classifyTopics(
  article: Article,
  rules: TopicRule[],
): TopicAssignment[] {
  return rules
    .flatMap((rule) => {
      const reasons = [
        ...rule.queries
          .filter((id) => article.source.queryIds.includes(id))
          .map((id) => `query:${id}`),
        ...rule.mesh
          .filter((term) =>
            article.classification.meshTerms.some(
              (mesh) => mesh.toLowerCase() === term.toLowerCase(),
            ),
          )
          .map((term) => `mesh:${term}`),
        ...rule.keywords.flatMap((term) => [
          ...(keywordMatch(article.citation.title ?? "", term)
            ? [`title-keyword:${term}`]
            : []),
          ...(article.publicationMetadata?.keywords.some((keyword) =>
            keywordMatch(keyword, term),
          )
            ? [`author-keyword:${term}`]
            : []),
        ]),
      ];
      return reasons.length
        ? [{ topic: rule.id, reasons: reasons.sort() }]
        : [];
    })
    .sort((a, b) => a.topic.localeCompare(b.topic));
}

export function classifyStudy(article: Article): StudyType {
  const {
    articleTypes: types,
    meshTerms: mesh,
    population,
  } = article.classification;
  const has = (...names: string[]) =>
    names.some((name) => types.includes(name));
  if (has("Meta-Analysis")) return "meta-analysis";
  if (has("Systematic Review")) return "systematic-review";
  if (has("Randomized Controlled Trial")) return "randomized-controlled-trial";
  if (has("Editorial")) return "editorial";
  if (has("Comment", "Letter")) return "commentary";
  if (has("Guideline", "Practice Guideline")) return "guideline";
  if (
    has(
      "Clinical Trial",
      "Clinical Trial, Phase I",
      "Clinical Trial, Phase II",
      "Clinical Trial, Phase III",
      "Clinical Trial, Phase IV",
    )
  )
    return "clinical-trial";
  if (has("Case Reports")) return "case-report";
  if (has("Review")) return "unknown";
  if (mesh.includes("Case-Control Studies")) return "case-control";
  if (mesh.includes("Cross-Sectional Studies")) return "cross-sectional";
  if (mesh.includes("Cohort Studies")) return "cohort";
  if (mesh.includes("Longitudinal Studies")) return "longitudinal";
  if (has("Observational Study")) return "observational";
  if (
    population === "unknown" &&
    mesh.includes("Cells, Cultured") &&
    mesh.includes("In Vitro Techniques")
  )
    return "in-vitro";
  if (population === "animal") return "animal";
  if (
    mesh.includes("Basic Research") ||
    article.publicationMetadata?.keywords.some(
      (keyword) =>
        keywordMatch(keyword, "mechanistic study") ||
        keywordMatch(keyword, "basic science study"),
    )
  )
    return "basic-science";
  return "unknown";
}

export function designEvidence(
  article: Article,
  study: StudyType,
): { studyDesignTier: number | null; evidenceCategory: EvidenceCategory } {
  const population = article.classification.population;
  if (study === "editorial" || study === "commentary")
    return { studyDesignTier: 8, evidenceCategory: "opinion" };
  if (study === "guideline")
    return { studyDesignTier: null, evidenceCategory: "guidance" };
  if (study === "in-vitro")
    return { studyDesignTier: 7, evidenceCategory: "cellular" };
  if (population === "animal" && study !== "unknown")
    return { studyDesignTier: 6, evidenceCategory: "animal" };
  if (population !== "human")
    return { studyDesignTier: null, evidenceCategory: "unknown" };
  if (study === "meta-analysis" || study === "systematic-review")
    return { studyDesignTier: 1, evidenceCategory: "human-synthesis" };
  if (study === "randomized-controlled-trial" || study === "rct")
    return { studyDesignTier: 2, evidenceCategory: "human-interventional" };
  if (
    study === "longitudinal" ||
    (study === "cohort" &&
      article.classification.meshTerms.some((term) =>
        ["Prospective Studies", "Longitudinal Studies"].includes(term),
      ))
  )
    return { studyDesignTier: 3, evidenceCategory: "human-observational" };
  if (
    ["cohort", "case-control", "cross-sectional", "observational"].includes(
      study,
    )
  )
    return { studyDesignTier: 4, evidenceCategory: "human-observational" };
  if (study === "basic-science")
    return { studyDesignTier: 5, evidenceCategory: "human-mechanistic" };
  if (study === "clinical-trial")
    return { studyDesignTier: null, evidenceCategory: "human-interventional" };
  return { studyDesignTier: null, evidenceCategory: "unknown" };
}

export function classifyArticle(
  article: Article & Required<Pick<Article, "publicationStatus">>,
  rules: TopicRule[],
): GovernedArticle {
  const studyType = classifyStudy(article);
  const topicAssignments = classifyTopics(article, rules);
  return {
    ...article,
    classification: {
      ...article.classification,
      studyType,
      ...designEvidence(article, studyType),
      topics: topicAssignments.map((item) => item.topic),
      topicAssignments,
    },
  };
}
