import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  captureRecord,
  executeControlledQuestion,
  renderReview,
  runGroundingCapture,
  captureRoot,
} from "../scripts/grounding-capture.mjs";
import { cases } from "../scripts/preview-rag.mjs";
import {
  citationLocations,
  groundingWarnings,
  structuralGrounding,
} from "../scripts/grounding.mjs";
import { createAskHandler } from "../lib/askHandler.js";
import { requestAnswer } from "../lib/openaiAnswer.js";
import { buildEvidence } from "../lib/evidence.js";

const fakeKey = "credential-sentinel-not-a-real-key";
const env = {
  RAG_GROUNDING_CAPTURE: "true",
  OPENAI_API_KEY: fakeKey,
  OPENAI_VECTOR_STORE_ID: "vs_fixture_internal",
};
const paper = (pmid) => ({
  pmid,
  title: "Synthetic controlled test fixture",
  metadata: {
    retrievalEnabled: true,
    retracted: false,
    superseded: false,
    corrected: false,
    status: "active",
    studyType: "rct",
    population: "human",
    contentScope: "abstract",
    year: 2025,
    warnings: [],
    fileId: "file-internal-should-never-persist",
  },
  chunks: [
    {
      text: "Synthetic excerpt: a human trial measured motor symptoms.",
      score: 0.9,
    },
  ],
  headers: { authorization: fakeKey },
  ip: "127.0.0.1",
});
const evidence = buildEvidence([paper("10001"), paper("10002")]);
const answer =
  "Exercise may improve motor symptoms. A human trial found improvement [PMID 10001].";
const execution = () => ({
  result: {
    answer,
    sources: [evidence.sources[0]],
    retrieval: { used: true, sourceCount: 1 },
  },
  evidence,
  evidenceAppliedToAnswer: true,
  rawProviderMetadata: {
    key: fakeKey,
    headers: { cookie: "cookie-sentinel" },
    ip: "127.0.0.1",
  },
});
async function temporary(t) {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "meridian-grounding-test-"),
  );
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test("capture defaults off and requires explicit local live mode before provider calls or file writes", async (t) => {
  const root = path.join(await temporary(t), "captures");
  let calls = 0;
  for (const options of [
    { env: {} },
    { env: { ...env, RAG_GROUNDING_CAPTURE: "false" }, live: true },
    { env },
    { env: { ...env, CI: "true" }, live: true },
    { env: { ...env, NODE_ENV: "production" }, live: true },
    { env: { ...env, OPENAI_API_KEY: "" }, live: true },
  ]) {
    await assert.rejects(
      runGroundingCapture({
        ...options,
        outputRoot: root,
        execute: async () => {
          calls++;
          return execution();
        },
      }),
    );
  }
  assert.equal(calls, 0);
  await assert.rejects(stat(root), { code: "ENOENT" });
});

test("capture preserves the exact seven questions, pacing and all applied evidence, not just cited cards", async (t) => {
  const root = await temporary(t);
  const observed = [];
  const signals = [];
  const waits = [];
  let clock = 0;
  const summary = await runGroundingCapture({
    env,
    live: true,
    outputRoot: root,
    now: () => clock,
    pause: async (ms) => {
      waits.push(ms);
      clock += ms;
    },
    execute: async (options) => {
      observed.push([options.id, options.question]);
      signals.push(options.signal);
      assert.equal(options.captureEvidence, true);
      clock += 100;
      return execution();
    },
  });
  assert.deepEqual(observed, cases);
  assert.equal(summary.complete, true);
  assert.equal(summary.answerCount, 7);
  assert.equal(summary.warningCount, 7);
  assert.ok(waits.some((ms) => ms > 60_000));
  assert.ok(signals.every((signal) => signal.aborted));
  const files = await readdir(summary.directory);
  assert.equal(files.length, 8);
  for (const [id] of cases) {
    const text = await readFile(
      path.join(summary.directory, `${id}.json`),
      "utf8",
    );
    const record = JSON.parse(text);
    assert.equal(record.answer, answer);
    assert.deepEqual(
      record.sources.map((source) => source.pmid),
      ["10001", "10002"],
    );
    assert.deepEqual(record.citedPmids, ["10001"]);
    assert.deepEqual(record.sources[1].excerpts, [
      "Synthetic excerpt: a human trial measured motor symptoms.",
    ]);
    assert.equal(record.sources[1].population, "human");
    assert.equal(record.sources[1].studyType, "rct");
    assert.deepEqual(record.groundingWarnings[0].availablePmids, [
      "10001",
      "10002",
    ]);
    assert.equal(
      summary.bundleSha256[id],
      createHash("sha256").update(text).digest("hex"),
    );
    assert.doesNotMatch(
      text,
      /credential-sentinel|cookie-sentinel|127\.0\.0\.1|file-internal|vs_fixture|rawProviderMetadata|authorization|headers|score/,
    );
  }
});

