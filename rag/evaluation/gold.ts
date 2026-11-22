import { readFile } from "node:fs/promises";
import path from "node:path";
import { RAG_ROOT } from "../shared/constants.js";
import { object, strings } from "../shared/config.js";
import { RagError } from "../shared/logging.js";
import { hash, type LocalStore } from "../shared/storage.js";
import { studyTypes } from "../corpus/manifest.js";
import type { RetrievalManifest } from "../corpus/schema.js";
import { canonicalStudy, indexable } from "../indexing/metadata.js";
import {
  indexingManifest,
  unchangedManifest,
  verifyDocument,
} from "../indexing/manifest-input.js";
import type { EvaluationQuestion } from "./metrics.js";

export const goldIntents = [
  "clinical-evidence",
  "treatment-evidence",
  "synthesis",
  "mechanism",
  "biomarker",
  "intervention-comparison",
  "emerging-research",
] as const;
export interface GoldQuestion {
  id: string;
  question: string;
  intent: (typeof goldIntents)[number];
  topics: string[];
  preferredStudyTypes: string[];
  relevantPmids: string[];
  highlyRelevantPmids: string[];
  acceptablePmids: string[];
  rationales: Record<string, string>;
  notes: string;
}
export interface GoldSet {
  version: 1;
  status: "draft-human-review";
  curation: string;
  questions: GoldQuestion[];
}
const nonempty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
function pmids(value: unknown): value is string[] {
  return (
    strings(value) &&
    value.every((id) => /^[1-9]\d{0,8}$/.test(id)) &&
    new Set(value).size === value.length
  );
}
export function parseGold(value: unknown): GoldSet {
  if (
    !object(value) ||
    value["version"] !== 1 ||
    value["status"] !== "draft-human-review" ||
    !nonempty(value["curation"]) ||
    !Array.isArray(value["questions"]) ||
    !value["questions"].length
  )
    throw new RagError("configuration", "Invalid draft gold evaluation set.");
  const questions: GoldQuestion[] = [];
  for (const item of value["questions"] as unknown[]) {
    if (
      !object(item) ||
      typeof item["id"] !== "string" ||
      !/^[a-z0-9-]+$/.test(item["id"]) ||
      !nonempty(item["question"]) ||
      !goldIntents.some((intent) => intent === item["intent"]) ||
      !strings(item["topics"]) ||
      !item["topics"].length ||
      !item["topics"].every(nonempty) ||
      !strings(item["preferredStudyTypes"]) ||
      !item["preferredStudyTypes"].every((type) =>
        studyTypes.some((known) => known === type),
      ) ||
      !pmids(item["relevantPmids"]) ||
      !item["relevantPmids"].length ||
      !pmids(item["highlyRelevantPmids"] ?? []) ||
      !pmids(item["acceptablePmids"] ?? []) ||
      !object(item["rationales"]) ||
      !nonempty(item["notes"])
    )
      throw new RagError(
        "configuration",
        "Invalid gold question or duplicate PMID.",
      );
    const relevant = item["relevantPmids"];
    const highly = item["highlyRelevantPmids"] ?? [];
    const acceptable = item["acceptablePmids"] ?? [];
    if (!pmids(highly) || !pmids(acceptable))
      throw new RagError("configuration", "Invalid gold PMID labels.");
    const labeled = [...relevant, ...acceptable];
    const rawRationales = item["rationales"];
    if (
      highly.some((id) => !relevant.includes(id)) ||
      acceptable.some((id) => relevant.includes(id)) ||
      Object.keys(rawRationales).length !== labeled.length ||
      labeled.some((id) => !nonempty(rawRationales[id]))
    )
      throw new RagError(
        "configuration",
        `Gold question ${item["id"]}: conflicting labels or missing rationale.`,
      );
    const rationales: Record<string, string> = {};
    for (const id of labeled) {
      const rationale = rawRationales[id];
      if (typeof rationale === "string") rationales[id] = rationale;
    }
    const intent = goldIntents.find((intent) => intent === item["intent"]);
    if (!intent) throw new RagError("configuration", "Invalid gold intent.");
    questions.push({
      id: item["id"],
      question: item["question"],
      intent,
      topics: item["topics"],
      preferredStudyTypes: item["preferredStudyTypes"],
      relevantPmids: relevant,
      highlyRelevantPmids: highly,
      acceptablePmids: acceptable,
      rationales,
      notes: item["notes"],
    });
  }
  if (new Set(questions.map((q) => q.id)).size !== questions.length)
    throw new RagError("configuration", "Duplicate gold question IDs.");
  return {
    version: 1,
    status: "draft-human-review",
    curation: value["curation"],
    questions,
  };
}
export function validateGoldManifest(
  gold: GoldSet,
  manifest: RetrievalManifest,
): void {
  for (const question of gold.questions)
    for (const pmid of [
      ...question.relevantPmids,
      ...question.acceptablePmids,
    ]) {
      const entry = manifest.entries.find((entry) => entry.pmid === pmid);
      if (!entry)
        throw new RagError(
          "configuration",
          `Gold PMID ${pmid}: missing from corpus.`,
        );
      if (!indexable(entry))
        throw new RagError(
          "configuration",
          `Gold PMID ${pmid}: blocked or retrieval-disabled.`,
        );
    }
}
export function goldQuestions(gold: GoldSet): EvaluationQuestion[] {
  return gold.questions.map((q) => ({
    id: q.id,
    question: q.question,
    expectedTopics: q.topics,
    preferredStudyTypes: q.preferredStudyTypes.map(canonicalStudy),
    expectedPmids: q.relevantPmids,
    notes: q.notes,
    judgments: {},
    filters: {},
    gold: {
      intent: q.intent,
      highlyRelevantPmids: q.highlyRelevantPmids,
      acceptablePmids: q.acceptablePmids,
    },
  }));
}
export async function readGold() {
  let text: string;
  try {
    text = await readFile(
      path.join(RAG_ROOT, "evaluation", "gold.json"),
      "utf8",
    );
  } catch {
    throw new RagError("configuration", "Cannot read evaluation/gold.json.");
  }
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    throw new RagError("configuration", "Gold evaluation JSON is corrupt.");
  }
  const gold = parseGold(value);
  return { gold, questions: goldQuestions(gold), sha256: hash(text) };
}
export async function loadGold(store: LocalStore) {
  const loaded = await readGold();
  const { gold } = loaded;
  const { manifest, manifestHash } = await indexingManifest(store);
  validateGoldManifest(gold, manifest);
  const labeled = new Set(
    gold.questions.flatMap((q) => [...q.relevantPmids, ...q.acceptablePmids]),
  );
  for (const entry of manifest.entries)
    if (labeled.has(entry.pmid)) await verifyDocument(store, entry);
  await unchangedManifest(store, manifestHash);
  return loaded;
}
