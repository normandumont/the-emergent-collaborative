import type { Config } from "../shared/config.js";
import { object } from "../shared/config.js";
import { type LocalStore, runId } from "../shared/storage.js";
import {
  category,
  log,
  StorageError,
  type ErrorCategory,
  type StorageFailure,
} from "../shared/logging.js";
import { PubmedClient } from "../discovery/pubmed-client.js";
import { fetchPubmed } from "./fetch-pubmed.js";
import { fetchPmc } from "./fetch-pmc.js";

interface RetryTarget {
  pmid: string;
  pmcid: string | null;
  frontMatterNeeded: boolean;
  fullTextNeeded: boolean;
  fullTextUndetermined: boolean;
  failure: {
    category: ErrorCategory;
    failureCode: StorageFailure | null;
    reference: string | null;
  } | null;
}

function failureDetail(error: unknown): NonNullable<RetryTarget["failure"]> {
  return {
    category: category(error),
    failureCode: error instanceof StorageError ? error.failureCode : null,
    reference: error instanceof StorageError ? error.reference : null,
  };
}

export async function planAcquisitionRetry(
  store: LocalStore,
  config: Config,
  onlyPmid?: string,
) {
  const catalog = await store.catalog();
  const technical = new Set([
    "network",
    "timeout",
    "throttled",
    "http",
    "malformed-source",
    "missing-record",
    "storage",
    "policy-limit",
  ]);
  const cacheClient = new PubmedClient(config, async () => {
    throw new StorageError(
      "raw-source-missing",
      "cache-only-retry-plan",
      "Retry planning never permits network access.",
    );
  });
  const targets: RetryTarget[] = [];
  let skippedNormalized = 0;
  for (const entry of Object.values(catalog.articles)
    .filter((entry) => onlyPmid === undefined || entry.pmid === onlyPmid)
    .sort((a, b) => Number(a.pmid) - Number(b.pmid))) {
    if (entry.status === "normalized") {
      skippedNormalized++;
      continue;
    }
    if (entry.status !== "error" || !technical.has(entry.errorCategory ?? ""))
      continue;
    const target: RetryTarget = {
      pmid: entry.pmid,
      pmcid: null,
      frontMatterNeeded: false,
      fullTextNeeded: false,
      fullTextUndetermined: false,
      failure: null,
    };
    try {
      const normalized = await store.json(`normalized/${entry.pmid}.json`);
      if (normalized !== null) {
        if (
          !object(normalized) ||
          normalized["schemaVersion"] !== 1 ||
          !object(normalized["identity"]) ||
          normalized["identity"]["pmid"] !== entry.pmid ||
          !object(normalized["status"]) ||
          normalized["status"]["normalized"] !== true
        )
          throw new StorageError(
            "record-schema-mismatch",
            `normalized/${entry.pmid}.json`,
            "Existing normalized data requires local review, not network replacement.",
          );
        skippedNormalized++;
        continue;
      }
      const records = await fetchPubmed(
        cacheClient,
        store,
        [entry.pmid],
        "retry-plan",
        config.batchSize,
        false,
        { cacheOnly: true },
      );
      const record = records.get(entry.pmid);
      if (!record)
        throw new StorageError(
          "record-schema-mismatch",
          `raw/pubmed/${entry.pmid}.json`,
          "Verified cached PubMed record is unavailable.",
        );
      const source = await store.read(record.provenance.rawPath);
      if (source === null)
        throw new StorageError(
          "raw-source-missing",
          record.provenance.rawPath,
          "Cached PubMed source is unavailable.",
        );
      await store.raw(
        record.provenance.rawPath,
        source,
        "pubmed-efetch",
        record.provenance.url,
        false,
      );
      target.pmcid = record.record.pmcid;
      try {
        await fetchPmc(
          cacheClient,
          store,
          target.pmcid,
          target.pmid,
          false,
          true,
        );
      } catch (error) {
        if (
          error instanceof StorageError &&
          error.failureCode === "raw-source-missing" &&
          target.pmcid
        ) {
          if ((await store.read(`${error.reference}.provenance.json`)) !== null)
            throw new StorageError(
              "record-schema-mismatch",
              `${error.reference}.provenance.json`,
              "Orphaned provenance requires local repair before downloading replacement data.",
            );
          if (error.reference === `raw/pmc/${target.pmcid}.metadata.xml`) {
            target.frontMatterNeeded = true;
            target.fullTextUndetermined = true;
          } else if (error.reference === `raw/pmc/${target.pmcid}.xml`)
            target.fullTextNeeded = true;
          else throw error;
        } else throw error;
      }
    } catch (error) {
      target.failure = failureDetail(error);
    }
    targets.push(target);
  }
  return {
    targetPmids: targets.length,
    skippedNormalized,
    frontMatterNeeded: targets.filter((target) => target.frontMatterNeeded)
      .length,
    fullTextNeeded: targets.filter((target) => target.fullTextNeeded).length,
    fullTextUndetermined: targets.filter(
      (target) => target.fullTextUndetermined,
    ).length,
    nothingNeeded: targets.filter(
      (target) =>
        !target.failure && !target.frontMatterNeeded && !target.fullTextNeeded,
    ).length,
    blocked: targets.filter((target) => target.failure).length,
    targets,
  };
}

