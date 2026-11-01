import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { placeholders } from "../../src/content/site";

test("all templates are readable, locally resourced, and pass bounded axe checks", async ({
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
  for (const route of ["/", "/privacy/", "/404.html"]) {
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
  }
  await page.goto("/missing-scaffold-route/");
  await expect(
    page.getByRole("heading", { name: "Page not found", exact: true }),
  ).toBeVisible();
  expect(externalRequests).toEqual([]);
  expect(await context.cookies()).toEqual([]);
});

test("skip link, four navigation destinations, and privacy are usable without client scripts", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(baseURL!);
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "Skip to main content" }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav.getByRole("link")).toHaveCount(4);
    for (const [name, id] of [
      ["Our approach", "our-approach"],
      ["Parkinson's initiative", "parkinsons-initiative"],
      ["Current work", "current-work"],
      ["Collaborate", "collaborate"],
    ] as const) {
      await nav.getByRole("link", { name, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`#${id}`)).toBeInViewport();
    }
    const map = page.getByRole("navigation", {
      name: "On this page",
      exact: true,
    });
    await expect(map.getByRole("link")).toHaveText([
      "Why change over time",
      "Our approach",
      "Parkinson's initiative",
      "Origin",
      "Current work",
      "Collaborate",
      "Sources",
    ]);
    for (const id of [
      "why-change",
      "our-approach",
      "parkinsons-initiative",
      "origin",
      "current-work",
      "collaborate",
      "sources",
    ]) {
      await map.locator(`a[href="#${id}"]`).click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(
        page.locator(`#${id} > h2, #${id} > .collaboration-intro > h2`),
      ).toBeInViewport();
    }
    await page.locator("#contact-privacy").getByRole("link").click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Privacy and contact information",
    );
    await expect(page.locator("#privacy-responsibility")).toContainText(
      "Responsible operator: Norman Dumont, Founder, Meridian Station",
    );
  } finally {
    await context.close();
  }
});

