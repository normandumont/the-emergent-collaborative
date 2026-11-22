import type { Config } from "../shared/config.js";
import { object } from "../shared/config.js";
import type { CorpusState, Provenance } from "../shared/article-schema.js";
import { hash, isCorpusState, type LocalStore } from "../shared/storage.js";
import { RagError, StorageError, category, log } from "../shared/logging.js";
import { stableJson } from "../shared/json.js";
export { stableJson } from "../shared/json.js";
import { PubmedClient } from "../discovery/pubmed-client.js";
import { fetchPubmed, type FetchedPubmed } from "../ingestion/fetch-pubmed.js";
import { fetchPmc } from "../ingestion/fetch-pmc.js";
import { normalize } from "../ingestion/normalize.js";
import {
  publicationStatus,
  incomingRelationships,
} from "./publication-status.js";
import { loadCorpusConfig } from "./config.js";
import { classifyArticle } from "./classification.js";
import { evaluateCorpus } from "./policy.js";
import { disableManifest } from "./manifest.js";
import { retrievalDocument } from "./documents.js";
import type {
  CorpusConfig,
  CorpusDecision,
  ManifestEntry,
  RetrievalManifest,
} from "./schema.js";

function lifecycle(
  previous: CorpusDecision | null,
  status: CorpusState,
  corrected: boolean,
  at: string,
  dates?: { discovered: string; ingested: string; normalized: string },
): CorpusDecision["lifecycle"] {
  const initial: CorpusDecision["lifecycle"] =
    !previous && dates
      ? [
          { state: "discovered", at: dates.discovered },
          { state: "ingested", at: dates.ingested },
          { state: "normalized", at: dates.normalized },
        ]
      : [];
  const states: CorpusState[] = [];
  if (
    corrected &&
    !previous?.lifecycle.some((event) => event.state === "corrected")
  )
    states.push("corrected");
  if (status === "active") states.push("eligible");
  states.push(status);
  return [
    ...(previous?.lifecycle ?? initial),
    ...states.map((state) => ({ state, at })),
  ];
}

function parseDecision(
  data: unknown,
  dependency: string,
): CorpusDecision | null {
  if (data === null) return null;
  const digest = (item: unknown): item is string =>
    typeof item === "string" && /^[a-f0-9]{64}$/.test(item);
  const list = (item: unknown): item is string[] =>
    Array.isArray(item) && item.every((value) => typeof value === "string");
  if (
    !object(data) ||
    data["dependencySha256"] !== dependency ||
    typeof data["evaluatedAt"] !== "string" ||
    !Number.isFinite(Date.parse(data["evaluatedAt"])) ||
    !Array.isArray(data["lifecycle"]) ||
    typeof data["pmid"] !== "string" ||
    !/^[1-9]\d{0,8}$/.test(data["pmid"]) ||
    typeof data["policyVersion"] !== "number" ||
    !digest(data["policySha256"]) ||
    !digest(data["taxonomySha256"]) ||
    !digest(data["normalizedRecordSha256"]) ||
    !digest(data["baseNormalizedSha256"]) ||
    !digest(data["dependencySha256"]) ||
    typeof data["eligible"] !== "boolean" ||
    typeof data["retrievalEnabled"] !== "boolean" ||
    !isCorpusState(data["status"]) ||
    !list(data["reasons"]) ||
    !list(data["warnings"]) ||
    (data["contentScope"] !== "full-text-retrievable" &&
      data["contentScope"] !== "abstract-only-retrievable" &&
      data["contentScope"] !== "metadata-only" &&
      data["contentScope"] !== "excluded")
  )
    throw new RagError("storage", "Invalid cached corpus decision.");
  const events: CorpusDecision["lifecycle"] = [];
  for (const event of data["lifecycle"] as unknown[]) {
    if (
      !object(event) ||
      !isCorpusState(event["state"]) ||
      typeof event["at"] !== "string" ||
      !Number.isFinite(Date.parse(event["at"]))
    )
      throw new RagError("storage", "Invalid corpus lifecycle history.");
    events.push({ state: event["state"], at: event["at"] });
  }
  return {
    pmid: data["pmid"],
    evaluatedAt: data["evaluatedAt"],
    policyVersion: data["policyVersion"],
    policySha256: data["policySha256"],
    taxonomySha256: data["taxonomySha256"],
    normalizedRecordSha256: data["normalizedRecordSha256"],
    baseNormalizedSha256: data["baseNormalizedSha256"],
    dependencySha256: data["dependencySha256"],
    eligible: data["eligible"],
    retrievalEnabled: data["retrievalEnabled"],
    status: data["status"],
    contentScope: data["contentScope"],
    reasons: data["reasons"],
    warnings: data["warnings"],
    lifecycle: events,
  };
}

