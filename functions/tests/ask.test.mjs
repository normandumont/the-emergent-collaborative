import { test } from "node:test";
import assert from "node:assert/strict";
import OpenAI from "openai";
import { createAskHandler } from "../lib/askHandler.js";
import { requestAnswer } from "../lib/openaiAnswer.js";
import { createThrottle } from "../lib/throttle.js";
import {
  MAX_BODY_BYTES,
  MAX_OUTPUT_TOKENS,
  MODEL,
  INSTANCE_REQUESTS,
} from "../lib/config.js";
import { parkinsonsInstructions } from "../lib/parkinsonsInstructions.js";

function fixture(overrides = {}) {
  const logs = [];
  const calls = [];
  const handler = createAskHandler({
    getKey: () => "test-placeholder-not-a-real-key",
    previewOrigin: () =>
      "https://meridian-station-preview--founder-review-example.web.app",
    generate: async (...args) => {
      calls.push(args);
      return "Research explanation";
    },
    log: (record) => logs.push(record),
    ...overrides,
  });
  async function invoke({
    method = "POST",
    raw = JSON.stringify({ question: "What is Parkinson's?" }),
    headers = {},
    ip = "127.0.0.1",
  } = {}) {
    const values = {
      origin: "http://127.0.0.1:4323",
      "content-type": "application/json",
      ...headers,
    };
    const req = {
      method,
      rawBody: Buffer.from(raw),
      ip,
      get: (name) => values[name.toLowerCase()],
    };
    const result = { headers: {}, status: 200, body: undefined };
    const res = {
      set: (name, value) => {
        result.headers[name] = value;
        return res;
      },
      vary: () => res,
      status: (value) => {
        result.status = value;
        return res;
      },
      json: (value) => {
        result.body = value;
        return res;
      },
      end: () => res,
    };
    await handler(req, res);
    return result;
  }
  return { invoke, logs, calls };
}

