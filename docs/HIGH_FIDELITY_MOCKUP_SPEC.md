# High-Fidelity Mockup Specification

> Historical mockup specification for the project now named **Meridian Station**.
> The founder-directed 29 October 2026 Ride-derived visual redesign supersedes
> Fieldnotes typography, palette, narrow-spine and anti-card presentation choices.
> Current visual source/treatment evidence is in implementation-plan section 19;
> these historical mockups are not screenshots of the current implementation.
> The original 20-slot registry below is preserved for artifact provenance, not the
> current implementation contract. Only PH-04, PH-10, PH-11, PH-13 and PH-14 remain
> unresolved. Current founder decisions are in [RELEASE_READINESS.md](RELEASE_READINESS.md).

**Project:** The Emergent Collaborative  
**Date:** 2026-10-18  
**Direction:** Fieldnotes Laboratory  
**Status:** Proposed specification for a future nonfunctional visual mockup; no rendered mockup or implementation is claimed  
**Decision authority:** Founder  
**Shared values:** [Design Tokens Draft](DESIGN_TOKENS_DRAFT.md)

## 1. Basis, scope, and authority

This specification follows [AGENTS.md](../AGENTS.md), [GENESIS.md](GENESIS.md), the approved [Founding Product Brief](FOUNDING_PRODUCT_BRIEF.md), [Website Product Requirements](WEBSITE_PRODUCT_REQUIREMENTS.md), [Site Information Architecture](SITE_INFORMATION_ARCHITECTURE.md), [Low-Fidelity Content Prototype](LOW_FIDELITY_CONTENT_PROTOTYPE.md), and [Visual Design Direction](VISUAL_DESIGN_DIRECTION.md).

The founder has approved Concept A and its principal visual decisions. Preserve the approved P1-P9 order, four primary navigation links, secondary section map, third-person origin, documentation-only current work, separate privacy utility destination, and warning → privacy → email sequence.

The objective is a specific, reviewable visual composition, not the appearance of a functioning platform. This assignment creates specifications and draft tokens only. It does not create a logo, custom wordmark, site code, rendered design asset, or implementation plan, and does not select a frontend framework, hosting platform, CMS, database, or AI platform.

Use the prototype's visitor-facing copy as the content baseline, not its editorial review-note lists. Omit the optional Parkinson's variability sentence and SOURCE-PD-01 entirely from the first concept. P8 remains a concise source-standards explanation without an invented bibliography.

The exact headline remains provisional:

> Exploring change through evidence, experience, and emerging technology.

## 2. Mockup package to be produced in a later authorized step

This specification defines the following nonfunctional review views:

| View | Content and purpose |
|---|---|
| Desktop landing page, width 1,440 | Complete P0-P9 composition, not just a polished opening. Include the optional art in a subordinate margin. |
| Mobile landing page, width 390 | Complete reading flow, wrapped navigation, stacked actions, no decorative illustration. |
| Narrow landing-page review, width 320 | All sections, especially long headline, concept names, status, warning, and address placeholder. |
| Intermediate composition, width 768 | Check transition to a single-column masthead and constrained reading spine. |
| Desktop and mobile U1 privacy views | Complete utility-page hierarchy with unresolved processing fields visible. |
| State sheet | Text links, action-shaped links, navigation, focus, hover, pressed, visited, and combined states. Mark these as state specimens, not working operations. |
| Text-enlargement review | Representative P0/P1, P6/P7, P9/U1 frames at 200% text size; retain content and control labels. |
| Content-stress specimens | A long source title/return link, long non-address placeholder, wrapped status label, and longer provisional headline variant. Label invented stress text as a specimen, not a source or factual claim. |

All frames carry a review caption outside the page canvas: **"NONFUNCTIONAL DESIGN MOCKUP — unresolved content marked; no audience or accessibility results claimed."**

