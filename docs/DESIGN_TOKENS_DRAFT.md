# Design Tokens Draft

## Current Ride-derived visual system — 29 October 2026

The founder explicitly supersedes Fieldnotes Laboratory and the earlier
accent-only amendment below. Current source evidence is in
[implementation-plan section 19](IMPLEMENTATION_PLAN.md#19-ride-derived-visual-redesign--29-october-2026).

| Role | Implemented value |
|---|---|
| Body / headings / brand | Local Inter variable 400-800 / Libre Franklin 700 / Libre Franklin 800; SIL OFL 1.1 notices and exact hashes in `public\licenses\FONT_PROVENANCE.txt`. |
| Main / surface / soft background | `#F5F7F8` / `#FFFFFF` / `#EEF2F3`. |
| Ink / secondary / headings | `#122022` / `#52636B` / navy `#193554`. |
| Action / hover / active / focus | `#284E91` / `#1D3D75` / `#142E5A` / `#284E91`. |
| Royal identity / pale blue | `#5278C7` / `#EAF0FB`. Royal is large bold hero text, hero/feature/concept borders and original decorative direction art; never ordinary white-on-royal button text. |
| Complementary teal / pale teal / warm detail | Ride `#145F68` / `#DCEFF1` / `#E7A33B`. |
| Visited / rule / functional boundary / dark secondary | `#644574` / `#DCE4E6` / `#71838E` / `#D4DFEF`. |
| Body / hero / section headings | 18px body, 1.6 line height; 40/56/64px hero and 32/44/48px section headings by available width, all root-relative and doubled in text tests. |
| Width / spacing / radii | 1180px-equivalent shell; 56/80px section rhythm; 22px cards, 34px major panels, pill actions; at least 48px controls. |

Royal hero contrast on the cool page is **4.013:1**, exceeding the 3:1 large-bold
text requirement; its minimum headline size is 40px, weight 700. Blue action text
is white on darker blue, **8.112:1**, not white on royal. Focus on the cool page
is **7.549:1**; functional borders on pale blue are **3.438:1**. The complete bounded
contrast/state/reflow record and remaining manual review limits are in
RELEASE_READINESS.md. Labels and DOM order carry meaning independently of color.

## Historical accent-only amendment — superseded by the visual redesign

Add **only** `--color-royal-accent: #5278C7` to the implemented palette. Its sole
usage is the three short, empty decorative rules above the consecutive concept
headings on paper `#F7F5EF`, contrast **3.955:1**. It is not body/link text
(below 4.5:1), not focus/hover/visited replacement, not a status signal.
All previous color values, font files, sizes, line heights, layout and emergency
wrapping are retained. Forced colors may omit the accent without losing meaning.
Local Source Serif 4/Sans 3 remain approved: the ride source actually uses remotely
requested Inter/Libre Franklin, not the current pair. No font swap or new font
service is implemented. Evidence and full original palette are recorded in
[IMPLEMENTATION_PLAN.md, section 18](IMPLEMENTATION_PLAN.md#18-ride-product-alignment--29-october-2026).
Optional desktop artwork remains deferred. Historical proposed tokens below are
preserved; this amendment is not a WCAG-conformance assertion.

> Historical token baseline for the project now named **Meridian Station**.
> Later font/palette direction approval does not establish final contrast or WCAG
> conformance. See [RELEASE_READINESS.md](RELEASE_READINESS.md) for current verification gates.

**Project:** The Emergent Collaborative  
**Date:** 2026-10-18  
**Direction:** Fieldnotes Laboratory, founder-approved concept  
**Status:** Proposed design values; not code, a finalized design system, or an accessibility certification  
**Companion:** [High-Fidelity Mockup Specification](HIGH_FIDELITY_MOCKUP_SPEC.md)

## 1. Purpose and interpretation

This implementation-neutral vocabulary supports the approved [visual direction](VISUAL_DESIGN_DIRECTION.md) and the companion mockup specification. Dot-separated names below are human-readable design labels, not variables, CSS, JSON, or a framework configuration.

Values are starting decisions for mockup review. Numeric dimensions are logical design pixels, corresponding to CSS pixels at the default viewing scale, not physical screen pixels. They must not become fixed heights, frozen text sizes, or barriers to user resizing in a future implementation.

Use base values through semantic roles. If a role changes, update this document and the companion specification together. Do not create separate palettes for Evidence, Experience, Exploration, or individual project statuses.

No frontend framework, hosting platform, CMS, database, AI platform, font-delivery service, or implementation technology is selected.

## 2. Spacing primitives

| Token | Draft value | Typical purpose |
|---|---|---|
| space.none | 0 | No additional space. |
| space.1 | 4 | Small, nonessential visual adjustment. |
| space.2 | 8 | Related inline items; label-to-description spacing. |
| space.3 | 12 | Compact inset or related text groups. |
| space.4 | 16 | Paragraph spacing; narrow-screen page inset. |
| space.5 | 20 | Neutral label/control padding combinations. |
| space.6 | 24 | Standard mobile inset and panel padding. |
| space.8 | 32 | Wide-screen inset; subgroup spacing. |
| space.10 | 40 | Narrow-screen section separation. |
| space.12 | 48 | Standard compact section separation. |
| space.16 | 64 | Desktop introduction top space; text-to-art gap. |
| space.18 | 72 | Desktop section separation. |

Space communicates relationships, not arbitrary visual luxury. Do not add the section gap twice by applying independent top and bottom gaps to adjacent sections. Text growth can increase the resulting layout height.

## 3. Content widths and responsive roles

| Token | Draft value or behavior | Use |
|---|---|---|
| width.page.maximum | 1,120 | Maximum centered content envelope; page background can continue beyond it. |
| width.reading.maximum | 704 | Maximum width of the main reading spine. |
| width.reading.measure | Approximately 68 characters | Additional typographic cap; use the narrower practical measure rather than stretching paragraphs. Actual character count varies by font. |
| width.heading.maximum | 704 | Intro headline shares the reading spine; no art overlap. |
| width.art.maximum | 288 | Maximum width of the one optional decorative illustration. |
| width.art.gap | 64 | Minimum clear separation from the text spine when art is present. |
| width.utility.maximum | Same as width.reading.maximum | Privacy-page body remains as readable as the main page. |
| inset.page.narrow | 16 | Widths below 360. |
| inset.page.compact | 24 | Widths from 360 through 767. |
| inset.page.regular | 32 | Widths of 768 and above, before extra centering space. |
| layout.singleColumn | Default | All essential content remains in one ordered reading spine. |
| layout.artEligible | Width 1,200 and above, only if space allows | Art is removed when text enlargement or font metrics reduce available space. |

The envelope is the available width after page insets, capped at width.page.maximum and centered. The reading spine starts at its leading edge and is capped by the reading width/measure. Unused desktop space is not an invitation to add a second content stream.

At 320 pixels: outer insets of 16 leave 288 pixels for the reading spine before any local padding. A warning inset uses 16 on each side, reducing its available text width further. Do not add nested containers with repeated padding.

The stated width bands are composition review anchors, not mandatory implementation breakpoints. Actual wrapping, text size, and available space govern changes. No layout minimum may force a horizontal page scroll.

## 4. Typography roles

### 4.1 Family and weight roles

| Token | Draft direction |
|---|---|
| font.heading | Sturdy contemporary serif; candidate families are listed in the mockup specification. |
| font.body | Humanist sans serif for body, navigation, status, citations, notices, and actions. |
| font.identity | Same unmodified sans family as body; no custom lettering or logo treatment. |
| weight.body | Regular, nominal 400. |
| weight.heading | Medium/semibold, nominal 500-600 according to actual family. |
| weight.emphasis | Semibold, nominal 600, for labels and short important phrases. |
| tracking.default | Natural family spacing; no stretched all-capital labels or compressed body text. |

Nominal weight numbers do not guarantee equivalent visual weight across families. Do not synthesize a missing weight or use a hairline cut to imitate the serif direction.

### 4.2 Type scale

Each pair is **font size / line height** in design pixels at the default scale. The line height is a proportional design relationship, not a future fixed-height text box.

| Token | Wide: 1,200+ | Intermediate: 768-1,199 | Compact: below 768 | Family and role |
|---|---|---|---|---|
| type.title | 48 / 56 | 40 / 48 | 32 / 40 | Serif; main landing-page heading. |
| type.utilityTitle | 36 / 44 | 36 / 44 | 30 / 38 | Serif; privacy-page title. |
| type.section | 32 / 40 | 30 / 38 | 28 / 36 | Serif; P2-P8 section headings. |
| type.subsection | 24 / 32 | 24 / 32 | 22 / 30 | Serif; concept and current-work subheadings. |
| type.question | 20 / 30 | 20 / 30 | 20 / 30 | Sans, semibold; short framed question. |
| type.body | 18 / 29 | 18 / 29 | 18 / 29 | Sans; explanations, privacy warning, utility body. |
| type.meta | 16 / 25 | 16 / 25 | 16 / 25 | Sans; dates, status label, source metadata, footer details. |
| type.action | 18 / 26 | 18 / 26 | 18 / 26 | Sans, semibold; prominent section/email action. |
| type.navigation | 16 / 24 | 16 / 24 | 16 / 24 | Sans; primary/secondary navigation. |
| type.identity | 22 / 28 | 22 / 28 | 22 / 28 | Sans, semibold; organization name as ordinary text. |

No essential notice drops below type.meta, and the medical boundary and contact warning use type.body. Source titles use type.body; metadata alone may use type.meta.

Keep semantic heading levels separate from appearance: P1 is the landing-page top-level heading; P2-P8 are section headings; nested modules are subordinate headings. The footer heading can be visually smaller without losing its structural meaning.

At 200% text resizing, the body design equivalent becomes approximately 36 / 58. That is not a separate style to hard-code. Do not counteract enlargement by choosing the smaller band solely because the user enlarged text.

## 5. Candidate color roles

All values are opaque candidate sRGB colors. They specify a review palette, not permission to use every foreground on every background.

| Token | Candidate value | Intended use |
|---|---|---|
| color.surface.page | `#F7F5EF` | Warm neutral page and privacy body. |
| color.surface.subtle | `#ECEFEA` | P7 participation area; neutral status background. |
| color.surface.inset | `#FFFFFF` | Contact warning on the subtle surface. |
| color.text.primary | `#222A2B` | Main text, essential warnings, headings. |
| color.text.secondary | `#4C5B5C` | Metadata and subordinate context, not de-emphasized medical limits. |
| color.text.onAccent | `#FFFDFC` | Text on filled teal actions. |
| color.action.default | `#185D62` | Underlined links; filled primary action background. |
| color.action.hover | `#11474B` | Hovered links/action background; no geometry shift. |
| color.action.pressed | `#0D3C40` | Pressed state specimen; not a new function. |
| color.link.visited | `#674B70` | Previously visited prose/source/utility links only. |
| color.accent.earth | `#854B37` | Small reflective art detail; not a status/safety classification. |
| color.border.functional | `#677574` | Meaningful boundaries, neutral status outline. |
| color.rule.decorative | `#CDD4CF` | Nonessential separators only. |
| color.focus.ring | `#854B37` | Conspicuous focus outline on approved light surfaces. |
| color.focus.gap | `#F7F5EF` | Separating band around a dark action before the outer focus ring. |
| color.review.surface | `#F2EADF` | Mockup-only unresolved-content marker. |
| color.review.text | `#854B37` | Text for a visible "Unresolved" marker in the review artifact. |

### 5.1 Permitted pairings to evaluate

Review primary and secondary text, default/hover/pressed/visited link text, and functional boundaries on page, subtle, and inset surfaces. Review onAccent text on all three action backgrounds. Review earth text on review.surface and focus ring on every adjacent surface and state.

No contrast ratios are claimed as measured in this draft. Confirm at least 4.5:1 for normal text and the applicable 3:1 requirements for qualifying large text and meaningful non-text boundaries in the actual design. If a pair fails, revise the role value and all dependent uses rather than shrinking a label or removing an underline.

Decorative rules may be low contrast only when their removal loses no necessary grouping or meaning. Do not reuse color.rule.decorative for focus or as the only visible status boundary.

### 5.2 Semantic exclusions

No Evidence/Experience/Exploration traffic-light palette; no green Operational dot; no red medical-alert banner; no palette-dependent assertion of security or scientific quality. There is no dark-mode or gradient token set in this draft.

Visited color is optional orientation information, never the only way to determine whether something is actionable or has been completed. It does not apply to neutral status labels or make section-navigation history look like project progress.

## 6. Borders, rules, and radii

| Token | Draft value | Use |
|---|---|---|
| border.none | 0 | Ordinary prose sections. |
| border.standard | 1 | Neutral status and simple inset boundary. |
| border.emphasis | 3 | Short contact-warning leading rule; not an alert color. |
| rule.section | 1 | Occasional decorative section separator. |
| radius.none | 0 | Editorial rules and ordinary page sections. |
| radius.label | 4 | Neutral, noninteractive status label. |
| radius.control | 4 | Modest rounding of action-shaped links. |
| radius.panel | 4 | P7 warning/review panel if rounding is needed. |

No pill-shaped maturity badges, floating-card shadows, glow, glass effect, embossed seals, or decorative elevation scale. A boundary is not a substitute for adequate text contrast.

## 7. Focus and interaction-state roles

| Token | Draft value/behavior |
|---|---|
| focus.ring.width | 3 pixels. |
| focus.ring.offset | 3 pixels of clear separation from the target. |
| focus.ring.color | color.focus.ring. |
| focus.darkTarget.gap | A visible 3-pixel color.focus.gap band between dark target and outer ring. |
| focus.visibility | Immediate; never delayed by a transition. |
| link.underline.default | Visible underline for prose, source, privacy, and navigation links; approximately 1-pixel stroke with comfortable separation from glyphs. |
| link.underline.hover | Approximately 2-pixel stroke, without moving text. |
| link.underline.focus | Retain underline plus focus outline. |
| state.geometry | No layout shift between default, hover, focus, pressed, and visited. |
| state.motion | Static changes; no animation required. |

The clear separation can be the local light surface for text links. A dark action needs the explicit light separating band so the ring is not judged against teal alone. Draw combination states, including focus + hover and focus + visited, in the mockup state sheet.

Provide room for outlines; no clipped ring at container edges or wrapped navigation rows. Use user/system colors in a future forced-colors treatment as appropriate; do not force these sRGB colors against user preferences.

These are proposed focus geometry and pairing rules, not a verified focus-conformance result.

## 8. Section and component spacing

| Token | Wide | Intermediate | Compact | Use |
|---|---|---|---|---|
| gap.section | 72 | 64 | 48, or 40 below 360 | Single gap between main narrative sections. |
| inset.intro.top | 64 | 48 | 40 | From masthead region to introductory package. |
| gap.heading.body | 16 | 16 | 16 | Section heading to first paragraph. |
| gap.paragraph | 16 | 16 | 16 | Between body paragraphs. |
| gap.module | 32 | 32 | 32 | Between stacked concept modules or work-item groups. |
| gap.label.body | 8 | 8 | 8 | Status/metadata label to its related description. |
| gap.action.group | 16 | 16 | 16 | Between primary action and secondary reading link. |
| gap.navigation.items | 8 minimum | 8 minimum | 8 minimum | Clear separation between distinct target boxes. |
| inset.panel | 24 | 24 | 16 | P7 warning and mockup review inset; avoid repeated nested padding. |
| inset.band.vertical | 32 | 32 | 24 | Surface band content inset, within the normal section rhythm. |
| gap.footer.items | 12 | 12 | 12 | Footer facts and links. |

The P7 band can extend across the page envelope, while its text still starts on the reading spine. Do not add a second horizontal panel inset around all P7 text and then repeat it around every inner block.

Status labels use 4 vertical and 8 horizontal padding, allow multiple lines, and have no fixed height. They are not controls.

## 9. Control sizing

| Token | Draft value/behavior | Use |
|---|---|---|
| control.minimumHeight | 44 | Navigation targets and standalone actions where feasible. Content may increase height. |
| control.minimumWidth | 44 | Minimum standalone target dimension, not a fixed width. |
| control.padding.inline | 20 | Filled prominent action. |
| control.padding.block | 12 | Filled prominent action; actual height follows text plus padding and is at least the minimum. |
| control.navigation.padding.inline | 8 | Section links with space for focus. |
| control.stack.gap | 8 minimum | Separate target rectangles must not overlap. |
| control.width.compact | Available width when stacked | Short labels can remain intrinsic if targets and spacing fit. Long labels wrap without truncation. |

Prefer a 44-by-44 target where feasible; this is a design preference distinct from WCAG 2.2 AA's minimum target-size requirement and applicable exceptions. Inline prose links do not need giant boxes inserted into paragraphs, but must meet the applicable requirements and remain easy to identify. Use standalone, comfortably sized links for source return actions when needed.

An action-shaped section link is still navigation; the visual token does not change its meaning. There is no contact-form, field, upload, chat, account, progress, or dashboard token family.

## 10. Draft governance

Before finalizing values, compare the selected font pair, actual line lengths, state combinations, 320-pixel composition, 200% text enlargement, text-spacing changes, and relevant forced-colors needs. Change primitives only when their semantic consequences are understood.

The draft remains subject to founder acceptance of the companion specification and later visual review. It is not authorization to convert these tables to code or select implementation technology.
