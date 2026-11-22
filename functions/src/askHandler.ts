import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import {
  LOCAL_ORIGINS,
  MAX_BODY_BYTES,
  MAX_QUESTION_CHARACTERS,
  UPSTREAM_TIMEOUT_MS,
} from "./config.js";
import { createThrottle } from "./throttle.js";
import {
  RagBudgetError,
  RagCancellationError,
  type AnswerOptions,
  type AnswerResult,
  type RagTelemetry,
} from "./ragAnswer.js";

type RequestCategory =
  | "origin"
  | "preflight"
  | "method"
  | "throttle"
  | "content_type"
  | "body_size"
  | "json"
  | "question"
  | "configuration"
  | "success"
  | "empty_answer"
  | "timeout"
  | "upstream"
  | "cancelled";
export interface RequestLog {
  requestId: string;
  timestamp: string;
  status: number;
  totalLatencyMs: number;
  category: RequestCategory;
  ragUsed?: boolean;
  ragSourceCount?: number;
  ragLatencyMs?: number;
  ragFallback?: boolean;
  generationLatencyMs?: number;
  ragFallbackCategory?: RagTelemetry["ragFallbackCategory"];
}

interface Dependencies {
  getKey: () => string;
  previewOrigin: () => string;
  generate: (
    question: string,
    key: string,
    signal: AbortSignal,
  ) => Promise<string>;
  log: (record: RequestLog) => void;
  answer?: (
    question: string,
    key: string,
    signal: AbortSignal,
    options?: AnswerOptions,
  ) => Promise<AnswerResult>;
  timeoutMs?: number;
}

type RawRequest = Request & { rawBody?: Buffer };

function isFounderReviewOrigin(origin: string): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  return (
    url.protocol === "https:" &&
    url.port === "" &&
    url.origin === origin.toLowerCase() &&
    /^meridian-station-preview--founder-review-[a-z0-9-]+\.web\.app$/i.test(
      url.hostname,
    )
  );
}

