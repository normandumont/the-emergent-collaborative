import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("exact /api/ask reaches the local proxy without Astro's slash rejection", async ({
  request,
  baseURL,
}) => {
  const response = await request.post("/api/ask", {
    headers: { Origin: baseURL! },
    data: { question: "" },
  });
  // With the emulator stopped, Vite returns a connection error (500). With it
  // running, the empty question is rejected before any billable model request.
  expect([400, 500]).toContain(response.status());
  if (response.status() === 400) {
    expect(await response.json()).toEqual({
      error: "Enter a question of 1 to 4000 characters.",
    });
  }
});

test("form, safety order, keyboard focus and narrow layout are accessible", async ({
  page,
}) => {
  await page.goto("/");
  const form = page.locator("#ask-form");
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
  await page.route("**/api/ask", async (route) => {
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    await route.fulfill({
      json: { answer: "Late answer", sources: [], requestId: "late" },
    });
  });
  await page.goto("/");
  await page.getByLabel("Your Parkinson's research question").fill("Question");
  const ask = page.getByRole("button", { name: "Ask", exact: true });
  await ask.click();
  await expect(ask).toBeDisabled();
  await page.getByRole("button", { name: "Clear / reset" }).click();
  await expect(ask).toBeEnabled();
  await expect(page.locator("#ask-question")).toHaveValue("");
  await expect(page.locator("#ask-status")).toBeEmpty();
  await expect(page.locator("#ask-answer")).toBeEmpty();
});