No fixed page height is prescribed. Do not truncate the full narrative to make an artboard convenient. A review view is not a claim that its behavior has been demonstrated in a browser or assistive technology.

## 3. Desktop composition and page/content widths

At 1,440, center a maximum 1,120-pixel page envelope, leaving 160-pixel outer margins. The main reading spine starts at the envelope's leading edge and is capped at 704 pixels or an approximately 68-character measure, whichever produces the narrower practical paragraph width.

Maintain that left edge through P1-P9. The optional illustration occupies only surplus space to the right of P1, separated from text by at least 64 pixels and capped at 288 pixels wide. It must not narrow the definition, push the medical boundary downward, or overlap a line of text.

The masthead may span the envelope, but narrative paragraphs do not stretch across it. P7's pale surface band may span the envelope while its text remains aligned with the reading spine. Avoid large nested containers.

At widths below 1,200, omit the illustration rather than squeezing text and art into competing columns. At intermediate widths, the envelope follows available space after insets; the prose cap remains a maximum, not a minimum. Very wide screens add outside space, not longer paragraphs or a second essential information stream.

Use the width, inset, and section-spacing roles in DESIGN_TOKENS_DRAFT.md as the shared baseline. Its design bands are starting review anchors; actual content fit and user text preferences take precedence.

## 4. Mobile composition and responsive rules

At 390, use 24-pixel outside insets, leaving 342 pixels for content. At 320, use 16-pixel insets, leaving 288 pixels. No essential text is hidden or abbreviated on mobile.

Keep all content in one column in the same sequence as desktop. Section headings, concept modules, status/limitation/date groups, contribution examples, warning, privacy, email, source explanation, and footer facts stack naturally.

| Available space | Composition response |
|---|---|
| Wide, approximately 1,200+ | Optional P1 art may appear; masthead can share a row if identity and links fit with spacing. |
| Intermediate, approximately 768-1,199 | No art. Masthead may stack early based on text fit. Reading spine remains capped, with normal outer insets. |
| Compact, below 768 | Identity then navigation; section map and hero actions stack. Body text remains 18 at the default viewing scale. |
| Narrow, below 360 | Reduce page inset to 16 and section gap to 40; keep text sizes and full warning. Remove no essential information. |

These are not instructions to implement a particular breakpoint system. If enlarged text causes overflow, stack sooner and remove decoration without reducing the user's text size.

No sticky header, floating bottom contact action, hamburger dependency, horizontal card scrolling, tabs, accordion-only content, or viewport-height section is introduced.

## 5. Masthead, navigation, and section map

### P0 masthead

Use the ordinary text identity **The Emergent Collaborative** in the body sans, semibold, at 22 / 28. No emblem, monogram, custom lettering, seal, or organization badge.

At a wide composition, place it at the left of the envelope with the four links to the right when all fit comfortably:

**Our approach · Parkinson's initiative · Current work · Collaborate**

The separators are a reading aid, not tiny interactive targets. Keep targets distinct, approximately 44 pixels high where feasible, with at least 8 pixels of clear separation between target rectangles. All labels are readable 16 / 24 and visibly link-like.

If the row does not fit, place navigation below the identity without shrinking type. On mobile it may wrap into two or more rows; at 320 or enlarged text, one link per row is acceptable. Avoid cramped centered rows.

Place a visible-on-focus **Skip to main content** specimen before repeated navigation. It must have room for its full focus treatment; no actual shortcut operation is simulated in the static mockup.

### Secondary section map

After the complete introduction and action group, show **On this page** at metadata size with the seven approved descriptive section links. It is a secondary navigation region, not part of the main headline.

On desktop use a compact wrapping arrangement; on mobile use a readable vertical list. Do not render literal P-identifiers as public labels. There is no need for an active-scroll indicator; visited navigation is not a progress tracker.

Collaborate and introduction actions target P7's heading and warning/contact context, never the address directly. Source and section destinations need visible target headings and a sensible focus/return approach in the later implementation specification.

