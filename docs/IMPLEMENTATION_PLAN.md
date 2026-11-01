# Phase 1 implementation plan

Status: **Meridian Station** (previously The Emergent Collaborative), local Ride-derived visual redesign. Section 19 supersedes Fieldnotes Laboratory, its Source fonts, narrow reading spine and warm-paper palette wherever they conflict with the new founder direction. Section 18's product content and PH-17 remain authoritative. Only PH-04/10/11/13/14 remain unresolved. No deployment/update or production-domain connection is authorized.

## 19. Ride-derived visual redesign — 29 October 2026

### Design source of truth (recorded before CSS implementation)

Primary reference: rendered `https://ride-for-parkinsons.web.app/`, inspected in
desktop Chrome at 1440px and 390px. Actual fonts loaded for the Latin text.
Source: founder-specified `C:\Projects\parkinsons-ride-site\index.html`.
Computed-style JSON and reference screenshots are retained in the session's
`files\ride-visual-redesign` folder. This is observation of public presentation,
not endorsement of that site's functionality or medical statements.

| Ride site visual property | Observed value | Source/evidence | Meridian Station treatment |
|---|---|---|---|
| Body font/weights | Inter; requested 400/500/600/700/800; body 400, line-height 1.6 | Source lines 9-11, 33-38; rendered body 16/25.6px | Adopt locally bundled Inter variable 400-800; retain comfortable 18px body, 1.6 line height. |
| Heading/brand font | Libre Franklin 700 headings; 800 brand; tight negative tracking | Lines 61-65, 129; rendered family and loaded font faces | Adopt local Libre Franklin 700-800. No Source Serif headings. |
| Major type sizes | h1 clamp(48px,7vw,107.2px), rendered 100.8px desktop/48px mobile; h2 clamp(33.6px,4vw,64px), rendered 57.6px/33.6px; panel headings 21.6-24.8px | Lines 129-132, 176, 191, 208; computed styles | Bold sans hero 40px compact/56px intermediate/64px wide for the longer exact headline; section titles 32-48px; no text reduction to solve overflow. Relative sizes double with root text. |
| Primary color | Teal #145F68, dark teal #0F4C53, pale teal #DCEFF1; **no primary navy/blue token** | Lines 22-24; rendered button #145F68 | Preserve teal as a complementary connection, deliberately evolve primary identity to navy #193554 / blue #284E91. Do not misattribute those new blues to Ride. |
| Secondary colors | Warm #E7A33B; royal/other blues also appear in route-day colors, not main identity tokens | Line 25; `js\live-tracking.js:20` | Small warm directional details; royal #5278C7 as large bold hero text, broad identity borders and decorative graphic, not ordinary white-on-royal text. No tracker colors/states copied. |
| Background | #F5F7F8 main; #FFFFFF surfaces; #EEF2F3 secondary surface | Lines 16-18; rendered body | Adopt cool neutral/white/light blue section surfaces; remove dominant beige. |
| Text | #122022 primary, #647174 muted | Lines 19-20; rendered body | Keep primary ink; darken secondary to #52636B for readable contrast on pale surfaces; navy headings. |
| Borders/shadow | #DCE4E6 lines; soft 0 14px 40px rgba(18,32,34,.08) shadow | Lines 21, 28, 186-192 | Light card edges/shadow; stronger functional boundary/focus colors where needed. |
| Navigation/header | Full-width translucent light sticky bar, 72px row, 22px link gaps; Libre Franklin bold brand | Lines 45-70; rendered desktop/mobile | Full-width light header, blue brand accent and pill collaboration link. Wrap all four links; non-sticky to avoid obscuring enlarged text/anchors. No hidden mobile destinations or JS. |
| Hero | Broad two-column 1.1fr/.9fr composition; 46px gap; 72px top/44px bottom; strong two-tone heading and portrait panel | Lines 110-160; inspected screenshots | Strong two-tone sans headline, clear initiative action, prominent initiative panel and original non-data directional art. No portrait/medical/campaign image copied. |
| Buttons | Solid teal, white labels, pill radius 999px, min-height 48px, 20px horizontal padding; outlined secondary | Lines 92-108 | Blue filled/outlined pills, at least 48px high; no motion/scale. Email action only after complete warning/privacy. |
| Radius | 22px cards, 34px major feature panel, 999px buttons/tags | Lines 27, 98, 141, 251, 268 | Adopt 22px panels / 34px hero/origin treatment / pill controls. |
| Content width | 1180px maximum; viewport minus 40px, minus 24px at <=520px | Lines 26, 43, 311 | 1180px equivalent outer shell, generous responsive gutters, readable prose within broad multi-column sections rather than one narrow spine. |
| Section spacing | 78px vertical desktop, 58px <=520px; 40px heading split gaps | Lines 175-177, 316; computed styles | Comparable 80px/56px rhythm, alternating full-width light backgrounds, broad split headings and intentional grouped modules. |
| Cards/panels | White rounded story/passion/mission panels, 16-28px gaps, 28-30px padding; mixed width not uniform everywhere | Lines 184-222 | Three conceptual panels, two initiative features, broad origin block, distinct work rows; not a wall of interchangeable SaaS cards. |
| Icons | Simple 32px text/emoji-style passion icons; numbered mission circles in CSS | Lines 207, 220; rendered icon size | No external icon pack. Text labels carry all meaning; original decorative direction motif only, no emoji-as-status or simulated data. |
| Color blocks/hierarchy | Cool page, white panels, dark #122022 campaign block, teal tags and strong headings | Lines 248-268; hero screenshot | Light-blue initiative, navy origin transition, white work area, inviting cool collaborator block. No donation controls or validation colors. |
| Mobile behavior | Grids stack below 900px; some nav links hidden; 12px gutters at <=520px; hero image moves below copy | Lines 299-321; 390px screenshot | Grids collapse based on available width, all nav remains available, decorative hero art omitted compact, no fixed text-panel heights. Preserve 320px/200% safeguards; add 1024px review. |

