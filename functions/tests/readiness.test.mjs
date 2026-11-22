import test from "node:test";
import assert from "node:assert/strict";
import { structuralGrounding } from "../scripts/grounding.mjs";
import {
  previewOrigin,
  runPreviewSmoke,
  summarize,
  validatePreviewAnswer,
  cases,
} from "../scripts/preview-rag.mjs";
import { requestAnswer } from "../lib/openaiAnswer.js";
import { MAX_EVIDENCE_CHARACTERS } from "../lib/evidence.js";

const source = {
  pmid: "10001",
  title: "Public study",
  year: 2025,
  studyType: "cohort",
  population: "human",
  evidenceType: "Cohort study",
  url: "https://pubmed.ncbi.nlm.nih.gov/10001/",
};
const payload = {
  answer: "A cohort study found an association [PMID 10001].",
  requestId: "00000000-0000-4000-8000-000000000001",
  sources: [source],
  retrieval: { used: true, sourceCount: 1 },
};
test("development grounding checks attribution structure, not scientific truth or ordinary framing", () => {
  for (const claim of [
    "Exercise may improve motor symptoms.",
    "Mitochondrial dysfunction may contribute to oxidative stress.",
    "A cohort study found an association.",
    "This trial supports slowed disease progression.",
  ]) {
    const missing = structuralGrounding(claim);
    assert.equal(missing.uncitedClaimCount, 1, claim);
    assert.equal(structuralGrounding(`${claim} [PMID 10001]`).passed, true);
  }
  assert.equal(
    structuralGrounding(
      "Here is a short overview. Ask your clinician about personal care.",
    ).claimCount,
    0,
  );
  assert.equal(
    structuralGrounding("Exercise cures Parkinson's [PMID 10001].")
      .scientificTruthAssessed,
    false,
  );
  assert.equal(
    structuralGrounding(
      "Research found improvement [PMID 10001].\n\nExercise reduces symptoms.",
    ).passed,
    false,
  );
});
test("preview harness refuses other projects/production endpoints and validates citation/source contracts", () => {
  assert.equal(
    previewOrigin(
      "https://meridian-station-preview--founder-review-abc.web.app",
    ),
    "https://meridian-station-preview--founder-review-abc.web.app",
  );
  for (const url of [
    "https://meridian-station-preview.web.app",
    "https://evil.example",
    "https://other--founder-review-abc.web.app",
    "http://meridian-station-preview--founder-review-abc.web.app",
    "https://meridian-station-preview--founder-review-abc.web.app/path",
  ])
    assert.throws(() => previewOrigin(url));
  assert.equal(validatePreviewAnswer(payload).used, true);
  assert.throws(() =>
    validatePreviewAnswer({ ...payload, answer: "Claim [PMID 99999999]" }),
  );
  assert.throws(() =>
    validatePreviewAnswer({
      ...payload,
      sources: [{ ...source, url: "https://pubmed.ncbi.nlm.nih.gov/10002/" }],
    }),
  );
});
test("preview smoke volume is bounded, paced, metadata-only and never retries a throttle", async () => {
  let clock = 0;
  let requests = 0;
  const waits = [];
  const rows = await runPreviewSmoke({
    origin: "https://meridian-station-preview--founder-review-test.web.app",
    now: () => clock,
    pause: async (ms) => {
      waits.push(ms);
      clock += ms;
    },
    fetcher: async (_url, init) => {
      requests++;
      assert.equal(init.redirect, "error");
      clock += 100;
      return Response.json(payload);
    },
  });
  assert.equal(requests, cases.length);
  assert.equal(rows.length, 8);
  assert.ok(waits.some((ms) => ms > 60_000));
  assert.ok(rows.every((row) => row.passed));
  assert.doesNotMatch(
    JSON.stringify(rows),
    /cohort study found|Public study|10001|OPENAI_API_KEY/,
  );
  const report = summarize(rows, [
    {
      requestId: payload.requestId,
      ragLatencyMs: 20,
      generationLatencyMs: 75,
    },
  ]);
  assert.equal(report.medianTotalLatencyMs, 100);
  assert.equal(report.medianRetrievalLatencyMs, 20);
  assert.equal(report.medianGenerationLatencyMs, 75);
  const throttled = await runPreviewSmoke({
    origin: "https://meridian-station-preview--founder-review-test.web.app",
    fetcher: async () => new Response("", { status: 429 }),
  });
  assert.equal(throttled.filter((row) => row.scope === "preview").length, 1);
});
test("provider is never called with an oversized or missing evidence context", async () => {
  let called = false;
  const client = {
    responses: {
      create: () => {
        called = true;
        throw new Error("Must not call");
      },
    },
  };
  for (const context of ["", "x".repeat(MAX_EVIDENCE_CHARACTERS + 1)])
    await assert.rejects(
      requestAnswer(client, "Public question", new AbortController().signal, {
        context,
        sources: [source],
      }),
    );
  assert.equal(called, false);
});