## 6. Hero/intro and P1-P9 treatments

### P1. Introduction

Use this visual sequence with the prototype copy:

1. **Early-stage initiative**, sans semibold at 16 / 25, primary or secondary text; not an approval badge.
2. Exact working headline, serif, using type.title.
3. Short defining paragraph, sans at 18 / 29.
4. **Parkinson's: our first initiative.**, semibold sans at body size.
5. Full non-clinical statement, also 18 / 29, primary text.
6. Primary **Explore ways to contribute** section link and secondary **Read about our approach** link.
7. Secondary section map.

Use 64 pixels of top introduction space on wide screens, 48 at intermediate, and 40 on compact screens. Maintain approximately 16 pixels between related text groups rather than detaching the boundary from the definition.

The primary section link may use a modest teal action shape, with 4-pixel corner rounding and warm-white text. Its role remains navigation, not signup. Secondary reading action remains an underlined text link.

No full-screen hero, fixed height, forced line breaks, type shrink-to-fit, or floating medical disclaimer. On mobile omit decorative art; do not place it between facts. If the opening extends beyond one small screen, preserve readability and sequence rather than compressing it.

### P2. Why look at change over time?

Use a 32 / 40 wide or 28 / 36 compact serif section heading and ordinary body paragraphs. Keep the definition of longitudinal in the text, using short semibold emphasis rather than a detached glossary card.

No timeline, chart, measurement device, or hypothetical medical result. A restrained decorative divider may help mark the transition to P3; it communicates no scientific meaning.

### P3. Evidence. Experience. Exploration.

Place the section heading above three vertically ordered modules, not three product cards. Each module has the same 24 / 32 wide or 22 / 30 compact serif subheading, a sans question line, body explanation, and visible limiting statement.

Use a 32-pixel inter-module gap. A repeated neutral rule or modest indentation may establish rhythm, but not different proof colors, grading icons, or a pipeline. Equal legibility is not a claim of equal scientific authority.

No collapsed limitations, "Evidence approved" stamp, Experience-to-Evidence arrows, or clickable concept panels that imply separate applications.

### P4. Parkinson's: our first initiative

Keep the exact first-initiative heading and discovery-stage explanation. Frame the core question through 20 / 30 sans semibold text and a short functional leading rule if needed, not quotation styling that suggests a published expert.

Use the page surface; a small earth-accent rule can add reflective emphasis if its meaningful use meets contrast requirements. Do not use a hospital-style blue feature panel or disease ribbon.

The broader organizational intent and no-enrollment/no-health-records boundary remain normal readable text. Omit the optional variability sentence and associated source entry.

### P5. How the question began

Set the concise third-person origin as uninterrupted prose with the standard reading measure. Rebar Foundry can appear in internal copy without a corporate logo or affiliation panel.

Do not add a large portrait, cycling hero, resume timeline, dates/distances not in approved copy, or a founder signature treatment. An adjacent review note marks public narrative approval as pending; that note is not another paragraph in the intended website narrative.

### P6. What exists today

Use one factual work-note treatment:

**Website content and structure**  
**Status: Prototype — internal written draft**  
Scope and limitations in body text.  
Documentation status checked: **18 October 2026**.

The date is the documentation fact recorded in the prototype, not a fresh claim that future software has been checked. Preserve this distinction in a review note.

Place status below the item heading so it wraps predictably. Use a small neutral surfaced/outlined label at 16 / 25 with 4 vertical and 8 horizontal padding, no fixed height, and no hover behavior. Status is not a control.

Show **Possible later directions** as a separate subordinate heading with **Status: Idea**. Keep conditional copy normal-sized; subordinate means hierarchy, not faint text. No roadmap card grid, app art, download action, completion percentage, or simulated operational state.

The P6 action **Help shape the next step** is an underlined section link to P7.

### P7. Help shape the next questions

