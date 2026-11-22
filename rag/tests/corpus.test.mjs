import test from "node:test";
import assert from "node:assert/strict";
import { fixture, config, temporaryStore, clock } from "./helpers.mjs";
import { loadCorpusConfig, parseCorpusConfig } from "../lib/corpus/config.js";
import {
  classifyArticle,
  classifyStudy,
  classifyTopics,
  designEvidence,
} from "../lib/corpus/classification.js";
import { evaluateCorpus } from "../lib/corpus/policy.js";
import {
  publicationStatus,
  incomingRelationships,
} from "../lib/corpus/publication-status.js";
import { prepareCorpus } from "../lib/corpus/prepare.js";
import { retrievalDocument } from "../lib/corpus/documents.js";
import { parseManifest, readManifest } from "../lib/corpus/manifest.js";
import { corpusStatistics } from "../lib/corpus/statistics.js";
import { hash } from "../lib/shared/storage.js";
import { PubmedClient } from "../lib/discovery/pubmed-client.js";
import { parsePubmed, fetchPubmed } from "../lib/ingestion/fetch-pubmed.js";
import { ingest } from "../lib/ingestion/ingest.js";

function article(overrides = {}) {
  return {
    schemaVersion: 1,
    identity: { pmid: "10001", pmcid: null, doi: null },
    citation: {
      title: "Parkinson disease exercise fixture",
      journal: "Fixture Journal",
      publicationDate: "2025",
      year: 2025,
      authors: [],
    },
    classification: {
      articleTypes: ["Journal Article"],
      meshTerms: ["Parkinson Disease", "Humans"],
      topics: [],
      population: "human",
      studyType: "unknown",
    },
    publicationMetadata: {
      keywords: [],
      meshQualifiers: [],
      pubmedPublicationStatus: null,
      retractionHistory: false,
    },
    publicationStatus: publicationStatus(["Journal Article"], []),
    source: {
      pubmedUrl: "https://pubmed.ncbi.nlm.nih.gov/10001/",
      pmcUrl: null,
      retrievedAt: "2026-01-01T00:00:00Z",
      sourceType: "pubmed",
      license: null,
      reuseAllowed: false,
      fullTextSkipReason: "no-pmcid",
      provenance: [],
      queryIds: ["pd_exercise"],
    },
    content: { abstract: "Authored fixture abstract.", sections: [] },
    status: { normalized: true, hasAbstract: true, hasFullText: false },
    ...overrides,
  };
}
async function preparedFixture(t, name = "pubmed.xml") {
  const store = await temporaryStore(t);
  const cfg = await config();
  const corpus = await loadCorpusConfig();
  const pubmed = await fixture(name);
  const metadata = await fixture("pmc-metadata.xml");
  const full = await fixture("pmc-full.xml");
  const client = new PubmedClient(
    cfg,
    async (url) =>
      new Response(
        String(url).includes("efetch.fcgi")
          ? pubmed
          : new URL(url).searchParams.get("metadataPrefix") === "pmc_fm"
            ? metadata
            : full,
      ),
    clock(),
  );
  const ids = [...parsePubmed(pubmed).keys()];
  assert.equal((await ingest(client, store, cfg, ids)).errors, 0);
  const catalog = await store.catalog();
  for (const id of ids) catalog.articles[id].queryIds = ["pd_exercise"];
  await store.saveCatalog(catalog);
  return { store, cfg, corpus, client, pubmed, ids };
}

test("versioned corpus policy validates required safety gates, ranges and canonical taxonomy", async () => {
  const cfg = await loadCorpusConfig();
  assert.equal(cfg.policy.policyVersion, 1);
  assert.equal(cfg.topics.length, 22);
  assert.ok(cfg.topics.some((topic) => topic.id === "glp1"));
  for (const patch of [
    { policyVersion: 0 },
    { minYear: 2025, maxYear: 2020 },
    { blockedStates: [] },
    { allowedPopulations: ["guessed"] },
  ]) {
    assert.throws(
      () =>
        parseCorpusConfig(
          JSON.stringify({ ...cfg.policy, ...patch }),
          cfg.taxonomyText,
        ),
      { category: "configuration" },
    );
  }
});

