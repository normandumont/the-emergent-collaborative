import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import {
  PubmedClient,
  RateLimiter,
  peakHours,
  retryDelay,
} from "../lib/discovery/pubmed-client.js";
import {
  MAX_RESPONSE_BYTES,
  REQUEST_TIMEOUT_MS,
} from "../lib/shared/constants.js";
import { config, clock } from "./helpers.mjs";

test("E-utilities credentials stay in POST body; OAI uses current endpoint, compressed transfer and no API key", async () => {
  const calls = [];
  const client = new PubmedClient(
    { ...(await config()), apiKey: "fixture-secret" },
    async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response("fixture");
    },
    clock(),
  );
  await client.eutils("esearch.fcgi", {
    db: "pubmed",
    term: "controlled query",
  });
  await client.oai("PMC20001", "pmc_fm");
  assert.equal(
    calls[0].url,
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi",
  );
  const body = new URLSearchParams(calls[0].init.body);
  assert.equal(body.get("api_key"), "fixture-secret");
  assert.equal(body.get("term"), "controlled query");
  assert.ok(body.get("tool"));
  assert.ok(body.get("email"));
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.redirect, "error");
  const oai = new URL(calls[1].url);
  assert.equal(oai.pathname, "/api/oai/v1/mh/");
  assert.equal(
    oai.searchParams.get("identifier"),
    "oai:pubmedcentral.nih.gov:20001",
  );
  assert.equal(oai.searchParams.get("metadataPrefix"), "pmc_fm");
  assert.equal(
    new Headers(calls[1].init.headers).get("Accept-Encoding"),
    "gzip, deflate",
  );
  for (const call of calls)
    assert.equal(
      new Headers(call.init.headers).get("User-Agent"),
      "meridian-station-rag-prototype",
    );
  assert.ok(!JSON.stringify(calls[1]).includes("fixture-secret"));
});

test("rate limiter reserves spaced start times, including concurrent callers", async () => {
  const time = clock(0);
  const limiter = new RateLimiter(3, time);
  await Promise.all([
    limiter.wait(),
    limiter.wait(),
    limiter.wait(),
    limiter.wait(),
  ]);
  assert.equal(time.now(), 1002);
  assert.ok(time.delays.every((delay) => delay >= 334));
});

test("a delayed timer wakeup cannot cause subsequent requests to bunch together", async () => {
  let now = 0;
  const limiter = new RateLimiter(3, {
    now: () => now,
    sleep: async (ms) => {
      now += ms + 1000;
    },
  });
  await limiter.wait();
  await limiter.wait();
  const lateStart = now;
  await limiter.wait();
  assert.ok(now - lateStart >= 334);
});

test("client serializes calls and preserves separate capped OAI rate even with an E-utilities key", async () => {
  const time = clock(0);
  const starts = [];
  let active = 0;
  const client = new PubmedClient(
    { ...(await config()), apiKey: "fixture", requestsPerSecond: 10 },
    async (url) => {
      assert.equal(active++, 0);
      starts.push({ url: String(url), time: time.now() });
      await Promise.resolve();
      active--;
      return new Response("fixture");
    },
    time,
  );
  await Promise.all([
    client.oai("PMC20001", "pmc"),
    client.oai("PMC20002", "pmc"),
    client.eutils("efetch.fcgi", {}),
    client.eutils("efetch.fcgi", {}),
  ]);
  assert.equal(starts[1].time - starts[0].time, 334);
  assert.equal(starts[3].time - starts[2].time, 100);
});

test("transient network/503 requests retry and terminal HTTP errors do not", async () => {
  let calls = 0;
  const client = new PubmedClient(
    await config(),
    async () => {
      calls++;
      if (calls === 1) throw new TypeError("fixture-secret must not escape");
      return calls === 2
        ? new Response("provider body", { status: 503 })
        : new Response("ok");
    },
    clock(),
  );
  assert.equal(await client.eutils("efetch.fcgi", {}), "ok");
  assert.equal(calls, 3);
  let terminalCalls = 0;
  const terminal = new PubmedClient(
    await config(),
    async () => {
      terminalCalls++;
      return new Response("secret", { status: 400 });
    },
    clock(),
  );
  await assert.rejects(terminal.eutils("efetch.fcgi", {}), {
    category: "http",
  });
  assert.equal(terminalCalls, 1);
});

