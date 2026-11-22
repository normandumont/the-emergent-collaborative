import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import type { Catalog, CatalogEntry, Provenance } from "./article-schema.js";
import { CORPUS_STATES, type CorpusState } from "./article-schema.js";
import { object, strings } from "./config.js";
import { RAG_ROOT } from "./constants.js";
import { RagError, StorageError } from "./logging.js";
import { pmid } from "../discovery/deduplicate.js";

export const hash = (data: string) =>
  createHash("sha256").update(data).digest("hex");
export const runId = () =>
  `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}`;
export function isCorpusState(value: unknown): value is CorpusState {
  return (
    typeof value === "string" && CORPUS_STATES.some((state) => state === value)
  );
}

export function portablePath(relative: string): string {
  const portable = relative.replaceAll("\\", "/");
  if (
    path.win32.isAbsolute(relative) ||
    path.posix.isAbsolute(portable) ||
    portable
      .split("/")
      .some((part) => !part || part === "." || part === "..") ||
    !/^[a-zA-Z0-9_./-]+$/.test(portable)
  )
    throw new StorageError(
      "normalized-path-invalid",
      "invalid-relative-path",
      "Storage requires a portable relative path without traversal.",
    );
  return portable;
}

export class LocalStore {
  constructor(public readonly directory = path.join(RAG_ROOT, "data")) {}

  resolve(relative: string): string {
    const target = path.resolve(
      this.directory,
      ...portablePath(relative).split("/"),
    );
    if (!target.startsWith(path.resolve(this.directory) + path.sep))
      throw new RagError("storage", "Storage path escapes the data directory.");
    return target;
  }

  async read(relative: string): Promise<string | null> {
    try {
      return await readFile(this.resolve(relative), "utf8");
    } catch (error) {
      if (object(error) && error["code"] === "ENOENT") return null;
      throw new StorageError(
        "raw-source-missing",
        portablePath(relative),
        "Cannot read local source data.",
      );
    }
  }

  async json(relative: string): Promise<unknown | null> {
    const data = await this.read(relative);
    if (data === null) return null;
    try {
      return JSON.parse(data) as unknown;
    } catch {
      throw new StorageError(
        "JSON-read-error",
        portablePath(relative),
        "Local JSON data is corrupt.",
      );
    }
  }

  async write(relative: string, data: string, refresh = false): Promise<void> {
    const target = this.resolve(relative);
    await mkdir(path.dirname(target), { recursive: true });
    if (!refresh) {
      const file = await open(target, "wx");
      try {
        await file.writeFile(data, "utf8");
      } finally {
        await file.close();
      }
      return;
    }
    const temporary = `${target}.${randomUUID()}.tmp`;
    try {
      const file = await open(temporary, "wx");
      try {
        await file.writeFile(data, "utf8");
      } finally {
        await file.close();
      }
      await rename(temporary, target);
    } finally {
      try {
        await unlink(temporary);
      } catch (error) {
        if (!object(error) || error["code"] !== "ENOENT")
          throw new RagError("storage", "Cannot clean up an atomic write.");
      }
    }
  }

  async writeJson(
    relative: string,
    data: unknown,
    refresh = false,
  ): Promise<void> {
    await this.write(relative, JSON.stringify(data, null, 2) + "\n", refresh);
  }

  async immutable(relative: string, data: string): Promise<void> {
    const existing = await this.read(relative);
    if (existing === data) return;
    if (existing !== null)
      throw new RagError(
        "storage",
        "Immutable snapshot does not match its stored content.",
      );
    await this.write(relative, data);
  }

  async archive(relative: string): Promise<void> {
    const existing = await this.read(relative);
    if (existing !== null)
      await this.immutable(`history/${hash(existing)}/${relative}`, existing);
  }

  async versionedJson(relative: string, data: unknown): Promise<void> {
    await this.archive(relative);
    await this.writeJson(relative, data, true);
  }

  async locked<T>(operation: () => Promise<T>): Promise<T> {
    await mkdir(this.directory, { recursive: true });
    const lockPath = this.resolve(".run.lock");
    let lock;
    try {
      lock = await open(lockPath, "wx");
    } catch (error) {
      if (object(error) && error["code"] === "EEXIST")
        throw new RagError(
          "storage",
          "Another local run holds the data lock; inspect stale locks manually.",
        );
      throw new RagError("storage", "Cannot acquire the local data lock.");
    }
    try {
      await lock.writeFile(
        JSON.stringify({
          pid: process.pid,
          startedAt: new Date().toISOString(),
        }),
      );
      return await operation();
    } finally {
      await lock.close();
      await unlink(lockPath);
    }
  }

