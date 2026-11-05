import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { config, fixture } from "./helpers.mjs";
import {
  parseRegistry,
  selectQuery,
  loadConfig,
} from "../lib/shared/config.js";
import { deduplicate } from "../lib/discovery/deduplicate.js";
import { parseSearch } from "../lib/discovery/pubmed-search.js";
import { parsePubmed } from "../lib/ingestion/fetch-pubmed.js";
import { parsePmc, parseSections } from "../lib/ingestion/fetch-pmc.js";
import { decideLicense } from "../lib/ingestion/licensing.js";
import {
  normalize,
  population,
  studyType,
} from "../lib/ingestion/normalize.js";
import { parseXml } from "../lib/shared/xml.js";
import { argumentsFor } from "../lib/scripts/cli.js";
import { log } from "../lib/shared/logging.js";

test("controlled registry includes all eight queries and rejects duplicates, unknown tags and invalid caps", async () => {
  const cfg = await config();
  assert.equal(cfg.queries.length, 8);
  assert.equal(selectQuery(cfg, "pd_exercise", 10).limit, 10);
  const topics = JSON.parse(
    await readFile(new URL("../config/topics.json", import.meta.url), "utf8"),
  );
  for (const queries of [
    [...cfg.queries, cfg.queries[0]],
    [{ ...cfg.queries[0], topics: ["unapproved"] }],
    [{ ...cfg.queries[0], maxResults: 101 }],
    [{ ...cfg.queries[0], enabled: "yes" }],
  ])
    assert.throws(() => parseRegistry(queries, topics, cfg.rules), {
      category: "configuration",
    });
  assert.throws(() => selectQuery(cfg, "unapproved", 1));
  assert.throws(() => selectQuery(cfg, "pd_exercise", 101));
  assert.throws(() =>
    selectQuery(
      {
        ...cfg,
        queries: cfg.queries.map((query) => ({ ...query, enabled: false })),
      },
      "pd_exercise",
    ),
  );
});

test("environment limits remain conservative, key optional, malformed configuration fails", async () => {
  assert.equal((await loadConfig({})).requestsPerSecond, 3);
  assert.equal(
    (
      await loadConfig({
        NCBI_API_KEY: "fixture",
        NCBI_REQUESTS_PER_SECOND: "10",
      })
    ).requestsPerSecond,
    10,
  );
  for (const env of [
    { NCBI_REQUESTS_PER_SECOND: "4" },
    { NCBI_API_KEY: "fixture", NCBI_REQUESTS_PER_SECOND: "11" },
    { NCBI_BATCH_SIZE: "0" },
    { NCBI_EMAIL: "invalid" },
    { NCBI_TOOL: "has spaces" },
  ])
    await assert.rejects(loadConfig(env), { category: "configuration" });
});

test("PMID deduplication and CLI arguments fail closed", () => {
  assert.deepEqual(deduplicate(["10001", "10001", "10002"]), [
    "10001",
    "10002",
  ]);
  for (const id of ["../10001", "0", "abc", "01", ""])
    assert.throws(() => deduplicate([id]));
  assert.deepEqual(
    argumentsFor("ingest-query", ["pd_exercise", "--limit", "10", "--refresh"]),
    { positional: ["pd_exercise"], limit: 10, refresh: true },
  );
  for (const args of [
    ["pd_exercise", "--limit"],
    ["pd_exercise", "--unknown"],
    ["pd_exercise", "--limit", "10", "--limit", "9"],
  ])
    assert.throws(() => argumentsFor("search", args));
  assert.throws(() => argumentsFor("search", ["pd_exercise", "--refresh"]));
  assert.throws(() => argumentsFor("status", ["--refresh"]));
});

test("ESearch parser rejects malformed, provider errors, nonnumeric IDs and absent history", () => {
  for (const data of [
    "not JSON",
    '{"error":"provider error"}',
    '{"esearchresult":{"count":"5"}}',
    '{"esearchresult":{"count":"1","idlist":["x"],"webenv":"w","querykey":"1"}}',
  ])
    assert.throws(() => parseSearch(data), { category: "malformed-source" });
  assert.equal(
    parseSearch(
      '{"esearchresult":{"count":"0","idlist":[],"webenv":"w","querykey":"1"}}',
    ).totalMatches,
    0,
  );
});