test("eligibility is deterministic and requires a topic, supported type and real source content", async () => {
  const cfg = await loadCorpusConfig();
  const governed = classifyArticle(article(), cfg.topics);
  const decide = (record, policy = cfg.policy) =>
    evaluateCorpus(record, policy, ["pd_exercise"], "normalized");
  assert.equal(decide(governed).eligible, true);
  assert.equal(decide(governed).contentScope, "abstract-only-retrievable");
  assert.deepEqual(decide(governed), decide(governed));
  assert.ok(
    decide({
      ...governed,
      content: { abstract: null, sections: [] },
    }).reasons.includes("no-retrievable-source-content"),
  );
  const unrelated = article({
    citation: { ...governed.citation, title: "Unrelated fixture" },
    classification: { ...governed.classification, meshTerms: [] },
    source: { ...governed.source, queryIds: [] },
  });
  assert.equal(decide(classifyArticle(unrelated, cfg.topics)).eligible, false);
  assert.equal(
    decide(governed, { ...cfg.policy, requireReusableFullText: true }).eligible,
    false,
  );
  assert.equal(
    decide(governed, { ...cfg.policy, allowedPopulations: ["animal"] })
      .eligible,
    false,
  );
  assert.equal(
    decide(governed, { ...cfg.policy, minYear: 2026 }).eligible,
    false,
  );
});

test("excluded publication types take precedence over Journal Article and title keyword suggestions", async () => {
  const cfg = await loadCorpusConfig();
  for (const type of [
    "Editorial",
    "Published Erratum",
    "Duplicate Publication",
    "Preprint",
  ]) {
    const base = article();
    base.classification.articleTypes.push(type);
    const governed = classifyArticle(base, cfg.topics);
    const decision = evaluateCorpus(
      governed,
      cfg.policy,
      ["pd_exercise"],
      "normalized",
    );
    assert.equal(decision.retrievalEnabled, false);
    assert.ok(decision.reasons.includes(`excluded-publication-type:${type}`));
  }
});

test("publication relationships detect retraction, correction, concern, update, duplicates and retraction history", async () => {
  const records = parsePubmed(await fixture("publication-status.xml"));
  assert.equal(records.get("10011").publicationStatus.retracted, true);
  assert.equal(records.get("10012").publicationStatus.corrected, true);
  assert.deepEqual(records.get("10012").publicationStatus.relatedPmids, [
    "10013",
  ]);
  assert.equal(records.get("10013").publicationStatus.correctionNotice, true);
  assert.equal(
    records.get("10014").publicationStatus.expressionOfConcern,
    true,
  );
  assert.equal(records.get("10015").publicationStatus.superseded, true);
  assert.equal(records.get("10016").publicationStatus.superseded, false);
  assert.equal(records.get("10016").publicationStatus.updatedPublication, true);
  assert.equal(
    records.get("10017").publicationStatus.duplicatePublication,
    true,
  );
  assert.equal(records.get("10018").publicationStatus.retracted, true);
  assert.equal(records.get("10019").publicationStatus.corrected, true);
  assert.equal(records.get("10019").publicationStatus.superseded, true);
  const incoming = incomingRelationships("10012", records.values());
  assert.equal(incoming[0].type, "ErratumIn");
  assert.equal(incoming[0].sourcePmid, "10013");
  assert.equal(incoming[0].pmid, "10013");
});

test("correction stays active with linked original text; retraction, concern and supersession never do", async () => {
  const cfg = await loadCorpusConfig();
  const records = parsePubmed(await fixture("publication-status.xml"));
  const base = article();
  for (const id of ["10011", "10014", "10015", "10017", "10018", "10019"]) {
    const governed = classifyArticle(
      { ...base, publicationStatus: records.get(id).publicationStatus },
      cfg.topics,
    );
    assert.equal(
      evaluateCorpus(governed, cfg.policy, ["pd_exercise"], "normalized")
        .retrievalEnabled,
      false,
    );
  }
  const corrected = classifyArticle(
    { ...base, publicationStatus: records.get("10012").publicationStatus },
    cfg.topics,
  );
  const decision = evaluateCorpus(
    corrected,
    cfg.policy,
    ["pd_exercise"],
    "normalized",
  );
  assert.equal(decision.retrievalEnabled, true);
  assert.ok(
    decision.warnings.includes("correction-linked-original-text-retained"),
  );
});

