import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRagAnswer } from "../lib/ragAnswer.js";
import { retrieveForAnswer } from "../lib/ragAdapter.js";
import { generateAnswer } from "../lib/openaiAnswer.js";
import { UPSTREAM_TIMEOUT_MS } from "../lib/config.js";
import {
  groundedAnswer,
  MAX_EVIDENCE_CHARACTERS,
  validatedSources,
} from "../lib/evidence.js";
import { cases } from "./preview-rag.mjs";
import {
  citationLocations,
  groundingWarnings,
  structuralGrounding,
} from "./grounding.mjs";

export const captureRoot = fileURLToPath(
  new URL("../data/grounding-review/", import.meta.url),
);
const reviewPath = new URL(
  "../../docs/RAG_GROUNDING_REVIEW.md",
  import.meta.url,
);
export const classifications = [
  "citation-required",
  "general-framing",
  "adjacent-citation-sufficient",
  "overbroad",
  "unsupported",
];
const controlledQuestions = new Map(cases);
const sensitive =
  /\b(?:sk[-_]|vs_|file[-_])[a-zA-Z0-9_-]{8,}|\b(?:\d{1,3}\.){3}\d{1,3}\b/;

function requireControlled(id, question) {
  if (!controlledQuestions.has(id) || controlledQuestions.get(id) !== question)
    throw new Error("Only the existing controlled questions are permitted.");
}

function requireCapture(env, live) {
  if (
    env.RAG_GROUNDING_CAPTURE !== "true" ||
    !live ||
    env.CI ||
    env.NODE_ENV === "production"
  )
    throw new Error(
      "Local capture requires the flag, --live and non-production/non-CI execution.",
    );
  if (
    !env.OPENAI_API_KEY?.trim() ||
    !/^vs_[a-zA-Z0-9_-]+$/.test(env.OPENAI_VECTOR_STORE_ID ?? "")
  )
    throw new Error(
      "Local provider credentials and vector configuration are required.",
    );
}

export async function executeControlledQuestion({
  id,
  question,
  key,
  storeId,
  signal,
  captureEvidence = false,
  retrieve = retrieveForAnswer,
  generate = generateAnswer,
}) {
  requireControlled(id, question);
  let evidence;
  let finalEvidence;
  const answer = createRagAnswer({
    enabled: () => true,
    vectorStoreId: () => storeId,
    retrieve,
    generate: (text, apiKey, requestSignal, bundle) => {
      if (captureEvidence) {
        if (bundle) evidence = bundle;
        finalEvidence = bundle;
      }
      return generate(text, apiKey, requestSignal, bundle);
    },
  });
  const result = await answer(question, key, signal);
  return {
    result,
    ...(captureEvidence
      ? {
          evidence,
          evidenceAppliedToAnswer: result.retrieval.used && !!finalEvidence,
        }
      : {}),
  };
}

export function reviewSources(evidence) {
  if (!evidence) return [];
  if (
    !evidence.context?.trim() ||
    evidence.context.length > MAX_EVIDENCE_CHARACTERS
  )
    throw new Error("Invalid captured evidence context.");
  const sources = validatedSources(evidence.sources);
  const blocks = [
    ...evidence.context.matchAll(/<EVIDENCE>\n([\s\S]*?)\n<\/EVIDENCE>\n/g),
  ];
  if (
    blocks.map((match) => match[0]).join("") !== evidence.context ||
    blocks.length !== sources.length
  )
    throw new Error("Incomplete captured evidence context.");
  return sources.map((source, index) => {
    const block = JSON.parse(blocks[index][1]);
    if (
      Object.entries(source).some(([key, value]) => block[key] !== value) ||
      typeof block.contentScope !== "string" ||
      !Array.isArray(block.warnings) ||
      block.warnings.some((warning) => typeof warning !== "string") ||
      !Array.isArray(block.excerpts) ||
      block.excerpts.length < 1 ||
      block.excerpts.length > 2 ||
      block.excerpts.some(
        (text) =>
          typeof text !== "string" || !text.trim() || text.length > 1200,
      )
    )
      throw new Error("Captured evidence identity or excerpts are invalid.");
    return {
      ...source,
      contentScope: block.contentScope,
      evidenceWarnings: [...block.warnings],
      excerpts: [...block.excerpts],
    };
  });
}

