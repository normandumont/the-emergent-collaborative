# Site Information Architecture

> **Current visual presentation amendment — 29 October 2026:** the founder's
> subsequent Ride-derived redesign retains the P0-P9/U1 reading order, four
> primary and seven secondary destinations, content boundaries and safe contact
> sequence. A broad responsive hero now links directly to the Parkinson's
> initiative and Our approach. P3 uses three labeled concept cards followed by
> explanatory directions; P4 has two feature panels; P5 adds a text-only origin
> transition; P6 has four labeled work groups, including Future exploration.
> Cards/columns and alternating backgrounds are authorized presentation, not new
> products, interactions or functionality. Earlier anti-card/narrow-spine visual
> restrictions are superseded. Source evidence: implementation-plan section 19.

> **29 October 2026 founder clarification:** retain P0-P9/U1, four primary links
> and seven secondary links. P1/P4 now explain the concrete AI-assisted Parkinson's
> knowledge-resource and longitudinal direction. P3 adds Research Assistance,
> Longitudinal Understanding and Initiatives beneath the three consecutive concept
> modules, as ordinary explanatory headings, not tabs, pages or products.
> P5 names the ride catalyst; P6 separates prior artifacts, current static website,
> developing direction and future implementation. Current copy is in the dated
> [prototype addendum](LOW_FIDELITY_CONTENT_PROTOTYPE.md); the IA record below is preserved.

> Historical IA baseline: The Emergent Collaborative was renamed **Meridian Station**.
> P0-P9/U1, navigation and warning/privacy/contact order remain the approved structure.
> Headline/contact/permission/status decisions below are historical where superseded by
> [RELEASE_READINESS.md](RELEASE_READINESS.md); do not copy obsolete placeholders into current output.

**Project:** The Emergent Collaborative  
**Date:** 2026-10-18  
**Status:** Proposed UX/IA for founder review; not authorization for visual design, implementation, or publication.  
**Companion:** [Low-Fidelity Content Prototype](LOW_FIDELITY_CONTENT_PROTOTYPE.md)

## 1. Basis and boundaries

This proposal follows [AGENTS.md](../AGENTS.md), [GENESIS.md](GENESIS.md), the approved [Founding Product Brief](FOUNDING_PRODUCT_BRIEF.md), and the founder-approved [Website Product Requirements](WEBSITE_PRODUCT_REQUIREMENTS.md). The founder's latest decisions govern this phase.

The starting concept is **one substantive public landing page**, with a separately reachable privacy/accountability notice. The notice is a utility destination, not a second marketing experience. A dedicated email address is the working contact mechanism; no contact form is proposed.

The internal prototype may reference Rebar Foundry. The working headline is exactly:

> Exploring change through evidence, experience, and emerging technology.

This is not a final headline. No frontend framework, hosting provider, CMS, database, AI platform, implementation code, or logo is selected or produced.

Evidence / Experience / Exploration remain the core framework. Parkinson's remains the first initiative, not the organizational boundary. The website neither collects health information intentionally nor connects public research material to future private personal data.

## 2. Primary visitor questions and message hierarchy

### Level 1: Understand in roughly 20 seconds

The opening content must communicate these together, without depending on navigation, a diagram, or scrolling through an origin story:

1. The Emergent Collaborative is an early-stage initiative.
2. It explores scientific evidence, lived experience over time, and emerging technology together as a question, not an established integrated service.
3. Parkinson's is its first initiative.
4. It is not a clinical service and does not provide diagnosis or treatment advice.

The companion prototype's introductory copy is approximately 60 words including the name, stage label, working headline, first-initiative cue, and medical boundary, excluding navigation and action labels. That is a design hypothesis for the 20-second goal, not a measured comprehension result or a requirement to fit every word above the fold on every device.

### Level 2: Establish meaning and trust

Explain the question being explored, distinguish Evidence / Experience / Exploration, show why Parkinson's comes first, and give the short origin. Make current maturity visible.

### Level 3: Enable informed participation

Offer concrete ways to critique or help, show what an email should contain, and explain what not to send. Provide privacy, publication responsibility, and a correction route.

### Level 4: Provide depth without implying a platform

Allow readers to inspect source context, status definitions, and conditional future possibilities. Do not turn those possibilities into six products, a release roadmap, or a technical architecture.

