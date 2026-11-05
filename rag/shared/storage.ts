import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import type { Catalog, CatalogEntry, Provenance } from "./article-schema.js";
import { object, strings } from "./config.js";
import { RAG_ROOT } from "./constants.js";
import { RagError } from "./logging.js";
import { pmid } from "../discovery/deduplicate.js";

export const hash = (data: string) =>
  createHash("sha256").update(data).digest("hex");
export const runId = () =>
  `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}`;

export class LocalStore {
  constructor(public readonly directory = path.join(RAG_ROOT, "data")) {}

  resolve(relative: string): string {
    const target = path.resolve(this.directory, relative);
    if (!target.startsWith(path.resolve(this.directory) + path.sep))
      throw new RagError("storage", "Storage path escapes the data directory.");
    return target;
  }

  async read(relative: string): Promise<string | null> {
    try {
      return await readFile(this.resolve(relative), "utf8");
    } catch (error) {
      if (object(error) && error["code"] === "ENOENT") return null;
      throw new RagError("storage", "Cannot read local source data.");
    }
  }

  async json(relative: string): Promise<unknown | null> {
    const data = await this.read(relative);
    if (data === null) return null;
    try {
      return JSON.parse(data) as unknown;
    } catch {
      throw new RagError("storage", "Local JSON data is corrupt.");
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
      throw new RagError("storage", "Invalid local catalog.");
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
        throw new RagError("storage", "Invalid local catalog entry.");
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
      if (
        !object(provenance) ||
        provenance["api"] !== api ||
        provenance["url"] !== url ||
        provenance["rawPath"] !== relative ||
        provenance["sha256"] !== hash(existing) ||
        typeof provenance["retrievedAt"] !== "string" ||
        !Number.isFinite(Date.parse(provenance["retrievedAt"]))
      ) {
        throw new RagError(
          "storage",
          "Cached source provenance is missing or invalid.",
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
    await this.write(relative, body, refresh);
    await this.writeJson(sidecar, provenance, refresh);
    return provenance;
  }
}