export function createAskHandler(deps: Dependencies) {
  const allowRequest = createThrottle();
  return async (req: RawRequest, res: Response): Promise<void> => {
    const start = Date.now();
    const deadlineAt = start + (deps.timeoutMs ?? UPSTREAM_TIMEOUT_MS);
    let latestTelemetry: RagTelemetry | undefined;
    let legacyGenerationStart: number | undefined;
    let disconnected = false;
    const requestId = randomUUID();
    res.set("Cache-Control", "no-store");
    res.set("X-Content-Type-Options", "nosniff");
    res.vary("Origin");

    // Never log request/response bodies, prompts, SDK errors or IP addresses.
    // Platform access logs and provider retention require separate review.
    const finish = (
      status: number,
      category: RequestCategory,
      body?: object,
      telemetry?: RagTelemetry,
    ) => {
      const metrics = telemetry ??
        latestTelemetry ?? {
          ragUsed: false,
          ragSourceCount: 0,
          ragLatencyMs: 0,
          ragFallback: false,
          generationLatencyMs:
            legacyGenerationStart === undefined
              ? 0
              : Date.now() - legacyGenerationStart,
        };
      if (!disconnected) {
        res.status(status);
        if (body) res.json(body);
        else res.end();
      }
      deps.log({
        requestId,
        timestamp: new Date().toISOString(),
        status,
        totalLatencyMs: Date.now() - start,
        category,
        ragUsed: metrics.ragUsed,
        ragSourceCount: metrics.ragSourceCount,
        ragLatencyMs: metrics.ragLatencyMs,
        ragFallback: metrics.ragFallback,
        generationLatencyMs: metrics.generationLatencyMs,
        ...(metrics.ragFallbackCategory
          ? { ragFallbackCategory: metrics.ragFallbackCategory }
          : {}),
      });
    };
    const error = (
      status: number,
      category: RequestCategory,
      message: string,
    ) => finish(status, category, { error: message });

    const origin = req.get("Origin");
    const preview = deps.previewOrigin();
    // Keep explicitly configured previews alongside the controlled channel rule.
    const validPreview = /^https:\/\/[a-z0-9-]+--[a-z0-9-]+\.web\.app$/.test(
      preview,
    );
    if (
      !origin ||
      (!LOCAL_ORIGINS.some((allowed) => allowed === origin) &&
        !(validPreview && origin === preview) &&
        !isFounderReviewOrigin(origin))
    ) {
      error(403, "origin", "This origin is not allowed.");
      return;
    }
    res.set("Access-Control-Allow-Origin", origin);
    if (req.method === "OPTIONS") {
      const headers = (req.get("Access-Control-Request-Headers") ?? "")
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
      if (
        req.get("Access-Control-Request-Method") !== "POST" ||
        headers.some((header) => header !== "content-type")
      ) {
        error(403, "preflight", "This request is not allowed.");
        return;
      }
      res.set("Access-Control-Allow-Methods", "POST");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      finish(204, "preflight");
      return;
    }
    if (req.method !== "POST") {
      res.set("Allow", "POST, OPTIONS");
      error(405, "method", "Only POST requests are supported.");
      return;
    }
    if (!allowRequest(req.ip ?? "unknown")) {
      res.set("Retry-After", "60");
      error(
        429,
        "throttle",
        "Too many requests. Please wait a minute and retry.",
      );
      return;
    }
    if (!/^application\/json(?:\s*;|$)/i.test(req.get("Content-Type") ?? "")) {
      error(415, "content_type", "Send a JSON request.");
      return;
    }
    const raw = req.rawBody;
    const declaredLength = Number(req.get("Content-Length") ?? 0);
    if (
      !raw ||
      raw.length > MAX_BODY_BYTES ||
      declaredLength > MAX_BODY_BYTES
    ) {
      error(413, "body_size", "The request is too large or unreadable.");
      return;
    }
    let body: unknown;
    try {
      body = JSON.parse(raw.toString("utf8"));
    } catch {
      error(400, "json", "Send valid JSON.");
      return;
    }
    const question =
      body !== null && typeof body === "object" && "question" in body
        ? body.question
        : undefined;
    if (
      typeof question !== "string" ||
      question.trim().length === 0 ||
      question.length > MAX_QUESTION_CHARACTERS
    ) {
      error(400, "question", "Enter a question of 1 to 4000 characters.");
      return;
    }

    let key: string;
    try {
      key = deps.getKey();
    } catch {
      error(
        503,
        "configuration",
        "The research tool is not available right now.",
      );
      return;
    }
    if (!key.trim()) {
      error(
        503,
        "configuration",
        "The research tool is not available right now.",
      );
      return;
    }
    const controller = new AbortController();
    const disconnect = () => {
      if (!res.writableEnded) {
        disconnected = true;
        controller.abort(new RagCancellationError("Client disconnected."));
      }
    };
    res.once("close", disconnect);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let rejectOnAbort: (() => void) | undefined;
    const timeout = new Promise<never>((_, reject) => {
      rejectOnAbort = () => reject(controller.signal.reason);
      controller.signal.addEventListener("abort", rejectOnAbort, {
        once: true,
      });
      timer = setTimeout(
        () => {
          controller.abort();
        },
        Math.max(0, deadlineAt - Date.now()),
      );
    });
    try {
      if (Date.now() >= deadlineAt)
        throw new RagBudgetError("Request budget exhausted.");
      legacyGenerationStart = deps.answer ? undefined : Date.now();
      const result = await Promise.race([
        deps.answer
          ? deps.answer(question.trim(), key, controller.signal, {
              deadlineAt,
              onTelemetry: (telemetry) => {
                latestTelemetry = telemetry;
              },
            })
          : deps.generate(question.trim(), key, controller.signal),
        timeout,
      ]);
      const answer = typeof result === "string" ? result : result.answer;
      if (!answer.trim()) {
        error(502, "empty_answer", "No answer was available. Please retry.");
        return;
      }
      finish(
        200,
        "success",
        {
          answer,
          sources: typeof result === "string" ? [] : result.sources,
          requestId,
          retrieval:
            typeof result === "string"
              ? { used: false, sourceCount: 0 }
              : result.retrieval,
        },
        typeof result === "string"
          ? {
              ragUsed: false,
              ragSourceCount: 0,
              ragLatencyMs: 0,
              ragFallback: true,
              ragFallbackCategory: "rag-disabled",
              generationLatencyMs:
                Date.now() - (legacyGenerationStart ?? Date.now()),
            }
          : result.telemetry,
      );
    } catch (failure) {
      const timedOut =
        controller.signal.aborted || failure instanceof RagBudgetError;
      finish(
        disconnected ? 499 : timedOut ? 504 : 502,
        disconnected ? "cancelled" : timedOut ? "timeout" : "upstream",
        { error: "The research tool could not answer. Please retry later." },
        latestTelemetry ??
          (legacyGenerationStart === undefined
            ? undefined
            : {
                ragUsed: false,
                ragSourceCount: 0,
                ragLatencyMs: 0,
                ragFallback: true,
                ragFallbackCategory: "rag-disabled",
                generationLatencyMs: Date.now() - legacyGenerationStart,
              }),
      );
    } finally {
      clearTimeout(timer);
      if (rejectOnAbort)
        controller.signal.removeEventListener("abort", rejectOnAbort);
      res.off("close", disconnect);
      controller.abort();
    }
  };
}
