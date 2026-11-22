import test from "node:test";
import assert from "node:assert/strict";
import { diversify } from "../lib/retrieval/ranking.js";
import { classifyIntent, queryTopics } from "../lib/retrieval/intent.js";
import { searchVector } from "../lib/retrieval/search.js";
import { executeVectorCommand } from "../lib/scripts/vector-cli.js";
import { synchronize } from "../lib/indexing/reconcile.js";
import { loadCorpusConfig } from "../lib/corpus/config.js";
import { metrics } from "../lib/evaluation/metrics.js";
import { vectorFixture, editEntry } from "./vector-helpers.mjs";

function candidate(pmid, score = 0.8, metadata = {}, text = `Chunk ${score}`) {
  return {
    pmid,
    title: `Authored fixture ${pmid}`,
    metadata: {
      year: 2025,
      studyType: "systematic-review",
      studyDesignTier: 1,
      population: "human",
      contentScope: "abstract-only-retrievable",
      license: null,
      retracted: false,
      retrievalEnabled: true,
      topics: ["exercise"],
      warnings: [],
      corrected: false,
      superseded: false,
      status: "active",
      ...metadata,
    },
    chunk: { score, text, filename: `${pmid}.md`, fileId: `file-${pmid}` },
  };
}
const rank = (
  candidates,
  intent = "clinical-evidence",
  topics = ["exercise"],
  papers = 5,
  chunks = 2,
) => diversify(candidates, intent, topics, papers, chunks);
const expectation = {
  id: "clinical-001",
  question: "What evidence supports aerobic exercise?",
  expectedTopics: ["exercise"],
  preferredStudyTypes: ["randomized-controlled-trial", "systematic-review"],
  expectedPmids: ["42928476"],
  judgments: {},
  filters: {},
  notes: "Authored manual-label fixture, not corpus ground truth.",
};

test("observed eight-plus-two dominant chunks diversify to five papers without weakening semantic dominance", () => {
  const remote = [
    ...Array.from({ length: 8 }, (_, index) =>
      candidate("42734454", 0.96 - index * 0.01, {
        population: "unknown",
        studyType: "unknown",
        studyDesignTier: null,
        year: 2027,
        warnings: ["future-dated-publication-metadata"],
      }),
    ),
    candidate("42928476", 0.844, {
      studyType: "randomized-controlled-trial",
      studyDesignTier: 2,
    }),
    candidate("42928476", 0.834, {
      studyType: "randomized-controlled-trial",
      studyDesignTier: 2,
    }),
    candidate("10003", 0.82),
    candidate("10004", 0.8),
    candidate("10005", 0.78),
    candidate("10006", 0.25, {
      studyType: "randomized-controlled-trial",
      studyDesignTier: 2,
    }),
  ];
  const output = rank(remote);
  assert.equal(output.results.length, 5);
  assert.equal(output.uniqueCandidates, 6);
  assert.equal(output.results[0].pmid, "42734454");
  assert.deepEqual(
    output.results[0].chunks.map((chunk) => chunk.score),
    [0.96, 0.95],
  );
  assert.ok(output.results.some((paper) => paper.pmid === "42928476"));
  assert.ok(
    ["10003", "10004", "10005"].every((pmid) =>
      output.results.some((paper) => paper.pmid === pmid),
    ),
  );
  assert.ok(output.results.every((paper) => paper.chunks.length <= 2));
  assert.equal(output.duplicateChunksSuppressed, 6);
  assert.equal(output.paperLimitSuppressed, 1);
  assert.equal(output.ranking[0].chunkScores.length, 8);
  assert.equal(
    output.ranking.find((paper) => paper.pmid === "10006").bonusesEligible,
    false,
  );
  assert.deepEqual(rank([...remote].reverse()), output);
});

test("paper/chunk limits and score ties have stable deterministic order", () => {
  const candidates = [
    candidate("10002", 0.8, {}, "Z"),
    candidate("10001", 0.8, {}, "B"),
    candidate("10001", 0.8, {}, "A"),
    candidate("10001", 0.7),
  ];
  const output = rank(candidates, "general-research", [], 1, 1);
  assert.equal(output.results.length, 1);
  assert.equal(output.results[0].pmid, "10001");
  assert.equal(output.results[0].chunks.length, 1);
  assert.equal(output.results[0].chunks[0].text, "A");
  assert.deepEqual(
    rank([...candidates].reverse(), "general-research", [], 1, 1),
    output,
  );
  assert.equal(rank([], "general-research").results.length, 0);
});

test("intent rules distinguish clinical endpoints, mechanisms, treatment, epidemiology, biomarkers and technology", () => {
  for (const [query, intent] of [
    [
      "What evidence supports aerobic exercise for Parkinson's disease?",
      "clinical-evidence",
    ],
    ["Does cycling improve motor symptoms?", "clinical-evidence"],
    ["Human evidence for alpha-synuclein therapies", "clinical-evidence"],
    [
      "What evidence connects mitochondrial pathways with Parkinson's?",
      "mechanism",
    ],
    ["Mitophagy and inflammation mechanisms", "mechanism"],
    ["Treatments targeting Parkinsonian tremor", "treatment"],
    ["Parkinson's incidence and prevalence", "epidemiology"],
    ["Can wearable sensors measure gait?", "biomarkers"],
    ["Wearable device technology", "technology"],
    ["Parkinson's research overview", "general-research"],
  ])
    assert.equal(classifyIntent(query).intent, intent, query);
});

