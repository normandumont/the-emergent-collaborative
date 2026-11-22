import { object, strings } from "../shared/guards.js";
import { createHash } from "node:crypto";
import { RagError } from "../shared/logging.js";
import { studyTypes } from "../shared/study-types.js";
import { CORPUS_STATES } from "../shared/article-schema.js";
import {
  fileAttributes,
  fingerprint,
  indexable,
  sameAttributes,
} from "../indexing/metadata.js";
import type { Attributes, RemoteHit } from "../indexing/openai-client.js";
import type { TopicRule } from "../corpus/schema.js";
import type { PaperCandidate } from "./result-schema.js";
import { matchesFilters } from "./filters.js";
import type { RetrievalSource } from "./pipeline.js";

export interface RuntimePaper {
  fileId: string | null;
  fingerprint: string | null;
  title: string | null;
  url: string;
  entry: PaperCandidate["metadata"] & {
    pmid: string;
    eligible: boolean;
    expressionOfConcern: boolean;
    indexAction: "upsert" | "remove";
    sha256: string | null;
  };
}
export interface RuntimeManifest {
  schemaVersion: 1;
  storeId: string;
  manifestSha256: string;
  taxonomySha256: string;
  papers: RuntimePaper[];
  taxonomy: TopicRule[];
}
const digest = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const nullableText = (value: unknown): value is string | null =>
  value === null || typeof value === "string";