## 3. Proposed structure and section order

The P-identifiers below are shared with the prototype and are not proposed public navigation labels.

| Order | Unit and proposed heading | Role in the narrative | Requirements covered |
|---|---|---|---|
| P0 | Masthead and page navigation | Identify the initiative and provide direct section access. | AUD-01; A11Y-01-02 |
| P1 | Exploring change through evidence, experience, and emerging technology. | Establish purpose, early stage, first initiative, and non-clinical boundary immediately. | SEC-01; OUT-01-03 |
| P2 | Why look at change over time? | Frame an open question, not a claim that data integration solves health problems. | SEC-02; CNT-04 |
| P3 | Evidence. Experience. Exploration. | Explain the three concepts together, with distinct interpretations and limits. | SEC-04; CNT-05-09 |
| P4 | Parkinson's: our first initiative | Give the inquiry a specific first focus while keeping broader intent explicit. | SEC-05; BND-03 |
| P5 | How the question began | Connect emerging-technology work, software, Parkinson's, cycling, and experiments to the shared mission. | SEC-03; CNT-02-03,10 |
| P6 | What exists today | Separate verified documentation/content work from proposed future capabilities. | SEC-06; STS-01-05 |
| P7 | Help shape the next questions | Explain contribution options, then contact boundaries and the email route. | SEC-07; COL-01-07,10 |
| P8 | Sources and context | Give cited claims identifiable sources and allow return to the reading location. | CNT-05-07 |
| P9 | Responsibility and corrections | Make ownership, review dates, notices, and correction access discoverable. | SEC-09; CNT-11-12 |
| U1, separate utility destination | Privacy and contact information | Explain actual correspondence and operational data handling before a visitor emails. | SEC-08; PRV-01-10 |

P3 contains three consecutive subheadings: Evidence, Experience, Exploration. All three explanations remain in the normal reading flow, including on mobile.

### Why this order

The mission comes before the founder. The three concepts precede the Parkinson's detail so visitors have a framework for interpreting it. The Parkinson's section then makes the mission specific before the origin provides human context. Current work precedes the participation invitation so the visitor can judge maturity before contacting the project.

The origin is visible and substantial enough to explain motivation but does not become the primary organizing device. Readers who want it first can use the section map.

Sources follow collaboration to keep the invitation within the main narrative. This does not separate claims from support: inline references at each claim lead directly to the relevant source entry, with a return link. Source inspection never requires scrolling through collaboration first.

## 4. Navigation model

### Primary navigation

Use four descriptive, same-page links:

| Label | Destination | Reason |
|---|---|---|
| Our approach | P3: Evidence / Experience / Exploration | Leads to an explanation rather than an abstract product category. |
| Parkinson's initiative | P4 | Makes the first focus easy to find. |
| Current work | P6 | Supports credibility checks and contributor orientation. |
| Collaborate | P7 | One consistent participation destination. |

The text organization name returns to the introduction. It is not a logo proposal.

### Secondary navigation

After the introduction, include a compact **"On this page"** list for Why change over time, Our approach, Parkinson's initiative, Origin, Current work, Collaborate, and Sources. This provides an alternative to linear scrolling without adding all links to the masthead.

Recommend no sticky header for the starting concept. On narrow screens, allow the four primary links to wrap into readable rows rather than requiring a hamburger menu. The secondary list can be vertical. Both should have distinct accessible labels so repeated links are understandable.

Provide a skip-to-content action before repeated navigation. Do not auto-scroll readers between sections or use scroll position to lock navigation. Section links should work as normal destinations, support direct linking and browser back, and land with the target heading visible. Any later active-section treatment must not rely on color alone.

### Contact link behavior

Masthead and hero collaboration links go to P7, **not directly to an email application**. The direct email action occurs only inside the warning-and-privacy context in P7. Footer and utility-page contact links also return to that complete context.

This adds one deliberate orientation step instead of exposing an email icon that bypasses the disclosure warning.

## 5. Visitor journeys

These are proposed task paths, not mandatory funnels or diagnosis-based personalization.