Both font families have SIL Open Font License 1.1 distributions in Google Fonts:
`ofl/inter/OFL.txt` and `ofl/librefranklin/OFL.txt`. Download unmodified Latin
WOFF2 variable distributions for local delivery with exact URLs/hashes/licenses
recorded in `public\licenses\FONT_PROVENANCE.txt`. No remote font service at runtime.
Retain previous Source assets/licenses as historical source, but do not load or
emit unused Source binaries. Update preloads for the actual new families.

### Implementation and verification contract

Keep all approved copy/nonclinical/status/privacy policies and five exact PH gates.
P1's initiative/action moves earlier within the hero; P3 becomes grouped concept
panels in the same Evidence/Experience/Exploration DOM order, not forced vertical
blocks. P4 gains two titled feature panels. P5 adds a text-based awareness/technology
to Meridian transition, not a location trace. P6 has four clearly labeled work
groups, and P7 remains sequential through warning/privacy/email/guidance/response.
Earlier anti-card and source-font design assertions are superseded, not the
content, network, storage, accessibility or release safeguards.

Review all three routes; five widths 320/390/768/1024/1440; true doubled computed
text without clipping/scrolling; font loading/failure; actual blue/nav/button/focus
contrast; keyboard/forced colors; local-only resources and empty browser
persistence. Capture full pages and hero/concepts/initiative/origin/work/contact.
Do not claim real-device/screen-reader/zoom conformance or hosted privacy facts
from these local checks. Record actual results in RELEASE_READINESS.md.

### Implemented result and local review

The reference table above was created before editing CSS. The actual
implementation replaces the old visual system, rather than retaining it behind
three new accents. Both new local font binaries/notices were hash-verified; the
build emits only those two WOFF2 files, 77,548 bytes total. Existing Source assets
and licenses remain as historical source, not loaded fonts.

The inline SVG in P1 was newly authored for this project during this redesign:
four original abstract direction paths, no copied Ride graphic, third-party icon,
real coordinates, observations, sensor signal, map, axes or invented statistics.
It is `aria-hidden`, nonfocusable, decorative, omitted below 1024px and in forced
colors. Text conveys all meaning; the origin transition is ordinary readable
text with a decorative downward arrow. No proprietary Ride image was reused.

Required checks pass: Astro 14 files/zero diagnostics, formatting, three-page
build, six static tests and twelve browser tests. `release:check` still correctly
fails for unresolved publication markers on all three pages. Screenshots cover
320/390/768/1024/1440, doubled text, all six requested desktop sections, focus,
forced colors and visited-link return. Captures and rendered contrast records
are preserved in the session's `files\ride-visual-redesign` folder. Exact results,
ratios and remaining manual limitations are recorded in RELEASE_READINESS.md.

Visual acceptance: **yes**, someone familiar with the Ride site would recognize
an intentional evolution: identical font families, two-tone bold hero, cool page,
pill actions, rounded feature blocks, warm directional detail and generous
section rhythm, evolved into navy/royal rather than copying campaign content.
This is a local design judgment, not a measured audience-review result.
No deployment, Firebase configuration, domain, DNS, MX or Cloudflare change.

Enlarged screenshot review prompted one additional responsive refinement:
viewport-capped compact gutters/panel/action padding keep room for doubled text,
and intrinsic 24rem minimum columns make work/split groups stack when enlarged.
No font is reduced. The 320px doubled Collaborate pill now keeps its word on one
line; regression checks cover that reading issue, stacked enlarged work and
additional doubled concept/work/warning specimens.

### Files changed in this visual pass

- Presentation: `src\styles\global.css`, `src\pages\index.astro`,
  `src\layouts\SiteLayout.astro`, `src\components\Masthead.astro`.
- New assets: `src\assets\fonts\Inter-Latin-Variable.woff2`,
  `src\assets\fonts\LibreFranklin-Latin-Variable.woff2`,
  `public\licenses\Inter-OFL.txt`, `public\licenses\LibreFranklin-OFL.txt`;
  updated `public\licenses\FONT_PROVENANCE.txt`.
- Tests: `tests\static.test.mjs`, `tests\browser\scaffold.spec.ts`.
- Documentation: `README.md`, `docs\IMPLEMENTATION_PLAN.md`,
  `docs\RELEASE_READINESS.md`, `docs\DESIGN_TOKENS_DRAFT.md`,
  `docs\VISUAL_DESIGN_DIRECTION.md`, `docs\HIGH_FIDELITY_MOCKUP_SPEC.md`,
  `docs\SITE_INFORMATION_ARCHITECTURE.md`,
  `docs\LOW_FIDELITY_CONTENT_PROTOTYPE.md`.

These are this pass's 19 files, not a claim that the broader pre-existing dirty
worktree originated here. No dependency, Firebase, robots or release-checker
configuration changed.

**Precedence:** Sections 1-14 record the original scaffold phase. Where they conflict with section 15 or later founder decisions, the later authorization governs. Scaffold-only stop instructions in those historical sections are not current constraints.

**Reading guide:** Sections 1-13 are the historical scaffold plan, section 14 is its preserved validation record, section 15 records the completed content phase, and section 16 records the first release-readiness pass. Section 17 records the rename/decision pass; section 18 governs product copy and section 19 governs the superseding visual system. Historical exclusions remain applicable where reaffirmed by later decisions; historical incomplete-content statements, all-20-open status and stop points do not describe the current implementation.

## 1. Authority, scope, and unresolved decisions (historical scaffold phase)

Read this plan alongside AGENTS.md, GENESIS.md, FOUNDING_PRODUCT_BRIEF.md, WEBSITE_PRODUCT_REQUIREMENTS.md, SITE_INFORMATION_ARCHITECTURE.md, LOW_FIDELITY_CONTENT_PROTOTYPE.md, VISUAL_DESIGN_DIRECTION.md, HIGH_FIDELITY_MOCKUP_SPEC.md, DESIGN_TOKENS_DRAFT.md, and MOCKUP_REVIEW_NOTES.md.

