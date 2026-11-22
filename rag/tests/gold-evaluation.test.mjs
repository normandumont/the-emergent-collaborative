import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseGold, validateGoldManifest, goldQuestions } from "../lib/evaluation/gold.js";
import { metrics, aggregate } from "../lib/evaluation/metrics.js";
import { vectorArguments } from "../lib/scripts/vector-cli.js";
import { markdownReport, writeReports } from "../lib/evaluation/reports.js";
import { temporaryStore } from "./helpers.mjs";

const draft = (patch = {}) => ({
  version: 1,
  status: "draft-human-review",
  curation: "Authored fixture independent of retrieval.",
  questions: [{
    id: "fixture-001",
    question: "What evidence supports exercise?",
    intent: "clinical-evidence",
    topics: ["exercise"],
    preferredStudyTypes: ["rct"],
    relevantPmids: ["10001", "10002", "10003", "10004"],
    highlyRelevantPmids: ["10002"],
    acceptablePmids: ["10005"],
    rationales: Object.fromEntries(
      ["10001", "10002", "10003", "10004", "10005"].map((id) => [id, "Authored rationale."]),
    ),
    notes: "Not real scientific judgments.",
    ...patch,
  }],
});
const paper = (pmid, metadata = {}) => ({
  pmid,
  chunks: [{ text: "Authored chunk" }, { text: "Second authored chunk" }],
  metadata: {
    topics: ["exercise"],
    population: "human",
    studyType: "randomized-controlled-trial",
    retracted: false,
    retrievalEnabled: true,
    ...metadata,
  },
});
const measured = (ids, patch = {}) =>
  metrics(goldQuestions(parseGold(draft(patch)))[0], ids.map((id) => paper(id)));

