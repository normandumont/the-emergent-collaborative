import test from "node:test";
import assert from "node:assert/strict";
import { config, fixture, temporaryStore, clock } from "./helpers.mjs";
import { loadCorpusConfig } from "../lib/corpus/config.js";
import {
  buildCorpusReport,
  corpusReportMarkdown,
  generateCorpusReport,
  queryOverlap,
  coverageLevel,
} from "../lib/corpus/report.js";
import { PubmedClient } from "../lib/discovery/pubmed-client.js";
import { ingest } from "../lib/ingestion/ingest.js";
import { prepareCorpus } from "../lib/corpus/prepare.js";
import { hash } from "../lib/shared/storage.js";

async function prepared(t) {
  const store = await temporaryStore(t);
  const cfg = await config();
  const xml = (await fixture("pubmed.xml")).replace(
    "Synthetic review",
    "Parkinson exercise synthetic review",
  );
  const client = new PubmedClient(
    cfg,
    async (url) =>
      new Response(
        String(url).includes("efetch.fcgi")
          ? xml
          : await fixture(
              new URL(url).searchParams.get("metadataPrefix") === "pmc_fm"
                ? "pmc-metadata.xml"
                : "pmc-full.xml",
            ),
      ),
    clock(),
  );
  await ingest(client, store, cfg, ["10001", "10002", "10003"]);
  const catalog = await store.catalog();
  catalog.articles["10001"].queryIds = [
    "pd_exercise",
    "pd_sleep",
    "pd_core_trials",
  ];
  catalog.articles["10002"].queryIds = ["pd_exercise"];
  catalog.articles["10003"].queryIds = ["pd_exercise", "pd_sleep"];
  await store.saveCatalog(catalog);
  const corpus = await loadCorpusConfig();
  const result = await prepareCorpus(store, cfg, corpus);
  assert.equal(result.errors, 0);
  return {
    store,
    cfg,
    corpus,
    manifest: result.manifest,
    catalog: await store.catalog(),
  };
}

test("coverage gap boundaries are deterministic corpus-only labels", () => {
  for (const [count, expected] of [
    [0, "critical"],
    [9, "critical"],
    [10, "low"],
    [24, "low"],
    [25, "moderate"],
    [49, "moderate"],
    [50, "substantial"],
    [100, "substantial"],
  ])
    assert.equal(coverageLevel(count), expected);
});

test("cross-query overlap deduplicates relationships and counts pairs at PMID level", async (t) => {
  const { catalog } = await prepared(t);
  catalog.articles["10001"].queryIds.push("pd_sleep");
  const report = queryOverlap(catalog);
  assert.equal(report.matchingOneQuery, 1);
  assert.equal(report.matchingTwoQueries, 1);
  assert.equal(report.matchingThreeOrMoreQueries, 1);
  assert.equal(report.highestOverlap[0].pmid, "10001");
  assert.deepEqual(report.queryPairs[0], {
    queryIds: ["pd_exercise", "pd_sleep"],
    pmids: ["10001", "10003"],
    count: 2,
  });
});

test("coverage report includes all governed topics, content, designs, tiers, mixed population and review status", async (t) => {
  const { store, corpus } = await prepared(t);
  const report = await generateCorpusReport(store, corpus);
  assert.equal(report.topicCoverage.length, 22);
  assert.equal(report.summary.uniquePmids, 3);
  assert.equal(report.summary.eligible, 2);
  assert.equal(report.summary.retrievalEnabled, 2);
  assert.equal(report.summary.reusableFullText, 1);
  assert.equal(report.summary.abstractOnly, 1);
  assert.equal(report.summary.excluded, 1);
  assert.equal(
    report.evidenceDesign.allGoverned["randomized-controlled-trial"],
    1,
  );
  assert.equal(report.evidenceDesign.allGoverned["meta-analysis"], 1);
  assert.equal(report.evidenceDesign.allGoverned["unknown"], 1);
  assert.equal(report.evidenceDesign.allGoverned["cohort"], 0);
  assert.equal(report.evidenceDesign.tiers["2"], 1);
  assert.equal(report.population.allGoverned.mixed, 1);
  assert.equal(report.population.canonical.unknown, 2);
  assert.equal(report.population.allGoverned.human, 1);
  assert.equal(
    report.topicCoverage.find((topic) => topic.topic === "exercise").humanRcts,
    1,
  );
  assert.equal(
    report.topicCoverage.find((topic) => topic.topic === "exercise").excluded,
    1,
  );
  assert.equal(
    report.topicCoverage.find((topic) => topic.topic === "glp1").eligible,
    0,
  );
  assert.equal(
    report.coverageGaps.find((topic) => topic.topic === "glp1").status,
    "critical",
  );
  assert.equal(
    report.readiness.status,
    "prepared-locally-awaiting-human-review",
  );
  assert.equal(report.readiness.productionReady, false);
  assert.equal(report.readiness.vectorUploadAuthorized, false);
  assert.equal(report.evidenceMixTargets[0].actual, 1);
  assert.equal(report.evidenceMixTargets[1].actual, 1);
  assert.equal(report.contentScope.excludedInsufficientContent, 1);
});

