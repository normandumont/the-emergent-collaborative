# The Emergent Collaborative: Founding Product Brief

## Founder clarification — 29 October 2026 (current direction)

Meridian Station is a research and technology initiative exploring how scientific
evidence, personal experience over time, and emerging technology can help people
understand complex health questions, beginning with Parkinson's disease. The
founder has now explicitly confirmed the intended AI-assisted Parkinson's knowledge
resource and longitudinal-data direction. This supersedes any interpretation of
the discovery record below that reduces that direction to unspecified hypothetical
ideas. It does not erase the earlier uncertainty about implementation status.

Research Assistance means source-linked discovery, comparison and explanation with
provenance, citations, limitations and uncertainty, for patients and families learning
and preparing questions for healthcare professionals. Longitudinal Understanding
means responsibly investigating contextual observations over time, potentially
movement, exercise, sleep, symptoms and environmental conditions; patterns are
questions, not proof of causation. Initiatives begin with Parkinson's without a
promise of disease expansion. These are related directions, not three products.

Ride for Parkinson's was an awareness and practical technology catalyst, including
tracking prototypes and the educational AI-resource intent. Local ride-site source
review substantiates the limited artifacts, not a working AI service, completed
ride, operational native app or clinical study. See the dated source/evidence
inventory in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md#18-ride-product-alignment--29-october-2026).
Current work includes this static review website and founder-led definition of
the developing technology direction; the platform is not an available service.
Evidence / Experience / Exploration, public/private separation, evaluation gates,
and every Phase 1 runtime exclusion remain intact.

The original discovery brief below is preserved as history, not rewritten to
suggest that these later decisions or source reviews happened during discovery.

> Historical discovery record. The project is now **Meridian Station**. Original
> naming, proposals and phase limitations below are preserved, not current public
> copy or operating status. Later founder decisions in [RELEASE_READINESS.md](RELEASE_READINESS.md)
> govern; the approved headline is "Finding direction through evidence, experience, and emerging technology."

**Date:** 2026-10-17  
**Stage:** Founding discovery  
**Decision authority:** Founder  
**Review status:** The founder approved the major conclusions and recommended direction before this document was written. Detailed recommendations and acceptance targets below remain proposals unless explicitly identified as project constraints.

## Executive direction

Begin with a credible public introduction and a specific invitation to collaborate, not an implied medical platform.

The first website should explain the purpose, the founder's motivation, the distinction between Evidence, Experience, and Exploration, the Parkinson's initiative, and the actual state of work. It should help visitors understand what exists, what is proposed, what the project cannot do, and how to contribute without submitting health information.

The future platform is a hypothesis to investigate, not a commitment to build six products. Its possible value is not simply collecting more data or adding an AI interface. Its value would be helping people move from a meaningful question to traceable research and carefully interpreted observations, with uncertainty and privacy boundaries intact.

**Recommended first success:** Intended visitors can accurately describe the initiative, distinguish present capabilities from future intent, recognize its non-clinical role, and identify a credible contribution.

**Explicit exclusions:** This assignment creates no application code, selects no frontend framework, finalizes no cloud architecture, designs no logo, and authorizes no collection of personal health data.

### Basis and limitations

This brief follows [AGENTS.md](../AGENTS.md) and [GENESIS.md](GENESIS.md), particularly sections 4, 6, 10-16. Those documents establish intent and constraints; they do not demonstrate demand, operational capabilities, scientific validity, or legal readiness.

The external landscape scan uses the primary sources listed at the end of this document. It is not a systematic literature review, a complete competitor analysis, an accessibility audit, or a legal or regulatory opinion. No user interviews, sensor validation, clinical review, or prototype evaluation were performed for this brief.

The multidisciplinary perspectives are applied throughout:

| Perspective | Founding question |
|---|---|
| Product strategy | Whose problem is sufficiently specific to justify building anything? |
| Research strategy | What question, method, and evidence could support a useful conclusion? |
| UX strategy | Can intended visitors understand the purpose, limitations, and next action? |
| Software architecture | What is the simplest design that preserves the necessary boundaries? |
| AI/RAG architecture | Can retrieval and synthesis demonstrably improve on a simpler baseline? |
| Privacy-conscious review | What information can we avoid collecting, exposing, or retaining? |
| Scientific skepticism | What alternative explanation or missing evidence could invalidate the claim? |

## A. One-sentence definition

### Alternative 1: Balanced and recommended

The Emergent Collaborative is an early-stage initiative exploring how scientific evidence, lived experience over time, and emerging technology can help people ask better questions about health, beginning with Parkinson's.

### Alternative 2: Human-centered

The Emergent Collaborative brings people with lived experience, researchers, and technologists together to explore better ways of understanding research and change over time, starting with Parkinson's.

### Alternative 3: Research and technology-centered

The Emergent Collaborative is an emerging research-and-technology initiative investigating responsible ways to connect published findings, longitudinal observations, and human questions.