test("full narrative, editorial concepts, and publication gates remain visible", async ({
  page,
}) => {
  await page.goto("/");
  expect(
    await page
      .locator("[data-section]")
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-section")),
      ),
  ).toEqual(Array.from({ length: 10 }, (_, index) => `P${index}`));
  await expect(page.locator("#introduction h1")).toHaveText(
    "Finding direction through evidence, experience, and emerging technology.",
  );
  await expect(page.locator("#parkinsons-initiative h2")).toHaveText(
    "Parkinson's: our first initiative.",
  );
  const concepts = page.locator("#our-approach .concept-module");
  await expect(concepts.locator("h3")).toHaveText([
    "Evidence",
    "Experience",
    "Exploration",
  ]);
  expect(
    await concepts.evaluateAll((elements) =>
      elements.every(
        (element, index) =>
          index === 0 ||
          Boolean(
            elements[index - 1]!.compareDocumentPosition(element) &
            Node.DOCUMENT_POSITION_FOLLOWING,
          ),
      ),
    ),
  ).toBe(true);
  for (const concept of await concepts.all()) {
    await expect(concept).toBeVisible();
    const bounds = await concept.boundingBox();
    expect(bounds).not.toBeNull();
  }
  await expect(page.locator("#origin")).toContainText("Rebar Foundry");
  await expect(page.locator("#origin")).toContainText("Ride for Parkinson's");
  await expect(page.locator("#introduction")).toContainText(
    "research and technology initiative",
  );
  await expect(page.locator("#parkinsons-initiative")).toContainText(
    "AI-assisted Parkinson's knowledge resource",
  );
  await expect(page.locator("#parkinsons-initiative")).toContainText(
    "movement, exercise, sleep, symptoms, environmental conditions",
  );
  await expect(page.locator("#our-approach .direction-grid h3")).toHaveText([
    "Research Assistance",
    "Longitudinal Understanding",
    "Initiatives",
  ]);
  await expect(page.locator("#current-work .status-label")).toHaveText([
    "Status: Prototype — prior ride artifacts",
    "Status: Prototype — static review website",
    "Status: Active development — direction and scope",
    "Status: Future exploration — separate implementation",
  ]);
  await expect(page.locator("#current-work time")).toHaveAttribute(
    "datetime",
    "2026-10-29",
  );
  await expect(page.locator(".initiative-feature h3")).toHaveText([
    "AI-assisted knowledge resource",
    "Longitudinal understanding",
  ]);
  await expect(page.locator(".work-item")).toHaveCount(4);
  await expect(page.locator(".origin-transition")).toContainText(
    "Awareness + Technology",
  );
  await expect(page.locator(".intro-actions .section-action")).toHaveAttribute(
    "href",
    "#parkinsons-initiative",
  );
  await expect(page.locator("#current-work")).toContainText(
    "These capabilities are not currently offered as clinical, diagnostic, or treatment services.",
  );
  await expect(page.locator("#current-work")).not.toContainText(
    "remain ideas or experiments",
  );
  await expect(page.locator("#sources p")).toHaveCount(2);
  await expect(
    page.locator(
      "#sources a, #sources ul, #sources ol, cite, [role='doc-bibliography']",
    ),
  ).toHaveCount(0);
  await expect(
    page.locator("script, astro-island, form, input, textarea"),
  ).toHaveCount(0);
  await expect(page.locator(".identity")).toHaveText("Meridian Station");
  await expect(page.locator("body")).not.toContainText(
    "The Emergent Collaborative",
  );
  await expect(page).toHaveTitle(/Meridian Station$/);
  await expect(page.locator("a[href^='mailto:']")).toHaveCount(1);
  await expect(page.locator(".email-address")).toHaveText(
    "contact@meridianstation.org",
  );
  await expect(page.locator(".email-address")).toHaveAttribute(
    "href",
    "mailto:contact@meridianstation.org",
  );
  await expect(page.locator("#parkinsons-initiative")).toContainText(
    "Parkinson's is the first initiative, not the limit of the organization's interests.",
  );
  await expect(page.locator("[data-placeholder]")).toHaveCount(1);
  for (const [id, text] of Object.entries(placeholders)) {
    if (Number(id.slice(3)) >= 6 && Number(id.slice(3)) <= 14) continue;
    const marker = page.locator(`[data-placeholder="${id}"]`);
    await expect(marker).toBeVisible();
    await expect(marker).toContainText(text);
  }
});

test("collaboration and U1 preserve informed contact order and unresolved facts", async ({
  page,
}) => {
  await page.goto("/");
  const sequence = [
    ".contribution-examples",
    ".contact-warning",
    "#contact-privacy",
    ".contact-address",
    ".message-guidance",
    ".contact-expectation",
  ];
  let previousBottom = 0;
  for (const selector of sequence) {
    const item = page.locator(`#collaborate ${selector}`);
    await expect(item).toBeVisible();
    const bounds = await item.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.y).toBeGreaterThanOrEqual(previousBottom);
    previousBottom = bounds!.y + bounds!.height;
  }
  await expect(page.locator(".contribution-examples li")).toHaveCount(4);
  await expect(page.locator(".contact-warning")).toContainText(
    "Do not attach files.",
  );
  await expect(page.locator(".contact-expectation")).toHaveText(
    "Messages are reviewed by the founder of Meridian Station. We aim to respond to project-related inquiries within 5–7 business days.",
  );
  await page.locator("#contact-privacy a").click();
  await expect(page.locator("main > section h2")).toHaveText([
    "Who is responsible",
    "If you email",
    "Visiting the website",
    "Questions, deletion, or an accidental disclosure",
    "Notice dates and return links",
  ]);
  await expect(page.locator("#privacy-email")).toContainText(
    "Cloudflare Email Routing",
  );
  await expect(page.locator("#privacy-requests")).toContainText(
    "Meridian Station will make reasonable efforts to respond within 5–7 business days.",
  );
  await expect(page.locator("a[href^='mailto:']")).toHaveCount(0);
  await expect(page.locator("[data-placeholder]")).toHaveCount(5);
  for (const [id, text] of Object.entries(placeholders)) {
    const number = Number(id.slice(3));
    if (number < 6 || number > 14) continue;
    const marker = page.locator(`[data-placeholder="${id}"]`);
    await expect(marker).toBeVisible();
    await expect(marker).toContainText(text);
  }
  await page
    .getByRole("link", { name: "Contact about privacy", exact: true })
    .click();
  await expect(page).toHaveURL(/\/#collaborate$/);
  await expect(page.locator("#collaborate h2")).toBeInViewport();
});

