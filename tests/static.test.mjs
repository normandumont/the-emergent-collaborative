import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { assertCsp } from "./helpers/preview-security.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = path.join(root, "dist");
const email = "contact@meridianstation.org";
const pages = [
  "404.html",
  "index.html",
  ...[
    "about",
    "founder",
    "mobile",
    "parkinsons-project",
    "privacy",
    "project-story",
    "research-approach",
  ].map((route) => path.join(route, "index.html")),
];
const readPage = (route = "") =>
  readFile(path.join(dist, route, "index.html"), "utf8");

function textOnly(html) {
  return html
    .replace(/<\/(?:p|h[1-6]|li|div|section|aside|nav)>/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const filename = path.join(directory, entry.name);
      return entry.isDirectory() ? filesUnder(filename) : filename;
    }),
  );
  return nested.flat();
}

test("all static routes resolve links and emit only safe local resources", async () => {
  const files = await filesUnder(dist);
  const htmlFiles = files.filter((file) => file.endsWith(".html"));
  assert.deepEqual(
    htmlFiles.map((file) => path.relative(dist, file)).sort(),
    [...pages].sort(),
  );
  assert.equal(files.filter((file) => file.endsWith(".woff2")).length, 1);
  assert.ok(files.some((file) => /Inter-Latin-Variable.+\.woff2$/.test(file)));
  for (const license of [
    "Inter-OFL.txt",
    "LibreFranklin-OFL.txt",
    "SourceSans3-OFL.txt",
    "SourceSerif4-OFL.txt",
  ])
    assert.ok(files.some((file) => file.endsWith(license)));
  assert.deepEqual(
    files
      .filter((file) => /\.(?:m?js|ts|astro|map)$/i.test(file))
      .map((file) => path.relative(dist, file)),
    ["ask.js"],
  );
  assert.ok(
    !files.some((file) =>
      /(?:firebase|package|GENESIS|design-reference)/i.test(file),
    ),
  );

  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    assert.match(html, /<html lang="en">/);
    assert.match(html, /name="robots" content="noindex, nofollow"/);
    assert.match(html, /<title>[^<]+\| Meridian Station<\/title>/);
    assert.equal((html.match(/rel="preload"[^>]*as="font"/g) ?? []).length, 1);
    assert.doesNotMatch(
      html,
      /The Emergent Collaborative|INCOMPLETE IMPLEMENTATION PREVIEW|IMPLEMENTATION PLACEHOLDER|data-placeholder=/i,
    );
    assert.ok(
      textOnly(html).includes(
        "Publication responsibility: Norman Dumont, Founder, Meridian Station",
      ),
    );
    assert.match(html, /<time datetime="2026-10-31">October 31, 2026<\/time>/);
    assert.equal((html.match(/<h1(?:\s|>)/g) ?? []).length, 1);
    assert.equal((html.match(/<main(?:\s|>)/g) ?? []).length, 1);
    assert.doesNotMatch(
      html,
      /<(?:style|input|iframe|astro-island)\b|\sstyle=|\son[a-z]+=|client:(?:load|idle|visible|media|only)/i,
    );
    const scripts = [
      ...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi),
    ];
    const landing = file === path.join(dist, "index.html");
    assert.equal(scripts.length, landing ? 1 : 0);
    if (landing) {
      assert.match(scripts[0][1], /\bsrc="\/ask\.js"/);
      assert.match(scripts[0][1], /\bdefer\b/);
      assert.equal(scripts[0][2].trim(), "");
      assert.equal((html.match(/<form\b/g) ?? []).length, 1);
      assert.equal((html.match(/<textarea\b/g) ?? []).length, 1);
    } else {
      assert.doesNotMatch(html, /<(?:form|textarea)\b/);
    }
    assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
    for (const [, href] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (href.startsWith("mailto:")) {
        assert.equal(file, path.join(dist, "about", "index.html"));
        assert.equal(href, `mailto:${email}`);
        continue;
      }
      const url = new URL(href, "http://localhost/");
      assert.equal(url.origin, "http://localhost");
      const decoded = decodeURIComponent(url.pathname);
      const destination =
        decoded === "/"
          ? path.join(dist, "index.html")
          : decoded.endsWith("/")
            ? path.join(dist, decoded, "index.html")
            : path.join(dist, decoded);
      const target = await readFile(destination, "utf8");
      if (url.hash) {
        const targetHtml = href.startsWith("#") ? html : target;
        assert.ok(
          targetHtml.includes(`id="${url.hash.slice(1)}"`),
          `Missing destination: ${href} in ${file}`,
        );
      }
    }
  }
  for (const file of files.filter((file) => file.endsWith(".css"))) {
    const css = await readFile(file, "utf8");
    assert.doesNotMatch(css, /https?:|@import/i);
    for (const [, asset] of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
      const resolved = asset.startsWith("/")
        ? path.join(dist, asset)
        : path.resolve(path.dirname(file), asset);
      assert.ok(files.includes(resolved), `Missing CSS asset: ${asset}`);
    }
  }
  assert.match(
    await readFile(path.join(dist, "robots.txt"), "utf8"),
    /Disallow: \//,
  );
});

