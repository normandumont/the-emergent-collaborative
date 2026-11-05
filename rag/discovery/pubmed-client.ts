import type { Config } from "../shared/config.js";
import { object } from "../shared/config.js";
import {
  EUTILS_BASE,
  PMC_OAI_BASE,
  MAX_ATTEMPTS,
  MAX_RESPONSE_BYTES,
  MAX_RETRY_WAIT_MS,
  REQUEST_TIMEOUT_MS,
} from "../shared/constants.js";
import { RagError } from "../shared/logging.js";
import { pmcid } from "./deduplicate.js";

export interface Clock {
  now(): number;
  sleep(ms: number): Promise<void>;
}
const realClock: Clock = {
  now: Date.now,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

export class RateLimiter {
  private nextStart = 0;
  private queue: Promise<void> = Promise.resolve();
  constructor(
    private readonly rate: number,
    private readonly clock: Clock = realClock,
  ) {
    if (!Number.isFinite(rate) || rate <= 0)
      throw new RagError("configuration", "Invalid request rate.");
  }
  wait(): Promise<void> {
    const operation = this.queue.then(async () => {
      const delay = this.nextStart - this.clock.now();
      if (delay > 0) await this.clock.sleep(delay);
      this.nextStart = this.clock.now() + Math.ceil(1000 / this.rate);
    });
    this.queue = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }
}

export function peakHours(timestamp: number): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(timestamp);
  const day = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  return day !== "Sat" && day !== "Sun" && hour >= 5 && hour < 21;
}

export function retryDelay(
  header: string | null,
  now: number,
  attempt: number,
): number {
  if (header === null) return 1000 * 2 ** attempt;
  const delay = /^\d+$/.test(header)
    ? Number(header) * 1000
    : Date.parse(header) - now;
  if (!Number.isFinite(delay))
    throw new RagError("throttled", "Invalid Retry-After response.");
  if (delay > MAX_RETRY_WAIT_MS)
    throw new RagError(
      "throttled",
      "Retry-After exceeds the prototype wait limit.",
    );
  return Math.max(0, delay);
}

async function readBody(response: Response): Promise<string> {
  if (!response.body)
    throw new RagError("malformed-source", "Source response has no body.");
  const reader = response.body.getReader();
  const buffers: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_RESPONSE_BYTES)
        throw new RagError(
          "policy-limit",
          "Source response exceeds the prototype size limit.",
        );
      buffers.push(chunk.value);
    }
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(
        Buffer.concat(buffers),
      );
    } catch {
      throw new RagError(
        "malformed-source",
        "Source response is not valid UTF-8.",
      );
    }
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
}

function bodyThrottled(body: string): boolean {
  if (body.trimStart().startsWith("{")) {
    let json: unknown;
    try {
      json = JSON.parse(body) as unknown;
    } catch {
      return false;
    }
    return (
      object(json) &&
      typeof json["error"] === "string" &&
      /rate limit exceeded/i.test(json["error"])
    );
  }
  return /<ERROR>\s*[^<]*rate limit exceeded[^<]*<\/ERROR>/i.test(body);
}

export class PubmedClient {
  private readonly eutilsLimiter: RateLimiter;
  private readonly oaiLimiter: RateLimiter;
  private queue: Promise<void> = Promise.resolve();
  private oaiAttempts = 0;

  constructor(
    private readonly config: Config,
    private readonly fetcher: typeof fetch = fetch,
    private readonly clock: Clock = realClock,
  ) {
    if (config.requestsPerSecond > (config.apiKey ? 10 : 3))
      throw new RagError(
        "configuration",
        "NCBI request rate exceeds the supported limit.",
      );
    this.eutilsLimiter = new RateLimiter(config.requestsPerSecond, clock);
    this.oaiLimiter = new RateLimiter(
      Math.min(3, config.requestsPerSecond),
      clock,
    );
  }

  eutils(
    endpoint: "esearch.fcgi" | "efetch.fcgi",
    parameters: Record<string, string>,
  ): Promise<string> {
    const body = new URLSearchParams({
      ...parameters,
      tool: this.config.tool,
      email: this.config.email,
    });
    if (this.config.apiKey) body.set("api_key", this.config.apiKey);
    return this.request(
      new URL(endpoint, EUTILS_BASE),
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      },
      false,
    );
  }

  oai(id: string, format: "pmc_fm" | "pmc"): Promise<string> {
    return this.request(
      new URL(this.oaiUrl(id, format)),
      { headers: { "Accept-Encoding": "gzip, deflate" } },
      true,
    );
  }

  oaiUrl(id: string, format: "pmc_fm" | "pmc"): string {
    const url = new URL(PMC_OAI_BASE);
    url.search = new URLSearchParams({
      verb: "GetRecord",
      identifier: `oai:pubmedcentral.nih.gov:${pmcid(id).slice(3)}`,
      metadataPrefix: format,
    }).toString();
    return url.href;
  }

  private request(url: URL, init: RequestInit, oai: boolean): Promise<string> {
    const operation = this.queue.then(() => this.execute(url, init, oai));
    this.queue = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }

  private async execute(
    url: URL,
    init: RequestInit,
    oai: boolean,
  ): Promise<string> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (oai && this.oaiAttempts >= 100 && peakHours(this.clock.now()))
        throw new RagError(
          "policy-limit",
          "More than 100 PMC requests require an off-peak run.",
        );
      await (oai ? this.oaiLimiter : this.eutilsLimiter).wait();
      if (oai) this.oaiAttempts++;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      let delay: number | null = null;
      try {
        const response = await this.fetcher(url, {
          ...init,
          signal: controller.signal,
          redirect: "error",
          credentials: "omit",
          cache: "no-store",
        });
        if (response.status === 429 || response.status >= 500) {
          await response.body?.cancel();
          if (attempt === MAX_ATTEMPTS - 1)
            throw new RagError(
              response.status === 429 ? "throttled" : "http",
              "Transient NCBI requests exhausted retries.",
            );
          delay = retryDelay(
            response.headers.get("Retry-After"),
            this.clock.now(),
            attempt,
          );
        } else if (!response.ok) {
          await response.body?.cancel();
          throw new RagError(
            "http",
            "NCBI returned a non-retryable HTTP error.",
          );
        } else {
          const body = await readBody(response);
          if (!bodyThrottled(body)) return body;
          if (attempt === MAX_ATTEMPTS - 1)
            throw new RagError(
              "throttled",
              "NCBI throttling exhausted retries.",
            );
          delay = retryDelay(
            response.headers.get("Retry-After"),
            this.clock.now(),
            attempt,
          );
        }
      } catch (error) {
        if (error instanceof RagError) throw error;
        if (attempt === MAX_ATTEMPTS - 1)
          throw new RagError(
            controller.signal.aborted ? "timeout" : "network",
            "NCBI connection attempts failed.",
          );
        delay = retryDelay(null, this.clock.now(), attempt);
      } finally {
        clearTimeout(timer);
      }
      if (delay !== null) await this.clock.sleep(delay);
    }
    throw new RagError("network", "NCBI request did not complete.");
  }
}
