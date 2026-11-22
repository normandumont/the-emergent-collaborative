import test from "node:test";
import assert from "node:assert/strict";
import {
  diagnoseQuestion,
  depthSummary,
  stageCounts,
  goldSafetyConflicts,
  evaluateDiagnostics,
  queryRewriteDiagnosis,
} from "../lib/evaluation/diagnostics.js";
import {
  diagnosticMarkdown,
  writeDiagnosticReports,
} from "../lib/evaluation/diagnostic-reports.js";
import { diversify } from "../lib/retrieval/ranking.js";
import { searchVector } from "../lib/retrieval/search.js";
import { synchronize } from "../lib/indexing/reconcile.js";
import { vectorArguments } from "../lib/scripts/vector-cli.js";
import { readState } from "../lib/indexing/state.js";
import { vectorFixture, editEntry } from "./vector-helpers.mjs";

const question = {
  id: "fixture-diagnostic",
  question: "Exercise trials?",
  expectedTopics: ["exercise"],
  preferredStudyTypes: [],
  expectedPmids: ["10001"],
  judgments: {},
  filters: {},
  notes: "Fixture",
  gold: {
    intent: "clinical-evidence",
    highlyRelevantPmids: ["10001"],
    acceptablePmids: [],
  },
};
function candidate(pmid, score, metadata = {}) {
  return {
    pmid,
    title: pmid,
    metadata: {
      year: 2025,
      studyType: "unknown",
      studyDesignTier: null,
      population: "unknown",
      contentScope: "abstract-only-retrievable",
      license: null,
      retracted: false,
      retrievalEnabled: true,
      topics: [],
      warnings: [],
      corrected: false,
      superseded: false,
      status: "active",
      ...metadata,
    },
    chunk: {
      score,
      text: "Fixture",
      filename: `${pmid}.md`,
      fileId: `file-${pmid}`,
    },
  };
}
function response(candidates, papers = 10) {
  const ranked = diversify(
    candidates,
    "clinical-evidence",
    ["exercise"],
    papers,
    2,
  );
  return {
    query: question.question,
    intent: "clinical-evidence",
    intentRule: "fixture",
    matchedTopics: ["exercise"],
    rewrittenQuery: [question.question],
    filters: {},
    filterMethod: "fixture",
    candidateLimit: 30,
    remoteCandidates: candidates.length,
    eligibleCandidates: candidates.length,
    uniqueCandidates: ranked.uniqueCandidates,
    uniquePaperCount: ranked.results.length,
    chunkCount: 0,
    duplicateChunksSuppressed: ranked.duplicateChunksSuppressed,
    paperLimitSuppressed: ranked.paperLimitSuppressed,
    papers,
    chunksPerPaper: 2,
    remoteHasMore: false,
    suppressed: {},
    results: ranked.results,
    diagnostics: {
      searchElapsedMs: 100,
      ranking: ranked.ranking,
      rawCandidates: candidates.map((paper, i) => ({
        rawRank: i + 1,
        pmid: paper.pmid,
        reportedPmid: paper.pmid,
        fileId: paper.chunk.fileId,
        semanticScore: paper.chunk.score,
        passedSafetyFilter: true,
        filterReason: null,
      })),
    },
  };
}
const diagnose = (r, conflicts) => diagnoseQuestion(question, r, conflicts)[0];
test("gold absent from raw candidates is a candidate retrieval miss", () => {
  const row = diagnose(response([candidate("10002", 0.9)]));
  assert.equal(row.classification, "candidate-retrieval-miss");
  assert.equal(row.rawCandidatePresent, false);
  assert.equal(row.rerankedRank, null);
});
test("all returned chunks filtered out are local filter misses with explicit reason", () => {
  const r = response([]);
  r.diagnostics.rawCandidates.push({
    rawRank: 1,
    pmid: "10001",
    reportedPmid: "10001",
    fileId: "file-1",
    semanticScore: 0.9,
    passedSafetyFilter: false,
    filterReason: "retracted",
  });
  const row = diagnose(r);
  assert.equal(row.classification, "local-filter-miss");
  assert.deepEqual(row.filterReasons, ["retracted"]);
  const absentBlocked = diagnose(response([]), {
    10001: ["retrieval-disabled"],
  });
  assert.equal(absentBlocked.classification, "local-filter-miss");
  assert.equal(absentBlocked.rawCandidatePresent, false);
});
test("reranking miss requires crossing the PMID-level cutoff from eligible semantic order", () => {
  const peers = Array.from({ length: 5 }, (_, i) =>
    candidate(String(10002 + i), 0.8 - i * 0.001, {
      population: "human",
      studyType: "randomized-controlled-trial",
      studyDesignTier: 2,
      topics: ["exercise"],
    }),
  );
  const row = diagnose(response([candidate("10001", 0.805), ...peers]));
  assert.equal(row.eligibleSemanticRank, 1);
  assert.equal(row.rerankedRank, 6);
  assert.equal(row.classification, "reranking-miss");
  assert.equal(row.classificationAt10, "gold-hit");
  assert.equal(row.adjustments.unknownMetadata, -0.009);
  assert.equal(row.diversificationSuppressed, false);
});
test("selected paper missing from final output is distinguished from paper-limit cutoff", () => {
  const selected = response([candidate("10001", 0.9)]);
  selected.results = [];
  assert.equal(diagnose(selected).classification, "diversification-miss");
  assert.equal(diagnose(selected).diversificationSuppressed, true);
  const limited = response([
    ...Array.from({ length: 10 }, (_, i) =>
      candidate(String(10002 + i), 0.95 - i * 0.01),
    ),
    candidate("10001", 0.4),
  ]);
  const row = diagnose(limited);
  assert.equal(row.classificationAt10, "outside-final-k");
  assert.equal(row.finalPaperLimitSuppressed, true);
  assert.equal(row.diversificationSuppressed, false);
});
test("surviving paper below K is outside-final-k and final hit is gold-hit", () => {
  const late = response([
    ...Array.from({ length: 5 }, (_, i) =>
      candidate(String(10002 + i), 0.95 - i * 0.01),
    ),
    candidate("10001", 0.8),
  ]);
  assert.equal(diagnose(late).classification, "outside-final-k");
  assert.equal(diagnose(late).finalRank, 6);
  assert.equal(diagnose(late).classificationAt10, "gold-hit");
  assert.equal(
    diagnose(response([candidate("10001", 0.9)])).classification,
    "gold-hit",
  );
});
test("duplicate chunks collapse to a PMID before ranks and depth aggregation", () => {
  const r = response([
    candidate("10002", 0.95),
    candidate("10002", 0.94),
    candidate("10001", 0.9),
    candidate("10001", 0.89),
    candidate("10001", 0.88),
  ]);
  const row = diagnose(r);
  assert.equal(row.rawCandidateRank, 3);
  assert.equal(row.rawPaperRank, 2);
  assert.equal(row.eligibleSemanticRank, 2);
  assert.equal(row.rawChunkCount, 3);
  assert.equal(row.diversificationSuppressed, false);
  const absent = response([candidate("10002", 0.95)]);
  const summary = depthSummary([[row], [diagnose(absent)]], [r, absent]);
  assert.equal(summary.goldPmids, 2);
  assert.equal(summary.candidateRecallMacro, 0.5);
  assert.equal(summary.candidateRecallMicro, 0.5);
  assert.equal(summary.absentFromCandidates, 1);
  assert.equal(summary.meanUniqueCandidatePmids, 1.5);
  assert.equal(summary.uniqueCandidatePmids, 2);
  assert.equal(summary.meanSearchElapsedMs, 100);
  assert.equal(stageCounts([row], true).counts["gold-hit"], 1);
});
test("known gold safety conflicts remain authoritative regardless of a synthetic final hit", () => {
  const row = diagnose(response([candidate("10001", 0.9)]), {
    10001: ["policy-excluded", "retracted"],
  });
  assert.equal(row.classification, "local-filter-miss");
  assert.deepEqual(goldSafetyConflicts(undefined, { files: [] }, "10001"), [
    "missing-from-local-manifest",
  ]);
});
test("opt-in trace does not alter scores, result order, filters, rewrites, limits or vector/corpus bytes", async (t) => {
  const { store, api } = await vectorFixture(t);
  await synchronize(api, store, { pause: async () => {}, pollAttempts: 2 }, {});
  const originalState = await store.read("vector-state.json");
  const originalManifest = await store.read("retrieval/manifest.json");
  const searchOnly = { search: api.search.bind(api) };
  const plain = await searchVector(
    searchOnly,
    store,
    question.question,
    { debugRanking: true },
    {},
  );
  const traced = await searchVector(
    searchOnly,
    store,
    question.question,
    { debugRanking: true, diagnostics: true },
    {},
  );
  const { diagnostics, ...withoutTrace } = traced;
  assert.deepEqual(withoutTrace, plain);
  assert.equal(diagnostics.rawCandidates.length, 2);
  assert.deepEqual(diagnostics.ranking, plain.ranking);
  assert.deepEqual(api.searches.at(-1).request, api.searches.at(-2).request);
  assert.equal(api.searches.at(-1).request.maxResults, 50);
  assert.equal(traced.papers, 5);
  assert.equal(traced.chunksPerPaper, 2);
  const override = await searchVector(
    searchOnly,
    store,
    question.question,
    { debugRanking: true, diagnostics: true, candidateLimit: 30 },
    {},
  );
  assert.equal(api.searches.at(-1).request.maxResults, 30);
  assert.equal(override.candidateLimit, 30);
  assert.deepEqual(override.results, traced.results);
  assert.deepEqual(override.ranking, traced.ranking);
  assert.equal(await store.read("vector-state.json"), originalState);
  assert.equal(await store.read("retrieval/manifest.json"), originalManifest);
  assert.equal(api.uploads.length, 2);
  assert.equal(api.removals.length, 0);
  assert.equal(api.attachments.length, 1);
  const state = await readState(store);
  const target = state.stores[state.currentStoreId];
  const blocked = await editEntry(store, "10001", {
    eligible: false,
    retrievalEnabled: false,
    retracted: true,
    expressionOfConcern: true,
    status: "retracted",
    indexAction: "remove",
  });
  const filtered = await searchVector(
    searchOnly,
    store,
    "exercise",
    { diagnostics: true },
    {},
  );
  assert.equal(
    filtered.results.some((paper) => paper.pmid === "10001"),
    false,
  );
  assert.equal(diagnose(filtered).classification, "local-filter-miss");
  assert.equal(
    filtered.diagnostics.rawCandidates.find((hit) => hit.pmid === "10001")
      .filterReason,
    "retracted",
  );
  const conflicts = goldSafetyConflicts(blocked, target, "10001");
  for (const reason of [
    "retracted",
    "expression-of-concern",
    "policy-excluded",
    "retrieval-disabled",
    "unavailable-in-synchronized-manifest",
  ])
    assert.ok(conflicts.includes(reason));
});
test("gold depth evaluator uses search only, preserves ordinary reports and explicitly reports unsupported 100", async (t) => {
  const { store, api } = await vectorFixture(t);
  await synchronize(api, store, { pause: async () => {}, pollAttempts: 2 }, {});
  const state = await store.read("vector-state.json");
  const manifest = await store.read("retrieval/manifest.json");
  const searchOnly = new Proxy(api, {
    get(target, key) {
      if (key !== "search")
        throw new Error(`Unexpected operation ${String(key)}`);
      return target.search.bind(target);
    },
  });
  const report = await evaluateDiagnostics(
    searchOnly,
    store,
    {},
    [30, 50, 100],
  );
  assert.equal(api.searches.length, 30);
  assert.equal(
    api.searches.filter((item) => item.request.maxResults === 30).length,
    15,
  );
  assert.equal(
    api.searches.filter((item) => item.request.maxResults === 50).length,
    15,
  );
  assert.equal(report.depths[2].status, "unsupported");
  assert.equal(report.depths[0].summary.goldPmids, 55);
  assert.equal(report.depths[0].summary.highlyRelevant.top5.goldPmids, 38);
  assert.match(report.recommendedBottleneck, /gold-label adjudication/);
  assert.equal(await store.read("vector-state.json"), state);
  assert.equal(await store.read("retrieval/manifest.json"), manifest);
  const md = diagnosticMarkdown(report);
  assert.match(md, /Recommended bottleneck to address next/);
  assert.match(md, /Full raw candidate pool/);
  await writeDiagnosticReports(store, report);
  assert.equal(await store.read("evaluation/gold-diagnostics-latest.md"), md);
  assert.equal(await store.read("evaluation/gold-latest.json"), null);
});
test("diagnostic CLI validates explicit gold/depth flags and does not permit expanded production search", () => {
  assert.equal(
    vectorArguments("eval", [
      "--gold",
      "--diagnostics",
      "--candidate-depths",
      "30,50,100",
    ]).flags.get("candidate-depths"),
    "30,50,100",
  );
  for (const args of [
    ["--diagnostics"],
    ["--gold", "--candidate-depths", "30"],
    ["--gold", "--diagnostics", "--candidate-depths", "30,30"],
    ["--gold", "--diagnostics", "--candidate-depths", "20,50"],
  ])
    assert.throws(() => vectorArguments("eval", args));
});
test("Q1 and Q14 lexical rewrite checks flag missing concepts without rewriting the query", () => {
  const q1 =
    "Human clinical evidence for aerobic exercise and motor symptoms in Parkinson's disease";
  assert.equal(
    queryRewriteDiagnosis("gold-exercise-clinical-001", [q1])
      .possibleQueryRewriteProblem,
    false,
  );
  assert.equal(
    queryRewriteDiagnosis("gold-exercise-clinical-001", [
      "exercise and Parkinson's",
    ]).possibleQueryRewriteProblem,
    true,
  );
  assert.equal(
    queryRewriteDiagnosis("gold-disease-modification-001", [
      "Distinguishing symptomatic benefit versus disease modification in Parkinson's research",
    ]).possibleQueryRewriteProblem,
    false,
  );
  assert.equal(
    queryRewriteDiagnosis("gold-disease-modification-001", [
      "Parkinson's treatments",
    ]).possibleQueryRewriteProblem,
    true,
  );
});
