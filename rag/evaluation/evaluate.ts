import { readFile } from "node:fs/promises";
import path from "node:path";
import { RAG_ROOT } from "../shared/constants.js";
import { object, strings } from "../shared/config.js";
import { RagError } from "../shared/logging.js";
import { hash, type LocalStore } from "../shared/storage.js";
import {
  indexingManifest,
  unchangedManifest,
} from "../indexing/manifest-input.js";
import { currentStore, readState, selectedId } from "../indexing/state.js";
import type { VectorApi } from "../indexing/openai-client.js";
import { searchVector } from "../retrieval/search.js";
import { validateFilters, type Filters } from "../retrieval/filters.js";
import type { RetrievalResponse } from "../retrieval/result-schema.js";
import {
  aggregate,
  metrics,
  type EvaluationQuestion,
  type QuestionMetrics,
} from "./metrics.js";
import { canonicalStudy } from "../indexing/metadata.js";
import { studyTypes } from "../corpus/manifest.js";
import { loadGold } from "./gold.js";

export function parseQuestions(value: unknown): EvaluationQuestion[] {
  if (!Array.isArray(value) || !value.length)
    throw new RagError(
      "configuration",
      "Evaluation questions must be a nonempty array.",
    );
  const questions: EvaluationQuestion[] = [];
  for (const item of value as unknown[]) {
    if (
      !object(item) ||
      typeof item["id"] !== "string" ||
      !/^[a-z0-9-]+$/.test(item["id"]) ||
      typeof item["question"] !== "string" ||
      !item["question"].trim() ||
      !strings(item["expectedTopics"]) ||
      !strings(item["preferredStudyTypes"]) ||
      !item["preferredStudyTypes"].every((type) =>
        studyTypes.some((known) => known === type),
      ) ||
      !strings(item["expectedPmids"]) ||
      !item["expectedPmids"].every((id) => /^[1-9]\d{0,8}$/.test(id)) ||
      typeof item["notes"] !== "string"
    )
      throw new RagError("configuration", "Invalid evaluation question.");
    const judgments: EvaluationQuestion["judgments"] = {};
    if (item["judgments"] !== undefined) {
      if (!object(item["judgments"]))
        throw new RagError("configuration", "Invalid manual judgments.");
      for (const [id, label] of Object.entries(item["judgments"])) {
        if (
          !/^[1-9]\d{0,8}$/.test(id) ||
          (label !== "relevant" && label !== "irrelevant") ||
          (label === "irrelevant" && item["expectedPmids"].includes(id))
        )
          throw new RagError(
            "configuration",
            "Conflicting or invalid manual relevance judgment.",
          );
        judgments[id] = label;
      }
    }
    const filters: Filters = {};
    if (item["filters"] !== undefined) {
      const input = item["filters"];
      if (
        !object(input) ||
        Object.keys(input).some(
          (key) =>
            ![
              "humanOnly",
              "yearFrom",
              "yearTo",
              "studyType",
              "maxTier",
              "topic",
            ].includes(key),
        )
      )
        throw new RagError("configuration", "Invalid evaluation filters.");
      if (input["humanOnly"] !== undefined) {
        if (typeof input["humanOnly"] !== "boolean")
          throw new RagError("configuration", "Invalid human-only filter.");
        filters.humanOnly = input["humanOnly"];
      }
      for (const key of ["yearFrom", "yearTo", "maxTier"] as const) {
        if (input[key] !== undefined) {
          if (typeof input[key] !== "number")
            throw new RagError(
              "configuration",
              "Invalid numeric evaluation filter.",
            );
          filters[key] = input[key];
        }
      }
      for (const key of ["studyType", "topic"] as const) {
        if (input[key] !== undefined) {
          if (typeof input[key] !== "string")
            throw new RagError(
              "configuration",
              "Invalid text evaluation filter.",
            );
          filters[key] = input[key];
        }
      }
      validateFilters(filters);
    }
    questions.push({
      id: item["id"],
      question: item["question"],
      expectedTopics: item["expectedTopics"],
      preferredStudyTypes: item["preferredStudyTypes"].map(canonicalStudy),
      expectedPmids: item["expectedPmids"],
      notes: item["notes"],
      judgments,
      filters,
    });
  }
  if (
    new Set(questions.map((question) => question.id)).size !== questions.length
  )
    throw new RagError("configuration", "Duplicate evaluation question IDs.");
  return questions;
}
export async function loadQuestions(): Promise<{
  questions: EvaluationQuestion[];
  sha256: string;
}> {
  let text: string;
  try {
    text = await readFile(
      path.join(RAG_ROOT, "evaluation", "questions.json"),
      "utf8",
    );
  } catch {
    throw new RagError(
      "configuration",
      "Cannot read evaluation/questions.json.",
    );
  }
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    throw new RagError(
      "configuration",
      "Evaluation questions JSON is corrupt.",
    );
  }
  return { questions: parseQuestions(value), sha256: hash(text) };
}
export interface EvaluationRow {
  question: EvaluationQuestion;
  retrieval: RetrievalResponse;
  metrics: QuestionMetrics;
}
export interface EvaluationReport {
  schemaVersion: 2;
  generatedAt: string;
  storeId: string;
  manifestSha256: string;
  questionsSha256: string;
  methodology: string;
  candidateLimit: number;
  gold?: { version: 1; status: "draft-human-review" };
  summary: ReturnType<typeof aggregate>;
  questions: EvaluationRow[];
}
export async function evaluateRetrieval(
  api: VectorApi,
  store: LocalStore,
  env: NodeJS.ProcessEnv = process.env,
  source: "heuristic" | "gold" = "heuristic",
): Promise<EvaluationReport> {
  const loaded = source === "gold" ? await loadGold(store) : await loadQuestions();
  const { questions, sha256 } = loaded;
  const { manifestHash } = await indexingManifest(store);
  const state = await readState(store);
  const target = currentStore(state, selectedId(state, env));
  const rows: EvaluationRow[] = [];
  for (const question of questions) {
    await unchangedManifest(store, manifestHash);
    const retrieval = await searchVector(
      api,
      store,
      question.question,
      {
        ...question.filters,
        papers: 10,
        chunksPerPaper: 2,
        candidateLimit: 50,
        debugRanking: true,
      },
      env,
    );
    rows.push({
      question,
      retrieval,
      metrics: metrics(question, retrieval.results, retrieval),
    });
  }
  await unchangedManifest(store, manifestHash);
  return {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    storeId: target.id,
    manifestSha256: manifestHash,
    questionsSha256: sha256,
    ...(source === "gold"
      ? { gold: { version: 1 as const, status: "draft-human-review" as const } }
      : {}),
    methodology:
      "Deterministic paper-level reranking from at most 50 provider chunks; return up to 10 unique PMIDs with two chunks each. Recall@K = distinct relevant hits / relevant pool size; Precision@5 = relevant hits / 5; MRR = mean reciprocal first relevant rank within ten returned papers (MRR@10); Hit@K = any relevant hit. " +
      (source === "gold"
        ? "Draft gold labels were assembled independently from local source content for human review, not approved human ground truth. Unlisted/acceptable PMIDs earn no primary relevance credit; highly relevant is a subset scored separately. Incomplete pools may underestimate precision. "
        : "Recall/MRR/hits require expected PMIDs; heuristic P@5 requires explicit judgments for all returned top-five papers. ") +
      "Unique-PMID rate measures candidate diversity before chunk caps. Ranking adjustments and metadata proxies are not scientific quality or clinical recommendations. Empty-result safety checks are not evaluated. No answers or run-time model judgments generated.",
    candidateLimit: 50,
    summary: aggregate(rows.map((row) => row.metrics)),
    questions: rows,
  };
}