test("topic rules support multiple traceable assignments without substring false positives", async () => {
  const cfg = await loadCorpusConfig();
  const base = article();
  base.citation.title =
    "Wearable gait and tremor observations in Parkinson disease";
  base.classification.meshTerms.push("Mitochondria", "Rehabilitation");
  const topics = classifyTopics(base, cfg.topics);
  for (const id of [
    "exercise",
    "gait",
    "wearable",
    "tremor",
    "mitochondria",
    "rehabilitation",
  ])
    assert.ok(topics.some((topic) => topic.topic === id));
  assert.ok(
    topics
      .find((topic) => topic.topic === "exercise")
      .reasons.includes("query:pd_exercise"),
  );
  base.citation.title = "Dietary themes are not a gaiter measurement";
  assert.ok(
    !classifyTopics(base, cfg.topics).some((topic) => topic.topic === "gait"),
  );
});

test("expanded study design requires publication types or explicit design metadata, never a guess from the title", () => {
  const cases = [
    [["Systematic Review"], [], "systematic-review"],
    [["Meta-Analysis"], [], "meta-analysis"],
    [["Randomized Controlled Trial"], [], "randomized-controlled-trial"],
    [["Clinical Trial"], [], "clinical-trial"],
    [["Journal Article"], ["Cohort Studies"], "cohort"],
    [["Journal Article"], ["Longitudinal Studies"], "longitudinal"],
    [["Journal Article"], ["Case-Control Studies"], "case-control"],
    [["Journal Article"], ["Cross-Sectional Studies"], "cross-sectional"],
    [["Observational Study"], [], "observational"],
    [["Case Reports"], [], "case-report"],
    [["Editorial"], [], "editorial"],
    [["Comment"], [], "commentary"],
    [["Practice Guideline"], [], "guideline"],
    [["Review"], ["Cohort Studies"], "unknown"],
    [["Journal Article"], [], "unknown"],
  ];
  for (const [types, mesh, expected] of cases) {
    const base = article();
    base.classification.articleTypes = types;
    base.classification.meshTerms = mesh;
    base.citation.title =
      "Parkinson randomized trial cohort systematic review mentions";
    assert.equal(classifyStudy(base), expected);
  }
  const animal = article();
  animal.classification.population = "animal";
  assert.equal(classifyStudy(animal), "animal");
  const cells = article();
  cells.classification.population = "unknown";
  cells.classification.meshTerms = ["Cells, Cultured", "In Vitro Techniques"];
  assert.equal(classifyStudy(cells), "in-vitro");
  const mechanism = article();
  mechanism.publicationMetadata.keywords = ["mechanistic study"];
  assert.equal(classifyStudy(mechanism), "basic-science");
});

test("study-design tiers are contextual classifications, not absolute quality or guessed human reviews", () => {
  for (const [study, population, mesh, expected] of [
    ["meta-analysis", "human", [], 1],
    ["randomized-controlled-trial", "human", [], 2],
    ["cohort", "human", ["Prospective Studies"], 3],
    ["longitudinal", "human", [], 3],
    ["cohort", "human", ["Retrospective Studies"], 4],
    ["observational", "human", [], 4],
    ["basic-science", "human", [], 5],
    ["animal", "animal", [], 6],
    ["in-vitro", "unknown", [], 7],
    ["editorial", "unknown", [], 8],
    ["systematic-review", "unknown", [], null],
    ["unknown", "human", [], null],
  ]) {
    const base = article();
    base.classification.population = population;
    base.classification.meshTerms = mesh;
    assert.equal(designEvidence(base, study).studyDesignTier, expected);
  }
});

test("missing metadata remains unknown or explicitly excluded, and manual disabling preserves eligibility", async () => {
  const cfg = await loadCorpusConfig();
  const base = article();
  base.citation.title = null;
  base.citation.publicationDate = null;
  base.citation.year = null;
  const governed = classifyArticle(base, cfg.topics);
  const decision = evaluateCorpus(
    governed,
    cfg.policy,
    ["pd_exercise"],
    "normalized",
  );
  assert.equal(decision.eligible, false);
  assert.ok(decision.reasons.includes("title-missing"));
  assert.ok(decision.warnings.includes("publication-date-unknown"));
  const active = classifyArticle(article(), cfg.topics);
  const disabled = evaluateCorpus(
    active,
    { ...cfg.policy, retrievalDisabledPmids: ["10001"] },
    ["pd_exercise"],
    "normalized",
  );
  assert.equal(disabled.eligible, true);
  assert.equal(disabled.retrievalEnabled, false);
  assert.equal(disabled.status, "retrieval-disabled");
});

