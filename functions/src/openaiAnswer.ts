import OpenAI from "openai";
import { MAX_OUTPUT_TOKENS, MODEL, UPSTREAM_TIMEOUT_MS } from "./config.js";
import {
  parkinsonsInstructions,
  ragInstructions,
} from "./parkinsonsInstructions.js";
import {
  MAX_EVIDENCE_CHARACTERS,
  validatedSources,
  type EvidenceBundle,
} from "./evidence.js";

export async function generateAnswer(
  question: string,
  key: string,
  signal: AbortSignal,
  evidence?: EvidenceBundle,
): Promise<string> {
  const client = new OpenAI({
    apiKey: key,
    timeout: UPSTREAM_TIMEOUT_MS,
    maxRetries: 0,
    logLevel: "off",
  });
  return requestAnswer(client, question, signal, evidence);
}

export async function requestAnswer(
  client: OpenAI,
  question: string,
  signal: AbortSignal,
  evidence?: EvidenceBundle,
): Promise<string> {
  if (evidence) {
    validatedSources(evidence.sources);
    if (
      !evidence.context.trim() ||
      evidence.context.length > MAX_EVIDENCE_CHARACTERS
    )
      throw new Error("Invalid evidence context size.");
  }
  const response = await client.responses.create(
    {
      model: MODEL,
      instructions: evidence ? ragInstructions : parkinsonsInstructions,
      input: evidence
        ? [
            { role: "user", content: question },
            {
              role: "user",
              content: `UNTRUSTED_RESEARCH_REFERENCE_DATA\n${evidence.context}`,
            },
          ]
        : question,
      max_output_tokens: MAX_OUTPUT_TOKENS,
      reasoning: { effort: "none" },
      text: {
        verbosity: "low",
        ...(evidence
          ? {
              format: {
                type: "json_schema" as const,
                name: "grounded_research_answer",
                strict: true,
                schema: {
                  type: "object",
                  additionalProperties: false,
                  required: ["answer", "citedPmids"],
                  properties: {
                    answer: { type: "string" },
                    citedPmids: {
                      type: "array",
                      minItems: 1,
                      maxItems: 5,
                      items: {
                        type: "string",
                        enum: evidence.sources.map((source) => source.pmid),
                      },
                    },
                  },
                },
              },
            }
          : {}),
      },
      store: false,
    },
    { signal },
  );
  if (response.status !== "completed") {
    throw new Error("Incomplete answer");
  }
  return response.output_text;
}
