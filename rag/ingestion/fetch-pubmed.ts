import type { Author, Provenance } from "../shared/article-schema.js";
import { object } from "../shared/config.js";
import { EUTILS_BASE } from "../shared/constants.js";
import { RagError } from "../shared/logging.js";
import { hash, type LocalStore } from "../shared/storage.js";
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
  const ids = descendants(child(node, "PubmedData"), "ArticleId");
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
    articleTypes: [
      ...new Set(
        children(child(article, "PublicationTypeList"), "PublicationType")
          .map(value)
          .filter((item): item is string => item !== null),
      ),
    ],
    meshTerms: [
      ...new Set(
        descendants(child(citation, "MeshHeadingList"), "DescriptorName")
          .map(value)
          .filter((item): item is string => item !== null),
      ),
    ],
  };
}

export function parsePubmed(xml: string): Map<string, PubmedRecord> {
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
  for (const node of children(root, "PubmedArticle")) {
    const record = parseRecord(node);
    if (records.has(record.pmid))
      throw new RagError(
        "malformed-source",
        "Duplicate PubMed records in a source response.",
      );
    records.set(record.pmid, record);
  }
  return records;
}

export async function fetchPubmed(
  client: PubmedClient,
  store: LocalStore,
  requested: string[],
  id: string,
  batchSize: number,
  refresh: boolean,
): Promise<Map<string, FetchedPubmed>> {
  const result = new Map<string, FetchedPubmed>();
  const pending: string[] = [];
  const cache = new Map<string, Map<string, PubmedRecord>>();
  for (const articleId of deduplicate(requested)) {
    const manifest = refresh
      ? null
      : await store.json(`raw/pubmed/${articleId}.json`);
    if (manifest === null) {
      pending.push(articleId);
      continue;
    }
    if (
      !object(manifest) ||
      manifest["api"] !== "pubmed-efetch" ||
      typeof manifest["rawPath"] !== "string" ||
      !/^raw\/pubmed\/batches\/[a-zA-Z0-9-]+\.xml$/.test(manifest["rawPath"]) ||
      typeof manifest["sha256"] !== "string" ||
      typeof manifest["retrievedAt"] !== "string" ||
      !Number.isFinite(Date.parse(manifest["retrievedAt"])) ||
      typeof manifest["url"] !== "string" ||
      !manifest["url"].startsWith(`${EUTILS_BASE}efetch.fcgi?db=pubmed&`)
    ) {
      throw new RagError("storage", "Invalid cached PubMed source manifest.");
    }
    const raw = await store.read(manifest["rawPath"]);
    if (raw === null || hash(raw) !== manifest["sha256"])
      throw new RagError(
        "storage",
        "Cached PubMed source is missing or changed.",
      );
    let records = cache.get(manifest["rawPath"]);
    if (!records) {
      records = parsePubmed(raw);
      cache.set(manifest["rawPath"], records);
    }
    const record = records.get(articleId);
    if (!record)
      throw new RagError("storage", "Cached batch lacks its indexed PMID.");
    result.set(articleId, {
      record,
      provenance: {
        api: "pubmed-efetch",
        url: manifest["url"],
        rawPath: manifest["rawPath"],
        sha256: manifest["sha256"],
        retrievedAt: manifest["retrievedAt"],
      },
    });
  }
  for (let offset = 0; offset < pending.length; offset += batchSize) {
    const ids = pending.slice(offset, offset + batchSize);
    const parameters = { db: "pubmed", id: ids.join(","), retmode: "xml" };
    const raw = await client.eutils("efetch.fcgi", parameters);
    const url = `${EUTILS_BASE}efetch.fcgi?${new URLSearchParams(parameters)}`;
    const provenance = await store.raw(
      `raw/pubmed/batches/${id}-${offset}.xml`,
      raw,
      "pubmed-efetch",
      url,
      false,
    );
    const records = parsePubmed(raw);
    if ([...records.keys()].some((key) => !ids.includes(key)))
      throw new RagError(
        "malformed-source",
        "PubMed returned an unexpected PMID.",
      );
    for (const articleId of ids) {
      const record = records.get(articleId);
      if (!record) continue;
      await store.writeJson(
        `raw/pubmed/${articleId}.json`,
        provenance,
        refresh,
      );
      result.set(articleId, { record, provenance });
    }
  }
  return result;
}
