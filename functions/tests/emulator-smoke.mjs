import assert from "node:assert/strict";
import {
  MAX_BODY_BYTES,
  PER_IP_REQUESTS,
  RATE_WINDOW_MS,
} from "../lib/config.js";

const endpoint =
  "http://127.0.0.1:5001/demo-meridian-station/us-central1/askParkinsons";
const headers = {
  Origin: "http://127.0.0.1:4323",
  "Content-Type": "application/json",
};
async function jsonError(
  body,
  expected,
  message,
  requestHeaders = headers,
  method = "POST",
) {
  const response = await fetch(endpoint, {
    method,
    headers: requestHeaders,
    ...(method === "POST" ? { body } : {}),
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(response.status, expected);
  assert.match(response.headers.get("content-type"), /application\/json/);
  const json = await response.json();
  assert.deepEqual(json, { error: message });
  assert.doesNotMatch(
    JSON.stringify(json),
    /SyntaxError|stack|node_modules|OPENAI_API_KEY|sdk-sentinel/,
  );
  assert.equal(response.headers.get("cache-control"), "no-store");
  return response;
}

await jsonError(
  undefined,
  405,
  "Only POST requests are supported.",
  headers,
  "GET",
);
const missing = await jsonError("{}", 403, "This origin is not allowed.", {
  "Content-Type": "application/json",
});
assert.equal(missing.headers.get("access-control-allow-origin"), null);
const foreign = await jsonError("{}", 403, "This origin is not allowed.", {
  ...headers,
  Origin: "https://unapproved.example",
});
assert.equal(foreign.headers.get("access-control-allow-origin"), null);

// Managed JSON parsing occurs before the handler and does not consume the
// application's quota. Production-style errors must not return parser stacks.
const malformed = await fetch(endpoint, {
  method: "POST",
  headers,
  body: "{",
  signal: AbortSignal.timeout(10_000),
});
assert.equal(malformed.status, 400);
assert.match(malformed.headers.get("content-type"), /text\/html/);
const malformedText = await malformed.text();
assert.doesNotMatch(malformedText, /SyntaxError|node_modules|at JSON\.parse/);

const preflight = await fetch(endpoint, {
  method: "OPTIONS",
  headers: {
    Origin: headers.Origin,
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "Content-Type",
  },
  signal: AbortSignal.timeout(10_000),
});
assert.equal(preflight.status, 204);
assert.equal(
  preflight.headers.get("access-control-allow-origin"),
  headers.Origin,
);

const invalidQuestions = [
  {},
  { question: "" },
  { question: " \n " },
  { question: "x".repeat(4001) },
];
assert.equal(invalidQuestions.length + 1, PER_IP_REQUESTS);
for (const body of invalidQuestions) {
  await jsonError(
    JSON.stringify(body),
    400,
    "Enter a question of 1 to 4000 characters.",
  );
}
const unavailable = await jsonError(
  JSON.stringify({ question: "Exercise research?" }),
  503,
  "The research tool is not available right now.",
);
assert.equal(
  unavailable.headers.get("access-control-allow-origin"),
  headers.Origin,
);
const excess = await jsonError(
  "{}",
  429,
  "Too many requests. Please wait a minute and retry.",
);
assert.equal(excess.headers.get("retry-after"), "60");

// Wait the real existing window rather than weakening limits or spoofing IPs.
await new Promise((resolve) => setTimeout(resolve, RATE_WINDOW_MS + 50));
await jsonError("not JSON", 415, "Send a JSON request.", {
  ...headers,
  "Content-Type": "text/plain",
});
const oversized = JSON.stringify({
  question: "Research?",
  padding: "x".repeat(MAX_BODY_BYTES),
});
assert.ok(Buffer.byteLength(oversized) > MAX_BODY_BYTES);
await jsonError(oversized, 413, "The request is too large or unreadable.");
console.log(
  "Functions emulator passed: Origin, preflight, method, question/byte limits, media type, managed JSON rejection, missing key and real per-IP throttle.",
);
