import type {
  Author,
  Provenance,
  PublicationStatus,
  PublicationMetadata,
  RelatedArticle,
} from "../shared/article-schema.js";
import { publicationStatus } from "../corpus/publication-status.js";
import { object } from "../shared/config.js";
import { EUTILS_BASE } from "../shared/constants.js";
import { RagError, StorageError, category } from "../shared/logging.js";
import { hash, portablePath, type LocalStore } from "../shared/storage.js";
import {
  child,
  children,
  descendants,
  parseXml,
  text,
  value,
  type XmlNode,
} from "../shared/xml.js";
import { deduplicate, pmcid, pmid } from "../discovery/deduplicate.js";
import type { PubmedClient } from "../discovery/pubmed-client.js";

export interface PubmedRecord {
  pmid: string;
  pmcid: string | null;
  doi: string | null;
  title: string | null;
  journal: string | null;
  publicationDate: string | null;
  year: number | null;
  authors: Author[];
  articleTypes: string[];
  meshTerms: string[];
  abstract: string | null;
  publicationStatus: PublicationStatus;
  publicationMetadata: PublicationMetadata;
}
export interface FetchedPubmed {
  record: PubmedRecord;
  provenance: Provenance;
}

function date(node: XmlNode | undefined): {
  publicationDate: string | null;
  year: number | null;
} {
  const yearText = value(child(node, "Year"));
  const medlineDate = value(child(node, "MedlineDate"));
  const year =
    yearText && /^\d{4}$/.test(yearText)
      ? Number(yearText)
      : medlineDate?.match(/^(\d{4})(?:\s|$)/)?.[1];
  const monthText = value(child(node, "Month"));
  const months = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];
  const numericMonth =
    monthText && /^\d{1,2}$/.test(monthText)
      ? Number(monthText)
      : months.indexOf(monthText?.toLowerCase() ?? "") + 1;
  const day = value(child(node, "Day"));
  let publicationDate = yearText;
  if (publicationDate && numericMonth >= 1 && numericMonth <= 12) {
    publicationDate += `-${String(numericMonth).padStart(2, "0")}`;
    if (day && /^\d{1,2}$/.test(day) && Number(day) >= 1 && Number(day) <= 31)
      publicationDate += `-${day.padStart(2, "0")}`;
  } else if (medlineDate) publicationDate = medlineDate;
  return {
    publicationDate,
    year: year === null || year === undefined ? null : Number(year),
  };
}

function parseRecord(node: XmlNode): PubmedRecord {
  const citation = child(node, "MedlineCitation");
  const article = child(citation, "Article");
  const id = value(child(citation, "PMID"));
  if (!citation || !article || !id)
    throw new RagError(
      "malformed-source",
      "PubMed article identity or structure is missing.",
    );
  const ids = children(
    child(child(node, "PubmedData"), "ArticleIdList"),
    "ArticleId",
  );
  const pmc = value(
    ids.find(
      (item) =>
        item.attributes["IdType"] === "pmc" ||
        item.attributes["IdType"] === "pmcid",
    ),
  );
  const doi =
    value(ids.find((item) => item.attributes["IdType"] === "doi")) ??
    value(
      children(article, "ELocationID").find(
        (item) =>
          item.attributes["EIdType"] === "doi" &&
          item.attributes["ValidYN"] !== "N",
      ),
    );
  const journal = child(article, "Journal");
  const authors = children(child(article, "AuthorList"), "Author").map(
    (author): Author => {
      const collectiveName = value(child(author, "CollectiveName"));
      const givenName =
        value(child(author, "ForeName")) ?? value(child(author, "Initials"));
      const familyName = value(child(author, "LastName"));
      const name =
        collectiveName ?? [givenName, familyName].filter(Boolean).join(" ");
      if (!name)
        throw new RagError("malformed-source", "PubMed author has no name.");
      return { name, givenName, familyName, collectiveName };
    },
  );
  const abstracts = children(child(article, "Abstract"), "AbstractText")
    .map((part) => {
      const body = text(part).trim();
      const label = part.attributes["Label"];
      return body ? (label ? `${label}: ${body}` : body) : "";
    })
    .filter(Boolean);
  const articleTypes = [
    ...new Set(
      children(child(article, "PublicationTypeList"), "PublicationType")
        .map(value)
        .filter((item): item is string => item !== null),
    ),
  ];
  const relationships = children(
    child(citation, "CommentsCorrectionsList"),
    "CommentsCorrections",
  ).map((item): RelatedArticle => {
    const target = value(child(item, "PMID"));
    const type = item.attributes["RefType"];
    if (!type)
      throw new RagError(
        "malformed-source",
        "PubMed relationship type is missing.",
      );
    return {
      pmid: target ? pmid(target) : null,
      type,
      sourcePmid: pmid(id),
      refSource: value(child(item, "RefSource")),
      note: value(child(item, "Note")),
    };
  });
  const historyRetracted =
    descendants(child(node, "PubmedData"), "PubMedPubDate").some(
      (item) => item.attributes["PubStatus"] === "retracted",
    ) ||
    value(child(child(node, "PubmedData"), "PublicationStatus")) ===
      "retracted";
  return {
    pmid: pmid(id),
    pmcid: pmc ? pmcid(pmc) : null,
    doi,
    title: value(child(article, "ArticleTitle")),
    journal: value(child(journal, "Title")),
    ...date(
      child(child(journal, "JournalIssue"), "PubDate") ??
        child(article, "ArticleDate"),
    ),
    authors,
    abstract: abstracts.length ? abstracts.join("\n\n") : null,
    publicationStatus: publicationStatus(
      articleTypes,
      relationships,
      historyRetracted,
    ),
    publicationMetadata: {
      keywords: [
        ...new Set(
          descendants(citation, "Keyword")
            .map(value)
            .filter((item): item is string => item !== null),
        ),
      ],
      meshQualifiers: [
        ...new Set(
          descendants(child(citation, "MeshHeadingList"), "QualifierName")
            .map(value)
            .filter((item): item is string => item !== null),
        ),
      ],
      pubmedPublicationStatus: value(
        child(child(node, "PubmedData"), "PublicationStatus"),
      ),
      retractionHistory: historyRetracted,
    },
    articleTypes,
    meshTerms: [
      ...new Set(
        descendants(child(citation, "MeshHeadingList"), "DescriptorName")
          .map(value)
          .filter((item): item is string => item !== null),
      ),
    ],
  };
}