test("warning offsets map exactly to Unicode/CRLF claims and retain paragraph-level citation context", () => {
  const text =
    "🚲 Overview.\r\n\r\nExercise may improve motor symptoms. A human trial found improvement [PMID 10001].\r\n\r\nMitochondrial dysfunction may contribute to symptoms.";
  const warnings = groundingWarnings(text, ["10001", "10002"]);
  assert.equal(warnings.length, structuralGrounding(text).uncitedClaimCount);
  assert.equal(warnings.length, 2);
  assert.deepEqual(warnings[0].nearbyCitations, ["[PMID 10001]"]);
  assert.deepEqual(warnings[1].nearbyCitations, []);
  for (const warning of warnings) {
    assert.equal(
      text.slice(warning.startOffset, warning.endOffset),
      warning.claim,
    );
    assert.equal(
      text.slice(warning.paragraph.startOffset, warning.paragraph.endOffset),
      warning.paragraph.text,
    );
    for (const citation of warning.nearbyCitationLocations)
      assert.equal(
        text.slice(citation.startOffset, citation.endOffset),
        citation.marker,
      );
  }
  for (const citation of citationLocations(text))
    assert.equal(
      text.slice(citation.startOffset, citation.endOffset),
      citation.marker,
    );
});

test("passive capture leaves retrieval arguments and complete generation request/model/prompt behavior unchanged", async () => {
  const traces = [];
  const results = [];
  for (const captureEvidence of [false, true]) {
    const trace = [];
    const client = {
      responses: {
        create: async (body) => {
          trace.push(body);
          return {
            status: "completed",
            output_text: JSON.stringify({ answer, citedPmids: ["10001"] }),
          };
        },
      },
    };
    const executed = await executeControlledQuestion({
      id: cases[0][0],
      question: cases[0][1],
      key: fakeKey,
      storeId: env.OPENAI_VECTOR_STORE_ID,
      signal: new AbortController().signal,
      captureEvidence,
      retrieve: async (question, key, storeId) => {
        trace.push({ question, key, storeId });
        return { results: [paper("10001"), paper("10002")] };
      },
      generate: (question, _key, signal, bundle) =>
        requestAnswer(client, question, signal, bundle),
    });
    if (captureEvidence) {
      assert.equal(executed.evidenceAppliedToAnswer, true);
      assert.equal(executed.evidence.context, evidence.context);
    } else assert.equal("evidence" in executed, false);
    traces.push(trace);
    results.push({
      answer: executed.result.answer,
      sources: executed.result.sources,
      retrieval: executed.result.retrieval,
    });
  }
  assert.deepEqual(traces[0], traces[1]);
  assert.deepEqual(results[0], results[1]);
  assert.equal(traces[0].length, 2);
  await assert.rejects(
    executeControlledQuestion({ id: "custom", question: "Private user text" }),
  );
  await assert.rejects(
    executeControlledQuestion({
      id: "general",
      question: "Rewritten question",
    }),
  );
});

test("capture rejects missing/mismatched evidence, unretrieved citations and secrets instead of persisting them", () => {
  assert.throws(() =>
    captureRecord(
      "general",
      {
        ...execution(),
        evidenceAppliedToAnswer: false,
      },
      fakeKey,
    ),
  );
  assert.throws(() =>
    captureRecord(
      "general",
      {
        ...execution(),
        result: {
          ...execution().result,
          answer: "Research found improvement [PMID 99999999].",
        },
      },
      fakeKey,
    ),
  );
  for (const text of [
    fakeKey,
    "sk-test_secret_should_not_persist",
    "127.0.0.1",
    "vs_internal_should_not_persist",
  ]) {
    assert.throws(() =>
      captureRecord(
        "general",
        {
          ...execution(),
          result: { ...execution().result, answer: `${text} ${answer}` },
        },
        fakeKey,
      ),
    );
  }
  assert.throws(() =>
    captureRecord(
      "general",
      {
        ...execution(),
        evidence: {
          ...evidence,
          context: evidence.context.replace('"pmid":"10001"', '"pmid":"10003"'),
        },
      },
      fakeKey,
    ),
  );
  assert.throws(() =>
    captureRecord(
      "general",
      {
        ...execution(),
        result: {
          ...execution().result,
          sources: [{ ...evidence.sources[0], title: "Mismatched metadata" }],
        },
      },
      fakeKey,
    ),
  );
});