Use a pale mineral band across the page envelope; keep text on the same spine. Provide a 32-pixel vertical band inset on wide screens and 24 on compact screens without doubling the outer section gap.

After the short invitation and contribution list, set a **Before you email** subheading and a white inset warning with a 3-pixel neutral leading boundary. Use 24-pixel internal padding on wider screens and 16 on compact ones. Do not add a second nested horizontal wrapper around all P7 copy.

Keep the full health-information warning, no-urgent-support language, and no-enrollment/publication explanation at body size. Use semibold on the short prohibitions, not the entire section.

Next show the email-handling caveat and **Privacy and contact information** as an underlined link. Only then show **Email about the project**, the unresolved address slot, and the proposed email action.

Because no address is confirmed, the main frame shows a labeled **nonfunctional email-action placement**, not a filled live-looking email control. The resolved-action appearance is shown separately in the state sheet with the caption "Design specimen only; no address or delivery." Keep the actual placeholder text from section 13 visible in P7.

When the real address is approved later, it must be selectable/copyable sans text, not an image or truncation. Future wrapping must not insert spaces, hyphens, or altered characters into a copied address. There is no form, attachment control, sent-success message, email verification badge, or delivery simulation.

Recipient/response expectations stay visibly unresolved until confirmed. No urgency cue, enrollment CTA, or privacy padlock icon.

### P8. Sources and context

For this first concept, use the prototype's two short source-standards paragraphs. Remove the generic source-entry placeholder from the intended page canvas because there is no retained scientific finding requiring a bibliography. Mark "No scientific source entries in this concept" in a visible review annotation, not as a scientific claim on the page.

A separate source-style specimen may demonstrate a descriptive title link, source metadata, relevant limitation, and return-to-claim link, but it must use explicit specimen text, not a made-up paper, DOI, author, result, or clinical claim.

Use 18 / 29 for a source title/claim-context line and 16 / 25 for metadata. No superscript-only targets, rating badges, authority seals, search field, or hover-only previews.

### P9. Responsibility and corrections

Use a modest divider and a compact serif or semibold sans heading, followed by body/metadata text that remains readable. Publication responsibility and last-reviewed date placeholders stay visible.

Keep the correction route and privacy link underlined at comfortable sizes. They route through P7 or U1 as defined in the IA. Stack facts and links on mobile rather than squeezing them into columns.

No institutional seal strip, guessed legal entity, invented board/team, partner logos, scientific-review badge, or unverified "no conflicts" claim. Material relationship disclosure remains unresolved.

## 7. Typography hierarchy and font candidates

The token draft defines the numerical scale. Use serif headings for P1, section headings, and concept/item subheadings; use humanist sans for definition, explanations, questions, navigation, actions, labels, sources, email, and notices.

Heading character must be sturdy, open, contemporary, and calm: no hairline display cuts, pseudo-academic masthead, decorative swashes, handwriting, or all-capital technical typography. Body character needs clear counters and distinguishable forms in words, email addresses, dates, and source metadata.

### Candidate pair directions

These are named visual candidates, not installed dependencies, final selections, or claims that licensing/delivery has been verified.

| Candidate pair | Why consider it | Risk and review emphasis |
|---|---|---|
| **Source Serif 4 + Source Sans 3** | Recommended first comparison: complementary editorial and humanist character with a restrained research tone. | Can feel generic if hierarchy is weak; inspect the actual heading cut and word shapes at mobile sizes. |
| **Literata + Source Sans 3** | Stronger reading/publication character while retaining an approachable sans body. | Can feel too bookish or formal; avoid literary cover-like oversized headings. |
| **Noto Serif + Noto Sans** | A sober, utilitarian comparison with potential relevance if language coverage later expands. | May feel less distinctive; language coverage and asset cost must be checked rather than assumed. |

Compare all pairs using the exact headline, Evidence/Experience/Exploration, the origin paragraph, wrapped status, long source text, and email placeholder. Do not choose from a font name or a single attractive word.