export function parsePubmedBatch(xml: string): {
  records: Map<string, PubmedRecord>;
  failures: Map<string, unknown>;
} {
  const root = parseXml(xml);
  if (
    root.name !== "PubmedArticleSet" ||
    children(root).some((item) => item.name !== "PubmedArticle")
  ) {
    throw new RagError(
      "malformed-source",
      "Expected PubMed journal article records.",
    );
  }
  const records = new Map<string, PubmedRecord>();
  const failures = new Map<string, unknown>();
  const seen = new Set<string>();
  for (const node of children(root, "PubmedArticle")) {
    const id = pmid(value(child(child(node, "MedlineCitation"), "PMID")) ?? "");
    if (seen.has(id))
      throw new RagError(
        "malformed-source",
        "Duplicate PubMed records in a source response.",
      );
    seen.add(id);
    try {
      records.set(id, parseRecord(node));
    } catch (error) {
      if (!(error instanceof RagError)) throw error;
      failures.set(id, error);
    }
  }
  return { records, failures };
}

export function parsePubmed(xml: string): Map<string, PubmedRecord> {
  const result = parsePubmedBatch(xml);
  if (result.failures.size) throw result.failures.values().next().value;
  return result.records;
}

export async function fetchPubmed(
  client: PubmedClient,
  store: LocalStore,
  requested: string[],
  id: string,
  batchSize: number,
  refresh: boolean,
  options: { cacheOnly?: boolean; failures?: Map<string, unknown> } = {},
): Promise<Map<string, FetchedPubmed>> {
  const result = new Map<string, FetchedPubmed>();
  const pending: string[] = [];
  const cache = new Map<string, ReturnType<typeof parsePubmedBatch>>();
  for (const articleId of deduplicate(requested)) {
    const manifest = refresh
      ? null
      : await store.json(`raw/pubmed/${articleId}.json`);
    if (manifest === null) {
      if (options.cacheOnly)
        throw new StorageError(
          "provenance-file-missing",
          `raw/pubmed/${articleId}.json`,
          "Cached PubMed source reference is missing; no network is permitted.",
        );
      pending.push(articleId);
      continue;
    }
    if (
      !object(manifest) ||
      manifest["api"] !== "pubmed-efetch" ||
      typeof manifest["rawPath"] !== "string" ||
      !/^raw\/pubmed\/batches\/[a-zA-Z0-9-]+\.xml$/.test(
        portablePath(manifest["rawPath"]),
      ) ||
      typeof manifest["sha256"] !== "string" ||
      typeof manifest["retrievedAt"] !== "string" ||
      !Number.isFinite(Date.parse(manifest["retrievedAt"])) ||
      typeof manifest["url"] !== "string" ||
      !manifest["url"].startsWith(`${EUTILS_BASE}efetch.fcgi?db=pubmed&`)
    ) {
      throw new StorageError(
        "record-schema-mismatch",
        `raw/pubmed/${articleId}.json`,
        "Invalid cached PubMed source manifest.",
      );
    }
    const raw = await store.read(manifest["rawPath"]);
    if (raw === null)
      throw new StorageError(
        "raw-source-missing",
        portablePath(manifest["rawPath"]),
        "Cached PubMed source is missing.",
      );
    if (hash(raw) !== manifest["sha256"])
      throw new StorageError(
        "hash-mismatch",
        portablePath(manifest["rawPath"]),
        "Cached PubMed source hash does not match its provenance.",
      );
    let records = cache.get(manifest["rawPath"]);
    if (!records) {
      records = parsePubmedBatch(raw);
      cache.set(manifest["rawPath"], records);
    }
    const failure = records.failures.get(articleId);
    if (failure) {
      if (!options.failures) throw failure;
      options.failures.set(articleId, failure);
      continue;
    }
    const record = records.records.get(articleId);
    if (!record)
      throw new StorageError(
        "record-schema-mismatch",
        portablePath(manifest["rawPath"]),
        "Cached batch lacks its indexed PMID.",
      );
    result.set(articleId, {
      record,
      provenance: {
        api: "pubmed-efetch",
        url: manifest["url"],
        rawPath: portablePath(manifest["rawPath"]),
        sha256: manifest["sha256"],
        retrievedAt: manifest["retrievedAt"],
      },
    });
  }
  async function acquire(
    ids: string[],
    suffix: string,
    retried = false,
  ): Promise<void> {
    const parameters = { db: "pubmed", id: ids.join(","), retmode: "xml" };
    let raw: string;
    try {
      raw = await client.eutils("efetch.fcgi", parameters);
    } catch (error) {
      if (
        !options.failures ||
        !["network", "timeout", "throttled", "http"].includes(category(error))
      )
        throw error;
      for (const articleId of ids) options.failures.set(articleId, error);
      return;
    }
    const url = `${EUTILS_BASE}efetch.fcgi?${new URLSearchParams(parameters)}`;
    const provenance = await store.raw(
      `raw/pubmed/batches/${id}-${suffix}.xml`,
      raw,
      "pubmed-efetch",
      url,
      false,
    );
    let parsed: ReturnType<typeof parsePubmedBatch>;
    try {
      parsed = parsePubmedBatch(raw);
    } catch (error) {
      if (!options.failures || category(error) !== "malformed-source")
        throw error;
      if (!retried) return acquire(ids, `${suffix}-retry`, true);
      if (ids.length > 1) {
        const middle = Math.ceil(ids.length / 2);
        await acquire(ids.slice(0, middle), `${suffix}-left`);
        await acquire(ids.slice(middle), `${suffix}-right`);
      } else options.failures.set(ids[0]!, error);
      return;
    }
    const records = parsed.records;
    if (
      [...records.keys(), ...parsed.failures.keys()].some(
        (key) => !ids.includes(key),
      )
    )
      throw new RagError(
        "malformed-source",
        "PubMed returned an unexpected PMID.",
      );
    for (const articleId of ids) {
      const record = records.get(articleId);
      if (!record) continue;
      if (refresh) await store.archive(`raw/pubmed/${articleId}.json`);
      await store.writeJson(
        `raw/pubmed/${articleId}.json`,
        provenance,
        refresh,
      );
      result.set(articleId, { record, provenance });
    }
    if (parsed.failures.size) {
      if (!options.failures) throw parsed.failures.values().next().value;
      const failedIds = [...parsed.failures.keys()];
      if (!retried && (failedIds.length < ids.length || ids.length === 1))
        await acquire(failedIds, `${suffix}-isolated`, true);
      else if (failedIds.length > 1) {
        const middle = Math.ceil(failedIds.length / 2);
        await acquire(failedIds.slice(0, middle), `${suffix}-left`, true);
        await acquire(failedIds.slice(middle), `${suffix}-right`, true);
      } else
        for (const [articleId, error] of parsed.failures)
          options.failures.set(articleId, error);
    }
  }
  for (let offset = 0; offset < pending.length; offset += batchSize) {
    await acquire(pending.slice(offset, offset + batchSize), String(offset));
  }
  return result;
}
