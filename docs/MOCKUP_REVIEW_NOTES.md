# Visual Mockup Review Notes

> Historical rendered-artifact review for the project now named **Meridian Station**.
> Original images/PDFs/manifests and their 20 placeholders remain unchanged as history;
> they are not current public copy or an unresolved-gate inventory. Current copy and
> five open placeholders are recorded in [RELEASE_READINESS.md](RELEASE_READINESS.md).

**Project:** The Emergent Collaborative  
**Status:** Nonfunctional visual package for founder review. Visual mockup approval is pending.  
**Basis:** The approved [mockup specification](HIGH_FIDELITY_MOCKUP_SPEC.md), [draft tokens](DESIGN_TOKENS_DRAFT.md), and visitor-facing copy in the [content prototype](LOW_FIDELITY_CONTENT_PROTOTYPE.md).

## 1. Review entry points

Open the [bookmarked founder-review PDF](mockups/founder-review.pdf) for a paginated review, or use the individual full-height PNGs below. The PDF contains 76 review sheets with a bookmark for each view. Its pagination is an export convenience, not a proposed website layout.

**The PNGs are the authoritative continuous frames.** Inspect them at actual pixel size and scroll. Fitting an entire long image onto one screen makes its text artificially small; that is not the intended reading size or a text-resize result.

Every full frame, and every PDF continuation sheet, visibly carries:

> NONFUNCTIONAL DESIGN MOCKUP — unresolved content marked; no audience or accessibility results claimed.

| Artifact | Rendered dimensions | PDF pages | Review focus |
|---|---|---|---|
| [Desktop landing](mockups/landing-1440.png) | 1440 x 7195 | 1-5 | Complete P0-P9; wide masthead; reading spine; optional contour illustration. |
| [Intermediate landing](mockups/landing-768.png) | 768 x 7769 | 6-10 | Complete P0-P9; stacked masthead; no illustration. |
| [Mobile landing](mockups/landing-390.png) | 390 x 10426 | 11-17 | Complete P0-P9; stacked navigation and actions. |
| [Narrow landing](mockups/landing-320.png) | 320 x 11645 | 18-25 | Complete P0-P9; full warnings, labels, and unresolved address. |
| [Desktop privacy utility](mockups/privacy-1440.png) | 1440 x 2419 | 26-27 | Complete U1, masthead, landing-page return routes, unresolved operating facts. |
| [Mobile privacy utility](mockups/privacy-390.png) | 390 x 3267 | 28-29 | Complete U1; long fields and dates remain visible. |
| [Interaction-state sheet](mockups/interaction-states.png) | 1440 x 2122 | 30-31 | Link/action states, focus combinations, skip-link and wrapped-navigation specimens, status and type samples. |
| [Desktop, 200% text](mockups/text-200-landing-1440.png) | 1440 x 20532 | 32-45 | Complete P0-P9 with doubled text metrics and no illustration. |
| [Mobile, 200% text](mockups/text-200-landing-390.png) | 390 x 31643 | 46-68 | Complete P0-P9, including P0/P1, P6/P7, and P9 at enlarged sizes. |
| [Privacy, 200% text](mockups/text-200-privacy-390.png) | 390 x 8777 | 69-75 | Complete U1, enlarged long fields and return links. |
| [Content-stress specimens](mockups/content-stress-specimens.png) | 390 x 1572 | 76 | Longer headline, long source-style/return labels, PH-09, multiline status, and unbroken non-address text. |

The [render manifest](mockups/render-manifest.json) records dimensions, font roles and file hashes, source-document hashes, rendered wording, text metrics, section order, PDF page ranges, and exact placeholder coverage. It is review metadata, not application configuration or a token implementation.

## 2. What was rendered

The organizing direction is **Fieldnotes Laboratory**: warm paper, charcoal text, deep-teal links, restrained earth accents, sturdy serif headings, and a stable left-aligned reading spine. There is no logo, photography, dashboard, software screenshot, clinical chart, or decorative motion.

All six landing frames retain P0-P9 in order. Evidence, Experience, and Exploration are consecutive, equally readable modules with their distinct questions and limitations. There are no proof colors, authority badges, pipeline arrows, or implied equivalence of scientific support.

