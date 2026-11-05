import type { Config, Query } from "../shared/config.js";
import { object, strings } from "../shared/config.js";
import type { PubmedClient } from "./pubmed-client.js";
import { deduplicate } from "./deduplicate.js";
import type { LocalStore } from "../shared/storage.js";
import { runId } from "../shared/storage.js";
import { RagError, log } from "../shared/logging.js";

export interface SearchResult {
  totalMatches: number;
  ids: string[];
  webEnv: string;
  queryKey: string;
}
export interface DiscoveryRun {
  runId: string;
  queryId: string;
  query: string;
  executedAt: string;
  totalMatches: number;
  retrievedPmids: number;
  newPmids: number;
  existingPmids: number;
  pmids: string[];
}

export function parseSearch(body: string): SearchResult {
  let data: unknown;
  try {
    data = JSON.parse(body) as unknown;
  } catch {
    throw new RagError("malformed-source", "Invalid ESearch JSON.");
  }
  if (!object(data) || !object(data["esearchresult"]))
    throw new RagError("malformed-source", "Missing ESearch result.");
  const result = data["esearchresult"];
  if (
    result["errorlist"] ||
    result["ERROR"] ||
    result["error"] ||
    typeof result["count"] !== "string" ||
    !/^\d+$/.test(result["count"]) ||
    !strings(result["idlist"]) ||
    typeof result["webenv"] !== "string" ||
    !result["webenv"] ||
    typeof result["querykey"] !== "string" ||
    !/^[1-9]\d*$/.test(result["querykey"])
  )
    throw new RagError("malformed-source", "Invalid ESearch history response.");
  const totalMatches = Number(result["count"]);
  if (!Number.isSafeInteger(totalMatches))
    throw new RagError("malformed-source", "Invalid PubMed match count.");
  return {
    totalMatches,
    ids: deduplicate(result["idlist"]),
    webEnv: result["webenv"],
    queryKey: result["querykey"],
  };
}

export async function discover(
  client: PubmedClient,
  store: LocalStore,
  query: Query & { limit: number },
  config: Config,
): Promise<DiscoveryRun> {
  const id = runId();
  const executedAt = new Date().toISOString();
  let history: SearchResult | null = null;
  let ids: string[] = [];
  let offset = 0;
  while (offset < query.limit) {
    const size = Math.min(config.batchSize, query.limit - offset);
    const parameters: Record<string, string> = {
      db: "pubmed",
      term: query.query,
      retmode: "json",
      usehistory: "y",
      retstart: String(offset),
      retmax: String(size),
      sort: "pub_date",
    };
    if (history) {
      parameters["term"] = `#${history.queryKey}`;
      parameters["WebEnv"] = history.webEnv;
    }
    const page = parseSearch(await client.eutils("esearch.fcgi", parameters));
    if (
      page.ids.length > size ||
      (history && page.totalMatches !== history.totalMatches)
    )
      throw new RagError("malformed-source", "ESearch paging is inconsistent.");
    history ??= page;
    ids = deduplicate([...ids, ...page.ids]);
    offset += page.ids.length;
    if (offset >= page.totalMatches) break;
    if (page.ids.length !== size)
      throw new RagError(
        "malformed-source",
        "ESearch returned an incomplete history page.",
      );
  }
  if (!history || ids.length !== Math.min(query.limit, history.totalMatches))
    throw new RagError(
      "malformed-source",
      "ESearch returned duplicate or missing PMIDs.",
    );
  const catalog = await store.catalog();
  const existing = ids.filter((pmid) => catalog.articles[pmid]).length;
  for (const pmid of ids) {
    const entry = catalog.articles[pmid];
    catalog.articles[pmid] = {
      pmid,
      firstDiscoveredAt: entry?.firstDiscoveredAt ?? executedAt,
      lastDiscoveredAt: executedAt,
      queryIds: [...new Set([...(entry?.queryIds ?? []), query.id])],
      topics: [...new Set([...(entry?.topics ?? []), ...query.topics])],
      status: entry?.status ?? "discovered",
      lastIngestedAt: entry?.lastIngestedAt ?? null,
      errorCategory: entry?.errorCategory ?? null,
    };
  }
  const result: DiscoveryRun = {
    runId: id,
    queryId: query.id,
    query: query.query,
    executedAt,
    totalMatches: history.totalMatches,
    retrievedPmids: ids.length,
    newPmids: ids.length - existing,
    existingPmids: existing,
    pmids: ids,
  };
  await store.writeJson(`discovery-runs/${id}.json`, result);
  await store.saveCatalog(catalog);
  log({
    runId: id,
    queryId: query.id,
    status: "discovered",
    count: ids.length,
  });
  return result;
}
