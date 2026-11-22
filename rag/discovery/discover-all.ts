import { randomUUID } from "node:crypto";
import type { Config, Query } from "../shared/config.js";
import { object, strings } from "../shared/config.js";
import {
  category,
  log,
  RagError,
  type ErrorCategory,
} from "../shared/logging.js";
import { hash, type LocalStore } from "../shared/storage.js";
import { stableJson } from "../shared/json.js";
import { ingest, type IngestionSummary } from "../ingestion/ingest.js";
import { PubmedClient } from "./pubmed-client.js";
import { discover } from "./pubmed-search.js";
import { pmid } from "./deduplicate.js";

export interface DiscoveryOptions {
  limitPerQuery: number;
  execute: boolean;
  dryRun: boolean;
}
export interface DiscoveryPlan {
  enabledQueries: number;
  limitPerQuery: number;
  maximumCandidates: number;
  queries: (Query & { limit: number })[];
  fingerprint: string;
}
interface QueryProgress {
  queryId: string;
  status: "pending" | "completed" | "error";
  discoveryRunId: string | null;
  executedAt: string | null;
  totalMatches: number | null;
  pmids: string[];
  alreadyKnownPmids: number;
  newlyDiscoveredPmids: number;
  duplicatePmidsAcrossQueries: number;
  error: ErrorCategory | null;
}
export interface MultiQueryRun {
  schemaVersion: 1;
  runId: string;
  createdAt: string;
  updatedAt: string;
  status: "running" | "completed" | "partial" | "fatal";
  plan: DiscoveryPlan;
  knownBeforeRun: string[];
  queries: QueryProgress[];
  ingestionRuns: IngestionSummary[];
  articles: {
    pmid: string;
    discoveredBy: { queryId: string; topics: string[] }[];
    status: string;
    error: string | null;
  }[];
  summary: {
    returnedCandidateSlots: number;
    uniquePmids: number;
    alreadyKnownPmids: number;
    newlyDiscoveredPmids: number;
    duplicateCandidateSlots: number;
    normalized: number;
    queryErrors: number;
    pmidErrors: number;
  };
  fatalError: ErrorCategory | null;
  nextSteps: string[];
}

export function discoveryOptions(args: string[]): DiscoveryOptions {
  let limitPerQuery = 75;
  let execute = false;
  let dryRun = false;
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const flag = args[i]!;
    if (seen.has(flag))
      throw new RagError("configuration", "Repeated discovery flag.");
    seen.add(flag);
    if (flag === "--execute") execute = true;
    else if (flag === "--dry-run") dryRun = true;
    else if (flag === "--limit-per-query") {
      const value = args[++i];
      if (!value || !/^\d+$/.test(value))
        throw new RagError(
          "configuration",
          "Candidate limit must be an integer.",
        );
      limitPerQuery = Number(value);
    } else throw new RagError("configuration", "Unsupported discovery flag.");
  }
  if (execute && dryRun)
    throw new RagError(
      "configuration",
      "--execute and --dry-run are mutually exclusive.",
    );
  if (
    !Number.isInteger(limitPerQuery) ||
    limitPerQuery < 1 ||
    limitPerQuery > 100
  )
    throw new RagError(
      "configuration",
      "Candidate limit must be between 1 and 100.",
    );
  return { limitPerQuery, execute, dryRun: dryRun || !execute };
}

export function discoveryPlan(
  config: Config,
  options: DiscoveryOptions,
): DiscoveryPlan {
  if (options.execute && options.dryRun)
    throw new RagError(
      "configuration",
      "Conflicting discovery execution modes.",
    );
  if (
    !Number.isInteger(options.limitPerQuery) ||
    options.limitPerQuery < 1 ||
    options.limitPerQuery > 100
  )
    throw new RagError(
      "configuration",
      "Candidate limit must be between 1 and 100.",
    );
  const queries = config.queries
    .filter((query) => query.enabled)
    .map((query) => ({
      ...query,
      limit: Math.min(options.limitPerQuery, query.maxResults, 100),
    }));
  if (!queries.length)
    throw new RagError("configuration", "No enabled PubMed queries.");
  return {
    enabledQueries: queries.length,
    limitPerQuery: options.limitPerQuery,
    maximumCandidates: queries.reduce((sum, query) => sum + query.limit, 0),
    queries,
    fingerprint: hash(stableJson(queries)),
  };
}

export function printDiscoveryPlan(plan: DiscoveryPlan): void {
  console.log(`Enabled queries: ${plan.enabledQueries}`);
  console.log(`Limit per query: ${plan.limitPerQuery}`);
  console.log(
    `Maximum candidate retrieval: ${plan.maximumCandidates} (before cross-query deduplication)`,
  );
  for (const query of plan.queries)
    console.log(
      `${query.id}: ${query.limit} candidates${query.limit < plan.limitPerQuery ? " (configured cap)" : ""} | ${query.description}`,
    );
}