P5 retains the concise third-person origin, including the permitted internal Rebar Foundry reference. PH-16 remains beside it; this does not clear the story for public publication.

P6 retains the approved content-prototype wording, neutral Prototype and Idea labels, limitations, and historical documentation-status date of **18 October 2026**. That date was not replaced by a new software-verification or publication-review claim. PH-17 explicitly keeps future software status unverified.

P7 retains contribution examples followed by the complete warning, email-handling/privacy explanation, and only then the unresolved address and nonfunctional email-action placement. No real address, form, mail application operation, delivery result, or response commitment is simulated. The filled email-action appearance exists only on the separately labeled state sheet.

P8 contains the two source-policy paragraphs, not an empty bibliography. The optional Parkinson's variability sentence, SOURCE-PD-01, and generic source-entry placeholder are omitted as approved. Source-style specimens explicitly identify themselves as specimens; they contain no invented paper, author, DOI, medical finding, or citation.

The privacy utility retains all operating unknowns. It does not claim an operator, provider, retention period, deployment configuration, anonymous email, legal clearance, or compliance outcome.

## 3. Rendering interpretations and departures

| Area | Treatment and consequence |
|---|---|
| Export format | Locally rendered static PNGs and an image-based PDF, rather than a browser prototype or editable design-tool document. There is no production site code or selected website stack. |
| Reading measure | The 1120-pixel desktop envelope starts at x=160. The chosen sans font's 68-zero-character measure is approximately 608 pixels, narrower than the 704-pixel cap, so the reading spine uses approximately 608 pixels at wide/intermediate sizes. Mobile remains 342 pixels at 390 and 288 pixels at 320. |
| Masthead | The four links share a row at ordinary 1440. At 768 and narrower, and in enlarged-text views, they are stacked individually. This conservative permitted variation uses more vertical space than a wrapped two-row navigation. |
| Intro actions | Primary and secondary actions stack even on desktop. No copy or boundary is removed to shorten the introduction. |
| Review annotations | Wide annotations occupy the surplus right margin. Narrow/intermediate/enlarged views place them in explicitly labeled review bands after the relevant content. These bands increase exported height and are not proposed public website prose. |
| Unresolved facts | Registry text is preserved exactly, with visible PH identifiers. Long fields are standalone review-colored blocks rather than polished inline facts; some privacy sentences are consequently fragmented around unresolved fields. |
| Illustration | One locally drawn abstract contour composition appears only in the ordinary 1440 landing frame. It has no axes, readings, units, medical/sensor values, or scientific meaning. It remains a draft asset subject to PH-20, not rights-cleared final artwork. |
| Enlarged views | Full landing/privacy documents were rendered rather than only representative excerpts. Text and line heights double; page widths, ordinary gutters, and most non-type spacing do not double. Containers grow instead of clipping. |
| PDF | Long frames are split into review sheets, sometimes within paragraphs or panels. The caption repeats outside the content on each sheet. Consult the continuous PNG when judging section rhythm or panel continuity. |

The review caption and review-only annotations are export furniture. They must not be copied into future visitor-facing content. Conversely, unresolved operating facts must not disappear merely because that furniture is eventually removed.

## 4. Font observations and provenance

The actual rendered inputs are:

| Role | Font file | Starting weight |
|---|---|---|
| Headings | SourceSerif4-Semibold.ttf | Semibold / 600 |
| Body, ordinary links, metadata | SourceSans3-Regular.ttf | Regular / 400 |
| Emphasis, identity, action labels | SourceSans3-Semibold.ttf | Semibold / 600 |

The serif gives headings a substantial editorial character without requiring oversized display text. The sans distinguishes longer explanatory prose, warnings, and neutral labels from those headings. At ordinary 320, the 32/40 title remains readable across five lines; body copy remains 18/29 rather than shrinking. These are design observations, not audience-readability findings.

At 200% on mobile, 64/80 headline text needs within-word wrapping for some words. The problem is conspicuous in the provisional headline and should not be disguised by shrinking it. Long uppercase placeholders also become visually dominant, intentionally exposing unresolved content.