test("PubMed metadata retains mixed text, DOI, PMCID, date precision, authors, publication types and MeSH", async () => {
  const records = parsePubmed(await fixture("pubmed.xml"));
  const first = records.get("10001");
  assert.equal(first.title, "A synthetic exercise study & its follow-up");
  assert.equal(
    first.abstract,
    "BACKGROUND: Authored fixture background.\n\nRESULTS: A mixed text fixture.",
  );
  assert.equal(first.pmcid, "PMC20001");
  assert.equal(first.doi, "10.0000/fixture.1");
  assert.equal(first.publicationDate, "2025-10-07");
  assert.deepEqual(first.meshTerms, ["Parkinson Disease", "Humans"]);
  assert.equal(first.authors[1].collectiveName, "Fixture Research Group");
  assert.equal(records.get("10003").doi, "10.0000/fixture.3");
  assert.equal(records.get("10003").publicationDate, "2024 Winter");
  assert.equal(records.get("10003").year, 2024);
});

test("missing abstract, date, authors and identifiers stay unknown rather than fabricated", async () => {
  const record = parsePubmed(await fixture("pubmed.xml")).get("10002");
  for (const field of [
    "abstract",
    "doi",
    "pmcid",
    "title",
    "journal",
    "publicationDate",
    "year",
  ])
    assert.equal(record[field], null);
  assert.deepEqual(record.authors, []);
});

test("deterministic classification uses publication precedence and explicit population metadata only", async () => {
  const { rules } = await config();
  for (const [types, expected] of [
    [["Clinical Trial", "Randomized Controlled Trial"], "rct"],
    [["Systematic Review", "Meta-Analysis"], "meta-analysis"],
    [["Systematic Review"], "systematic-review"],
    [["Clinical Trial, Phase II"], "clinical-trial"],
    [["Observational Study"], "unknown"],
  ])
    assert.equal(studyType(types, rules), expected);
  for (const [mesh, expected] of [
    [["Humans"], "human"],
    [["Animals"], "animal"],
    [["Humans", "Animals"], "unknown"],
    [[], "unknown"],
  ])
    assert.equal(population(mesh, rules), expected);
});

test("malformed XML, entities, unexpected roots and duplicate PubMed identities are rejected", async () => {
  const raw = await fixture("pubmed.xml");
  for (const xml of [
    "<a>",
    "<html/>",
    '<!DOCTYPE a [<!ENTITY x "danger">]><a>&x;</a>',
    raw.replace("10002", "10001"),
  ])
    assert.throws(() => parsePubmed(xml), { category: "malformed-source" });
  assert.throws(() => parseXml("<a/><b/>"), { category: "malformed-source" });
});

test("PMC parsing verifies OAI, PMCID and optional PMID identity, and handles unavailable/deleted records", async () => {
  const xml = await fixture("pmc-metadata.xml");
  assert.ok(parsePmc(xml, "PMC20001", "10001").article);
  assert.throws(() => parsePmc(xml, "PMC20002", "10001"), {
    category: "malformed-source",
  });
  assert.throws(() => parsePmc(xml, "PMC20001", "10002"), {
    category: "malformed-source",
  });
  assert.equal(
    parsePmc(
      xml.replace("<header>", '<header status="deleted">'),
      "PMC20001",
      "10001",
    ).unavailableReason,
    "pmc-record-deleted",
  );
  assert.equal(
    parsePmc(
      '<OAI-PMH><error code="idDoesNotExist">Unavailable</error></OAI-PMH>',
      "PMC20001",
      "10001",
    ).unavailableReason,
    "pmc-idDoesNotExist",
  );
  assert.throws(() =>
    parsePmc(
      '<OAI-PMH><error code="badArgument">Bad</error></OAI-PMH>',
      "PMC20001",
      "10001",
    ),
  );
});