test("report generation persists readable JSON and Markdown and does not mutate preparation", async (t) => {
  const { store, corpus } = await prepared(t);
  const before = await store.read("retrieval/manifest.json");
  const report = await generateCorpusReport(store, corpus);
  assert.deepEqual(await store.json("reports/corpus-latest.json"), report);
  const md = await store.read("reports/corpus-latest.md");
  assert.equal(md, corpusReportMarkdown(report));
  for (const section of [
    "Summary",
    "Evidence design",
    "Topic coverage",
    "Population coverage",
    "Publication years",
    "Licensing/content scope",
    "Retractions and corrections",
    "Query overlap",
    "Coverage gaps",
    "Readiness for vector indexing",
  ])
    assert.ok(md.includes(`## ${section}`));
  assert.ok(md.includes("not evidence-strength"));
  assert.equal(await store.read("retrieval/manifest.json"), before);
  assert.deepEqual(await generateCorpusReport(store, corpus), report);
});

test("date warnings, cellular/animal reporting, licensing exclusions and governance are explicit", async (t) => {
  const { catalog, manifest, corpus } = await prepared(t);
  const [first, second, third] = manifest.entries;
  const details = new Map([
    [
      first.pmid,
      {
        meshTerms: ["Humans"],
        evidenceCategory: "human-interventional",
        fullTextSkipReason: null,
        publicationDate: "2027",
      },
    ],
    [
      second.pmid,
      {
        meshTerms: [],
        evidenceCategory: "cellular",
        fullTextSkipReason: "license-not-supported",
        publicationDate: null,
      },
    ],
    [
      third.pmid,
      {
        meshTerms: ["Animals"],
        evidenceCategory: "animal",
        fullTextSkipReason: "no-pmcid",
        publicationDate: "1980",
      },
    ],
  ]);
  first.year = 2027;
  first.warnings = ["future-dated-publication-metadata"];
  first.corrected = true;
  second.year = null;
  second.reasons = ["reusable-full-text-required"];
  second.studyType = "in-vitro";
  third.year = 1980;
  third.population = "animal";
  third.studyType = "animal";
  third.eligible = false;
  third.retrievalEnabled = false;
  third.retracted = true;
  third.status = "retracted";
  third.reasons = ["retracted"];
  const report = buildCorpusReport(
    catalog,
    manifest,
    corpus.topics,
    details,
    2026,
  );
  assert.deepEqual(report.publicationYears.futureDatedPmids, ["10001"]);
  assert.deepEqual(report.publicationYears.veryOldPmids, ["10003"]);
  assert.deepEqual(report.publicationYears.missingYearPmids, ["10002"]);
  assert.deepEqual(report.publicationYears.missingDatePmids, ["10002"]);
  assert.equal(report.population.allGoverned["in-vitro/cellular"], 1);
  assert.equal(report.population.allGoverned.animal, 1);
  assert.equal(report.contentScope.excludedByReuseRequirement, 1);
  assert.equal(report.contentScope.fullTextAccess["license-not-supported"], 1);
  assert.deepEqual(report.governance.retractedPmids, ["10003"]);
  assert.deepEqual(report.governance.correctedPmids, ["10001"]);
  assert.equal(
    report.governance.warningCounts["future-dated-publication-metadata"],
    1,
  );
});

