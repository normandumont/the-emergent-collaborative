import { readFile } from "node:fs/promises";
import path from "node:path";
import { MAX_BATCH_SIZE, MAX_RESULTS, RAG_ROOT } from "./constants.js";
import { RagError } from "./logging.js";
import type { StudyType } from "./article-schema.js";

export interface Query {
  id: string;
  enabled: boolean;
  description: string;
  query: string;
  topics: string[];
  maxResults: number;
}
export interface EvidenceRules {
  schemaVersion: 1;
  studyTypes: { publicationTypes: string[]; studyType: StudyType }[];
  population: { human: string; animal: string };
}
export interface Config {
  queries: Query[];
  rules: EvidenceRules;
  apiKey: string | null;
  tool: string;
  email: string;
  requestsPerSecond: number;
  batchSize: number;
}

export function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
export function strings(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && !!item.trim())
  );
}
function fail(): never {
  throw new RagError("configuration", "Invalid RAG configuration.");
}
export function parseRegistry(
  queries: unknown,
  topics: unknown,
  rules: unknown,
): Pick<Config, "queries" | "rules"> {
  if (
    !Array.isArray(topics) ||
    !topics.every(
      (item: unknown) =>
        object(item) &&
        typeof item["id"] === "string" &&
        typeof item["label"] === "string",
    )
  )
    fail();
  const topicIds = topics.map((item: Record<string, unknown>) => item["id"]);
  if (new Set(topicIds).size !== topicIds.length) fail();
  if (!Array.isArray(queries)) fail();
  const parsed: Query[] = [];
  for (const item of queries as unknown[]) {
    if (
      !object(item) ||
      typeof item["id"] !== "string" ||
      !/^[a-z][a-z0-9_]+$/.test(item["id"]) ||
      typeof item["enabled"] !== "boolean" ||
      typeof item["description"] !== "string" ||
      typeof item["query"] !== "string" ||
      !item["query"].trim() ||
      !strings(item["topics"]) ||
      !item["topics"].every((topic) => topicIds.includes(topic)) ||
      typeof item["maxResults"] !== "number" ||
      !Number.isInteger(item["maxResults"]) ||
      item["maxResults"] < 1 ||
      item["maxResults"] > MAX_RESULTS
    )
      fail();
    parsed.push({
      id: item["id"],
      enabled: item["enabled"],
      description: item["description"],
      query: item["query"],
      topics: item["topics"],
      maxResults: item["maxResults"],
    });
  }
  if (new Set(parsed.map((item) => item.id)).size !== parsed.length) fail();
  if (
    !object(rules) ||
    rules["schemaVersion"] !== 1 ||
    !Array.isArray(rules["studyTypes"]) ||
    !object(rules["population"]) ||
    typeof rules["population"]["human"] !== "string" ||
    typeof rules["population"]["animal"] !== "string"
  )
    fail();
  const studyTypes: EvidenceRules["studyTypes"] = [];
  for (const rule of rules["studyTypes"] as unknown[]) {
    if (
      !object(rule) ||
      !strings(rule["publicationTypes"]) ||
      !["rct", "systematic-review", "meta-analysis", "clinical-trial"].includes(
        String(rule["studyType"]),
      )
    )
      fail();
    studyTypes.push({
      publicationTypes: rule["publicationTypes"],
      studyType: rule["studyType"] as StudyType,
    });
  }
  return {
    queries: parsed,
    rules: {
      schemaVersion: 1,
      studyTypes,
      population: {
        human: rules["population"]["human"],
        animal: rules["population"]["animal"],
      },
    },
  };
}

export async function loadConfig(
  env: NodeJS.ProcessEnv = process.env,
): Promise<Config> {
  const files = await Promise.all(
    ["pubmed-queries", "topics", "evidence-rules"].map(async (name) => {
      try {
        return JSON.parse(
          await readFile(path.join(RAG_ROOT, "config", `${name}.json`), "utf8"),
        ) as unknown;
      } catch {
        throw new RagError("configuration", "Cannot read RAG configuration.");
      }
    }),
  );
  const registry = parseRegistry(files[0], files[1], files[2]);
  const apiKey = env["NCBI_API_KEY"]?.trim() || null;
  const tool = env["NCBI_TOOL"] ?? "meridian-station-rag-prototype";
  const email = env["NCBI_EMAIL"] ?? "contact@meridianstation.org";
  const requestsPerSecond = Number(env["NCBI_REQUESTS_PER_SECOND"] ?? 3);
  const batchSize = Number(env["NCBI_BATCH_SIZE"] ?? 20);
  if (
    !/^[a-zA-Z0-9_-]+$/.test(tool) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !Number.isFinite(requestsPerSecond) ||
    requestsPerSecond <= 0 ||
    requestsPerSecond > (apiKey ? 10 : 3) ||
    !Number.isInteger(batchSize) ||
    batchSize < 1 ||
    batchSize > MAX_BATCH_SIZE
  )
    fail();
  return { ...registry, apiKey, tool, email, requestsPerSecond, batchSize };
}

export function selectQuery(
  config: Config,
  id: string,
  limit?: number,
): Query & { limit: number } {
  const query = config.queries.find((item) => item.id === id && item.enabled);
  if (!query)
    throw new RagError("configuration", "Query is unknown or disabled.");
  const bounded = limit ?? query.maxResults;
  if (!Number.isInteger(bounded) || bounded < 1 || bounded > query.maxResults)
    throw new RagError(
      "configuration",
      "Limit must be within the query's configured prototype cap.",
    );
  return { ...query, limit: bounded };
}
