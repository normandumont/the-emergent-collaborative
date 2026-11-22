import type { RetrievalResult } from "../runtime/retrieval/result-schema.js";

export const MAX_EVIDENCE_CHARACTERS = 16_000;
const MAX_EXCERPT_CHARACTERS = 1200;
export interface ResearchSource {
  pmid: string;
  title: string;
  year: number | null;
  studyType: string;
  population: string;
  evidenceType: string;
  url: string;
}
export interface EvidenceBundle {
  context: string;
  sources: ResearchSource[];
}
export class EvidenceError extends Error {}
export class CitationError extends Error {}
export function hasUnverifiedReference(text: string): boolean {
  return /\[\s*PMID|\bPMID\s*:?\s*\d|https?:\/\/|www\.|\bdoi\s*:|\b(?:file[-_]|vs_)[a-zA-Z0-9_-]+/i.test(
    text,
  );
}
export function validatedSources(
  sources: readonly unknown[],
): ResearchSource[] {
  if (!sources.length || sources.length > 5)
    throw new CitationError("Invalid source count.");
  const unique = new Map<string, ResearchSource>();
  for (const value of sources) {
    if (
      !value ||
      typeof value !== "object" ||
      !("pmid" in value) ||
      typeof value.pmid !== "string" ||
      !/^[1-9]\d{0,8}$/.test(value.pmid) ||
      !("title" in value) ||
      typeof value.title !== "string" ||
      !value.title.trim() ||
      !("year" in value) ||
      !(value.year === null || Number.isInteger(value.year)) ||
      !("url" in value) ||
      value.url !== `https://pubmed.ncbi.nlm.nih.gov/${value.pmid}/` ||
      !("studyType" in value) ||
      typeof value.studyType !== "string" ||
      !value.studyType.trim() ||
      !("population" in value) ||
      typeof value.population !== "string" ||
      !value.population.trim() ||
      !("evidenceType" in value) ||
      typeof value.evidenceType !== "string" ||
      !value.evidenceType.trim()
    )
      throw new CitationError("Invalid source metadata.");
    const source: ResearchSource = {
      pmid: value.pmid,
      title: value.title,
      year: typeof value.year === "number" ? value.year : null,
      studyType: value.studyType,
      population: value.population,
      evidenceType: value.evidenceType,
      url: `https://pubmed.ncbi.nlm.nih.gov/${value.pmid}/`,
    };
    const previous = unique.get(source.pmid);
    if (
      previous &&
      (Object.keys(source) as (keyof ResearchSource)[]).some(
        (key) => previous[key] !== source[key],
      )
    )
      throw new CitationError("Conflicting source metadata.");
    unique.set(source.pmid, source);
  }
  return [...unique.values()];
}
function evidenceType(paper: RetrievalResult): string {
  if (paper.metadata.population === "animal") return "Animal study";
  const labels: Record<string, string> = {
    "systematic-review": "Systematic review",
    "meta-analysis": "Meta-analysis",
    "randomized-controlled-trial": "Randomized controlled trial",
    rct: "Randomized controlled trial",
    "clinical-trial": "Clinical trial",
    cohort: "Cohort study",
    longitudinal: "Longitudinal study",
    observational: "Observational study",
    "in-vitro": "Cell study",
    "basic-science": "Mechanistic study",
  };
  return labels[paper.metadata.studyType] ?? "Unknown design";
}
export function buildEvidence(results: RetrievalResult[]): EvidenceBundle {
  const sources: ResearchSource[] = [];
  let context = "";
  for (const paper of results) {
    if (sources.length >= 5) break;
    if (
      !paper ||
      !paper.metadata ||
      typeof paper.pmid !== "string" ||
      !(paper.title === null || typeof paper.title === "string") ||
      !Array.isArray(paper.chunks) ||
      !Array.isArray(paper.metadata.warnings) ||
      paper.metadata.warnings.some((warning) => typeof warning !== "string") ||
      !(
        ["retrievalEnabled", "retracted", "superseded", "corrected"] as const
      ).every((key) => typeof paper.metadata[key] === "boolean") ||
      typeof paper.metadata.status !== "string" ||
      typeof paper.metadata.studyType !== "string" ||
      typeof paper.metadata.population !== "string" ||
      typeof paper.metadata.contentScope !== "string" ||
      !(
        paper.metadata.year === null || Number.isInteger(paper.metadata.year)
      ) ||
      paper.chunks.slice(0, 2).some((chunk) => typeof chunk?.text !== "string")
    )
      throw new EvidenceError("Malformed retrieval metadata.");
    if (
      sources.some((source) => source.pmid === paper.pmid) ||
      !/^[1-9]\d{0,8}$/.test(paper.pmid) ||
      !paper.title?.trim() ||
      !paper.metadata.retrievalEnabled ||
      paper.metadata.retracted ||
      paper.metadata.superseded ||
      paper.metadata.status !== "active"
    )
      continue;
    const excerpts = paper.chunks
      .slice(0, 2)
      .map((chunk) => chunk.text.slice(0, MAX_EXCERPT_CHARACTERS))
      .filter((text) => text.trim());
    if (!excerpts.length) continue;
    const source: ResearchSource = {
      pmid: paper.pmid,
      title: paper.title.slice(0, 1000),
      year: paper.metadata.year,
      studyType: paper.metadata.studyType,
      population: paper.metadata.population,
      evidenceType: evidenceType(paper),
      url: `https://pubmed.ncbi.nlm.nih.gov/${paper.pmid}/`,
    };
    const block = `<EVIDENCE>\n${JSON.stringify({
      ...source,
      contentScope: paper.metadata.contentScope,
      warnings: paper.metadata.warnings
        .slice(0, 10)
        .map((warning) => warning.slice(0, 160)),
      excerpts,
    })
      .replaceAll("<", "\\u003c")
      .replaceAll(">", "\\u003e")}\n</EVIDENCE>\n`;
    if (context.length + block.length > MAX_EVIDENCE_CHARACTERS) break;
    context += block;
    sources.push(source);
  }
  return { context, sources };
}
export function groundedAnswer(text: string, evidence: EvidenceBundle) {
  const sources = validatedSources(evidence.sources);
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    throw new CitationError("Invalid structured answer.");
  }
  if (
    value === null ||
    typeof value !== "object" ||
    !("answer" in value) ||
    !("citedPmids" in value) ||
    typeof value.answer !== "string" ||
    !value.answer.trim() ||
    !Array.isArray(value.citedPmids) ||
    !value.citedPmids.length ||
    value.citedPmids.some((id: unknown) => typeof id !== "string") ||
    value.citedPmids.length > 5
  )
    throw new CitationError("Invalid structured citations.");
  const allowed = new Set(sources.map((source) => source.pmid));
  const cited = new Set<string>();
  for (const id of value.citedPmids as unknown[]) {
    if (typeof id !== "string" || !allowed.has(id))
      throw new CitationError("Unretrieved citation.");
    cited.add(id);
  }
  const marker = /\[PMID ([1-9]\d{0,8})\]/gi;
  const inline = [...value.answer.matchAll(marker)].map((match) => match[1]);
  if (
    inline.some((id) => !id || !cited.has(id)) ||
    [...cited].some((id) => !inline.includes(id)) ||
    /\bPMID/i.test(value.answer.replace(marker, "")) ||
    hasUnverifiedReference(value.answer.replace(marker, ""))
  )
    throw new CitationError("Citation text does not match structured sources.");
  return {
    answer: value.answer,
    sources: sources.filter((source) => cited.has(source.pmid)),
  };
}