  async catalog(): Promise<Catalog> {
    const data = await this.json("catalog.json");
    if (data === null) return { schemaVersion: 1, articles: {} };
    if (
      !object(data) ||
      data["schemaVersion"] !== 1 ||
      !object(data["articles"])
    )
      throw new StorageError(
        "catalog-schema-mismatch",
        "catalog.json",
        "Invalid local catalog.",
      );
    const articles: Record<string, CatalogEntry> = {};
    for (const [id, entry] of Object.entries(data["articles"])) {
      pmid(id);
      if (
        !object(entry) ||
        entry["pmid"] !== id ||
        !strings(entry["queryIds"]) ||
        !strings(entry["topics"]) ||
        typeof entry["firstDiscoveredAt"] !== "string" ||
        !Number.isFinite(Date.parse(entry["firstDiscoveredAt"])) ||
        typeof entry["lastDiscoveredAt"] !== "string" ||
        !Number.isFinite(Date.parse(entry["lastDiscoveredAt"])) ||
        (entry["lastIngestedAt"] !== null &&
          (typeof entry["lastIngestedAt"] !== "string" ||
            !Number.isFinite(Date.parse(entry["lastIngestedAt"])))) ||
        (entry["errorCategory"] !== null &&
          typeof entry["errorCategory"] !== "string") ||
        (entry["status"] !== "discovered" &&
          entry["status"] !== "normalized" &&
          entry["status"] !== "error")
      )
        throw new StorageError(
          "catalog-schema-mismatch",
          "catalog.json",
          "Invalid local catalog entry.",
        );
      articles[id] = {
        pmid: id,
        queryIds: entry["queryIds"],
        topics: entry["topics"],
        firstDiscoveredAt: entry["firstDiscoveredAt"],
        lastDiscoveredAt: entry["lastDiscoveredAt"],
        lastIngestedAt: entry["lastIngestedAt"],
        errorCategory: entry["errorCategory"],
        status: entry["status"],
      };
      if (entry["discoveredBy"] !== undefined) {
        const relationships = entry["discoveredBy"];
        if (
          !Array.isArray(relationships) ||
          !relationships.every(
            (item: unknown) =>
              object(item) &&
              typeof item["queryId"] === "string" &&
              articles[id]!.queryIds.includes(item["queryId"]) &&
              strings(item["topics"]),
          )
        )
          throw new RagError("storage", "Invalid discovery relationships.");
        articles[id].discoveredBy = relationships.map(
          (item: { queryId: string; topics: string[] }) => ({
            queryId: item.queryId,
            topics: item.topics,
          }),
        );
        if (
          new Set(articles[id].discoveredBy.map((item) => item.queryId))
            .size !== relationships.length
        )
          throw new RagError("storage", "Duplicate discovery relationship.");
      }
      if (entry["corpus"] !== undefined) {
        const corpus = entry["corpus"];
        if (
          !object(corpus) ||
          !isCorpusState(corpus["state"]) ||
          typeof corpus["decisionPath"] !== "string" ||
          !/^corpus\/decisions\/[1-9]\d{0,8}\/[a-f0-9]{64}\.json$/.test(
            corpus["decisionPath"],
          ) ||
          typeof corpus["retrievalEnabled"] !== "boolean"
        )
          throw new RagError("storage", "Invalid catalog corpus state.");
        articles[id].corpus = {
          state: corpus["state"],
          decisionPath: corpus["decisionPath"],
          retrievalEnabled: corpus["retrievalEnabled"],
        };
      }
    }
    return { schemaVersion: 1, articles };
  }

  async saveCatalog(catalog: Catalog): Promise<void> {
    await this.writeJson("catalog.json", catalog, true);
  }

  async raw(
    relative: string,
    body: string,
    api: Provenance["api"],
    url: string,
    refresh: boolean,
  ): Promise<Provenance> {
    const sidecar = `${relative}.provenance.json`;
    const existing = await this.read(relative);
    if (existing !== null && !refresh) {
      const provenance = await this.json(sidecar);
      if (provenance === null)
        throw new StorageError(
          "provenance-file-missing",
          portablePath(sidecar),
          "Cached source provenance sidecar is missing.",
        );
      if (
        object(provenance) &&
        typeof provenance["sha256"] === "string" &&
        provenance["sha256"] !== hash(existing)
      )
        throw new StorageError(
          "hash-mismatch",
          portablePath(relative),
          "Cached source bytes do not match their provenance.",
        );
      if (
        !object(provenance) ||
        provenance["api"] !== api ||
        provenance["url"] !== url ||
        provenance["rawPath"] !== relative ||
        provenance["sha256"] !== hash(existing) ||
        typeof provenance["retrievedAt"] !== "string" ||
        !Number.isFinite(Date.parse(provenance["retrievedAt"]))
      ) {
        throw new StorageError(
          "record-schema-mismatch",
          portablePath(sidecar),
          "Cached source provenance is invalid.",
        );
      }
      return {
        api,
        url,
        rawPath: relative,
        sha256: hash(existing),
        retrievedAt: provenance["retrievedAt"],
      };
    }
    const provenance: Provenance = {
      api,
      url,
      rawPath: relative,
      sha256: hash(body),
      retrievedAt: new Date().toISOString(),
    };
    if (existing !== null && refresh) {
      await this.archive(relative);
      await this.archive(sidecar);
    }
    await this.write(relative, body, refresh);
    await this.writeJson(sidecar, provenance, refresh);
    return provenance;
  }
}