Verify exact font files, licensing, available weights, permitted local delivery, language needs, loading/fallback effects, and asset budget before implementation selection. Do not select a remote font platform. A fallback-specimen view should use ordinary serif/sans substitutes to expose whether layout depends on precise metrics.

## 8. Candidate palette and interaction states

Use the semantic roles from the token draft. The key palette is warm paper `#F7F5EF`, pale mineral `#ECEFEA`, charcoal `#222A2B`, secondary slate `#4C5B5C`, and deep teal `#185D62`, with restrained earth `#854B37`.

The state colors below are proposed, not contrast-certified:

| Element/state | Visual treatment |
|---|---|
| Prose/source/privacy/navigation link, default | Deep teal `#185D62`, visible underline, full readable label. |
| Hover | Dark teal `#11474B`, slightly stronger underline; no text movement or scale effect. |
| Pressed | Dark teal `#0D3C40`; preserve underline and label. |
| Visited prose/source/utility link | Muted plum `#674B70`, still underlined; visiting is not completion or verification. |
| Section navigation or action-shaped link, visited | Preserve its ordinary appearance; no progress/checkmark or maturity signal. |
| Primary section-action shape | Deep teal fill, warm-white `#FFFDFC` label, modest 4-pixel rounding; hover/pressed use their teal variants. |
| Focus on a light surface | Immediate 3-pixel earth outline with 3-pixel clear offset; retain link underline. |
| Focus on a dark action | Visible 3-pixel warm-paper separating band and 3-pixel outer earth ring, with no clipping. |
| Focus + hover / focus + visited | Keep the complete focus geometry plus the relevant link state; focus must not be replaced by hover color. |
| Neutral status | Primary text on pale mineral, functional slate boundary `#677574`; no traffic-light coding. |
| Mockup-only unresolved content | Warm review surface `#F2EADF`, explicit "Unresolved" text and earth boundary/text; not an error or clinical warning. |

Keep internal navigation and external-source destinations clearly named. Do not open a new tab by default merely to demonstrate a source. No interaction result depends on visited styling, which is orientation only.

A focus outline must have enough surrounding space on wrapped links, full-width actions, and panel edges. Draw the first focus state, a wrapped-navigation focus state, a privacy-link state, and a source-return state explicitly.

No decorative animation. State changes can be immediate; do not require a transition to make the mockup feel finished. Reduced-motion and forced-colors needs remain part of the later behavior specification.

## 9. Illustration placement and constraints

Show at most one abstract trajectory/contour illustration to the right of P1 at wide widths, maximum 288 pixels wide and approximately 220 pixels high. It is optional: a no-art version must preserve the composition.

Use a few static, separate paths and a restrained earth detail on the neutral surface. No axes, units, timestamps, actual coordinates, anatomy, sensor waves, convergent "answer" node, numerical readout, or data label.

Do not draw Evidence/Experience/Exploration into a processing pipeline or merge public research and private personal records. Do not reuse a franchise motif or create an emblem from the illustration.

The illustration is decorative and contributes no essential meaning. Omit it on compact/intermediate views and when text growth reduces the free margin. Do not move it into the middle of the introduction on mobile.

No photography is required. No stock doctors, glowing AI brains, app screenshots, medical charts, identifiable ride route, or health-data imagery may fill empty space. Provenance/rights review for any new asset remains explicit even when it is abstract.

## 10. Privacy utility page U1

Use the same warm page surface, reading spine, body typography, link states, and accessible control treatment as the landing page. Use type.utilityTitle for **Privacy and contact information**, not the large hero title.

The U1 masthead retains ordinary text identity and the same four navigation destinations back to the landing-page sections, with a visible **Back to the introduction** link. Do not imply those are sections inside the privacy notice. No decorative hero or illustration.

Maintain these ordered subsections from the prototype:

1. Scope and no-health-details reminder.
2. Who is responsible.
3. If you email.
4. Visiting the website.
5. Questions, deletion, or an accidental disclosure.
6. Effective/review dates and return links.

All unresolved operator, recipient, purpose, service, logging, retention, request-process, and date placeholders remain visible in the body, using the registry below. They must not be replaced by boilerplate claims that no data is collected or that a specific privacy law is satisfied.

Use headings and short paragraphs, not accordion-only legal content. At 320, wrap long placeholder text and use the full available reading width rather than a definition-table layout.

**Contact about privacy** and **Return to collaboration and contact** route back to P7's complete warning/contact context. No secondary form, guessed email identity, consent checkbox, cookie banner, or privacy dashboard is added to the mockup.

## 11. 320-pixel and 200% text-resize behavior

### At 320

- The main column has 288 pixels before local padding; controls and text must fit that space without whole-page horizontal scrolling.
- Keep body 18 / 29 and metadata 16 / 25 at default scale. Use the compact headline 32 / 40; do not shrink the definition or medical boundary to fit.
- Allow the identity, heading, full-word concept labels, and status label to wrap. No ellipsis, clipped rows, or fixed-height labels.
- Stack navigation and action groups whenever necessary. Target boxes must remain separate and have room for focus.
- Use 16-pixel warning inset padding without a second padded wrapper. Preserve all warning and privacy text.
- Wrap long placeholders as text; do not replace the unresolved address with a plausible short address. The eventual real address must copy exactly even if visually wrapped.
- Remove decorative art, not essential copy, source context, or notice links.

### At 200% text resizing

Specify a text-only enlargement review in addition to ordinary viewport resizing. Enlarge fonts and line-height relationships without freezing their containers. Do not simulate a pass by zooming out the whole frame afterward.

Let the masthead grow vertically, stack actions, and increase page height. Keep the complete warning before email. Remove art if it competes for space.

Do not counteract the user's enlargement by forcing a smaller font token, clipping lines, using a tooltip, or replacing words with icons. Exceptional long unbroken text can wrap visually without altering its underlying copied content.

Review text-spacing changes as well as size. Future implementation must support 200% text resizing and reflow at the equivalent of a 320 CSS-pixel viewport; browser zoom and text-only resizing are distinct checks and both need actual implementation evaluation.

## 12. Accessibility review points and evidence limits

The mockup should make later accessible implementation possible; it cannot demonstrate browser keyboard behavior, screen-reader output, real reflow, or WCAG conformance.

| Review point | What to show or inspect in design | What remains for later verification |
|---|---|---|
| Contrast | Actual foreground/background pairs for body, metadata, visited/hover links, actions, labels, warning, and focus. | Calculate/check all pairings against applicable 4.5:1 text and 3:1 large-text/non-text requirements; do not claim measurement not performed. |
| Focus | Visible state geometry with no clipping, including combined states and skip link. | Actual keyboard sequence, focus movement, visibility, and no traps. |
| Structure | Annotated heading hierarchy and one reading order; all three concepts and limits visible. | Landmarks, accessible names, page language, and assistive-technology behavior. |
| Targets | Prefer 44-pixel standalone target dimensions and sufficient spacing; text links remain identifiable. | Actual WCAG 2.2 AA target sizing/exceptions and touch/keyboard usability. |
| Reflow and resizing | Narrow/enlarged-text specimens with complete content and no designed truncation. | Browser reflow, text-spacing tolerance, user font/fallback behavior, and absence of horizontal page scroll. |
| Privacy sequence | Warning, privacy, and email remain together and in order at all widths. | Actual destination/focus behavior and a copyable approved email address. |
| High contrast and motion | No meaning dependent on palette, ornament, hover, or motion. | Forced-colors/system preference behavior; static-first implementation. |
| Comprehension | Introductory facts visually adjacent, status and medical boundary legible. | Audience-review findings; no claim the 20-second goal has been met. |

