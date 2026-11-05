import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";

const routes = [
  "/",
  "/mobile/",
  "/about/",
  "/parkinsons-project/",
  "/project-story/",
  "/research-approach/",
  "/founder/",
  "/privacy/",
  "/404.html",
];

test("all Astro routes are accessible, locally resourced and leave no persistence", async ({
  page,
  context,
  baseURL,
}) => {
  const externalRequests: string[] = [];
  await context.route("**/*", async (route) => {
    if (new URL(route.request().url()).origin !== new URL(baseURL!).origin) {
      externalRequests.push(route.request().url());
      await route.abort();
      return;
    }
    await route.continue();
  });
  for (const route of routes) {
    await page.goto(route);
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.locator("h1")).toHaveCount(1);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    expect(
      await page.evaluate(async () => ({
        local: localStorage.length,
        session: sessionStorage.length,
        databases: await indexedDB.databases(),
        caches: await caches.keys(),
        workers: (await navigator.serviceWorker.getRegistrations()).length,
      })),
    ).toEqual({ local: 0, session: 0, databases: [], caches: [], workers: 0 });
    await expect(page.locator("[data-placeholder]")).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
  }
  await page.goto("/missing-scaffold-route/");
  await expect(
    page.getByRole("heading", { name: "Page not found", exact: true }),
  ).toBeVisible();
  expect(externalRequests).toEqual([]);
  expect(await context.cookies()).toEqual([]);
});

test("skip link, desktop and native mobile navigation work without JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(baseURL!);
      await page.keyboard.press("Tab");
      await expect(
        page.getByRole("link", { name: "Skip to main content" }),
      ).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.locator("#main-content")).toBeFocused();
      for (const [name, destination] of [
        ["AI Knowledgebase", "/#knowledgebase"],
        ["Mobile App", "/mobile/"],
        ["About", "/about/"],
        ["Project Story", "/project-story/"],
        ["Privacy", "/privacy/"],
      ] as const) {
        if (width < 900) {
          const menu = page.locator(".mobile-nav summary");
          await menu.focus();
          await page.keyboard.press("Enter");
        }
        const nav = page.getByRole("navigation", {
          name: width < 900 ? "Mobile navigation" : "Primary navigation",
          exact: true,
        });
        await expect(nav.getByRole("link")).toHaveCount(5);
        await nav.getByRole("link", { name, exact: true }).click();
        await expect(page).toHaveURL(new URL(destination!, baseURL!).href);
        if (name === "AI Knowledgebase") {
          await expect(page.locator("#ask-form")).toBeInViewport();
          expect(await page.locator("noscript").textContent()).toContain(
            "requires JavaScript",
          );
          // Close the native menu before testing the next destination.
          if (width < 900) await page.locator(".mobile-nav summary").click();
        }
      }
    }
  } finally {
    await context.close();
  }
});