test("429 and NCBI HTTP-200 throttling respect Retry-After and exhaust with categorized errors", async () => {
  const time = clock();
  let calls = 0;
  const client = new PubmedClient(
    await config(),
    async () => {
      calls++;
      if (calls === 1)
        return new Response("throttled", {
          status: 429,
          headers: { "Retry-After": "2" },
        });
      return calls === 2
        ? new Response('{"error":"API rate limit exceeded"}')
        : new Response("ok");
    },
    time,
  );
  assert.equal(await client.eutils("efetch.fcgi", {}), "ok");
  assert.equal(time.delays[0], 2000);
  assert.ok(time.delays[1] >= 2000 && time.delays[1] < 2500);
  const exhausted = new PubmedClient(
    await config(),
    async () => new Response('{"error":"API rate limit exceeded"}'),
    clock(),
  );
  await assert.rejects(exhausted.eutils("efetch.fcgi", {}), {
    category: "throttled",
  });
  const longWait = new PubmedClient(
    await config(),
    async () =>
      new Response("", { status: 429, headers: { "Retry-After": "121" } }),
    clock(),
  );
  await assert.rejects(longWait.eutils("efetch.fcgi", {}), {
    category: "throttled",
  });
});

test("Retry-After accepts dates but refuses invalid and excessive wait instructions", () => {
  const now = Date.parse("2026-01-01T00:00:00Z");
  assert.equal(retryDelay("Thu, 01 Jan 2026 00:00:02 GMT", now, 0), 2000);
  assert.throws(() => retryDelay("garbage", now, 0), { category: "throttled" });
  assert.throws(() => retryDelay("121", now, 0), { category: "throttled" });
});

test("response size is bounded, never retrying an oversized source", async () => {
  let calls = 0;
  const client = new PubmedClient(
    await config(),
    async () => {
      calls++;
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(MAX_RESPONSE_BYTES + 1));
            controller.close();
          },
        }),
      );
    },
    clock(),
  );
  await assert.rejects(client.eutils("efetch.fcgi", {}), {
    category: "policy-limit",
  });
  assert.equal(calls, 1);
});

test("timeouts abort all three attempts and expose no raw exception", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let calls = 0;
  const client = new PubmedClient(
    await config(),
    async (_url, init) => {
      calls++;
      return new Promise((_resolve, reject) =>
        init.signal.addEventListener(
          "abort",
          () => reject(new Error("fixture secret")),
          { once: true },
        ),
      );
    },
    clock(),
  );
  const request = client.eutils("efetch.fcgi", {});
  const rejection = assert.rejects(request, {
    category: "timeout",
    message: "NCBI connection attempts failed.",
  });
  for (let attempt = 1; attempt <= 3; attempt++) {
    while (calls < attempt)
      await new Promise((resolve) => setImmediate(resolve));
    t.mock.timers.tick(REQUEST_TIMEOUT_MS);
    await new Promise((resolve) => setImmediate(resolve));
  }
  await rejection;
  assert.equal(calls, 3);
});

test("PMC >100 request policy is enforced during Eastern weekday peak, not weekends", async () => {
  assert.equal(peakHours(Date.parse("2026-10-30T12:00:00Z")), true);
  assert.equal(peakHours(Date.parse("2026-10-31T12:00:00Z")), false);
  assert.equal(peakHours(Date.parse("2026-10-30T02:00:00Z")), false);
  let calls = 0;
  const client = new PubmedClient(
    await config(),
    async () => {
      calls++;
      return new Response("fixture");
    },
    clock(Date.parse("2026-10-30T12:00:00Z")),
  );
  for (let index = 0; index < 100; index++)
    await client.oai("PMC20001", "pmc_fm");
  await assert.rejects(client.oai("PMC20001", "pmc_fm"), {
    category: "policy-limit",
  });
  assert.equal(calls, 100);
});

test("timeout retry uses a fresh signal and clears the successful attempt's timer", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const signals = [],
    diagnostics = [];
  const client = new PubmedClient(
    await config(),
    async (_url, init) => {
      signals.push(init.signal);
      assert.equal(init.signal.aborted, false);
      if (signals.length === 1)
        return new Promise((_resolve, reject) =>
          init.signal.addEventListener(
            "abort",
            () => reject(new Error("private provider failure")),
            { once: true },
          ),
        );
      return new Response("ok");
    },
    clock(),
    () => 0,
    (event) => diagnostics.push(event),
  );
  const request = client.oai("PMC20001", "pmc");
  while (signals.length < 1)
    await new Promise((resolve) => setImmediate(resolve));
  t.mock.timers.tick(REQUEST_TIMEOUT_MS);
  assert.equal(await request, "ok");
  assert.equal(signals.length, 2);
  assert.notEqual(signals[0], signals[1]);
  assert.equal(signals[0].aborted, true);
  t.mock.timers.tick(REQUEST_TIMEOUT_MS * 2);
  assert.equal(signals[1].aborted, false);
  assert.deepEqual(
    diagnostics.map(({ attempt, category, status }) => ({
      attempt,
      category,
      status,
    })),
    [
      { attempt: 1, category: "timeout", status: null },
      { attempt: 2, category: null, status: 200 },
    ],
  );
  assert.ok(
    diagnostics.every(
      (event) =>
        event.host === "pmc.ncbi.nlm.nih.gov" &&
        event.operation === "pmc-full-text",
    ),
  );
  assert.ok(!JSON.stringify(diagnostics).includes("private provider failure"));
});

