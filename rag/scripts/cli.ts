import type { Config } from "../shared/config.js";
import { loadConfig } from "../shared/config.js";
import { MAX_RESULTS } from "../shared/constants.js";
import { category, log, RagError } from "../shared/logging.js";
import { LocalStore } from "../shared/storage.js";
import { PubmedClient } from "../discovery/pubmed-client.js";
import type { IngestionSummary } from "../ingestion/ingest.js";
import type { DiscoveryRun } from "../discovery/pubmed-search.js";

export function argumentsFor(
  mode: "search" | "ingest" | "ingest-query" | "status",
  args: string[],
): { positional: string[]; limit?: number; refresh: boolean } {
  const positional: string[] = [];
  let limit: number | undefined;
  let refresh = false;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (!arg) throw new RagError("configuration", "Empty CLI argument.");
    if (
      arg === "--limit" &&
      (mode === "search" || mode === "ingest-query") &&
      limit === undefined
    ) {
      const next = args[++index];
      if (!next || !/^[1-9]\d*$/.test(next))
        throw new RagError(
          "configuration",
          "Supply a positive integer after --limit.",
        );
      limit = Number(next);
    } else if (
      arg === "--refresh" &&
      (mode === "ingest" || mode === "ingest-query") &&
      !refresh
    )
      refresh = true;
    else if (arg.startsWith("--"))
      throw new RagError("configuration", "Unknown or repeated CLI option.");
    else positional.push(arg);
  }
  if (
    (mode === "status" && positional.length) ||
    ((mode === "search" || mode === "ingest-query") &&
      positional.length !== 1) ||
    (mode === "ingest" &&
      (positional.length < 1 || positional.length > MAX_RESULTS))
  )
    throw new RagError(
      "configuration",
      "Invalid command arguments; see rag/README.md.",
    );
  return { positional, refresh, ...(limit === undefined ? {} : { limit }) };
}

export async function main(
  operation: (
    config: Config,
    client: PubmedClient,
    store: LocalStore,
  ) => Promise<void>,
): Promise<void> {
  try {
    const config = await loadConfig();
    const client = new PubmedClient(config);
    const store = new LocalStore();
    await store.locked(() => operation(config, client, store));
  } catch (error) {
    log({ status: "run-failed", category: category(error) });
    if (error instanceof RagError) console.error(error.message);
    else
      console.error(
        "Local prototype failed; inspect configuration, permissions and data integrity.",
      );
    process.exitCode = 1;
  }
}

export function printSummary(
  summary: IngestionSummary,
  discovery?: DiscoveryRun,
): void {
  if (discovery)
    console.log(
      `Query: ${discovery.queryId}\nPubMed matches: ${discovery.totalMatches}`,
    );
  console.log(
    [
      `PMIDs requested: ${summary.requested}`,
      `New articles: ${summary.newArticles}`,
      `Existing articles: ${summary.existingArticles}`,
      `Abstracts retrieved: ${summary.abstractsRetrieved}`,
      `PMC IDs found: ${summary.pmcIdsFound}`,
      `Reusable PMC full text: ${summary.reusableFullText}`,
      `Full-text skipped for licensing: ${summary.fullTextSkippedForLicensing}`,
      `Full-text unavailable: ${summary.fullTextUnavailable}`,
      `Normalized articles written: ${summary.normalizedWritten}`,
      `Errors: ${summary.errors}`,
    ].join("\n"),
  );
  if (summary.errors) process.exitCode = 1;
}