test("clinical human/design/tier preferences refine near ties; irrelevant RCTs cannot beat strongly relevant reviews", () => {
  const near = rank([
    candidate("10001", 0.84, {
      studyType: "unknown",
      population: "unknown",
      studyDesignTier: null,
    }),
    candidate("10002", 0.83, {
      studyType: "randomized-controlled-trial",
      studyDesignTier: 2,
    }),
  ]);
  assert.equal(near.results[0].pmid, "10002");
  assert.deepEqual(near.ranking[0].adjustments, {
    human: 0.015,
    studyType: 0.012,
    studyTier: 0.004,
    topicMatch: 0.008,
    unknownMetadata: 0,
    futureDated: 0,
    otherWarnings: 0,
    corrected: 0,
  });
  const distant = rank([
    candidate("10001", 0.94),
    candidate("10002", 0.5, { studyType: "randomized-controlled-trial" }),
  ]);
  assert.equal(distant.results[0].pmid, "10001");
  assert.equal(distant.ranking[1].adjustments.human, 0);
  assert.equal(distant.ranking[1].adjustments.studyType, 0);
});

test("mechanism retrieval gives animal/basic-science sources appropriate consideration without clinical human bonuses", () => {
  const papers = [
    candidate("10001", 0.8, {
      studyType: "basic-science",
      population: "animal",
      studyDesignTier: 6,
      topics: ["mitochondria"],
    }),
    candidate("10002", 0.8, {
      studyType: "randomized-controlled-trial",
      studyDesignTier: 2,
      topics: ["mitochondria"],
    }),
  ];
  const mechanism = rank(papers, "mechanism", ["mitochondria"]);
  assert.equal(mechanism.results[0].pmid, "10001");
  assert.equal(mechanism.ranking[0].adjustments.studyType, 0.005);
  assert.equal(mechanism.ranking[0].adjustments.human, 0);
  assert.equal(
    rank(papers, "clinical-evidence", ["mitochondria"]).results[0].pmid,
    "10002",
  );
});

test("unknown metadata and future dates incur mild transparent penalties, not exclusion", () => {
  const unknown = rank(
    [
      candidate("10001", 0.95, {
        studyType: "unknown",
        population: "unknown",
        studyDesignTier: null,
      }),
      candidate("10002", 0.8),
    ],
    "general-research",
    [],
  );
  assert.equal(unknown.results[0].pmid, "10001");
  assert.equal(unknown.ranking[0].adjustments.unknownMetadata, -0.009);
  assert.ok(unknown.ranking[0].reasons.includes("population=unknown"));
  const future = candidate("10001", 0.8, {
    year: 2027,
    warnings: ["future-dated-publication-metadata"],
  });
  const clinical = rank([future, candidate("10002", 0.8)]);
  assert.equal(clinical.results[0].pmid, "10002");
  assert.equal(clinical.ranking[1].adjustments.futureDated, -0.005);
  assert.equal(
    clinical.results[1].metadata.warnings[0],
    "future-dated-publication-metadata",
  );
  assert.equal(
    rank([future], "mechanism").ranking[0].adjustments.futureDated,
    0,
  );
});

test("topic mapping reuses taxonomy with cycling alias; matches give one bounded preference without keyword stuffing", async () => {
  const { topics } = await loadCorpusConfig();
  assert.ok(
    queryTopics(
      "Cycling and aerobic exercise exercise exercise",
      topics,
    ).includes("exercise"),
  );
  assert.deepEqual(queryTopics("glp-1 and stem-cell transplantation", topics), [
    "glp1",
    "stem-cell",
  ]);
  assert.ok(
    queryTopics("digital biomarkers and mitophagy", topics).includes(
      "mitochondria",
    ),
  );
  const output = rank(
    [
      candidate("10001", 0.8, { topics: ["sleep"] }),
      candidate("10002", 0.8, { topics: ["exercise", "mitochondria"] }),
    ],
    "general-research",
    ["exercise", "mitochondria"],
  );
  assert.equal(output.results[0].pmid, "10002");
  assert.equal(output.ranking[0].adjustments.topicMatch, 0.008);
});