Use Alternative 1 for initial positioning. Alternative 2 describes the desired collaboration model, not a claim that a multidisciplinary team already exists. Alternative 3 is useful in technical conversations but is less immediately accessible.

## B. Mission

| Variant | Proposed mission | Tradeoff |
|---|---|---|
| Human-centered, recommended | Help people understand research, make sense of experience over time, and formulate better questions through responsible collaboration and technology. | Accessible and outcome-oriented, but must not imply personalized medical interpretation is already available. |
| Research-centered | Develop transparent, testable ways to examine published evidence alongside longitudinal observations while preserving their distinct scientific roles. | Methodologically clearer, but more abstract for a first-time visitor. |
| Technology-centered | Evaluate and build practical tools that make research and longitudinal information more understandable, traceable, and useful to human inquiry. | Gives builders direction without making AI or any technology the mission. |

The initial site should express the human-centered mission, supported by explicit scientific and privacy commitments. Better understanding is an intended contribution to evaluate, not an established health benefit.

## C. Problem statement

### The underlying problem

The founding hypothesis is that people trying to understand a health question encounter information organized for different purposes: published research, occasional clinical observations, device measurements, and their own day-to-day experience. These sources may be difficult to interpret together.

The problem is not merely that information is stored in different places. Even when information is available, a person may not know:

- Whether a study addresses their question or population.
- What was measured and what the measurement can establish.
- Whether an apparent personal pattern is reliable, coincidental, or confounded.
- Which uncertainties matter enough to discuss with a qualified professional.
- How to contribute an observation or technical skill without overstating its meaning.

These are proposed needs to investigate with intended users, not findings from completed discovery research.

### Initial jobs to be done

| Visitor | Job for the initial website |
|---|---|
| Person with Parkinson's or family member | Understand the idea, its limits, and whether there is a safe, realistic way to help shape it. |
| Researcher or clinician | Assess whether the project respects evidence, uncertainty, participant welfare, and disciplinary boundaries. |
| Technical contributor | Identify a bounded problem, the current state of work, and who can decide what happens next. |

The website's job is orientation and trustworthy participation. It is not yet research search, symptom interpretation, treatment selection, or study enrollment.

### What this project should not claim to solve

It should not claim that combining data establishes causation, that more measurements necessarily improve decisions, that AI resolves scientific disagreement, or that one person's experience generalizes to others.

The founder's experience explains why the question matters to the founder. It does not establish the prevalence of the problem, unmet demand, or effectiveness of a proposed solution.

## D. Opportunity

### What makes a bounded exploration plausible now

1. **Programmatic access to research information.** Europe PMC documents services for publication metadata, references, full-text links, and other literature-related information.[1] This can reduce the need to build a literature-access layer from nothing.
2. **Established precedents for longitudinal participation.** Fox Insight describes patient-reported information gathered over time; PPMI follows participants longitudinally.[3][4] These demonstrate existing approaches to learn from, not a need to duplicate their studies.
3. **Existing research-collaboration infrastructure.** Synapse describes support for collaboration around biomedical datasets.[5] Building a proprietary collaboration platform is not automatically necessary.
4. **Candidate technical capabilities.** Retrieval, language models, and connected measurement tools offer possible ways to organize information. Their usefulness, cost, accessibility, and validity for this project's particular tasks remain untested.

The opportunity is lower-cost, narrower experimentation with existing resources. It is not proof that an automated interpretation system is safe or valuable.

### Constraints that technology does not remove

Accessible articles are not uniformly licensed for unrestricted ingestion, redistribution, or other reuse. PMC explicitly notes that licenses vary even within its Open Access Subset.[2]

Finding an article is not the same as understanding its limitations. Retrieving a supporting passage is not equivalent to a valid synthesis. Continuous measurement is not necessarily accurate measurement, and a convenient device signal is not automatically a clinically meaningful measure.

**Differentiation hypothesis:** A transparent workflow connecting a specific question, traceable research, and carefully bounded observations could be useful to a narrowly defined group. Validate that workflow and its incremental value before building a generalized platform.

## E. Primary audiences

Audience ranking reflects founding priorities, not different levels of human importance. Plain-language comprehension and the first site's conversion goal are distinct: everyone should understand the initiative; the main action is a meaningful collaboration inquiry.

