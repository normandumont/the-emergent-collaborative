import { readFile } from "node:fs/promises";
import path from "node:path";
import { object, strings } from "../shared/config.js";
import { RAG_ROOT } from "../shared/constants.js";
import { hash } from "../shared/storage.js";
import { RagError } from "../shared/logging.js";
import type {
  CorpusConfig,
  CorpusPolicy,
  EvidenceCategory,
  TopicRule,
} from "./schema.js";
import type { Population } from "../shared/article-schema.js";

const evidence = [
  "human-synthesis",
  "human-interventional",
  "human-observational",
  "human-mechanistic",
  "animal",
  "cellular",
  "guidance",
  "opinion",
  "unknown",
];
function isPopulation(value: string): value is Population {
  return ["human", "animal", "unknown"].includes(value);
}
function isEvidence(value: string): value is EvidenceCategory {
  return evidence.includes(value);
}
function isBlocked(
  value: string,
): value is CorpusPolicy["blockedStates"][number] {
  return [
    "retracted",
    "expressionOfConcern",
    "superseded",
    "duplicatePublication",
  ].includes(value);
}
function blockedList(value: unknown): value is CorpusPolicy["blockedStates"] {
  return (
    strings(value) &&
    value.every(isBlocked) &&
    (
      [
        "retracted",
        "expressionOfConcern",
        "superseded",
        "duplicatePublication",
      ] as const
    ).every((state) => value.includes(state))
  );
}
function year(value: unknown): value is number | null {
  return (
    value === null ||
    (typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 1 &&
      value <= 9999)
  );
}
function fail(): never {
  throw new RagError("configuration", "Invalid corpus policy or taxonomy.");
}

export function parseCorpusConfig(
  policyText: string,
  taxonomyText: string,
): CorpusConfig {
  let policy: unknown;
  let taxonomy: unknown;
  try {
    policy = JSON.parse(policyText) as unknown;
    taxonomy = JSON.parse(taxonomyText) as unknown;
  } catch {
    return fail();
  }
  if (
    !object(policy) ||
    typeof policy["policyVersion"] !== "number" ||
    !Number.isInteger(policy["policyVersion"]) ||
    policy["policyVersion"] < 1 ||
    typeof policy["referenceDate"] !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(policy["referenceDate"]) ||
    !Number.isFinite(Date.parse(policy["referenceDate"])) ||
    !strings(policy["includedPublicationTypes"]) ||
    !policy["includedPublicationTypes"].length ||
    !strings(policy["excludedPublicationTypes"]) ||
    !strings(policy["allowedPopulations"]) ||
    !policy["allowedPopulations"].every(isPopulation) ||
    !year(policy["minYear"]) ||
    !year(policy["maxYear"]) ||
    (policy["minYear"] !== null &&
      policy["maxYear"] !== null &&
      policy["minYear"] > policy["maxYear"]) ||
    typeof policy["requirePublicationDate"] !== "boolean" ||
    typeof policy["requireTitle"] !== "boolean" ||
    typeof policy["requireAbstract"] !== "boolean" ||
    typeof policy["requireReusableFullText"] !== "boolean" ||
    !blockedList(policy["blockedStates"]) ||
    !strings(policy["retrievalDisabledPmids"]) ||
    !policy["retrievalDisabledPmids"].every((id) =>
      /^[1-9]\d{0,8}$/.test(id),
    ) ||
    !strings(policy["topicMeshTerms"]) ||
    !strings(policy["topicKeywords"]) ||
    !strings(policy["allowedEvidenceCategories"]) ||
    !policy["allowedEvidenceCategories"].every(isEvidence)
  )
    fail();
  const parsed: CorpusPolicy = {
    policyVersion: policy["policyVersion"],
    referenceDate: policy["referenceDate"],
    includedPublicationTypes: policy["includedPublicationTypes"],
    excludedPublicationTypes: policy["excludedPublicationTypes"],
    allowedPopulations: policy["allowedPopulations"],
    minYear: policy["minYear"],
    maxYear: policy["maxYear"],
    requirePublicationDate: policy["requirePublicationDate"],
    requireTitle: policy["requireTitle"],
    requireAbstract: policy["requireAbstract"],
    requireReusableFullText: policy["requireReusableFullText"],
    blockedStates: policy["blockedStates"],
    retrievalDisabledPmids: policy["retrievalDisabledPmids"],
    topicMeshTerms: policy["topicMeshTerms"],
    topicKeywords: policy["topicKeywords"],
    allowedEvidenceCategories: policy["allowedEvidenceCategories"],
  };
  if (!Array.isArray(taxonomy)) fail();
  const topics: TopicRule[] = [];
  for (const rule of taxonomy as unknown[]) {
    if (
      !object(rule) ||
      typeof rule["id"] !== "string" ||
      !/^[a-z][a-z0-9-]+$/.test(rule["id"]) ||
      !strings(rule["queries"]) ||
      !strings(rule["mesh"]) ||
      !strings(rule["keywords"])
    )
      fail();
    topics.push({
      id: rule["id"],
      queries: rule["queries"],
      mesh: rule["mesh"],
      keywords: rule["keywords"],
    });
  }
  if (new Set(topics.map((rule) => rule.id)).size !== topics.length) fail();
  return {
    policy: parsed,
    topics,
    policyText,
    taxonomyText,
    policySha256: hash(policyText),
    taxonomySha256: hash(taxonomyText),
  };
}

export async function loadCorpusConfig(): Promise<CorpusConfig> {
  let files: string[];
  try {
    files = await Promise.all(
      ["corpus-policy", "corpus-topics"].map((name) =>
        readFile(path.join(RAG_ROOT, "config", `${name}.json`), "utf8"),
      ),
    );
  } catch {
    throw new RagError("configuration", "Cannot read corpus configuration.");
  }
  return parseCorpusConfig(files[0] ?? "", files[1] ?? "");
}
