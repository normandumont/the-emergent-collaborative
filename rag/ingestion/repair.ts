import { readdir } from "node:fs/promises";
import type { Config } from "../shared/config.js";
import { object } from "../shared/config.js";
import { type LocalStore } from "../shared/storage.js";
import { category, RagError, StorageError, log } from "../shared/logging.js";
import { EUTILS_BASE } from "../shared/constants.js";
import { PubmedClient } from "../discovery/pubmed-client.js";
import { deduplicate } from "../discovery/deduplicate.js";
import { fetchPubmed, parsePubmedBatch } from "./fetch-pubmed.js";
import { fetchPmc } from "./fetch-pmc.js";
import { ingest } from "./ingest.js";

export interface RepairOptions {
  mode: "help" | "cached-only" | "retry-acquisition";
  normalizeCached: boolean;
}

export function repairOptions(args: string[]): RepairOptions {
  if (args.includes("--help") || args.includes("-h"))
    return { mode: "help", normalizeCached: false };
  const allowed = [
    "--cached-only",
    "--retry-acquisition",
    "--normalize-cached",
  ];
  if (
    new Set(args).size !== args.length ||
    args.some((arg) => !allowed.includes(arg))
  )
    throw new RagError(
      "configuration",
      "Unknown or repeated repair flag. Use --help.",
    );
  if (
    args.includes("--retry-acquisition") &&
    (args.includes("--cached-only") || args.includes("--normalize-cached"))
  )
    throw new RagError(
      "configuration",
      "Acquisition retry cannot be combined with cached repair/normalization.",
    );
  return {
    mode: args.includes("--retry-acquisition")
      ? "retry-acquisition"
      : "cached-only",
    normalizeCached: args.includes("--normalize-cached"),
  };
}

export const repairUsage = `Usage: npm --prefix rag run repair -- [mode] [options]
       npm run rag:repair -- [mode] [options]

  --help, -h              Print help; no configuration, data writes or network.
  --cached-only           Repair verified cached references (default; no network).
  --normalize-cached      Also normalize cache-complete unresolved records.
                         Valid only in cached-only mode; legacy standalone use retained.
  --retry-acquisition     Explicitly authorize targeted missing PMC downloads only.
                         Targets technical acquisition errors, never healthy records.
                         Reuses verified PubMed caches; no discovery or EFetch.

Retry stops after acquisition: no normalization, preparation, indexing or deployment.
Then run:
  npm --prefix rag run repair -- --cached-only --normalize-cached
  npm --prefix rag run prepare
  npm --prefix rag run corpus-report

Existing license/provenance checks and NCBI rate/retry/timeout limits remain enforced.
Missing front matter can authorize an additional full-text download only after
the existing license check. PMC attempts beyond 100 require off-peak execution.
No repair mode imports or calls OpenAI/vector services.`;