No alternative font pair was rendered or scored in this package. This is the founder-selected first comparison direction, not evidence that other candidates are inferior. Browser rasterization, fallback fonts, loading behavior, language coverage, user overrides, and final delivery have not been evaluated.

Public font inputs came from Adobe's upstream release branches:

- [Source Serif 4 Semibold](https://raw.githubusercontent.com/adobe-fonts/source-serif/release/TTF/SourceSerif4-Semibold.ttf)
- [Source Sans 3 Regular](https://raw.githubusercontent.com/adobe-fonts/source-sans/release/TTF/SourceSans3-Regular.ttf)
- [Source Sans 3 Semibold](https://raw.githubusercontent.com/adobe-fonts/source-sans/release/TTF/SourceSans3-Semibold.ttf)

The upstream licenses identify SIL Open Font License 1.1. Copies are retained as [Source Serif license](mockups/font-licenses/SourceSerif4-OFL.txt) and [Source Sans license](mockups/font-licenses/SourceSans3-OFL.txt); exact font-input SHA-256 hashes are in the manifest because release-branch URLs can change. Font binaries are not website dependencies in this repository. Retrieving these files and licenses does not settle final exact-file, licensing, or delivery approval: **PH-18 remains unchanged**.

## 5. Color and contrast review

[Nominal sRGB calculations](mockups/contrast-calculations.json) were performed on the candidate hex values using relative luminance and the contrast-ratio formula. They concern flat color pairs, not antialiased edge pixels, real browser states, user settings, or a completed accessibility review.

| Used pairing | Calculated ratio | Design implication |
|---|---|---|
| Charcoal on paper / mineral / white | 13.43 / 12.62 / 14.64 | Strong nominal body/warning text contrast. |
| Secondary slate on paper / mineral | 6.51 / 6.12 | Keep metadata at its readable specified size; do not reduce opacity. |
| Default teal on paper / mineral | 6.93 / 6.51 | Retain visible underlines, not color-only identification. |
| Visited plum on paper / mineral | 6.84 / 6.42 | Still underlined; never a completion or verification signal. |
| Warm-white on default / hover / pressed teal | 7.45 / 10.22 / 11.92 | Candidate filled-action states have strong nominal label contrast. |
| Earth on review surface | 5.76 | Unresolved text remains readable, with an explicit label as well as color. |
| Earth focus ring against paper / mineral | 6.30 / 5.92 | Preserve the light separation band beside dark actions; earth against teal alone is not a reliable focus distinction. |
| Functional boundary on paper / mineral | 4.40 / 4.14 | Suitable candidate for non-text boundaries; do not repurpose it as ordinary small-text color. |
| Decorative rule on paper / mineral | 1.38 / 1.30 | Intentionally low contrast; rules must remain nonessential, never the sole group, state, or warning indicator. |

No listed small-text pairing is below 4.5:1. The boundary is evaluated as non-text, and the pale rule is decorative, not small text. This limited arithmetic does **not** certify the palette or the interface.

Still requiring verification: all actual state/surface combinations, underline visibility and weight, the complete 3-pixel focus ring and 3-pixel separation at wrapped targets, focus against panel edges, forced colors, and browser/user-style rendering. The sheet shows default, hover, pressed, visited, focus, focus + hover, and focus + visited treatments. Section navigation retains teal when visited.

**PH-19 remains exactly as specified:** the overall palette and interaction-state contrast review is not completed by these calculations.

## 6. Narrow-width observations: 320 pixels

The rendered main column is 288 pixels with 16-pixel outer gutters. No essential section, concept name, status, warning, privacy explanation, placeholder, or footer fact is omitted.

The title spans five lines. The identity, section headings, concept heading, status label, and long unresolved fields wrap rather than truncate. Navigation and the seven-link section map become vertical lists. The primary action fits without abbreviating its label.

The warning has 16-pixel local padding and therefore approximately 256 pixels for text. Its full prohibitions, nonclinical/urgent-help boundary, and no-enrollment/publication language remain ahead of privacy and email. The long unresolved address is visibly a placeholder, not a shortened or plausible address.

The principal concern is length and reading effort: this review frame is 11645 pixels tall, partly because unresolved/review bands remain visible. The navigation also consumes considerable height before P1. Do not interpret that as permission to hide warnings or shrink body text. Founder/audience review should decide whether a compact wrapping navigation is worth a further comparison.

The rendering layout contains no detected text-box overlap or out-of-frame text box. This does not demonstrate absence of browser horizontal scrolling, touch usability, or reflow conformance.

## 7. Text-enlargement observations: 200%

These are newly laid-out text-enlargement frames, not enlarged screenshots or whole-frame zoom-outs. Body text is **36/58**, metadata **32/50**, navigation **32/48**, and the mobile title **64/80**. Containers and actions expand; decoration is omitted; complete content remains present.

Full desktop and mobile landings include the requested P0/P1, P6/P7, and P9 regions, and the separate enlarged privacy view covers complete U1. The warning, privacy caveat, unresolved address, and response-role placeholder remain in order. Status labels, footer facts, dates, and processing fields grow vertically without ellipses or fixed-height clipping.

The significant unresolved issue is the mobile headline: words including "experience" and "technology" require emergency within-word wrapping at the preserved size and 342-pixel measure. No inserted hyphens or altered headline wording conceal this. Some other long headings/fields also require aggressive wrapping. This is visually awkward and warrants a final-copy/typographic decision, not a claim that enlargement is comfortable.

The full enlarged mobile landing is 31643 pixels tall. Its PDF spans 23 sheets, so reviewing only its first sheet would miss most of the task. Compare the warning and footer as well as the opening. The length of these exports is not a proposed fixed website height.

Actual browser text-only enlargement, browser zoom, text-spacing overrides, assistive technology, and user font overrides remain untested. No 200% accessibility pass is claimed.

## 8. Placeholder visibility

All 20 registry strings remain unchanged and are rendered visibly, not only recorded in metadata.

| ID | Visible location | Review views |
|---|---|---|
| PH-01 | Unassigned/inactive dedicated address | Every landing, including enlarged views. |
| PH-02 | Contact role and response expectation | Every landing, after message guidance. |
| PH-03 | Publication responsibility | Every landing footer. |
| PH-04 | Public content review date | Every landing footer; not the historical P6 date. |
| PH-05 | Material relationship disclosure | Every landing footer. |
| PH-06 | Responsible operator | Both ordinary privacy frames and enlarged privacy. |
| PH-07 | Authorized email recipient/role | All privacy frames. |
| PH-08 | Correspondence purposes | All privacy frames. |
| PH-09 | Mail service, processing, retention, backup/deletion limits | All privacy frames; also the stress sheet. |
| PH-10 | Delivery/security logs and storage | All privacy frames. |
| PH-11 | Third-party/international processing | All privacy frames. |
| PH-12 | Requests, rights/complaints, deletion limits | All privacy frames. |
| PH-13 | Privacy effective date | All privacy frames. |
| PH-14 | Privacy review date | All privacy frames. |
| PH-15 | Provisional headline review annotation | Every landing. |
| PH-16 | Public-origin wording/permissions annotation | Every landing, associated with P5. |
| PH-17 | Unverified future software annotation | Every landing, associated with P6. |
| PH-18 | Font/file/licensing/delivery review | Interaction-state/type sheet. |
| PH-19 | Palette/state contrast review | Interaction-state sheet. |
| PH-20 | Optional illustration artwork/rights | Ordinary 1440 landing beside the illustration. Other landing views explicitly note illustration omission. |

The manifest contains the exact bracketed text and per-frame coverage for individual lookup. No placeholder was replaced by a guessed email, public identity, scientific source, partner, software status, or privacy fact.

## 9. Accessibility concerns and review limits

These artifacts show a proposed hierarchy and visual reading order, not implemented semantics. The image-based PDF is not a tagged accessible document, and PNG text is not selectable. Neither export is a substitute for accessible website content or a copyable email address. The source content/specification and text-bearing manifest accompany the visuals for review.

The state sheet demonstrates appearance only: it cannot prove keyboard sequence, focus movement, skip-link operation, source-return behavior, accessible names, or target activation. Likewise, nominal 44-pixel standalone target geometry is not a tested touch target or blanket WCAG target-size result.

Later evaluation must cover keyboard and screen-reader behavior, landmarks and heading semantics, source/return context, no horizontal page scroll, text spacing, fallback fonts, forced colors, visible focus at edges, exact address copying, and access to full warnings. Static-first design avoids dependence on animation, but system-preference behavior is not demonstrated.

No audience sessions, 20-second comprehension result, clinical review, medical validation, privacy-law clearance, or accessibility conformance result is claimed.

## 10. Artifact checks and recommended adjustments

The package was checked for 11 image dimensions and hashes, exact frame captions, all 20 exact placeholders, complete P0-P9 order, and retained source-copy wording/order across 66 section instances. Copy comparison normalized formatting and punctuation, applied the registry substitutions, and omitted only the approved source-entry placeholder; the headline and PH strings were retained literally. Contact sequence, doubled body metrics, and text-box bounds/overlap were also checked. Representative crops were visually inspected across ordinary, narrow, enlarged, privacy, state, and stress views.

The native Windows PDF reader loaded the 76-page PDF and rendered its first, middle, and last pages. That confirms export readability in that reader, not accessibility or website behavior.

**No baseline token file has been changed.** Recommended handling:

- Retain body size, line height, readable metadata, semantic color roles, and uncropped warnings. No palette replacement is justified by the limited flat-color calculations.
- Keep the practical reading cap explicit: the selected font gives approximately 608 pixels for the 68-character-width anchor. Recheck this with any different file, weight, or fallback rather than silently defaulting all prose to 704 pixels.
- Preserve the 3-pixel light separation at a focused dark action. Do not substitute an earth-only edge directly against teal.
- Compare a less vertically expensive wrapping navigation at 768/compact widths if the founder requests refinement. This changes composition, not the four-link model or body size.
- Resolve the provisional headline and review long-word wrapping before freezing typography. Do not add a smaller accessibility-specific title size that cancels user enlargement.
- Once operating facts are approved, replace placeholder blocks with factual readable text and re-review lengths. Their current height must not be treated as a final content forecast.

These are review recommendations, not adopted token revisions, implementation requirements beyond the approved baseline, or authorization to start planning.

## 11. Founder decisions and the next approval gate

**The immediate gate is explicit founder acceptance of the actual visual mockup, or a bounded list of revisions. Implementation planning has not begun.**

For this review, confirm or revise the actual Source Serif 4 / Source Sans 3 treatment, hierarchy, palette, spacing, practical reading measure, stacked actions, and navigation density. Decide whether to retain or omit the optional desktop contour artwork. Identify any content or enlarged-headline issue that must change before the visual direction is accepted. The exact public headline remains provisional unless separately approved.

The following decisions from the specification still need explicit handling before a bounded planning exercise is authorized:

| Decision | Required handling |
|---|---|
| Visual acceptance | Approve the rendered package, including its narrow/enlarged limitations, or request specific visual revisions. Specification approval alone is not this acceptance. |
| Font and artwork follow-through | Confirm the preferred rendered pair and artwork scope; retain exact-file/licensing/delivery and artwork/rights review as open gates where unresolved. |
| Content freeze and accountability | Assign ownership for final headline, public-origin wording/permissions, factual current-work updates, and corrections. Identify changes required before estimation. |
| Audience/accessibility refinement | Name appropriate reviewers and decide how findings will affect scope and sequencing; no invented results close this gate. |
| Planning authority and capacity | Explicitly authorize planning, identify its owner, available time/budget, maintenance responsibility, and bounded informational-site scope. No delivery estimate is implied. |
| Operating uncertainties | Establish responsible contact/operating roles and required privacy/logging/retention behavior, or explicitly permit these to remain tracked estimation uncertainties. Do not fabricate provider-specific answers. |
| Later technology evaluation | Authorize separately if needed. This package makes no frontend, CMS, hosting, database, or AI-platform choice. |

The real address, recipient, operator identity, processing/retention/deletion facts, rights/request route, final public narrative permissions, publication dates, factual relationship disclosure, and any newly introduced scientific sources remain **publication gates**. They need not be invented or declared resolved to approve a visual direction, and visual approval cannot authorize publication with those fields unresolved.

No production code, accounts, health-data collection, symptom logging, AI chat, device integration, personalized interpretation, logo, or implementation plan has been created by this package.