| Rank | Audience | What the initial site must provide | Appropriate first action |
|---|---|---|---|
| 1 | People with Parkinson's, caregivers, and families | An understandable purpose, honest limits, accessible presentation, and clarity that participation does not require health disclosures. | Offer feedback on questions, language, and participation burden. |
| 2 | Parkinson's researchers, movement scientists, and relevant methodologists | A specific question space, scientific boundaries, provenance commitments, and an accurate account of project maturity. | Critique the proposed question or method. |
| 3 | Healthcare professionals | Clear separation from clinical care, no treatment promises, and a realistic description of the professional input requested. | Review claim boundaries or identify important misunderstandings. |
| 4 | Software, AI, data, and device professionals | Concrete work items when available, constraints, ownership, and no suggestion that a stack is already settled. | Discuss a bounded contribution or feasibility investigation. |
| 5 | Advocacy organizations, universities, and potential institutional collaborators | Purpose, governance gaps, expectations, and possible complementarity with existing work. | Explore a scoped conversation, not an implied partnership. |
| 6 | Donors, sponsors, and technology companies | A truthful account of what exists, what resources would enable, and any conflicts of interest. | Discuss support only when an accountable entity and work package exist. |

Avoid presenting six separate audience funnels or equally prominent calls to action. Use a common explanation with optional depth and one monitored participation route.

Do not ask visitors to identify a diagnosis to access information or express interest. Patient participation must not quietly become unpaid clinical validation, data donation, or recruitment into a study.

## F. Core concepts

### Recommendation: Keep the framework, explain its boundaries

| Concept | Visitor-facing explanation | Required boundary |
|---|---|---|
| Evidence | What published research reports, how it was studied, and how confidently it can be interpreted. | Publication, peer review, or a citation alone does not make a finding definitive. |
| Experience | What a person observes or records over time, with context and limitations. | An individual pattern does not establish a general treatment effect or medical causation. |
| Exploration | Questions, methods, and technologies being investigated. | A prototype or experiment is not established medical treatment or validated capability. |

These are distinctions in source, purpose, and interpretation, not three equal forms of proof. They are also not completely disjoint: a rigorously designed study can use patient-reported information, and an exploratory method may later be evaluated scientifically.

The principle "Experience is not evidence" should prevent anecdote from becoming medical proof. It should not be used to dismiss lived experience or claim that systematically collected patient-reported outcomes cannot contribute to research.

### How the concepts should work in the experience

A visitor should be able to tell whether a statement is a research finding, an approved personal account, a hypothesis, or an account of a prototype. Apply visible text labels and context; do not rely on color or decorative icons alone.

For research claims, preserve source links and explain material limitations. For personal stories, identify whose perspective is being shared and obtain permission. For exploration, identify the question, maturity, uncertainty, and what would count as a useful result.

### Alternatives considered

- **Research / Lived Experience / Experiments:** More explicit, but "experiments" can imply authorized human-subject research when none exists.
- **Learn / Observe / Explore:** Easier as action labels, but less effective at preserving epistemic boundaries.
- **Questions / Sources / Observations:** Useful within a future workflow, but weaker as an organizational framework.

Retain Evidence / Experience / Exploration with plain-language subtitles. Do not force them into three standalone products or require separate pages.

## G. Parkinson's role

Use **"Parkinson's: our first initiative"** prominently. Pair it with a broader organizational definition rather than burying Parkinson's or making it the entire brand.

The founding focus is justified by motivation, access to lived experience, and an interest in longitudinal questions described in GENESIS.md. Those are reasons to investigate, not evidence that Parkinson's is commercially underserved or that a particular sensing approach will work.

The initial initiative should identify one bounded question through co-design and scientific input. A candidate discovery question is:

> What makes information about research and day-to-day change difficult to understand, and what would help people formulate a better question?

This question can be investigated initially without collecting medication histories, location traces, or wearable streams.

Use disease-neutral organizational terminology and portable content structures. Do not build a generalized disease ontology, multi-initiative administration system, or configurable clinical platform merely to demonstrate future extensibility.

Avoid disease-expansion promises, clinical outcome claims, and any suggestion that the organization operates a Parkinson's research study before the necessary protocol and governance exist.

## H. MVP website

### Scope

Recommend one substantive public page with clear sections and direct section links, plus a separately reachable privacy notice and any required notices. This is a content-scope recommendation, not a finalized information architecture or frontend decision.

| Page or section | Purpose | Audience | Primary message | Desired action |
|---|---|---|---|---|
| Home: purpose and current stage | Establish understanding in approximately 20 seconds. | All visitors. | An early-stage initiative exploring research, experience over time, and technology; Parkinson's comes first. | Continue to the explanation or collaboration section. |
| Why it exists and origin | Connect the information problem to a human motivation. | People and families; collaborators. | A personal journey prompted a broader question, not a proven medical solution. | Understand the motivation and boundaries. |
| Evidence / Experience / Exploration | Explain the conceptual framework and standards. | All visitors, with optional depth for specialists. | Research findings, personal observations, and experiments require different interpretations. | Understand how claims will be labeled and sourced. |
| Parkinson's initiative | Establish a specific first focus without narrowing the whole organization permanently. | Parkinson's community; scientific reviewers. | Parkinson's is the initial area of inquiry; the first question is still being refined. | Help shape or critique the question. |
| Current work | Make maturity and gaps visible. | Researchers, contributors, potential supporters. | Only verified work is described as existing. | Inspect an available artifact or identify a contribution. |
| Collaborate | Turn interest into a safe, actionable inquiry. | Prospective contributors across disciplines. | There are bounded ways to help; this is not clinical care or study enrollment. | Use the approved, monitored contact route without sharing health records. |
| Privacy and contact notice | Explain actual information handling and limitations. | Anyone contacting the project or visiting the site. | What is collected, why, who receives it, and how to request deletion. | Make an informed contact decision. |
| Footer and transparency details | Establish accountability and maintenance expectations. | All visitors. | Named publication responsibility, current review date, corrections route, and non-clinical purpose. | Find ownership, notices, and corrections information. |