The latest founder authorization supersedes earlier phase-specific prohibitions on implementation and stack selection. It does not approve unresolved operational facts, final copy, public deployment, or the future AI platform. The founder remains the final decision maker.

Working headline: **Explore change: evidence, experience, new tools.**

This wording is provisional. It supersedes the refinement's "lived insight" candidate. In particular, the long word "experience" requires a fresh enlarged-mobile review; the previous candidate's complete-word fit cannot be inherited as a result for this headline.

The original scaffold assignment established layouts, routes, local fonts, tokens, navigation, visible content slots, static hosting configuration, and checks. Its scope deliberately excluded complete P1-P9 copy. That scaffold-only boundary was superseded by section 15; complete draft content is now implemented.

Excluded: SSR, authentication, accounts, databases, Firebase client SDKs, Cloud Functions, AI APIs, RAG, health-data collection, forms, analytics, tracking, cookies, browser persistence, newsletters, payments, CMS, device integrations, decorative animation, and logo design. No scientific or medical claims are added by the scaffold.

## 2. Selected stack and rationale (historical scaffold phase)

| Selection | Purpose and boundary |
|---|---|
| Astro 6, pinned within major 6 | Produces ordinary static HTML and assets. Explicit static output, no adapter, hydrated components, server endpoints, or actions. Do not substitute the registry's unrestricted latest major. |
| TypeScript, strictest Astro configuration | Checks shared content and component contracts without introducing a runtime data platform. |
| Plain CSS and custom properties | Translates approved tokens directly; no CSS framework or component library. |
| Local Source Serif 4 and Source Sans 3 | Approved initial font direction, served as project-owned assets without remote font requests. |
| Firebase Hosting | Serves only the generated `dist` directory. No Firebase application SDK or backend services. |
| GitHub source control | Reviews and versions source, content, licenses, dependency lockfile, and configuration. No deployment automation in this assignment. |
| Node 24 LTS and npm | Supported local build tools; record the runtime in `.node-version` and lock dependencies. Runtime versions are tooling requirements, not visitor requirements. |

The generated site remains portable static files. Firebase-specific behavior is isolated in `firebase.json`; content, layout, and public/private boundaries do not depend on Firebase APIs.

## 3. Directory and component structure (historical scaffold phase)

This table records the initial responsibilities, not the present content-completion state. Section 15 supersedes the incomplete landing-shell and privacy-shell descriptions.

| Path | Responsibility |
|---|---|
| `src\pages\index.astro` | Landing shell and genuine primary-navigation destinations; incomplete narrative slots remain visible. |
| `src\pages\privacy.astro` | Separate, explicitly incomplete privacy utility page. |
| `src\pages\404.astro` | Static recovery page with a return path, not an SPA fallback. |
| `src\layouts\SiteLayout.astro` | Language, metadata, local styles, skip link, shared masthead, main landmark, footer. |
| `src\components\Masthead.astro` | Text identity and four wrapping primary links. |
| `src\components\SiteFooter.astro` | Privacy, contextual collaboration link, and accountability placeholders. |
| `src\components\Placeholder.astro` | Consistent visible rendering of exact unresolved PH text. |
| `src\content\site.ts` | Typed name, provisional headline, navigation, and exact PH-01 through PH-20 registry. Not a CMS. |
| `src\styles\global.css` | Local font declarations, tokens, semantic defaults, layout, responsive and interaction states. |
| `src\assets\fonts` | Three official static WOFF2 files; no remote font service. |
| `public\licenses` | Font licenses and provenance information. |
| `public\robots.txt` | Internal-scaffold crawl exclusion; not authentication or access control. |
| `tests` | Built-output policy checks and browser scaffold checks. |
| `scripts\release-check.mjs` | Separately rejects unresolved/incomplete publication artifacts; normal internal builds may contain placeholders. |
| `firebase.json` | Static Hosting destination and security/cache policy; no project identity or backend rewrites. |
| `docs` | Existing governance, approved copy/design references, plan, and visual artifacts. Not copied to public output. |

Avoid a generic content engine. Extract further section components only when actual repeated content warrants them during the later authorized content pass.

## 4. Content, placeholders, sources, and status (historical scaffold phase)

The low-fidelity prototype's visitor-facing draft copy is the source for the later content pass. Its editorial instructions are not public copy. Preserve P0-P9 narrative order and the separate U1 utility route. Keep Evidence, Experience, and Exploration explicit without presenting them as equally authoritative scientific evidence.

The scaffold supplies only essential orientation: early-stage informational/collaborative purpose, Parkinson's as the first initiative rather than organizational limit, and no clinical service. It exposes anchor targets for approach, initiative, current work, and collaboration. Other narrative units remain identified as unimplemented, not silently completed.

Maintain the exact PH-01 through PH-20 strings centrally. Render headline, origin, future-software, font, palette, and illustration review markers in their relevant shell areas; contact/accountability markers beside their associated content; privacy markers on the utility route. Label the entire site as an incomplete implementation preview, not an operating service. Registry completeness is not permission to fabricate values.

Do not create `mailto:` until a monitored address and its preceding notices are approved. Preserve contribution context, health/nonclinical warning, privacy caveat and link, inactive address marker, and response-role marker in that order.

No citations are fabricated. A later scientific claim needs a versioned source record containing identifiable author/publisher, title, date, stable link/identifier, relevant passage, claim mapping, limitations, review owner/date, and correction history. Use descriptive ordinary links and adjacent readable reference text; never a decorative evidence badge or unsupported trust score. Until claims are introduced, say no scientific claims or source bibliography have been added to this scaffold.

Documentation/prototype status must not imply functioning research software. Do not reuse a historical document date as a new content-review or software-verification date.

## 5. CSS, fonts, and composition (historical scaffold phase)

Translate the approved palette and spacing into semantic custom properties, not a new visual system: paper `#F7F5EF`, charcoal `#222A2B`, slate `#4C5B5C`, teal `#185D62`, earth `#854B37`, mineral `#ECEFEA`, and white inset surfaces. Retain approved hover, pressed, visited, boundary, rule, and review roles.