test("full-text and abstract-only documents are local original-source artifacts with exact provenance hashes", async (t) => {
  const { store, cfg, corpus } = await preparedFixture(t);
  const result = await prepareCorpus(store, cfg, corpus);
  assert.equal(result.errors, 0);
  const full = result.manifest.entries.find((entry) => entry.pmid === "10001");
  const abstract = result.manifest.entries.find(
    (entry) => entry.pmid === "10003",
  );
  const metadata = result.manifest.entries.find(
    (entry) => entry.pmid === "10002",
  );
  assert.equal(full.contentScope, "full-text-retrievable");
  assert.equal(abstract.contentScope, "abstract-only-retrievable");
  assert.equal(metadata.contentScope, "metadata-only");
  assert.equal(metadata.path, null);
  const document = await store.read(`retrieval/${full.path}`);
  assert.equal(hash(document), full.sha256);
  assert.ok(
    document.includes(
      "Authored introduction paragraph.\n\nA second paragraph.",
    ),
  );
  assert.ok(
    document.includes(
      `Normalized record SHA-256: ${full.normalizedRecordSha256}`,
    ),
  );
  const governed = await store.read(
    `corpus/versions/10001/${full.normalizedRecordSha256}.json`,
  );
  assert.equal(hash(governed), full.normalizedRecordSha256);
  const audit = await store.json(full.decisionPath);
  assert.equal(audit.policyVersion, 1);
  assert.equal(audit.policySha256, corpus.policySha256);
  assert.ok(audit.lifecycle.some((event) => event.state === "eligible"));
  const abstractDocument = await store.read(`retrieval/${abstract.path}`);
  assert.ok(abstractDocument.includes("Content scope: abstract only"));
  assert.ok(!abstractDocument.includes("## Methods"));
  assert.ok(!abstractDocument.includes("Fixture parent method."));
});

test("manifest and documents are byte-deterministic on repeated cached preparation", async (t) => {
  const { store, cfg, corpus } = await preparedFixture(t);
  const first = await prepareCorpus(store, cfg, corpus);
  const manifest = await store.read("retrieval/manifest.json");
  const document = await store.read("retrieval/10001.md");
  const audit = await store.read(first.manifest.entries[0].decisionPath);
  const again = await prepareCorpus(store, cfg, corpus);
  assert.equal(again.changed, 0);
  assert.equal(await store.read("retrieval/manifest.json"), manifest);
  assert.equal(await store.read("retrieval/10001.md"), document);
  assert.equal(await store.read(first.manifest.entries[0].decisionPath), audit);
  assert.deepEqual(parseManifest(JSON.parse(manifest)), first.manifest);
});

test("changed raw source is detected even before base normalized refresh, and retraction keeps history", async (t) => {
  const { store, cfg, corpus, pubmed, ids } = await preparedFixture(t);
  const before = await prepareCorpus(store, cfg, corpus);
  const base = await store.read("normalized/10001.json");
  const oldManifest = await store.json("raw/pubmed/10001.json");
  const modified = pubmed.replace(
    "<PublicationType>Clinical Trial</PublicationType>",
    "<PublicationType>Clinical Trial</PublicationType><PublicationType>Retracted Publication</PublicationType>",
  );
  const client = new PubmedClient(
    cfg,
    async () => new Response(modified),
    clock(),
  );
  await fetchPubmed(client, store, ids, "changed-source-fixture", 20, true);
  const after = await prepareCorpus(store, cfg, corpus);
  const entry = after.manifest.entries.find((item) => item.pmid === "10001");
  assert.equal(entry.retrievalEnabled, false);
  assert.equal(entry.status, "retracted");
  assert.equal(entry.indexAction, "remove");
  assert.notEqual(
    entry.normalizedRecordSha256,
    before.manifest.entries[0].normalizedRecordSha256,
  );
  assert.equal(await store.read("normalized/10001.json"), base);
  assert.ok(await store.read(before.manifest.entries[0].decisionPath));
  assert.ok(await store.read(oldManifest.rawPath));
  const erased = new PubmedClient(
    cfg,
    async () => new Response(pubmed),
    clock(),
  );
  await fetchPubmed(erased, store, ids, "absent-retraction-fixture", 20, true);
  const retained = await prepareCorpus(store, cfg, corpus);
  assert.equal(
    retained.manifest.entries.find((item) => item.pmid === "10001").retracted,
    true,
  );
});

