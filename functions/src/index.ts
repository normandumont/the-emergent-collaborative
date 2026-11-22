import { onRequest } from "firebase-functions/v2/https";
import {
  defineBoolean,
  defineSecret,
  defineString,
} from "firebase-functions/params";
import { info } from "firebase-functions/logger";
import { createAskHandler } from "./askHandler.js";
import { REGION } from "./config.js";
import { generateAnswer } from "./openaiAnswer.js";
import { createRagAnswer } from "./ragAnswer.js";
import { retrieveForAnswer } from "./ragAdapter.js";

const apiKey = defineSecret("OPENAI_API_KEY");
const previewOrigin = defineString("ASK_PREVIEW_ORIGIN", { default: "" });
const ragEnabled = defineBoolean("RAG_ENABLED", { default: false });
const vectorStoreId = defineString("OPENAI_VECTOR_STORE_ID", { default: "" });

export const askParkinsons = onRequest(
  {
    region: REGION,
    secrets: [apiKey],
    cors: false,
    timeoutSeconds: 35,
    memory: "256MiB",
    minInstances: 0,
    maxInstances: 1,
    concurrency: 4,
  },
  createAskHandler({
    getKey: () => apiKey.value(),
    previewOrigin: () => previewOrigin.value(),
    generate: generateAnswer,
    answer: createRagAnswer({
      enabled: () => ragEnabled.value(),
      vectorStoreId: () => vectorStoreId.value(),
      retrieve: retrieveForAnswer,
      generate: generateAnswer,
    }),
    // This single structured record contains metadata only; no user content.
    log: (record) => info("ask_request", record),
  }),
);