export function captureRecord(id, execution, key) {
  requireControlled(id, controlledQuestions.get(id));
  const { result, evidence, evidenceAppliedToAnswer } = execution;
  const sources = reviewSources(evidence);
  const citedPmids = result.sources.map((source) => source.pmid);
  if (result.retrieval.sourceCount !== citedPmids.length)
    throw new Error("Inconsistent captured citation count.");
  if (result.retrieval.used) {
    if (!evidenceAppliedToAnswer)
      throw new Error("Missing evidence for the returned grounded answer.");
    const returned = validatedSources(result.sources);
    if (
      returned.length !== citedPmids.length ||
      returned.some((source) => {
        const original = sources.find((item) => item.pmid === source.pmid);
        return (
          !original ||
          Object.entries(source).some(
            ([field, value]) => original[field] !== value,
          )
        );
      })
    )
      throw new Error(
        "Returned source metadata does not match applied evidence.",
      );
    groundedAnswer(
      JSON.stringify({ answer: result.answer, citedPmids }),
      evidence,
    );
  } else if (citedPmids.length || citationLocations(result.answer).length) {
    throw new Error("Fallback must not claim verified citations.");
  }
  const availablePmids = evidenceAppliedToAnswer
    ? sources.map((source) => source.pmid)
    : [];
  const record = {
    schemaVersion: 1,
    questionId: id,
    answer: result.answer,
    offsetEncoding: "utf16-code-units",
    evidenceAppliedToAnswer: !!evidenceAppliedToAnswer,
    sources,
    citedPmids,
    answerCitationMarkers: citationLocations(result.answer),
    grounding: structuralGrounding(result.answer),
    groundingWarnings: groundingWarnings(result.answer, availablePmids),
  };
  const serialized = JSON.stringify(record);
  if (sensitive.test(serialized) || (key && serialized.includes(key)))
    throw new Error(
      "Sensitive or internal identifiers detected; capture refused.",
    );
  return record;
}

export async function runGroundingCapture({
  env = process.env,
  live = false,
  outputRoot = captureRoot,
  execute = executeControlledQuestion,
  now = () => performance.now(),
  pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  requireCapture(env, live);
  await mkdir(outputRoot, { recursive: true });
  const directory = await mkdtemp(path.join(outputRoot, "run-"));
  const starts = [];
  const summary = {
    schemaVersion: 1,
    execution: "local-current-pipeline",
    questionSetSha256: createHash("sha256")
      .update(JSON.stringify(cases))
      .digest("hex"),
    complete: false,
    answerCount: 0,
    warningCount: 0,
    failedQuestionId: null,
    failureCategory: null,
    bundleSha256: {},
  };
  for (const [id, question] of cases) {
    if (starts.length >= 4) {
      const wait = 65_000 - (now() - starts[starts.length - 4]);
      if (wait > 0) await pause(wait);
    }
    starts.push(now());
    const controller = new AbortController();
    let timer;
    try {
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error("Controlled request deadline exceeded."));
        }, UPSTREAM_TIMEOUT_MS);
      });
      const execution = await Promise.race([
        execute({
          id,
          question,
          key: env.OPENAI_API_KEY,
          storeId: env.OPENAI_VECTOR_STORE_ID,
          signal: controller.signal,
          captureEvidence: true,
        }),
        timeout,
      ]);
      const record = captureRecord(id, execution, env.OPENAI_API_KEY);
      clearTimeout(timer);
      controller.abort();
      const serialized = JSON.stringify(record, null, 2) + "\n";
      await writeFile(path.join(directory, `${id}.json`), serialized, {
        flag: "wx",
      });
      summary.bundleSha256[id] = createHash("sha256")
        .update(serialized)
        .digest("hex");
      summary.answerCount++;
      summary.warningCount += record.groundingWarnings.length;
      if (!execution.result.retrieval.used) {
        summary.failedQuestionId = id;
        summary.failureCategory = "non-grounded-response";
        break;
      }
    } catch {
      summary.failedQuestionId = id;
      summary.failureCategory = "provider-or-capture-validation";
      break;
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  }
  summary.complete =
    summary.answerCount === cases.length && !summary.failedQuestionId;
  await writeFile(
    path.join(directory, "summary.json"),
    JSON.stringify(summary, null, 2) + "\n",
    { flag: "wx" },
  );
  return { directory, ...summary };
}