test("ingestion refresh archives normalized and PMC raw content and disables stale manifest immediately", async (t) => {
  const { store, cfg, corpus, client, ids } = await preparedFixture(t);
  await prepareCorpus(store, cfg, corpus);
  const old = await store.read("normalized/10001.json");
  const pmc = await store.read("raw/pmc/PMC20001.xml");
  assert.equal((await ingest(client, store, cfg, ids, true)).errors, 0);
  assert.equal(
    (await readManifest(store)).entries.find((entry) => entry.pmid === "10001")
      .retrievalEnabled,
    false,
  );
  assert.equal(
    await store.read(`history/${hash(old)}/normalized/10001.json`),
    old,
  );
  assert.equal(
    await store.read(`history/${hash(pmc)}/raw/pmc/PMC20001.xml`),
    pmc,
  );
  assert.equal(
    (await store.catalog()).articles["10001"].corpus.retrievalEnabled,
    false,
  );
});

test("correction workflow retains originals, notices and explicitly disabled withdrawal states in catalog", async (t) => {
  const { store, cfg, corpus } = await preparedFixture(
    t,
    "publication-status.xml",
  );
  const result = await prepareCorpus(store, cfg, corpus);
  assert.equal(result.errors, 0);
  const corrected = result.manifest.entries.find(
    (entry) => entry.pmid === "10012",
  );
  assert.equal(corrected.retrievalEnabled, true);
  assert.equal(corrected.corrected, true);
  const document = await store.read("retrieval/10012.md");
  assert.ok(document.includes("Original text retained."));
  assert.ok(document.includes("ErratumIn: 10013"));
  assert.equal(
    result.manifest.entries.find((entry) => entry.pmid === "10013")
      .retrievalEnabled,
    false,
  );
  assert.equal(
    (await store.catalog()).articles["10011"].corpus.state,
    "retracted",
  );
  assert.ok(await store.read("normalized/10011.json"));
  const stats = await corpusStatistics(store);
  assert.equal(stats.retracted, 2);
  assert.equal(stats.corrected, 2);
  assert.equal(stats.expressionOfConcern, 1);
});

test("corrupt source inventory fails closed, records error audits and never leaves an enabled stale entry", async (t) => {
  const { store, cfg, corpus } = await preparedFixture(t);
  await prepareCorpus(store, cfg, corpus);
  const manifest = await store.json("raw/pubmed/10001.json");
  await store.write(manifest.rawPath, "<changed/>", true);
  const result = await prepareCorpus(store, cfg, corpus);
  assert.ok(result.errors > 0);
  assert.ok(result.manifest.entries.every((entry) => !entry.retrievalEnabled));
  assert.ok(
    result.manifest.entries.every((entry) => entry.indexAction === "remove"),
  );
  assert.equal(
    (await store.json(result.manifest.entries[0].decisionPath)).status,
    "error",
  );
});

test("policy version change reevaluates decisions while keeping governed and document history", async (t) => {
  const { store, cfg, corpus } = await preparedFixture(t);
  const first = await prepareCorpus(store, cfg, corpus);
  const next = parseCorpusConfig(
    JSON.stringify({
      ...corpus.policy,
      policyVersion: 2,
      retrievalDisabledPmids: ["10001"],
    }),
    corpus.taxonomyText,
  );
  const changed = await prepareCorpus(store, cfg, next);
  const entry = changed.manifest.entries.find((item) => item.pmid === "10001");
  assert.equal(entry.policyVersion, 2);
  assert.equal(entry.eligible, true);
  assert.equal(entry.retrievalEnabled, false);
  assert.notEqual(entry.decisionPath, first.manifest.entries[0].decisionPath);
  assert.ok(await store.read(first.manifest.entries[0].decisionPath));
});