| Audience | Typical question | Short route | Optional depth | Successful endpoint |
|---|---|---|---|---|
| Person with Parkinson's, caregiver, or family member | Is this relevant, and is it asking for my health data? | P1 purpose/boundary → P4 first initiative → P7 contribution/privacy context. | P3 explains lived experience; P5 gives motivation. | Understands the limits and can offer feedback on clarity or questions without sharing a medical history. |
| Researcher or methodologist | Is the inquiry scientifically serious? | P1 → Our approach/P3 → P6 current status. | P4 discovery question → claim-level references/P8 → U1. | Can identify an assumption or method to critique and send a scoped project inquiry. |
| Healthcare professional | Will patients mistake this for clinical guidance? | P1 non-clinical statement → P3 boundaries → P4 scope. | P6 actual maturity → P9 accountability. | Can assess the framing and use P7 to flag a misleading claim or offer review. |
| Software, AI, data, or device professional | What exists and what could I realistically help with? | P1 → Current work/P6 → P7. | P3 Exploration and optional proposal detail; no invented stack or task backlog. | Understands that the current artifact is documentation/content, not a deployed platform, and can propose bounded feasibility input. |
| Advocacy organization, university, or institutional collaborator | Does this complement existing work, and who is responsible? | P1 → P4 → P6 → P9. | P5 origin; U1 handling details. | Can discuss a specific possible collaboration without inferring an existing partnership or study. |
| Potential donor, sponsor, or company | What would support contribute to, and is the project accountable? | P1 → P6 → P9. | P7 project conversation; U1 before emailing. | Understands stage and ownership; no payment path or unsupported funding package is implied. |

A returning reader can jump directly to P6 or P7. A reader entering at P4 or P6 should still find a concise stage/boundary cue locally and a way back to the introduction.

## 6. One-page rationale and alternatives

### Recommended: One narrative landing page plus a privacy utility notice

The content currently supports one common story and one action. Keeping it together reduces context switching and helps visitors see the distinctions between the three concepts rather than treating them as unrelated products.

The risk is page length. Address it with short core paragraphs, descriptive headings, direct links, a section map, and restrained optional detail. A one-page site is not inherently more accessible; its actual reading and navigation behavior must be evaluated.

Separating the privacy notice gives it a stable destination, room for precise operational disclosures, and a clear route back to contact without forcing legal detail into the primary narrative. A short privacy summary still appears next to the email action.

### Small multi-page alternative considered, not recommended now

Possible split: **Overview** containing P1-P5; **Current work and collaboration** containing P6-P9; the same U1 utility notice. This adds no capability and could help if even a restrained version makes section finding or reading recovery difficult.

It also separates credibility information from the initial explanation and makes visitors change pages to complete the participation journey. There is no audience evidence yet that its benefits outweigh that cost.

Reconsider only if prototype review reveals persistent orientation or fatigue problems that shorter copy and direct links do not resolve. Compare task completion and comprehension on equivalent content; do not split merely because there are many headings.

### Other alternatives considered and rejected

| Alternative | Why rejected at this stage |
|---|---|
| Separate Evidence, Experience, and Exploration pages | Makes the distinctions harder to compare and inflates a conceptual framework into apparent products. |
| Separate pages or entry gates for each audience | Duplicates the mission and encourages unnecessary role/diagnosis classification. |
| Founder-story-first homepage | Delays purpose and scientific boundaries; turns shared inquiry into a biography. |
| Six-product catalog for Research, Intelligence, Capture, Connect, Analytics, Initiatives | Gives proposals the appearance of a functioning suite and expands perceived scope. |
| Accordion-only or tabbed main content | Hides essential meaning, risks missed boundaries, and adds unnecessary interaction. |
| Contact-first splash page | Encourages email before visitors understand maturity and disclosure limits. |

## 7. Progressive disclosure

| Layer | Content | Presentation principle |
|---|---|---|
| Immediate | Purpose, early stage, first initiative, non-clinical boundary. | Visible introductory text, not a tooltip, modal, carousel, or expandable notice. |
| Core narrative | Why, all three concepts, Parkinson's, concise origin, current work, participation. | Normal reading order with headings; essential limits remain visible. |
| Supporting depth | One further sentence of methodological context, status definitions, conditional future directions. | Short subordinate paragraphs or clearly labeled secondary links. Start with visible text rather than accordions. |
| Source depth | Citation identity, relevant context, limitations, and original source. | Claim-level reference → P8 entry → external source; return to claim available. |
| Operational detail | Responsible operator, processing, recipients, retention, deletion limits. | U1 utility notice, linked before the email action and from the footer. |