function cell(value) {
  let text = String(value);
  for (const character of [
    "\\",
    "|",
    "`",
    "*",
    "_",
    "[",
    "]",
    "(",
    ")",
    "!",
    "#",
    "~",
  ])
    text = text.replaceAll(character, `\\${character}`);
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replace(/\r?\n/g, " ");
}

export function renderReview(records, summary, judgments = []) {
  const rows = [];
  const counts = Object.fromEntries(classifications.map((kind) => [kind, 0]));
  const usedJudgments = new Set();
  for (const record of records) {
    requireControlled(
      record.questionId,
      controlledQuestions.get(record.questionId),
    );
    if (record.sources.length) validatedSources(record.sources);
    const available = record.evidenceAppliedToAnswer
      ? record.sources.map((source) => source.pmid)
      : [];
    const expected = groundingWarnings(record.answer, available);
    if (JSON.stringify(expected) !== JSON.stringify(record.groundingWarnings))
      throw new Error("Warning locations or evidence references do not match.");
    for (const [index, warning] of expected.entries()) {
      const matches = judgments.filter(
        (item) =>
          item.questionId === record.questionId && item.warningIndex === index,
      );
      if (matches.length > 1) throw new Error("Duplicate adjudication.");
      const judgment = matches[0];
      if (judgment) {
        if (
          !classifications.includes(judgment.classification) ||
          !Array.isArray(judgment.supportingPmids) ||
          judgment.supportingPmids.some((pmid) => !available.includes(pmid)) ||
          !judgment.recommendation?.trim() ||
          !judgment.rationale?.trim() ||
          typeof judgment.requiresCodePromptChange !== "boolean" ||
          (judgment.classification === "overbroad" &&
            !judgment.narrowerWording?.trim()) ||
          (["adjacent-citation-sufficient", "overbroad"].includes(
            judgment.classification,
          ) &&
            !judgment.supportingPmids.length)
        )
          throw new Error(
            "Invalid human adjudication or unavailable supporting PMID.",
          );
        usedJudgments.add(judgment);
        counts[judgment.classification]++;
      }
      rows.push(
        `| ${cell(record.questionId)}:${index} | ${cell(warning.claim)} | ${cell(warning.nearbyCitations.join(", ") || "None in paragraph")} | ${available.join(", ") || "None applied"} | ${judgment?.classification ?? "pending-human-review"} | ${judgment?.supportingPmids.join(", ") || "Unassigned"} | ${cell(judgment?.recommendation ?? "Review captured paragraph and excerpts")} | ${cell(judgment?.rationale ?? "Not scientifically adjudicated")}${judgment?.narrowerWording ? ` Narrower wording: ${cell(judgment.narrowerWording)}` : ""} |`,
      );
    }
  }
  if (usedJudgments.size !== judgments.length)
    throw new Error("Adjudication does not match this sample.");
  const classified = Object.values(counts).reduce(
    (sum, value) => sum + value,
    0,
  );
  if (
    records.length !== summary.answerCount ||
    rows.length !== summary.warningCount ||
    new Set(records.map((record) => record.questionId)).size !== records.length
  )
    throw new Error("Capture summary does not match its bundles.");
  return `# RAG grounding review

Status: ${summary.complete ? "new local sample captured" : "incomplete local capture"}; ${rows.length - classified} candidates awaiting human adjudication.

The original 19 candidates remain unrecoverable from aggregate-only captures.
This is a new sample of the same seven controlled questions, using the current
local pipeline unchanged, not the older deployed revision. It is not production
approval or automated scientific truth scoring. No A-E intervention is justified
solely by structural matches. Review disease modification versus symptom change,
preclinical versus clinical efficacy and observational association versus causation
against only the captured excerpts. A shared paragraph citation may suffice.

Answers captured: ${records.length}/7. New structural warnings: ${rows.length}.
Classified: ${classified}. Candidates marked as requiring a code/prompt change: ${judgments.filter((item) => item.requiresCodePromptChange).length} assigned; ${rows.length - classified} still unreviewed.

| Classification | Assigned count |
| --- | ---: |
${classifications.map((kind) => `| ${kind} | ${counts[kind]} |`).join("\n")}

Unassigned candidates are not evidence of zero unsupported/overbroad claims.
The complete text, paragraph context, citation offsets and evidence excerpts are
in ignored local bundles under \`functions\\data\\grounding-review\\\`. Offsets use
UTF-16 code units; warningIndex is zero-based within each question.

Disease-modification, animal/mechanistic and observational-causality verdicts
require explicit human assessment against the bundles; this renderer assigns no
automatic scientific pass. Unsupported/overbroad findings are recorded only
when a human adjudication is supplied.

| Question:warningIndex | Claim | Nearby citations | Available PMIDs | Classification | Supporting PMIDs | Action | Rationale |
| --- | --- | --- | --- | --- | --- | --- | --- |
${rows.join("\n")}
`;
}