### Current-work policy

No working capabilities were confirmed during this assignment. The potential knowledge base, AI assistant, Android capture, integrations, and analytics therefore remain **proposed; implementation status unverified**. This is not a conclusion that no prior work exists.

Before publication, the founder must supply the status and permitted artifacts for each included project. A short honest section is preferable to five speculative product cards.

Retain GENESIS.md's labels with explicit meanings:

| Label | Publication rule |
|---|---|
| Idea | A proposal exists; implementation or validation is not implied. |
| Prototype | An inspectable artifact demonstrates a limited capability; limitations are stated. |
| Active development | An owner confirms current work, scope, and a dated update. |
| Experiment | A question and evaluation method are stated; no successful result is implied. |
| Operational | An intended use is supported with an owner and maintenance expectations; clinical validation is not implied. |

These labels are not a single maturity ladder: an experiment can use a prototype. Where applicable, state both the activity and the artifact's maturity.

### Deliberate exclusions

No user accounts, participant profiles, symptom logging, health uploads, research enrollment, device integrations, personalized recommendations, public chatbot, open forum, newsletter database, donation processing, or production data dashboard.

Do not add testimonials, partner logos, scientific-review badges, usage counters, or invented demonstrations. A clearly labeled synthetic illustration may be considered later if it answers a demonstrated communication need.

### UX and accessibility requirements

Use plain-language first paragraphs, descriptive headings, short sections, readable type, sufficient contrast, visible focus, generous controls, keyboard navigation, responsive reflow, and reduced-motion support. Avoid automatic animation, precision interactions, timed reading, hover-only information, and medically suggestive decorative charts.

Adopt WCAG 2.2 AA as the proposed implementation target.[6] Do not claim conformance without evaluating the implemented site. Include usability input from people with relevant motor, visual, or cognitive access needs; accessibility cannot be inferred from diagnosis or an automated score.

## I. Future platform map

### Conceptual relationships, not a deployment diagram

```text
Initiatives: questions, intended users, protocols, and evaluation
                          |
            +-------------+-------------+
            |                           |
   PUBLIC RESEARCH BOUNDARY     PRIVATE PERSONAL-DATA BOUNDARY
            |                           |
   Research / Research Library   Connect / approved imports
   Sources, rights, versions              |
            |                    Capture / Personal Records
   Intelligence / Research              |
   Assistance                    Analytics / bounded analysis
   Retrieval and explanation             |
            |                           |
   Source-linked public material   Private observations/reports
            |                           |
            +---- Human interpretation--+
                  only through an explicit,
                  purpose-limited approved workflow
```

No arrow grants permission to transfer information. Initiatives coordinate questions and evaluation; they do not override privacy boundaries.

### Capability assessment

| Genesis name | Recommended treatment | Responsibility | Gate before building |
|---|---|---|---|
| Research | Prefer the explanatory label **Research Library** initially. | Source discovery, metadata, rights, provenance, and versions. | A narrow question and evidence that existing services are insufficient for the task. |
| Intelligence | Prefer **Research Assistance**; avoid suggesting independent clinical intelligence. | Retrieval, comparison, and source-linked explanation. | A useful task, evaluation set, and meaningful improvement over simpler search or curated content. |
| Capture | Prefer **Personal Records** in visitor-facing explanations. | Explicitly authorized observations with longitudinal context. | Demonstrated need, data minimization, governance, and acceptable participation burden. |
| Connect | Keep as an internal integration capability, not a separate product. | Imports, source identity, units, and quality context. | A specific supported source with rights and a validated reason to integrate. |
| Analytics | Describe the actual analysis rather than a broad product promise. | Bounded visualization or analysis with missingness and uncertainty visible. | A defined question, appropriate method, and review of misleading interpretations. |
| Initiatives | Retain as the organizing research/program layer. | Question ownership, scope, methods, participation, and evaluation. | A responsible owner and an explicit decision about whether activities constitute formal research. |

### Architectural invariants to preserve

Public literature, public project content, private personal records, and sensitive health-related information are not interchangeable. Personal research data may already be sensitive health data; a softer label does not lower its protection requirements.

Do not assume a shared search index, embedding store, identity space, access policy, or model context across public and private information. Private information must not become training material, public content, or a retrieval source by default.