test("historical PH registry stays intact without rendering resolved placeholders", async () => {
  const content = await readFile(
    path.join(root, "src", "content", "site.ts"),
    "utf8",
  );
  const markers = [...content.matchAll(/"(PH-\d{2})":\s*"([^"]+)"/g)];
  assert.deepEqual(
    markers.map(([, id]) => id),
    ["PH-04", "PH-10", "PH-11", "PH-13", "PH-14"],
  );
  const specification = await readFile(
    path.join(root, "docs", "HIGH_FIDELITY_MOCKUP_SPEC.md"),
    "utf8",
  );
  const approvedMarkers = [
    ...specification.matchAll(/\| (PH-\d{2}) \| (\[[^\n]+?\]) \|/g),
  ];
  assert.equal(approvedMarkers.length, 20);
  assert.deepEqual(
    markers.map(([, id, copy]) => [id, copy]),
    approvedMarkers
      .filter(([, id]) => markers.some(([, marker]) => marker === id))
      .map(([, id, copy]) => [id, copy]),
  );
  for (const file of pages) {
    const html = await readFile(path.join(dist, file), "utf8");
    for (const [, , copy] of approvedMarkers) assert.ok(!html.includes(copy));
  }
});

test("homepage prioritizes AI and mobile and links out to the story instead of repeating it", async () => {
  const landing = await readPage();
  const text = textOnly(landing);
  assert.ok(
    text.includes(
      "Finding direction through evidence, experience, and emerging technology.",
    ),
  );
  assert.ok(text.includes("Understanding change over time."));
  assert.ok(
    text.includes(
      "An exploratory technology project—not a diagnostic or clinical product.",
    ),
  );
  assert.ok(text.includes("Mobile application · In development"));
  assert.ok(
    landing.indexOf('id="introduction"') <
      landing.indexOf('id="knowledgebase"'),
  );
  assert.ok(
    landing.indexOf('id="knowledgebase"') <
      landing.indexOf('class="mobile-product"'),
  );
  assert.ok(
    landing.indexOf('class="story-nav"') < landing.indexOf('id="introduction"'),
  );
  assert.match(landing, /<details class="story-nav" open>/);
  assert.equal((landing.match(/class="story-nav"/g) ?? []).length, 1);
  for (const id of [
    "why-change",
    "our-approach",
    "parkinsons-initiative",
    "origin",
    "current-work",
    "collaborate",
    "sources",
  ]) {
    assert.ok(
      !landing.includes(`id="${id}"`),
      `Old homepage section still present: ${id}`,
    );
  }
  assert.doesNotMatch(
    landing,
    /Rebar Foundry|dot-com-era|live-tracking prototypes/,
  );
  for (const route of [
    "about",
    "parkinsons-project",
    "project-story",
    "research-approach",
    "founder",
    "privacy",
    "mobile",
  ]) {
    assert.ok(
      landing.includes(`href="/${route}/"`),
      `Missing secondary route: ${route}`,
    );
  }
  assert.match(landing, /Concept illustration · Not recorded health data/);
});