Use a centered 1120px-equivalent envelope with a stable reading spine capped by both 704px-equivalent and approximately 68 characters. Body starts at 18px-equivalent with generous line height. Headings use Source Serif 4 semibold; body, navigation, identity, statuses, and references use Source Sans 3 regular/semibold. Do not simulate unavailable font weights.

Bundle official WOFF2 regular/semibold Source Sans 3 and semibold Source Serif 4 with their OFL licenses and provenance. CSS imports let the build fingerprint files. Use `font-display: swap`, readable system fallbacks, and no remote requests. Start without preload until measured need justifies it. Full character sets avoid silently excluding names or future source titles; revisit subsetting only with coverage review.

Use relative text sizes and unitless line heights. Gutters follow 32/24/16px-equivalent tiers; section gaps follow 72/64/48/40px-equivalent tiers. No fixed-height text containers, line clamping, horizontal page scrolling, or font reduction to force a fit. Long URLs, PH strings, and the founder's exact headline must wrap safely.

The 200% headline may need an emergency within-word wrap at 320px. This is preferable to clipped content or overriding enlarged text, but it remains a visual-review concern, not proof that the earlier complete-word refinement still passes.

Optional abstract contours are deferred in the scaffold. Their later inclusion is wide-desktop-only, requires rights review, and must not look like actual medical/sensor data. Omission is not permission to erase PH-20.

## 6. Navigation and responsive behavior (historical scaffold phase)

Use the approved four links in DOM/reading order: Our approach, Parkinson's initiative, Current work, Collaborate. Flex wrapping is natural, with no hamburger, fixed navigation height, sticky overlay, active-scroll scripting, or duplicated mobile navigation. Each destination is a real heading-bearing section.

Add the seven-link secondary map during full narrative implementation after the complete intro; do not invent missing reading destinations now. All utility routes retain access to contextual collaboration and privacy.

Support 1440, 768, 390, and 320px review widths, intermediate widths, landscape, and enlarged text. Layout must grow vertically. Standalone links target at least 44px-equivalent height with spacing; in-prose links remain readable and underlined. Do not reduce body copy, warnings, or privacy content on mobile.

## 7. Accessibility implementation and review (historical scaffold phase)

Target WCAG 2.2 AA; do not claim conformance from a scaffold or an automated score. Implement one main landmark, a first-focus skip link, descriptive page titles, English language, one h1 per template, ordered headings, native links, visible keyboard focus, and no JavaScript-dependent reading/navigation.

Use a 3px-equivalent earth focus outline with clear separation. Keep underlines on prose/utility links, separate hover/pressed/visited states, and do not communicate framework type, status, or warnings by color alone. Review actual rendered text/background combinations, focus adjacency, and forced-colors behavior.

Automated browser coverage uses the built static preview and axe on each template, not the development server or an image mockup. Manually review keyboard order and skip destination, screen-reader landmarks/headings/link context, 200% text-only enlargement, 400% zoom/320px reflow, WCAG text spacing, target size, contrast, and high-contrast modes. Browser automation's CSS text-enlargement specimen supplements rather than replaces browser/assistive-technology testing.

Do not animate decorative elements. No scripted state announcements, simulated forms, or inaccessible fake controls are needed.

## 8. Privacy utility page and technical boundaries (historical scaffold phase)

The utility shell distinguishes unresolved operator, recipients, purposes, mail processing/retention, hosting/security logs, third parties/international processing, requests/rights/deletion limits, and effective/review dates. Do not fill those fields from a vendor's generic policy.

It may describe the deliberately excluded application features as scaffold facts; it cannot promise zero hosting logs, a jurisdiction, retention duration, a responsible identity, security certification, or mail delivery. Explain that future private personal data is outside this public static site's architecture.

No browser storage, forms, permissions, analytics, remote fonts, third-party scripts, tracking pixels, cookies, or backend calls. Build-time package downloads are tooling, not visitor runtime integrations.

## 9. Firebase Hosting configuration (historical scaffold phase)

Set `hosting.public` to `dist`, ignore configuration/dotfiles/dependencies, and serve generated directory routes and `404.html`. No catch-all SPA rewrite, SSR adapter, Cloud Function, or Cloud Run rewrite. Keep trailing-slash directory routes consistent.

Configure a restrictive CSP: local fonts/styles/images only, no scripts, connections, frames, objects, form submissions, or embedding; constrain base URI. Add no-sniff, restrictive permissions, and a no-referrer policy. Emit external CSS rather than inline styles so the policy does not need `unsafe-inline`. Browser tests verify the emitted assets; actual Hosting header/redirect behavior remains a future authorized-preview check.

Use revalidation for HTML and immutable caching only for fingerprinted Astro assets. Do not invent a project ID, `.firebaserc`, domain, canonical URL, billing/region choice, processing facts, credentials, or deployment identity. Do not add the Firebase SDK or CLI merely to create this configuration.

## 10. Local development and build workflow (historical scaffold phase)

Install Node 24 LTS and use the committed lockfile with `npm ci`. Disable Astro tooling telemetry in package scripts. `npm run dev` binds localhost for local work; `npm run build` produces static `dist`; `npm run preview` serves that output locally. Neither command deploys.

Run `npm run check` for Astro/TypeScript diagnostics, `npm run format:check` for formatting, `npm run test:static` for built-output policy checks, and `npm run test:browser` for the bounded browser checks. The formatter is not a semantic linter; do not describe it as one. No separate ESLint layer is introduced without a concrete need.

Browser tooling requires its matching Chromium installation (`npx playwright install chromium`) or a documented supported local Chromium executable. Development dependencies and browser binaries are not shipped in `dist`.

`npm run verify` combines the scaffold checks. `npm run release:check` is intentionally separate and must fail while content/publication placeholders remain. A passing scaffold build is not a passing release gate. Do not deploy this scaffold even if the static build succeeds.

## 11. Test and performance strategy (historical scaffold phase)

