import type { RetrievalResponse } from "../runtime/retrieval/result-schema.js";
import { UPSTREAM_TIMEOUT_MS } from "./config.js";
import {
  buildEvidence,
  CitationError,
  EvidenceError,
  hasUnverifiedReference,
  groundedAnswer,
  type EvidenceBundle,
  type ResearchSource,
} from "./evidence.js";

export const RAG_RETRIEVAL_TIMEOUT_MS = 5000;
export const MIN_REGENERATION_BUDGET_MS = 3000;
export const FALLBACK_CATEGORIES = [
  "rag-disabled",
  "rag-not-configured",
  "rag-timeout",
  "rag-provider-error",
  "rag-malformed-response",
  "rag-no-eligible-sources",
  "rag-citation-validation-failed",
  "rag-budget-exhausted",
] as const;
export type FallbackCategory = (typeof FALLBACK_CATEGORIES)[number];
export class RagBudgetError extends Error {}
export class RagCancellationError extends Error {}
const budgetFallback =
  "I could not verify research citations for this response. Please retry. No source-grounded research answer is available for this request.";
export interface RagTelemetry {
  ragUsed: boolean;
  ragSourceCount: number;
  ragLatencyMs: number;
  ragFallback: boolean;
  generationLatencyMs: number;
  ragFallbackCategory?: FallbackCategory;
}
export interface AnswerResult {
  answer: string;
  sources: ResearchSource[];
  retrieval: { used: boolean; sourceCount: number };
  telemetry: RagTelemetry;
}
export interface AnswerOptions {
  deadlineAt?: number;
  onTelemetry?: (telemetry: RagTelemetry) => void;
}
export interface AnswerDependencies {
  enabled: () => boolean;
  vectorStoreId: () => string;
  retrieve: (
    question: string,
    key: string,
    storeId: string,
    signal: AbortSignal,
  ) => Promise<RetrievalResponse>;
  generate: (
    question: string,
    key: string,
    signal: AbortSignal,
    evidence?: EvidenceBundle,
  ) => Promise<string>;
  retrievalTimeoutMs?: number;
}
export function createRagAnswer(deps: AnswerDependencies) {
  return async (
    question: string,
    key: string,
    signal: AbortSignal,
    options: AnswerOptions = {},
  ): Promise<AnswerResult> => {
    const deadlineAt = Math.min(
      options.deadlineAt ?? Infinity,
      Date.now() + UPSTREAM_TIMEOUT_MS,
    );
    let fallback: FallbackCategory | undefined;
    let elapsed = 0;
    let retrievalStart: number | undefined;
    let generationElapsed = 0;
    let generationStart: number | undefined;
    let generationCalls = 0;
    let used = false;
    let sourceCount = 0;
    const telemetry = (): RagTelemetry => ({
      ragUsed: used,
      ragSourceCount: sourceCount,
      ragLatencyMs:
        elapsed +
        (retrievalStart === undefined
          ? 0
          : Math.round(performance.now() - retrievalStart)),
      ragFallback: fallback !== undefined,
      generationLatencyMs:
        generationElapsed +
        (generationStart === undefined ? 0 : Date.now() - generationStart),
      ...(fallback ? { ragFallbackCategory: fallback } : {}),
    });
    const publish = () => options.onTelemetry?.(telemetry());
    const abort = () => {
      if (!(signal.reason instanceof RagCancellationError))
        fallback = "rag-budget-exhausted";
      publish();
    };
    const generate = async (evidence?: EvidenceBundle): Promise<string> => {
      signal.throwIfAborted();
      if (Date.now() >= deadlineAt || generationCalls >= 2) {
        fallback = "rag-budget-exhausted";
        throw new RagBudgetError("Request budget exhausted.");
      }
      generationCalls++;
      generationStart = Date.now();
      publish();
      try {
        const text = await deps.generate(question, key, signal, evidence);
        signal.throwIfAborted();
        if (Date.now() >= deadlineAt) {
          fallback = "rag-budget-exhausted";
          throw new RagBudgetError("Request budget exhausted.");
        }
        return text;
      } finally {
        generationElapsed += Date.now() - generationStart;
        generationStart = undefined;
        publish();
      }
    };
    let evidence: EvidenceBundle | undefined;
    let enabled = false;
    let storeId = "";
    signal.addEventListener("abort", abort, { once: true });
    try {
      signal.throwIfAborted();
      try {
        enabled = deps.enabled();
        if (enabled) storeId = deps.vectorStoreId();
        else fallback = "rag-disabled";
      } catch {
        fallback = "rag-not-configured";
      }
      if (enabled) {
        if (!/^vs_[a-zA-Z0-9_-]+$/.test(storeId))
          fallback = "rag-not-configured";
        else {
          const start = performance.now();
          retrievalStart = start;
          const controller = new AbortController();
          const cancel = () => controller.abort(signal.reason);
          signal.addEventListener("abort", cancel, { once: true });
          if (signal.aborted) cancel();
          let timer: ReturnType<typeof setTimeout> | undefined;
          let abortDeadline: (() => void) | undefined;
          try {
            const remaining = deadlineAt - Date.now();
            if (remaining <= 0)
              throw new RagBudgetError("Request budget exhausted.");
            const deadline = new Promise<never>((_, reject) => {
              abortDeadline = () => reject(controller.signal.reason);
              controller.signal.addEventListener("abort", abortDeadline, {
                once: true,
              });
              if (controller.signal.aborted) abortDeadline();
              timer = setTimeout(
                () => controller.abort(),
                Math.min(
                  remaining,
                  RAG_RETRIEVAL_TIMEOUT_MS,
                  deps.retrievalTimeoutMs ?? RAG_RETRIEVAL_TIMEOUT_MS,
                ),
              );
            });
            const retrieval = await Promise.race([
              deps.retrieve(question, key, storeId, controller.signal),
              deadline,
            ]);
            controller.signal.throwIfAborted();
            if (!retrieval || !Array.isArray(retrieval.results)) {
              fallback = "rag-malformed-response";
            } else {
              evidence = buildEvidence(retrieval.results);
              if (!evidence.sources.length) {
                evidence = undefined;
                fallback = "rag-no-eligible-sources";
              }
            }
          } catch (error) {
            if (signal.aborted) throw signal.reason;
            const category =
              error !== null && typeof error === "object" && "category" in error
                ? error.category
                : undefined;
            fallback =
              error instanceof RagBudgetError || Date.now() >= deadlineAt
                ? "rag-budget-exhausted"
                : controller.signal.aborted
                  ? "rag-timeout"
                  : category === "configuration"
                    ? "rag-not-configured"
                    : category === "malformed-source" ||
                        error instanceof EvidenceError
                      ? "rag-malformed-response"
                      : "rag-provider-error";
            evidence = undefined;
          } finally {
            clearTimeout(timer);
            if (abortDeadline)
              controller.signal.removeEventListener("abort", abortDeadline);
            controller.abort();
            signal.removeEventListener("abort", cancel);
            elapsed = Math.round(performance.now() - start);
            retrievalStart = undefined;
            publish();
          }
        }
      }
      if (evidence) {
        const text = await generate(evidence);
        try {
          const grounded = groundedAnswer(text, evidence);
          used = true;
          sourceCount = grounded.sources.length;
          return {
            ...grounded,
            retrieval: { used: true, sourceCount },
            telemetry: telemetry(),
          };
        } catch (error) {
          if (!(error instanceof CitationError)) throw error;
          fallback = "rag-citation-validation-failed";
          if (deadlineAt - Date.now() < MIN_REGENERATION_BUDGET_MS) {
            fallback = "rag-budget-exhausted";
            signal.throwIfAborted();
            return {
              answer: budgetFallback,
              sources: [],
              retrieval: { used: false, sourceCount: 0 },
              telemetry: telemetry(),
            };
          }
        }
      }
      const ungrounded = await generate();
      const unsupported = hasUnverifiedReference(ungrounded);
      if (unsupported) fallback = "rag-citation-validation-failed";
      return {
        answer: unsupported ? budgetFallback : ungrounded,
        sources: [],
        retrieval: { used: false, sourceCount: 0 },
        telemetry: telemetry(),
      };
    } finally {
      publish();
      signal.removeEventListener("abort", abort);
    }
  };
}