Do not hide early stage, proposal status, medical boundaries, or health-disclosure warnings as optional detail. In the prototype, "Optional supporting detail" is an editorial choice for review; it is not an instruction to build an expander.

## 8. Collaboration, privacy, and accountability placement

### Collaboration

- Masthead: Collaborate section link.
- Introduction: **Explore ways to contribute**, leading to P7; secondary reading action leads to P3.
- P6: **Help shape the next step**, also leading to P7.
- P7: contribution examples → project-only/no-health-details warning → privacy link and short handling caveat → readable dedicated email address and action → suggested short message.

Use one address for collaboration and corrections unless an operational need is later approved. No form, role selector, attachment control, scheduling widget, or subscription is designed.

The email action may open the reader's mail service; the visible address must also be selectable/copyable. No automatic subject/body template is necessary. Do not show a sent-success state on the website: opening a mail application does not prove sending, delivery, or reading.

### Privacy

P7 states that email exposes the sender's address and message to the email services involved, that health records are not requested, and that detailed handling information is available before contact. It does not claim anonymity, end-to-end protection, or zero data collection.

U1 and the footer remain directly reachable without sending email or agreeing to anything. U1 links back to P7 and the introduction. Public research material and private correspondence remain separate; future health records have no place in this first-release content or interaction model.

### Accountability

P9 provides the responsible publication party/role, truthful review date, accurate organizational description, correction route, and relevant relationship disclosure. Final names and operational facts are not invented in the prototype.

U1 houses detailed operator and processing information. A short footer cannot substitute for it. No "scientifically reviewed" badge is used without an actual verified process.

## 9. Mobile-first reading and accessibility

Begin with a single linear reading order shared by all screen sizes. Do not introduce desktop-only context, alternating reading columns, horizontally scrolling concept cards, or a visual timeline that breaks the origin's sequence.

The introductory definition, stage label, first-initiative cue, and non-clinical sentence stay adjacent in that order. The long working headline may wrap naturally; it must not force the definition below a decorative image or a full-screen hero.

On mobile, Evidence, Experience, and Exploration are consecutive headings, not swipeable tabs. Current work separates the verified internal draft from future ideas with visible text. The warning precedes the email address in both visual and assistive-technology reading order.

Design to the approved WCAG 2.2 AA requirements, including:

- Logical headings and landmarks, keyboard-operable section links, visible focus, and a skip link.
- Text resizing, text-spacing tolerance, and reflow at 320 CSS pixels without page-level horizontal scrolling.
- Generous navigation and citation targets; status and classification never conveyed only through color.
- Descriptive source links rather than tiny numeric-only tap targets. Source references and return links have meaningful names.
- No hover-only details, mandatory motion, timed reading, autoplay, or automatic email launch.
- Normal readable text and manually selectable email; a copy button is not necessary to complete the task.
- No reliance on a photograph, diagram, or color system to communicate purpose or scientific boundaries.

The roughly 20-second introduction is a comprehension-review activity, not a timeout imposed on readers. No conformance or audience-success result is claimed by these documents.

## 10. Evidence and source presentation

Use the three concepts as conceptual framing, not scientific quality scores.

Within copy, distinguish **our question**, **founder perspective**, **proposal**, and **published finding** with explicit words. Do not put an "Evidence" badge on the founder's account. A published finding would identify its source and limitations; it would not become universal advice.

The prototype deliberately avoids treatment-effect claims. Its optional Parkinson's variability sentence is marked with **SOURCE-PD-01**, an unresolved scientific citation placeholder, not a real reference. If retained, that sentence needs a suitable source and review before publication. It may be removed without losing the initiative's purpose.

P8 presents any retained source with descriptive title, author/organization, year, source type, original link/identifier, relevant context/limitations, and a return link to the claim. The internal editorial record retains the additional provenance fields required by CNT-06.

Founder narrative is grounded in GENESIS.md and founder confirmation, not passed off as a scientific citation. Requirements documents establish project decisions, not medical evidence. Do not cite the brief as scientific support.

