import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import {
  LOCAL_ORIGINS,
  MAX_BODY_BYTES,
  MAX_QUESTION_CHARACTERS,
  UPSTREAM_TIMEOUT_MS,
} from "./config.js";
import { createThrottle } from "./throttle.js";

export interface RequestLog {
  requestId: string;
  timestamp: string;
  status: number;
  latencyMs: number;
  category: string;
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
  timeoutMs?: number;
}

type RawRequest = Request & { rawBody?: Buffer };

export function createAskHandler(deps: Dependencies) {
  const allowRequest = createThrottle();
  return async (req: RawRequest, res: Response): Promise<void> => {
    const start = Date.now();
    const requestId = randomUUID();
    res.set("Cache-Control", "no-store");
    res.set("X-Content-Type-Options", "nosniff");
    res.vary("Origin");

    // Never log request/response bodies, prompts, SDK errors or IP addresses.
    // Platform access logs and provider retention require separate review.
    const finish = (status: number, category: string, body?: object) => {
      res.status(status);
      if (body) res.json(body);
      else res.end();
      deps.log({
        requestId,
        timestamp: new Date().toISOString(),
        status,
        latencyMs: Date.now() - start,
        category,
      });
    };
    const error = (status: number, category: string, message: string) =>
      finish(status, category, { error: message });

    const origin = req.get("Origin");
    const preview = deps.previewOrigin();
    // Preview is an exact HTTPS Firebase channel origin, not a suffix wildcard.
    const validPreview = /^https:\/\/[a-z0-9-]+--[a-z0-9-]+\.web\.app$/.test(
      preview,
    );
    if (
      !origin ||
      (!LOCAL_ORIGINS.some((allowed) => allowed === origin) &&
        !(validPreview && origin === preview))
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
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error("timeout"));
      }, deps.timeoutMs ?? UPSTREAM_TIMEOUT_MS);
    });
    try {
      const answer = await Promise.race([
        deps.generate(question.trim(), key, controller.signal),
        timeout,
      ]);
      if (!answer.trim()) {
        error(502, "empty_answer", "No answer was available. Please retry.");
        return;
      }
      // No retrieval is configured. Never manufacture a verified sources list.
      finish(200, "success", { answer, sources: [], requestId });
    } catch {
      error(
        controller.signal.aborted ? 504 : 502,
        controller.signal.aborted ? "timeout" : "upstream",
        "The research tool could not answer. Please retry later.",
      );
    } finally {
      clearTimeout(timer);
    }
  };
}