test("normal search expands candidates and exposes papers, nested chunks and optional score-only debug", async (t) => {
  const { store, api } = await vectorFixture(t);
  await synchronize(api, store, { pause: async () => {}, pollAttempts: 2 }, {});
  const first = api.remote[0],
    second = api.remote[1];
  api.hits = [
    ...Array.from({ length: 8 }, (_, index) => ({
      fileId: first.id,
      filename: "10001.md",
      attributes: first.attributes,
      score: 0.95 - index * 0.01,
      content: [`Chunk ${index}`],
    })),
    ...Array.from({ length: 2 }, (_, index) => ({
      fileId: second.id,
      filename: "10003.md",
      attributes: second.attributes,
      score: 0.84 - index * 0.01,
      content: [`Other ${index}`],
    })),
  ];
  const output = await searchVector(api, store, expectation.question, {}, {});
  assert.equal(api.searches.at(-1).request.maxResults, 50);
  assert.equal(api.searches.at(-1).request.rewriteQuery, true);
  assert.equal(output.papers, 5);
  assert.equal(output.chunksPerPaper, 2);
  assert.equal(output.remoteCandidates, 10);
  assert.equal(output.uniqueCandidates, 2);
  assert.equal(output.uniquePaperCount, 2);
  assert.equal(output.chunkCount, 4);
  assert.equal(output.duplicateChunksSuppressed, 6);
  assert.equal(output.ranking, undefined);
  assert.ok(
    output.results.every(
      (paper) => !("text" in paper) && paper.chunks.length <= 2,
    ),
  );
  const debug = await executeVectorCommand(
    "search",
    [
      expectation.question,
      "--papers",
      "1",
      "--chunks-per-paper",
      "1",
      "--candidate-limit",
      "30",
      "--debug-ranking",
      "--no-rewrite",
    ],
    api,
    store,
    {},
  );
  assert.equal(debug.results.length, 1);
  assert.equal(debug.chunkCount, 1);
  assert.equal(debug.ranking.length, 2);
  assert.equal(api.searches.at(-1).request.maxResults, 30);
  assert.equal(api.searches.at(-1).request.rewriteQuery, false);
  assert.equal(api.uploads.length, 2);
  assert.equal(api.removals.length, 0);
  for (const options of [
    { papers: 0 },
    { chunksPerPaper: 0 },
    { candidateLimit: 51 },
    { papers: 5, maxResults: 10 },
  ])
    await assert.rejects(searchVector(api, store, "exercise", options, {}), {
      category: "configuration",
    });
});

test("diversification preserves human-only and disabled/retracted suppression before ranking", async (t) => {
  const { store, api } = await vectorFixture(t);
  await synchronize(api, store, { pause: async () => {}, pollAttempts: 2 }, {});
  assert.deepEqual(
    (
      await searchVector(
        api,
        store,
        "What evidence supports exercise?",
        { humanOnly: true },
        {},
      )
    ).results.map((paper) => paper.pmid),
    ["10001"],
  );
  await editEntry(store, "10001", {
    retrievalEnabled: false,
    status: "retrieval-disabled",
    indexAction: "remove",
  });
  const disabled = await searchVector(api, store, "exercise", {}, {});
  assert.deepEqual(
    disabled.results.map((paper) => paper.pmid),
    ["10003"],
  );
  assert.equal(disabled.suppressed["retrieval-disabled"], 1);
  await editEntry(store, "10003", {
    retrievalEnabled: false,
    retracted: true,
    status: "retracted",
    indexAction: "remove",
  });
  const withdrawn = await searchVector(api, store, "exercise", {}, {});
  assert.equal(withdrawn.results.length, 0);
  assert.equal(withdrawn.suppressed.retracted, 1);
  assert.equal(api.removals.length, 0);
});

test("paper-level recall/MRR and diversity metrics count PMIDs, never repeated supporting chunks", () => {
  const remote = [
    ...Array.from({ length: 8 }, (_, i) =>
      candidate("42734454", 0.95 - i * 0.01),
    ),
    candidate("42928476", 0.844, { studyType: "randomized-controlled-trial" }),
    candidate("42928476", 0.834),
    candidate("10003", 0.8),
    candidate("10004", 0.79),
    candidate("10005", 0.78),
  ];
  const output = rank(remote);
  const context = {
    intent: "clinical-evidence",
    eligibleCandidates: remote.length,
    uniqueCandidates: output.uniqueCandidates,
    duplicateChunksSuppressed: output.duplicateChunksSuppressed,
  };
  const measured = metrics(expectation, output.results, context);
  assert.equal(measured.reciprocalRank, 0.5);
  assert.equal(measured.recallAt5, 1);
  assert.equal(measured.recallAt10, 1);
  assert.equal(measured.uniquePmidRate, 5 / 13);
  assert.equal(measured.duplicateChunkSuppressionCount, 6);
  assert.equal(measured.uniquePapersInTop5, 5);
  assert.equal(measured.preferredEvidenceRetrieved, true);
  assert.equal(measured.humanEvidencePresence, true);
  const ten = rank(
    Array.from({ length: 10 }, (_, i) =>
      candidate(String(10000 + i), 0.95 - i * 0.01),
    ),
    "general-research",
    [],
    10,
  );
  const late = metrics(
    { ...expectation, expectedPmids: ["10009"] },
    ten.results,
  );
  assert.equal(late.recallAt5, 0);
  assert.equal(late.recallAt10, 1);
  assert.equal(late.reciprocalRank, 0.1);
});