test("Ride fonts, navy/royal identity, contrast and visible keyboard states", async ({
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
  ).toEqual([
    { family: "Inter", status: "loaded" },
    { family: "Libre Franklin", status: "loaded" },
  ]);
  await expect(page.locator("body")).toHaveCSS("font-family", /Inter/);
  await expect(page.locator("h1")).toHaveCSS("font-family", /Libre Franklin/);
  await expect(page.locator("h1")).toHaveCSS("font-weight", "700");
  await expect(page.locator(".identity")).toHaveCSS("font-weight", "800");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(245, 247, 248)",
  );
  await expect(page.locator(".hero h1 span")).toHaveCSS(
    "color",
    "rgb(82, 120, 199)",
  );
  await expect(page.locator(".hero-panel")).toHaveCSS(
    "border-top-color",
    "rgb(82, 120, 199)",
  );
  await expect(page.locator(".intro-actions .section-action")).toHaveCSS(
    "background-color",
    "rgb(40, 78, 145)",
  );
  await expect(page.locator("#origin")).toHaveCSS(
    "background-color",
    "rgb(25, 53, 84)",
  );
  for (const [index, color] of [
    "rgb(25, 53, 84)",
    "rgb(82, 120, 199)",
    "rgb(20, 95, 104)",
  ].entries()) {
    await expect(page.locator(".concept-module").nth(index)).toHaveCSS(
      "border-top-color",
      color,
    );
  }
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
  for (const [selector, minimum] of [
    ["body", 4.5],
    [".primary-navigation a", 4.5],
    [".primary-navigation li:last-child a", 4.5],
    [".identity span", 4.5],
    [".hero h1 span", 3],
    [".hero-definition", 4.5],
    [".initiative-label", 4.5],
    [".medical-boundary", 4.5],
    [".hero-panel h2", 4.5],
    [".concept-module h3", 4.5],
    [".initiative-feature .eyebrow", 4.5],
    [".origin-story", 4.5],
    [".origin-name", 4.5],
    [".status-label", 4.5],
    [".documentation-date", 4.5],
    [".contact-warning", 4.5],
    ["#contact-privacy a", 4.5],
    [".site-footer a", 4.5],
    [".placeholder", 4.5],
    [".intro-actions .section-action", 4.5],
    [".secondary-action", 4.5],
    [".email-address", 4.5],
    [".implementation-notice", 4.5],
  ] as const) {
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
    const a = luminance(pair.foreground);
    const b = luminance(pair.background);
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    expect(ratio, `${selector} text contrast`).toBeGreaterThanOrEqual(minimum);
    ratios.push({ selector, ...pair, ratio, minimum });
  }
  const contrastPath = testInfo.outputPath("rendered-contrast.json");
  await writeFile(contrastPath, JSON.stringify(ratios, null, 2));
  await testInfo.attach("rendered-contrast.json", {
    path: contrastPath,
    contentType: "application/json",
  });
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();
  await expect(skip).toHaveCSS("outline-style", "solid");
  await page.screenshot({ path: testInfo.outputPath("keyboard-focus.png") });
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  const action = page.locator(".intro-actions .section-action");
  await action.focus();
  await expect(action).toHaveCSS("outline-style", "solid");
  await action.hover();
  await expect(action).toHaveCSS("background-color", "rgb(29, 61, 117)");
  await expect(action).toHaveCSS("color", "rgb(255, 255, 255)");
  const focusColor = await action.evaluate(
    (element) => getComputedStyle(element).outlineColor,
  );
  const focusA = luminance(focusColor);
  const focusB = luminance("rgb(245, 247, 248)");
  expect(
    (Math.max(focusA, focusB) + 0.05) / (Math.min(focusA, focusB) + 0.05),
  ).toBeGreaterThanOrEqual(3);
  await action.evaluate((element) =>
    element.scrollIntoView({ block: "center" }),
  );
  await page.screenshot({
    path: testInfo.outputPath("action-focus-hover.png"),
  });
  await page.emulateMedia({ forcedColors: "active" });
  await expect(action).toHaveCSS("outline-style", "solid");
  await page.screenshot({
    path: testInfo.outputPath("forced-colors-focus.png"),
  });
  await expect(page.locator("#our-approach h3")).toHaveText([
    "Evidence",
    "Experience",
    "Exploration",
    "Research Assistance",
    "Longitudinal Understanding",
    "Initiatives",
  ]);
  await page.emulateMedia({ forcedColors: "none" });
  const privacyLink = page.locator("#contact-privacy a");
  await privacyLink.click();
  await expect(page).toHaveURL(/\/privacy\/$/);
  await page.goBack();
  await page
    .locator("#contact-privacy")
    .evaluate((element) => element.scrollIntoView({ block: "center" }));
  await expect(privacyLink).toHaveCSS("text-decoration-line", "underline");
  await page.screenshot({
    path: testInfo.outputPath("visited-privacy-return.png"),
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

test("desktop redesign review specimens", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  for (const id of [
    "introduction",
    "our-approach",
    "parkinsons-initiative",
    "origin",
    "current-work",
    "collaborate",
  ]) {
    await page
      .locator(`#${id}`)
      .screenshot({ path: testInfo.outputPath(`desktop-${id}.png`) });
  }
});

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`layout reflows at ${width}px and 200% text without clipping`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", "/privacy/"]) {
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
          const enlargedSizes = await textTargets.evaluateAll((elements) =>
            elements.map((element) =>
              parseFloat(getComputedStyle(element).fontSize),
            ),
          );
          expect(enlargedSizes).toHaveLength(original.length);
          enlargedSizes.forEach((size, index) =>
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
            "h1, h2, h3, p, li, nav, a, .concept-module, .hero-panel, .initiative-feature, .origin-transition, .work-item, .contact-panel, .contact-warning, .implementation-notice",
          )
          .evaluateAll((elements) =>
            elements
              .filter(
                (element) => element.scrollWidth > element.clientWidth + 1,
              )
              .map((element) => element.textContent),
          );
        expect(clipped).toEqual([]);
        await page.screenshot({
          fullPage: !enlarged,
          path: testInfo.outputPath(
            `${route === "/" ? "landing" : "privacy"}-${width}-${enlarged ? "200" : "100"}.png`,
          ),
        });
        if (route === "/") {
          await expect(page.locator(".direction-art")).toHaveCSS(
            "display",
            width >= 1024 ? "block" : "none",
          );
          if (enlarged) {
            const work = page.locator(".work-item").first();
            const heading = await work.locator("h3").boundingBox();
            const description = await work.locator("p").last().boundingBox();
            expect(description!.y).toBeGreaterThan(
              heading!.y + heading!.height,
            );
            for (const [selector, name] of [
              [".concept-module", "concept"],
              [".work-item", "work"],
              [".contact-warning", "warning"],
            ] as const) {
              await page
                .locator(selector)
                .first()
                .screenshot({
                  path: testInfo.outputPath(`${name}-${width}-200.png`),
                });
            }
            if (width === 320) {
              expect(
                await page
                  .locator(".primary-navigation li:last-child a")
                  .evaluate((element) => {
                    const range = document.createRange();
                    range.selectNodeContents(element);
                    return range.getClientRects().length;
                  }),
              ).toBe(1);
            }
          }
        }
        await page.locator("h1").screenshot({
          path: testInfo.outputPath(
            `${route === "/" ? "headline" : "privacy-title"}-${width}-${enlarged ? "200" : "100"}.png`,
          ),
        });
        if (route === "/" && !enlarged) {
          await page
            .locator(".concept-module")
            .first()
            .screenshot({
              path: testInfo.outputPath(`concepts-${width}.png`),
            });
          await page.evaluate(() => window.scrollTo(0, 0));
        }
      }
    }
  });
}