test("moved content preserves evidence, status, source and contact boundaries", async () => {
  const approach = textOnly(await readPage("research-approach"));
  for (const copy of [
    "Evidence",
    "Experience",
    "Exploration",
    "not treat one person's observation as proof",
    "being investigated, not validation",
    "not established medical treatment",
    "relevance, quality, missing context, and burden matter",
    "not presented as scientific findings",
  ]) {
    assert.ok(approach.includes(copy), `Missing framework boundary: ${copy}`);
  }
  const initiative = textOnly(await readPage("parkinsons-project"));
  for (const copy of [
    "Parkinson's: our first initiative.",
    "preserve source citations and limitations",
    "citations, provenance, limitations, and uncertainty",
    "preparing questions for healthcare professionals",
    "No verified research library is connected.",
    "not intended to diagnose Parkinson's, prescribe treatment, or replace medical care.",
    "not enrolling a study or collecting health records",
  ]) {
    assert.ok(
      initiative.includes(copy),
      `Missing initiative boundary: ${copy}`,
    );
  }
  const story = textOnly(await readPage("project-story"));
  assert.ok(
    story.includes(
      "Source artifacts establish prior prototyping, not a verified operating tracker, working AI system, completed ride, or formal research study.",
    ),
  );
  assert.ok(
    story.includes(
      "not from a claim that ride observations proved a treatment effect",
    ),
  );
  const founder = textOnly(await readPage("founder"));
  assert.ok(founder.includes("Rebar Foundry"));
  assert.ok(
    founder.includes("Material relationships: None currently disclosed."),
  );
  const mobile = textOnly(await readPage("mobile"));
  for (const copy of [
    "not proof of causation",
    "informed consent",
    "separate privacy safeguards",
    "not a clinical, diagnostic, or treatment product",
    "does not collect mobile observations or enroll participants",
  ]) {
    assert.ok(mobile.includes(copy), `Missing mobile boundary: ${copy}`);
  }
  const about = await readPage("about");
  assert.ok(
    textOnly(about).includes(
      "Parkinson's is the first initiative, not the limit",
    ),
  );
  assert.ok(
    textOnly(about).includes(
      "Public research information and private personal information would remain separate.",
    ),
  );
  assert.ok(
    textOnly(about).includes(
      "These capabilities are not currently offered as clinical, diagnostic, or treatment services.",
    ),
  );
  let previous = -1;
  for (const marker of [
    'class="contribution-examples"',
    'class="contact-warning"',
    'id="contact-privacy"',
    `href="mailto:${email}"`,
    'class="message-guidance"',
    'class="contact-expectation"',
  ]) {
    const position = about.indexOf(marker);
    assert.ok(
      position > previous,
      `Missing/out-of-order contact safeguard: ${marker}`,
    );
    previous = position;
  }
  for (const copy of [
    "Do not attach files.",
    "not monitored for urgent help",
    "does not enroll you in research or authorize publication",
    "Your name, organization, and professional background are optional.",
    "5–7 business days",
    "copy the address into a new message",
  ]) {
    assert.ok(
      textOnly(about).includes(copy),
      `Missing contact boundary: ${copy}`,
    );
  }
});

test("privacy preserves AI processing disclosures and updated contact destinations", async () => {
  const privacy = await readPage("privacy");
  assert.deepEqual(
    [...privacy.matchAll(/<section id="([^"]+)"/g)].map(([, id]) => id),
    [
      "privacy-scope",
      "privacy-responsibility",
      "privacy-ai",
      "privacy-email",
      "privacy-visiting",
      "privacy-third-parties",
      "privacy-requests",
      "privacy-dates",
    ],
  );
  assert.doesNotMatch(
    textOnly(privacy),
    /PH-(?:10|11|13|14)|static implementation|incomplete notice|not yet been verified/i,
  );
  for (const copy of [
    "AI-assisted research questions",
    "Firebase Cloud Function",
    "OpenAI API",
    "does not intentionally save your question or the generated answer",
    "abuse monitoring",
    "provider security record",
    "Responsible operator: Norman Dumont, Founder, Meridian Station",
    `Contact: ${email}`,
    "Authorized recipient: Norman Dumont, Founder, Meridian Station",
    "Correspondence may be used to respond to project questions, collaboration inquiries, feedback, and correction requests.",
    "Email sent to contact@meridianstation.org is routed through Cloudflare Email Routing to the founder’s designated mailbox. Messages are retained only as long as reasonably necessary to respond, maintain project correspondence, resolve corrections, or meet legitimate recordkeeping needs. Messages may also remain temporarily in provider backups or logs outside Meridian Station’s direct control. Requests to delete correspondence will be honored where reasonably possible, subject to technical, legal, and backup limitations.",
    "Questions about information handling, correction requests, or deletion requests may be sent to contact@meridianstation.org. Meridian Station will make reasonable efforts to respond within 5–7 business days. Requests will be handled to the extent reasonably possible, subject to legal obligations, provider-controlled backups, security logs, and other technical limitations outside Meridian Station’s direct control.",
    "Contacting the project does not enroll you in a study or subscribe you to marketing.",
    "We will ask separately before publicly quoting or crediting a message.",
    "without resending health records or other sensitive material.",
    "Effective: October 31, 2026",
    "Last reviewed: October 31, 2026",
  ])
    assert.ok(
      textOnly(privacy).includes(copy),
      `Missing privacy context: ${copy}`,
    );
  assert.match(privacy, /href="\/about\/#collaborate">Contact about privacy/);
  assert.match(
    privacy,
    /href="\/about\/#collaborate">Return to collaboration and contact/,
  );
  assert.doesNotMatch(
    privacy,
    /mailto:|HIPAA|GDPR|security certification|statutory rights/i,
  );
});