async function main() {
  if (process.argv.includes("--review")) {
    const run = process.argv[process.argv.indexOf("--run") + 1];
    if (!process.argv.includes("--run") || !run)
      throw new Error("Run directory required.");
    const directory = path.resolve(run);
    const relative = path.relative(captureRoot, directory);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative))
      throw new Error("Review requires a controlled local capture directory.");
    const summary = JSON.parse(
      await readFile(path.join(directory, "summary.json"), "utf8"),
    );
    if (
      summary.schemaVersion !== 1 ||
      summary.execution !== "local-current-pipeline" ||
      !Number.isInteger(summary.answerCount) ||
      summary.answerCount < 1 ||
      summary.answerCount > cases.length ||
      !Number.isInteger(summary.warningCount) ||
      summary.warningCount < 0 ||
      typeof summary.complete !== "boolean" ||
      (summary.complete && summary.answerCount !== cases.length) ||
      summary.questionSetSha256 !==
        createHash("sha256").update(JSON.stringify(cases)).digest("hex")
    )
      throw new Error("Invalid controlled capture summary.");
    const records = [];
    for (const [id] of cases) {
      if (records.length >= summary.answerCount) break;
      const serialized = await readFile(
        path.join(directory, `${id}.json`),
        "utf8",
      );
      if (
        createHash("sha256").update(serialized).digest("hex") !==
        summary.bundleSha256?.[id]
      )
        throw new Error("Capture bundle checksum mismatch.");
      const record = JSON.parse(serialized);
      if (record.questionId !== id)
        throw new Error("Capture question identity mismatch.");
      records.push(record);
    }
    let judgments = [];
    if (process.argv.includes("--adjudications")) {
      const file = process.argv[process.argv.indexOf("--adjudications") + 1];
      judgments = JSON.parse(await readFile(file, "utf8"));
      if (!Array.isArray(judgments))
        throw new Error("Adjudications must be an array.");
    }
    const markdown = renderReview(records, summary, judgments);
    if (sensitive.test(markdown))
      throw new Error("Sensitive identifiers in review.");
    await writeFile(reviewPath, markdown, "utf8");
    console.log(
      JSON.stringify({
        status: "review-generated",
        answerCount: records.length,
        warningCount: summary.warningCount,
      }),
    );
    return;
  }
  const result = await runGroundingCapture({
    live: process.argv.includes("--live"),
  });
  console.log(
    JSON.stringify({
      status: result.complete ? "capture-complete" : "capture-incomplete",
      directory: result.directory,
      answerCount: result.answerCount,
      warningCount: result.warningCount,
      failureCategory: result.failureCategory,
    }),
  );
  if (!result.complete) process.exitCode = 1;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch(() => {
    console.error(
      JSON.stringify({
        status: "grounding-capture-failed",
        category: "configuration-or-validation",
      }),
    );
    process.exitCode = 1;
  });