test("checked-in gold schema is draft, representative, and has rationale for every label", async () => {
  const raw = JSON.parse(await readFile(new URL("../evaluation/gold.json", import.meta.url), "utf8"));
  const gold = parseGold(raw);
  assert.equal(gold.status, "draft-human-review");
  assert.ok(gold.questions.length >= 12 && gold.questions.length <= 15);
  assert.equal(new Set(gold.questions.map((q) => q.intent)).size, 7);
  assert.match(gold.curation, /not human-validated/);
  assert.ok(gold.questions.every((q) => q.relevantPmids.length >= 2));
  assert.equal(goldQuestions(gold).length, gold.questions.length);
});
test("gold schema rejects invalid version, status, intent, empty relevance and missing rationale", () => {
  for (const patch of [
    { intent: "unrecognized" },
    { relevantPmids: [] },
    { relevantPmids: ["bad"] },
    { rationales: {} },
    { highlyRelevantPmids: ["99999"] },
    { acceptablePmids: ["10001"] },
    { preferredStudyTypes: ["imagined-trial"] },
  ]) assert.throws(() => parseGold(draft(patch)));
  assert.throws(() => parseGold({ ...draft(), version: 2 }));
  assert.throws(() => parseGold({ ...draft(), status: "validated" }));
  assert.throws(() => parseGold({ ...draft(), questions: [] }));
});
test("duplicate PMIDs within each label list and duplicate question IDs are rejected", () => {
  for (const key of ["relevantPmids", "highlyRelevantPmids", "acceptablePmids"])
    assert.throws(() => parseGold(draft({ [key]: ["10001", "10001"] })));
  const input = draft();
  input.questions.push(structuredClone(input.questions[0]));
  assert.throws(() => parseGold(input));
});
test("gold membership rejects missing, excluded, disabled, retracted, concern and superseded papers including acceptable labels", () => {
  const gold = parseGold(draft());
  const entries = ["10001", "10002", "10003", "10004", "10005"].map((pmid) => ({
    pmid, eligible: true, retrievalEnabled: true, status: "active",
    retracted: false, expressionOfConcern: false, superseded: false, indexAction: "upsert",
  }));
  assert.doesNotThrow(() => validateGoldManifest(gold, { entries }));
  assert.throws(() => validateGoldManifest(gold, { entries: entries.slice(0, -1) }), /10005.*missing/);
  for (const patch of [
    { eligible: false, status: "excluded" },
    { retrievalEnabled: false },
    { retracted: true },
    { expressionOfConcern: true },
    { superseded: true },
    { indexAction: "remove" },
    { status: "error" },
  ]) {
    const changed = structuredClone(entries);
    Object.assign(changed[0], patch);
    assert.throws(() => validateGoldManifest(gold, { entries: changed }), /10001.*blocked/);
  }
});
test("Recall@5/10, Precision@5, MRR and Hit@1/3/5 use exact paper ranks and separate high labels", () => {
  const row = measured(["90001", "10002", "90002", "10001", "90003", "90004", "10003", "90005", "90006", "10004"]);
  assert.equal(row.recallAt5, 2 / 4);
  assert.equal(row.recallAt10, 4 / 4);
  assert.equal(row.precisionAt5, 2 / 5);
  assert.equal(row.reciprocalRank, 1 / 2);
  assert.equal(row.firstRelevantRank, 2);
  assert.equal(row.hitAt1, false);
  assert.equal(row.hitAt3, true);
  assert.equal(row.hitAt5, true);
  assert.equal(row.highlyRelevantHitAt5, true);
  const noHigh = measured(["10001"]);
  assert.equal(noHigh.hitAt1, true);
  assert.equal(noHigh.highlyRelevantHitAt5, false);
  const summary = aggregate([row, noHigh, measured(["90001"])]);
  assert.equal(summary.meanReciprocalRank.value, (1 / 2 + 1 + 0) / 3);
  assert.deepEqual(summary.hitAt1, { passed: 1, evaluatedQuestions: 3, value: 1 / 3 });
  assert.deepEqual(summary.hitAt3, { passed: 2, evaluatedQuestions: 3, value: 2 / 3 });
  assert.deepEqual(summary.hitAt5, { passed: 2, evaluatedQuestions: 3, value: 2 / 3 });
});
test("PMID-level deduplication precedes cutoffs and empty/missing slots score zero", () => {
  const row = measured(["90001", "90001", "10002", "10002", "10001"]);
  assert.equal(row.returnedPapers, 3);
  assert.equal(row.firstRelevantRank, 2);
  assert.equal(row.precisionAt5, 2 / 5);
  assert.equal(row.recallAt5, 2 / 4);
  const empty = measured([]);
  for (const key of ["recallAt5", "recallAt10", "precisionAt5", "reciprocalRank"])
    assert.equal(empty[key], 0);
  for (const key of ["hitAt1", "hitAt3", "hitAt5"]) assert.equal(empty[key], false);
  assert.equal(empty.firstRelevantRank, null);
});
test("acceptable papers earn no primary credit; hit cutoffs and legacy missing labels remain explicit", () => {
  const row = measured(["10005", "90001", "90002", "10001", "10002"]);
  assert.equal(row.precisionAt5, 2 / 5);
  assert.equal(row.firstRelevantRank, 4);
  assert.equal(row.hitAt3, false);
  assert.equal(row.hitAt5, true);
  const outside = measured(["90001", "90002", "90003", "90004", "90005", "10001"]);
  assert.equal(outside.hitAt5, false);
  assert.equal(outside.recallAt5, 0);
  assert.equal(outside.recallAt10, 1 / 4);
  const unjudged = goldQuestions(parseGold(draft()))[0];
  delete unjudged.gold;
  unjudged.expectedPmids = [];
  const legacy = metrics(unjudged, [paper("10001")]);
  for (const key of ["recallAt5", "recallAt10", "precisionAt5", "reciprocalRank", "hitAt1", "hitAt3", "hitAt5"])
    assert.equal(legacy[key], null);
  assert.equal(aggregate([legacy]).hitAt1.evaluatedQuestions, 0);
});
test("safety and heuristic metrics remain independent of gold relevance", () => {
  const q = goldQuestions(parseGold(draft()))[0];
  q.filters.humanOnly = true;
  const row = metrics(q, [paper("10001"), paper("10002", {
    population: "animal", retracted: true, retrievalEnabled: false,
  })]);
  assert.equal(row.recallAt5, 1 / 2);
  assert.equal(row.humanOnlyCorrect, false);
  assert.equal(row.retractedExcluded, false);
  assert.equal(row.retrievalDisabledExcluded, false);
  assert.equal(row.preferredEvidenceRetrieved, true);
  assert.equal(row.humanEvidencePresence, true);
  assert.equal(row.topicMatchRate, 1);
  assert.equal(row.uniquePmidRate, 1 / 2);
  assert.equal(row.uniquePapersInTop5, 2);
  const empty = metrics(q, []);
  assert.equal(empty.retractedExcluded, null);
  assert.equal(empty.retrievalDisabledExcluded, null);
});
test("gold flag and reports keep the heuristic report separate and disclose draft status", async (t) => {
  assert.equal(vectorArguments("eval", ["--gold"]).flags.get("gold"), true);
  assert.equal(vectorArguments("eval", []).flags.has("gold"), false);
  const store = await temporaryStore(t);
  await store.write("evaluation/latest.json", "untouched heuristic report");
  const report = {
    schemaVersion: 2, generatedAt: "2026-11-11T00:00:00Z",
    storeId: "vs_fixture", manifestSha256: "fixture", questionsSha256: "fixture",
    gold: { version: 1, status: "draft-human-review" },
    methodology: "Authored fixture.", candidateLimit: 50,
    summary: aggregate([measured(["10001"])]), questions: [],
  };
  await writeReports(store, report);
  assert.equal(await store.read("evaluation/latest.json"), "untouched heuristic report");
  assert.equal((await store.json("evaluation/gold-latest.json")).gold.status, "draft-human-review");
  assert.match(markdownReport(report), /draft-human-review/);
  assert.match(markdownReport(report), /hitAt1/);
});