test("provider/capture failures stop the suite once and persist only sanitized failure metadata", async (t) => {
  let calls = 0;
  const summary = await runGroundingCapture({
    env,
    live: true,
    outputRoot: await temporary(t),
    execute: async () => {
      calls++;
      throw new Error(`${fakeKey} raw-provider-response`);
    },
  });
  assert.equal(calls, 1);
  assert.equal(summary.complete, false);
  assert.equal(summary.answerCount, 0);
  assert.equal(summary.failureCategory, "provider-or-capture-validation");
  assert.deepEqual(await readdir(summary.directory), ["summary.json"]);
  const text = await readFile(
    path.join(summary.directory, "summary.json"),
    "utf8",
  );
  assert.doesNotMatch(text, /credential-sentinel|raw-provider-response/);
});

test("public runtime ignores environment/body capture flags, persists no answer and keeps metadata-only logging", async (t) => {
  const previous = process.env.RAG_GROUNDING_CAPTURE;
  process.env.RAG_GROUNDING_CAPTURE = "true";
  t.after(() => {
    if (previous === undefined) delete process.env.RAG_GROUNDING_CAPTURE;
    else process.env.RAG_GROUNDING_CAPTURE = previous;
  });
  const root = await temporary(t);
  const captureFilesBefore = await readdir(captureRoot).catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  const logs = [];
  const body = Buffer.from(
    JSON.stringify({ question: cases[0][1], RAG_GROUNDING_CAPTURE: true }),
  );
  const handler = createAskHandler({
    getKey: () => fakeKey,
    previewOrigin: () => "",
    generate: async () => "answer-sentinel",
    log: (record) => logs.push(record),
  });
  const response = new EventEmitter();
  response.set = () => response;
  response.vary = () => response;
  response.status = (status) => {
    response.statusCode = status;
    return response;
  };
  response.json = (value) => {
    response.body = value;
    response.writableEnded = true;
  };
  response.end = () => {
    response.writableEnded = true;
  };
  await handler(
    {
      method: "POST",
      ip: "127.0.0.1",
      rawBody: body,
      get: (name) =>
        ({
          Origin: "http://localhost:4323",
          "Content-Type": "application/json",
          "Content-Length": String(body.length),
          RAG_GROUNDING_CAPTURE: "true",
        })[name],
    },
    response,
  );
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.answer, "answer-sentinel");
  assert.deepEqual(await readdir(root), []);
  const captureFilesAfter = await readdir(captureRoot).catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  assert.deepEqual(captureFilesAfter, captureFilesBefore);
  assert.doesNotMatch(
    JSON.stringify(logs),
    /answer-sentinel|credential-sentinel|127\.0\.0\.1|RAG_GROUNDING_CAPTURE/,
  );
  assert.deepEqual(Object.keys(logs[0]).sort(), [
    "category",
    "generationLatencyMs",
    "ragFallback",
    "ragFallbackCategory",
    "ragLatencyMs",
    "ragSourceCount",
    "ragUsed",
    "requestId",
    "status",
    "timestamp",
    "totalLatencyMs",
  ]);
  for (const name of await readdir(new URL("../src/", import.meta.url))) {
    if (!name.endsWith(".ts")) continue;
    const source = await readFile(
      new URL(`../src/${name}`, import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(
      source,
      /grounding-capture|RAG_GROUNDING_CAPTURE|writeFile/,
    );
  }
});

test("review rendering preserves pending status, requires human judgments and rejects rescue PMIDs", () => {
  const record = captureRecord("general", execution(), fakeKey);
  const summary = { answerCount: 1, warningCount: 1, complete: false };
  const pending = renderReview([record], summary);
  assert.match(pending, /pending-human-review/);
  assert.match(pending, /original 19 candidates remain unrecoverable/);
  const judgment = {
    questionId: "general",
    warningIndex: 0,
    classification: "adjacent-citation-sufficient",
    supportingPmids: ["10001"],
    recommendation: "Retain the shared paragraph citation.",
    rationale: "Synthetic unit-test judgment, not a medical review.",
    requiresCodePromptChange: false,
  };
  assert.match(
    renderReview([record], summary, [judgment]),
    /adjacent-citation-sufficient \| 1/,
  );
  assert.throws(() =>
    renderReview([record], summary, [
      { ...judgment, supportingPmids: ["99999999"] },
    ]),
  );
  assert.throws(() =>
    renderReview([record], summary, [
      { ...judgment, classification: "overbroad" },
    ]),
  );
  assert.throws(() => renderReview([record], summary, [judgment, judgment]));
  const markdownAnswer =
    "Exercise may improve motor symptoms ![pixel](//example.invalid/tracker). A human trial found improvement [PMID 10001].";
  const withMarkup = {
    ...record,
    answer: markdownAnswer,
    groundingWarnings: groundingWarnings(markdownAnswer, ["10001", "10002"]),
  };
  assert.doesNotMatch(renderReview([withMarkup], summary), /!\[pixel\]\(/);
});
