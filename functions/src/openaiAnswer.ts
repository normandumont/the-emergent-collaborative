import OpenAI from "openai";
import { MAX_OUTPUT_TOKENS, MODEL, UPSTREAM_TIMEOUT_MS } from "./config.js";
import { parkinsonsInstructions } from "./parkinsonsInstructions.js";

export async function generateAnswer(
  question: string,
  key: string,
  signal: AbortSignal,
): Promise<string> {
  const client = new OpenAI({
    apiKey: key,
    timeout: UPSTREAM_TIMEOUT_MS,
    maxRetries: 0,
  });
  return requestAnswer(client, question, signal);
}

export async function requestAnswer(
  client: OpenAI,
  question: string,
  signal: AbortSignal,
): Promise<string> {
  const response = await client.responses.create(
    {
      model: MODEL,
      instructions: parkinsonsInstructions,
      input: question,
      max_output_tokens: MAX_OUTPUT_TOKENS,
      reasoning: { effort: "none" },
      text: { verbosity: "low" },
      store: false,
    },
    { signal },
  );
  if (response.status !== "completed") {
    throw new Error("Incomplete answer");
  }
  return response.output_text;
}