Built-output policy tests inspect all templates, links/anchor targets, local assets/fonts, no hydration/scripts/forms/mail links/remote runtime URLs, robots/noindex, hosting-only configuration, and exact placeholder coverage. Reject output accidentally containing repository documents or configuration.

Browser checks cover landing/privacy/recovery routes, the skip link, all four nav destinations, warning/privacy/contact order, normal and enlarged narrow reflow, no external requests, no cookies/storage, no JavaScript-dependent navigation, and axe findings. Treat placeholder-heavy content as stress material; do not extrapolate to final copy.

For later complete templates, use a documented fixed device/network/CPU profile and three cold-load mobile lab runs per template. Proposed median targets remain LCP <= 2.5s and CLS <= 0.1, subject to founder confirmation of profile/targets. Record version, method, date, reviewer, and unresolved issues. Inspect font payload, layout shifts, CSS, and zero-client-JS output. Do not claim field performance from a local scaffold or invent Lighthouse results.

The proposed broader browser matrix remains Chrome/Edge/Firefox/Safari desktop, iOS Safari, and Android Chrome. Initial Chromium automation is only a subset; manual assistive-technology and real-device coverage remain release work.

## 12. Acceptance criteria and requirements traceability (historical scaffold phase)

Historical AC-01's no-stack-selection restriction belonged to the requirements assignment. The latest authorization explicitly replaces that restriction with the selected stack; all medical, privacy, and product exclusions remain.

| PRD acceptance / requirements | Historical scaffold pass condition | Subsequent full-site or release gate; see sections 15-16 |
|---|---|---|
| AC-01; BND-01-09; exclusions | Static Astro 6 only; no excluded integrations, logo, or collection path in source/output. | Repeat dependency, configuration, and feature inventory review. |
| AC-02; SEC-01; CNT-01 | Shell identifies purpose, early stage, nonclinical boundary, and first initiative. | Complete approved P1 copy and audience comprehension review. |
| AC-03; SEC-02-09 | Four real section destinations, privacy route, incomplete inventory identified. | Complete P0-P9/U1 and secondary map; no silently omitted unit. |
| AC-04; SEC-04-05 | Framework boundaries and Parkinson's first-initiative wording present, no clinical study implied. | Review all complete framework and initiative copy. |
| AC-05; CNT-02-03,10 | Origin remains an explicitly incomplete, permission-marked slot. | Approved concise origin with permissions; not a biography. |
| AC-06 | Exact latest working headline plus visible PH-15; docs say provisional. | Founder approves final public wording. |
| AC-07; CNT-05-09 | No substantive scientific claims or invented references. | Every added claim has source, context, limitations, and review. |
| AC-08; STS-01-05 | Status labels distinguish scaffold/documentation from unverified future software; exact PH registry preserved. | No unresolved or unauthorized claim/asset reaches publication. |
| AC-09; COL-01-06 | Context, warning, privacy, inactive address, response marker in order; no account/form. | Approved complete contribution copy and contact expectations. |
| AC-10; COL-07; NFR-06 | No invented email or mailto; navigation works. | Synthetic email receipt/copy test with monitored recipient. Forms remain excluded. |
| AC-11; PRV-01,07-11 | Unknown privacy facts visibly unresolved, no guessed notice. | Operator inventory, access, retention, incident/deletion process, and accurate notice confirmed. |
| AC-12; PRV-02-06,08 | Output/network checks find no backend, remote fonts, tracking, storage, cookies, or collection. | Verify actual Hosting/mail processing and necessary logs separately. |
| AC-13; A11Y-01-10 | Type/template checks, bounded axe/keyboard/reflow checks; disclose unperformed manual coverage. | Complete WCAG-target review, screen readers, contrast, text spacing, zoom and devices. |
| AC-14; NFR-01-04 | Local static routes work at 320/390/768/1440; no-JS navigation; enlarged text does not clip. | Agreed browser matrix and measured performance profile/targets. |
| AC-15; NFR-05-06,09 | Static404, internal links, conservative metadata, local assets, noindex and header policy configured. | Authorized environment verifies HTTPS, real headers, redirects, sources, email, metadata. |
| AC-16; NFR-07-08,10-12 | Versioned source, lockfile, workflow and rollback instructions; no deployment assumed. | Named maintainer demonstrates correction/recovery and owns review cadence. |
| AC-17; AUD-01-04 | No audience results asserted; implementation authorization does not manufacture sessions. | Founder reviews actual audience findings or explicitly handles the documented gap. |
| AC-18; CNT-11-12 | Scaffold clearly not approved for publication. | Founder closes applicable copy, identity, privacy, permission, ownership, and release gates. |

## 13. Preview, release, and rollback (historical scaffold phase)

Current preview is localhost only. Firebase preview channels are externally reachable deployments, not inherently private review spaces; creating one requires fresh authorization, a confirmed project/operator, accurate privacy disclosures, and approved content exposure. No preview-channel deployment, public deployment, production domain, credentials, or CI deploy job is created now.

Before a later authorized release:

1. Complete approved P0-P9/U1, final headline/origin permissions, citations and honest current-work statuses.
2. Resolve actual operator, monitored email, mail/hosting processing/logging, retention/deletion/incident handling, and review ownership/dates.
3. Run all scaffold and release checks; replace every applicable PH with approved facts and remove internal notices only after approval.
4. Finish manual accessibility, browser/device, performance, links/404, real headers/HTTPS, audience-feedback handling, and synthetic email tests.
5. Review generated assets for unintended exposure; approve actual Firebase project/permissions/cache settings and publication metadata.
6. Record founder publication approval, immutable Git revision, lockfile, build-tool versions, release artifact, responsible deployer, previous release, and recovery instructions.

After future deployment authorization, use Hosting release history to restore the last known-good release and verify primary/privacy/404 routes and cache behavior. Alternatively rebuild the recorded known-good Git revision with its lockfile in a separate clean working directory and deploy through the approved process. Do not reset a shared dirty worktree. Retain correction/source history; investigate the failed release before retrying. A rollback affects static site files, not correspondence already handled externally.