function checkNormalized(data: unknown, id: string): void {
  if (object(data) && data["schemaVersion"] !== 1)
    throw new StorageError(
      "unsupported-record-version",
      `normalized/${id}.json`,
      "Unsupported normalized record version.",
    );
  if (
    !object(data) ||
    data["schemaVersion"] !== 1 ||
    !object(data["identity"]) ||
    data["identity"]["pmid"] !== id ||
    !object(data["citation"]) ||
    !object(data["classification"]) ||
    !object(data["content"]) ||
    !object(data["source"]) ||
    !Array.isArray(data["source"]["provenance"]) ||
    !object(data["status"]) ||
    data["status"]["normalized"] !== true
  )
    throw new StorageError(
      "record-schema-mismatch",
      `normalized/${id}.json`,
      "Invalid input normalized record.",
    );
}

export async function prepareCorpus(
  store: LocalStore,
  config: Config,
  supplied?: CorpusConfig,
): Promise<{ manifest: RetrievalManifest; errors: number; changed: number }> {
  const previous = await disableManifest(store, "preparation-in-progress");
  const corpus = supplied ?? (await loadCorpusConfig());
  const catalog = await store.catalog();
  const client = new PubmedClient(config, async () => {
    throw new RagError(
      "storage",
      "Corpus preparation requires cached source records; run ingestion first.",
    );
  });
  const records = new Map<string, FetchedPubmed>();
  const failures = new Map<string, unknown>();
  const ids = Object.keys(catalog.articles).sort();
  for (const id of ids) {
    const base = await store.read(`normalized/${id}.json`);
    const source = await store.read(`raw/pubmed/${id}.json`);
    const old = previous?.entries.find((item) => item.pmid === id);
    const previouslyIngested =
      old &&
      (old.baseNormalizedSha256 !== hash("") ||
        old.normalizedRecordSha256 !== hash(""));
    // Discovery alone does not establish an ingested relationship source.
    // Damaged existing sources and historical records still fail closed.
    if (
      base === null &&
      source === null &&
      !previouslyIngested &&
      catalog.articles[id]?.status !== "normalized"
    )
      continue;
    try {
      const result = await fetchPubmed(
        client,
        store,
        [id],
        "corpus-cache-only",
        config.batchSize,
        false,
        { cacheOnly: true },
      );
      const record = result.get(id);
      if (!record)
        throw new StorageError(
          "record-schema-mismatch",
          `raw/pubmed/${id}.json`,
          "Cached source lacks its PMID.",
        );
      records.set(id, record);
    } catch (error) {
      failures.set(id, error);
    }
  }
  await store.immutable(
    `corpus/policies/${corpus.policySha256}.json`,
    corpus.policyText,
  );
  await store.immutable(
    `corpus/taxonomies/${corpus.taxonomySha256}.json`,
    corpus.taxonomyText,
  );
  const manifest: RetrievalManifest = {
    schemaVersion: 1,
    policyVersion: corpus.policy.policyVersion,
    policySha256: corpus.policySha256,
    taxonomySha256: corpus.taxonomySha256,
    entries: [],
  };
  let errors = 0;
  let changed = 0;
  for (const id of ids) {
    const entry = catalog.articles[id];
    if (!entry)
      throw new RagError("storage", "Catalog changed during preparation.");
    const old = previous?.entries.find((item) => item.pmid === id);
    const base = await store.read(`normalized/${id}.json`);
    if (base === null && entry.status === "discovered" && !old) continue;
    const baseSha = hash(base ?? "");
    let reference = `normalized/${id}.json`;
    try {
      if (failures.has(id)) throw failures.get(id);
      if (base === null)
        throw new StorageError(
          "normalized-record-missing",
          reference,
          "No successfully normalized record exists; acquisition must complete first.",
        );
      if (failures.size)
        throw new StorageError(
          "relationship-inventory-incomplete",
          `raw/pubmed/${failures.keys().next().value}.json`,
          "A previously ingested cached source is damaged; retrieval remains disabled until it is repaired.",
        );
      checkNormalized(await store.json(`normalized/${id}.json`), id);
      const pubmed = records.get(id);
      if (!pubmed)
        throw new StorageError(
          "provenance-file-missing",
          `raw/pubmed/${id}.json`,
          "Missing PubMed source cache.",
        );
      const incoming = incomingRelationships(
        id,
        [...records.values()].map((item) => item.record),
      );
      const supporting: Provenance[] = [];
      for (const relation of incoming) {
        const failedNotice = failures.get(relation.sourcePmid);
        if (failedNotice) throw failedNotice;
        const source = records.get(relation.sourcePmid)?.provenance;
        if (source && !supporting.some((item) => item.sha256 === source.sha256))
          supporting.push(source);
      }
      reference = pubmed.record.pmcid
        ? `raw/pmc/${pubmed.record.pmcid}.metadata.xml`
        : `raw/pubmed/${id}.json`;
      const pmc = await fetchPmc(
        client,
        store,
        pubmed.record.pmcid,
        id,
        false,
        true,
      );
      const normalized = normalize(
        pubmed,
        pmc,
        config.rules,
        entry.topics,
        entry.queryIds,
      );
      normalized.publicationStatus = publicationStatus(
        pubmed.record.articleTypes,
        [...pubmed.record.publicationStatus.relationships, ...incoming],
        pubmed.record.publicationMetadata.retractionHistory,
      );
      if (old) {
        reference = `corpus/versions/${id}/${old.normalizedRecordSha256}.json`;
        const historical = await store.read(
          `corpus/versions/${id}/${old.normalizedRecordSha256}.json`,
        );
        if (historical === null && old.normalizedRecordSha256 !== hash(""))
          throw new StorageError(
            "version-record-missing",
            reference,
            "Historical governed record is missing.",
          );
        if (historical !== null) {
          if (hash(historical) !== old.normalizedRecordSha256)
            throw new StorageError(
              "hash-mismatch",
              reference,
              "Historical governed record hash mismatch.",
            );
          const record = await store.json(
            `corpus/versions/${id}/${old.normalizedRecordSha256}.json`,
          );
          if (!object(record) || !object(record["publicationStatus"]))
            throw new RagError(
              "storage",
              "Historical publication status is invalid.",
            );
          const prior = record["publicationStatus"];
          for (const flag of [
            "retracted",
            "expressionOfConcern",
            "superseded",
            "duplicatePublication",
          ] as const) {
            if (typeof prior[flag] !== "boolean")
              throw new RagError(
                "storage",
                "Historical publication flag is invalid.",
              );
            normalized.publicationStatus[flag] ||= prior[flag];
          }
        }
        normalized.publicationStatus.retracted ||= old.retracted;
        normalized.publicationStatus.expressionOfConcern ||=
          old.expressionOfConcern;
        normalized.publicationStatus.superseded ||= old.superseded;
      }
      normalized.source.provenance.push(
        ...supporting.filter(
          (source) =>
            !normalized.source.provenance.some(
              (existing) => existing.sha256 === source.sha256,
            ),
        ),
      );
      const article = classifyArticle(
        { ...normalized, publicationStatus: normalized.publicationStatus },
        corpus.topics,
      );
      const normalizedText = stableJson(article);
      const normalizedSha = hash(normalizedText);
      const result = evaluateCorpus(
        article,
        corpus.policy,
        config.queries.map((query) => query.id),
        entry.status,
      );
      const dependency = hash(
        stableJson({
          normalizedSha,
          baseSha,
          result,
          policySha: corpus.policySha256,
          taxonomySha: corpus.taxonomySha256,
        }),
      );
      const decisionPath = `corpus/decisions/${id}/${dependency}.json`;
      reference = decisionPath;
      const cached = parseDecision(await store.json(decisionPath), dependency);
      const prior = old
        ? parseDecision(
            await store.json(old.decisionPath),
            old.dependencySha256,
          )
        : null;
      const evaluatedAt = cached?.evaluatedAt ?? new Date().toISOString();
      const decision: CorpusDecision = {
        pmid: id,
        evaluatedAt,
        policyVersion: corpus.policy.policyVersion,
        policySha256: corpus.policySha256,
        taxonomySha256: corpus.taxonomySha256,
        normalizedRecordSha256: normalizedSha,
        baseNormalizedSha256: baseSha,
        dependencySha256: dependency,
        ...result,
        lifecycle:
          cached?.lifecycle ??
          lifecycle(
            prior,
            result.status,
            article.publicationStatus.corrected,
            evaluatedAt,
            {
              discovered: entry.firstDiscoveredAt,
              ingested: pubmed.provenance.retrievedAt,
              normalized: entry.lastIngestedAt ?? pubmed.provenance.retrievedAt,
            },
          ),
      };
      if (cached && stableJson(cached) !== stableJson(decision))
        throw new RagError(
          "storage",
          "Cached corpus decision differs from policy evaluation.",
        );
      await store.immutable(
        `corpus/versions/${id}/${normalizedSha}.json`,
        normalizedText,
      );
      await store.immutable(decisionPath, stableJson(decision));
      await store.versionedJson(
        `corpus/decisions/${id}/current.json`,
        decision,
      );
      let documentHash: string | null = null;
      if (decision.retrievalEnabled) {
        reference = `retrieval/${id}.md`;
        const document = retrievalDocument(article, decision);
        documentHash = hash(document);
        await store.immutable(
          `retrieval/versions/${id}/${documentHash}.md`,
          document,
        );
        const existing = await store.read(`retrieval/${id}.md`);
        if (existing !== document) {
          await store.archive(`retrieval/${id}.md`);
          await store.write(`retrieval/${id}.md`, document, true);
        }
      }
      const item: ManifestEntry = {
        pmid: id,
        path: documentHash ? `${id}.md` : null,
        sha256: documentHash,
        ...result,
        studyType: article.classification.studyType,
        studyDesignTier: article.classification.studyDesignTier,
        population: article.classification.population,
        topics: article.classification.topics,
        year: article.citation.year,
        hasFullText: article.status.hasFullText && article.source.reuseAllowed,
        retracted: article.publicationStatus.retracted,
        corrected: article.publicationStatus.corrected,
        expressionOfConcern: article.publicationStatus.expressionOfConcern,
        superseded: article.publicationStatus.superseded,
        license: article.source.license?.id ?? null,
        policyVersion: corpus.policy.policyVersion,
        policySha256: corpus.policySha256,
        normalizedRecordSha256: normalizedSha,
        baseNormalizedSha256: baseSha,
        sourceSha256: article.source.provenance.map((source) => source.sha256),
        decisionPath,
        dependencySha256: dependency,
        reindexRequired: true,
        indexAction: result.retrievalEnabled ? "upsert" : "remove",
      };
      manifest.entries.push(item);
      catalog.articles[id] = {
        ...entry,
        corpus: {
          state: result.status,
          decisionPath,
          retrievalEnabled: result.retrievalEnabled,
        },
      };
      if (old?.dependencySha256 !== dependency || old?.sha256 !== documentHash)
        changed++;
    } catch (error) {
      errors++;
      const diagnostic =
        error instanceof StorageError
          ? error
          : new StorageError(
              reference.startsWith("retrieval/")
                ? "retrieval-path-error"
                : "record-schema-mismatch",
              reference,
              error instanceof RagError
                ? error.message
                : "Preparation failed at the referenced local processing stage.",
            );
      const at = new Date().toISOString();
      const dependency = hash(
        stableJson({
          id,
          baseSha,
          policySha: corpus.policySha256,
          taxonomySha: corpus.taxonomySha256,
          oldNormalizedSha: old?.normalizedRecordSha256 ?? null,
          error: category(error),
          failureCode: diagnostic.failureCode,
          reference: diagnostic.reference,
        }),
      );
      const decisionPath = `corpus/decisions/${id}/${dependency}.json`;
      const cached = parseDecision(await store.json(decisionPath), dependency);
      const failure: CorpusDecision = {
        pmid: id,
        evaluatedAt: cached?.evaluatedAt ?? at,
        policyVersion: corpus.policy.policyVersion,
        policySha256: corpus.policySha256,
        taxonomySha256: corpus.taxonomySha256,
        normalizedRecordSha256: old?.normalizedRecordSha256 ?? hash(""),
        baseNormalizedSha256: baseSha,
        dependencySha256: dependency,
        eligible: false,
        retrievalEnabled: false,
        status: "error",
        contentScope: "excluded",
        reasons: [
          `preparation-error:${category(error)}`,
          `technical-error:${diagnostic.failureCode}`,
          `technical-reference:${diagnostic.reference}`,
        ],
        warnings: [],
        lifecycle: cached?.lifecycle ?? lifecycle(null, "error", false, at),
      };
      await store.immutable(decisionPath, stableJson(failure));
      await store.versionedJson(`corpus/decisions/${id}/current.json`, failure);
      manifest.entries.push({
        pmid: id,
        path: null,
        sha256: null,
        eligible: false,
        retrievalEnabled: false,
        status: "error",
        contentScope: "excluded",
        studyType: old?.studyType ?? "unknown",
        studyDesignTier: old?.studyDesignTier ?? null,
        population: old?.population ?? "unknown",
        topics: old?.topics ?? [],
        year: old?.year ?? null,
        hasFullText: false,
        license: old?.license ?? null,
        retracted: old?.retracted ?? false,
        corrected: old?.corrected ?? false,
        expressionOfConcern: old?.expressionOfConcern ?? false,
        superseded: old?.superseded ?? false,
        policyVersion: corpus.policy.policyVersion,
        policySha256: corpus.policySha256,
        normalizedRecordSha256: failure.normalizedRecordSha256,
        baseNormalizedSha256: baseSha,
        sourceSha256: old?.sourceSha256 ?? [],
        decisionPath,
        dependencySha256: dependency,
        reasons: failure.reasons,
        warnings: [],
        reindexRequired: true,
        indexAction: "remove",
      });
      catalog.articles[id] = {
        ...entry,
        corpus: { state: "error", decisionPath, retrievalEnabled: false },
      };
      log({
        pmid: id,
        status: "corpus-preparation-error",
        category: category(error),
        failureCode: diagnostic.failureCode,
        reference: diagnostic.reference,
        description: diagnostic.message,
      });
    }
  }
  // Keep tombstones even if a catalog record was removed externally.
  for (const old of previous?.entries ?? [])
    if (!ids.includes(old.pmid))
      manifest.entries.push({
        ...old,
        eligible: false,
        retrievalEnabled: false,
        status: "retrieval-disabled",
        path: null,
        sha256: null,
        reasons: [
          ...new Set([...old.reasons, "catalog-record-missing"]),
        ].sort(),
        indexAction: "remove",
        reindexRequired: true,
      });
  manifest.entries.sort((a, b) => a.pmid.localeCompare(b.pmid));
  await store.saveCatalog(catalog);
  await store.versionedJson("retrieval/manifest.json", manifest);
  return { manifest, errors, changed };
}