test("homepage has only the product-led flow and all five secondary story links", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#introduction h1")).toHaveText(
    "Finding direction through evidence, experience, and emerging technology.",
  );
  await expect(page.locator("#ask-title")).toHaveText(
    "Ask Parkinson's Insights",
  );
  await expect(page.locator("#mobile-title")).toHaveText(
    "Understanding change over time.",
  );
  await expect(page.locator(".mobile-copy")).toContainText("In development");
  await expect(page.locator(".mobile-copy")).toContainText(
    "not a diagnostic or clinical product",
  );
  const story = page.getByRole("navigation", {
    name: "Explore Meridian Station",
  });
  await expect(story.getByRole("link")).toHaveText([
    "Why Meridian Station →",
    "The Parkinson's Project →",
    "The 711-mile ride →",
    "Research approach →",
    "About the founder →",
  ]);
  for (const link of await story.getByRole("link").all()) {
    const href = await link.getAttribute("href");
    expect(href).toMatch(
      /^\/(?:about|parkinsons-project|project-story|research-approach|founder)\/$/,
    );
  }
  for (const selector of [
    "#origin",
    "#current-work",
    "#collaborate",
    "#our-approach",
    "#sources",
    ".section-map",
  ])
    await expect(page.locator(selector)).toHaveCount(0);
  await expect(page.locator('script[src="/ask.js"]')).toHaveCount(1);
  await expect(
    page.locator("script:not([src]), astro-island, input"),
  ).toHaveCount(0);
  await expect(page.locator("#ask-form")).toHaveCount(1);
  await expect(page.locator("#ask-form")).toHaveAttribute(
    "data-endpoint",
    "/api/ask",
  );
  await expect(page.locator(".device-preview")).toHaveCount(1);
  await expect(page.locator(".device-preview figcaption")).toContainText(
    "Not recorded health data",
  );
  await expect(page.locator(".wordmark")).toHaveAccessibleName(
    "Meridian Station home",
  );
  const sections = await page
    .locator("#introduction, #knowledgebase, .mobile-product")
    .all();
  let previousBottom = 0;
  for (const section of sections) {
    const bounds = await section.boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(previousBottom);
    previousBottom = bounds!.y + bounds!.height;
  }
});

test("Explore panel is expanded by default and collapses accessibly without JavaScript", async ({
  browser,
  baseURL,
}, testInfo) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(baseURL!);
    const panel = page.locator(".story-nav");
    const toggle = panel.locator("summary");
    const navigation = panel.getByRole("navigation", {
      name: "Explore Meridian Station",
    });
    await expect(panel).toHaveAttribute("open", "");
    await expect(navigation.getByRole("link")).toHaveCount(5);
    await expect(toggle).toHaveAccessibleName("Explore Meridian Station");
    const content = page.locator(".home-content");
    const expanded = await content.boundingBox();
    const sidebar = await page.locator(".explore-panel").boundingBox();
    expect(sidebar!.x + sidebar!.width).toBeLessThanOrEqual(expanded!.x);
    await page.screenshot({
      path: testInfo.outputPath("explore-expanded.png"),
    });

    await toggle.focus();
    await page.keyboard.press("Space");
    await expect(panel).not.toHaveAttribute("open");
    await expect(navigation).not.toBeVisible();
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveCSS("outline-style", "solid");
    expect((await content.boundingBox())!.width).toBeGreaterThan(
      expanded!.width,
    );
    await page.screenshot({
      path: testInfo.outputPath("explore-collapsed.png"),
    });

    await page.keyboard.press("Enter");
    await expect(panel).toHaveAttribute("open", "");
    await expect(navigation.getByRole("link").first()).toBeVisible();
    await page.setViewportSize({ width: 390, height: 900 });
    await page.reload();
    await expect(panel).toHaveAttribute("open", "");
    const stacked = await page.locator(".explore-panel").boundingBox();
    const main = await content.boundingBox();
    expect(stacked!.y + stacked!.height).toBeLessThanOrEqual(main!.y);
    await toggle.click();
    await expect(navigation).not.toBeVisible();
    expect((await content.boundingBox())!.y).toBeLessThan(main!.y);
    await page.screenshot({
      path: testInfo.outputPath("explore-mobile-collapsed.png"),
    });
  } finally {
    await context.close();
  }
});

