import OpenAI, { toFile } from "openai";
import type { VectorStoreSearchParams } from "openai/resources/vector-stores/vector-stores";
import { RagError } from "../shared/logging.js";
import { object, strings } from "../shared/guards.js";
import { CHUNKING } from "./chunking.js";

export type Attributes = Record<string, string | number | boolean>;
export type Filter = NonNullable<VectorStoreSearchParams["filters"]>;
export { CHUNKING };
export interface RemoteStore {
  id: string;
  name: string;
  createdAt: number;
  status: string;
  metadata: Record<string, string> | null;
  usageBytes: number;
}
export interface RemoteFile {
  id: string;
  status: string;
  attributes: Attributes | null;
  chunking: unknown;
  errorCode: "server_error" | "unsupported_file" | "invalid_file" | null;
}
export interface RemoteHit {
  fileId: string;
  filename: string;
  score: number;
  attributes: Attributes | null;
  content: string[];
}
export interface SearchRequest {
  query: string;
  maxResults: number;
  rewriteQuery: boolean;
  scoreThreshold: number;
  filters: Filter;
  signal?: AbortSignal;
}
export interface VectorApi {
  createStore(
    name: string,
    metadata: Record<string, string>,
    expiresDays: number,
  ): Promise<RemoteStore>;
  getStore(id: string): Promise<RemoteStore>;
  listStores(): Promise<RemoteStore[]>;
  deleteStore(id: string): Promise<void>;
  listFiles(storeId: string): Promise<RemoteFile[]>;
  upload(filename: string, text: string): Promise<string>;
  attachBatch(
    storeId: string,
    files: { fileId: string; attributes: Attributes }[],
  ): Promise<string>;
  getBatch(storeId: string, batchId: string): Promise<string>;
  detach(storeId: string, fileId: string): Promise<void>;
  deleteFile(fileId: string): Promise<void>;
  search(
    storeId: string,
    request: SearchRequest,
  ): Promise<{ hits: RemoteHit[]; rewrittenQuery: string[]; hasMore: boolean }>;
}
export class VectorApiError extends RagError {
  constructor(public readonly status: number | null) {
    super(
      status === 429 ? "throttled" : status === null ? "network" : "http",
      status === null
        ? "OpenAI connection failed; inspect local pending operations before retrying."
        : `OpenAI request failed (HTTP ${status}).`,
    );
  }
}
export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export function sdkClient(env: NodeJS.ProcessEnv = process.env): OpenAI {
  const apiKey = env["OPENAI_API_KEY"]?.trim();
  if (!apiKey)
    throw new RagError(
      "configuration",
      "OPENAI_API_KEY is required for live development commands.",
    );
  return new OpenAI({
    apiKey,
    baseURL: "https://api.openai.com/v1",
    timeout: 30_000,
    maxRetries: 0,
    logLevel: "off",
  });
}

export class OpenAIVectorApi implements VectorApi {
  private queue: Promise<void> = Promise.resolve();
  private next = 0;
  constructor(
    private readonly client: OpenAI,
    private readonly pause = sleep,
    private readonly readRetries: 0 | 1 | 2 = 2,
  ) {}

