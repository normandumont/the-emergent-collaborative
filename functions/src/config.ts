// Model selection is centralized; review availability and quality before launch.
// https://developers.openai.com/api/docs/models/gpt-6-luna
export const MODEL = "gpt-6-luna";
export const MAX_QUESTION_CHARACTERS = 4000;
export const MAX_BODY_BYTES = 24 * 1024;
export const MAX_OUTPUT_TOKENS = 1200;
export const UPSTREAM_TIMEOUT_MS = 25_000;
export const REGION = "us-central1";
export const LOCAL_ORIGINS = [
  "http://127.0.0.1:4323",
  "http://localhost:4323",
] as const;
export const RATE_WINDOW_MS = 60_000;
export const PER_IP_REQUESTS = 5;
export const INSTANCE_REQUESTS = 20;
