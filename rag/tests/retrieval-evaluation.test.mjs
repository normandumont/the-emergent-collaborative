import test from "node:test";
import assert from "node:assert/strict";
import { vectorFixture } from "./vector-helpers.mjs";
import { synchronize } from "../lib/indexing/reconcile.js";
import { metrics, aggregate } from "../lib/evaluation/metrics.js";
import {
  loadQuestions,
  parseQuestions,
  evaluateRetrieval,
} from "../lib/evaluation/evaluate.js";
import { markdownReport, writeReports } from "../lib/evaluation/reports.js";

const question = (patch = {}) => ({
  id: "fixture-001",
  question: "Exercise research?",
  expectedTopics: ["exercise"],
  preferredStudyTypes: ["systematic-review"],
  expectedPmids: [],
  judgments: {},
  filters: {},
  notes: "Human review pending.",
  ...patch,
});
const result = (pmid, patch = {}) => ({
  rank: 1,
  score: 0.9,
  semanticScore: 0.9,
  pmid,
  title: "Authored fixture",
  chunks: [
    {
      score: 0.9,
      text: "Fixture chunk",
      filename: "fixture.md",
      fileId: `file-${pmid}`,
    },
  ],
  metadata: {
    year: 2025,
    studyType: "systematic-review",
    studyDesignTier: 1,
    population: "human",
    contentScope: "abstract-only-retrievable",
    license: null,
    retracted: false,
    topics: ["exercise"],
    retrievalEnabled: true,
    warnings: [],
    corrected: false,
    superseded: false,
    status: "active",
  },
  ...patch,
});
test("evaluation registry has at least twenty representative questions with no fabricated ground truth", async () => {
  const { questions } = await loadQuestions();
  assert.ok(questions.length >= 20);
  for (const topic of [
    "exercise",
    "sleep",
    "tremor",
    "wearable",
    "glp1",
    "alpha-synuclein",
    "stem-cell",
    "disease-modification",
    "nutrition",
    "mitochondria",
  ]) {
    assert.ok(
      questions.some((question) => question.expectedTopics.includes(topic)),
    );
  }
  assert.ok(questions.some((question) => question.filters.humanOnly));
  assert.ok(
    questions.some((question) => question.notes.includes("Review-ranking")),
  );
  assert.ok(
    questions.every(
      (question) =>
        question.expectedPmids.length === 0 &&
        Object.keys(question.judgments).length === 0,
    ),
  );
});
test("article-level metrics deduplicate chunks and use explicit relevant PMIDs", () => {
  const papers = [
    result("10001"),
    result("10001"),
    result("10002"),
    result("10003"),
  ];
  const measured = metrics(
    question({
      expectedPmids: ["10002", "10003", "10004"],
      judgments: { 10001: "irrelevant" },
    }),
    papers,
  );
  assert.equal(measured.returnedPapers, 3);
  assert.equal(measured.recallAt5, 2 / 3);
  assert.equal(measured.recallAt10, 2 / 3);
  assert.equal(measured.reciprocalRank, 1 / 2);
  assert.equal(measured.precisionAt5, 2 / 5);
  assert.equal(measured.topicMatchRate, 1);
});
test("unjudged relevance is not silently treated as negative; empty-result safety is not a pass", () => {
  const unlabeled = metrics(question(), [result("10001")]);
  assert.equal(unlabeled.recallAt5, null);
  assert.equal(unlabeled.precisionAt5, null);
  assert.equal(unlabeled.reciprocalRank, null);
  const partial = metrics(question({ expectedPmids: ["10001"] }), [
    result("10001"),
    result("10002"),
  ]);
  assert.equal(partial.precisionAt5, null);
  const empty = metrics(
    question({ expectedPmids: ["10001"], filters: { humanOnly: true } }),
    [],
  );
  assert.equal(empty.recallAt5, 0);
  assert.equal(empty.precisionAt5, 0);
  assert.equal(empty.reciprocalRank, 0);
  assert.equal(empty.humanOnlyCorrect, null);
  assert.equal(empty.retractedExcluded, null);
  assert.equal(empty.retrievalDisabledExcluded, null);
  assert.equal(aggregate([unlabeled]).recallAt5.value, null);
});
test("manual judgment contradictions, invalid filters and duplicate IDs fail explicitly", () => {
  assert.throws(() =>
    parseQuestions([
      question({
        expectedPmids: ["10001"],
        judgments: { 10001: "irrelevant" },
      }),
    ]),
  );
  assert.throws(() => parseQuestions([question(), question()]));
  assert.throws(() =>
    parseQuestions([question({ filters: { humanOnly: "yes" } })]),
  );
  assert.throws(() =>
    parseQuestions([question({ filters: { yearFrom: 2026, yearTo: 2020 } })]),
  );
  assert.throws(() =>
    parseQuestions([question({ filters: { unsupported: true } })]),
  );
});
test("mock evaluation writes human-readable reports, preserves run provenance and does not invent relevance scores", async (t) => {
  const { store, api } = await vectorFixture(t);
  await synchronize(api, store, { pause: async () => {}, pollAttempts: 2 }, {});
  const readOnly = new Proxy(api, {
    get(target, key) {
      if (key !== "search") throw new Error(`Evaluation must not call vector operation: ${String(key)}`);
      return target.search.bind(target);
    },
  });
  const report = await evaluateRetrieval(readOnly, store, {});
  assert.equal(report.questions.length, 24);
  assert.equal(api.searches.length, 24);
  assert.ok(api.searches.every((search) => search.request.maxResults === 50));
  assert.equal(report.summary.meanReciprocalRank.value, null);
  assert.equal(report.summary.precisionAt5.value, null);
  assert.equal(report.summary.humanOnlyCorrect.evaluatedQuestions > 0, true);
  const markdown = markdownReport(report);
  assert.match(markdown, /## exercise-001/);
  assert.match(markdown, /Human-only: PASS/);
  assert.match(markdown, /Recall@5: NOT EVALUATED/);
  assert.match(markdown, /Human relevance assessment: pending/);
  await writeReports(store, report);
  assert.equal(
    (await store.json("evaluation/latest.json")).questions.length,
    24,
  );
  assert.equal(await store.read("evaluation/latest.md"), markdown);
});