Use the PRD review protocol after the prototype/mockup is available. No completed audience session, clinical review, font-license audit, palette check, or accessibility test is reported by these documents.

## 13. Exact unresolved-placeholder registry

This is the required registry for the first mockup. Each listed string must appear visibly at its indicated location until resolved through explicit review. Do not replace it with realistic invented content, remove it for a clean export, or hide it in a design-tool comment that reviewers cannot see.

Body placeholders below use exact wording as specified here. This registry consolidates the prototype's longer brackets into stable slots for the next artifact; it does not resolve any fact.

| ID | Exact visible text | Location |
|---|---|---|
| PH-01 | [DEDICATED EMAIL ADDRESS — UNASSIGNED; MOCKUP CONTACT IS INACTIVE] | P7 address position. |
| PH-02 | [CONTACT ROLE AND RESPONSE EXPECTATION — FOUNDER APPROVAL PENDING] | P7 below message guidance. |
| PH-03 | [PUBLICATION RESPONSIBILITY — APPROVED PUBLIC NAME OR ROLE PENDING] | P9 accountability. |
| PH-04 | [PUBLIC CONTENT REVIEW DATE — NOT YET SET] | P9; not the historical documentation-status date. |
| PH-05 | [MATERIAL RELATIONSHIP DISCLOSURE — CONFIRM WHETHER APPLICABLE] | P9 disclosure position. |
| PH-06 | [RESPONSIBLE OPERATOR IDENTITY AND REQUIRED CONTACT DETAILS — PENDING] | U1: Who is responsible. |
| PH-07 | [AUTHORIZED EMAIL RECIPIENT OR ROLE — PENDING] | U1: If you email. |
| PH-08 | [CONFIRMED CORRESPONDENCE PURPOSES — PENDING] | U1: If you email. |
| PH-09 | [MAIL SERVICE, RECIPIENTS, RELEVANT PROCESSING LOCATIONS, RETENTION, BACKUP AND DELETION LIMITS — PENDING] | U1: Email handling and retention. |
| PH-10 | [ACTUAL DELIVERY/SECURITY LOG FIELDS, PURPOSES, RECIPIENTS, STORAGE/COOKIES AND RETENTION — PENDING] | U1: Visiting the website. |
| PH-11 | [THIRD-PARTY AND APPLICABLE INTERNATIONAL-PROCESSING DISCLOSURES — PENDING] | U1: Visiting the website. |
| PH-12 | [REQUEST PROCESS, RESPONSE EXPECTATION, APPLICABLE RIGHTS/COMPLAINT ROUTE AND DELETION LIMITS — PENDING] | U1: Questions/deletion. |
| PH-13 | [PRIVACY NOTICE EFFECTIVE DATE — NOT YET SET] | U1 dates. |
| PH-14 | [PRIVACY NOTICE REVIEW DATE — NOT YET SET] | U1 dates. |
| PH-15 | [HEADLINE IS PROVISIONAL — FINAL COPY APPROVAL PENDING] | Visible review annotation beside P1, outside intended visitor copy. |
| PH-16 | [PUBLIC ORIGIN WORDING/PERMISSIONS — APPROVAL PENDING] | Visible review annotation beside P5. Internal Rebar Foundry mention is already permitted. |
| PH-17 | [FUTURE SOFTWARE IMPLEMENTATION STATUS — UNVERIFIED; IDEAS ARE NOT AVAILABLE SERVICES] | Visible review annotation beside P6, not a fake public software status. |
| PH-18 | [FONT PAIR, EXACT FILES, LICENSING AND DELIVERY REVIEW — PENDING] | Visible type-specimen/review caption. |
| PH-19 | [PALETTE AND INTERACTION-STATE CONTRAST REVIEW — NOT YET COMPLETED] | Visible state-sheet/review caption. |
| PH-20 | [OPTIONAL ABSTRACT ILLUSTRATION — ARTWORK AND RIGHTS REVIEW PENDING] | Illustration review caption if art is included; in no-art views note omission instead. |

