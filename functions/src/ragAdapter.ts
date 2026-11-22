import { readFile } from "node:fs/promises";
import OpenAI from "openai";
import { OpenAIVectorApi } from "../runtime/indexing/openai-client.js";
import { retrieveResearch } from "../runtime/retrieval/pipeline.js";
import {
  verifyRuntimeManifest,
  runtimeSource,
  type RuntimeManifest,
} from "../runtime/retrieval/runtime-manifest.js";
import { RAG_RETRIEVAL_TIMEOUT_MS } from "./ragAnswer.js";
import { RagError } from "../runtime/shared/logging.js";

let packagedManifest: Promise<RuntimeManifest> | undefined;
async function manifest() {
  packagedManifest ??= Promise.all([
    readFile(new URL("../runtime-manifest.json", import.meta.url), "utf8"),
    readFile(new URL("../runtime-manifest.sha256", import.meta.url), "utf8"),
  ])
    .then(([text, digest]) => verifyRuntimeManifest(text, digest))
    .catch(() => {
      throw new RagError(
        "configuration",
        "Packaged retrieval configuration is unavailable.",
      );
    });
  return packagedManifest;
}
export async function retrieveForAnswer(
  question: string,
  key: string,
  storeId: string,
  signal: AbortSignal,
) {
  const snapshot = await manifest();
  if (snapshot.storeId !== storeId)
    throw new RagError(
      "configuration",
      "Retrieval snapshot configuration mismatch.",
    );
  const client = new OpenAI({
    apiKey: key,
    timeout: RAG_RETRIEVAL_TIMEOUT_MS,
    maxRetries: 0,
    logLevel: "off",
  });
  const api = new OpenAIVectorApi(client, undefined, 0);
  return retrieveResearch(
    runtimeSource(snapshot, (request) => api.search(storeId, request)),
    question,
    {
      papers: 5,
      chunksPerPaper: 2,
      signal,
    },
  );
}
