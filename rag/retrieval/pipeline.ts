import { RagError } from "../shared/logging.js";
import type { RemoteHit, SearchRequest } from "../indexing/openai-client.js";
import type { TopicRule } from "../corpus/schema.js";
import { remoteFilters, type Filters } from "./filters.js";
import type {
  CandidateTrace,
  PaperCandidate,
  RetrievalResponse,
} from "./result-schema.js";
import { classifyIntent, queryTopics } from "./intent.js";
import { diversify } from "./ranking.js";

export const DEFAULT_CANDIDATE_LIMIT = 50;
export interface SearchOptions extends Filters {
  maxResults?: number;
  papers?: number;
  chunksPerPaper?: number;
  candidateLimit?: number;
  debugRanking?: boolean;
  diagnostics?: boolean;
  rewriteQuery?: boolean;
  scoreThreshold?: number;
  signal?: AbortSignal;
}
export interface RetrievalSource {
  taxonomy: TopicRule[];
  search: (request: SearchRequest) => Promise<{
    hits: RemoteHit[];
    rewrittenQuery: string[];
    hasMore: boolean;
  }>;
  identity: (hit: RemoteHit) => string | null;
  resolve: (
    hit: RemoteHit,
    filters: Filters,
    threshold: number,
  ) => Promise<{ candidate: PaperCandidate } | { reason: string }>;
  unchanged: () => Promise<void>;
}
export function validateSearchInput(
  query: string,
  options: SearchOptions = {},
) {
  const papers = options.papers ?? options.maxResults ?? 5;
  const chunksPerPaper = options.chunksPerPaper ?? 2;
  const candidateLimit = options.candidateLimit ?? DEFAULT_CANDIDATE_LIMIT;
  const scoreThreshold = options.scoreThreshold ?? 0;
  if (!query.trim() || query.length > 10_000)
    throw new RagError(
      "configuration",
      "Search query must contain 1-10000 characters.",
    );
  for (const [name, value] of [
    ["papers", papers],
    ["chunks-per-paper", chunksPerPaper],
    ["candidate-limit", candidateLimit],
  ] as const)
    if (!Number.isInteger(value) || value < 1 || value > 50)
      throw new RagError("configuration", `${name} must be 1-50.`);
  if (
    options.papers !== undefined &&
    options.maxResults !== undefined &&
    options.papers !== options.maxResults
  )
    throw new RagError(
      "configuration",
      "max-results is a legacy alias for papers; conflicting limits are not allowed.",
    );
  if (
    !Number.isFinite(scoreThreshold) ||
    scoreThreshold < 0 ||
    scoreThreshold > 1
  )
    throw new RagError("configuration", "score-threshold must be 0-1.");
  return { papers, chunksPerPaper, candidateLimit, scoreThreshold };
}
export async function retrieveResearch(
  source: RetrievalSource,
  query: string,
  options: SearchOptions = {},
): Promise<RetrievalResponse> {
  const { papers, chunksPerPaper, candidateLimit, scoreThreshold } =
    validateSearchInput(query, options);
  const {
    maxResults: _max,
    rewriteQuery: _rewrite,
    scoreThreshold: _threshold,
    papers: _papers,
    chunksPerPaper: _chunks,
    candidateLimit: _candidates,
    debugRanking: _debug,
    diagnostics: _diagnostics,
    signal: _signal,
    ...filters
  } = options;
  const remoteFilter = remoteFilters(filters);
  if (
    filters.topic !== undefined &&
    !source.taxonomy.some((topic) => topic.id === filters.topic)
  )
    throw new RagError("configuration", "Unknown corpus topic.");
  options.signal?.throwIfAborted();
  const searchStart = performance.now();
  const response = await source.search({
    query,
    maxResults: candidateLimit,
    rewriteQuery: options.rewriteQuery ?? true,
    scoreThreshold,
    filters: remoteFilter,
    ...(options.signal ? { signal: options.signal } : {}),
  });
  const searchElapsedMs = performance.now() - searchStart;
  options.signal?.throwIfAborted();
  await source.unchanged();
  const classification = classifyIntent(query);
  const matchedTopics = [
    ...new Set([
      ...queryTopics(query, source.taxonomy),
      ...(filters.topic ? [filters.topic] : []),
    ]),
  ].sort();
  const output: RetrievalResponse = {
    query,
    intent: classification.intent,
    intentRule: classification.rule,
    matchedTopics,
    rewrittenQuery: response.rewrittenQuery,
    results: [],
    filters,
    filterMethod: filters.topic
      ? `remote attributes + full-topic local post-filter (bounded ${candidateLimit} candidates)`
      : "remote attributes + local manifest safety/filter checks",
    candidateLimit,
    remoteCandidates: response.hits.length,
    eligibleCandidates: 0,
    uniqueCandidates: 0,
    uniquePaperCount: 0,
    chunkCount: 0,
    duplicateChunksSuppressed: 0,
    paperLimitSuppressed: 0,
    papers,
    chunksPerPaper,
    remoteHasMore: response.hasMore,
    suppressed: {},
  };
  const rawCandidates: CandidateTrace[] = [];
  const candidates: PaperCandidate[] = [];
  for (const [index, hit] of response.hits.entries()) {
    options.signal?.throwIfAborted();
    const reported = hit.attributes?.["pmid"];
    const trace: CandidateTrace = {
      rawRank: index + 1,
      pmid: source.identity(hit),
      reportedPmid: typeof reported === "string" ? reported : null,
      fileId: hit.fileId,
      semanticScore: hit.score,
      passedSafetyFilter: false,
      filterReason: null,
    };
    if (options.diagnostics) rawCandidates.push(trace);
    const resolved = await source.resolve(hit, filters, scoreThreshold);
    if ("reason" in resolved) {
      output.suppressed[resolved.reason] =
        (output.suppressed[resolved.reason] ?? 0) + 1;
      trace.filterReason = resolved.reason;
    } else {
      trace.passedSafetyFilter = true;
      candidates.push(resolved.candidate);
    }
  }
  const ranked = diversify(
    candidates,
    classification.intent,
    matchedTopics,
    papers,
    chunksPerPaper,
  );
  output.results = ranked.results;
  output.eligibleCandidates = candidates.length;
  output.uniqueCandidates = ranked.uniqueCandidates;
  output.uniquePaperCount = output.results.length;
  output.chunkCount = output.results.reduce(
    (sum, paper) => sum + paper.chunks.length,
    0,
  );
  output.duplicateChunksSuppressed = ranked.duplicateChunksSuppressed;
  output.paperLimitSuppressed = ranked.paperLimitSuppressed;
  if (options.debugRanking) output.ranking = ranked.ranking;
  if (options.diagnostics)
    output.diagnostics = {
      searchElapsedMs,
      rawCandidates,
      ranking: ranked.ranking,
    };
  await source.unchanged();
  return output;
}