A compact "Unresolved" heading may precede a slot but cannot replace its text. Use a mockup-only surfaced block with adequate contrast and ordinary wrapping; no disabled-looking opacity.

The global nonfunctional caption from section 2 is also required, but is a review label rather than an unresolved fact. Historical documentation facts and approved decisions are not placeholders.

Do **not** include SOURCE-PD-01, a fake citation, a generic empty bibliography, lorem ipsum, a fake address, partner logos, or a fabricated scientific reviewer. If additional facts become necessary, update this registry explicitly before making a revised mockup. This keeps the required unresolved list auditable rather than open-ended.

## 14. What must not be visually simulated as real functionality

The mockup may show navigation destinations and state specimens, but it must not imply a backend, active inbox, shipped software, measured results, or an enrolled community.

Do not simulate:

- A sent email, delivery/read receipt, inbox monitoring, response-time achievement, or verified contact identity.
- Contact form fields, attachment upload, scheduling, research enrollment, accounts, authentication, or a newsletter signup.
- AI chat, source retrieval, personalized interpretation, citation generation, or a functioning research-search interface.
- Symptom logging, medication records, sensor/device connection, GPS route, health dashboard, or private-data access.
- A medical chart, "sample patient" timeline, treatment effect, scientific outcome, or synthetic data that looks like a validated result.
- Downloadable prototypes, app-store listings, live status, completion percentages, or a roadmap date for proposed systems.
- Partner endorsements, scientific-review certification, legal entity status, privacy compliance, anonymity, or security guarantees.
- A logo, emblem, brand seal, customized wordmark, or recognizable franchise-derived visual identity.

Do not make an excluded function look acceptable by marking it disabled or adding "demo" in small type. Omit it. Neutral future-idea text and non-data decoration are sufficient.

## 15. Founder decisions before implementation planning

Concept A, its broad palette/type direction, static-first policy, approved IA, email sequence, and provisional headline are already approved. The remaining decisions are more specific:

| Decision | Recommended handling before planning |
|---|---|
| Accept the specification and token baseline | Approve the proposed widths, spacing, scale, semantic role/state system, responsive rules, and visible-placeholder convention, subject to actual visual/accessibility review. |
| Choose a font-pair direction | Compare the three candidates in the real copy; confirm the preferred direction and require exact-file/licensing review before implementation selection. |
| Accept the actual visual artifact | Produce/review a nonfunctional mockup separately; approving this specification does not mean a rendered mockup exists or has been accepted. |
| Set illustration scope | Approve the one optional static art treatment or omit it; do not introduce photography or data-like imagery without a new decision. |
| Confirm content freeze and release-gate treatment | Keep the headline provisional for mockup work, but assign final-copy/public-origin approval and verified project-status ownership before release. Decide whether anything must change before work is estimated. |
| Approve audience/accessibility refinement handling | Name reviewers and decide how findings affect scope and sequencing. No invented results or blanket conformance claim may substitute for review. |
| Authorize planning capacity | Confirm planning owner, available time/budget, maintenance responsibility, and the bounded first-release scope. No reliable delivery estimate is implied here. |
| Confirm operating requirements for estimation | Establish responsible contact/operating roles and required privacy/logging/retention behavior, or explicitly track those as planning uncertainties; never invent provider-specific facts to close them. |
| Authorize any later technology evaluation separately | Requirements must guide necessary choices only after authorization. No stack, platform, CMS, database, or AI selection is made by these documents. |

Real email, operator identity, exact processing disclosures, retention/deletion limits, source substantiation if claims are added, public narrative permissions, final dates, and factual relationship disclosures remain publication gates. Distinguish those unresolved release facts from the founder's approval to begin a bounded planning exercise.

Neither specification approval nor later mockup approval authorizes production code, health-data collection, a logo, or a medical service.
