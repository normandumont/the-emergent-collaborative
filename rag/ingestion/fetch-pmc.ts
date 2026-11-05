import type { ArticleSection, Provenance } from "../shared/article-schema.js";
import { RagError } from "../shared/logging.js";
import { type LocalStore } from "../shared/storage.js";
import {
  child,
  children,
  parseXml,
  text,
  value,
  type XmlNode,
} from "../shared/xml.js";
import { pmcid } from "../discovery/deduplicate.js";
import type { PubmedClient } from "../discovery/pubmed-client.js";
import { decideLicense, type LicenseDecision } from "./licensing.js";

export interface PmcRecord {
  article: XmlNode | null;
  sets: string[];
  unavailableReason: string | null;
}
export interface FetchedPmc extends LicenseDecision {
  sections: ArticleSection[];
  provenance: Provenance[];
  hasFullText: boolean;
}

export function parsePmc(
  xml: string,
  expectedPmcid: string,
  expectedPmid: string,
): PmcRecord {
  const root = parseXml(xml);
  if (root.name !== "OAI-PMH")
    throw new RagError("malformed-source", "Expected a PMC OAI-PMH response.");
  const error = child(root, "error");
  if (error) {
    const code = error.attributes["code"];
    if (
      code === "idDoesNotExist" ||
      code === "cannotDisseminateFormat" ||
      code === "noRecordsMatch"
    )
      return { article: null, sets: [], unavailableReason: `pmc-${code}` };
    throw new RagError(
      "malformed-source",
      "PMC OAI returned an unexpected protocol error.",
    );
  }
  const record = child(child(root, "GetRecord"), "record");
  const header = child(record, "header");
  if (
    !record ||
    !header ||
    value(child(header, "identifier")) !==
      `oai:pubmedcentral.nih.gov:${pmcid(expectedPmcid).slice(3)}`
  )
    throw new RagError("malformed-source", "PMC OAI identity mismatch.");
  if (header.attributes["status"] === "deleted")
    return { article: null, sets: [], unavailableReason: "pmc-record-deleted" };
  const article = child(child(record, "metadata"), "article");
  const meta = child(child(article, "front"), "article-meta");
  if (!article || !meta)
    throw new RagError(
      "malformed-source",
      "PMC article front matter is missing.",
    );
  const ids = children(meta, "article-id");
  const pmc = value(
    ids.find((item) =>
      ["pmc", "pmcid"].includes(item.attributes["pub-id-type"] ?? ""),
    ),
  );
  const pmid = value(
    ids.find((item) => item.attributes["pub-id-type"] === "pmid"),
  );
  if (
    !pmc ||
    (pmc.startsWith("PMC") ? pmc : `PMC${pmc}`) !== expectedPmcid ||
    (pmid !== null && pmid !== expectedPmid)
  )
    throw new RagError("malformed-source", "PMC article identity mismatch.");
  return {
    article,
    sets: children(header, "setSpec")
      .map(value)
      .filter((item): item is string => item !== null),
    unavailableReason: null,
  };
}

function sectionKind(heading: string | null): ArticleSection["kind"] {
  const name = heading?.toLowerCase().replace(/^[\d.\s]+/, "") ?? "";
  if (/^introduction\b/.test(name)) return "introduction";
  if (/^background\b/.test(name)) return "background";
  if (/\bmethods\b/.test(name)) return "methods";
  if (/^results\b/.test(name)) return "results";
  if (/^discussion\b/.test(name)) return "discussion";
  if (/^conclusions?\b/.test(name)) return "conclusions";
  if (/^limitations?\b/.test(name)) return "limitations";
  return "other";
}

function paragraphs(node: XmlNode): string[] {
  return children(node).flatMap((item) => {
    if (
      item.name === "sec" ||
      [
        "title",
        "table-wrap",
        "fig",
        "supplementary-material",
        "ref-list",
      ].includes(item.name)
    )
      return [];
    if (item.name === "p") return [text(item).trim()].filter(Boolean);
    if (item.name === "list-item") {
      const nested = paragraphs(item);
      return nested.length ? nested : [text(item).trim()].filter(Boolean);
    }
    return paragraphs(item);
  });
}

export function parseSections(article: XmlNode): ArticleSection[] {
  const body = child(article, "body");
  if (!body) return [];
  function sections(node: XmlNode, includeSelf: boolean): ArticleSection[] {
    const result: ArticleSection[] = [];
    const heading = value(child(node, "title"));
    const prose = paragraphs(node).join("\n\n");
    if (prose)
      result.push({
        heading: includeSelf ? heading : null,
        kind: includeSelf ? sectionKind(heading) : "other",
        text: prose,
      });
    for (const section of children(node, "sec"))
      result.push(...sections(section, true));
    return result;
  }
  return sections(body, false);
}

export async function fetchPmc(
  client: PubmedClient,
  store: LocalStore,
  id: string | null,
  articleId: string,
  refresh: boolean,
): Promise<FetchedPmc> {
  if (!id)
    return {
      license: null,
      reuseAllowed: false,
      reason: "no-pmcid",
      sections: [],
      provenance: [],
      hasFullText: false,
    };
  pmcid(id);
  const metadataPath = `raw/pmc/${id}.metadata.xml`;
  const metadataUrl = client.oaiUrl(id, "pmc_fm");
  const cached = refresh ? null : await store.read(metadataPath);
  const raw = cached ?? (await client.oai(id, "pmc_fm"));
  const provenance = [
    await store.raw(
      metadataPath,
      raw,
      "pmc-front-matter",
      metadataUrl,
      refresh,
    ),
  ];
  const metadata = parsePmc(raw, id, articleId);
  if (!metadata.article)
    return {
      license: null,
      reuseAllowed: false,
      reason: metadata.unavailableReason,
      sections: [],
      provenance,
      hasFullText: false,
    };
  const decision = decideLicense(metadata.article, metadata.sets, metadataUrl);
  if (!decision.reuseAllowed)
    return { ...decision, sections: [], provenance, hasFullText: false };

  const fullPath = `raw/pmc/${id}.xml`;
  const fullUrl = client.oaiUrl(id, "pmc");
  const cachedFull = refresh ? null : await store.read(fullPath);
  const full = cachedFull ?? (await client.oai(id, "pmc"));
  const fullRecord = parsePmc(full, id, articleId);
  if (!fullRecord.article)
    return {
      ...decision,
      reuseAllowed: false,
      reason: fullRecord.unavailableReason,
      sections: [],
      provenance,
      hasFullText: false,
    };
  const verified = decideLicense(fullRecord.article, fullRecord.sets, fullUrl);
  if (!verified.reuseAllowed || verified.license?.id !== decision.license?.id)
    return {
      ...decision,
      reuseAllowed: false,
      reason: "full-text-license-mismatch",
      sections: [],
      provenance,
      hasFullText: false,
    };
  const sections = parseSections(fullRecord.article);
  provenance.push(
    await store.raw(fullPath, full, "pmc-full-text", fullUrl, refresh),
  );
  return {
    ...decision,
    sections,
    provenance,
    hasFullText: sections.length > 0,
    reason: sections.length ? null : "no-extractable-body-prose",
  };
}