test("background pages and contact/privacy journey preserve their safety boundaries", async ({
  page,
}) => {
  await page.goto("/research-approach/");
  await expect(page.locator("[data-concept] h2")).toHaveText([
    "Evidence",
    "Experience",
    "Exploration",
  ]);
  await expect(page.locator('[data-concept="Experience"]')).toContainText(
    "not treat one person's observation as proof",
  );
  await expect(page.locator('[data-concept="Exploration"]')).toContainText(
    "not established medical treatment",
  );
  await page.goto("/project-story/");
  await expect(page.locator("main")).toContainText(
    "not a verified operating tracker, working AI system, completed ride, or formal research study",
  );
  await page.goto("/founder/");
  await expect(page.locator("main")).toContainText("Rebar Foundry");
  await page.goto("/about/#collaborate");
  let previousBottom = 0;
  for (const selector of [
    ".contribution-examples",
    ".contact-warning",
    "#contact-privacy",
    ".contact-address",
    ".message-guidance",
    ".contact-expectation",
  ]) {
    const item = page.locator(`#collaborate ${selector}`);
    const bounds = await item.boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(previousBottom);
    previousBottom = bounds!.y + bounds!.height;
  }
  await expect(page.locator(".contribution-examples li")).toHaveCount(4);
  await expect(page.locator(".contact-warning")).toContainText(
    "Do not attach files.",
  );
  await expect(page.locator(".contact-expectation")).toContainText(
    "5–7 business days",
  );
  await expect(page.locator(".email-address")).toHaveAttribute(
    "href",
    "mailto:contact@meridianstation.org",
  );
  await page.locator("#contact-privacy a").click();
  await expect(page.locator("main > section h2")).toHaveText([
    "Who is responsible",
    "AI-assisted research questions",
    "If you email",
    "Visiting the website",
    "Service providers",
    "Questions, deletion, or an accidental disclosure",
    "Notice dates",
  ]);
  await expect(page.locator("#privacy-ai")).toContainText("OpenAI API");
  await expect(page.locator("#privacy-ai")).toContainText(
    "Firebase Cloud Function",
  );
  await expect(page.locator("#privacy-email")).toContainText(
    "Cloudflare Email Routing",
  );
  await expect(page.locator("a[href^='mailto:']")).toHaveCount(0);
  await page
    .getByRole("link", { name: "Contact about privacy", exact: true })
    .click();
  await expect(page).toHaveURL(/\/about\/#collaborate$/);
  await expect(page.locator("#collaborate h2")).toBeInViewport();
});

test("reference typography, primary blue and secondary green retain contrast and visible focus", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() =>
      Array.from(document.fonts).map((font) => ({
        family: font.family,
        status: font.status,
      })),
    ),
  ).toEqual([{ family: "Inter", status: "loaded" }]);
  await expect(page.locator("h1")).toHaveCSS("font-family", /Inter/);
  await expect(page.locator("h1")).toHaveCSS("font-weight", "540");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(246, 246, 243)",
  );
  await expect(page.locator(".ask-button")).toHaveCSS(
    "background-color",
    "rgb(49, 87, 213)",
  );
  await expect(page.locator(".device-dot")).toHaveCSS(
    "background-color",
    "rgb(111, 159, 122)",
  );
  await expect(page.locator(".green-kicker")).toHaveCSS(
    "color",
    "rgb(56, 98, 67)",
  );
  await expect(page.locator(".mobile-product")).toHaveCSS(
    "background-color",
    "rgb(234, 234, 243)",
  );

  function luminance(rgb: string) {
    const values = rgb
      .match(/\d+/g)!
      .map(Number)
      .map((value) => {
        const channel = value / 255;
        return channel <= 0.04045
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4;
      });
    return values[0]! * 0.2126 + values[1]! * 0.7152 + values[2]! * 0.0722;
  }
  const ratios = [];
  for (const selector of [
    "body",
    ".desktop-nav a",
    ".wordmark-mark",
    ".hero-copy",
    "#ask-warning",
    ".ask-button",
    ".reset-button",
    ".green-kicker",
    ".product-caveat",
    ".device-preview figcaption",
    ".footer-meta",
    ".site-footer a",
  ]) {
    const pair = await page
      .locator(selector)
      .first()
      .evaluate((element) => {
        let background = "rgb(255, 255, 255)";
        let ancestor: Element | null = element;
        while (ancestor) {
          const color = getComputedStyle(ancestor).backgroundColor;
          if (color !== "rgba(0, 0, 0, 0)") {
            background = color;
            break;
          }
          ancestor = ancestor.parentElement;
        }
        return { foreground: getComputedStyle(element).color, background };
      });
    const a = luminance(pair.foreground),
      b = luminance(pair.background);
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    expect(ratio, `${selector} text contrast`).toBeGreaterThanOrEqual(4.5);
    ratios.push({ selector, ...pair, ratio });
  }
  await writeFile(
    testInfo.outputPath("rendered-contrast.json"),
    JSON.stringify(ratios, null, 2),
  );
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to main content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  const action = page.getByRole("button", { name: "Ask", exact: true });
  await action.focus();
  await expect(action).toHaveCSS("outline-style", "solid");
  await action.hover();
  await expect(action).toHaveCSS("background-color", "rgb(36, 69, 181)");
  await expect(action).toHaveCSS("color", "rgb(255, 255, 255)");
  await action.screenshot({ path: testInfo.outputPath("ask-focus.png") });
  await page.emulateMedia({ forcedColors: "active" });
  await expect(action).toHaveCSS("outline-style", "solid");
  await page.screenshot({
    path: testInfo.outputPath("forced-colors-focus.png"),
  });
});

