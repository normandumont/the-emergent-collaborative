import { onRequest } from "firebase-functions/v2/https";
import { defineSecret, defineString } from "firebase-functions/params";
import { info } from "firebase-functions/logger";
import { createAskHandler } from "./askHandler.js";
import { REGION } from "./config.js";
import { generateAnswer } from "./openaiAnswer.js";

const apiKey = defineSecret("OPENAI_API_KEY");
const previewOrigin = defineString("ASK_PREVIEW_ORIGIN", { default: "" });

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
    // This single structured record contains metadata only; no user content.
    log: (record) => info("ask_request", record),
  }),
);
