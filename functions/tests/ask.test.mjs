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
import express from "express";
import { createServer } from "node:http";
import { once } from "node:events";
import {
  UPSTREAM_TIMEOUT_MS,
  PER_IP_REQUESTS,
  RATE_WINDOW_MS,
} from "../lib/config.js";

const previewOrigin =
  "https://meridian-station-preview--founder-review-example.web.app";
const fakeKey = "test-placeholder-not-a-real-key";

function metadataOnly(records) {
  assert.ok(records.length > 0);
  for (const record of records) {
    assert.deepEqual(Object.keys(record).sort(), [
      "category",
      "latencyMs",
      "requestId",
      "status",
      "timestamp",
    ]);
    assert.match(record.requestId, /^[a-f0-9-]{36}$/);
    assert.ok(Number.isFinite(Date.parse(record.timestamp)));
    assert.ok(Number.isFinite(record.latencyMs) && record.latencyMs >= 0);
    assert.equal(typeof record.status, "number");
    assert.equal(typeof record.category, "string");
    assert.ok(
      [
        "origin",
        "preflight",
        "method",
        "throttle",
        "content_type",
        "body_size",
        "json",
        "question",
        "configuration",
        "success",
        "empty_answer",
        "timeout",
        "upstream",
      ].includes(record.category),
      "Log category must remain coarse",
    );
    assert.doesNotMatch(
      JSON.stringify(record),
      /question-sentinel|answer-sentinel|body-sentinel|sdk-sentinel|test-placeholder|127\.0\.0\.1/,
    );
  }
}

function safeError(result, status, message) {
  assert.equal(result.status, status);
  assert.deepEqual(result.body, { error: message });
  assert.doesNotMatch(
    JSON.stringify(result),
    /sdk-sentinel|test-placeholder|stack|instructions|body-sentinel/,
  );
}

function sdkResponse(status = "completed", text = "Research explanation") {
  return {
    id: "resp_test",
    object: "response",
    status,
    output: [
      {
        type: "message",
        id: "msg_test",
        role: "assistant",
        status: "completed",
        content: [{ type: "output_text", text, annotations: [] }],
      },
    ],
  };
}

function fixture(overrides = {}) {
  const logs = [];
  const calls = [];
  const handler = createAskHandler({
    getKey: () => fakeKey,
    previewOrigin: () => previewOrigin,
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
  return { invoke, logs, calls, handler };
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
    safeError(
      await f.invoke({ raw: JSON.stringify({ question }) }),
      400,
      "Enter a question of 1 to 4000 characters.",
    );
    assert.equal(f.calls.length, 0);
    metadataOnly(f.logs);
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
    metadataOnly(f.logs);
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
    metadataOnly(f.logs);
  }
});

test("configured OpenAI deadline aborts safely and a later retry can succeed", async ({
  mock,
}) => {
  mock.timers.enable({ apis: ["setTimeout"] });
  let signal;
  let calls = 0;
  const f = fixture({
    generate: async (_question, _key, s) => {
      if (calls++ > 0) return "Recovered answer";
      signal = s;
      return new Promise(() => {});
    },
  });
  const request = f.invoke();
  mock.timers.tick(UPSTREAM_TIMEOUT_MS - 1);
  assert.equal(signal.aborted, false);
  assert.equal(f.logs.length, 0);
  mock.timers.tick(1);
  safeError(
    await request,
    504,
    "The research tool could not answer. Please retry later.",
  );
  assert.equal(signal.aborted, true);
  assert.equal(f.logs[0].category, "timeout");
  assert.equal((await f.invoke()).status, 200);
  metadataOnly(f.logs);
});

test("logging has only metadata, not prompt, question, answer, key, IP or raw errors", async () => {
  const f = fixture({ generate: async () => "answer-sentinel" });
  await f.invoke({
    raw: JSON.stringify({
      question: "question-sentinel",
      extra: "body-sentinel",
    }),
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
      throw new Error("sdk-sentinel", {
        cause: {
          body: "body-sentinel",
          apiKey: fakeKey,
          prompt: parkinsonsInstructions,
        },
      });
    },
  });
  await fail.invoke();
  metadataOnly(f.logs);
  metadataOnly(fail.logs);
  assert.doesNotMatch(
    JSON.stringify(fail.logs),
    /educational|Parkinson|instructions/,
  );
});

test("throttle limits IPs and total requests and expires counts", async () => {
  const allow = createThrottle();
  const now = Date.now();
  for (let i = 0; i < PER_IP_REQUESTS; i++)
    assert.equal(allow("one", now), true);
  assert.equal(allow("one", now), false);
  for (let i = PER_IP_REQUESTS; i < INSTANCE_REQUESTS; i++)
    assert.equal(allow(String(i), now), true);
  assert.equal(allow("new", now), false);
  assert.equal(allow("one", now + RATE_WINDOW_MS + 1), true);
  const f = fixture();
  for (let i = 0; i < PER_IP_REQUESTS; i++) await f.invoke();
  const limited = await f.invoke();
  assert.equal(limited.status, 429);
  assert.equal(limited.headers["Retry-After"], "60");
  metadataOnly(f.logs);

  const total = fixture();
  for (let i = 0; i < INSTANCE_REQUESTS; i++) {
    assert.equal((await total.invoke({ ip: `test-client-${i}` })).status, 200);
  }
  safeError(
    await total.invoke({ ip: "another-client" }),
    429,
    "Too many requests. Please wait a minute and retry.",
  );
  metadataOnly(total.logs);
});