export async function retryAcquisition(
  store: LocalStore,
  config: Config,
  suppliedClient?: PubmedClient,
) {
  const plan = await planAcquisitionRetry(store, config);
  const client = suppliedClient ?? new PubmedClient(config);
  const report: {
    mode: "retry-acquisition";
    runId: string;
    status: "running" | "completed" | "partial";
    artifactsOnly: true;
    targetPmids: number;
    skippedNormalized: number;
    frontMatterNeeded: number;
    fullTextNeeded: number;
    fullTextUndetermined: number;
    repaired: number;
    alreadyCached: number;
    remaining: number;
    throttled: number;
    timeouts: number;
    failed: number;
    outcomes: (RetryTarget & {
      status: "repaired" | "already-cached" | "failed";
    })[];
  } = {
    mode: "retry-acquisition",
    runId: `acquisition-retry-${runId()}`,
    status: "running",
    artifactsOnly: true,
    targetPmids: plan.targetPmids,
    skippedNormalized: plan.skippedNormalized,
    frontMatterNeeded: plan.frontMatterNeeded,
    fullTextNeeded: plan.fullTextNeeded,
    fullTextUndetermined: plan.fullTextUndetermined,
    repaired: 0,
    alreadyCached: 0,
    remaining: plan.targetPmids,
    throttled: 0,
    timeouts: 0,
    failed: 0,
    outcomes: [],
  };
  async function checkpoint() {
    report.remaining =
      report.targetPmids - report.repaired - report.alreadyCached;
    await store.writeJson(`ingestion-runs/${report.runId}.json`, report, true);
    await store.writeJson(
      "reports/acquisition-retry-latest.json",
      report,
      true,
    );
  }
  await checkpoint();
  for (const target of plan.targets) {
    let failure = target.failure;
    if (!failure && !target.frontMatterNeeded && !target.fullTextNeeded) {
      report.alreadyCached++;
      report.outcomes.push({
        ...target,
        status: "already-cached",
        failure: null,
      });
    } else {
      if (!failure) {
        try {
          await fetchPmc(client, store, target.pmcid, target.pmid, false);
          await fetchPmc(client, store, target.pmcid, target.pmid, false, true);
          report.repaired++;
          report.outcomes.push({
            ...target,
            status: "repaired",
            failure: null,
          });
        } catch (error) {
          failure = failureDetail(error);
        }
      }
      if (failure) {
        report.failed++;
        if (failure.category === "throttled") report.throttled++;
        if (failure.category === "timeout") report.timeouts++;
        report.outcomes.push({ ...target, status: "failed", failure });
        log({
          pmid: target.pmid,
          status: "acquisition-retry-failed",
          category: failure.category,
          ...(failure.failureCode ? { failureCode: failure.failureCode } : {}),
          ...(failure.reference ? { reference: failure.reference } : {}),
        });
      }
    }
    await checkpoint();
  }
  report.status = report.remaining ? "partial" : "completed";
  await checkpoint();
  return report;
}
