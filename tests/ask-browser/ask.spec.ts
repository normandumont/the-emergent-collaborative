import { test as base, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";

const config = JSON.parse(
  await readFile(new URL("../../firebase.json", import.meta.url), "utf8"),
);
const configuredHeaders: Record<string, string> = Object.fromEntries(
  config.hosting.headers
    .find(({ source }: { source: string }) => source === "**")
    .headers.map(({ key, value }: { key: string; value: string }) => [
      key,
      value,
    ]),
);

const test = base.extend({
  page: async ({ page, context, baseURL }, use) => {
    const external: string[] = [];
    await context.addInitScript(() => {
      // Record method names/abort state only, never question or answer contents.
      const writes: string[] = [];
      const requests: { aborted: boolean }[] = [];
      Object.defineProperties(window, {
        __askPersistenceWrites: { value: writes },
        __askRequests: { value: requests },
      });
      const monitor = (prototype: object, name: string, label: string) => {
        const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
        const original = descriptor?.value;
        if (typeof original !== "function")
          throw new Error(`Missing storage method: ${name}`);
        Object.defineProperty(prototype, name, {
          ...descriptor,
          value: function (this: unknown, ...args: unknown[]) {
            writes.push(label);
            return Reflect.apply(original, this, args);
          },
        });
      };
      monitor(Storage.prototype, "setItem", "localStorage/sessionStorage");
      monitor(IDBFactory.prototype, "open", "IndexedDB");
      monitor(CacheStorage.prototype, "open", "Cache Storage");
      for (const name of ["put", "add", "addAll"])
        monitor(Cache.prototype, name, "Cache Storage write");
      const cookie = Object.getOwnPropertyDescriptor(
        Document.prototype,
        "cookie",
      );
      const setCookie = cookie?.set;
      if (!setCookie) throw new Error("Missing cookie setter");
      Object.defineProperty(Document.prototype, "cookie", {
        ...cookie,
        set(value: string) {
          writes.push("cookie");
          setCookie.call(this, value);
        },
      });
      const nativeFetch = window.fetch.bind(window);
      window.fetch = (input, init) => {
        const record = { aborted: false };
        requests.push(record);
        init?.signal?.addEventListener(
          "abort",
          () => {
            record.aborted = true;
          },
          { once: true },
        );
        return nativeFetch(input, init);
      };
    });
    await page.route("**/*", async (route) => {
      if (new URL(route.request().url()).origin !== baseURL) {
        external.push(new URL(route.request().url()).origin);
        await route.abort();
        return;
      }
      if (route.request().resourceType() === "document") {
        const response = await route.fetch();
        await route.fulfill({
          response,
          headers: { ...response.headers(), ...configuredHeaders },
        });
        return;
      }
      await route.continue();
    });
    await use(page);
    expect(external).toEqual([]);
    expect(
      await page.evaluate(() => Reflect.get(window, "__askPersistenceWrites")),
    ).toEqual([]);
    expect(await context.cookies()).toEqual([]);
  },
});

test("form, safety order, keyboard focus and narrow layout are accessible", async ({
  page,
}) => {
  await page.goto("/");
  const form = page.locator("#ask-form");
  await expect(page.locator('script[src="/ask.js"]')).toHaveCount(1);
  await expect(page.locator("script:not([src])")).toHaveCount(0);
  await expect(form).toHaveAttribute("data-endpoint", "/api/ask");
  await expect(
    page.getByRole("heading", { name: "Ask Parkinson's Insights" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Your Parkinson's research question"),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      Boolean(
        document
          .querySelector("#ask-warning")!
          .compareDocumentPosition(document.querySelector("#ask-question")!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ),
  ).toBe(true);
  await page.getByLabel("Your Parkinson's research question").focus();
  await page.keyboard.press("Tab");
  await expect(
    form.getByRole("button", { name: "Ask", exact: true }),
  ).toBeFocused();
  expect(
    await form
      .getByRole("button", { name: "Ask", exact: true })
      .evaluate((button) => getComputedStyle(button).outlineStyle),
  ).toBe("solid");
  expect(
    (
      await new AxeBuilder({ page })
        .include("#ask-parkinsons")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 320, height: 900 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("pending disables submit; HTML-like answers render as text; reset and reload clear results", async ({
  page,
  context,
}) => {
  let complete: (() => void) | undefined;
  const waiting = new Promise<void>((resolve) => {
    complete = resolve;
  });
  const payload =
    '<img src=x onerror="window.modelExecuted=true"><script>window.modelExecuted=true</script>';
  await page.route("**/api/ask", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toEqual({
      question: "Exercise research?",
    });
    expect(route.request().headers()["cookie"]).toBeUndefined();
    await waiting;
    await route.fulfill({
      json: { answer: payload, sources: [], requestId: "test" },
    });
  });
  await page.goto("/");
  const ask = page.getByRole("button", { name: "Ask", exact: true });
  await page
    .getByLabel("Your Parkinson's research question")
    .fill("Exercise research?");
  await ask.click();
  await expect(ask).toBeDisabled();
  await expect(page.locator("#ask-status")).toHaveText(
    "Asking Parkinson's Insights…",
  );
  await page.getByLabel("Your Parkinson's research question").focus();
  complete!();
  await expect(page.locator("#ask-answer")).toHaveText(payload);
  await expect(page.locator("#ask-answer img, #ask-answer script")).toHaveCount(
    0,
  );
  expect(await page.evaluate(() => "modelExecuted" in window)).toBe(false);
  await expect(ask).toBeEnabled();
  await expect(
    page.getByLabel("Your Parkinson's research question"),
  ).toBeFocused();
  expect(
    await page.evaluate(async () => ({
      local: localStorage.length,
      session: sessionStorage.length,
      databases: await indexedDB.databases(),
      caches: await caches.keys(),
    })),
  ).toEqual({ local: 0, session: 0, databases: [], caches: [] });
  expect(await context.cookies()).toEqual([]);
  await page.locator("#ask-parkinsons").screenshot({
    path: "test-results/ask-prototype-answer.png",
  });
  await page.getByRole("button", { name: "Clear / reset" }).click();
  await expect(page.locator("#ask-answer")).toBeEmpty();
  await expect(page.locator("#ask-question")).toHaveValue("");
  await page.reload();
  await expect(page.locator("#ask-answer")).toBeEmpty();
  await expect(page.locator("#ask-question")).toHaveValue("");
});

test("upstream error text is never injected and a retry succeeds", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/ask", async (route) => {
    calls += 1;
    await route.fulfill(
      calls === 1
        ? {
            status: 502,
            json: { error: '<img onerror="alert(1)">internal details' },
          }
        : {
            json: {
              answer: "Uncertain evidence",
              sources: [],
              requestId: "retry",
            },
          },
    );
  });
  await page.goto("/");
  await page
    .getByLabel("Your Parkinson's research question")
    .fill("Research question");
  const ask = page.getByRole("button", { name: "Ask", exact: true });
  await ask.click();
  await expect(page.locator("#ask-status")).toHaveText(
    "The research tool could not answer. Please retry later.",
  );
  await expect(page.locator("#ask-parkinsons img")).toHaveCount(0);
  await ask.click();
  await expect(page.locator("#ask-answer")).toHaveText("Uncertain evidence");
});

test("timeout and non-JSON gateway errors recover without losing the retry question", async ({
  page,
}) => {
  await page.clock.install();
  await page.route("**/api/ask", async (route) => {
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    await route.abort();
  });

  await page.goto("/");
  await page.getByLabel("Your Parkinson's research question").fill("Question");
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await page.clock.fastForward(30_001);
  await expect(page.locator("#ask-status")).toHaveText(
    "The request timed out. Please retry.",
  );
  await expect(
    page.getByRole("button", { name: "Ask", exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(() => Reflect.get(window, "__askRequests")),
  ).toEqual([{ aborted: true }]);
  await expect(page.locator("#ask-question")).toHaveValue("Question");
  await page.unroute("**/api/ask");
  await page.route("**/api/ask", (route) =>
    route.fulfill({ status: 500, body: "<html>Gateway error</html>" }),
  );
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await expect(page.locator("#ask-status")).toHaveText(
    "The research tool could not answer. Please retry later.",
  );
});

test("reset can cancel a pending request without showing a late answer or error", async ({
  page,
}) => {
  let count = 0;
  let release: (() => void) | undefined;
  let fulfilled: (() => void) | undefined;
  let started: (() => void) | undefined;
  const secondStarted = new Promise<void>((resolve) => {
    started = resolve;
  });
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const staleFulfilled = new Promise<void>((resolve) => {
    fulfilled = resolve;
  });
  await page.route("**/api/ask", async (route) => {
    if (++count === 1) {
      await route.fulfill({
        json: { answer: "Earlier answer", sources: [], requestId: "earlier" },
      });
      return;
    }
    started!();
    await pending;
    await route.fulfill({
      json: { answer: "Late answer", sources: [], requestId: "late" },
    });
    fulfilled!();
  });
  await page.goto("/");
  await page.getByLabel("Your Parkinson's research question").fill("Question");
  const ask = page.getByRole("button", { name: "Ask", exact: true });
  await ask.click();
  await expect(page.locator("#ask-answer")).toHaveText("Earlier answer");
  await ask.click();
  await secondStarted;
  try {
    await expect(ask).toBeDisabled();
    await expect(page.locator("#ask-answer")).toBeEmpty();
    await page.getByRole("button", { name: "Clear / reset" }).click();
    await expect(ask).toBeEnabled();
    expect(
      await page.evaluate(() => Reflect.get(window, "__askRequests")),
    ).toEqual([{ aborted: false }, { aborted: true }]);
  } finally {
    release!();
  }
  await staleFulfilled;
  await expect(page.locator("#ask-question")).toHaveValue("");
  await expect(page.locator("#ask-status")).toBeEmpty();
  await expect(page.locator("#ask-answer")).toBeEmpty();
});

test("pending protects against programmatic double submission as well as a disabled button", async ({
  page,
}) => {
  let count = 0;
  let release: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/ask", async (route) => {
    count += 1;
    await pending;
    await route.fulfill({
      json: { answer: "One answer", sources: [], requestId: "one" },
    });
  });
  await page.goto("/");
  await page.getByLabel("Your Parkinson's research question").fill("Research?");
  const ask = page.getByRole("button", { name: "Ask", exact: true });
  await ask.click();
  await expect(ask).toBeDisabled();
  try {
    await page.locator("#ask-form").dispatchEvent("submit");
    await page.locator("#ask-form").dispatchEvent("submit");
    expect(
      await page.evaluate(() => Reflect.get(window, "__askRequests")),
    ).toHaveLength(1);
  } finally {
    release!();
  }
  await expect(page.locator("#ask-answer")).toHaveText("One answer");
  expect(count).toBe(1);
});

test("validation, Origin, size, throttle and provider errors never render their response bodies", async ({
  page,
}) => {
  const statuses = [400, 403, 413, 415, 429, 502, 503, 504];
  let index = 0;
  await page.route("**/api/ask", (route) =>
    route.fulfill({
      status: statuses[index++]!,
      body: "<script>window.errorExecuted=true</script>sdk-sentinel API-key-sentinel",
      contentType: "text/html",
    }),
  );
  await page.goto("/");
  await page.getByLabel("Your Parkinson's research question").fill("Research?");
  for (const status of statuses) {
    await page.getByRole("button", { name: "Ask", exact: true }).click();
    await expect(page.locator("#ask-status")).toHaveText(
      status === 429
        ? "Too many requests. Please wait a minute and retry."
        : "The research tool could not answer. Please retry later.",
    );
    await expect(page.locator("#ask-answer")).toBeEmpty();
    await expect(page.locator("#ask-parkinsons")).not.toContainText(
      /sdk-sentinel|API-key-sentinel/,
    );
    expect(await page.evaluate(() => "errorExecuted" in window)).toBe(false);
  }
});

test("malformed successful payloads fail safely instead of becoming an answer", async ({
  page,
}) => {
  const payloads = [
    null,
    {},
    { answer: " ", sources: [], requestId: "x" },
    { answer: "Answer", sources: "not-an-array", requestId: "x" },
    { answer: "Answer", sources: [], requestId: 1 },
  ];
  let index = 0;
  await page.route("**/api/ask", (route) =>
    route.fulfill({ json: payloads[index++] }),
  );
  await page.goto("/");
  await page.getByLabel("Your Parkinson's research question").fill("Research?");
  for (const _payload of payloads) {
    await page.getByRole("button", { name: "Ask", exact: true }).click();
    await expect(page.locator("#ask-status")).toHaveText(
      "No readable answer was received. Please retry.",
    );
    await expect(page.locator("#ask-answer")).toBeEmpty();
  }
});