If longitudinal collection is later justified, preserve event time, timezone or offset, recording time, units, source, device/method version, corrections, and meaningful missingness. Distinguish a reported event from a measured signal and a derived value. Historical corrections should not silently rewrite what was known at an earlier time.

Use portability and documented boundaries to avoid unnecessary vendor coupling. This does not require multi-cloud deployment, a universal abstraction layer, microservices, or supporting multiple databases from day one.

### AI/RAG research gates

A future literature-assistance prototype should:

- Start with a licensed, bounded corpus and preserve document identity, version, access level, and source passages.
- Keep abstracts, full-text articles, preprints, reviews, and other source types distinguishable.
- Evaluate retrieval separately from answer generation using representative questions and simpler baselines.
- Check whether each material claim is supported by its cited passage, not merely whether a citation exists.
- Test unanswered questions, conflicting findings, misleading premises, stale or corrected sources, and instructions embedded in retrieved documents.
- Treat retrieved content as untrusted material, not authority to change system behavior.
- Explain uncertainty, scope, and missing support rather than inventing an answer.
- Keep private records out of prompts, indexes, telemetry, and provider processing unless a separately approved use permits them.
- Record evaluation configuration and relevant source/model versions so results can be reproduced.

No numeric AI-quality threshold is asserted here. Thresholds and reviewer responsibilities must be specified for the intended task before deployment. A public medical-information interface needs a stronger case than a private feasibility experiment.

## J. Brand language

### Recommended headline

**Better questions. Grounded exploration.**

### Supporting statement

The Emergent Collaborative is an early-stage initiative exploring how scientific research, lived experience over time, and emerging technology can support better understanding, beginning with Parkinson's.

Place a clear current-stage statement nearby. The headline alone is too abstract to establish the purpose.

### Five possible taglines

1. Better questions. Grounded exploration.
2. Research, experience, and the questions between.
3. Exploring change over time.
4. Human questions. Thoughtful technology.
5. Curiosity with context.

### Tone and vocabulary

| Favor | Avoid |
|---|---|
| Investigate, explore, examine, compare, learn. | Revolutionize medicine, transform outcomes, unlock a cure. |
| Published findings, source, study limitations, uncertainty. | Scientifically proven without precise support; definitive answers. |
| Personal observation, reported experience, possible association. | My data proves; causal language based only on correlation. |
| Proposed, prototype, experiment, current limitations. | Production-ready, validated, operational without verification. |
| Research assistance, human review, better questions. | AI doctor, medical intelligence, autonomous diagnosis. |
| First initiative, open questions, scoped contribution. | Universal platform, complete ecosystem, one system for everything. |

Be intelligent without being opaque, optimistic without forecasting outcomes, and human without using vulnerability as a conversion tactic.

### Visual direction, not visual design

Favor restrained references to trajectories, motion, maps, signals, or scientific diagrams. Avoid stock clinical imagery, glowing AI imagery, excessive gradients, and franchise-derived visual elements.

Do not present invented data as a measured result. Do not publish identifiable ride routes, photographs, or third-party stories without appropriate permission and review.

The name "Collaborative" is an aspiration that needs a participation model. Do not imply an established institute, nonprofit, clinical service, or multidisciplinary staff. Naming availability, domain ownership, and potential confusion remain unresolved; no clearance is claimed.

## K. Ranked risks

These are provisional product-risk priorities based on plausible consequences and founding-stage uncertainty. They are not measured probabilities or findings from a security assessment.

| Rank | Risk category | Failure mode | Founding response |
|---|---|---|---|
| 1 | Medical claims | Visitors infer treatment guidance, diagnostic ability, or established medical benefit. | Control purpose and functionality, not just disclaimers; review substantive health claims and remove unsupported implications. |
| 2 | Credibility | Proposed technology, individual experience, or an aspirational team is presented as an operational research organization. | Verify status, artifacts, affiliations, ownership, and review dates; publish limitations prominently. |
| 3 | Privacy | Contact, logs, third-party tools, location traces, or examples expose sensitive information. | Minimize collection, prohibit health uploads, review contact handling and operational logs, and avoid unnecessary trackers. |
| 4 | Scientific validity | Confounding, selective observation, invalid measures, or missing data produce persuasive but unsupported conclusions. | Define questions and methods first; retain provenance and uncertainty; seek relevant methodological critique. |
| 5 | AI hallucination and automation bias | Plausible synthesis or irrelevant citations are mistaken for reliable guidance. | Defer public AI; evaluate source support, abstention, and human interpretation before any release. |
| 6 | Scope and sustainability | Six capability labels become six simultaneous products without capacity to maintain them. | One bounded cycle, named owner, explicit exclusions, and stop/go gates. |
| 7 | Technical and operational | Ingestion rights, changing integrations, poor data quality, or premature architecture overwhelm the useful task. | Reuse existing services where appropriate; run narrow feasibility checks only after requirements exist. |
| 8 | Participation and accessibility | The site attracts attention but excludes users, extracts unpaid effort, or offers no meaningful contribution. | Co-design, accessible content, low-burden involvement, and specific requests with feedback. |
| 9 | Branding and conflicts | The name implies authority; sponsor interests influence presentation or perceived independence. | Describe actual status, investigate naming conflicts, and disclose material relationships. |