No operational owner, delivery date, Firebase identity, retention promise, or response commitment was assigned by the scaffold plan. Its original stop point was the validated scaffold. Section 15 superseded that stop point and authorized complete draft content; the current authority is release readiness under section 16, not deployment.

## 14. Initial scaffold validation record (historical; preserved)

Validated locally on 2026-10-20 with Node 24.22.0, npm 11.19.1, and installed desktop Chrome through Playwright. Node was supplied through a checksum-verified session-local portable runtime; it was not installed system-wide. Contributors still need the documented Node runtime on their own PATH.

| Command | Result |
|---|---|
| `npm run check` | Passed: zero errors, warnings, or hints across 14 files. |
| `npm run format:check` | Passed. Governance and historical design documents are excluded from automatic formatting. |
| `npm run build` | Passed: static landing, privacy, and 404 pages generated in `dist`. |
| `npm run test:static` | Passed: three checks covering output boundaries, exact PH-01 through PH-20 coverage, headline/contact ordering, and static Hosting configuration. |
| `npm run test:browser` | Passed: six checks covering local-only resources, bounded axe checks, no cookies/storage, no-JavaScript navigation/skip link, recovery, and 320/390/768/1440px normal and 200% text specimens. The runner started and stopped a localhost static preview. |
| `npm run release:check` | Intentionally blocked with exit 1: all three templates retain unresolved publication markers. This is the expected publication boundary, not an unresolved scaffold failure. |

The initial type check found missing Node type definitions in browser tooling and an insufficiently typed navigation-test tuple. Added the explicit Node type dependency/import and a readonly literal tuple; the subsequent type check passed. npm also reported unapproved install-script notices for transitive esbuild and sharp packages; no blanket script approval was added, and the static build completed successfully.

These results apply only to the incomplete scaffold. Safe emergency headline wrapping is not final visual approval. Manual assistive-technology, actual browser text-resize/zoom, real-device, full content, performance, actual Firebase headers, audience, and operational privacy reviews remain outstanding. No public or Firebase preview deployment, domain connection, or future AI-platform work was performed.

## 15. Complete draft content implementation

The founder subsequently approved the scaffold and authorized the complete P0-P9 landing narrative and U1 privacy utility structure, without changing the stack, exclusions, or publication boundary. This supersedes the original scaffold-only stop point, not the unresolved release gates.

Use the visitor-facing draft blocks in LOW_FIDELITY_CONTENT_PROTOTYPE.md, the approved IA order and navigation, and the latest exact provisional headline. Keep Evidence, Experience, and Exploration as consecutive editorial modules. Implement all contribution examples and the complete warning/privacy/contact/message-guidance sequence. No mailto, contact form, remote request, backend, or client-side JavaScript is necessary.

The content pass makes these bounded adaptations to the historical draft:

- P1 uses the latest founder-supplied headline instead of the older long candidate.
- P6 describes the written prototype explicitly, rather than incorrectly describing the now-implemented website as an unimplemented written draft. The historical documentation check of 18 October 2026 stays scoped to that artifact; it is not refreshed software verification or the public review date.
- The inactive address uses the exact PH registry from the mockup specification. Mail-client/copying instructions and an email action are deferred until an address exists; message guidance and the corrections use remain.
- P8 contains only the two source-policy/context paragraphs. The optional Parkinson's variability sentence, SOURCE-PD-01, generic empty bibliography, and invented citations remain omitted.
- U1 follows the approved scope, responsibility, email, visiting, requests, and dates/return order. Context makes its incomplete status and inactive channel explicit without assigning operators, processors, retention, rights, or response commitments.

The Fieldnotes Laboratory treatment keeps the reading spine, wrapping primary links, a seven-link secondary map after the intro, stacked concept modules, neutral status labels, a pale collaboration band, and a body-sized warning. Review gates are visibly separate from narrative prose. No contour illustration or photography is added; PH-20 remains with an omission note. PH-01 through PH-20 remain exact and visible in their associated content/review areas. Noindex, crawler exclusion, and the separate failing release check remain in force.

Extend built-output and browser checks to cover content order, draft-copy retention, secondary targets, concept boundaries, historical prototype/conditional idea status, collaboration ordering, U1 structure, and exact registry text against the specification. Retain existing static/no-JavaScript/local-resource/storage/reflow safeguards. Automated 200% text stress supplements, not replaces, manual accessibility and visual review.

### 15.1 Content-phase validation record

Validated locally on 2026-10-20 using the same Node/npm runtime and installed Chrome as the scaffold record. No dependency or stack changes were needed.

| Command | Result |
|---|---|
| `npm run check` | Passed: 14 files, zero errors, warnings, or hints. |
| `npm run format:check` | Passed after formatting source/tooling. Historical design documents were not reformatted. |
| `npm run build` | Passed: three static pages, no client-side JavaScript output. |
| `npm run test:static` | Passed: six tests, including full narrative order, retained draft prose, exact PH registry comparison with the specification, collaboration ordering, U1 structure, and existing output/Hosting safeguards. |
| `npm run test:browser` | Passed: eight tests, including all seven secondary links without JavaScript, concept visibility/vertical order, status and contact boundaries, privacy return routes, local-only requests, bounded axe checks, no storage/cookies, and 320/390/768/1440px normal and 200% text stress. Text enlargement assertions now include body/notice paragraphs and navigation, not only the title. |
| `npm run release:check` | Expected failure, exit 1: all three templates retain unresolved publication markers. Release remains blocked. |

No unexpected command failures occurred in this content pass. A separately started localhost static preview returned HTTP 200 for landing/privacy review specimens and was stopped after visual inspection. Inspected desktop intro, mobile concept flow, narrow contribution/warning content, enlarged narrow intro, and mobile privacy processing fields. The typography, stable spine, stacked modules, and warning remain intact. At 200% on narrow screens the unchanged headline still needs emergency within-word wrapping; text was not shrunk or clipped. This remains a final-copy/visual review issue, not a failed automated no-overflow check.