In the internal prototype, source placeholders and unavailable fields remain explicitly marked. Public release must resolve or remove them; never fabricate a DOI, study result, reviewer, or access date. A source list is not an invitation to build literature search or ingestion.

## 11. Current-work and status presentation

### Verified in this phase

The founding brief and website requirements exist and have founder approval as strategic/requirements baselines. This phase produces a written IA and internal content prototype. Those are documentation artifacts, not an application.

The proposed public status item is **Website content and structure — Prototype (internal written draft)**. It identifies what can actually be inspected and states that it is not a working website or research tool. Verification date for these documentation facts is 2026-10-18; operational publication dates must reflect later actual review.

Founder is the decision authority. A future public maintainer or contact operator has not been assigned by this document.

### Proposed, not verified as implemented

Research-source organization, source-linked research assistance, personal capture/integrations, and longitudinal analysis remain conditional ideas. Group these in one subordinate **Possible later directions** paragraph, not launch-ready cards with buttons. Mark implementation status unverified internally.

Use the PRD labels Idea, Prototype, Active development, Experiment, and Operational only with their defined meanings. The current prototype does not need to display all five labels or a maturity ladder. Documentation approval is not evidence of software operation or clinical validation.

For any later current-work item, show name, status, scope/limitation, and verification date; maintain its owner and substantiation in the editorial record. Link an artifact only when it is genuinely available and permitted for public use. Do not link the internal prototype as though it were an available service.

## 12. Prototype review and refinement

The companion document is the low-fidelity content prototype created **before audience-review sessions**. Its draft blocks are intended to be read as website copy; editorial annotations are separated from them.

Use the PRD's review protocol to examine purpose, maturity, non-clinical interpretation, Parkinson's role, and safe participation. Add targeted questions about whether the origin earns its place, whether current work appears more mature than intended, and whether readers can find source context and return.

Review the introductory copy first without navigation coaching. Then allow open reading and direct links. Do not ask for health histories. Record confusion rather than claiming the 20-second or four-of-five targets have already been met.

Refine the prototype after review. Audience scheduling does not invalidate this initial artifact, but unresolved serious medical misunderstandings remain a barrier to public release under the PRD.

## 13. Founder decisions before visual design

The approved one-page starting concept, email mechanism, internal Rebar Foundry reference, exact working headline, and prototype-before-review sequence are not being reopened.

| Decision | Recommended direction | Boundary |
|---|---|---|
| Narrative order | Approve P1-P9, with the framework before Parkinson's, origin after it, and current work before collaboration. | Can be refined after audience review; do not start styling an unsettled hierarchy. |
| Navigation labels and depth | Four primary section links plus a secondary section map; no sticky header or required mobile menu. | The interaction details remain subject to accessibility review. |
| Introductory package | Keep the exact working headline with the short definition, first-initiative cue, and visible non-clinical statement. | Approves the package for design exploration, not a final headline or proven 20-second result. |
| Origin treatment | Use the concise third-person story in P5 and no separate biography page or prominent founder portrait requirement. | Permission for internal mention is established; public wording/assets still need publication approval. |
| Current-work visibility | Show the internal content/structure prototype as documentation only; keep future capabilities subordinate and explicitly proposed. | Additional capabilities require founder-supplied verification before being presented as current. |
| Participation emphasis | One collaboration destination; show contribution examples without promising staffed tasks, employment, a study, or clinical review. Direct email only after warning/privacy context. | Actual address/operator and response expectations remain launch facts, not invented design decisions. |
| Supporting depth | Keep core explanations visible, omit the optional medical-context sentence unless useful, and avoid accordions initially. | Retained scientific content needs sources and review, not decorative citation placeholders. |
| Privacy/accountability arrangement | One separate privacy utility destination, local contact summary, and concise accountability footer. | No second marketing page; actual operator, retention, and processor details must be resolved before release. |

Final copy permissions, real email address, contact handling/retention, operator identity, relationship disclosures, and scientific-source resolution remain later publication gates. They can be represented by clearly marked internal placeholders during visual exploration.

Approval of these UX choices does not authorize a framework, hosting provider, CMS, database, AI platform, production implementation, or logo design.