test("license gate requires pmc-open and unambiguous CC BY/CC0 URLs, not PMCID, availability or labels", async () => {
  const xml = await fixture("pmc-metadata.xml");
  const decide = (source, sets = ["pmc-open"]) =>
    decideLicense(
      parsePmc(source, "PMC20001", "10001").article,
      sets,
      "https://example.invalid/metadata",
    );
  assert.equal(decide(xml).license.id, "CC-BY-4.0");
  assert.equal(decide(xml).reuseAllowed, true);
  assert.equal(decide(xml, []).reuseAllowed, false);
  for (const url of [
    "https://creativecommons.org/licenses/by-nc/4.0/",
    "https://creativecommons.org/licenses/by-nd/4.0/",
    "https://creativecommons.org/licenses/by-sa/4.0/",
    "https://publisher.invalid/license",
    "https://creativecommons.org.evil.invalid/licenses/by/4.0/",
  ])
    assert.equal(
      decide(xml.replace("https://creativecommons.org/licenses/by/4.0/", url))
        .reuseAllowed,
      false,
    );
  assert.equal(
    decide(
      xml.replace(
        "https://creativecommons.org/licenses/by/4.0/",
        "https://creativecommons.org/publicdomain/zero/1.0/",
      ),
    ).license.id,
    "CC0-1.0",
  );
  assert.equal(
    decide(
      xml.replace(
        "<ali:license_ref>https://creativecommons.org/licenses/by/4.0/</ali:license_ref>",
        "",
      ),
    ).reason,
    "missing-explicit-license-url",
  );
  assert.equal(
    decide(xml.replace("Authored test fixture.", "All rights reserved."))
      .reuseAllowed,
    false,
  );
  assert.equal(
    decide(
      xml.replace(
        "</license>",
        "<ali:license_ref>https://creativecommons.org/licenses/by-nc/4.0/</ali:license_ref></license>",
      ),
    ).reuseAllowed,
    false,
  );
});

test("PMC sections preserve original headings, paragraph order and nested prose without duplication", async () => {
  const article = parsePmc(
    await fixture("pmc-full.xml"),
    "PMC20001",
    "10001",
  ).article;
  const sections = parseSections(article);
  assert.equal(sections[0].heading, "1. Introduction");
  assert.equal(sections[0].kind, "introduction");
  assert.equal(
    sections[0].text,
    "Authored introduction paragraph.\n\nA second paragraph.",
  );
  assert.equal(sections[1].kind, "methods");
  assert.equal(sections[1].text, "Fixture parent method.");
  assert.equal(sections[2].heading, "Observation procedure");
  assert.equal(sections[2].text, "Fixture nested method.");
  assert.equal(sections.length, 7);
  assert.ok(!JSON.stringify(sections).includes("Excluded"));
});

test("canonical normalization preserves raw provenance and explicit nulls, without mutating metadata", async () => {
  const record = parsePubmed(await fixture("pubmed.xml")).get("10002");
  const before = structuredClone(record);
  const provenance = {
    api: "pubmed-efetch",
    url: "https://example.invalid",
    rawPath: "raw/batch.xml",
    sha256: "fixture",
    retrievedAt: "2026-01-01T00:00:00Z",
  };
  const article = normalize(
    { record, provenance },
    {
      license: null,
      reuseAllowed: false,
      reason: "no-pmcid",
      sections: [],
      provenance: [],
      hasFullText: false,
    },
    (await config()).rules,
    ["exercise", "exercise"],
    ["pd_exercise"],
  );
  assert.equal(article.identity.pmid, "10002");
  assert.equal(article.classification.studyType, "unknown");
  assert.equal(article.source.retrievedAt, provenance.retrievedAt);
  assert.equal(article.status.hasAbstract, false);
  assert.equal(article.source.reuseAllowed, false);
  assert.deepEqual(article.classification.topics, ["exercise"]);
  assert.deepEqual(record, before);
});

test("structured logging discards injected key/content fields", (t) => {
  const lines = [];
  t.mock.method(console, "log", (line) => lines.push(line));
  log({
    status: "fixture",
    pmid: "10001",
    apiKey: "secret",
    abstract: "content",
    xml: "<source/>",
  });
  assert.deepEqual(JSON.parse(lines[0]), { status: "fixture", pmid: "10001" });
});