test("raw body byte boundary is enforced even with valid JSON and multibyte padding", async () => {
  const base = JSON.stringify({ question: "Research?", extra: "" });
  const exact = JSON.stringify({
    question: "Research?",
    extra: "x".repeat(MAX_BODY_BYTES - Buffer.byteLength(base)),
  });
  assert.equal(Buffer.byteLength(exact), MAX_BODY_BYTES);
  assert.equal((await fixture().invoke({ raw: exact })).status, 200);
  for (const raw of [
    exact.replace("Research?", "Research??"),
    JSON.stringify({
      question: "Research?",
      extra: "é".repeat(MAX_BODY_BYTES / 2),
    }),
  ]) {
    const f = fixture();
    safeError(
      await f.invoke({ raw }),
      413,
      "The request is too large or unreadable.",
    );
    assert.equal(f.calls.length, 0);
    metadataOnly(f.logs);
  }
});

test("missing Origin and lookalike preview origins fail without permissive CORS", async () => {
  for (const origin of [
    undefined,
    "",
    "null",
    `${previewOrigin}.evil.example`,
    "https://meridian-station-preview--another-channel.web.app",
  ]) {
    const f = fixture();
    const result = await f.invoke({ headers: { origin } });
    safeError(result, 403, "This origin is not allowed.");
    assert.equal(result.headers["Access-Control-Allow-Origin"], undefined);
    assert.equal(f.calls.length, 0);
    metadataOnly(f.logs);
  }
  const f = fixture();
  const approved = await f.invoke({ headers: { origin: previewOrigin } });
  assert.equal(approved.status, 200);
  assert.equal(approved.headers["Access-Control-Allow-Origin"], previewOrigin);
  assert.notEqual(approved.headers["Access-Control-Allow-Origin"], "*");
});

test("preflight rejects extra headers and non-POST methods without model calls", async () => {
  for (const headers of [
    { "access-control-request-method": "GET" },
    {
      "access-control-request-method": "POST",
      "access-control-request-headers": "content-type, authorization",
    },
  ]) {
    const f = fixture();
    safeError(
      await f.invoke({ method: "OPTIONS", headers }),
      403,
      "This request is not allowed.",
    );
    assert.equal(f.calls.length, 0);
    metadataOnly(f.logs);
  }
});

test("real HTTP handler and official SDK safely map completed, incomplete and provider-error responses", async () => {
  let mode = "completed";
  const client = new OpenAI({
    apiKey: fakeKey,
    maxRetries: 0,
    fetch: async () =>
      new Response(
        JSON.stringify(
          mode === "failure"
            ? {
                error: {
                  message: `sdk-sentinel ${fakeKey}`,
                  type: "server_error",
                },
              }
            : sdkResponse(mode),
        ),
        {
          status: mode === "failure" ? 500 : 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
  });
  const f = fixture({
    generate: (question, _key, signal) =>
      requestAnswer(client, question, signal),
  });
  const app = express();
  // This integration exercises handler/SDK/HTTP mapping. Managed JSON parsing
  // remains separately tested in the unmodified Firebase emulator.
  app.use(express.raw({ type: () => true, limit: MAX_BODY_BYTES + 1024 }));
  app.use((req, res) => {
    req.rawBody = req.body;
    return f.handler(req, res);
  });
  const server = createServer(app).listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    for (const nextMode of ["completed", "incomplete", "failed", "failure"]) {
      mode = nextMode;
      const response = await fetch(`http://127.0.0.1:${address.port}/api/ask`, {
        method: "POST",
        headers: { Origin: previewOrigin, "Content-Type": "application/json" },
        body: JSON.stringify({ question: "Research?" }),
        signal: AbortSignal.timeout(5000),
      });
      assert.match(response.headers.get("content-type"), /application\/json/);
      assert.equal(
        response.headers.get("access-control-allow-origin"),
        previewOrigin,
      );
      assert.match(response.headers.get("vary"), /Origin/);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(response.headers.get("set-cookie"), null);
      const body = await response.json();
      if (mode === "completed") {
        assert.equal(response.status, 200);
        assert.equal(typeof body.answer, "string");
        assert.ok(body.answer.trim());
        assert.ok(Array.isArray(body.sources));
        assert.equal(typeof body.requestId, "string");
      } else {
        safeError(
          { status: response.status, body },
          502,
          "The research tool could not answer. Please retry later.",
        );
      }
    }
    metadataOnly(f.logs);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
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
  assert.ok(
    captured.body.instructions === parkinsonsInstructions,
    "Responses instruction binding changed",
  );
  assert.equal(captured.body.previous_response_id, undefined);
  assert.equal(captured.body.tools, undefined);
});