Privacy does not begin with an account system: a contact mailbox and hosting logs already require decisions. A "do not send medical records" warning reduces ambiguity but does not prevent accidental disclosure; the recipient needs a handling process.

A disclaimer does not neutralize diagnostic functionality. Whether future activities trigger research oversight, medical-device obligations, or particular privacy laws depends on intended use, jurisdiction, data, and operations. Determine applicability before the relevant activity; make no blanket HIPAA, GDPR, anonymity, or regulatory-compliance claim.

## L. Assumptions to challenge

| Assumption | Why it is weak or incomplete | Lowest-cost useful investigation |
|---|---|---|
| The founder's information problem is broadly shared. | Personal salience does not establish a common priority. | Ask intended users about recent concrete information tasks without soliciting medical histories. |
| Combining evidence and personal observations is the best solution. | A better explanation, curated source list, or conversation aid may suffice. | Compare a simple content workflow with an integrated concept. |
| Longitudinal information is inherently useful. | Duration cannot compensate for invalid measures, unclear questions, or poor adherence. | Identify one question and the minimum observations it would require. |
| Wearables measure what users think they measure. | Device outputs and derived metrics need task-specific interpretation. | Review the intended measure, documentation, and independent validation before integration. |
| Parkinson's is an underserved technical market. | Established longitudinal and patient-reported initiatives already exist.[3][4] | Map specific gaps and speak with relevant practitioners before claiming novelty. |
| An AI assistant should be the first interactive product. | Search, curated explanations, or human review may be more useful and safer. | Evaluate a bounded task against those baselines. |
| Public access means permission to ingest and republish. | Article-specific rights vary.[2] | Document allowed uses for a small candidate source set. |
| More sensing creates better understanding. | Burden, missingness, confounding, and privacy costs can exceed value. | Test the smallest non-sensitive workflow before requesting continuous collection. |
| A reusable platform must be designed first. | Unknown use cases make premature abstractions costly. | Solve one bounded problem while documenting what must remain portable. |
| All six capability names deserve separate products. | Names do not establish independent user needs or operational boundaries. | Map a single end-to-end user task before organizing systems. |
| An Android app is the necessary first capture method. | The capture need and user environment are unvalidated. | Establish the task before choosing device or interface. |
| Contributors will arrive and remain engaged. | Interest does not establish availability, ownership, or maintenance. | Offer one scoped task and observe whether collaboration can actually be sustained. |
| The origin story should be the main experience. | Motivation can overwhelm the visitor's question or expose unnecessary information. | Test a short, permissioned story against a purpose-first explanation. |
| More sources or citations mean a better answer. | Relevance, quality, source support, and conflicting evidence matter more than counts. | Review a small set of answers claim by claim. |
| Disclaimers make future health features safe. | Actual behavior and foreseeable interpretation matter. | Review intended use and user comprehension before adding functionality. |

Do not treat positive interview reactions as validation of a platform, clinical benefit, or willingness to contribute over time.

## M. Unknowns and decision timing

### Must resolve now, before the next work is scoped

| Decision | Proposed default | Status or owner |
|---|---|---|
| Initial website outcome | Comprehension and credible collaboration, not health outcomes. | Direction approved; detailed acceptance targets proposed below. |
| Primary audience and action | Accessible to people and families; invite bounded collaboration across disciplines. | Direction approved; recruitment details open. |
| Current project status | Describe unverified systems as proposals, not functioning products. | Founder confirmation required. |
| Public origin narrative | Publish only explicitly approved details and assets. | Founder approval required before publication. |
| Cycle boundary and resources | One time-boxed discovery/content cycle with explicit exclusions. | Duration, capacity, budget, and owner unconfirmed. |
| Decision and publication accountability | Founder is final decision maker; name a content maintainer and contact owner. | Founder authority established; operational roles unconfirmed. |

### Must resolve before website architecture or implementation

- Approved page/section requirements, content inventory, and testable acceptance criteria.
- Which scientific claims, if any, will appear, their supporting sources, and an appropriate review process.
- Public organizational description, jurisdiction, and responsible operating party; do not imply an entity status that has not been established.
- Contact mechanism, monitored recipient, response expectations, retention/deletion policy, and process for accidental sensitive submissions.
- Hosting and logging requirements, analytics necessity, third-party processing, and required privacy disclosures.
- Publishing permissions, domain control, maintenance responsibility, accessibility target, and a corrections process.
- Who will conduct the audience review and whether any activity crosses into research requiring additional oversight.