All PH-01 through PH-20 remain unresolved publication gates. Contact identity/response, operator/processing/retention/deletion/rights disclosures, publication responsibility/date/relationships, final headline, public origin permissions, future-software status review, font delivery/licensing review, palette/state review, and illustration disposition still need explicit closure as applicable. No scientific bibliography is necessary for this source-policy-only version; introducing scientific findings would require claim-level sources and review first.

Manual assistive-technology, actual browser zoom/text-resize and text-spacing review, broader browser/device coverage, agreed performance measurement, actual Hosting headers/processing verification, audience-feedback handling, and founder publication approval remain outstanding. No deployment, Firebase project ID, production domain connection, or future research/AI/data-system implementation was added.

## 16. Initial release readiness (historical; preserved)

The founder has reviewed the complete draft implementation and authorized release-readiness work only. Preserve the selected static stack and all product exclusions. No new features, removal of PH placeholders, mailto, Firebase project connection/identity configuration, preview/public deployment, or production-domain connection is authorized by this phase.

The active checklist and PH-01 through PH-20 decision register are in [RELEASE_READINESS.md](RELEASE_READINESS.md). LOCAL REVIEW READY, EXTERNAL PREVIEW READY, and PRODUCTION READY are distinct evidence-based states. A local build or the founder's content-phase approval does not authorize an externally reachable preview.

Before readiness assessment, the repository ignore rules were extended for coverage, Playwright blob/cache output, and case-insensitive ZIP archives, retaining existing exclusions for generated `.astro`, `dist`, dependencies, Playwright reports, and test results. Required `.astro` source components/pages, fonts, licenses, and governance/design documents remain eligible for source control. No documents/assets were deleted and no generated archives were committed.

The global `overflow-wrap: anywhere` declaration was reviewed. The narrower recommended strategy and its test constraints are documented in RELEASE_READINESS.md; no CSS change is required merely to establish readiness. Historical no-overflow results do not settle enlarged-headline readability, manual accessibility, actual Hosting behavior, or operational facts.

The current readiness pass re-ran all six requested commands: type/check, formatting, static build, six static tests and eight browser tests passed; `release:check` retained its expected exit 1 on unresolved markers in all three templates. The browser runner gained a validated optional loopback port setting to avoid an occupied shared-environment port without reusing or stopping another server. No product/CSS/test assertions changed. See the readiness document for the initial tooling failures, corrective steps, current evidence and remaining manual/operational gates.

## 17. Meridian Station decision pass and controlled-preview preparation (23 October record)

The founder renamed the project Meridian Station and approved the final headline: **Finding direction through evidence, experience, and emerging technology.** Current public identity, masthead, metadata, narrative, U1 and footer use the new name. Historical governance/design copy, original screenshots and validation records retain the old name with explicit historical notices; the GitHub repository/path is not renamed by this task.

PH-01/02/03/05/06/07/08/09/12/15/16/17/18/19/20 decisions are applied without leaving unresolved markers. Approved policy text is centralized in `src\content\site.ts`; remaining PH-04/10/11/13/14 retain their exact original strings and typed registry. The only mailto is `mailto:contact@meridianstation.org` in P7 after its complete warning/privacy explanation/link; U1/footer contact links return to that context. Cloudflare routing/delivery is founder-confirmed, not independently retested in this pass. No form, mail send backend, tracking, Firebase SDK or browser persistence is added.

The concise origin/Rebar reference is now approved; it is not expanded. Conditional future-capabilities language remains explicit, with no future research/AI/private-data system implemented. Local Source Serif 4 Semibold and Source Sans 3 Regular/Semibold and their OFL files remain. Palette approval does not complete actual interaction-state/forced-colors/contrast review or establish WCAG conformance.

Approved optional art is deferred to avoid complicating preview preparation. This is not an unresolved PH-20 or a preview blocker. Global emergency wrapping remains unchanged because ordinary long-word/enlarged headline cases make a placeholder/email-only narrowing unsafe without further layout review. The current readiness document records the narrower recommendation and unchanged overflow/enlargement safeguards.

[PREVIEW_DEPLOYMENT_PLAN.md](PREVIEW_DEPLOYMENT_PLAN.md) documents commands for later use and separates preflight permission, verification-only upload, share-ready preview and production. No Firebase project ID/account/billing/region/canonical URL or hosting-retention fact is invented. No authentication/setup/deployment is performed now. Noindex, crawler exclusion and the unchanged failing release checker stay in place.

### 17.1 Rename/decision-pass validation

On 23 October 2026, the required check (14 files, no diagnostics), format check, three-template static build, six static tests and eight browser tests passed using the recorded portable Node/npm runtime and installed Chrome. Existing 320/390/768/1440px normal/200% enlargement/no-overflow/non-clipping assertions were retained. `release:check` was unchanged and failed as expected (exit 1) on all three templates. New assertions cover the current name/final headline, exact contextual mailto and approved policy text, resolved-marker absence, five remaining exact PH strings and continued exclusions.

A test-only normal-wrap/placeholder-and-email-only scope caused 396px document scroll width at a 320px doubled-text viewport (current policy: 320px). It was not persisted. CSS is unchanged; the bounded comparison and remaining manual visual/assistive-technology/hosted review gates are documented in RELEASE_READINESS.md. No optional artwork was introduced, and no setup/deployment command was executed. Current artifact is LOCAL REVIEW READY, not share-ready external preview or production.

## 18. Ride product alignment — 29 October 2026

**Authority:** `ProductUpdatePrompt-v001.md` and the founder's correction directing
source review to `C:\Projects\parkinsons-ride-site`. Earlier phase records remain
historical, including their validation evidence. This pass restores the intended
AI-assisted Parkinson's knowledge resource and longitudinal tools without
implementing them or claiming operational/clinical maturity. The founder owns
direction/status; source inspection supports only the specific artifacts below.

### Source and claim inventory

