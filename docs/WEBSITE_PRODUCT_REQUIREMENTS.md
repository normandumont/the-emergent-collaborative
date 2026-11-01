# The Emergent Collaborative: Website Product Requirements

## Founder clarification — 29 October 2026 (current acceptance addendum)

The current Meridian Station website must explicitly describe the intended
AI-assisted Parkinson's knowledge resource and longitudinal-data direction,
not only a generic exploration of questions. This founder clarification supersedes
the overly conservative, purely hypothetical interpretation of the historical
baseline below; it does not authorize implementation of platform features.

| Acceptance addition | Traceability | Observable pass condition |
|---|---|---|
| Specific purpose | AC-02/04; SEC-01/04/05 | P1 contains the founder's research-and-technology definition, final headline, first initiative, intended AI knowledge resource, longitudinal direction, current limits and nonclinical boundary. |
| Epistemic and product roles | AC-04/07 | P3 retains consecutive Evidence / Experience / Exploration modules followed by Research Assistance, Longitudinal Understanding and Initiatives as explanatory headings, without extra products/navigation. Citations, provenance, uncertainty, missingness and measurement limits remain visible. |
| Concrete first initiative | AC-04/07/08 | P4 describes credible source-linked research explained for patients/families and questions for professionals; movement/exercise/sleep/symptoms/environment are future justified observations, not current collection. No diagnosis, prescription or replacement care. |
| Origin and honest status | AC-05/08; STS-01/02 | P5 names Ride for Parkinson's as awareness/technology catalyst. P6 distinguishes prior supported artifacts, current static website, actively developing direction and future implementation. The dated PH-17 revision is exact; no working AI/native-app/clinical-study/ride-completion claim. |
| Safe collaboration | AC-09/12 | Research, technical, lived-experience, design, accessibility and methodological input is invited without health stories; unchanged warning/privacy/email/guidance/response order. |
| Visual safety | AC-13/14 | Only restrained non-text royal-blue markers are added; actual pairing passes 3:1. Approved local fonts, teal actions, full text sizes and unchanged 320/390/768/1440px normal/200% non-clipping guards remain. |
| Release boundary | AC-11/12/15/18 | Only PH-04/10/11/13/14 remain open; noindex/robots and unchanged failing production checker remain. Existing verification preview is not permission to update it or proof of host privacy facts. |