test("valid POST maps only the answer, empty sources and a generated request ID", async () => {
  const f = fixture();
  const res = await f.invoke({
    raw: JSON.stringify({ question: "  Exercise research?  " }),
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.answer, "Research explanation");
  assert.deepEqual(res.body.sources, []);
  assert.match(res.body.requestId, /^[a-f0-9-]{36}$/);
  assert.deepEqual(Object.keys(res.body).sort(), [
    "answer",
    "requestId",
    "sources",
  ]);
  assert.equal(f.calls[0][0], "Exercise research?");
  assert.equal(res.headers["Cache-Control"], "no-store");
  assert.equal(
    res.headers["Access-Control-Allow-Origin"],
    "http://127.0.0.1:4323",
  );
});

test("rejects missing, non-string, empty and oversized questions", async () => {
  for (const question of [
    undefined,
    null,
    123,
    [],
    {},
    "",
    " \n ",
    "x".repeat(4001),
  ]) {
    const f = fixture();
    assert.equal(
      (await f.invoke({ raw: JSON.stringify({ question }) })).status,
      400,
    );
    assert.equal(f.calls.length, 0);
  }
  assert.equal(
    (
      await fixture().invoke({
        raw: JSON.stringify({ question: "x".repeat(4000) }),
      })
    ).status,
    200,
  );
});

test("rejects wrong method, malformed JSON, wrong content type and oversized bodies", async () => {
  for (const [input, status] of [
    [{ method: "GET" }, 405],
    [{ method: "PUT" }, 405],
    [{ raw: "{" }, 400],
    [{ headers: { "content-type": "text/plain" } }, 415],
    [{ raw: " ".repeat(MAX_BODY_BYTES + 1) }, 413],
    [{ headers: { "content-length": String(MAX_BODY_BYTES + 1) } }, 413],
  ]) {
    const f = fixture();
    const result = await f.invoke(input);
    assert.equal(result.status, status);
    assert.deepEqual(Object.keys(result.body), ["error"]);
    assert.equal(f.calls.length, 0);
  }
});

test("CORS rejects foreign/missing origins and restricts preflight", async () => {
  for (const origin of ["https://evil.example", "*", undefined]) {
    const f = fixture();
    const result = await f.invoke({ headers: { origin } });
    assert.equal(result.status, 403);
    assert.equal(result.headers["Access-Control-Allow-Origin"], undefined);
  }
  const f = fixture();
  const result = await f.invoke({
    method: "OPTIONS",
    headers: {
      "access-control-request-method": "POST",
      "access-control-request-headers": "content-type",
    },
  });
  assert.equal(result.status, 204);
  assert.equal(f.calls.length, 0);
  assert.equal(result.headers["Access-Control-Allow-Methods"], "POST");
  assert.equal(
    (
      await fixture().invoke({
        headers: {
          origin:
            "https://meridian-station-preview--founder-review-example.web.app",
        },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await fixture({ previewOrigin: () => "https://evil.example" }).invoke({
        headers: { origin: "https://evil.example" },
      })
    ).status,
    403,
  );
});

test("missing/throwing key, upstream failures and empty output return generic JSON", async () => {
  for (const [deps, code] of [
    [{ getKey: () => "" }, 503],
    [
      {
        getKey: () => {
          throw new Error("secret details");
        },
      },
      503,
    ],
    [
      {
        generate: async () => {
          throw new Error("secret question prompt stack");
        },
      },
      502,
    ],
    [{ generate: async () => "" }, 502],
  ]) {
    const f = fixture(deps);
    const result = await f.invoke();
    assert.equal(result.status, code);
    assert.deepEqual(Object.keys(result.body), ["error"]);
    assert.doesNotMatch(
      JSON.stringify(result),
      /secret|stack|test-placeholder/,
    );
  }
});

test("timeout aborts the upstream and permits later retries", async () => {
  let signal;
  const f = fixture({
    timeoutMs: 5,
    generate: async (_question, _key, s) => {
      signal = s;
      return new Promise(() => {});
    },
  });
  assert.equal((await f.invoke()).status, 504);
  assert.equal(signal.aborted, true);
  assert.equal(f.logs[0].category, "timeout");
});

test("logging has only metadata, not prompt, question, answer, key, IP or raw errors", async () => {
  const f = fixture();
  await f.invoke({
    raw: JSON.stringify({ question: "private question sentinel" }),
  });
  assert.deepEqual(Object.keys(f.logs[0]).sort(), [
    "category",
    "latencyMs",
    "requestId",
    "status",
    "timestamp",
  ]);
  assert.doesNotMatch(
    JSON.stringify(f.logs),
    /private question|Research explanation|test-placeholder|127\.0\.0\.1/,
  );
  const fail = fixture({
    generate: async () => {
      throw new Error(parkinsonsInstructions);
    },
  });
  await fail.invoke();
  assert.doesNotMatch(
    JSON.stringify(fail.logs),
    /educational|Parkinson|instructions/,
  );
});

test("throttle limits IPs and total requests and expires counts", async () => {
  const allow = createThrottle();
  const now = Date.now();
  for (let i = 0; i < 5; i++) assert.equal(allow("one", now), true);
  assert.equal(allow("one", now), false);
  for (let i = 5; i < INSTANCE_REQUESTS; i++)
    assert.equal(allow(String(i), now), true);
  assert.equal(allow("new", now), false);
  assert.equal(allow("one", now + 60_001), true);
  const f = fixture();
  for (let i = 0; i < 5; i++) await f.invoke();
  const limited = await f.invoke();
  assert.equal(limited.status, 429);
  assert.equal(limited.headers["Retry-After"], "60");
});

test("official OpenAI SDK calls Responses with bounded nonstored input and maps output_text", async () => {
  let captured;
  const client = new OpenAI({
    apiKey: "test-placeholder-not-a-real-key",
    maxRetries: 0,
    fetch: async (url, init) => {
      captured = { url: String(url), body: JSON.parse(init.body) };
      return new Response(
        JSON.stringify({
          id: "resp_test",
          object: "response",
          status: "completed",
          output: [
            {
              type: "message",
              id: "msg_test",
              role: "assistant",
              status: "completed",
              content: [
                { type: "output_text", text: "Plain answer", annotations: [] },
              ],
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  });
  const answer = await requestAnswer(
    client,
    "Exercise research?",
    new AbortController().signal,
  );
  assert.equal(answer, "Plain answer");
  assert.equal(captured.url, "https://api.openai.com/v1/responses");
  assert.equal(captured.body.model, MODEL);
  assert.equal(captured.body.max_output_tokens, MAX_OUTPUT_TOKENS);
  assert.equal(captured.body.store, false);
  assert.equal(captured.body.instructions, parkinsonsInstructions);
  assert.equal(captured.body.previous_response_id, undefined);
  assert.equal(captured.body.tools, undefined);
});