test("document serialization uses safe fences and never changes original source text", async () => {
  const corpus = await loadCorpusConfig();
  const record = article();
  record.content.abstract =
    "Literal ``` marker\n# Source heading\n<script>literal source</script>";
  const governed = classifyArticle(record, corpus.topics);
  const decision = {
    ...evaluateCorpus(governed, corpus.policy, ["pd_exercise"], "normalized"),
    policyVersion: 1,
    policySha256: "p",
    taxonomySha256: "t",
    normalizedRecordSha256: "n",
    baseNormalizedSha256: "b",
  };
  assert.ok(
    retrievalDocument(governed, decision).includes(record.content.abstract),
  );
  assert.throws(
    () => retrievalDocument(governed, { ...decision, retrievalEnabled: false }),
    { category: "policy-limit" },
  );
});

test("a new retraction notice disables existing originals before preparation and provides incoming provenance", async (t) => {
  const { store, cfg, corpus } = await preparedFixture(t);
  await prepareCorpus(store, cfg, corpus);
  const notice =
    '<PubmedArticleSet><PubmedArticle><MedlineCitation><PMID>10004</PMID><Article><Journal/><ArticleTitle>Retraction of Parkinson disease fixture</ArticleTitle><PublicationTypeList><PublicationType>Retraction of Publication</PublicationType></PublicationTypeList></Article><CommentsCorrectionsList><CommentsCorrections RefType="RetractionOf"><RefSource>Original fixture</RefSource><PMID>10001</PMID></CommentsCorrections></CommentsCorrectionsList></MedlineCitation></PubmedArticle></PubmedArticleSet>';
  const client = new PubmedClient(
    cfg,
    async () => new Response(notice),
    clock(),
  );
  assert.equal((await ingest(client, store, cfg, ["10004"])).errors, 0);
  assert.ok(
    (await readManifest(store)).entries.every(
      (entry) => !entry.retrievalEnabled,
    ),
  );
  const result = await prepareCorpus(store, cfg, corpus);
  const original = result.manifest.entries.find(
    (entry) => entry.pmid === "10001",
  );
  assert.equal(original.retracted, true);
  assert.equal(original.retrievalEnabled, false);
  const governed = await store.json(
    `corpus/versions/10001/${original.normalizedRecordSha256}.json`,
  );
  assert.ok(governed.publicationStatus.relatedPmids.includes("10004"));
  assert.ok(governed.source.provenance.length > 3);
});

test("usable full text can qualify without an abstract, but unsupported licensing cannot", async () => {
  const cfg = await loadCorpusConfig();
  const base = article();
  base.content.abstract = null;
  base.content.sections = [
    { heading: "Methods", kind: "methods", text: "Authored method fixture." },
  ];
  base.status.hasFullText = true;
  base.source.reuseAllowed = true;
  base.source.license = { id: "CC-BY-4.0" };
  base.source.provenance = [{ api: "pmc-full-text" }];
  let decision = evaluateCorpus(
    classifyArticle(base, cfg.topics),
    cfg.policy,
    ["pd_exercise"],
    "normalized",
  );
  assert.equal(decision.eligible, true);
  assert.equal(decision.contentScope, "full-text-retrievable");
  base.source.license.id = "CC-BY-NC-4.0";
  decision = evaluateCorpus(
    classifyArticle(base, cfg.topics),
    cfg.policy,
    ["pd_exercise"],
    "normalized",
  );
  assert.equal(decision.retrievalEnabled, false);
});

test("manifest validation refuses enabled withdrawals or metadata-only entries", async (t) => {
  const { store, cfg, corpus } = await preparedFixture(t);
  const result = await prepareCorpus(store, cfg, corpus);
  for (const patch of [
    { retracted: true },
    { expressionOfConcern: true },
    { superseded: true },
    { contentScope: "metadata-only" },
    { policyVersion: 99 },
  ]) {
    const bad = structuredClone(result.manifest);
    Object.assign(bad.entries[0], patch);
    assert.throws(() => parseManifest(bad), { category: "storage" });
  }
});