The public website remains informational and collaborative. Source review supports
prior ride prototypes but not an available Meridian research platform. Public
research and future private data remain separate. No collection, runtime AI,
database, accounts, SDK, remote assets, deployment or domain change is authorized.
The [implementation plan](IMPLEMENTATION_PLAN.md#18-ride-product-alignment--29-october-2026)
records evidence, tests and remaining manual/hosted review; no audience or conformance
result is inferred. All historical requirement IDs and reasoning below are retained.

> Historical requirements baseline for the project now named **Meridian Station**.
> Original naming, provisional-copy and mechanism decisions below record this phase.
> Later approvals, including the final headline, email-only contact and remaining
> five PH gates, are recorded in [RELEASE_READINESS.md](RELEASE_READINESS.md).
> Existing requirement IDs and scientific/privacy/accessibility boundaries remain applicable.

**Date:** 2026-10-18  
**Stage:** Product requirements; input to UX and information architecture  
**Decision authority:** Founder  
**Status:** Proposed requirements derived from the approved strategic brief and founder adjustments; not approval to implement or publish.

## 1. Authority, terminology, and decision boundaries

This document translates [GENESIS.md](GENESIS.md) and the approved [Founding Product Brief](FOUNDING_PRODUCT_BRIEF.md) into requirements for the first public website, subject to the founder's 2026-10-18 adjustments. [AGENTS.md](../AGENTS.md) remains a project constraint. The adjustments take precedence over conflicting recommendations in the brief, including its illustrative ordering of audience conversations and prototype creation.

**Phase 1 website** means the first public informational and collaboration release, not any future medical, personal-data, or research-assistance platform. **Content prototype** means a nonfunctional, low-fidelity representation of the site's explanation and participation pathway.

Requirement IDs provide traceability. **Must** identifies a release requirement if this document is approved; **should** identifies a recommendation that may be changed with an explicit rationale. Proposed numerical targets are identified as such and require approval; none are reported results.

Page/section names below describe required content capabilities, not approved navigation, layout, route structure, or a fixed page count. UX/information architecture work must determine grouping, sequence, labels, and progressive disclosure. No frontend framework, hosting provider, logo, or final architecture is selected here.

### 1.1 Founder-confirmed constraints

| ID | Constraint |
|---|---|
| BND-01 | The first release is a public informational and collaboration website, not a medical platform. |
| BND-02 | Retain **Evidence / Experience / Exploration** as the core conceptual framework. |
| BND-03 | Retain **"Parkinson's: our first initiative"** as a prominent message. Typographic apostrophe choice does not change the required wording. |
| BND-04 | Preserve strict separation between public research information and any future private personal data. |
| BND-05 | Phase 1 must not implement accounts, health-data collection, symptom logging, AI chat, device integration, or personalized medical interpretation. |
| BND-06 | The origin must visibly connect the founder's emerging-technology background to the initiative without becoming biography-centered. |
| BND-07 | "Better questions. Grounded exploration." remains provisional; evaluate stronger alternatives rather than treating it as approved copy. |
| BND-08 | A low-fidelity content prototype may precede audience sessions. Feedback refines the prototype; completed sessions are not a prerequisite for creating it. |
| BND-09 | This phase must not produce site code, select a frontend framework or hosting provider, or design a logo. |

## 2. Product outcome and success model

**Purpose:** Give visitors an accurate understanding of why The Emergent Collaborative exists, what it is exploring, why Parkinson's comes first, what actually exists today, and how to contribute safely.

**Primary conversion:** A visitor identifies a meaningful contribution and can initiate an informed collaboration inquiry through one approved, monitored route. An inquiry is not research enrollment, clinical consultation, employment, or a partnership agreement.

**Primary success signals:** Comprehension, correct expectations, discoverable participation, and credible presentation. Visitor counts, time on page, contact volume, and enthusiastic comments alone do not establish success.

| ID | Outcome requirement |
|---|---|
| OUT-01 | The introductory content must allow a first-time visitor to understand the purpose and current stage in approximately 20 seconds without technical expertise. |
| OUT-02 | Visitors must be able to distinguish present work, proposals, personal motivation, research findings, and experimental possibilities. |
| OUT-03 | Visitors must be able to recognize the non-clinical purpose without finding a legal notice first. |
| OUT-04 | Visitors must be able to identify a contribution that does not require disclosing a diagnosis, health record, or personal longitudinal dataset. |
| OUT-05 | The site must establish an accountable publication/corrections route without implying a larger team, legal entity, clinical service, or institutional endorsement than actually exists. |

The website is not intended to demonstrate a medical outcome, establish causal relationships, validate sensors, prove demand for a platform, or enroll a cohort.

## 3. Target audiences and primary user goals

Priorities follow the brief. They distinguish communication needs, not entitlement to participate. Do not create a diagnosis-based visitor classification or six competing primary conversion funnels.

| Priority | Audience | Primary goals | Required support |
|---|---|---|---|
| 1 | People with Parkinson's, caregivers, and families | Understand the idea, its limits, and whether their perspective can help. | Plain language, accessible reading and controls, respectful treatment of lived experience, no request for medical history. |
| 2 | Researchers, movement scientists, and methodologists | Assess whether the question and proposed approach are scientifically responsible. | Evidence boundaries, source provenance, open questions, project maturity, and a way to offer critique. |
| 3 | Healthcare professionals | Determine whether the project respects clinical judgment and avoids misleading patients. | Clear non-clinical role, bounded claims, and requests for review that do not imply an existing advisory relationship. |
| 4 | Software, AI, data, and device professionals | Identify a real problem, current artifacts, constraints, and a plausible contribution. | Accurate status, meaningful technical context where verified, named decision responsibility, no invented stack or open task. |
| 5 | Advocacy organizations, universities, and institutional collaborators | Evaluate relevance, accountability, and possible complementarity. | Honest organizational status, boundaries, and a scoped conversation pathway without partnership claims. |
| 6 | Potential donors, sponsors, and companies | Understand maturity and what future support might enable. | Accurate work descriptions and relationship disclosures; no donation transaction or unsupported funding promise. |

| ID | Cross-audience requirement |
|---|---|
| AUD-01 | All essential information must be publicly readable without registration, payment, diagnosis disclosure, or contacting the founder. |
| AUD-02 | Explain technical terms on first use; optional detail must not displace the plain-language explanation. |
| AUD-03 | Participation examples must include lived-experience feedback, scientific/methodological critique, and technical/content contributions. Mark an example as a possibility unless it is an actual current request. |
| AUD-04 | Do not assume all people with Parkinson's have the same needs or that the founder represents the wider community. |

## 4. Page and section requirements

A single substantive public page with reachable notices is the recommended minimum baseline from the brief. UX may propose a small multi-page alternative if it improves comprehension or accessibility without expanding product scope. A platform catalog, six-product navigation, or a page per audience is not required.

| ID | Content unit | Purpose and primary message | Required content | Desired user action |
|---|---|---|---|---|
| SEC-01 | Introduction / home | Explain what this is and its current stage. | Organization name, clear definition, provisional headline, supporting statement, early-stage informational purpose, Parkinson's first-focus cue, collaboration entry point. | Understand the purpose and continue or explore collaboration. |
| SEC-02 | Why it exists | Explain the proposed problem without claiming it has been solved. | Difficulty interpreting disconnected research and observations; why change over time can matter; limits of simply collecting more data. | Understand the question being investigated. |
| SEC-03 | Origin | Show why this founder is pursuing the question. | Software background, formative emerging-technology work, and the connection to Parkinson's, cycling, and the awareness-ride technology, subject to publication permission. | Understand motivation, then return to the shared mission. |
| SEC-04 | Evidence / Experience / Exploration | Establish the conceptual and scientific boundaries. | All three names, plain-language explanations, provenance expectations, uncertainty, and distinction between personal pattern and causal medical proof. | Recognize what kind of statement is being made. |
| SEC-05 | Parkinson's initiative | Make the first focus concrete without defining the entire organization's boundary. | "Parkinson's: our first initiative," reason for this focus, current discovery stage, and the question being refined rather than invented research results. | Consider a question or critique they could contribute. |
| SEC-06 | Current work and future possibilities | Make actual maturity inspectable. | Founder-confirmed current activity, dated statuses, limitations, permitted artifacts where available; visually and verbally distinct future proposals. | Inspect genuine work or understand what remains proposed. |
| SEC-07 | Collaborate / contact | Enable one realistic next action. | Contribution examples, current asks if verified, contact method, handling expectations, privacy link, health-disclosure warning, and non-clinical boundary. | Initiate a suitable inquiry or submit a correction. |
| SEC-08 | Privacy notice | Explain actual information handling before contact. | Responsible party, processing inventory, recipients, purposes, retention, deletion route/limits, logging and third-party disclosures, effective/review date. | Decide whether and how to contact the initiative. |
| SEC-09 | Accountability / notices | Make responsibility and correction discoverable. | Accurate operating description, publication owner or responsible role, contact/corrections route, review date, non-clinical purpose, and relevant relationship disclosures. | Verify accountability or request correction. |

Content units may be combined without losing required meaning. There must be a direct way to reach collaboration and privacy information from every public page. Sources must be reachable from the claims they support; a generic resources page does not substitute for claim-level references.

### 4.1 Framework content

| Concept | Required explanation | Misinterpretation to prevent |
|---|---|---|
| Evidence | Published research must be interpreted in context, including methods, population, limitations, and uncertainty where relevant. | A citation, peer review, or publication alone guarantees truth or applicability to an individual. |
| Experience | Personal observations over time can inform questions and hypotheses. Structured patient-reported information can contribute to research under appropriate methods. | One person's observation establishes causation, or lived experience has no legitimate research value. |
| Exploration | Emerging tools and methods are candidates to investigate, with explicit questions and limitations. | Experimental technology is established medical treatment or already available functionality. |

The concepts are not equivalent grades of proof and need not be separate pages or products.

### 4.2 Current-state fallback

If implementation status remains unverified, the prototype must mark it as **"Proposed; implementation status unverified"** or an equally explicit internal placeholder. Before public release, either confirm the status or describe only the proposal, without claiming knowledge of ongoing development.

If no publishable software artifact is confirmed, SEC-06 can explain the current discovery and content-definition work. It must not fabricate a product inventory or claim that no previous work exists.

## 5. Content requirements and editorial controls

| ID | Requirement |
|---|---|
| CNT-01 | Lead with the shared purpose and visitor's question, not a biography or technology list. Use the approved strategic definition as the baseline; final wording remains subject to review. |
| CNT-02 | In the origin unit, explicitly connect decades of software work and formative emerging-technology exploration to the present initiative. Rebar Foundry and the dot-com-era context may be named only after founder approval of that wording. Do not imply corporate affiliation or endorsement. |
| CNT-03 | The origin must be a bounded account that ends by connecting personal motivation to broader inquiry. Exclude a career chronology, unrelated achievements, resume-style inventory, and detailed medical history. Proposed working limit: 150-250 words for the core narrative, subject to copy review. |
| CNT-04 | Explain longitudinal thinking as considering change and context over time, not proof that continuous measurement is necessary or that a longer record establishes causation. |
| CNT-05 | Every substantive scientific claim must have a traceable source close to the claim, bounded wording, and review appropriate to its consequence. Qualify or omit claims that cannot be supported. |
| CNT-06 | Maintain an editorial source record with claim/text location, source title, author or responsible organization, publication/update date where available, stable identifier or URL, relevant passage/location, source type, access/review date, material limitations, reviewer, and reuse permission where applicable. Do not invent missing metadata. |
| CNT-07 | Public references must let the reader identify and open the source. Explain when linked material is an abstract, preprint, paywalled source, or otherwise limited where that distinction affects the claim. Do not reproduce full text or imagery without appropriate rights. |
| CNT-08 | Distinguish founder perspective, hypothesis, research finding, proposal, and implemented capability through explicit language. Text, not color alone, must communicate the distinction. |
| CNT-09 | Do not diagnose, recommend individualized treatment, promise outcomes, imply proven benefit, or portray AI as a clinician. The actual content and calls to action must respect this boundary; a disclaimer is not a substitute. |
| CNT-10 | Founder approval is required for public personal narrative and assets. Third-party names, images, stories, logos, affiliations, and quotations require appropriate permission and factual verification. Do not publish raw ride traces or identifiable health datasets. |
| CNT-11 | Show a truthful content-review date and identify publication responsibility. Material corrections must be reviewed and reflected in the affected content; do not make stale project information appear freshly verified through unrelated page updates. |
| CNT-12 | Describe the initiative's actual legal and organizational status. Do not invent a research institute, nonprofit, clinical affiliation, advisory board, staff, funding relationship, or partner. Disclose material relationships if they exist. |
| CNT-13 | Do not promise delivery dates, a clinical study, disease expansion, future services, or contribution opportunities that have not been confirmed. Future capability descriptions must use explicitly conditional language. |
| CNT-14 | Use English as the proposed first-release content baseline. No translation system is required; confirm intended language coverage before approving final copy. |

The brief's existing source register is a discovery reference, not automatic substantiation for every new website claim. A scientific reviewer has not been confirmed. Naming a desired review role must not imply one already exists.

### 5.1 Headline alternatives

The current headline, **"Better questions. Grounded exploration."**, is provisional and comparatively abstract. These alternatives are candidates, not demonstrated improvements or founder-approved copy:

| Candidate | Why it may be stronger | Limitation to examine |
|---|---|---|
| **Exploring health through research, experience, and technology.** | Recommended starting candidate: immediately identifies the domain and approach. | Broad; supporting copy must explain stage and scope. |
| **Where research meets experience, and new questions begin.** | Connects the framework to inquiry without promising answers. | "Meets" must not imply an existing private-data integration. |
| **Understanding change starts with better questions.** | Makes longitudinal thinking more approachable. | Needs an explicit health and Parkinson's supporting statement. |
| **Scientific curiosity. Human experience. Practical exploration.** | Reflects the three concepts and the founder's experimentation ethos. | More distinctive in tone than explicit in purpose. |
| **Research and lived experience. A starting point for exploration.** | Honest about the founding stage and preserves uncertainty. | Less active; evaluate whether visitors understand the invitation. |

**Proposed supporting statement:** The Emergent Collaborative is an early-stage initiative exploring how scientific evidence, lived experience over time, and emerging technology can help people ask better questions about health, beginning with Parkinson's.

Headline evaluation must examine clarity, truthfulness, recall, and unintended medical or operational implications. Do not select solely on aesthetic preference or promise a clinically meaningful improvement. A working candidate can be used in a prototype without becoming the final headline.

### 5.2 Tone and visual-content constraints

Favor precise, curious, human language: investigate, examine, sources, observations, questions, limitations, proposed, prototype. Avoid "AI doctor," "breakthrough platform," "proven results," "revolutionizing care," and unqualified "validated."

The website should feel like a responsible research-and-technology initiative, not a hospital or an AI sales funnel. Avoid stock medical authority cues, glowing robot imagery, invented data graphics, franchise-derived visuals, and sensational health narratives. No logo is designed in this phase.

## 6. Project-status language

| ID | Requirement |
|---|---|
| STS-01 | Every named project/capability described as current must have a visible status, concise scope, limitations, and verification date. Maintain an accountable owner in the editorial record. |
| STS-02 | Founder confirmation and a supporting artifact or factual work record must substantiate claims above the idea stage. Do not expose private artifacts merely to prove status. |
| STS-03 | Use the status vocabulary below; do not use "coming soon," progress percentages, launch countdowns, or "available" without a verified basis. |
| STS-04 | Distinguish future proposals from current work in both wording and presentation. A project card, screenshot, or button must not imply availability that the text denies. |
| STS-05 | Review every displayed current status at release and at a proposed maximum interval of 90 days thereafter. If confirmation is unavailable, mark the verification date and uncertainty explicitly or remove the current-tense claim. |

| Label | Permitted meaning | Required qualification |
|---|---|---|
| Idea | A proposal exists. | No implementation or successful evaluation implied. |
| Prototype | An inspectable, limited artifact demonstrates a specified capability. | State limitations; not a supported product or clinically validated system. |
| Active development | A responsible owner confirms current work on defined scope. | State what is being worked on; do not imply completion or a public release date. |
| Experiment | A question and evaluation method are defined. | State what is being investigated; no positive result or authorized human study implied. |
| Operational | A specified intended use is actually supported with an accountable owner and maintenance expectations. | State the supported scope; operational does not mean medically validated. |

These are not a single maturity ladder: an experiment can use a prototype. An operational artifact outside the website does not authorize an excluded Phase 1 feature.

## 7. Collaboration and contact requirements

The product requirement is one monitored, low-burden collaboration route, not an assumed form backend. A dedicated email address with a readable/copyable address is the recommended minimum; a contact form remains an alternative requiring founder approval and additional handling requirements. Neither mechanism is selected by this document.

| ID | Requirement |
|---|---|
| COL-01 | Provide one clearly prioritized contact action for collaboration, with a route for content corrections through the same channel if practical. It must be available without registration, payment, role selection, or health disclosure. |
| COL-02 | Explain useful contributions: feedback on clarity and questions, scientific/methodological critique, accessible-content review, and technical feasibility input. Only label a task as open if there is an owner able to receive it. |
| COL-03 | Identify a responsible recipient or role and a realistic response expectation approved by the founder. Do not promise an immediate response, clinical answer, placement, funding, or guaranteed collaboration. |
| COL-04 | Before the contact action, state that the channel is for project inquiries, not medical advice or urgent support, and ask visitors not to send medical records, symptom histories, medication details, location traces, or other sensitive health information. Link to the privacy notice at that point. |
| COL-05 | Only contact/reply information and a short project-related inquiry may be requested. Name, organization, role, and links must be optional if offered. Do not request diagnosis, date of birth, caregiver status, health identifiers, or attachments. Do not solicit a free-form personal health story. |
| COL-06 | Contact must not automatically publish content, create a profile, enroll anyone in research, subscribe anyone to marketing, or authorize secondary use. Obtain separate permission before publicly quoting or crediting a correspondent. |
| COL-07 | A mail-based route must display a copyable address, explain that the visitor's mail service is used, and work without a configured default mail application through manual address copying. |
| COL-08 | If a form is approved, it must have accessible labels/instructions, no attachment capability, minimization of fields, explicit field validation, preservation of user input after recoverable errors, and an accessible success/error state. Success must follow actual acceptance by the delivery mechanism, not a click alone; do not claim recipient reading or final mailbox delivery. |
| COL-09 | Any form needs an approved abuse-control approach that does not require solving an inaccessible challenge or unnecessary third-party tracking. Rate limits and failures must provide useful, non-sensitive feedback. |
| COL-10 | Before launch, document handling for accidental sensitive submissions: restrict access, do not forward into public issues, do not use for AI processing, minimize retention, and apply the approved deletion/response procedure. Do not guarantee deletion from systems outside the operator's control. |

Example warning for content review, not final legal copy:

> Contact us about the project or a possible contribution. Please do not send medical records or personal health details. This channel does not provide medical advice and is not monitored for urgent help.

A prototype may use a clearly labeled inactive contact placeholder. Public release may not contain a fake address, an unmonitored inbox, or a success-shaped nonfunctional control.

## 8. Privacy requirements

No intentional health-data collection is permitted in Phase 1. Contact information and operational logs can still be personal data; the site must not claim it collects "no data" merely because it has no accounts.

| ID | Requirement |
|---|---|
| PRV-01 | Maintain an inventory of approved processing for public content, collaboration correspondence, and essential operational/security logs. Record purposes, fields, recipients/processors, access, retention, and deletion limits before launch. |
| PRV-02 | Do not connect the website to private personal records, health repositories, shared personal-data indexes, or future capture systems. Public publication assets must be separate from contact records and any future private-data storage, access controls, and processing. No shared retrieval or AI context is authorized. |
| PRV-03 | Collect only what is necessary for an approved purpose. Do not request sensor, location, camera, microphone, contacts, or health-platform permissions. Do not persist draft messages in browser storage. |
| PRV-04 | Default to no advertising, cross-site tracking, fingerprinting, session replay, marketing pixels, or nonessential analytics. Do not add analytics merely to count inquiries. Any later analytics proposal requires separate approval of necessity, data handling, disclosures, and applicable consent requirements. |
| PRV-05 | Avoid embedded third-party media, remote tracking assets, and third-party font requests. Prefer permitted local assets and explicit outbound links. Review every exception before inclusion; no automatic loading of an unreviewed external embed. |
| PRV-06 | Operational logging must minimize personal information and never intentionally record message bodies or health details. Do not place contact content or sensitive information in URLs or analytics events. Document any unavoidable provider logs and their retention; do not promise anonymity. |
| PRV-07 | Publish an accurate privacy notice accessible before contact. It must identify the responsible operator, categories and purposes of processing, recipients, relevant international processing where applicable, retention periods/criteria, deletion/contact procedure and limits, necessary storage/logging, and an effective date. Determine applicable legal disclosures before publication. |
| PRV-08 | Restrict correspondence and administrative access to authorized operators, with strong authentication where supported. No public repository, public issue tracker, publication pipeline, or model-training workflow may receive private contact material by default. |
| PRV-09 | Set concrete retention and deletion rules before launch, covering mail/form systems, logs, exports, backups, and accidental sensitive submissions as applicable. State limitations honestly and verify operator-controlled deletion procedures. |
| PRV-10 | Approve an incident contact and response procedure proportionate to actual processing. Avoid blanket claims of security, anonymity, HIPAA compliance, GDPR compliance, or research consent. |
| PRV-11 | If audience sessions are conducted, minimize identifiers and notes, explain their purpose and retention, and obtain permission before recording or quoting. Do not ask for health histories or turn UX feedback into research enrollment. Determine appropriate oversight before any formal research activity. |

The privacy notice must describe the mechanism actually selected later. This document does not choose a privacy jurisdiction, lawful basis, processor, consent-management tool, or hosting architecture.

## 9. Accessibility requirements

**Target:** WCAG 2.2 Level AA across all public pages and any project-operated contact interactions. This is a proposed release requirement, not a claim of current conformance or a substitute for usability review. The normative reference is [WCAG 2.2](https://www.w3.org/TR/WCAG22/); the brief provides the discovery rationale.

| ID | Requirement |
|---|---|
| A11Y-01 | Provide meaningful landmarks, descriptive page titles, logical headings, correct reading order, and a way to bypass repeated navigation. Identify page language. |
| A11Y-02 | All actions and navigation must work with a keyboard without traps. Focus must be visible and not hidden by fixed elements. Do not require hover, drag, precision motion, or device movement. |
| A11Y-03 | Meet AA contrast requirements: at least 4.5:1 for normal text and 3:1 for qualifying large text; meet applicable 3:1 non-text contrast requirements. Do not encode meaning only through color. |
| A11Y-04 | Text must resize to 200% without lost content or functionality. Support reflow at 320 CSS pixels wide without two-dimensional scrolling except for genuinely essential content. Support user text-spacing adjustments. |
| A11Y-05 | Meet WCAG 2.2 AA target-size requirements, including applicable exceptions. Prefer at least 44 by 44 CSS pixels for primary controls where feasible to reduce precision demands; this preference is not the AA minimum. |
| A11Y-06 | Use descriptive links, accessible names matching visible labels, meaningful alternative text, and decorative-image treatment. Avoid redundant or medically misleading visual descriptions. |
| A11Y-07 | No autoplaying media, flashing effects, timed reading, or mandatory animation. Any nonessential motion must respect reduced-motion preferences; the baseline should not require motion. Provide captions/transcripts if media is later approved. |
| A11Y-08 | Use clear wording, manageable paragraphs, and explanations for unfamiliar terms. Avoid walls of jargon or relying on a diagram to communicate essential boundaries. |
| A11Y-09 | If a contact form is selected, labels, required-field instructions, errors, status announcements, and recovery must be usable with keyboard and screen readers. Do not ask users to re-enter information unnecessarily. |
| A11Y-10 | Evaluate implemented pages using automated checks plus manual keyboard, zoom/reflow, contrast, and screen-reader review. Include feedback on relevant motor, visual, or cognitive access needs; do not infer needs from a diagnosis. |

Do not claim WCAG conformance from an automated score, a document review, or a low-fidelity prototype. Findings affecting essential tasks must be resolved or prevent release; a waiver cannot be described as AA conformance.

## 10. Nonfunctional requirements

These specify observable outcomes, not technologies. Numerical performance and operating targets below are proposed defaults for founder approval before implementation planning.

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Responsive delivery | Essential content and actions must work from 320 CSS pixels through desktop widths, in portrait and landscape, with no dependency on a particular device or wearable. |
| NFR-02 | Progressive access | Purpose, current-stage information, project statuses, contact address/destination, and privacy notice must remain readable/reachable when optional scripting is unavailable. A form, if selected, must provide a usable alternative when it cannot operate. |
| NFR-03 | Performance | Proposed lab target: across three cold-load mobile runs of every representative page template, median Largest Contentful Paint at most 2.5 seconds and Cumulative Layout Shift at most 0.1, using one documented fixed device/network profile. Record tool/version and asset conditions. Do not represent lab results as real-user field metrics; do not add tracking to obtain them. |
| NFR-04 | Compatibility | Proposed minimum matrix: current stable Chrome, Edge, Firefox, and Safari on desktop where available, plus current Safari on iOS and Chrome on Android, with versions recorded at release. Evaluate core reading/contact tasks, not pixel-identical rendering. |
| NFR-05 | Transport and exposure | Serve public pages and any project-operated submission endpoint over HTTPS without mixed content. Keep credentials, private messages, unpublished health material, and operational configuration out of public assets. Define proportionate browser security policies during implementation. |
| NFR-06 | Reliability and failure | Every published internal navigation, source link, and contact route must be checked at release. Invalid routes must provide a clear recovery path. Submission errors must be explicit without leaking details. Outbound-source failure must not erase the site's explanation. |
| NFR-07 | Maintainability | Keep text, references, and status records editable through a documented process. Identify a maintainer and a content-review process; no requirement for a CMS or dynamic database is implied. |
| NFR-08 | Portability | Retain an exportable, versioned source for content and permitted assets. Document any essential provider-specific dependency and its rationale; do not require multi-cloud operation or a universal abstraction layer. |
| NFR-09 | Findability | Use descriptive titles, a clear organization definition, meaningful link text, and accurate share/search descriptions. Metadata must not contain unsupported clinical claims or private information. Do not use structured metadata implying an unverified medical organization. |
| NFR-10 | Operational ownership | Before launch, name a maintainer, contact recipient, corrections owner, and incident contact; roles may be held by one person. Document update, rollback/recovery, and contact-check procedures appropriate to the final delivery method. |
| NFR-11 | Proportionate operations | Do not promise 24/7 clinical support, an uptime SLA, or response times unsupported by capacity. Approve a contact-check cadence and public response expectation before launch. |
| NFR-12 | Content lifecycle | Proposed default: review statuses and contact information at least every 90 days and scientific content after a material correction/retraction becomes known. Define a way for readers to flag corrections. |

Real-user interaction performance can be investigated later if justified without unnecessary collection. Performance tooling, browser choices beyond the proposed matrix, deployment mechanics, budget, and recovery time objectives remain implementation-planning decisions.

## 11. Explicit exclusions and change control

The first-release scope excludes:

- Accounts, profiles, authentication for visitors, private workspaces, or personal dashboards.
- Intentional health-data collection, symptom or medication logging, diaries, health uploads, location tracking, and research enrollment.
- AI chat, public RAG/search assistants, personalized research answers, individualized medical interpretation, diagnosis, treatment recommendations, or emergency support.
- Device/wearable integration, health-platform access, native capture applications, offline personal-data synchronization, and sensor analysis.
- Public forums, comments, community profiles, data-sharing portals, participant matching, and user-generated publication.
- Newsletter operations, marketing automation, advertising, donation/payment processing, sponsor lead scoring, or tracking-based conversion funnels.
- A production research corpus, ingestion pipeline, vector database, knowledge graph, analytics platform, or generalized multi-disease infrastructure.
- Invented demos/results, testimonials, partner logos, institutional endorsements, or availability claims.
- Framework/provider selection, final cloud design, site implementation, and logo design within this requirements assignment.

Publicly explaining a future possibility is allowed only with clear conditional language; explanation does not authorize implementation. Approved founder narrative may mention health experience but is not permission to publish raw personal records or solicit visitor health data.

Any scope change must state the user need, evidence, privacy/medical implications, ownership, and revised acceptance criteria, and receive founder approval. A contact form is a mechanism decision within scope only if its additional requirements are accepted; it is not permission to add accounts or a general submission platform.

## 12. Acceptance criteria and verification plan

### 12.1 Gates and sequence

1. **Requirements approval:** The founder reviews this document and resolves the UX-entry decisions in section 14.1. Unresolved facts may be visibly marked in an internal prototype.
2. **UX/IA and content prototype:** Propose grouping and journeys, then create a low-fidelity prototype before audience sessions if useful. Do not treat missing audience sessions, final headline selection, or hosting decisions as blockers to prototype creation.
3. **Audience refinement:** Review the prototype, record misunderstandings, and revise it. Results inform the next decision; they are not clinical or market validation.
4. **Implementation authorization:** Approve refined UX/content, implementation requirements, remaining numerical targets, ownership, and privacy/contact decisions. Only then create implementation tasks and choose necessary delivery technology.
5. **Release acceptance:** Verify the implemented site against applicable requirements and launch gates. No release is authorized by this document alone.

### 12.2 Acceptance matrix

Each check must record the reviewed version, reviewer, date, method, result, and unresolved issue. These are future checks, not claims that a website or prototype exists.

| ID | Traceability | Test and pass condition | When |
|---|---|---|---|
| AC-01 | BND-01-09; section 11 | Inspect specification, prototype, and later feature inventory: all nine founder constraints hold; no excluded feature, selected stack/provider, or designed logo appears in this assignment. | Requirements/prototype; repeat scope check before release. |
| AC-02 | OUT-01; SEC-01; CNT-01 | Prototype introduction names the initiative, purpose, current stage, and Parkinson's first focus in plain language. Audience comprehension is separately evaluated under AC-17. | Prototype and final copy. |
| AC-03 | SEC-02-09 | Content inventory maps every required unit to an accessible location and desired action. No unit is silently omitted when sections are combined. Collaboration and privacy are directly reachable from every proposed public page. | UX/IA and release. |
| AC-04 | BND-02-03; SEC-04-05 | Review copy: all three framework names and their boundaries are explicit; "Parkinson's: our first initiative" is prominent and paired with broader organizational intent. No claim of an active clinical study is implied. | Prototype and release. |
| AC-05 | BND-06; CNT-02-03,10 | Origin visibly explains the emerging-technology/software connection, then connects to shared inquiry. No resume-like chronology or unapproved personal/third-party material appears; proposed narrative length is reviewed rather than silently imposed. | Prototype; permission confirmation before release. |
| AC-06 | BND-07; section 5.1 | Prototype record marks the old headline provisional, considers the alternatives, and records a working candidate with rationale. Final publication uses founder-approved copy; no candidate is labeled audience-proven without results. | Prototype and publication approval. |
| AC-07 | CNT-05-09 | Review every substantive scientific claim against its source record and linked passage/context: wording is supported and bounded, source is identifiable, material limitations are stated, and required review is recorded. Unsupported claims are removed or rewritten before release. | Copy review and release. |
| AC-08 | CNT-10-13; STS-01-05 | Audit every project, image, affiliation, and maturity claim: status/date/owner and permitted substantiation exist; future proposals are unambiguous; no placeholder, unverified operational claim, unauthorized asset, or invented partnership reaches publication. | Release. |
| AC-09 | AUD-01-04; COL-01-06 | A visitor can read essential content and initiate an inquiry without an account, payment, diagnosis, role disclosure, attachment, or health history. Warning, contribution examples, privacy link, and approved response expectation precede contact. | Prototype walkthrough and release. |
| AC-10 | COL-07-09; NFR-06 | Exercise the selected mechanism using synthetic non-sensitive inquiries. For email, copy the address and send a test to the monitored recipient without relying on a default mail app. For a form, verify recipient receipt, rejection/failure, validation, input preservation, accessible status, and configured abuse limits. No click-only success or fake delivery claim passes. | Before launch; no real submission needed for low-fidelity prototype. |
| AC-11 | COL-10; PRV-01,07-11 | Operator walkthrough confirms recipient/access, purpose, concrete retention rules, accidental-sensitive-message handling, deletion limits, and incident route. Public notice matches actual systems and has no unresolved operator/processor placeholders. Use synthetic material, not a real health record. | Before launch. |
| AC-12 | BND-04-05; PRV-02-06,08 | Inspect assets, permissions, configuration, storage, browser network activity, and a synthetic contact flow: no private-data connection, unauthorized health/sensor permission, tracker, draft persistence, public contact-content exposure, or unapproved third-party request is present. Document necessary operational logging. | Implementation review and release. |
| AC-13 | A11Y-01-10 | Automated and manual review covers all page templates and contact states. Verify keyboard/focus, screen-reader landmarks/labels/status, contrast, 200% text, 320px reflow, spacing, targets, and reduced motion. Resolve failures against the approved AA target before claiming conformance or passing this gate. | Prototype for assessable aspects; full implementation before release. |
| AC-14 | NFR-01-04 | Record core-task results across the approved browser/device matrix, narrow viewport, landscape, and optional-scripting-disabled conditions; content and contact alternative remain usable. Record three-run median lab results against the approved LCP/CLS targets. | Implementation and release. |
| AC-15 | NFR-05-06,09 | HTTPS and mixed-content checks pass; public assets contain no private operational material; internal/source/contact links are verified; invalid-route recovery works; search/share text describes actual purpose without unsupported health claims. | Before launch. |
| AC-16 | STS-05; NFR-07-08,10-12 | A named maintainer demonstrates a content/status correction and appropriate rollback/recovery without losing the source record. Versioned content, review cadence, contact-check procedure, and realistic support expectations are documented. | Before launch. |
| AC-17 | OUT-01-04; AUD-01-04; BND-08 | Apply the audience-review protocol below to a prototype, record raw task outcomes and misunderstandings, and revise. Sessions are not required before initial prototype creation. Proposed 4-of-5 thresholds require founder approval before use as a gate. | After initial prototype, before final implementation authorization. |
| AC-18 | OUT-05; CNT-11-12; section 14 | Founder confirms accurate public identity/status, publication owner, final copy/story permissions, and closure of applicable launch decisions. No legal/medical endorsement or compliance status is invented to close an item. | Publication approval. |

### 12.3 Audience-review protocol

Proposed small-sample review: five voluntary sessions spanning lived-experience/caregiver and research/clinical perspectives, with a technical-contributor walkthrough for relevant contribution content. One person may have multiple perspectives; document coverage gaps rather than presenting the sample as representative.

Show the introduction for approximately 20 seconds, then ask open, non-leading questions. Allow unrestricted reading for follow-on tasks; do not turn the whole session into a timed interaction.

| Task | Proposed directional pass target |
|---|---|
| Explain the purpose and current stage in the participant's own words. | At least four of five accurately describe an early-stage informational/collaborative initiative, not a clinical service. |
| Distinguish a current activity from a future proposal. | At least four of five make the distinction without facilitator correction. |
| Explain whether the initiative provides diagnosis/treatment advice. | At least four of five correctly recognize it does not. |
| Identify a realistic contribution and find the contact/privacy information. | At least four of five can do so and understand that health records are not requested. |
| Explain the relationship between Parkinson's and the organization. | At least four of five understand Parkinson's is the first initiative, not the permanent boundary. |

Record any serious medical misunderstanding even if a threshold passes; revise and re-evaluate the affected explanation before release. If participants cannot be reached, record the gap and return the release-review decision to the founder rather than invent results or block initial prototype work.

These sessions provide qualitative usability feedback, not evidence of demand, clinical validity, population-level comprehension, or the value of a future data platform. Do not collect personal health histories to conduct them.

## 13. Dependencies, unresolved facts, and sequencing safeguards

No additional prototype, working research system, contact operator, legal entity, scientific reviewer, capacity commitment, or public artifact was confirmed by the current request. Do not translate strategic approval into factual confirmation of those details.

Prototype dependencies are deliberately lighter than launch dependencies. Draft source records, marked project-status placeholders, synthetic examples, and inactive contact representations may support review. They may not escape into a public release as facts or functional promises.

Audience feedback must refine the content prototype, not be used as a prerequisite that prevents its creation. Framework, hosting, database, AI-provider, and future private-data architecture choices are not UX-entry dependencies. No future-platform infrastructure is necessary to explain the initiative.

## 14. Decisions requiring founder approval

### 14.1 Before UX/information architecture work begins

These are decision requests, not assumed approvals. The founder can authorize the recommended defaults together; factual gaps may remain clearly marked for prototype work.

| Decision | Recommended default | What approval enables |
|---|---|---|
| Approve this requirements baseline and audience/action priorities. | Public comprehension first; one collaboration pathway; no Phase 1 platform features. | Stable task and scope boundaries for UX. |
| Approve the structural starting constraint, not a final sitemap. | Explore one substantive page plus reachable notices; permit a justified small multi-page alternative without adding scope. | Comparison of grouping and navigation options. |
| Approve the contact interaction to represent in the prototype. | One dedicated email route with copyable address; no form unless there is a demonstrated need. An inactive, clearly labeled placeholder is acceptable internally. | A coherent collaboration journey without prematurely committing to a backend. |
| Approve origin emphasis and the boundary for prototype copy. | Brief emerging-technology/software-to-Parkinson's story, no career chronology; use approval markers for personal details and named Rebar Foundry wording not yet cleared for publication. | Faithful origin content without treating private details as publication-ready. |
| Approve handling of unverified work. | Describe discovery work accurately; label future systems as proposals; do not invent artifacts or imply none exist. Founder may supply verified facts later. | A credible current-work unit despite incomplete inventory. |
| Approve headline exploration and a temporary candidate. | Use "Exploring health through research, experience, and technology." as a working candidate alongside alternatives; keep final selection open. | Prototype creation without fixing the final headline. |
| Approve review sequencing and the next work boundary. | Create a low-fidelity content prototype first if useful; then refine through audience feedback. Agree an owner and timebox for UX/prototype work without presuming a delivery estimate. | A bounded next phase that does not wait for completed audience sessions. |

The founder's nine explicit adjustments are already constraints and do not need to be re-decided. Final headline selection, actual contact-system configuration, and completion of audience sessions are not prerequisites for low-fidelity UX exploration once the above working approach is approved.

### 14.2 Before implementation authorization, not before UX exploration

Approve the refined information architecture, content prototype, final requirements and numerical targets, accessibility target, audience-review coverage/handling of findings, delivery capacity/budget, browser matrix, performance test profile, operating roles, contact mechanism, and privacy/logging requirements. Confirm whether English alone covers the first release.

Choose a framework or hosting provider only in a separately authorized implementation-planning phase, based on these requirements and maintenance needs. No choice is made or implied here.

### 14.3 Before public release

Confirm the responsible operating party/jurisdiction and accurate organizational description; monitored contact and response expectations; actual processing/processor inventory and privacy notice; retention/deletion and incident procedures; verified statuses and permitted artifacts; approved personal story/assets and final headline; scientific sources/review where needed; operational ownership; and evidence for the release acceptance criteria.

If those facts remain unresolved, keep the work as an internal prototype rather than publishing misleading placeholders or bypassing the relevant gate.