Resolve only the architecture needed for approved scope. A public content site does not require decisions about future personal-data hosting, vector databases, GPUs, or offline synchronization.

### Can defer until a validated use case requires them

Frontend framework, CMS, database, cloud provider, model vendor, embeddings, vector search, knowledge graph, service decomposition, native capture technology, device partnerships, identity architecture, and a multi-domain platform model.

A later website implementation will still need proportionate delivery choices. Deferral means requirements first, not avoiding decisions indefinitely.

Funding transactions, newsletter operations, an open community forum, multilingual publishing, and formal partner programs also remain out of the initial scope.

### Future research, before the corresponding activity

| Question | Evidence or decision needed |
|---|---|
| Is there a specific unmet research-understanding task? | Discovery findings and comparison with existing options. |
| Does AI improve that task? | Task-specific evaluation against simpler baselines, including misleading and unanswerable questions. |
| Which observations are worth collecting? | Defined question, measurement rationale, burden assessment, and privacy review. |
| Is a device signal adequate? | Independent validity evidence appropriate to the intended use and population. |
| Is human-participant research proposed? | Protocol, responsible institution/roles, applicable ethics review, consent, and data governance before enrollment. |
| Could an intended use be regulated? | Qualified assessment based on actual functionality, claims, jurisdiction, and users. |
| Can a personal-data service be operated responsibly? | Access, consent/other lawful basis as applicable, retention, export, deletion limits, incident response, and sustainability plan. |
| Is broader expansion justified? | Demonstrated value and transferable requirements, not brand ambition alone. |

## N. Comparable efforts and research landscape

Research categories before copying features. The aim is to understand existing strengths, unmet needs, potential reuse, and partnership opportunities.

| Category and initial examples | What to investigate | Implication for this project |
|---|---|---|
| Literature discovery and access: Europe PMC; PubMed and PMC | Search coverage, metadata, source identity, update mechanisms, rights, and links to original material. | Do not rebuild a general literature index without a task-specific reason. Europe PMC's API and PMC's licensing guidance are verified starting points.[1][2] |
| Patient-reported longitudinal studies: Fox Insight | Participation design, burden, survey context, governance, and the distinction between contribution and clinical benefit. | Lived experience over time is an established research area, not an unclaimed concept.[3] |
| Longitudinal Parkinson's cohorts: PPMI | Scientific questions, structured follow-up, participant communication, data access, and governance. | Seek complementarity and learn from established methods rather than claim a replacement.[4] |
| Biomedical data collaboration: Synapse | Dataset provenance, access conditions, reuse, and reproducibility. | Evaluate existing infrastructure before inventing a collaboration portal.[5] |
| Patient communities and self-tracking projects | Moderation, anecdote labeling, disclosure risks, sustained use, and feedback to participants. | Community activity requires governance and maintenance; it is not a free engagement feature. |
| Research-answer and citation-assistance products | Claim support, abstention, evidence coverage, conflict handling, accessibility, and pricing. | A citation interface alone is unlikely to differentiate the initiative. |
| Wearable and digital-measurement studies | What is measured, independent validation, missingness, device changes, and interpretation limits. | Device integration should follow a defined question, not precede it. |
| Disease-focused charities and translational initiatives | Audience explanation, contribution pathways, sponsorship disclosure, and responsible public claims. | Learn how credibility is earned without imitating authority or branding. |

The last four rows are research categories, not completed evaluations or endorsements. No exhaustive comparison, named partnership, or unique market gap is claimed.

The initial primary-source scan establishes that literature infrastructure and longitudinal Parkinson's initiatives exist. It does not establish their suitability for integration or this project's permission to use their data.

## O. Recommended Phase 1

### Outcome

Complete one bounded discovery and content-definition cycle that makes the proposed public introduction credible and implementation-ready if the founder chooses to proceed.

The cycle ends with a decision, not an obligation to build. Its duration must be agreed against available capacity; no delivery estimate can be responsibly inferred from the current information.

### Included work and sequence

| Step | Work | Tangible outcome |
|---|---|---|
| 1 | Confirm the brief's open operating decisions and factual inventory. | Agreed scope, owner, cycle boundary, verified project statuses, and approved story boundaries. |
| 2 | Conduct a small round of voluntary audience conversations. | Notes about information tasks, confusing language, participation expectations, and reasons the concept may not be useful. |
| 3 | Prepare a purpose-first content draft and low-fidelity content prototype. | The proposed site sections, truthful status descriptions, sources where needed, limitations, and a proposed contact route. |
| 4 | Review comprehension, accessibility needs, scientific framing, and privacy implications. | Concrete revisions and a list of unresolved blockers. |
| 5 | Define implementation requirements and acceptance criteria; make a go/revise/stop decision. | A bounded website specification or a documented reason not to proceed. |

The low-fidelity prototype can be a document or nonfunctional layout. It requires no framework, cloud architecture, backend, or collection of health information.

