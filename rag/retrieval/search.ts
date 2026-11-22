import { category, log } from "../shared/logging.js";
import { loadCorpusConfig } from "../corpus/config.js";
import type { LocalStore } from "../shared/storage.js";
import {
  indexingManifest,
  unchangedManifest,
  verifyDocument,
} from "../indexing/manifest-input.js";
import {
  indexable,
  fingerprint,
  fileAttributes,
  sameAttributes,
} from "../indexing/metadata.js";
import { readState, currentStore, selectedId } from "../indexing/state.js";
import type { VectorApi } from "../indexing/openai-client.js";
import { matchesFilters } from "./filters.js";
import {
  retrieveResearch,
  validateSearchInput,
  type SearchOptions,
} from "./pipeline.js";
export { DEFAULT_CANDIDATE_LIMIT, type SearchOptions } from "./pipeline.js";

export async function searchVector(
  api: Pick<VectorApi, "search">,
  store: LocalStore,
  query: string,
  options: SearchOptions = {},
  env: NodeJS.ProcessEnv = process.env,
) {
  validateSearchInput(query, options);
  const { manifest, manifestHash } = await indexingManifest(store);
  const state = await readState(store);
  const target = currentStore(state, selectedId(state, env));
  const taxonomy = (await loadCorpusConfig()).topics;
  const verified = new Map<string, { title: string | null } | null>();
  return retrieveResearch(
    {
      taxonomy,
      search: (request) => api.search(target.id, request),
      unchanged: () => unchangedManifest(store, manifestHash),
      identity: (hit) => {
        const reported = hit.attributes?.["pmid"];
        return (
          target.files.find((file) => file.fileId === hit.fileId)?.pmid ??
          (typeof reported === "string" && /^[1-9]\d{0,8}$/.test(reported)
            ? reported
            : null)
        );
      },
      resolve: async (hit, filters, threshold) => {
        const receipt = target.files.find((file) => file.fileId === hit.fileId);
        if (!receipt || receipt.status !== "indexed")
          return { reason: "unknown-or-unindexed" };
        const entry = manifest.entries.find(
          (item) => item.pmid === receipt.pmid,
        );
        if (!entry || !indexable(entry))
          return {
            reason: entry?.retracted ? "retracted" : "retrieval-disabled",
          };
        if (
          receipt.fingerprint !== fingerprint(entry) ||
          !sameAttributes(hit.attributes, fileAttributes(entry))
        )
          return { reason: "stale-metadata-or-hash" };
        if (
          !Number.isFinite(hit.score) ||
          hit.score < threshold ||
          hit.score > 1 ||
          !matchesFilters(entry, filters)
        )
          return { reason: "filter" };
        if (!verified.has(entry.pmid)) {
          try {
            verified.set(entry.pmid, await verifyDocument(store, entry));
          } catch (error) {
            log({
              pmid: entry.pmid,
              status: "vector-search-source-verification-failed",
              category: category(error),
            });
            verified.set(entry.pmid, null);
          }
        }
        const document = verified.get(entry.pmid);
        if (!document) return { reason: "source-verification" };
        return {
          candidate: {
            pmid: entry.pmid,
            title: document.title,
            metadata: {
              year: entry.year,
              studyType: entry.studyType,
              studyDesignTier: entry.studyDesignTier,
              population: entry.population,
              contentScope: entry.contentScope,
              license: entry.license,
              retracted: entry.retracted,
              topics: entry.topics,
              retrievalEnabled: entry.retrievalEnabled,
              warnings: entry.warnings,
              corrected: entry.corrected,
              superseded: entry.superseded,
              status: entry.status,
            },
            chunk: {
              score: hit.score,
              text: hit.content.join("\n\n"),
              filename: hit.filename,
              fileId: hit.fileId,
            },
          },
        };
      },
    },
    query,
    options,
  );
}