Reviewed the public ride page and then the founder-specified local source,
read-only. Public content and local code can differ; neither inspection verified
private tracking infrastructure, a ride's completion, native-app operation or AI.
No external repository assets/configuration were copied into Meridian Station.

| Source in `C:\Projects\parkinsons-ride-site` | Supported interpretation | Limits / Meridian treatment |
|---|---|---|
| `index.html:402-447` | Awareness mission; AI knowledge resource for patients/families, research access/plain language and professional questions; mobile/longitudinal intent; fundraising intent. | Founder intent/history, not scientific evidence or proof of implementation. P1/P4/P5 preserve specificity, not funding amounts or collection claims. |
| `index.html:637-648` | Future educational data/AI resource, eventual personal trends, not diagnosis/prescribing. | Direction only; no functioning AI system established. |
| `README.md:3-31` | Source describes static website, route map, Firebase tracker and browser phone tracker, with native replacement recommended. | Documentation is not live operational verification. |
| `REALTIME_SETUP.md:3-35` | Browser GPS/private-public prototype design; native replacement and Android check-in/media descriptions. | No Android source exists in the supplied directory listing; these records alone do not establish native app delivery or validation. Public symptoms/media features of the old design are not imported. |
| `js\live-tracking.js:1-7,47-63` | Firebase database imports, setup guard and public map tracking implementation. | Code exists; configured/running delivery not tested. No database or SDK ported. |
| `js\tracker.js:1-19,54-62` | Browser authentication/database code and local queue. | Prior prototype artifact, not permission to add Auth, location collection, browser persistence or private data to this website. |

No separate Android or AI implementation was found in the supplied ride-site
directory or current Meridian `src` inventory. This is a bounded source finding,
not a claim that no such work exists elsewhere. Current research work is
requirements/direction definition, not an enrolled study or validated literature
service. P6's evidence date concerns this review and founder direction, not PH-04.

### Copy implementation and acceptance

- P0/P9/U1 keep approved identity, publisher/operator/contact/privacy promises.
- P1 uses the founder definition and exact final headline, with specific AI/longitudinal intent and unavailable-platform boundary.
- P2 explains snapshot/context limits without more-data-is-better claims.
- P3 keeps consecutive editorial concepts and adds the three related explanatory directions beneath them; no new navigation, pages, products or controls.
- P4 states credible-source AI knowledge-resource and future justified observations explicitly; patients/families, professional questions and nonclinical limits remain together.
- P5 makes the ride an awareness/technology/knowledge-resource catalyst in concise third person; no completion, detailed history, treatment result or endorsement.
- P6 distinguishes prior prototypes, current static website, actively developing direction/scope and future implementation. The exact revised PH-17 text is centralized in `site.ts` and recorded in RELEASE_READINESS.md.
- P7 expands perspective examples without soliciting health stories. P8 remains source policy only; founder/history statements above are not clinical findings.

The dated prototype addendum is the current copy baseline. Tests compare P2-P6
against it, retain historical P8 continuity and independently assert the founder
definition, exact PH-17, intended applications, history/status boundaries, concept
order, first initiative, contact sequence, five PHs and all runtime exclusions.
Requirements traceability: AC-02/04/05/07/08/09/12/13/14/15/18 and the dated PRD
acceptance addendum. Local artifacts do not settle audience comprehension.

### Original typography, palette and implemented visual decision

Actual ride source `index.html:9-11,35,61,129` requests **Inter 400/500/600/700/800**
and **Libre Franklin 700/800** from Google Fonts; body is Inter with system
fallbacks, headings/brand Libre Franklin. These are source declarations, not proof
that a remote font rendered in every browser. They differ from the approved local
Source pair. **No font replacement proposed or implemented**: preserve the reviewed
Source Serif 4 Semibold / Source Sans 3 Regular/Semibold files, hashes, local
delivery and SIL OFL 1.1 notices. No new dependency or remote font request.

Ride `index.html:15-25` principal tokens: background `#F5F7F8`, surface `#FFFFFF`,
secondary surface `#EEF2F3`, text `#122022`, muted `#647174`, line `#DCE4E6`,
teal `#145F68`, dark teal `#0F4C53`, pale teal `#DCEFF1`, warm `#E7A33B`.
Meridian retains its warmer paper/mineral/charcoal/slate/teal/earth/plum system,
not the old cards, sticky navigation, motion, maps or runtime integrations.

**Complete token change:** add only `--color-royal-accent: #5278C7`. Three short
empty `::before` rules above the Evidence/Experience/Exploration headings use it
on paper `#F7F5EF`. They carry no label, data or status meaning. No blue text,
action/focus/visited replacement or palette-wide recoloring. Relative luminance
calculation gives **3.955:1** against the sole actual adjacent background, above
the 3:1 non-text threshold. It is below 4.5:1 for ordinary text (even against white:
4.312:1), so it is not used as text. Forced colors may suppress decorative
backgrounds; headings, underlines and system focus remain. This is not conformance.
Optional contour artwork remains deferred; no art/assets added.

Wrapping is unchanged: previous normal-wrap narrowing demonstrably failed doubled
text at 320px. No smaller text, overflow hiding or `break-all` workaround. Existing
reflow guards and new focus/hover/forced-color/marker checks are retained; actual
browser zoom, screen reader and mobile-device review are still separate gates.

### Preview and validation boundary

Founder reports an existing verification-only project **`meridian-station-preview`**
and channel **`founder-review`**. This supersedes section 17's preparation-only
no-project situation, without rewriting that history or inferring credentials,
billing, region, canonical URL, logs, retention or international processing.
No CLI authentication/setup/update, network verification of that preview or
deployment occurs in this pass. A later update requires separate authorization,
reviewed immutable source/artifact, deployer/site/expiry confirmation and recorded
hosted checks. Share-ready preview still requires PH-10/11 and actual notice dates;
production requires all five PHs, manual/operating checks and explicit publication
approval. See the preview plan's current clarification.

Validation results and visual evidence for this exact pass are recorded in the
current section of RELEASE_READINESS.md; earlier section 14-17 results do not
count as validation of these changes.