test("exhausted timeouts release the serialized queue for the next request", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const signals = [];
  const client = new PubmedClient(
    await config(),
    async (_url, init) => {
      signals.push(init.signal);
      assert.equal(init.signal.aborted, false);
      if (signals.length <= 3)
        return new Promise((_resolve, reject) =>
          init.signal.addEventListener(
            "abort",
            () => reject(new Error("timeout fixture")),
            { once: true },
          ),
        );
      return new Response("next request");
    },
    clock(),
  );
  const rejected = assert.rejects(client.oai("PMC20001", "pmc"), {
    category: "timeout",
  });
  const next = client.oai("PMC20002", "pmc_fm");
  for (let attempt = 1; attempt <= 3; attempt++) {
    while (signals.length < attempt)
      await new Promise((resolve) => setImmediate(resolve));
    t.mock.timers.tick(REQUEST_TIMEOUT_MS);
    await new Promise((resolve) => setImmediate(resolve));
  }
  await rejected;
  assert.equal(await next, "next request");
  assert.equal(signals.length, 4);
  assert.equal(new Set(signals).size, 4);
  t.mock.timers.tick(REQUEST_TIMEOUT_MS * 2);
  assert.equal(signals[3].aborted, false);
});

test("non-deadline aborts are network failures and leave no stale timeout handles", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const signals = [];
  const client = new PubmedClient(
    await config(),
    async (_url, init) => {
      signals.push(init.signal);
      throw new DOMException("unrelated transport abort", "AbortError");
    },
    clock(),
  );
  await assert.rejects(client.oai("PMC20001", "pmc"), { category: "network" });
  t.mock.timers.tick(REQUEST_TIMEOUT_MS * 2);
  assert.equal(signals.length, 3);
  assert.ok(signals.every((signal) => !signal.aborted));
});

test("rate limiter releases a failed wait rather than poisoning its queue", async () => {
  let now = 0,
    sleeps = 0;
  const limiter = new RateLimiter(3, {
    now: () => now,
    sleep: async (delay) => {
      if (++sleeps === 1) throw new Error("clock fixture failure");
      now += delay;
    },
  });
  await limiter.wait();
  await assert.rejects(limiter.wait(), /clock fixture failure/);
  await limiter.wait();
  assert.equal(sleeps, 2);
  assert.equal(now, 334);
});

test("wrapper matches native fetch body handling on a local HTTP server and identifies the project", async (t) => {
  const received = [];
  const server = createServer((request, response) => {
    received.push(request.headers["user-agent"]);
    response.writeHead(200, {
      "Content-Type": "application/xml; charset=utf-8",
    });
    response.write("<fixture>evidence ");
    response.end("\u00e9</fixture>");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.closeAllConnections();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  );
  const url = `http://127.0.0.1:${server.address().port}/fixture`;
  const cfg = await config();
  const native = await (
    await fetch(url, { headers: { "User-Agent": cfg.tool } })
  ).text();
  let calls = 0;
  const diagnostics = [];
  const client = new PubmedClient(
    cfg,
    (remote, init) => {
      calls++;
      assert.equal(remote.hostname, "pmc.ncbi.nlm.nih.gov");
      assert.equal(new Headers(init.headers).get("User-Agent"), cfg.tool);
      return fetch(url, init);
    },
    undefined,
    undefined,
    (event) => diagnostics.push(event),
  );
  assert.equal(await client.oai("PMC20001", "pmc"), native);
  assert.equal(calls, 1, "Successful 2xx must not be retried");
  assert.deepEqual(received, [cfg.tool, cfg.tool]);
  assert.equal(diagnostics[0].status, 200);
  assert.equal(diagnostics[0].category, null);
});
