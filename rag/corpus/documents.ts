import type { CorpusDecision, GovernedArticle } from "./schema.js";
import { RagError } from "../shared/logging.js";

function metadata(value: string | number | null): string {
  return String(value ?? "unknown")
    .replace(/\r?\n/g, " ")
    .replace(/[\\`*_{}[\]<>#|]/g, "\\$&");
}
function sourceBlock(text: string): string {
  const length = Math.max(
    3,
    ...[...text.matchAll(/`+/g)].map((match) => match[0].length + 1),
  );
  const fence = "`".repeat(length);
  return `${fence}text\n${text}\n${fence}`;
}

export function retrievalDocument(
  article: GovernedArticle,
  decision: CorpusDecision,
): string {
  if (!decision.retrievalEnabled)
    throw new RagError(
      "policy-limit",
      "Retrieval document requested for a disabled article.",
    );
  const full = decision.contentScope === "full-text-retrievable";
  const lines = [
    `# ${metadata(article.citation.title)}`,
    "",
    "## Citation and governance metadata",
    "",
    `PMID: ${article.identity.pmid}`,
    `PMCID: ${metadata(article.identity.pmcid)}`,
    `DOI: ${metadata(article.identity.doi)}`,
    `Authors: ${metadata(article.citation.authors.map((author) => author.name).join("; ") || null)}`,
    `Journal: ${metadata(article.citation.journal)}`,
    `Publication date: ${metadata(article.citation.publicationDate)}`,
    `Study type: ${article.classification.studyType}`,
    `Study design tier: ${article.classification.studyDesignTier ?? "unknown"} (design classification, not paper quality)`,
    `Evidence category: ${article.classification.evidenceCategory}`,
    `Population: ${article.classification.population}`,
    `Topics: ${article.classification.topics.join(", ")}`,
    `Publication types: ${metadata(article.classification.articleTypes.join("; "))}`,
    `MeSH: ${metadata(article.classification.meshTerms.join("; "))}`,
    `Content scope: ${full ? "reusable full text" : "abstract only"}`,
    `Full text: ${full ? "yes" : "no"}`,
    `Source type: ${article.source.sourceType}`,
    `License: ${metadata(full ? (article.source.license?.id ?? null) : null)}`,
    `Full-text license observed: ${metadata(article.source.license?.id ?? article.source.license?.url ?? null)}`,
    `License URL: ${metadata(article.source.license?.url ?? null)}`,
    `License statement: ${metadata(article.source.license?.statement ?? null)}`,
    `Copyright: ${metadata(article.source.license?.copyright ?? null)}`,
    `License evidence URL: ${metadata(article.source.license?.evidenceUrl ?? null)}`,
    `Retrieved at: ${article.source.retrievedAt}`,
    `Policy version: ${decision.policyVersion}`,
    `Policy SHA-256: ${decision.policySha256}`,
    `Taxonomy SHA-256: ${decision.taxonomySha256}`,
    `Normalized record SHA-256: ${decision.normalizedRecordSha256}`,
    `Normalized record path: corpus/versions/${article.identity.pmid}/${decision.normalizedRecordSha256}.json`,
    `Input normalized record SHA-256: ${decision.baseNormalizedSha256}`,
    `Retraction: ${article.publicationStatus.retracted}`,
    `Expression of concern: ${article.publicationStatus.expressionOfConcern}`,
    `Corrected: ${article.publicationStatus.corrected}`,
    `Superseded: ${article.publicationStatus.superseded}`,
    `Related PMIDs: ${article.publicationStatus.relatedPmids.join(", ") || "none known"}`,
    `Relationships: ${metadata(article.publicationStatus.relationships.map((ref) => `${ref.type}: ${ref.pmid ?? "PMID unavailable"} (source PMID ${ref.sourcePmid})`).join("; ") || null)}`,
    `Warnings: ${decision.warnings.join("; ") || "none"}`,
    "",
    "## Source provenance",
    "",
    ...article.source.provenance.flatMap((source) => [
      `Source API: ${source.api}`,
      `Source URL: ${source.url}`,
      `Source raw path: ${source.rawPath}`,
      `Source SHA-256: ${source.sha256}`,
      `Source retrieved at: ${source.retrievedAt}`,
      "",
    ]),
    "The following fenced blocks contain original normalized source text, not generated summaries.",
    "Abstract availability is not a blanket redistribution license. This is a local preparation artifact.",
    "",
  ];
  if (article.content.abstract)
    lines.push("## Abstract", "", sourceBlock(article.content.abstract), "");
  if (full)
    for (const section of article.content.sections)
      lines.push(
        `## ${metadata(section.heading ?? "Untitled source section")}`,
        "",
        sourceBlock(section.text),
        "",
      );
  lines.push(
    "## Source",
    "",
    `PubMed: ${article.source.pubmedUrl}`,
    ...(article.source.pmcUrl ? [`PMC: ${article.source.pmcUrl}`] : []),
    "",
  );
  return lines.join("\n");
}
