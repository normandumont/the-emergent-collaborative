# Phase 1 Release Readiness

## Local AI question experiment — separate authorization, not public readiness

The founder authorized a development-only Ask Parkinson's Insights prototype.
See [AI_QUESTION_PROTOTYPE.md](AI_QUESTION_PROTOTYPE.md) for architecture,
privacy implications, testing and deployment blockers. The normal static build,
Hosting configuration, approved public privacy copy and existing visual design
are unchanged. PH-10 and PH-11 remain unresolved and their review scope now
includes Functions/runtime/user input and OpenAI processing, retention and
disclosures. Privacy wording and retention statements require renewed review.
PH-04, PH-10, PH-11, PH-13 and PH-14 remain the exact five unresolved gates.
No new effective dates, deployment or production service enablement.

## Ride-derived visual redesign — 29 October 2026 (current visual authority)

The founder explicitly supersedes Fieldnotes Laboratory where it conflicts with
the Ride for Parkinson's visual direction. The product-alignment copy and revised
PH-17 below remain current; this is a substantial presentation change, not new
functionality. The design-source table was recorded before CSS changes in
[implementation-plan section 19](IMPLEMENTATION_PLAN.md#19-ride-derived-visual-redesign--29-october-2026).
It covers actual live rendered inspection at 1440/390px and the founder-specified
Ride HTML/CSS source, including font declarations, dimensions and mobile behavior.
Previous visual decisions and test records below describe earlier artifacts.

### Source identity and implemented evolution

Ride uses **Inter 400/500/600/700/800**, with **Libre Franklin 700 headings /
800 brand**, not Source Sans/Serif. Its exact source palette is page `#F5F7F8`,
surface `#FFFFFF`, soft `#EEF2F3`, text `#122022`, muted `#647174`, line `#DCE4E6`,
teal `#145F68`, dark teal `#0F4C53`, pale teal `#DCEFF1`, warm `#E7A33B`.
**Its primary identity is teal, not navy or blue.** These facts come from
`C:\Projects\parkinsons-ride-site\index.html:9-28`, confirmed by computed styles
and loaded faces on the public reference. Navy/royal is the founder-requested
Meridian evolution, not an invented observation of the original.

Meridian now uses the exact two Ride font families, unmodified local Latin
variable WOFF2: Inter 400-800 and Libre Franklin 700-800, 77,548 bytes total.
Both local preloads and `font-display: swap` point to fingerprinted local assets.
Required SIL OFL 1.1 copyright/notices, exact distribution URLs, byte sizes and
SHA-256 hashes are in `public\licenses\FONT_PROVENANCE.txt`. Both binary and
notice hashes were verified. Previous Source files/licenses remain as history;
the build emits only the two new font binaries. No Google Fonts runtime request.

The new dominant colors are navy `#193554`, action blue `#284E91`, royal
`#5278C7`, light blue `#EAF0FB`, Ride cool page/white/ink, secondary `#52636B`,
complementary Ride teal/pale teal and restrained warm detail. Hover/pressed are
`#1D3D75` / `#142E5A`; visited is `#644574`; functional border `#71838E`.
Royal is prominent in the large two-tone headline, hero outline, feature/concept
boundaries and original directional art, not just small rules. Normal-size white
labels use the darker action blue, never the insufficient white-on-royal pair.

Full-width light wrapping masthead, recognizable bold brand, four visible links
and a collaboration pill replace the understated editorial header. P1 uses a
broad responsive hero, prominent first-initiative label, exact purpose statement,
clear initiative/approach actions and rounded directional panel. P3 has three
labeled navy/royal/teal concept cards with all explanations/boundaries retained,
then three quieter research directions. P4 is a strong pale-blue section with
two white feature panels for knowledge resource and longitudinal understanding.
P5 is a navy origin section with an explicit Ride → Awareness + Technology →
Meridian transition and the unchanged concise story. P6 has four scan-friendly
work rows and neutral blue Prototype / Active development / Future exploration
labels, never green validation indicators. P7 is an inviting pale-teal block with
a white contact panel; warning → privacy → email → guidance → response remains
the exact sequence. No contact action has moved ahead of its safeguards.

The P1 inline directional SVG was newly authored for Meridian Station, not copied
from Ride or a stock source. Four abstract paths, no actual location/route,
sensor/health data, axes, statistics or medical imagery. It is decorative,
`aria-hidden`, nonfocusable, absent below 1024px and in forced colors. No original
Ride graphic/portrait or proprietary asset was reused. No new runtime service.

### Local validation and limitations

| Required command | Current redesign result |
|---|---|
| `npm run check` | PASS: 14 files, zero errors, warnings or hints. |
| `npm run format:check` | PASS. |
| `npm run build` | PASS: three static pages; two local WOFF2; no client JavaScript. |
| `npm run test:static` | PASS: six tests; exact approved prose/PH/contact/metadata, local asset/license/preload, nonclinical and static-only guards. |
| `npm run test:browser` | PASS: twelve tests; navigation/keyboard/axe, semantic concepts/features/work groups, contact order, five-width normal/200% reflow, loaded/failing fonts, actual text contrast, blue/royal identity, focus/hover/forced colors, local-only requests and empty persistence. |
| `npm run release:check` | Expected FAIL, exit 1: unresolved publication markers on all three pages; checker unchanged. |

| Measured pair | Contrast |
|---|---|
| Royal large bold hero on cool page | **4.013:1**, above the applicable large-text 3:1; minimum 40px/700. Not approved as ordinary text. |
| White on action blue / hover / pressed | **8.112 / 10.624 / 13.391:1**. |
| Secondary text on pale blue / cool page | **5.470 / 5.823:1**. |
| Light origin copy / white heading on navy | **9.294 / 12.510:1**. |
| Blue focus ring on cool page | **7.549:1**, with a visible gap around the blue action. |
| Functional boundary on pale blue | **3.438:1**. |
| Royal decorative border on pale blue | **3.769:1**. |
| Teal feature label on white | **7.326:1**. |

Browser tests record actual computed foreground/background pairs, including
navigation/pills, actions, concepts, feature labels, status badges, notices,
contact and footer. Hover/focus and emulated forced-colors screenshots were
visually inspected. Token arithmetic also records pressed and visited colors;
history-dependent visited hue cannot be certified from Chromium computed styles.
The visited privacy journey/underline is exercised, not claimed as visual proof
of its exact visited hue. Manual visited/high-contrast/system-theme review remains.

Landing and U1 pass at **320/390/768/1024/1440px**, normal and doubled computed
text, with no horizontal page overflow or clipped inspected text/panels. Neither
important text nor the 200% increase is reduced; no overflow hiding/fixed text
heights are used. Emergency within-word breaks remain in long text at the
narrowest doubled headline and nested contact warning. Screenshot review caught
and corrected an avoidable doubled-text Collaborate pill word split: compact gutters/panel/action padding are now capped
by available viewport width, without reducing text. Work/split columns collapse
intrinsically when enlarged rather than leaving cramped side-by-side prose.
Regression checks require the complete 320px doubled Collaborate label on one
line and stacked enlarged work rows; doubled concept/work/warning captures are
also reviewed. Local-font failure is explicitly tested at 320/1440, normal and 200%;
system fallbacks remain readable and within the page. Semantics, skip link,
landmarks, all four mobile destinations, >=48px controls and reduced-motion
behavior remain. Desktop screenshot review shows natural responsive columns and
mobile stacking rather than a narrow printed-paper spine.

Screenshots include five full-width landing/privacy pairs, enlarged-text and
headline specimens, 1440px hero/concepts/initiative/origin/current-work/collaborate,
and keyboard/hover/forced-color/visited-return views. The 75 final PNGs and
rendered contrast JSON are preserved in session artifacts
`files\ride-visual-redesign\local-review`; source reference images remain in the
parent folder. None were deployed or committed.
Real-device, screen-reader, actual browser zoom/text-spacing, broader-browser,
performance and audience review are still outstanding. These checks do not claim
WCAG conformance or a measured 20-second comprehension result.

**Final visual acceptance: yes.** Someone who knows Ride for Parkinson's would
recognize an intentional evolution through the exact typography, two-tone bold
hero, cool surfaces, rounded panels, pill actions and warm directional detail.
Blue/navy broadens that language without copying the campaign or its functionality.
This is the local design assessment, not an audience-research finding.

**LOCAL REVIEW READY: yes. EXTERNAL PREVIEW READY: no. PRODUCTION READY: no.**
PH-18/19 remain resolved under this superseding font/palette decision, with bounded
verification and manual limits above; PH-20 now records the original decorative
motif rather than deferral. No unrelated resolved gate is reopened. Only
**PH-04, PH-10, PH-11, PH-13, PH-14** remain unresolved. No dates or hosted/privacy
facts were fabricated. Static/noindex/incomplete-preview safeguards remain.

No deployment occurred. Firebase/project configuration, the founder-reported
`meridian-station-preview` / `founder-review`, production domain, Cloudflare,
DNS/MX and email routing were not modified. The test-owned loopback preview
stopped. A future separately authorized update would upload a complete rebuilt
`dist`, now including redesigned HTML/CSS, both fingerprinted fonts, preloads
and required notices; documentation/tests/source are not visitor assets.
The earlier accent-only upload delta below is historical, not the current delta.

## Product-alignment clarification — 29 October 2026 (current content authority)

The founder's `ProductUpdatePrompt-v001.md` restores the concrete intended
AI-assisted Parkinson's knowledge resource and longitudinal-data direction.
This supersedes the earlier overly conservative interpretation of PH-17 as
merely hypothetical ideas; **intended direction is not operational capability**.
The exact replacement now applied in P6 is:

> Meridian Station is actively defining and developing a technology direction that includes AI-assisted research exploration and longitudinal-data tools. Some underlying concepts and prototypes began with the Ride for Parkinson’s project, while the broader Meridian Station platform remains under development. These capabilities are not currently offered as clinical, diagnostic, or treatment services.

PH-17 remains RESOLVED with this revised wording; it is not a new unresolved gate.
Local ride-site source inspection supports prior browser/Firebase tracking
prototypes, not a verified tracker, working AI service, delivered native app,
completed ride or clinical study. P6's dated source/direction check is not PH-04.
The current copy baseline and historical text coexist explicitly in
LOW_FIDELITY_CONTENT_PROTOTYPE.md; source/asset evidence is in implementation-plan
section 18. No prior validation record was erased.

**Existing verification preview, founder-reported:** project
`meridian-station-preview`, channel `founder-review`. Earlier statements that no
project/channel existed describe the preparation phase, not current remote status.
This task did not inspect, create or update it. No authentication, deployment,
domain/DNS/MX/Cloudflare change or hosted-privacy resolution is authorized.
The next preview update needs separate founder permission for the reviewed exact
source/artifact, actual site/deployer/expiry/exposure and retained five markers;
use the current clarification in PREVIEW_DEPLOYMENT_PLAN.md, not the historical
project-creation prerequisite. No credentials, billing, region, canonical URL,
provider logs/retention or international-processing facts are inferred.

**Open decisions remain exactly PH-04/10/11/13/14.** Share-ready external preview
still requires hosted review, approved PH-10/11 disclosures, real notice dates
and explicit circulation approval. Production additionally needs final public
content review/date, manual accessibility/device/performance and operating
checks, reproducible release/rollback evidence, and explicit production approval.
Noindex/robots, incomplete notice and unchanged failing release checker remain.

### Historical accent-only visual decision and validation record — superseded

Only the decorative concept-heading rules use the new `--color-royal-accent:
#5278C7`. Actual background is paper `#F7F5EF`: **3.955:1**, suitable for this
non-text accent, not ordinary text. No other color token changes. Existing fonts,
teal actions, plum visited state, earth focus and full sizes remain; local OFL
assets/licenses are untouched. Original ride fonts/palette are established from
the founder-specified local source, not guessed; exact declarations and provenance
are recorded in implementation-plan section 18. No font swap or artwork added.
Wrapping remains unchanged because the earlier narrower strategy failed 320px
doubled text. No clipping, overflow hiding, `break-all`, reduced size or weakened
reflow assertion is accepted.

Validated locally on 29 October 2026 using the recorded session-local Node
24.22.0/npm 11.19.1 runtime and installed desktop Chrome. No dependencies installed.
Earlier validation tables below remain evidence only for their dated artifacts.

| Command | Product-alignment result |
|---|---|
| `npm run check` | Passed: 14 files, zero errors, warnings or hints. |
| `npm run format:check` | Passed after excluding the founder-authored task prompt from automatic formatting, consistently with historical governance sources. Initial run failed only on `ProductUpdatePrompt-v001.md`; its contents were not altered. Source/test formatting still runs. |
| `npm run build` | Passed: three static pages; no client JavaScript. |
| `npm run test:static` | Passed: six tests, including current prototype copy continuity P2-P6, historical P8, exact definition/revised PH-17, specific product directions, honest status/origin, unchanged contact/privacy/gates/runtime guards and no deployment script. |
| `npm run test:browser` | Passed: nine tests. Existing navigation/axe/local-only-resource/contact/gate/reflow guards retained; new actual blue/background contrast and keyboard/focus/hover/forced-color checks. Cookies, local/session storage, IndexedDB, Cache Storage and service workers absent. |
| `npm run release:check` | Expected failure, exit 1, unresolved publication markers on all three templates. Script unchanged; no missing-build failure. |

Inspected local screenshots at **320/390/768/1440px**, including the headline at
normal and 200% root text, concept markers, action focus+hover, emulated forced
colors and the privacy-link return path. All four widths pass unchanged document
no-horizontal-overflow and element non-clipping/enlargement assertions for landing
and U1. The narrow doubled headline still splits long words within words; this is
an explicit reading-quality review limit, not a smaller-font or clipping fix.
The small blue rules read as subordinate accents on paper; no clinical/data
graphic or card interface was added. Focus outlines remain visible around the
teal action in ordinary mode and around its system-colored replacement in emulated
forced colors.

The visited-link journey was exercised and its underline retained; this automated
Chromium context does **not** certify history-dependent visited hue. Its screenshot
does not establish the plum state, and computed styles are privacy-restricted.
Real-browser visited-state/high-contrast review remains required, as do screen
reader, actual zoom/text-spacing, mobile-device, broader-browser, performance and
audience review. No WCAG conformance or 20-second comprehension success is claimed.
The unchanged font hashes match the recorded provenance; OFL notices remain.

Forty generated visual specimens are in ignored `test-results` and preserved in
the session artifact folder `files\product-alignment-2026-10-29`, not committed or
deployed. The test-owned loopback preview used port 4322 and stopped; no listener
remained after validation.

**LOCAL REVIEW READY: yes. EXTERNAL PREVIEW READY: no. PRODUCTION READY: no.**
The exact next preview source delta is `src\content\site.ts`,
`src\pages\index.astro`, `src\layouts\SiteLayout.astro` and
`src\styles\global.css`: revised definition/status/copy, shared metadata and three
blue concept rules. A later authorized upload serves the complete rebuilt `dist`
(landing/privacy/404, fingerprinted CSS and existing local fonts/licenses/robots),
not source documents, tests, ZIPs or operational records. No Firebase/robots/release
script configuration changed. Current documentation/tests and `.prettierignore`
support review but are not hosted visitor assets. An immutable reviewed revision,
site/deployer/expiry confirmation and explicit preview-update permission are still
needed before that delta may be uploaded.

No product-framing inconsistency is known within this bounded copy/source review;
unverified native-app/AI/operational work remains explicitly unclaimed. The
historical documents intentionally retain older directions under dated notices,
not parallel current instructions. Old campaign funding goals/expenses, donation
controls, personal regimens/medical details, unsourced health claims, ride dates
or completion, public symptom/location/media features and remote-font/runtime
integrations were deliberately not reused: they are unverified, sensitive,
scientifically unsupported or outside this site's approved scope.

## Current decision pass — Meridian Station

**Authority:** founder-approved rename and PH decision pass, 23 October 2026, with the 29 October clarification above governing current direction, PH-17 and existing preview status. The current public name is **Meridian Station**, previously The Emergent Collaborative. The final headline is **"Finding direction through evidence, experience, and emerging technology."** The current implementation and this section supersede contradictory earlier placeholders/stop instructions. The original readiness assessment below the historical divider is preserved solely as a dated phase record.

The current task authorizes local product-copy/visual/documentation updates, not authentication, deployment or preview-channel update, production publication, or connecting `meridianstation.org` to Firebase. Email routing is a distinct existing service; do not change its DNS.

**Evidence boundary:** Cloudflare Email Routing is active and delivery has been tested successfully **as reported by the founder**. This pass did not inspect the private destination mailbox or repeat the delivery test. The verification project/channel above are likewise founder-supplied. No private mailbox identity, jurisdiction, legal entity, billing plan, region, canonical URL, hosting retention or international-processing location is inferred.

### Current PH decision register

Only **PH-04, PH-10, PH-11, PH-13 and PH-14** are in the live unresolved registry. Resolved decisions remain subject to factual maintenance and the stated release verification; closing a decision placeholder is not a claim that every manual/hosted check has passed.

| ID | Current status | Applied decision / remaining exact text | Affected surface | Preview / production treatment and next validation |
|---|---|---|---|---|
| PH-01 | RESOLVED | `contact@meridianstation.org`; Cloudflare Email Routing active and successful delivery reported by founder. | P7; U1; central content; tests. | One plain mailto only after warning/privacy on P7; exact copyable address, no subject/body/query parameters, attachments/form or delivery-success UI. Reconfirm receipt/monitoring before production or after routing changes. |
| PH-02 | RESOLVED | "Messages are reviewed by the founder of Meridian Station. We aim to respond to project-related inquiries within 5–7 business days." | P7, after message guidance. | Approved aim, not a clinical/urgent guarantee; verify actual monitoring/capacity at release. |
| PH-03 | RESOLVED | "Publication responsibility: Norman Dumont, Founder, Meridian Station" | Shared P9 on all templates. | Named accountable publisher; verify consistent footer/correction context. |
| PH-04 | DEFERRED UNTIL FINAL REVIEW | [PUBLIC CONTENT REVIEW DATE — NOT YET SET] | Shared P9. | May remain on an explicitly authorized draft preview. Blocks production until actual final public review and date approval; do not reuse the 18 October prototype date. |
| PH-05 | RESOLVED | "Material relationships: None currently disclosed." | Shared P9. | Use exactly this limited statement, not "no conflicts" or an independent investigation result; reconfirm during final review. |
| PH-06 | RESOLVED | "Responsible operator: Norman Dumont, Founder, Meridian Station"; "Contact: contact@meridianstation.org" | U1 responsibility. | Address shown as text; contact/privacy links return to P7 context, not a direct mailto shortcut. |
| PH-07 | RESOLVED | "Authorized recipient: Norman Dumont, Founder, Meridian Station" | U1 email. | Do not expose the designated destination mailbox or invent additional recipients. |
| PH-08 | RESOLVED | "Correspondence may be used to respond to project questions, collaboration inquiries, feedback, and correction requests." | U1 email. | No health-data collection, study enrollment, newsletter, publication or AI-processing authorization. |
| PH-09 | RESOLVED | Founder-approved Cloudflare routing, retention and deletion policy, reproduced verbatim below and in U1. | U1 email; central approved copy; operating rules below. | Operational policy is approved; maintain actual retention/access/deletion practices. PH-11 remains responsible for unverified full third-party/international disclosures. No destination provider/location invented. |
| PH-10 | DEFERRED UNTIL HOSTING | [ACTUAL DELIVERY/SECURITY LOG FIELDS, PURPOSES, RECIPIENTS, STORAGE/COOKIES AND RETENTION — PENDING] | U1 visiting; `firebase.json`; hosted evidence. | Resolve from actual configuration, provider documentation/settings and authorized test responses. No browser trace alone proves backend retention. Blocks share-ready preview/production; does not circularly prohibit a separately approved verification upload. |
| PH-11 | DEFERRED UNTIL HOSTING | [THIRD-PARTY AND APPLICABLE INTERNATIONAL-PROCESSING DISCLOSURES — PENDING] | U1 visiting, hosting/mail processing inventory. | Verify relevant actual providers/entities, recipients and applicable international processing after setup, including known Cloudflare routing and designated-mailbox processing; no guessed jurisdiction/location/rights. Same test-upload versus sharing boundary as PH-10. |
| PH-12 | RESOLVED | Founder-approved request/response/deletion-limits wording, reproduced verbatim below and in U1. | U1 requests; P7 privacy/correction context. | No statutory-rights/regulator/jurisdiction-specific claims. Verify a workable request-handling procedure using nonsensitive material before release. |
| PH-13 | DEFERRED UNTIL FINAL REVIEW | [PRIVACY NOTICE EFFECTIVE DATE — NOT YET SET] | U1 dates. | May remain in a specifically authorized verification-only upload with an explicit incomplete-notice exception; public/share-ready preview and production need an approved effective notice/date for actual processing. Never fabricate a date. |
| PH-14 | DEFERRED UNTIL FINAL REVIEW | [PRIVACY NOTICE REVIEW DATE — NOT YET SET] | U1 dates. | Same verification-only exception boundary as PH-13; actual notice review evidence/date is required for share-ready preview and production. |
| PH-15 | RESOLVED | "Finding direction through evidence, experience, and emerging technology." | P1; central content; tests; metadata/identity context. | Final copy, not provisional. Narrow/enlarged visual/accessibility verification remains a release check, not a reopened headline decision. |
| PH-16 | RESOLVED | Current concise third-person origin approved for publication, including Rebar Foundry, with current organization name substituted. | P5. | No biography expansion, detailed medical history, new names/assets or endorsement claim. Original prototype retained as provenance. |
| PH-17 | RESOLVED — REVISED 29 OCTOBER | Exact founder clarification quoted above and applied in `approvedCopy.futureCapabilities`. | P6; dated prototype; tests. | Actively developing direction/scope, prior supported prototypes, platform under development, no currently offered clinical/diagnostic/treatment service. No invented operational AI/native-app status or new platform feature. |
| PH-18 | RESOLVED | Superseding founder-directed Ride typography: local Inter variable 400-800 / Libre Franklin 700-800. | Two exact WOFF2 assets, local preloads, OFL notices and binary/license hashes in `public\licenses\FONT_PROVENANCE.txt`. | Exact official unmodified distributions/notices reviewed, local loaded faces and blocked-font fallback/reflow tested; no runtime remote fonts. Historical Source assets/licenses retained, unused binaries not emitted. Broader script/device coverage is not claimed. |
| PH-19 | RESOLVED | Superseding cool neutral/white, navy/blue/royal #5278C7 identity and Ride teal complement. | Global CSS, rendered contrast JSON and current validation section above. | Bounded normal text/navigation/button/focus/hover contrast, forced colors and five-width/200% review pass; pressed/visited token ratios recorded. Manual visited/system-theme/device/accessibility review remains; no WCAG conformance claim. |
| PH-20 | RESOLVED | Original static abstract desktop direction motif, under the approved non-data/non-medical/non-geographic/non-route constraints. | Four newly authored inline SVG paths in P1, `aria-hidden`, nonfocusable, hidden below 1024px and in forced colors. | Project-created in this redesign; no copied/stock Ride asset, trace, observation or statistics. Decorative semantics and compact omission tested; text carries all meaning. |

**Exact PH-09 public policy:**

> Email sent to contact@meridianstation.org is routed through Cloudflare Email Routing to the founder’s designated mailbox. Messages are retained only as long as reasonably necessary to respond, maintain project correspondence, resolve corrections, or meet legitimate recordkeeping needs. Messages may also remain temporarily in provider backups or logs outside Meridian Station’s direct control. Requests to delete correspondence will be honored where reasonably possible, subject to technical, legal, and backup limitations.

**Exact PH-12 public policy:**

> Questions about information handling, correction requests, or deletion requests may be sent to contact@meridianstation.org. Meridian Station will make reasonable efforts to respond within 5–7 business days. Requests will be handled to the extent reasonably possible, subject to legal obligations, provider-controlled backups, security logs, and other technical limitations outside Meridian Station’s direct control.

### Approved operating rules, not additional public legal promises

Norman Dumont is the approved operator/authorized recipient. Apply these founder-supplied rules to operator-controlled correspondence; do not imply they override provider backup/log behavior:

- Routine inquiries: retain up to 12 months.
- Collaboration/correction threads: retain until resolved, then up to 12 months.
- Accidental sensitive health information: delete as soon as practical after handling unless retention is required for security or legal reasons.

Restrict correspondence access, do not forward private/sensitive messages into public issues, source control or AI processing, and do not ask a sender to resend health information for a deletion request. Confirm the practical retention-review/deletion/absence and incident procedure with the operator before production; do not treat a policy paragraph as proof of its execution. No private messages or mailbox credentials belong in this repository.

### Current work packages A-E

| Group | Approved/applied | Remaining release work |
|---|---|---|
| A. CONTENT | Meridian Station name; final headline; specific knowledge-resource/longitudinal direction; concise ride-catalyst/Rebar origin; revised PH-17; publisher and exact relationship disclosure. P0-P9/U1 and all conceptual boundaries retained. | Final review and PH-04 actual date; check current-work accuracy, audience-feedback handling, correction/review cadence. No scientific bibliography is needed for source-policy-only P8. Any added claim still requires sources/review. |
| B. CONTACT | Real dedicated address; founder-reported working routing/delivery; authorized founder recipient; approved 5–7-business-day aims; correction/privacy purposes; complete warning → privacy → mailto → message guidance → response sequence. | Confirm ongoing monitoring/absence coverage and a nonsensitive receipt/request exercise before release; no fake sending success or new collection mechanism. |
| C. PRIVACY / OPERATIONS | Approved operator/contact, correspondence purposes, Cloudflare policy, retention/deletion rules and request wording. | PH-10/11 actual host and full relevant third-party processing inventory; PH-13/14 actual notice dates; practical access/incident/deletion checks. No invented statutory, compliance, anonymity, certification, provider-region or retention claims. |
| D. DESIGN / ACCESSIBILITY | Exact font direction, local delivery/license requirements and palette direction approved; optional art approval recorded without adding art. | Actual font/fallback delivery, focus/hover/visited/state contrast, 320px/200% reading, keyboard, screen reader, text spacing, browser zoom/reflow, forced colors/high contrast, real mobile and agreed browser matrix/performance evidence. No WCAG conformance or audience success claimed. |
| E. HOSTING / DEPLOYMENT | Existing static-only `dist` Hosting configuration, restrictive CSP/cache policy, noindex/robots safeguards; founder-reported verification project/channel. | Separately authorize the next update's deployer/site/expiry/exposure and exact revision/artifact; inspect real HTTPS/headers/cache/404/network/storage; resolve hosting facts and establish recovery. Production-origin/canonical and custom-domain connection remain separate decisions, not inferred from the email domain. |

### CSS wrapping decision in this pass

Global `overflow-wrap: anywhere` remains unchanged. It favors ordinary word boundaries but can split an otherwise unbreakable word, and affects intrinsic min-content sizing. The new approved headline includes long words such as "experience" and "technology"; at 320px with doubled text and relative gutters a complete word can exceed the available measure. Long concept/navigation/warning words present additional constrained cases. Normal-only prose/headings cannot safely be adopted simply by scoping `anywhere` to the five placeholders and email.

The recommended narrower strategy remains ordinary normal wrapping, with `anywhere` scoped to unresolved placeholders, long URLs, email addresses and unbroken technical identifiers, **only when verified to preserve every unchanged 320px/200% assertion**. Current headline/other ordinary long-word cases would still need emergency breaking or another approved layout solution; reducing user-enlarged text, hiding overflow, changing final copy, or weakening tests is not acceptable. An `.email-address` hook identifies the actual address for any later scoped change; no narrower rule is claimed implemented in this pass. See the latest automated evidence below; manual reading quality remains distinct from no-overflow.

**Bounded browser comparison:** on the actual built landing page at 320px with doubled root text, the current rule produced a 320px document scroll width. A test-only override of normal body wrapping plus scoped `anywhere` on `.placeholder` and `.email-address` increased document scroll width to **396px**. The h1 had a 256px client width and 340px scroll width; concept/initiative/footer headings, the preview notice and some warning/question copy also overflowed. The override was not saved to source. This demonstrates why the preferred token-only scope cannot safely replace the current rule in this pass. No clipping or font-size reduction was used to disguise it; the localhost helper was stopped after comparison.

### Current readiness definitions and exact next-step blockers

**LOCAL REVIEW READY:** the current renamed/approved-copy artifact passes check, formatting, static build, static/browser tests, retains exactly the five open PH markers and noindex/robots, and intentionally fails the unchanged production release checker. No prohibited runtime feature/resources/storage were added. This means local review, not permission to expose the draft externally.

**Repository prepared for a later verification-preview update:** documentation/commands and static configuration are present; project/channel existence is founder-reported. **Not EXTERNAL PREVIEW READY** and no update is authorized. Before the next verification-only upload can be authorized, the founder must:

1. Confirm the actual Hosting site under existing project `meridian-station-preview`, ownership/permissions and permitted authenticated deployer, with necessary service terms/cost/billing review. No account identity, region or plan is assumed.
2. Approve the exact source revision/artifact for existing channel `founder-review`, intended reviewers, actual expiry/removal owner, failure/removal procedure and externally accessible-URL risk. Current source is not a recorded immutable release.
3. Explicitly authorize the **verification-only update** with PH-04/10/11/13/14 and noindex/incomplete notice retained, acknowledging the failing production checker and unverified hosting/notice facts. No repeat project creation/init is required. This exception is not permission to share as a completed public preview or to make unsupported privacy claims.
4. Assign the hosted-check reviewer, secure supporting-evidence location and operator follow-through for PH-10/11 and notice review. Confirm no known blocking reading/focus issue prevents the intended review. If real access restrictions are required, stop: a Firebase preview channel/noindex does not provide them.

**EXTERNAL PREVIEW READY (share-ready):** requires that separate authorization, actual setup/test deployment, recorded HTTPS/headers/cache/404/network/storage/font checks, accurate approved PH-10/11 disclosures and effective/review notice dates for the actual processing, no known blocking issue, and founder approval of exact scope/remaining draft limitations. PH-04 may remain explicitly draft. If dates are retained by a later explicit exception, the artifact remains a bounded verification preview, not this share-ready state. Do not invent facts to advance the state.

**PRODUCTION READY:** in addition to verified hosting, close PH-04/10/11/13/14 with actual facts/reviews/dates; finish package D manual accessibility/device/performance and state checks; confirm live correspondence/operating procedures, final content/accountability/source accuracy and audience-gap handling; approve canonical production origin/indexing and any later domain/DNS change independently; record clean reviewed Git revision, lockfile/tool versions, reproducible artifact, authorized deployer and rehearsed known-good rollback or first-release removal procedure; rerun all checks including a passing `release:check` only after later authorized marker/noindex changes; obtain explicit founder approval of the exact production release. Public launch, default Firebase live-channel deployment and domain connection are all prohibited now.

### Rename/decision-pass validation — 23 October 2026 (historical)

**LOCAL REVIEW READY** for the current artifact. **Not EXTERNAL PREVIEW READY** and no setup/upload/production deployment is authorized. Validated locally on 23 October 2026 with the session-local Node 24.22.0/npm 11.19.1 runtime and installed Chrome. Earlier results below describe the previous artifact, not this rename/decision pass.

| Command | Current rename/decision-pass result |
|---|---|
| `npm run check` | Passed: 14 files, zero errors/warnings/hints. |
| `npm run format:check` | Passed after applying the existing formatter to changed source/tooling. |
| `npm run build` | Passed: static landing, privacy and 404 templates; no client JavaScript output. |
| `npm run test:static` | Passed: all six tests, expanded for Meridian Station across all templates/title/masthead/metadata, no obsolete public name, exact final headline, approved operator/contact/privacy/status wording, exactly five remaining PH strings, resolved marker absence, one contextual exact mailto, no prohibited output/dependencies, P0-P9/U1 and source-policy safeguards. |
| `npm run test:browser` | Passed: all eight tests, updated name/headline/contact/remaining-PH checks plus unchanged normal/200% no-overflow/non-clipping safeguards at 320/390/768/1440px, no-script navigation, bounded axe/local-only requests and no cookies/local/session storage. Loopback preview used port 4322 and stopped afterward. |
| `npm run release:check` | Expected failure, exit 1: unresolved publication markers on `404.html`, `index.html` and `privacy\index.html`. The script was not changed. |

No unexpected command failures occurred. Approved policy text and original copy continuity were verified without weakening feature/network/no-script/reflow checks. Historical-copy comparisons normalize only the explicitly approved organization rename; current approved replacements have their own assertions. A separate temporary browser wrapping comparison is recorded above, not a changed regression assertion or claim of manual accessibility conformance.

## Historical readiness assessment — preserved, superseded

Everything below this divider records the prior all-20-open assessment. It is not the current registry, contact status, headline decision or deployment authority; use the current sections above and [PREVIEW_DEPLOYMENT_PLAN.md](PREVIEW_DEPLOYMENT_PLAN.md).

**Authority:** the founder approved the complete Phase 1 draft implementation for release-readiness work, not publication. No new product features, placeholder removal, mailto, Firebase connection/project configuration, external preview, production deployment, or domain connection is authorized by this document.

The founder is the final decision maker. Operator, correspondence, accessibility-review, and deployment responsibilities below are **roles to assign**, not people or organizations already appointed. Record public operational facts here when approved; keep credentials, private contact information, correspondence, and sensitive supporting records out of source control.

## 1. Evidence and current boundary

The implemented review artifact contains the complete P0-P9 landing narrative and U1 privacy structure, four primary links, seven secondary links, consecutive Evidence / Experience / Exploration modules, the first-initiative wording, a conditional future-work explanation, and an inactive contact sequence. Scientific source-policy/context copy is not a scientific bibliography. No reviewed scientific findings or citations have been invented.

The stack remains Astro 6 static output, TypeScript, plain CSS, local Source Serif 4 / Source Sans 3, and an unconnected Firebase Hosting configuration. The implementation has no client-side JavaScript, Firebase client SDK, backend, forms, accounts, analytics, tracking, cookies, AI/RAG, or health-data collection. This describes the site implementation, **not** unverified behavior of a future hosting or mail provider.

All PH-01 through PH-20 remain unresolved and unchanged in the implementation. An approved disposition can eventually close a gate without adding a feature: for example, omitting optional artwork or approving proposal-only future-work wording. No such closure is claimed here.

The visible incomplete-preview notice, noindex, crawler exclusion, and failing release check remain. Noindex and `robots.txt` are not access controls. Firebase preview channels are externally reachable deployments, not inherently private review environments.

### Repository hygiene

- Generated `.astro/`, `dist/`, `node_modules/`, `coverage/`, Firebase local output, Playwright reports/blob reports/cache, and `test-results/` are ignored. `.astro/` does **not** ignore `.astro` source templates.
- `*.[zZ][iI][pP]` ignores ZIP archives, including nested and mixed-case names. Generated review archives must not be committed.
- Ignore checks confirmed representative generated paths are excluded and governance/design documents, Astro source, local WOFF2 assets, and current/historical font licenses are not excluded.
- No tracked generated directories or ZIP archives were found. Ignore rules do not untrack existing files; repeat this check before staging a release revision.
- No governance/design sources, licenses, source assets, or generated directories were deleted. No staging or commit was performed by this readiness pass.

The historical scaffold plan and its validation record remain in IMPLEMENTATION_PLAN.md sections 1-14. Section 15 superseded the scaffold-only content boundary. Section 16 and subsequent founder decisions govern this readiness phase.

## 2. Exact unresolved-placeholder register

**Every row is OPEN.** The text below is the exact current registry text, not proposed replacement copy.

**Preview column:** "Yes" means the underlying fact/permission must be established for the applicable preview before any externally reachable upload; a post-upload delivery check can only be completed after a separately authorized test deployment. "No, if..." permits a deliberately incomplete review artifact only under the stated conditions and explicit founder approval of the retained markers. It does not authorize deployment now. Production requires every row to be resolved or explicitly dispositioned, with implementation and tests updated in a later authorized task.

**Affected-file key:** `R` means `src\content\site.ts`, `src\components\Placeholder.astro`, `tests\static.test.mjs`, and `tests\browser\scaffold.spec.ts`. Page/component names below are under `src\pages` or `src\components` as appropriate. All resolutions also update this register and their approval/evidence record; historical design specifications should not be silently rewritten as if the original placeholder never existed.

| ID | Current unresolved text | Why it exists | Information needed to resolve it | Decision owner | Blocks preview deployment? | Blocks public production deployment? | Files/components affected | Validation after resolution |
|---|---|---|---|---|---|---|---|---|
| PH-01 | [DEDICATED EMAIL ADDRESS — UNASSIGNED; MOCKUP CONTACT IS INACTIVE] | Prevents invented or unmonitored contact details and an apparent working email service. | Approved dedicated address; recipient authorization; monitored delivery and correction handling; agreement with U1 disclosures. | Founder; designate correspondence owner. | No, if contact stays visibly inactive, with no mailto or invented address. | Yes. | R; `index.astro` P7; `privacy.astro`; footer correction context. | Test actual send/receipt with nonsensitive test messages after separate authorization; verify warning → privacy → address → guidance order, narrow wrapping, and disclosure consistency before enabling contact. |
| PH-02 | [CONTACT ROLE AND RESPONSE EXPECTATION — FOUNDER APPROVAL PENDING] | Avoids implying clinical triage, guaranteed replies, or an assigned responder. | Public recipient role, realistic response expectation, escalation/absence handling, and no urgent/medical service wording. | Founder; designate correspondence owner. | No, if the channel remains inactive and no response is promised. | Yes. | R; `index.astro` P7; `privacy.astro`. | Review commitments with the actual recipient; verify guidance and U1 agree and do not imply emergency monitoring. |
| PH-03 | [PUBLICATION RESPONSIBILITY — APPROVED PUBLIC NAME OR ROLE PENDING] | Makes publication and correction responsibility accountable without inventing an identity. | Approved public publisher name/role, authority to publish, correction owner, and agreement with operator details. | Founder; designate publisher. | Yes: a responsible preview publisher must be assigned before upload. | Yes. | R; `SiteFooter.astro`; `privacy.astro`. | Check footer on all three templates; confirm correction destination and publisher/operator consistency. |
| PH-04 | [PUBLIC CONTENT REVIEW DATE — NOT YET SET] | Avoids presenting the historical prototype check as a current public content review. | Actual completed review, scope, reviewer, date, and approach to subsequent changes. | Founder; designate content reviewer/publisher. | No, if explicitly an unreviewed draft and its reviewed preview revision/date are separately recorded; do not invent a public review date. | Yes. | R; `SiteFooter.astro`; `index.astro` P6 context. | Confirm real review evidence and semantic date; keep the historical written-prototype date distinct. |
| PH-05 | [MATERIAL RELATIONSHIP DISCLOSURE — CONFIRM WHETHER APPLICABLE] | Avoids assuming either affiliations or independence. | Founder confirmation of relevant funding, commercial/personal interests, affiliations, or an accurate no-applicable-relationship disposition; permission for any named party. | Founder. | Yes: establish any disclosure required for externally shown content. | Yes, including an explicit not-applicable disposition if supported. | R; `SiteFooter.astro`; affected origin/work copy. | Compare wording with confirmed facts, links, names, and claims; do not infer a partnership from a reference. |
| PH-06 | [RESPONSIBLE OPERATOR IDENTITY AND REQUIRED CONTACT DETAILS — PENDING] | Privacy responsibility cannot be inferred from a repository or brand. | Actual responsible operator, applicable required public identity/contact details, preview responsibility, and jurisdictional assessment. | Founder; designate operator and obtain appropriate advice if needed. | Yes, for the actual preview operator and contact route. | Yes. | R; `privacy.astro` responsibility; `SiteFooter.astro`. | Verify approved public details and a usable privacy route; check consistency with publisher and hosting arrangements. |
| PH-07 | [AUTHORIZED EMAIL RECIPIENT OR ROLE — PENDING] | Prevents unauthorized inbox access and invented recipients. | Approved recipient(s)/role, access controls and delegation, and who may receive correspondence. | Founder; designate operator/correspondence owner. | No, if email stays inactive and preview feedback does not introduce an undisclosed collection channel. | Yes. | R; `privacy.astro` email; `index.astro` P7. | Verify actual access arrangements and public role wording; reconcile PH-01/02/09. Do not publish private recipient details unnecessarily. |
| PH-08 | [CONFIRMED CORRESPONDENCE PURPOSES — PENDING] | Avoids an open-ended or medical-data collection purpose. | Confirmed collaboration/correction purposes, use boundaries, and how out-of-scope submissions are handled. | Founder; designate operator/correspondence owner. | No, if email stays inactive; separately assess any preview-feedback mechanism. | Yes. | R; `privacy.astro` email; `index.astro` P7 guidance. | Compare purposes with actual workflow and warning; no new health-data collection, triage, or research recruitment by implication. |
| PH-09 | [MAIL SERVICE, RECIPIENTS, RELEVANT PROCESSING LOCATIONS, RETENTION, BACKUP AND DELETION LIMITS — PENDING] | Email is external processing even without a website form. | Chosen service/account configuration; recipients/processors and locations; retention periods/rationale; deletion, backups, and sensitive-submission handling limits. | Founder; designate operator/correspondence owner. | No, if no inbox is activated or advertised; any actual preview mail processing still needs disclosure. | Yes. | R; `privacy.astro` email; `index.astro` privacy explanation. | Check configuration and relevant service documentation/terms; approve realistic retention/deletion and accidental-submission procedures without claiming guaranteed erasure. |
| PH-10 | [ACTUAL DELIVERY/SECURITY LOG FIELDS, PURPOSES, RECIPIENTS, STORAGE/COOKIES AND RETENTION — PENDING] | Static/no-analytics code does not prove a host creates no logs or storage. | Actual Firebase project/service settings, request/security log fields, access, purposes, retention, storage/cookie behavior, and relevant delivery services. | Founder; designate operator and hosting reviewer. | Yes: delivery facts applicable to the preview must be established; verify responses after authorized upload before sharing. | Yes. | R; `privacy.astro` visiting; `firebase.json`; deployment evidence. | Review actual service settings/documentation and hosted requests/storage; verify headers. Configuration alone does not establish provider retention or all server-side processing. |
| PH-11 | [THIRD-PARTY AND APPLICABLE INTERNATIONAL-PROCESSING DISCLOSURES — PENDING] | Local fonts and absent APIs do not eliminate hosting/mail third parties. | Applicable hosting/mail service entities, processing locations/transfers, relevant safeguards and disclosures, with jurisdictional review where needed. | Founder; designate operator. | Yes for hosting and any actual preview processing; inactive future email may remain explicitly unresolved. | Yes. | R; `privacy.astro` visiting/email; relevant public notices. | Reconcile service arrangements and PH-09/10; verify no unexpected remote runtime resources and no unsupported legal assurances. |
| PH-12 | [REQUEST PROCESS, RESPONSE EXPECTATION, APPLICABLE RIGHTS/COMPLAINT ROUTE AND DELETION LIMITS — PENDING] | Avoids unsupported rights promises and unusable request/deletion routes. | Applicable rights/complaint route, monitored privacy contact, request verification/response procedure, deletion limits, and accidental sensitive-submission procedure. | Founder; designate operator and request handler. | Yes for actual preview processing; it needs a real route even while collaboration email is inactive. | Yes. | R; `privacy.astro` requests; contact/accountability context. | Exercise a nonsensitive request scenario; confirm realistic response/verification/deletion wording and no invented universal rights or total-erasure promise. |
| PH-13 | [PRIVACY NOTICE EFFECTIVE DATE — NOT YET SET] | Prevents a fabricated date or a draft being presented as effective. | Approval of the notice covering actual processing and its real effective date. | Founder; designated operator approves actual notice facts. | Yes for the notice applicable to the preview; do not substitute a build timestamp. | Yes. | R; `privacy.astro` dates. | Check approval evidence, machine-readable date, and consistency with first actual processing; reapprove any production-specific notice changes. |
| PH-14 | [PRIVACY NOTICE REVIEW DATE — NOT YET SET] | Distinguishes an actual privacy review from drafting/building the site. | Completed review, reviewer, reviewed settings/version, and actual review date. | Founder; designate operator/privacy reviewer. | Yes for preview-specific operational disclosures. | Yes. | R; `privacy.astro` dates. | Confirm review evidence and valid date; assess updates after service or operational changes. |
| PH-15 | [HEADLINE IS PROVISIONAL — FINAL COPY APPROVAL PENDING] | Retains the founder's working-copy decision and narrow/enlarged visual gate. | Final headline approval, with retained meaning and satisfactory 320px/200% reading. Current candidate: "Explore change: evidence, experience, new tools." | Founder. | No, if clearly identified as provisional review copy. | Yes. | R; `index.astro` P1; headline styles if later authorized. | Check 20-second comprehension goals, exact approved wording, normal/enlarged wrapping, real browser zoom and screen-reader heading output. No text shrinking to hide the issue. |
| PH-16 | [PUBLIC ORIGIN WORDING/PERMISSIONS — APPROVAL PENDING] | Internal permission to mention the founder and Rebar Foundry is not final public wording permission. | Approved concise third-person story and permission for public personal/organizational references; confirm factual sequence and no implied endorsement. | Founder; obtain any necessary third-party permission. | Yes: permission applies to externally reachable previews too, or separately authorize an appropriately redacted artifact. | Yes. | R; `index.astro` P5. | Compare with approved wording/permissions; preserve concise origin and non-biographical focus; inspect absence of invented relationship/medical claims. |
| PH-17 | [FUTURE SOFTWARE IMPLEMENTATION STATUS — UNVERIFIED; IDEAS ARE NOT AVAILABLE SERVICES] | Separates verified documentation/prototype work from proposed software/research/AI/data systems. | Founder approval of verified current-work description and proposal-only future wording, with evidence supporting any changed status. No future system needs to be built to close this gate. | Founder; designate content/status reviewer. | No, if documentation-only status and explicitly conditional ideas remain accurate. | Yes: confirm the published description, not future implementation. | R; `index.astro` P6. | Review each availability/status statement against evidence; retain historical prototype date context and all Phase 1 exclusions. |
| PH-18 | [FONT PAIR, EXACT FILES, LICENSING AND DELIVERY REVIEW — PENDING] | Visual direction approval is not exact-file/distribution/license verification. | Verification of the three bundled files, provenance and OFL obligations, license inclusion, supported text/weights, delivery and fallback behavior. | Founder; designate asset/license reviewer. | Yes: distribution rights and required notices must be verified before external distribution. | Yes. | R; `src\assets\fonts`; `public\licenses`; `SiteLayout.astro`; `src\styles\global.css`. | Compare actual file hashes/provenance and license texts; confirm local-only requests, intended weights, font failure fallback, payload, and no missing glyphs. Do not remove required licenses. |
| PH-19 | [PALETTE AND INTERACTION-STATE CONTRAST REVIEW — NOT YET COMPLETED] | Candidate tokens and bounded axe checks do not verify every state/background. | Recorded contrast/state review and any necessary approved fixes; manual focus, visited, forced-colors and high-contrast results. | Founder; designate accessibility/visual reviewer. | Conditional: no known blocking reading/focus defect; a limited accessibility-review preview may retain this gate with explicit disclosure and a usable review route. | Yes. | R; `src\styles\global.css`; layout/navigation/footer and review evidence. | Measure actual text/background pairs and all link/focus states; review 320px, 200% text, 400% zoom/reflow, keyboard and forced colors. Axe alone is insufficient. |
| PH-20 | [OPTIONAL ABSTRACT ILLUSTRATION — ARTWORK AND RIGHTS REVIEW PENDING] | Prevents unapproved artwork or an implication of real sensor/medical data. Artwork is currently omitted. | Explicit approval to omit permanently, or approved local decorative wide-desktop artwork, provenance/rights, and accessibility treatment. | Founder; asset reviewer only if art is proposed. | No, while illustration is omitted and that omission is disclosed in the review. | Yes: close through approved omission or verified artwork; art is not required. | R; `index.astro` review area; local art/styles only if separately approved. | For omission, verify no image/request was introduced. For artwork, verify rights, decorative semantics, wide-only display, no medical-data resemblance, and no new remote request. |

## 3. Release work packages and founder decisions

No checklist item below is marked complete merely because a placeholder or configuration file exists. Reviewer assignments, public wording, and deployment permissions require founder decisions; reviewers then supply evidence.

### A. CONTENT

1. **Final headline:** approve the current candidate or replacement; retain provisional status until review. Enlarged narrow-screen within-word breaks remain a reading-quality issue despite no horizontal overflow.
2. **Origin:** approve exact concise third-person wording and public permissions, including Rebar Foundry. An external preview also needs permission; do not silently redact or rewrite the approved draft now.
3. **Current work:** approve the distinction between documentation/internal prototype and conditional ideas. The historical 18 October 2026 written-prototype check is not a new software/public-content review date. Do not imply operating research, AI, or private-data services.
4. **Publication responsibility:** assign and approve the public publisher role/name, content/correction owner, real review date and review cadence. Agree how audience-review feedback and corrections will be evaluated; no audience results are claimed.
5. **Material relationships:** confirm applicable relationships and wording, or a supported not-applicable disposition. A name in the origin story is not a partner claim.
6. Keep source-policy-only P8 without a bibliography unless a real reviewed scientific claim is separately authorized. Any later finding needs provenance, claim-level citation, evidence limitations and review; experience and experimentation must not be promoted to scientific/clinical authority.

### B. CONTACT

1. Approve a dedicated project address and authorize actual recipient/access arrangements, monitoring/absence coverage, collaboration/correction purposes, and realistic response expectations.
2. Approve a usable correction route and ensure publisher/correspondence responsibilities agree. Decide a separate real privacy-request route if the collaboration inbox is still inactive during an eventual preview.
3. Confirm the exact warning → privacy → email → guidance → contact-role sequence and nonclinical/urgent-use boundaries. Preserve the warning and privacy explanation at body size.
4. Only a later authorized task may replace PH-01/02, validate a nonsensitive send/receipt, and enable mailto. Do not publish a working contact address before relevant privacy disclosures and handling procedures are approved.

### C. PRIVACY / OPERATIONS

1. Identify the responsible operator, approved public contact details, applicable jurisdiction/rights/complaint route, and who reviews legal uncertainty. Do not assume operator identity from GitHub ownership.
2. Confirm actual mail provider, account settings, recipients/access, processing locations and correspondence purposes. Establish retention for inbox, sent/archive and backups, deletion limits, and realistic request-response handling.
3. Establish a procedure for accidental sensitive submissions: restrict access, avoid unnecessary copying/forwarding or medical interpretation, determine safe handling/deletion and backup limitations, and assign incident responsibility. Do not promise that senders can never submit such information or that every copy can be erased.
4. Verify actual hosting/request/security logs, fields, access, purposes, retention, delivery processors, storage/cookie behavior, and applicable international processing. Static code without cookies is evidence about the app, not proof of zero provider processing.
5. Approve actual public privacy wording and effective/review dates for each externally delivered artifact. The preview notice must describe preview processing; update/review it again if production differs. Use real approval dates, not build timestamps.
6. Keep public research information and any future private personal information architecturally separate. This phase must not add private-data stores, collection workflows, consent forms, AI interpretation or medical services as a way to "resolve" an operations gate.

### D. DESIGN / ACCESSIBILITY

Assign reviewers and record the artifact/revision, browser/OS/device, settings, tasks, results, defects and retest evidence. No manual review below has been claimed complete.

| Review | Existing limited evidence | Required release evidence / decision |
|---|---|---|
| Exact font files/licenses | Three local official WOFF2 files, provenance and license sources are bundled; prior hashes are recorded in project provenance. | Verify exact distributed files/notices, rights, correct weights/glyphs, font-disabled fallback and payload. Approve delivery. Keep current and historical required licenses. |
| Palette/interaction contrast | Candidate tokens and bounded axe checks. | Measure rendered ordinary/small text at least 4.5:1, large text at least 3:1, relevant controls/focus boundaries at least 3:1 against adjacent colors; check hover, active, visited, focus, warning and review backgrounds. Verify focus visibility/obscuring and non-color cues manually. |
| Headline at 320px and 200% text | Automated no-overflow and actual computed enlargement assertions; emergency word breaks remain. | Approve reading quality without shrinking enlarged text or changing the headline without permission. Recheck body, warning, privacy and navigation, not only h1. |
| Keyboard | Automated skip-link, navigation targets and recovery checks. | Tab/Shift-Tab through every route/anchor, skip link and footer; verify logical order, clear focus, no traps, visible destinations, no obscured focus. |
| Screen reader | Semantic headings/landmarks and bounded automated checks. | Named reviewer records actual assistive technology/browser combinations, landmarks, heading order, navigation, placeholder announcement and privacy/correction journeys; no conformance assertion from automation. |
| Text spacing | Not established by normal/200% font-size stress. | Test at least line height 1.5 times font size, paragraph spacing 2 times, letter spacing 0.12 times and word spacing 0.16 times, without content/function loss. Document any issue and retest. |
| Browser zoom/reflow | Automated 320/390/768/1440px layouts and doubled root text. | Manual browser zoom through 200% and reflow at 400%/320 CSS-pixel-equivalent width; check horizontal scrolling, reading order, focus, anchors and non-clipping on landing/privacy/404. Text-size emulation is not browser zoom. |
| Forced colors/high contrast | No manual result. | Test actual forced-colors/high-contrast modes, links, focus, borders, warning and review distinctions; no reliance on background color alone. |
| Real mobile devices | Chromium viewport emulation only. | Agree coverage and review actual devices, including relevant iOS/Safari and Android browser behavior, text scaling, font loading, touch targets and long contact/privacy text. |
| Performance and broader browsers | Static output/local assets; no agreed measured performance result. | Approve target browser/device/network coverage and budgets; measure actual fonts, stylesheet/page transfer, loading and layout stability on the candidate artifact. Record results; do not claim Lighthouse/Core Web Vitals success without measurement. |
| Optional artwork | No illustration or photography implemented. | Approve omission, or separately approve rights-safe decorative local wide-only art and recheck semantics/delivery. Do not add it during this readiness pass. |

#### Global wrapping review and narrower recommendation

`src\styles\global.css` currently sets `overflow-wrap: anywhere` on `body`; it is inherited by ordinary prose/headings as well as placeholders/navigation. With normal word breaking, `anywhere` does **not** randomly split every word: normal break opportunities are preferred, and an otherwise unbreakable token may break to avoid overflow. Unlike `break-word`, those emergency opportunities also affect min-content sizing.

The scope is nevertheless broader than necessary. A recommended bounded follow-up is:

1. Default ordinary prose and headings to normal word breaking with normal overflow wrapping. Do not use `word-break: break-all`, aggressive automatic hyphenation without language/browser review, clipped overflow, fixed heights, or font reductions.
2. Apply `overflow-wrap: anywhere` specifically to `.placeholder` and deliberate future address/URL/citation-link elements containing long unbroken tokens. Do not apply it indiscriminately to every paragraph or link. Address/URL classes are a proposed strategy, not currently enabled email or bibliography features.
3. Retain an explicit emergency fallback for proven constrained long headings (including the working headline), navigation items and review notices wherever 320px/enlarged text cannot fit a whole word. `overflow-wrap: break-word` may suffice for ordinary block emergency handling; flex items may also need deliberate zero minimum inline size or scoped `anywhere` because intrinsic sizing differs. Select the smallest demonstrated scope rather than assuming the headline is the only risk.
4. Keep all existing no-overflow, non-clipping and true font-enlargement assertions unchanged. Add specimens for long actual placeholders, eventual address/URL tokens, multiword prose, nav labels and headings at 320/390/768/1440px and 200% text. Review natural line breaks and readable word divisions as well as document width. Include the manual text-spacing/zoom/device checks above.

**This pass makes no CSS change.** Normal wrapping alone is not yet demonstrated to preserve every constrained/enlarged case, and the current headline still requires emergency word breaks. Removing protection solely for a tidier rule would be premature. The recommended scoped implementation requires its own successful comparison with unchanged safeguards; no new headline, font reduction or hidden overflow is approved as a shortcut.

### E. HOSTING / DEPLOYMENT

All items below are outstanding; existing `firebase.json` is configuration intent, not deployed-service evidence.

| Item | Founder decision / evidence needed |
|---|---|
| Firebase identity and authority | Approve actual project/account ownership, permitted deployer and access. No project ID, `.firebaserc`, credentials or Firebase connection has been created by this phase. Do not put credentials into the repository. |
| Preview channel | Approve whether an external draft preview is permissible, intended reviewers, channel, lifetime/expiry/removal, discoverability/redistribution risk and retained PH list. If actual restricted access is required, do not call noindex or a Firebase channel private. No access-control feature is authorized here. |
| HTTPS and security headers | After separately authorized test upload, verify actual HTTPS and CSP, no-sniff, referrer and permissions headers on landing/privacy/404 and assets, including error behavior. Current CSP forbids scripts, connections, forms and framing. Check effective policy, not only JSON. Do not add unreviewed headers or assert actual protection from local Astro preview. |
| Cache behavior | Verify HTML/404 revalidation and fingerprinted `/_astro/` immutable asset policy on the host, new-release loading, rollback and removal/expiry behavior. Confirm stale pages are not paired with missing assets. No service worker is present. |
| 404 behavior | Verify an unknown hosted URL returns actual HTTP 404 with the static recovery page and usable links; no SPA fallback or soft-404 rewrite. Verify privacy-route trailing-slash behavior. |
| Canonical production URL | Approve the exact production origin/domain and ownership before configuring canonical/indexing policy. No canonical URL or production domain is invented or connected here. Review privacy/metadata/security implications of the real origin. |
| Rollback | Assign decision maker/deployer, stop/rollback triggers, known-good release/artifact or initial-release offline/removal procedure, and post-recovery checks. Rehearse through an authorized test environment before production. A first release has no assumed earlier good release; static rollback cannot undo email processing or access already made. |
| Release Git revision | Choose and review an immutable source revision, committed lockfile, tool versions, clean release worktree and exact built artifact. Local untracked work is not a named release. Exclude generated files/review ZIPs; preserve source/fonts/licenses. Record authorizations and prior/candidate deployment identifiers only when real. |

Before a later deployment, re-run the agreed checks from the exact chosen revision and review actual `dist` contents. No deployment command or workflow is added here. Do not connect the production domain as part of a preview.

## 4. Three distinct readiness states

Readiness is evidence-based and artifact-specific, not a substitute for founder authorization.

### 1. LOCAL REVIEW READY

All of the following must be true:

1. The complete approved draft and U1 structure build as static files and are reviewable through loopback-only local tooling. No prohibited feature, collection, external runtime request or active contact route is introduced.
2. Type/check, formatting, build, static tests and browser tests pass for the current source. The unchanged browser tests cover four requested widths and doubled text, without clipped content or font shrinking.
3. PH-01 through PH-20, incomplete notice and crawling restrictions remain visible/active as appropriate. `release:check` fails with the expected unresolved-publication diagnostics, not a missing-build or script error.
4. Sources/assets/licenses are preserved, generated output and ZIP archives are ignored, and no generated artifacts are tracked/staged for release. Uncommitted source is permissible for local review, not an immutable production release.
5. Open copy/operations/manual-review questions are honestly documented. No audience, accessibility conformance, hosting privacy, performance or publication approval is falsely claimed.

This state permits local founder/reviewer inspection only. It does not require unknown production facts to be invented or resolved.

### 2. EXTERNAL PREVIEW READY

An externally shareable draft must meet the local conditions plus all of these:

1. **Before first upload:** explicit founder authorization for an externally reachable preview; assigned publisher/operator/deployer; approved actual preview privacy/contact facts; permission for all externally shown origin/relationship references; verified redistribution rights/licenses; no known blocking accessibility defect; approved retained-marker list, reviewer scope and lifetime/removal plan.
2. The exact preview artifact and source revision are recorded. Any retained contact placeholder is visibly inactive; no undisclosed collection workflow is introduced for feedback. Preview-specific operator, delivery/processing, request route and notice dates must be established rather than hidden behind draft markers. The PH table distinguishes inactive future-email facts from real preview hosting facts.
3. **After the separately authorized test upload, before sharing:** verify real HTTPS, headers/CSP, cookies/storage/runtime requests, cache, routing/404, asset/font delivery, privacy notice and removal/expiry behavior. Record evidence. If a check fails, withhold the link and follow the approved correction/removal process.
4. The founder accepts the recorded bounded review limitations and retained PH markers for this exact artifact. A draft can intentionally fail the production `release:check`; any future preview authorization must explicitly acknowledge that result. Do not weaken the production checker or treat failure as blanket permission to deploy.

These stages avoid a circular requirement: hosted responses cannot be verified locally before an initial upload. Preflight approval authorizes a later bounded test deployment only; the artifact is **not EXTERNAL PREVIEW READY for sharing** until hosted checks succeed. No upload is authorized now. If actual access restrictions are required but unavailable within the authorized stack/scope, stop and return that decision to the founder.

### 3. PRODUCTION READY

All of the following must be true:

1. Every PH gate is supported by a founder-approved factual resolution or explicit disposition, and a later authorized implementation replaces/removes its review marker appropriately. No invented email, identity, relationship, status, citation, operational promise or date; PH-20 may close by approved omission.
2. Final copy, publisher, origin permissions, current status, source policy, monitored collaboration/correction contact, and actual privacy/processing/rights/retention/incident arrangements agree across all templates and real services.
3. Manual accessibility, text-spacing, real zoom/reflow, screen-reader, keyboard, forced-colors and agreed browser/device reviews are recorded; blocking issues are fixed and retested. Final exact fonts/licenses, palette/states, 320px/200% reading, and measured performance against agreed budgets are approved.
4. The exact production origin, Firebase project, deployer, headers, cache, routing/404 and actual operational processing are verified using an appropriately authorized rehearsal/preview. Production-specific differences have an explicit verification and stop/rollback plan.
5. A clean reviewed Git revision, reproducible artifact/lockfile, release record, responsible publisher/deployer, and rehearsed rollback/initial-release recovery procedure are recorded. Changes since preview trigger appropriate reruns/review.
6. All required technical checks pass, including `release:check` after explicitly authorized marker/noindex changes. Passing this narrow marker check alone never proves privacy/legal compliance, accessibility, content accuracy or release permission.
7. The founder explicitly authorizes the exact production release. Publication/indexing changes and domain connection occur only in that separately authorized release task, with post-deployment smoke tests and recovery ownership.

**Current state: LOCAL REVIEW READY**, supported by the current-pass results below. External preview and production are not ready or authorized. No Firebase identity, actual hosted responses, canonical URL, final operating facts, manual-review completion or release revision is claimed.

## 5. Validation record for this readiness pass

The historical scaffold/content records remain unchanged in IMPLEMENTATION_PLAN.md. This record applies to the current readiness edits, not those earlier phases.

| Command | Current-pass result |
|---|---|
| `npm run check` | Passed: 14 files, zero errors, warnings or hints. |
| `npm run format:check` | Passed after formatting the browser-runner change. Governance/design documents remain excluded from automatic formatting. |
| `npm run build` | Passed: static landing, privacy and 404 pages generated. |
| `npm run test:static` | Passed: all six tests, including exact PH strings, content/order, U1, output boundaries and static Hosting configuration. |
| `npm run test:browser` | Passed: all eight tests on an isolated loopback preview at port 4322, including bounded axe/local-resource checks, no-script navigation, content/contact/privacy order, and unchanged 320/390/768/1440px normal/200% text safeguards. |
| `npm run release:check` | Expected failure, exit 1: `404.html`, `index.html` and `privacy\index.html` contain unresolved publication markers. No missing-build/tooling failure. |

No product code, CSS or test assertions have been changed in this readiness pass. The browser runner now accepts a validated `PLAYWRIGHT_PREVIEW_PORT` so an occupied default port can be avoided without stopping another process or reusing its server. Its address stays loopback-only and `reuseExistingServer` remains false. Existing automated checks remain bounded evidence, not the manual/operational reviews in packages C-E.

Initial browser attempts failed because another process occupied port 4321; that process was left untouched. The first formatting check after adding the port setting identified a formatting issue in `playwright.config.ts`; the existing formatter corrected it. The subsequent complete six-command run produced the results above, using the session-local Node 24.22.0/npm 11.19.1 runtime and installed Chrome. No package installation or public service was needed.