function assertResumeRun(
  data: unknown,
  plan: DiscoveryPlan,
): asserts data is MultiQueryRun {
  if (
    !object(data) ||
    data["schemaVersion"] !== 1 ||
    typeof data["runId"] !== "string" ||
    !/^multi-query-[\dTZ-]+-[a-f0-9-]{36}$/.test(data["runId"]) ||
    !object(data["plan"]) ||
    stableJson(data["plan"]) !== stableJson(plan) ||
    !strings(data["knownBeforeRun"]) ||
    !Array.isArray(data["queries"]) ||
    data["queries"].length !== plan.queries.length ||
    !Array.isArray(data["ingestionRuns"]) ||
    !Array.isArray(data["articles"]) ||
    !object(data["summary"]) ||
    !strings(data["nextSteps"]) ||
    (data["fatalError"] !== null && typeof data["fatalError"] !== "string") ||
    !["running", "completed", "partial", "fatal"].includes(
      String(data["status"]),
    ) ||
    typeof data["createdAt"] !== "string" ||
    !Number.isFinite(Date.parse(data["createdAt"])) ||
    typeof data["updatedAt"] !== "string" ||
    !Number.isFinite(Date.parse(data["updatedAt"]))
  )
    throw new RagError("storage", "Invalid multi-query resume journal.");
  const summaryFields = [
    "returnedCandidateSlots",
    "uniquePmids",
    "alreadyKnownPmids",
    "newlyDiscoveredPmids",
    "duplicateCandidateSlots",
    "normalized",
    "queryErrors",
    "pmidErrors",
  ];
  const savedSummary = data["summary"];
  if (
    !summaryFields.every(
      (field) =>
        typeof savedSummary[field] === "number" &&
        Number.isInteger(savedSummary[field]) &&
        savedSummary[field] >= 0,
    )
  )
    throw new RagError("storage", "Invalid run summary.");
  const countFields = [
    "requested",
    "newArticles",
    "existingArticles",
    "abstractsRetrieved",
    "pmcIdsFound",
    "reusableFullText",
    "fullTextSkippedForLicensing",
    "fullTextUnavailable",
    "normalizedWritten",
    "errors",
  ];
  for (const summary of data["ingestionRuns"] as unknown[]) {
    if (
      !object(summary) ||
      typeof summary["runId"] !== "string" ||
      !countFields.every(
        (field) =>
          typeof summary[field] === "number" &&
          Number.isInteger(summary[field]) &&
          summary[field] >= 0,
      )
    )
      throw new RagError("storage", "Invalid ingestion journal.");
  }
  data["knownBeforeRun"].forEach(pmid);
  for (const [index, value] of data["queries"].entries()) {
    if (
      !object(value) ||
      value["queryId"] !== plan.queries[index]?.id ||
      !["pending", "completed", "error"].includes(String(value["status"])) ||
      !strings(value["pmids"]) ||
      (value["discoveryRunId"] !== null &&
        typeof value["discoveryRunId"] !== "string") ||
      (value["executedAt"] !== null &&
        (typeof value["executedAt"] !== "string" ||
          !Number.isFinite(Date.parse(value["executedAt"])))) ||
      (value["error"] !== null && typeof value["error"] !== "string") ||
      new Set(value["pmids"]).size !== value["pmids"].length ||
      value["pmids"].length > plan.queries[index]!.limit ||
      (value["status"] === "completed" &&
        (typeof value["discoveryRunId"] !== "string" ||
          typeof value["executedAt"] !== "string" ||
          typeof value["totalMatches"] !== "number" ||
          !Number.isInteger(value["totalMatches"]) ||
          value["totalMatches"] < value["pmids"].length))
    )
      throw new RagError("storage", "Invalid query resume journal.");
    value["pmids"].forEach(pmid);
  }
}