export async function repairCachedIngestion(
  store: LocalStore,
  config: Config,
  normalizeCached = false,
) {
  const catalog = await store.catalog();
  const unresolved = Object.values(catalog.articles).filter(
    (entry) => entry.status === "error" || entry.status === "discovered",
  );
  const orphaned = new Set<string>();
  for (const entry of unresolved)
    if ((await store.read(`raw/pubmed/${entry.pmid}.json`)) === null)
      orphaned.add(entry.pmid);
  const restored: string[] = [];
  const issues: { pmid: string | null; category: string; reference: string }[] =
    [];
  let batches: string[] = [];
  try {
    batches = (await readdir(store.resolve("raw/pubmed/batches")))
      .filter((file) => file.endsWith(".xml"))
      .sort();
  } catch (error) {
    if (!object(error) || error["code"] !== "ENOENT") throw error;
  }
  for (const batch of batches) {
    if (!orphaned.size) break;
    const reference = `raw/pubmed/batches/${batch}`;
    const metadata = await store.json(`${reference}.provenance.json`);
    if (
      !object(metadata) ||
      metadata["api"] !== "pubmed-efetch" ||
      metadata["rawPath"] !== reference ||
      typeof metadata["url"] !== "string" ||
      !metadata["url"].startsWith(`${EUTILS_BASE}efetch.fcgi?db=pubmed&`)
    )
      throw new StorageError(
        "provenance-file-missing",
        `${reference}.provenance.json`,
        "Cached batch requires its original verified provenance; repair does not fabricate it.",
      );
    const url = new URL(metadata["url"]);
    if (url.searchParams.has("api_key"))
      throw new RagError(
        "storage",
        "Unsafe credential-bearing source reference.",
      );
    const ids = deduplicate((url.searchParams.get("id") ?? "").split(","));
    const targets = ids.filter((id) => orphaned.has(id));
    if (!targets.length) continue;
    const raw = await store.read(reference);
    if (raw === null)
      throw new StorageError(
        "raw-source-missing",
        reference,
        "Cached batch is missing.",
      );
    const provenance = await store.raw(
      reference,
      raw,
      "pubmed-efetch",
      metadata["url"],
      false,
    );
    let parsed: ReturnType<typeof parsePubmedBatch>;
    try {
      parsed = parsePubmedBatch(raw);
    } catch (error) {
      issues.push({ pmid: null, category: category(error), reference });
      log({
        status: "cached-batch-repair-error",
        category: category(error),
        reference,
      });
      continue;
    }
    if (
      [...parsed.records.keys(), ...parsed.failures.keys()].some(
        (id) => !ids.includes(id),
      )
    )
      throw new StorageError(
        "record-schema-mismatch",
        reference,
        "Cached response contains a PMID outside its original request.",
      );
    for (const id of targets) {
      if (!parsed.records.has(id)) {
        issues.push({ pmid: id, category: "malformed-source", reference });
        continue;
      }
      await store.writeJson(`raw/pubmed/${id}.json`, provenance);
      orphaned.delete(id);
      restored.push(id);
    }
  }
  let normalizedWritten = 0;
  const deferred: {
    pmid: string;
    acquisitionCategory: string | null;
    failureCode: string;
    reference: string;
  }[] = [];
  if (normalizeCached) {
    const client = new PubmedClient(config, async () => {
      throw new StorageError(
        "raw-source-missing",
        "cache-only-repair",
        "Network is not permitted during cached repair.",
      );
    });
    const ready: string[] = [];
    for (const entry of unresolved) {
      try {
        const records = await fetchPubmed(
          client,
          store,
          [entry.pmid],
          "cache-repair",
          config.batchSize,
          false,
          { cacheOnly: true },
        );
        const record = records.get(entry.pmid);
        if (!record)
          throw new StorageError(
            "record-schema-mismatch",
            `raw/pubmed/${entry.pmid}.json`,
            "Cached PubMed record is unavailable.",
          );
        await fetchPmc(
          client,
          store,
          record.record.pmcid,
          entry.pmid,
          false,
          true,
        );
        ready.push(entry.pmid);
      } catch (error) {
        const diagnostic =
          error instanceof StorageError
            ? error
            : new StorageError(
                "record-schema-mismatch",
                `raw/pubmed/${entry.pmid}.json`,
                "Cached acquisition requires repair or a separate network retry.",
              );
        deferred.push({
          pmid: entry.pmid,
          acquisitionCategory: entry.errorCategory,
          failureCode: diagnostic.failureCode,
          reference: diagnostic.reference,
        });
        log({
          pmid: entry.pmid,
          status: "cached-repair-deferred",
          category: category(error),
          failureCode: diagnostic.failureCode,
          reference: diagnostic.reference,
          description: diagnostic.message,
        });
      }
    }
    if (ready.length) {
      const result = await ingest(client, store, config, ready);
      normalizedWritten = result.normalizedWritten;
      if (result.errors)
        issues.push({
          pmid: null,
          category: "cached-normalization-error",
          reference: `ingestion-runs/${result.runId}.json`,
        });
    }
  }
  const report = {
    networkAllowed: false,
    unresolvedAtStart: unresolved.length,
    restoredReferences: restored.sort(),
    normalizedWritten,
    missingSourceReferences: [...orphaned].sort(),
    deferred,
    issues,
  };
  await store.writeJson("reports/cache-repair-latest.json", report, true);
  return report;
}