test("full-text license denial does not count as article exclusion when abstract remains eligible", async (t) => {
  const { catalog, manifest, corpus } = await prepared(t);
  const details = new Map(
    manifest.entries.map((entry) => [
      entry.pmid,
      {
        meshTerms: ["Humans"],
        evidenceCategory: "unknown",
        fullTextSkipReason: "license-not-supported",
        publicationDate: "2025",
      },
    ]),
  );
  const report = buildCorpusReport(
    catalog,
    manifest,
    corpus.topics,
    details,
    2026,
  );
  assert.equal(report.contentScope.fullTextAccess["license-not-supported"], 2);
  assert.equal(report.contentScope.excludedByReuseRequirement, 0);
  assert.equal(report.summary.eligible, 2);
});

test("empty/unprepared catalog and corrupt provenance are not reported as indexing ready", async (t) => {
  const emptyStore = await temporaryStore(t);
  const corpus = await loadCorpusConfig();
  const empty = await generateCorpusReport(emptyStore, corpus);
  assert.equal(empty.readiness.status, "needs-local-preparation-or-repair");
  assert.equal(empty.topicCoverage.length, 22);
  const { store } = await prepared(t);
  const before = await store.read("normalized/10001.json");
  await store.write("normalized/10001.json", `${before}\n`, true);
  const report = await generateCorpusReport(store, corpus);
  assert.equal(report.readiness.issues[0].pmid, "10001");
  assert.equal(report.readiness.status, "needs-local-preparation-or-repair");
  assert.equal(report.population.allGoverned.human, 0);
  assert.notEqual(
    hash(before),
    hash(await store.read("normalized/10001.json")),
  );
});

test("new discovery and changed policy are flagged for preparation without inventing eligibility", async (t) => {
  const { store, corpus } = await prepared(t);
  const catalog = await store.catalog();
  catalog.articles["10004"] = {
    ...catalog.articles["10002"],
    pmid: "10004",
    status: "discovered",
  };
  await store.saveCatalog(catalog);
  const report = await generateCorpusReport(store, {
    ...corpus,
    policySha256: "f".repeat(64),
  });
  assert.equal(report.summary.pendingPreparation, 1);
  assert.equal(report.summary.eligible, 2);
  assert.deepEqual(report.readiness.pendingPmids, ["10004"]);
  assert.equal(
    report.readiness.issues[0].reason,
    "governance-configuration-changed-run-preparation",
  );
});

test("overlapping planning categories use the complement of their union for remaining evidence", async (t) => {
  const { catalog, manifest, corpus } = await prepared(t);
  const details = new Map(
    manifest.entries.map((entry) => [
      entry.pmid,
      {
        meshTerms: ["Animals"],
        evidenceCategory: "animal",
        fullTextSkipReason: null,
        publicationDate: "2025",
      },
    ]),
  );
  const report = buildCorpusReport(
    catalog,
    manifest,
    corpus.topics,
    details,
    2026,
  );
  assert.equal(report.evidenceMixTargets[0].actual, 1);
  assert.equal(report.evidenceMixTargets[1].actual, 1);
  assert.equal(report.evidenceMixTargets[3].actual, 2);
  assert.equal(report.evidenceMixTargets[4].actual, 0);
});

test("new query relationships on an existing cached article require preparation", async (t) => {
  const { store, corpus } = await prepared(t);
  const catalog = await store.catalog();
  catalog.articles["10001"].queryIds.push("pd_glp1");
  await store.saveCatalog(catalog);
  const report = await generateCorpusReport(store, corpus);
  assert.equal(report.readiness.status, "needs-local-preparation-or-repair");
  assert.deepEqual(report.readiness.issues, [
    {
      pmid: "10001",
      reason: "discovery-relationships-changed-run-preparation",
    },
  ]);
  assert.equal(
    report.topicCoverage.find((topic) => topic.topic === "glp1").discovered,
    1,
  );
  assert.equal(
    report.topicCoverage.find((topic) => topic.topic === "glp1").eligible,
    0,
  );
});
