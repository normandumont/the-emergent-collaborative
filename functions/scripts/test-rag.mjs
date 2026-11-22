import assert from "node:assert/strict";
import { createRagAnswer } from "../lib/ragAnswer.js";
import { retrieveForAnswer } from "../lib/ragAdapter.js";
import { generateAnswer } from "../lib/openaiAnswer.js";
import { UPSTREAM_TIMEOUT_MS } from "../lib/config.js";

async function main() {
  if (
    !process.argv.includes("--live") ||
    process.env.RAG_ENABLED !== "true" ||
    !process.env.OPENAI_VECTOR_STORE_ID ||
    !process.env.OPENAI_API_KEY?.trim()
  )
    throw new Error(
      "Explicit --live, RAG_ENABLED=true, OPENAI_VECTOR_STORE_ID and OPENAI_API_KEY are required. Never paste secrets into a report.",
    );
  const answer = createRagAnswer({
    enabled: () => true,
    vectorStoreId: () => process.env.OPENAI_VECTOR_STORE_ID,
    retrieve: retrieveForAnswer,
    generate: generateAnswer,
  });
  for (const [id, question] of [
    [
      "aerobic-exercise",
      "What evidence supports aerobic exercise for Parkinson's disease?",
    ],
    [
      "disease-modification",
      "What evidence suggests exercise slows the underlying progression of Parkinson's disease rather than only improving symptoms?",
    ],
  ]) {
    const controller = new AbortController();
    let timer;
    try {
      const deadline = new Promise((_resolve, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error("Live test request budget exceeded."));
        }, UPSTREAM_TIMEOUT_MS);
      });
      const result = await Promise.race([
        answer(question, process.env.OPENAI_API_KEY, controller.signal),
        deadline,
      ]);
      assert.equal(
        result.retrieval.used,
        true,
        "RAG must succeed for this integration smoke test.",
      );
      assert.ok(result.sources.length > 0 && result.sources.length <= 5);
      assert.equal(
        new Set(result.sources.map((source) => source.pmid)).size,
        result.sources.length,
      );
      assert.ok(
        result.sources.every(
          (source) =>
            source.url === `https://pubmed.ncbi.nlm.nih.gov/${source.pmid}/`,
        ),
      );
      console.log(
        JSON.stringify({
          test: id,
          ragUsed: true,
          ragSourceCount: result.sources.length,
          citationWhitelistPassed: true,
          medicalClaimReview:
            "Human review still required; this smoke test does not validate efficacy claims.",
        }),
      );
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  }
}
main().catch(() => {
  console.error(
    JSON.stringify({
      status: "live-integration-failed",
      category: "configuration-upstream-or-validation",
    }),
  );
  process.exitCode = 1;
});
