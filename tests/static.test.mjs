import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = path.join(root, "dist");
const remainingIds = ["PH-04", "PH-10", "PH-11", "PH-13", "PH-14"];
const finalHeadline =
  "Finding direction through evidence, experience, and emerging technology.";
const email = "contact@meridianstation.org";
const productDefinition =
  "Meridian Station is a research and technology initiative exploring how scientific evidence, personal experience over time, and emerging technology can help people understand complex health questions—beginning with Parkinson’s disease.";
const revisedDirection =
  "Meridian Station is actively defining and developing a technology direction that includes AI-assisted research exploration and longitudinal-data tools. Some underlying concepts and prototypes began with the Ride for Parkinson’s project, while the broader Meridian Station platform remains under development. These capabilities are not currently offered as clinical, diagnostic, or treatment services.";

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

function contentSection(html, id) {
  const match = html.match(
    new RegExp(
      `<section\\b[^>]*data-section="${id}"[^>]*>([\\s\\S]*?)</section>`,
    ),
  );
  assert.ok(match, `Missing content section ${id}`);
  return match[1];
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

test("build emits only the static routes and safe local resources", async () => {
  const files = await filesUnder(dist);
  const htmlFiles = files.filter((file) => file.endsWith(".html"));
  assert.deepEqual(
    htmlFiles.map((file) => path.relative(dist, file)).sort(),
    ["404.html", "index.html", path.join("privacy", "index.html")].sort(),
  );
  assert.equal(files.filter((file) => file.endsWith(".woff2")).length, 2);
  assert.ok(files.some((file) => /Inter-Latin-Variable.+\.woff2$/.test(file)));
  assert.ok(
    files.some((file) => /LibreFranklin-Latin-Variable.+\.woff2$/.test(file)),
  );
  assert.ok(files.some((file) => file.endsWith("Inter-OFL.txt")));
  assert.ok(files.some((file) => file.endsWith("LibreFranklin-OFL.txt")));
  assert.ok(files.some((file) => file.endsWith("SourceSans3-OFL.txt")));
  assert.ok(files.some((file) => file.endsWith("SourceSerif4-OFL.txt")));
  assert.ok(!files.some((file) => /\.(?:m?js|ts|astro|map)$/i.test(file)));
  assert.ok(!files.some((file) => /(?:firebase|package|GENESIS)/i.test(file)));

  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    assert.match(html, /<html lang="en">/);
    assert.match(html, /name="robots" content="noindex, nofollow"/);
    assert.match(html, /INCOMPLETE IMPLEMENTATION PREVIEW/);
    assert.match(html, /<title>[^<]+\| Meridian Station<\/title>/);
    const identity = html.match(/<a class="identity"[^>]*>([\s\S]*?)<\/a>/);
    assert.ok(identity);
    assert.equal(textOnly(identity[1]), "Meridian Station");
    assert.equal((html.match(/rel="preload"[^>]*as="font"/g) ?? []).length, 2);
    assert.doesNotMatch(html, /The Emergent Collaborative/i);
    assert.ok(
      textOnly(html).includes(
        "Publication responsibility: Norman Dumont, Founder, Meridian Station",
      ),
    );
    assert.ok(
      textOnly(html).includes(
        "Material relationships: None currently disclosed.",
      ),
    );
    assert.equal((html.match(/<h1(?:\s|>)/g) ?? []).length, 1);
    assert.equal((html.match(/<main(?:\s|>)/g) ?? []).length, 1);
    assert.doesNotMatch(
      html,
      /<(?:script|style|form|input|textarea|iframe|astro-island)\b|\sstyle=|\son[a-z]+=|client:(?:load|idle|visible|media|only)/i,
    );
    assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
    for (const [, href] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (href.startsWith("mailto:")) {
        assert.equal(file, path.join(dist, "index.html"));
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

test("only five exact PH gates remain and approved identity, headline and contact replace resolved gates", async () => {
  const content = await readFile(
    path.join(root, "src", "content", "site.ts"),
    "utf8",
  );
  const landing = await readFile(path.join(dist, "index.html"), "utf8");
  const privacy = await readFile(
    path.join(dist, "privacy", "index.html"),
    "utf8",
  );
  const markers = [...content.matchAll(/"(PH-\d{2})":\s*"([^"]+)"/g)];
  assert.deepEqual(
    markers.map(([, id]) => id),
    remainingIds,
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
      .filter(([, id]) => remainingIds.includes(id))
      .map(([, id, copy]) => [id, copy]),
    "The remaining exact PH strings must retain their historical wording",
  );
  for (const [, id, copy] of markers) {
    assert.ok((landing + privacy).includes(copy), `Missing exact text: ${id}`);
    assert.ok((landing + privacy).includes(`data-placeholder="${id}"`));
  }
  const allHtml = landing + privacy;
  for (const [, id] of approvedMarkers) {
    if (remainingIds.includes(id)) continue;
    assert.doesNotMatch(allHtml, new RegExp(`data-placeholder="${id}"`));
    const oldCopy = approvedMarkers.find(([, marker]) => marker === id)[2];
    assert.ok(
      !allHtml.includes(oldCopy),
      `Resolved gate still rendered: ${id}`,
    );
  }
  assert.deepEqual(
    [
      ...new Set(
        [...allHtml.matchAll(/data-placeholder="([^"]+)"/g)].map(
          ([, id]) => id,
        ),
      ),
    ].sort(),
    remainingIds,
  );
  assert.ok(textOnly(landing).includes(finalHeadline));
  assert.ok(
    textOnly(contentSection(landing, "P1")).includes(productDefinition),
  );
  assert.match(landing, /name="description" content="Meridian Station/);
  assert.equal((landing.match(/mailto:/g) ?? []).length, 1);
  assert.ok(
    landing.indexOf("contact-warning") <
      landing.indexOf('id="contact-privacy"'),
  );
  assert.ok(
    landing.indexOf('id="contact-privacy"') <
      landing.indexOf(`href="mailto:${email}"`),
  );
  assert.ok(
    landing.indexOf(`href="mailto:${email}"`) <
      landing.indexOf('class="contact-expectation"'),
  );
});

test("landing contains P0-P9 in order, complete draft prose, and seven secondary destinations", async () => {
  const landing = await readFile(path.join(dist, "index.html"), "utf8");
  assert.deepEqual(
    [...landing.matchAll(/data-section="(P\d)"/g)].map(([, id]) => id),
    Array.from({ length: 10 }, (_, index) => `P${index}`),
  );
  assert.doesNotMatch(
    landing,
    /IMPLEMENTATION PLACEHOLDER|scaffold-slot|content is not implemented|await the complete content pass/i,
  );
  const introduction = contentSection(landing, "P1");
  assert.match(introduction, /Parkinson's: our first initiative\./);
  assert.ok(
    textOnly(introduction).includes(
      "We do not diagnose or provide treatment advice.",
    ),
  );
  const sectionMap = introduction.match(
    /<nav\b[^>]*aria-labelledby="section-map-heading"[^>]*>([\s\S]*?)<\/nav>/,
  );
  assert.ok(
    sectionMap,
    "Section map must follow the full introduction and actions",
  );
  assert.deepEqual(
    [...sectionMap[1].matchAll(/href="#([^"]+)"/g)].map(([, id]) => id),
    [
      "why-change",
      "our-approach",
      "parkinsons-initiative",
      "origin",
      "current-work",
      "collaborate",
      "sources",
    ],
  );
  assert.ok(
    introduction.indexOf("We do not diagnose") <
      introduction.indexOf('class="intro-actions"'),
  );
  assert.ok(
    introduction.indexOf('class="intro-actions"') <
      introduction.indexOf("<nav"),
  );

  const prototype = await readFile(
    path.join(root, "docs", "LOW_FIDELITY_CONTENT_PROTOTYPE.md"),
    "utf8",
  );
  for (const id of ["P2", "P3", "P4", "P5", "P6", "P8"]) {
    const draft = prototype
      .split(`## ${id === "P8" ? id + "." : "Current " + id + "."}`)[1]
      ?.split("### Draft page copy")[1]
      ?.split("### Review notes")[0];
    assert.ok(draft, `Missing approved draft ${id}`);
    const actual = textOnly(contentSection(landing, id));
    for (const block of draft.trim().split(/\r?\n\r?\n/)) {
      if (block.includes("[SOURCE ENTRIES")) continue;
      const expected = block
        .replace(/^#+\s*/gm, "")
        .replace(/\*\*/g, "")
        .replace(/\s+/g, " ")
        .replaceAll("The Emergent Collaborative", "Meridian Station")
        .trim();
      assert.ok(
        actual.includes(expected),
        `Draft prose changed or missing in ${id}: ${expected}`,
      );
    }
  }
});

test("concepts, status boundaries, collaboration sequence, and source policy remain explicit", async () => {
  const landing = await readFile(path.join(dist, "index.html"), "utf8");
  const approach = contentSection(landing, "P3");
  assert.deepEqual(
    [...approach.matchAll(/data-concept="([^"]+)"/g)].map(
      ([, concept]) => concept,
    ),
    ["Evidence", "Experience", "Exploration"],
  );
  assert.doesNotMatch(approach, /role="(?:tab|tabpanel)"|<details|<button/i);
  assert.deepEqual(
    [...approach.matchAll(/<h3>([^<]+)<\/h3>/g)].map(([, heading]) => heading),
    [
      "Evidence",
      "Experience",
      "Exploration",
      "Research Assistance",
      "Longitudinal Understanding",
      "Initiatives",
    ],
  );
  for (const copy of [
    "citations, provenance, limitations, and uncertainty",
    "context, missingness, provenance, and measurement limitations",
    "not proof of causation",
    "being investigated, not validation",
    "not treat one person's observation as proof",
  ]) {
    assert.ok(
      textOnly(approach).includes(copy),
      `Missing framework boundary: ${copy}`,
    );
  }
  const initiative = textOnly(contentSection(landing, "P4"));
  for (const copy of [
    "The first major goal is to develop an AI-assisted Parkinson's knowledge resource",
    "preserve source citations and limitations",
    "preparing questions for healthcare professionals",
    "movement, exercise, sleep, symptoms, environmental conditions, and other measurements",
    "They are not intended to diagnose Parkinson's, prescribe treatment, or replace medical care.",
    "This website is not enrolling a study or collecting health records.",
  ]) {
    assert.ok(
      initiative.includes(copy),
      `Missing initiative direction/boundary: ${copy}`,
    );
  }
  const origin = textOnly(contentSection(landing, "P5"));
  for (const copy of [
    "Ride for Parkinson's began as an awareness effort",
    "catalyst for real-world technology experimentation",
    "live-tracking prototypes, mobile-development questions",
    "AI-assisted knowledge resource for patients and families",
    "not from a claim that ride observations proved a treatment effect",
  ]) {
    assert.ok(origin.includes(copy), `Missing origin connection: ${copy}`);
  }
  const work = contentSection(landing, "P6");
  const workText = textOnly(work);
  for (const copy of [
    "Status: Prototype — prior ride artifacts",
    "Status: Prototype — static review website",
    "Status: Active development — direction and scope",
    "Status: Future exploration — separate implementation",
    "29 October 2026",
    "Source artifacts establish prior prototyping, not a verified operating tracker, working AI system, completed ride, or formal research study.",
    "This is not operational or clinical verification, or the final public content review date.",
    revisedDirection,
    "Public research information and private personal information would remain separate.",
    "No collection or analysis of visitor health information is implemented here.",
  ]) {
    assert.ok(workText.includes(copy), `Missing status boundary: ${copy}`);
  }
  assert.doesNotMatch(
    workText,
    /Status: Operational|coming soon|launch date|remain ideas or experiments unless/i,
  );
  const collaboration = contentSection(landing, "P7");
  const orderedMarkers = [
    'class="contribution-examples"',
    'class="contact-warning"',
    'id="contact-privacy"',
    `href="mailto:${email}"`,
    'class="message-guidance"',
    'class="contact-expectation"',
  ];
  let previous = -1;
  for (const marker of orderedMarkers) {
    const position = collaboration.indexOf(marker);
    assert.ok(
      position > previous,
      `Missing/out-of-order contact content: ${marker}`,
    );
    previous = position;
  }
  assert.equal((collaboration.match(/<li>/g) ?? []).length, 4);
  for (const copy of [
    "lived-experience",
    "research approach",
    "design, accessibility",
    "technical investigation",
  ]) {
    assert.ok(textOnly(collaboration).includes(copy));
  }
  for (const copy of [
    "Do not send medical records, symptom histories, medication details, location traces, or other sensitive health information. Do not attach files.",
    "This channel does not provide medical advice and is not monitored for urgent help.",
    "Contacting us does not enroll you in research or authorize publication of your message.",
    "Your name, organization, and professional background are optional.",
    "Messages are reviewed by the founder of Meridian Station. We aim to respond to project-related inquiries within 5–7 business days.",
    "If an email application does not open, copy the address into a new message.",
  ]) {
    assert.ok(
      textOnly(collaboration).includes(copy),
      `Missing contact boundary: ${copy}`,
    );
  }
  const sources = contentSection(landing, "P8");
  assert.equal((sources.match(/<p>/g) ?? []).length, 2);
  assert.doesNotMatch(
    sources,
    /<(?:ul|ol|a|cite)\b|SOURCE-PD|SOURCE ENTRIES|doi\.org/i,
  );
  assert.doesNotMatch(landing, /SOURCE-PD-01|<cite\b|role="doc-bibliography"/i);
  assert.match(landing, /Rebar Foundry/);
  assert.ok(
    textOnly(contentSection(landing, "P4")).includes(
      "Parkinson's is the first initiative, not the limit of the organization's interests.",
    ),
  );
});

test("privacy follows U1 structure with unresolved operational facts in the relevant sections", async () => {
  const privacy = await readFile(
    path.join(dist, "privacy", "index.html"),
    "utf8",
  );
  assert.deepEqual(
    [...privacy.matchAll(/<section id="([^"]+)"/g)].map(([, id]) => id),
    [
      "privacy-scope",
      "privacy-responsibility",
      "privacy-email",
      "privacy-visiting",
      "privacy-requests",
      "privacy-dates",
    ],
  );
  const sections = [
    ["privacy-visiting", ["PH-10", "PH-11"]],
    ["privacy-dates", ["PH-13", "PH-14"]],
  ];
  for (const [id, markers] of sections) {
    const section = privacy.match(
      new RegExp(`<section id="${id}"[^>]*>([\\s\\S]*?)</section>`),
    );
    assert.ok(section);
    for (const marker of markers)
      assert.ok(section[1].includes(`data-placeholder="${marker}"`));
  }
  for (const copy of [
    "This is an incomplete notice for review, not an approved public privacy notice.",
    "Responsible operator: Norman Dumont, Founder, Meridian Station",
    `Contact: ${email}`,
    "Authorized recipient: Norman Dumont, Founder, Meridian Station",
    "Correspondence may be used to respond to project questions, collaboration inquiries, feedback, and correction requests.",
    "Email sent to contact@meridianstation.org is routed through Cloudflare Email Routing to the founder’s designated mailbox. Messages are retained only as long as reasonably necessary to respond, maintain project correspondence, resolve corrections, or meet legitimate recordkeeping needs. Messages may also remain temporarily in provider backups or logs outside Meridian Station’s direct control. Requests to delete correspondence will be honored where reasonably possible, subject to technical, legal, and backup limitations.",
    "Questions about information handling, correction requests, or deletion requests may be sent to contact@meridianstation.org. Meridian Station will make reasonable efforts to respond within 5–7 business days. Requests will be handled to the extent reasonably possible, subject to legal obligations, provider-controlled backups, security logs, and other technical limitations outside Meridian Station’s direct control.",
    "Contacting the project does not enroll you in a study or subscribe you to marketing.",
    "We will ask separately before publicly quoting or crediting a message.",
    "It makes no promise about the logging or processing of Firebase Hosting.",
    "without resending health records or other sensitive material.",
  ]) {
    assert.ok(
      textOnly(privacy).includes(copy),
      `Missing privacy context: ${copy}`,
    );
  }
  assert.match(privacy, /href="\/#collaborate">Contact about privacy/);
  assert.match(
    privacy,
    /href="\/#collaborate">Return to collaboration and contact/,
  );
  assert.doesNotMatch(
    privacy,
    /mailto:|HIPAA|GDPR|security certification|statutory rights/i,
  );
});

test("Hosting configuration serves only static output without backend rewrites", async () => {
  const config = JSON.parse(
    await readFile(path.join(root, "firebase.json"), "utf8"),
  );
  assert.deepEqual(Object.keys(config), ["hosting"]);
  assert.equal(config.hosting.public, "dist");
  assert.equal(config.hosting.rewrites, undefined);
  const headers = config.hosting.headers[0].headers;
  const csp = headers.find(
    ({ key }) => key === "Content-Security-Policy",
  ).value;
  assert.match(csp, /script-src 'none'/);
  assert.match(csp, /connect-src 'none'/);
  assert.match(csp, /form-action 'none'/);
  assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
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
    }).some((name) => /firebase|analytics|tracking/i.test(name)),
    "No Firebase client SDK or analytics/tracking dependency is allowed",
  );
});