test("preview Hosting and API routing retain strict same-origin security without a React runtime", async () => {
  const config = JSON.parse(
    await readFile(path.join(root, "firebase.json"), "utf8"),
  );
  assert.deepEqual(Object.keys(config), ["hosting"]);
  assert.equal(config.hosting.public, "dist");
  assert.deepEqual(config.hosting.rewrites, [
    {
      source: "/api/ask",
      function: { functionId: "askParkinsons", region: "us-central1" },
    },
  ]);
  const headers = config.hosting.headers[0].headers;
  const value = (name) => headers.find(({ key }) => key === name)?.value;
  assertCsp(value("Content-Security-Policy"));
  assert.equal(value("X-Content-Type-Options"), "nosniff");
  assert.equal(value("Referrer-Policy"), "no-referrer");
  assert.equal(value("Cache-Control"), "no-cache");
  assert.match(
    value("Permissions-Policy"),
    /camera=\(\).*microphone=\(\).*geolocation=\(\)/,
  );
  const manifest = JSON.parse(
    await readFile(path.join(root, "package.json"), "utf8"),
  );
  assert.equal(manifest.name, "meridian-station");
  assert.ok(
    !Object.keys(manifest.scripts).some((name) => /deploy/i.test(name)),
  );
  assert.ok(
    !Object.keys({
      ...manifest.dependencies,
      ...manifest.devDependencies,
    }).some((name) => /firebase|analytics|tracking|react|tailwind/i.test(name)),
    "No frontend framework, Firebase client SDK or analytics dependency",
  );
});

test("normal build preserves exactly one functional external-script Ask interface after the hero", async () => {
  const landing = await readPage();
  assert.equal(
    (landing.match(/<section\b[^>]*id="ask-parkinsons"/g) ?? []).length,
    1,
  );
  const section = landing.match(
    /<section\b[^>]*id="ask-parkinsons"[^>]*>([\s\S]*?)<\/section>/,
  );
  assert.ok(section);
  assert.ok(textOnly(section[1]).includes("Ask Parkinson's Insights"));
  assert.ok(
    textOnly(section[1]).includes(
      "It does not diagnose conditions, recommend treatment, or replace medical care.",
    ),
  );
  assert.match(section[1], /data-endpoint="\/api\/ask"/);
  assert.match(section[1], /<label\b[^>]*for="ask-question"/);
  assert.match(section[1], /maxlength="4000"/);
  assert.match(section[1], /aria-describedby="ask-warning ask-processing"/);
  assert.ok(
    section[1].indexOf('id="ask-warning"') <
      section[1].indexOf('id="ask-question"'),
  );
  assert.match(
    landing,
    /<\/section>\s*<div id="knowledgebase">\s*<section\b[^>]*id="ask-parkinsons"/,
  );
  const script = await readFile(path.join(dist, "ask.js"), "utf8");
  assert.equal(
    script,
    await readFile(path.join(root, "public", "ask.js"), "utf8"),
  );
  assert.doesNotMatch(
    script,
    /innerHTML|OPENAI_API_KEY|api\.openai\.com|firebase\/|localStorage|sessionStorage|indexedDB|document\.cookie/,
  );
});