export async function discoverAll(
  config: Config,
  store: LocalStore,
  options: DiscoveryOptions,
  suppliedClient?: PubmedClient,
): Promise<DiscoveryPlan | MultiQueryRun> {
  const plan = discoveryPlan(config, options);
  // The execution boundary precedes client construction, locks and data writes.
  if (!options.execute) return plan;
  const client = suppliedClient ?? new PubmedClient(config);
  return store.locked(async () => {
    const pointerPath = `discovery-runs/multi-query-progress-${plan.fingerprint}.json`;
    const pointer = await store.json(pointerPath);
    let previous: MultiQueryRun | null = null;
    if (pointer !== null) {
      if (
        !object(pointer) ||
        typeof pointer["runId"] !== "string" ||
        !/^multi-query-[\dTZ-]+-[a-f0-9-]{36}$/.test(pointer["runId"])
      )
        throw new RagError("storage", "Invalid multi-query progress pointer.");
      const saved = await store.json(`discovery-runs/${pointer["runId"]}.json`);
      assertResumeRun(saved, plan);
      previous = saved;
    }
    const catalog = await store.catalog();
    const now = new Date().toISOString();
    const run: MultiQueryRun =
      previous && previous.status !== "completed"
        ? previous
        : {
            schemaVersion: 1,
            runId: `multi-query-${now.replace(/[:.]/g, "-")}-${randomUUID()}`,
            createdAt: now,
            updatedAt: now,
            status: "running",
            plan,
            knownBeforeRun: Object.keys(catalog.articles).sort(),
            queries: plan.queries.map((query) => ({
              queryId: query.id,
              status: "pending",
              discoveryRunId: null,
              executedAt: null,
              totalMatches: null,
              pmids: [],
              alreadyKnownPmids: 0,
              newlyDiscoveredPmids: 0,
              duplicatePmidsAcrossQueries: 0,
              error: null,
            })),
            ingestionRuns: [],
            articles: [],
            summary: {
              returnedCandidateSlots: 0,
              uniquePmids: 0,
              alreadyKnownPmids: 0,
              newlyDiscoveredPmids: 0,
              duplicateCandidateSlots: 0,
              normalized: 0,
              queryErrors: 0,
              pmidErrors: 0,
            },
            fatalError: null,
            nextSteps: ["npm run rag:prepare", "npm run rag:corpus-report"],
          };
    run.status = "running";
    run.fatalError = null;
    async function checkpoint(): Promise<void> {
      const current = await store.catalog();
      const baseline = new Set(run.knownBeforeRun);
      const relationships = new Map<
        string,
        { queryId: string; topics: string[] }[]
      >();
      let slots = 0;
      for (const [index, query] of run.queries.entries()) {
        query.alreadyKnownPmids = query.pmids.filter((id) =>
          baseline.has(id),
        ).length;
        query.newlyDiscoveredPmids =
          query.pmids.length - query.alreadyKnownPmids;
        query.duplicatePmidsAcrossQueries = query.pmids.filter((id) =>
          relationships.has(id),
        ).length;
        slots += query.pmids.length;
        for (const id of query.pmids)
          relationships.set(id, [
            ...(relationships.get(id) ?? []),
            { queryId: query.queryId, topics: plan.queries[index]!.topics },
          ]);
      }
      run.articles = [...relationships]
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([id, discoveredBy]) => ({
          pmid: id,
          discoveredBy,
          status: current.articles[id]?.status ?? "discovered",
          error: current.articles[id]?.errorCategory ?? null,
        }));
      const known = run.articles.filter((article) =>
        baseline.has(article.pmid),
      ).length;
      run.summary = {
        returnedCandidateSlots: slots,
        uniquePmids: run.articles.length,
        alreadyKnownPmids: known,
        newlyDiscoveredPmids: run.articles.length - known,
        duplicateCandidateSlots: slots - run.articles.length,
        normalized: run.articles.filter(
          (article) => article.status === "normalized",
        ).length,
        queryErrors: run.queries.filter((query) => query.status === "error")
          .length,
        pmidErrors: run.articles.filter((article) => article.status === "error")
          .length,
      };
      run.updatedAt = new Date().toISOString();
      await store.writeJson(`discovery-runs/${run.runId}.json`, run, true);
      await store.writeJson(pointerPath, { runId: run.runId }, true);
    }
    await checkpoint();
    try {
      for (const [index, query] of run.queries.entries()) {
        if (query.status === "completed") continue;
        try {
          const result = await discover(
            client,
            store,
            plan.queries[index]!,
            config,
          );
          Object.assign(query, {
            status: "completed",
            discoveryRunId: result.runId,
            executedAt: result.executedAt,
            totalMatches: result.totalMatches,
            pmids: result.pmids,
            error: null,
          });
        } catch (error) {
          const failure = category(error);
          if (["configuration", "storage", "internal"].includes(failure))
            throw error;
          query.status = "error";
          query.error = failure;
          log({
            runId: run.runId,
            queryId: query.queryId,
            status: "query-error",
            category: failure,
          });
        }
        await checkpoint();
      }
      const current = await store.catalog();
      const pending = run.articles
        .map((article) => article.pmid)
        .filter((id) => current.articles[id]?.status !== "normalized");
      for (
        let offset = 0;
        offset < pending.length;
        offset += config.batchSize
      ) {
        const batch = pending.slice(offset, offset + config.batchSize);
        run.ingestionRuns.push(await ingest(client, store, config, batch));
        await checkpoint();
      }
      run.status =
        run.summary.queryErrors || run.summary.pmidErrors
          ? "partial"
          : "completed";
      await checkpoint();
      log({
        runId: run.runId,
        status: run.status,
        count: run.summary.uniquePmids,
      });
      return run;
    } catch (error) {
      run.status = "fatal";
      run.fatalError = category(error);
      await checkpoint();
      throw error;
    }
  });
}