export function verifyRuntimeManifest(
  text: string,
  expectedDigest: string,
): RuntimeManifest {
  if (
    !digest(expectedDigest.trim()) ||
    createHash("sha256").update(text, "utf8").digest("hex") !==
      expectedDigest.trim()
  )
    throw new RagError("configuration", "Packaged manifest checksum mismatch.");
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    throw new RagError("configuration", "Invalid packaged manifest JSON.");
  }
  return parseRuntimeManifest(value);
}
export function parseRuntimeManifest(value: unknown): RuntimeManifest {
  if (
    !object(value) ||
    value["schemaVersion"] !== 1 ||
    typeof value["storeId"] !== "string" ||
    !/^vs_[a-zA-Z0-9_-]+$/.test(value["storeId"]) ||
    !digest(value["manifestSha256"]) ||
    !digest(value["taxonomySha256"]) ||
    !Array.isArray(value["papers"]) ||
    !value["papers"].length ||
    value["papers"].length > 1000 ||
    !Array.isArray(value["taxonomy"]) ||
    !value["taxonomy"].length
  )
    throw new RagError("configuration", "Invalid packaged retrieval manifest.");
  const taxonomy: TopicRule[] = [];
  for (const topic of value["taxonomy"] as unknown[]) {
    if (
      !object(topic) ||
      typeof topic["id"] !== "string" ||
      !topic["id"].trim() ||
      !strings(topic["keywords"]) ||
      !strings(topic["mesh"])
    )
      throw new RagError("configuration", "Invalid packaged topic taxonomy.");
    taxonomy.push({
      id: topic["id"],
      keywords: topic["keywords"],
      mesh: topic["mesh"],
      queries: [],
    });
  }
  if (new Set(taxonomy.map((topic) => topic.id)).size !== taxonomy.length)
    throw new RagError("configuration", "Duplicate packaged topic identity.");
  const papers: RuntimePaper[] = [];
  for (const item of value["papers"] as unknown[]) {
    if (
      !object(item) ||
      !object(item["entry"]) ||
      !nullableText(item["fileId"]) ||
      !nullableText(item["title"]) ||
      !(item["fingerprint"] === null || digest(item["fingerprint"]))
    )
      throw new RagError("configuration", "Invalid packaged paper.");
    const e = item["entry"];
    if (
      typeof e["pmid"] !== "string" ||
      !/^[1-9]\d{0,8}$/.test(e["pmid"]) ||
      item["url"] !== `https://pubmed.ncbi.nlm.nih.gov/${e["pmid"]}/` ||
      !studyTypes.some((type) => type === e["studyType"]) ||
      !["human", "animal", "unknown"].includes(String(e["population"])) ||
      ![
        "full-text-retrievable",
        "abstract-only-retrievable",
        "metadata-only",
        "excluded",
      ].includes(String(e["contentScope"])) ||
      !strings(e["topics"]) ||
      !strings(e["warnings"]) ||
      !nullableText(e["license"]) ||
      !(e["sha256"] === null || digest(e["sha256"])) ||
      !(
        e["year"] === null ||
        (typeof e["year"] === "number" && Number.isInteger(e["year"]))
      ) ||
      !(
        e["studyDesignTier"] === null ||
        (typeof e["studyDesignTier"] === "number" &&
          Number.isInteger(e["studyDesignTier"]) &&
          e["studyDesignTier"] >= 1 &&
          e["studyDesignTier"] <= 8)
      ) ||
      ![
        "eligible",
        "retrievalEnabled",
        "retracted",
        "corrected",
        "superseded",
        "expressionOfConcern",
      ].every((key) => typeof e[key] === "boolean") ||
      typeof e["status"] !== "string" ||
      !["upsert", "remove"].includes(String(e["indexAction"]))
    )
      throw new RagError("configuration", "Invalid packaged safety metadata.");
    const studyType = studyTypes.find((type) => type === e["studyType"]);
    const population = (["human", "animal", "unknown"] as const).find(
      (type) => type === e["population"],
    );
    const contentScope = (
      [
        "full-text-retrievable",
        "abstract-only-retrievable",
        "metadata-only",
        "excluded",
      ] as const
    ).find((type) => type === e["contentScope"]);
    const status = CORPUS_STATES.find((state) => state === e["status"]);
    const flag = (key: string): boolean => {
      const field = e[key];
      if (typeof field !== "boolean")
        throw new RagError("configuration", "Invalid packaged flag.");
      return field;
    };
    const year = e["year"],
      tier = e["studyDesignTier"],
      sha = e["sha256"];
    if (
      !studyType ||
      !population ||
      !contentScope ||
      !status ||
      !(year === null || typeof year === "number") ||
      !(tier === null || typeof tier === "number") ||
      !(sha === null || typeof sha === "string")
    )
      throw new RagError("configuration", "Invalid packaged classification.");
    const paper: RuntimePaper = {
      fileId: item["fileId"],
      fingerprint: item["fingerprint"],
      title: item["title"],
      url: `https://pubmed.ncbi.nlm.nih.gov/${e["pmid"]}/`,
      entry: {
        pmid: e["pmid"],
        year,
        studyType,
        studyDesignTier: tier,
        population,
        contentScope,
        license: e["license"],
        topics: e["topics"],
        warnings: e["warnings"],
        eligible: flag("eligible"),
        retrievalEnabled: flag("retrievalEnabled"),
        retracted: flag("retracted"),
        corrected: flag("corrected"),
        superseded: flag("superseded"),
        expressionOfConcern: flag("expressionOfConcern"),
        status,
        indexAction: e["indexAction"] === "upsert" ? "upsert" : "remove",
        sha256: sha,
      },
    };
    if (
      indexable(paper.entry) &&
      (!paper.fileId ||
        !paper.title?.trim() ||
        paper.fingerprint !== fingerprint(paper.entry))
    )
      throw new RagError(
        "configuration",
        "Packaged indexed paper fingerprint is invalid.",
      );
    papers.push(paper);
  }
  if (
    new Set(papers.map((p) => p.entry.pmid)).size !== papers.length ||
    new Set(papers.flatMap((p) => (p.fileId ? [p.fileId] : []))).size !==
      papers.filter((p) => p.fileId).length
  )
    throw new RagError("configuration", "Duplicate packaged paper identity.");
  return {
    schemaVersion: 1,
    storeId: value["storeId"],
    manifestSha256: value["manifestSha256"],
    taxonomySha256: value["taxonomySha256"],
    papers,
    taxonomy,
  };
}
export function runtimeSource(
  manifest: RuntimeManifest,
  search: RetrievalSource["search"],
): RetrievalSource {
  const receipts = new Map(
    manifest.papers.flatMap((paper) =>
      paper.fileId ? [[paper.fileId, paper] as const] : [],
    ),
  );
  return {
    taxonomy: manifest.taxonomy,
    search,
    unchanged: async () => {},
    identity: (hit) => receipts.get(hit.fileId)?.entry.pmid ?? null,
    resolve: async (hit: RemoteHit, filters, threshold) => {
      const paper = receipts.get(hit.fileId);
      if (!paper) return { reason: "unknown-or-unindexed" };
      const entry = paper.entry;
      if (!indexable(entry))
        return { reason: entry.retracted ? "retracted" : "retrieval-disabled" };
      const expected: Attributes = fileAttributes(entry);
      if (
        paper.fingerprint !== fingerprint(entry) ||
        !sameAttributes(hit.attributes, expected)
      )
        return { reason: "stale-metadata-or-hash" };
      if (
        !Number.isFinite(hit.score) ||
        hit.score < threshold ||
        hit.score > 1 ||
        !matchesFilters(entry, filters)
      )
        return { reason: "filter" };
      return {
        candidate: {
          pmid: entry.pmid,
          title: paper.title,
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
  };
}