  private request<T>(
    operation: () => PromiseLike<T>,
    read = false,
    signal?: AbortSignal,
  ): Promise<T> {
    const result = this.queue.then(async () => {
      for (let attempt = 0; ; attempt++) {
        const pause = async (ms: number) => {
          if (!signal) return this.pause(ms);
          signal.throwIfAborted();
          await new Promise<void>((resolve, reject) => {
            const abort = () => {
              clearTimeout(timer);
              reject(signal.reason);
            };
            const timer = setTimeout(() => {
              signal.removeEventListener("abort", abort);
              resolve();
            }, ms);
            signal.addEventListener("abort", abort, { once: true });
          });
          signal.throwIfAborted();
        };
        await pause(Math.max(0, this.next - Date.now()));
        this.next = Date.now() + 250;
        try {
          return await operation();
        } catch (error) {
          if (signal?.aborted) throw signal.reason;
          const status =
            error instanceof OpenAI.APIError ? (error.status ?? null) : null;
          if (
            !read ||
            attempt >= this.readRetries ||
            (status !== null &&
              status !== 408 &&
              status !== 429 &&
              status < 500)
          )
            throw new VectorApiError(status);
          const header =
            error instanceof OpenAI.APIError
              ? error.headers?.get("retry-after")
              : null;
          const wait = header
            ? /^\d+(\.\d+)?$/.test(header)
              ? Number(header) * 1000
              : Date.parse(header) - Date.now()
            : 1000 * 2 ** attempt;
          if (!Number.isFinite(wait) || wait > 60_000)
            throw new VectorApiError(status);
          await pause(Math.max(0, wait));
        }
      }
    });
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
  private store(value: OpenAI.VectorStores.VectorStore): RemoteStore {
    return {
      id: value.id,
      name: value.name,
      createdAt: value.created_at,
      status: value.status,
      metadata: value.metadata,
      usageBytes: value.usage_bytes,
    };
  }
  async createStore(
    name: string,
    metadata: Record<string, string>,
    expiresDays: number,
  ): Promise<RemoteStore> {
    return this.store(
      await this.request(() =>
        this.client.vectorStores.create({
          name,
          metadata,
          expires_after: { anchor: "last_active_at", days: expiresDays },
        }),
      ),
    );
  }
  async getStore(id: string): Promise<RemoteStore> {
    return this.store(
      await this.request(() => this.client.vectorStores.retrieve(id), true),
    );
  }
  async listStores(): Promise<RemoteStore[]> {
    const result: RemoteStore[] = [];
    let page = await this.request(
      () => this.client.vectorStores.list({ limit: 100 }),
      true,
    );
    while (true) {
      result.push(...page.data.map((value) => this.store(value)));
      if (result.length > 10_000)
        throw new RagError(
          "policy-limit",
          "Remote inventory exceeds the development scan cap.",
        );
      if (!page.hasNextPage()) return result;
      const current = page;
      page = await this.request(() => current.getNextPage(), true);
    }
  }
  async deleteStore(id: string): Promise<void> {
    await this.request(() => this.client.vectorStores.delete(id));
  }
  async listFiles(storeId: string): Promise<RemoteFile[]> {
    const result: RemoteFile[] = [];
    let page = await this.request(
      () => this.client.vectorStores.files.list(storeId, { limit: 100 }),
      true,
    );
    while (true) {
      result.push(
        ...page.data.map((file) => ({
          id: file.id,
          status: file.status,
          attributes: file.attributes ?? null,
          chunking: file.chunking_strategy,
          errorCode: file.last_error?.code ?? null,
        })),
      );
      if (result.length > 10_000)
        throw new RagError(
          "policy-limit",
          "Remote file inventory exceeds the development scan cap.",
        );
      if (!page.hasNextPage()) return result;
      const current = page;
      page = await this.request(() => current.getNextPage(), true);
    }
  }
  async upload(filename: string, text: string): Promise<string> {
    const file = await toFile(Buffer.from(text, "utf8"), filename, {
      type: "text/markdown",
    });
    return (
      await this.request(() =>
        this.client.files.create({ file, purpose: "assistants" }),
      )
    ).id;
  }
  async attachBatch(
    storeId: string,
    files: { fileId: string; attributes: Attributes }[],
  ): Promise<string> {
    return (
      await this.request(() =>
        this.client.vectorStores.fileBatches.create(storeId, {
          files: files.map((file) => ({
            file_id: file.fileId,
            attributes: file.attributes,
            chunking_strategy: CHUNKING,
          })),
        }),
      )
    ).id;
  }
  async getBatch(storeId: string, batchId: string): Promise<string> {
    return (
      await this.request(
        () =>
          this.client.vectorStores.fileBatches.retrieve(batchId, {
            vector_store_id: storeId,
          }),
        true,
      )
    ).status;
  }
  async detach(storeId: string, fileId: string): Promise<void> {
    try {
      await this.request(() =>
        this.client.vectorStores.files.delete(fileId, {
          vector_store_id: storeId,
        }),
      );
    } catch (error) {
      if (!(error instanceof VectorApiError) || error.status !== 404)
        throw error;
    }
  }
  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.request(() => this.client.files.delete(fileId));
    } catch (error) {
      if (!(error instanceof VectorApiError) || error.status !== 404)
        throw error;
    }
  }
  async search(storeId: string, request: SearchRequest) {
    // The SDK's generic Page omits search_query and has_more. Read the official
    // endpoint's raw envelope through the SDK and validate those fields here.
    const body: unknown = await this.request(
      async () => {
        const response = await this.client.vectorStores
          .search(
            storeId,
            {
              query: request.query,
              max_num_results: request.maxResults,
              rewrite_query: request.rewriteQuery,
              ranking_options: { score_threshold: request.scoreThreshold },
              filters: request.filters,
            },
            request.signal ? { signal: request.signal } : {},
          )
          .asResponse();
        return response.json();
      },
      true,
      request.signal,
    );
    if (
      !object(body) ||
      !Array.isArray(body["data"]) ||
      !strings(body["search_query"]) ||
      typeof body["has_more"] !== "boolean"
    )
      throw new RagError("malformed-source", "Invalid OpenAI search envelope.");
    const hits: RemoteHit[] = [];
    for (const hit of body["data"] as unknown[]) {
      if (
        !object(hit) ||
        typeof hit["file_id"] !== "string" ||
        typeof hit["filename"] !== "string" ||
        typeof hit["score"] !== "number" ||
        !Array.isArray(hit["content"]) ||
        (hit["attributes"] !== null && !object(hit["attributes"]))
      )
        throw new RagError("malformed-source", "Invalid OpenAI search result.");
      const attributes: Attributes | null =
        hit["attributes"] === null ? null : {};
      if (attributes) {
        for (const [key, value] of Object.entries(hit["attributes"] ?? {})) {
          if (
            typeof value !== "string" &&
            typeof value !== "number" &&
            typeof value !== "boolean"
          )
            throw new RagError(
              "malformed-source",
              "Invalid OpenAI search attributes.",
            );
          attributes[key] = value;
        }
      }
      const content: string[] = [];
      for (const item of hit["content"] as unknown[]) {
        if (
          !object(item) ||
          item["type"] !== "text" ||
          typeof item["text"] !== "string"
        )
          throw new RagError(
            "malformed-source",
            "Invalid OpenAI search content.",
          );
        content.push(item["text"]);
      }
      hits.push({
        fileId: hit["file_id"],
        filename: hit["filename"],
        score: hit["score"],
        attributes,
        content,
      });
    }
    return {
      hits,
      rewrittenQuery: body["search_query"],
      hasMore: body["has_more"],
    };
  }
}
