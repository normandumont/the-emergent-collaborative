import type { Config } from "../shared/config.js";
import { object } from "../shared/config.js";
import type { PubmedClient } from "../discovery/pubmed-client.js";
import { deduplicate } from "../discovery/deduplicate.js";
import { category, log, RagError } from "../shared/logging.js";
import { runId, type LocalStore } from "../shared/storage.js";
import { fetchPubmed } from "./fetch-pubmed.js";
import { fetchPmc } from "./fetch-pmc.js";
import { normalize } from "./normalize.js";

export interface IngestionSummary {
  runId: string;
  requested: number;
  newArticles: number;
  existingArticles: number;
  abstractsRetrieved: number;
  pmcIdsFound: number;
  reusableFullText: number;
  fullTextSkippedForLicensing: number;
  fullTextUnavailable: number;
  normalizedWritten: number;
  errors: number;
}

export async function ingest(
  client: PubmedClient,
  store: LocalStore,
  config: Config,
  ids: string[],
  refresh = false,
): Promise<IngestionSummary> {
  const requested = deduplicate(ids);
  const catalog = await store.catalog();
  const summary: IngestionSummary = {
    runId: runId(),
    requested: requested.length,
    newArticles: 0,
    existingArticles: 0,
    abstractsRetrieved: 0,
    pmcIdsFound: 0,
    reusableFullText: 0,
    fullTextSkippedForLicensing: 0,
    fullTextUnavailable: 0,
    normalizedWritten: 0,
    errors: 0,
  };
  const pending: string[] = [];
  for (const pmid of requested) {
    if (!refresh && catalog.articles[pmid]?.status === "normalized") {
      const normalized = await store.json(`normalized/${pmid}.json`);
      if (
        !object(normalized) ||
        !object(normalized["identity"]) ||
        normalized["identity"]["pmid"] !== pmid ||
        normalized["schemaVersion"] !== 1 ||
        !object(normalized["status"]) ||
        normalized["status"]["normalized"] !== true
      )
        throw new RagError(
          "storage",
          "Normalized catalog entry lacks a valid article file.",
        );
      summary.existingArticles++;
    } else {
      pending.push(pmid);
      summary.newArticles++;
    }
  }
  function error(pmid: string, failure: unknown): void {
    summary.errors++;
    const now = new Date().toISOString();
    const entry = catalog.articles[pmid];
    catalog.articles[pmid] = {
      pmid,
      queryIds: entry?.queryIds ?? [],
      topics: entry?.topics ?? [],
      firstDiscoveredAt: entry?.firstDiscoveredAt ?? now,
      lastDiscoveredAt: entry?.lastDiscoveredAt ?? now,
      status: "error",
      lastIngestedAt: entry?.lastIngestedAt ?? null,
      errorCategory: category(failure),
    };
    log({
      runId: summary.runId,
      pmid,
      status: "ingestion-error",
      category: category(failure),
    });
  }
  for (let offset = 0; offset < pending.length; offset += config.batchSize) {
    const batch = pending.slice(offset, offset + config.batchSize);
    let records;
    try {
      records = await fetchPubmed(
        client,
        store,
        batch,
        `${summary.runId}-${offset}`,
        config.batchSize,
        refresh,
      );
    } catch (failure) {
      for (const pmid of batch) error(pmid, failure);
      await store.saveCatalog(catalog);
      continue;
    }
    for (const pmid of batch) {
      try {
        const pubmed = records.get(pmid);
        if (!pubmed)
          throw new RagError(
            "missing-record",
            "PubMed omitted a requested PMID.",
          );
        const pmc = await fetchPmc(
          client,
          store,
          pubmed.record.pmcid,
          pmid,
          refresh,
        );
        const entry = catalog.articles[pmid];
        const article = normalize(
          pubmed,
          pmc,
          config.rules,
          entry?.topics ?? [],
          entry?.queryIds ?? [],
        );
        await store.writeJson(`normalized/${pmid}.json`, article, true);
        const now = new Date().toISOString();
        catalog.articles[pmid] = {
          pmid,
          queryIds: article.source.queryIds,
          topics: article.classification.topics,
          firstDiscoveredAt: entry?.firstDiscoveredAt ?? now,
          lastDiscoveredAt: entry?.lastDiscoveredAt ?? now,
          lastIngestedAt: now,
          status: "normalized",
          errorCategory: null,
        };
        summary.normalizedWritten++;
        if (article.status.hasAbstract) summary.abstractsRetrieved++;
        if (article.identity.pmcid) summary.pmcIdsFound++;
        if (article.status.hasFullText) summary.reusableFullText++;
        if (article.identity.pmcid && !article.source.reuseAllowed) {
          if (
            [
              "not-in-pmc-open-dataset",
              "missing-explicit-license-url",
              "unsupported-or-conflicting-license",
              "full-text-license-mismatch",
            ].includes(pmc.reason ?? "")
          )
            summary.fullTextSkippedForLicensing++;
          else summary.fullTextUnavailable++;
        }
        if (
          article.identity.pmcid &&
          article.source.reuseAllowed &&
          !article.status.hasFullText
        )
          summary.fullTextUnavailable++;
        log({ runId: summary.runId, pmid, status: "normalized" });
      } catch (failure) {
        error(pmid, failure);
      }
      await store.saveCatalog(catalog);
    }
  }
  await store.writeJson(`ingestion-runs/${summary.runId}.json`, summary);
  return summary;
}