test("font failure retains readable fallback and narrow enlarged reflow", async ({
  page,
}) => {
  await page.route("**/*.woff2", (route) => route.abort());
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(() =>
        Array.from(document.fonts).every((font) => font.status === "error"),
      ),
    ).toBe(true);
    for (const enlarged of [false, true]) {
      if (enlarged)
        await page.addStyleTag({ content: "html { font-size: 200%; }" });
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        await page
          .locator("h1, h2, h3, p, a")
          .evaluateAll((elements) =>
            elements
              .filter(
                (element) => element.scrollWidth > element.clientWidth + 1,
              )
              .map((element) => element.textContent),
          ),
      ).toEqual([]);
    }
  }
});

test("desktop product and secondary-page visual review specimens", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    fullPage: true,
    path: testInfo.outputPath("homepage-desktop.png"),
  });
  for (const selector of [
    "#introduction",
    "#ask-parkinsons",
    ".mobile-product",
    ".story-nav",
  ]) {
    await page.locator(selector).screenshot({
      path: testInfo.outputPath(`desktop-${selector.replace(/[.#]/g, "")}.png`),
    });
  }
  for (const route of ["mobile", "research-approach"]) {
    await page.goto(`/${route}/`);
    await page.screenshot({
      fullPage: true,
      path: testInfo.outputPath(`${route}-desktop.png`),
    });
  }
});

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`product and detail layouts reflow at ${width}px and 200% text`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", "/mobile/", "/about/", "/privacy/"]) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      const textTargets = page.locator("h1, main p, nav a");
      const original = await textTargets.evaluateAll((elements) =>
        elements.map((element) =>
          parseFloat(getComputedStyle(element).fontSize),
        ),
      );
      for (const enlarged of [false, true]) {
        if (enlarged) {
          await page.addStyleTag({ content: "html { font-size: 200%; }" });
          const sizes = await textTargets.evaluateAll((elements) =>
            elements.map((element) =>
              parseFloat(getComputedStyle(element).fontSize),
            ),
          );
          expect(sizes).toHaveLength(original.length);
          sizes.forEach((size, index) =>
            expect(size).toBeGreaterThanOrEqual(original[index]! * 2),
          );
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
        const clipped = await page
          .locator(
            "h1, h2, h3, p, li, nav, a, .composer, .mobile-copy, .detail-heading, .contact-warning",
          )
          .evaluateAll((elements) =>
            elements
              .filter(
                (element) => element.scrollWidth > element.clientWidth + 1,
              )
              .map((element) => element.textContent),
          );
        expect(clipped).toEqual([]);
        const name = route === "/" ? "homepage" : route.replaceAll("/", "");
        await page.screenshot({
          fullPage: !enlarged,
          path: testInfo.outputPath(
            `${name}-${width}-${enlarged ? "200" : "100"}.png`,
          ),
        });
      }
    }
  });
}
