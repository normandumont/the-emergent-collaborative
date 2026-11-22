import { RagError, category } from "../shared/logging.js";
import { LocalStore } from "../shared/storage.js";
import {
  OpenAIVectorApi,
  sdkClient,
  type VectorApi,
} from "../indexing/openai-client.js";
import {
  createVectorStore,
  deleteDevelopmentStore,
} from "../indexing/vector-store.js";
import { synchronize, vectorStatus } from "../indexing/reconcile.js";
import {
  DEFAULT_CANDIDATE_LIMIT,
  searchVector,
  type SearchOptions,
} from "../retrieval/search.js";
import { evaluateRetrieval } from "../evaluation/evaluate.js";
import { writeReports } from "../evaluation/reports.js";
import { evaluateDiagnostics } from "../evaluation/diagnostics.js";
import { writeDiagnosticReports } from "../evaluation/diagnostic-reports.js";

type Command = "create" | "sync" | "search" | "status" | "eval" | "delete";
const definitions: Record<
  Command,
  { booleans: string[]; values: string[]; usage: string }
> = {
  create: {
    booleans: ["force-new", "smoke-test"],
    values: ["expires-days"],
    usage: "rag:vector:create [--force-new] [--expires-days 7] [--smoke-test]",
  },
  sync: {
    booleans: ["allow-large-sync"],
    values: ["batch-size"],
    usage: "rag:vector:sync [--batch-size 10] [--allow-large-sync]",
  },
  search: {
    booleans: ["human-only", "no-rewrite", "rewrite-query", "debug-ranking"],
    values: [
      "year-from",
      "year-to",
      "study-type",
      "max-tier",
      "topic",
      "max-results",
      "score-threshold",
      "papers",
      "chunks-per-paper",
      "candidate-limit",
    ],
    usage: `rag:search-vector -- "research query" [--papers 5] [--chunks-per-paper 2] [--candidate-limit ${DEFAULT_CANDIDATE_LIMIT}] [--debug-ranking] [--human-only] [--year-from N] [--year-to N] [--study-type TYPE] [--max-tier N] [--topic TOPIC] [--max-results N (legacy papers alias)] [--score-threshold 0] [--no-rewrite]`,
  },
  status: { booleans: [], values: [], usage: "rag:vector:status" },
  eval: {
    booleans: ["gold", "diagnostics"],
    values: ["candidate-depths"],
    usage: "rag:eval [--gold] [--diagnostics [--candidate-depths 30,50,100]]",
  },
  delete: {
    booleans: [],
    values: ["confirm"],
    usage: "rag:vector:delete -- --confirm vs_EXACT_DEVELOPMENT_STORE_ID",
  },
};
export function vectorArguments(command: Command, args: string[]) {
  const flags = new Map<string, string | boolean>();
  const positional: string[] = [];
  let literal = false;
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === undefined)
      throw new RagError("configuration", "Missing command argument.");
    if (argument === "--") {
      literal = true;
      continue;
    }
    if (literal || !argument.startsWith("--")) {
      positional.push(argument);
      continue;
    }
    const split = argument.indexOf("=");
    const key = argument.slice(2, split === -1 ? undefined : split);
    if (flags.has(key))
      throw new RagError("configuration", "Duplicate command option.");
    if (key === "help" || definitions[command].booleans.includes(key)) {
      if (split !== -1)
        throw new RagError(
          "configuration",
          "Boolean options do not accept values.",
        );
      flags.set(key, true);
    } else if (definitions[command].values.includes(key)) {
      const value = split === -1 ? args[++index] : argument.slice(split + 1);
      if (!value || value.startsWith("--"))
        throw new RagError("configuration", "Command option requires a value.");
      flags.set(key, value);
    } else
      throw new RagError(
        "configuration",
        "Unknown vector command option; use --help.",
      );
  }
  if (command !== "search" && positional.length)
    throw new RagError("configuration", "Unexpected positional argument.");
  if (flags.has("no-rewrite") && flags.has("rewrite-query"))
    throw new RagError(
      "configuration",
      "Choose either --no-rewrite or --rewrite-query.",
    );
  if (command === "eval") {
    if (flags.has("diagnostics") && !flags.has("gold"))
      throw new RagError("configuration", "Diagnostics require --gold.");
    if (flags.has("candidate-depths") && !flags.has("diagnostics"))
      throw new RagError(
        "configuration",
        "Candidate depths require --gold --diagnostics.",
      );
    const depths = flags.get("candidate-depths");
    if (
      typeof depths === "string" &&
      (!/^(30|50|100)(,(30|50|100))*$/.test(depths) ||
        new Set(depths.split(",")).size !== depths.split(",").length)
    )
      throw new RagError(
        "configuration",
        "Diagnostic depths must be distinct values from 30,50,100.",
      );
  }
  return { flags, query: positional.join(" ") };
}
function numeric(
  flags: Map<string, string | boolean>,
  key: string,
  integer = true,
): number | undefined {
  const value = flags.get(key);
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !/^\d+(\.\d+)?$/.test(value))
    throw new RagError(
      "configuration",
      "Numeric options require nonnegative numbers.",
    );
  const number = Number(value);
  if (!Number.isFinite(number) || (integer && !Number.isInteger(number)))
    throw new RagError("configuration", "Invalid numeric option.");
  return number;
}
export async function executeVectorCommand(
  command: Command,
  args: string[],
  api: VectorApi,
  store: LocalStore,
  env: NodeJS.ProcessEnv = process.env,
): Promise<unknown> {
  const { flags, query } = vectorArguments(command, args);
  if (command === "create") {
    const expiresDays = numeric(flags, "expires-days");
    const remote = await createVectorStore(
      api,
      store,
      {
        forceNew: flags.has("force-new"),
        smokeTest: flags.has("smoke-test"),
        ...(expiresDays === undefined ? {} : { expiresDays }),
      },
      env,
    );
    return {
      id: remote.id,
      name: remote.name,
      createdAt: new Date(remote.createdAt * 1000).toISOString(),
      expiration:
        "last_active_at; requested policy applies only to newly created stores",
      configuredOverride:
        env["OPENAI_RAG_VECTOR_STORE_ID"] &&
        env["OPENAI_RAG_VECTOR_STORE_ID"] !== remote.id
          ? env["OPENAI_RAG_VECTOR_STORE_ID"]
          : null,
    };
  }
  if (command === "sync") {
    const batchSize = numeric(flags, "batch-size");
    const summary = await synchronize(
      api,
      store,
      {
        allowLargeSync: flags.has("allow-large-sync"),
        ...(batchSize === undefined ? {} : { batchSize }),
      },
      env,
    );
    if (summary.errors || summary.pending) process.exitCode = 1;
    return summary;
  }
  if (command === "status") {
    const status = await vectorStatus(api, store, env);
    return {
      "Vector store": status.name,
      ID: status.id,
      "Files indexed": status.filesIndexed,
      Pending: status.pending,
      Failed: status.failed,
      "Retrieval disabled": status.retrievalDisabled,
      "Retracted removed": status.retractedRemoved,
      "Manifest mismatches": status.manifestMismatches,
      "Last sync": status.lastSync,
      "Synchronized manifest": status.synchronizedManifest,
      "Unknown remote files": status.unknownRemote,
      "Usage bytes": status.usageBytes,
      "Pending batch": status.pendingBatch,
      "File failures": status.failures,
    };
  }
  if (command === "delete") {
    const confirm = flags.get("confirm");
    if (typeof confirm !== "string")
      throw new RagError(
        "configuration",
        "Deletion requires --confirm with the exact development store ID.",
      );
    await deleteDevelopmentStore(api, store, confirm, env);
    return {
      deleted: confirm,
      notice:
        "Underlying uploaded Files objects remain. Delete only confirmed workspace file IDs separately if no longer used.",
    };
  }
  if (command === "eval") {
    if (flags.has("diagnostics")) {
      const value = flags.get("candidate-depths");
      const depths =
        typeof value === "string" ? value.split(",").map(Number) : [50];
      const report = await evaluateDiagnostics(api, store, env, depths);
      await writeDiagnosticReports(store, report);
      return {
        goldStatus: report.goldStatus,
        depths: report.depths.map(
          ({ candidateLimit, status, reason, summary }) => ({
            candidateLimit,
            status,
            ...(reason ? { reason } : {}),
            ...(summary ? { summary } : {}),
          }),
        ),
        safetyConflicts: report.safetyConflicts,
        recommendedBottleneck: report.recommendedBottleneck,
        reports: [
          "rag/data/evaluation/gold-diagnostics-latest.json",
          "rag/data/evaluation/gold-diagnostics-latest.md",
        ],
      };
    }
    const report = await evaluateRetrieval(
      api,
      store,
      env,
      flags.has("gold") ? "gold" : "heuristic",
    );
    await writeReports(store, report);
    return {
      questions: report.questions.length,
      ...(report.gold ? { gold: report.gold } : {}),
      summary: report.summary,
      reports: [
        `rag/data/evaluation/${report.gold ? "gold-latest" : "latest"}.json`,
        `rag/data/evaluation/${report.gold ? "gold-latest" : "latest"}.md`,
      ],
    };
  }
  const options: SearchOptions = {
    humanOnly: flags.has("human-only"),
    rewriteQuery: !flags.has("no-rewrite"),
    debugRanking: flags.has("debug-ranking"),
  };
  for (const [flag, key] of [
    ["year-from", "yearFrom"],
    ["year-to", "yearTo"],
    ["max-tier", "maxTier"],
    ["max-results", "maxResults"],
    ["score-threshold", "scoreThreshold"],
    ["papers", "papers"],
    ["chunks-per-paper", "chunksPerPaper"],
    ["candidate-limit", "candidateLimit"],
  ] as const) {
    const value = numeric(flags, flag, key !== "scoreThreshold");
    if (value !== undefined) options[key] = value;
  }
  const study = flags.get("study-type"),
    topic = flags.get("topic");
  if (typeof study === "string") options.studyType = study;
  if (typeof topic === "string") options.topic = topic;
  return searchVector(api, store, query, options, env);
}
export function redactedOutput(value: string, env: NodeJS.ProcessEnv): string {
  const secret = env["OPENAI_API_KEY"]?.trim();
  return secret ? value.split(secret).join("[REDACTED]") : value;
}
export async function vectorMain(command: Command): Promise<void> {
  try {
    const args = process.argv.slice(2);
    if (vectorArguments(command, args).flags.has("help")) {
      console.log(`npm run ${definitions[command].usage}`);
      return;
    }
    const store = new LocalStore();
    const api = new OpenAIVectorApi(sdkClient());
    const result = await store.locked(() =>
      executeVectorCommand(command, args, api, store),
    );
    console.log(redactedOutput(JSON.stringify(result, null, 2), process.env));
  } catch (error) {
    console.error(
      redactedOutput(
        `Vector command failed [${category(error)}]. ${error instanceof RagError ? error.message : "Unexpected local error; no provider details logged."}`,
        process.env,
      ),
    );
    process.exitCode = 1;
  }
}