Audience conversations should ask about tasks and the explanation, not diagnoses, medications, symptoms, or sensor histories. Explain participation, intended use of notes, and withdrawal/deletion arrangements; minimize identifiers and obtain permission before recording or quoting anyone. If the purpose or method becomes formal research, determine applicable oversight before proceeding.

### Proposed acceptance criteria

These are planning targets, not completed results or statistical evidence of demand.

| Area | Proposed criterion |
|---|---|
| Comprehension | In five short sessions spanning lived-experience/caregiver and research/clinical perspectives, at least four participants can describe the purpose in their own words after an approximately 20-second introduction, without prompting. |
| Maturity and medical boundaries | At least four of those five can distinguish current work from proposals and recognize that the initiative does not provide diagnosis or treatment advice. Any serious contrary interpretation triggers revision even if the numerical target passes. |
| Participation | At least four of five can identify an appropriate contribution and understand that medical records are not requested. |
| Status integrity | Every published capability or project status has founder confirmation, a review date, and an owner or an explicit statement that it is proposed. |
| Claim integrity | Every substantive scientific claim has an identifiable source, bounded wording, and review appropriate to the claim; omit claims that cannot meet that standard. |
| Privacy readiness | No health-data collection is in scope; contact handling, hosting/logging needs, retention, deletion, and accidental-disclosure procedures are specified before implementation. |
| Accessibility readiness | Requirements include WCAG 2.2 AA and relevant usability needs; known content/prototype barriers are addressed. No conformance claim is made from a prototype review. |
| Decision readiness | Scope, exclusions, ownership, operating constraints, and unresolved blockers are visible enough for the founder to approve, revise, or stop the next phase. |

Five sessions provide directional qualitative feedback, not representative sampling. Do not characterize the results as market validation, clinical validation, or evidence that a data platform should be built. If appropriate participants cannot be reached within the cycle, record the gap rather than substitute founder approval for their feedback.

### Stop or revise conditions

- Visitors repeatedly mistake the initiative for clinical care or a functioning health platform.
- The proposition is understandable but nobody can identify a useful task or realistic contribution.
- Meaningful value appears to require sensitive data before governance and capacity exist.
- There is no accountable maintainer or monitored contact route.
- Existing tools appear to solve the proposed task adequately and no incremental contribution is established.
- Available capacity cannot sustain even the narrow public commitment.

Success may mean narrowing the concept, becoming a curated educational project, contributing to an existing effort, or postponing a platform. Those are legitimate discovery outcomes.

### What follows, only if approved

If the content proposition passes review, a subsequent bounded implementation can deliver the minimal public website described in section H. Technology choices should follow its approved requirements, maintenance constraints, and privacy needs.

Only after a specific unmet task is established should the founder authorize a separate research-assistance or longitudinal-data feasibility investigation. Neither is an automatic Phase 2 commitment.

## Source and provenance register

Primary external sources below were accessed on 2026-10-17. They support the narrow landscape and standards statements attributed to them, not endorsement of this initiative or evidence of its effectiveness.

| ID | Source | Use in this brief | Limitation |
|---|---|---|---|
| [1] | [Europe PMC: RESTful Web Service](https://europepmc.org/RestfulWebService) | Documents programmatic literature metadata, reference, and related access capabilities. | Does not establish rights to reuse every linked article or suitability for this project's task. |
| [2] | [PubMed Central: Open Access Subset](https://pmc.ncbi.nlm.nih.gov/tools/openftlist/) | Establishes that reuse terms vary and article-specific licenses must be checked. | Not a legal interpretation of any particular proposed processing activity. |
| [3] | [The Michael J. Fox Foundation: Fox Insight](https://www.michaeljfox.org/fox-insight) | Describes longitudinal patient-reported information and research governance. | Provider description, not an independent assessment or permission to access participant data. |
| [4] | [The Michael J. Fox Foundation: PPMI](https://www.michaeljfox.org/ppmi) | Describes an established longitudinal Parkinson's study. The current page uses Parkinson's Precision Medicine Initiative and notes the earlier Progression Markers name. | Provider description; this brief does not evaluate its scientific results or reproduce its promotional claims. |
| [5] | [Synapse, Sage Bionetworks](https://www.synapse.org/) | The site's descriptive metadata identifies biomedical dataset-centered collaboration as its purpose. | Limited public-page inspection; access controls, licensing, and operational suitability were not assessed. |
| [6] | [W3C WAI: WCAG Overview](https://www.w3.org/WAI/standards-guidelines/wcag/) and [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | Basis for proposing a testable web-accessibility target. | A target is not a conformance assessment, usability guarantee, or jurisdiction-specific legal conclusion. |

Internal provenance: [GENESIS.md](GENESIS.md) supplies the founding narrative, conceptual boundaries, proposed capability names, and assignment structure. [AGENTS.md](../AGENTS.md) supplies the repository's working constraints. Public reuse of personal narrative and assets still requires the founder's explicit approval.
