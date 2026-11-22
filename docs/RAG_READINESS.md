# RAG readiness record

**State: `rag-preview-ready` for controlled founder review only.**
The local hardening implementation passes the checks below. It has **not been
deployed**. Live measurements describe the previously deployed founder-review
revision, not the hardened local revision. This record neither approves a rollout
nor makes the site or RAG production-ready.

Parkinson's remains the first initiative, not the platform boundary. Source
membership and attribution checks are not scientific truth assessment. Preserve
Evidence / Experience / Exploration and the distinction between symptoms,
mechanisms and disease modification.

## Release states and human gate

| State                            | Meaning                                                                                                                    |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `rag-disabled`                   | No vector search; existing non-RAG behavior.                                                                               |
| `rag-preview-ready`              | Bounded local implementation and preview smoke checks support further guarded founder review; limitations remain explicit. |
| `rag-production-review-required` | A production candidate requires human scientific, privacy, operational and release review.                                 |
| `rag-production-ready`           | Reserved for explicit human approval after those reviews; never automatically assigned by a test or this report.           |

The public release checker **still fails intentionally** for robots noindex on
all nine generated pages. The local preview checker and deployed preview
headers/preflight tests pass. No preview/noindex controls were changed.

## Runtime bounds and failure behavior

The custom handler has one **25,000 ms total deadline**, beginning at handler
entry. Custom validation, throttling and key/configuration lookup consume that
same budget. Firebase/platform admission and parsing before handler entry are
outside it. Retrieval takes at most **5,000 ms**, also capped by remaining time.
Generation receives the original abort signal and remaining deadline; it does
not receive another 25 seconds. Citation validation is synchronous within the
deadline. A single regeneration is allowed only with at least **3,000 ms
remaining**, and shares the original deadline.

Thus a full 5-second retrieval leaves at most approximately 20 seconds for
generation, citation validation and any regeneration, minus validation/other
overhead. This is a shared budget, not separate guaranteed allocations.
The Cloud Function timeout remains **35 seconds**, and the browser timeout
remains **30 seconds**. Event-loop/platform scheduling is not a hard real-time
guarantee.

Successful requests, failures and client disconnects clear timers/listeners and
abort outstanding SDK work. Disconnects produce metadata-only `cancelled`/499
logs, not a response write to the disconnected client. Timeout returns sanitized
504 JSON; other generation failures return sanitized 502 JSON. Tests cover late
rejection without unhandled rejections or second responses. Abort cannot
guarantee that a provider instantly stops server-side computation or billing.

| Request path                                   | Vector searches | Answer generations | Maximum provider operations |
| ---------------------------------------------- | --------------: | -----------------: | --------------------------: |
| Normal grounded answer                         |               1 |                  1 |                           2 |
| Citation rejection, sufficient repair budget   |               1 |                  2 |                           3 |
| Retrieval failure or no eligible sources       |       At most 1 |                  1 |                           2 |
| RAG disabled or missing vector configuration   |               0 |                  1 |                           1 |
| Citation rejection, insufficient repair budget |               1 |                  1 |                           2 |

The repair is the existing non-RAG regeneration, not a second retrieval or a
ranking change. If it contains unverified citations, its entire prose is replaced
with a transparent fixed response rather than selectively stripping citations.
Provider SDK retries and the Firebase vector wrapper's read retries are zero.
The development CLI's existing retry default is unchanged.

Other bounds remain: **50 candidates; five final papers; two chunks per paper;
five returned source cards; 16,000 serialized evidence characters; 1,200 output
tokens per generation**. A repaired request can therefore use two individually
bounded generations, not an increased per-generation output limit.
Questions remain limited to 4,000 characters, raw bodies to 24 KiB, and requests
to five per IP and 20 per instance per 60 seconds. Existing deployment limits
remain one instance, concurrency four and 256 MiB.

### Internal fallback categories

- `rag-disabled`
- `rag-not-configured`
- `rag-timeout`
- `rag-provider-error`
- `rag-malformed-response`
- `rag-no-eligible-sources`
- `rag-citation-validation-failed`
- `rag-budget-exhausted`

These are bounded log categories, not public configuration diagnostics.
Disabled/missing/malformed configuration, retrieval timeout/outage and empty
eligible results use the non-RAG path when generation is safe. Generation
failure/time exhaustion fails safely rather than fabricating a grounded answer.

## Citation, grounding and source-display integrity

Grounded output must use strict `[PMID N]` markers and a matching structured PMID
list. Every PMID must belong to the retrieved evidence; metadata identity and
the exact canonical `https://pubmed.ncbi.nlm.nih.gov/<PMID>/` URL must agree.
Missing metadata, malformed/bare/invented/unretrieved citations, mismatched URLs
and excessive citations reject the whole grounded answer. Repeated valid
citations collapse to unique source entries; conflicting duplicate source
metadata is rejected. Zero eligible sources cannot produce a grounded answer.

One rejected grounded answer can trigger at most one non-RAG regeneration within
the original deadline. Unsupported scientific prose is not made apparently
valid by silently deleting its citations.

`functions\scripts\grounding.mjs` provides **development-only structural**
nearby-citation checks. It is not exposed as a public option or endpoint, does
not score scientific truth, and reports only aggregate counts/bounded claim
kinds. Human review remains necessary; sentence-local heuristics can both miss
claims and flag appropriately cautious framing.

Instructions and regression tests distinguish human clinical evidence from
animal/preclinical work, mechanistic plausibility from clinical efficacy,
observational association from causation, and symptom improvement from actual
disease modification. Prompt/label tests do not establish that every future
model answer will obey those distinctions.

Frontend source cards require `retrieval.used=true`, consistent source count and
valid unique source metadata. They show title, PMID, canonical PubMed URL, year
and evidence/study type when available. They do not show scores, file IDs,
filenames, warnings, tiers or raw chunks. Existing same-tab navigation and
visual design remain; links have `rel="noopener noreferrer"`.

## Runtime manifest

Packaged snapshot: **519 governed records, 516 retrieval-eligible papers**.
The existing JSON bytes were retained. A SHA256 sidecar was prepared from that
existing schema-validated snapshot without preparing corpus data or exporting
new governance.

Both `functions\runtime-manifest.json` and
`functions\runtime-manifest.sha256` are required deployment artifacts. They are
local generated/ignored files; a checkout alone does not supply them. Packaging
must preserve both. The exporter now writes both for future authorized updates.

Runtime validation checks the exact serialized JSON checksum, schema version,
store-ID compatibility, record/PMID/file-ID uniqueness, required safety and
eligibility metadata, taxonomy identity, fingerprints and canonical URLs. The
snapshot is read/verified once on first enabled use per warm runtime. Missing,
malformed or incompatible configuration disables RAG and safely falls back
before search; a failed package remains failed for that warm runtime.

The configured-store validation command passed with 519/516 records,
`checksumVerified=true` and `storeCompatibilityChecked=true`.
Provenance hash formats are checked; the runtime cannot recompute the full
offline corpus/receipt hashes. A sidecar is not a signature, scientific
validation, protection against replacing both artifacts, or a freshness check
for newly published retractions.

### Feature flag operations

All combinations are tested: disabled means no search; enabled/valid config
attempts retrieval; enabled/missing config and provider outage fall back safely
without exposing configuration details.

`RAG_ENABLED` defaults false and remains reversible. It is a Firebase environment
parameter, **not an instantaneous hot Remote Config flag**. An approved backing
Cloud Run configuration revision can disable it without rebuilding/deploying
source code. Configuration changes still require operator approval and must be
persisted in the approved Firebase configuration to survive later deployments.
See the containment command and caveats in
[the withdrawal runbook](RAG_WITHDRAWAL_RUNBOOK.md). No flag/configuration revision
was performed in this task.

## Telemetry and privacy

Application logs are restricted to:

`requestId`, `timestamp`, `status`, `totalLatencyMs`, `category`, `ragUsed`,
`ragLatencyMs`, `ragSourceCount`, `ragFallback`, `ragFallbackCategory`,
`generationLatencyMs`.

Categories are bounded; optional fallback category is omitted when unused.
Generation time is cumulative across at most two generation calls. Disabled
RAG is explicitly categorized as `rag-disabled`. Early validation failures
report zero provider timing. No model-name field was added.

No questions, answers, prompts, excerpts, PMID lists, API keys, IPs, user agents,
raw request bodies, raw SDK responses or raw errors are added to application
logs. SDK logging is explicitly off. Platform access logs and provider retention
are separate controls, not covered by this application whitelist.

No question/answer database, chat history or new persistence was introduced.
The browser retains no localStorage/sessionStorage history. Rate-limit counters
remain ephemeral process memory. OpenAI generation retains `store:false`; this
is not a promise of zero provider/security retention. The API key remains
Secret Manager-bound and the vector ID remains server-side configuration.
The privacy page now accurately describes research-search question processing
and selected public evidence excerpts accompanying generation, without expanding
policy promises.

The smoke runner saves metadata only by default. Local answer recording requires
explicit `RAG_SMOKE_INCLUDE_ANSWERS=true` and is rejected in CI. It was **not**
enabled for this baseline. The structural checker holds response text only in
memory and does not persist it.

## Preview smoke and performance baseline

Seven paced requests exercised the existing deployed founder-review endpoint.
No more than four starts per 65 seconds were allowed, with no automatic retries.
This was a small functional baseline, **not a load/stress test**.

| Case                                   | HTTP | RAG used | Sources | Citation membership | Total ms | Contract result |
| -------------------------------------- | ---: | -------- | ------: | ------------------- | -------: | --------------- |
| General Parkinson's explanation        |  200 | Yes      |       1 | Passed              |    8,709 | Pass            |
| Aerobic exercise clinical evidence     |  200 | Yes      |       3 | Passed              |    6,915 | Pass            |
| Progression versus symptom improvement |  200 | Yes      |       3 | Passed              |    7,573 | Pass            |
| Mitochondrial mechanism                |  200 | Yes      |       3 | Passed              |    5,757 | Pass            |
| Stem-cell research                     |  200 | Yes      |       3 | Passed              |    6,574 | Pass            |
| User-question prompt injection         |  200 | Yes      |       2 | Passed              |    6,383 | Pass            |
| Repeated clinical question             |  200 | Yes      |       2 | Passed              |    6,065 | Pass            |
| Zero-source simulation, offline        |  N/A | No       |       0 | Not applicable      |      N/A | Pass            |

These contract passes establish valid response/source membership, not scientific
support for every claim. **All seven live answers were flagged by the
development structural heuristic: 19 potentially uncited claim candidates out
of 31 detected candidates.** This is an unresolved human attribution-review
item, not 19 proven false or unsupported scientific claims. The strengthened
nearby-citation instructions in the local revision have not been live tested.
The injection case passed membership/internal-identifier checks, not a proof of
general prompt-injection immunity.

| Metric                                        | Baseline                                                           |
| --------------------------------------------- | ------------------------------------------------------------------ |
| Median client total latency                   | 6,574 ms                                                           |
| Slowest request                               | 8,709 ms                                                           |
| Median server retrieval latency               | 1,737 ms                                                           |
| Median measured generation latency            | **Unavailable on the deployed revision**                           |
| Median server total minus retrieval           | 4,254 ms; includes other handler overhead, not measured generation |
| Fallbacks                                     | 0/7                                                                |
| Reported provider/request errors and HTTP 5xx | 0/7 observed                                                       |
| Safe server telemetry matched                 | 7/7 request IDs                                                    |

Legacy logs do not include the new generation timing or all new fallback
categories; zero observed errors is not proof of no internal provider retries.
An approved hardened-preview rollout and small rebaseline are required to
measure generation directly and review the new behavior. No local OpenAI key was
available; the separate direct-provider live harness was not run.

### Reusable commands

Use the repository's Node 22 Functions and Node 24 site/RAG toolchains.
The following live command is opt-in and incurs a small number of provider calls:

```powershell
$env:MERIDIAN_PREVIEW_URL='https://meridian-station-preview--founder-review-xzxrxxhj.web.app'
npm.cmd --prefix functions run test:rag:preview -- --live
```

Set `RAG_SMOKE_REPORT` to an explicitly chosen local metadata artifact path to
save results. To summarize existing results without further requests:

```powershell
$env:RAG_SMOKE_REPORT='<local smoke metadata JSON path>'
$env:RAG_SMOKE_LOG_FILE='<local safe projected telemetry JSON path>'
node .\functions\scripts\preview-rag.mjs --summarize
```

Only project the telemetry whitelist and matching request IDs from authorized
logs; do not dump raw logs into CI artifacts.

## Security review and residual risks

The readiness review covered parsed origin validation, Hosting rewrite,
Secret Manager binding, environment values, body/question limits, JSON parsing,
throttling, untrusted-question/source instructions, sanitized errors and
Hosting CSP/security headers. Regressions/hosted tests retain the same-origin
`/api/ask` rewrite and narrow approved Origin behavior.

The founder-review rule remains exactly
`/^meridian-station-preview--founder-review-[a-z0-9-]+\.web\.app$/i`,
with HTTPS, canonical origin-only input and no custom port. Existing explicitly
approved/development origins are preserved. No wildcard CORS, arbitrary
`*.web.app` access, production-origin expansion or disabled validation was added.

Important residual limits:

- CORS/origin checking is not authentication; non-browser clients can forge an
  approved Origin. Preview noindex is not access control.
- Throttling is in-memory/per-instance, resets on restart and is not a durable
  distributed quota or hard billing cap. Instance/call/token bounds reduce but
  do not eliminate anonymous abuse/cost exposure.
- Prompt-injection protections, schema checks and one successful adversarial
  smoke case do not prove immunity or scientific grounding.
- Abort is best-effort at the provider boundary. Snapshot governance needs an
  explicit update/containment operation for later withdrawals.
- Production still requires review of provider data handling, platform access
  logs, source/licensing obligations, abuse controls and operational monitoring.

No new exploitable regression was identified in the scoped readiness checks;
this is not a penetration-test or general security certification.

## Validation results

| Check                                            | Result                                         |
| ------------------------------------------------ | ---------------------------------------------- |
| RAG build and tests                              | 187 passed; 2 optional direct-live skips       |
| Functions build and tests, Node 22               | 36 passed                                      |
| Deployment `gcp-build`                           | Passed                                         |
| Configured packaged manifest + checksum          | Passed; 519 records / 516 eligible             |
| Astro check                                      | 190 files; no errors, warnings or hints        |
| Static site build                                | Passed; nine pages                             |
| Static tests                                     | 7 passed                                       |
| Ask browser tests                                | 11 passed                                      |
| General browser tests                            | 13 passed                                      |
| Local preview readiness                          | Passed                                         |
| Hosted preview headers/preflight, no model calls | 2 passed                                       |
| Small live preview smoke                         | 7 contract passes; structural warnings above   |
| Offline no-source fallback                       | Passed                                         |
| Scoped formatter                                 | Checked on this task's supported files         |
| Public release gate                              | Intentionally blocked by noindex on nine pages |

Timer/disconnect tests, invalid citation and metadata cases, retry/call limits,
feature flags, provider failure, manifest corruption/store compatibility,
source-card integrity and privacy logging are covered by these focused suites.
They do not replace human scientific review or validate the undeployed revision
against the live provider.

## Protected state and remaining production blockers

SHA256 comparison verified **7,655 protected files unchanged**, with no added
files under protected data/evaluation/retrieval roots. This includes corpus
sources/normalized data, receipts, retrieval scoring/query rewriting, gold
evaluation, the existing runtime JSON and preview/release controls. Runtime
manifest safety validation and the explicitly bounded runtime API retry option
are the scoped exceptions, not ranking changes.

No vector synchronization, corpus preparation, gold relabeling, remote content
mutation or deployment occurred. Remote vector bytes were not independently
rehashed; only authorized read-only preview retrieval was performed. Candidate
depth 50, final five papers and two chunks per paper remain unchanged. Gold
status remains `draft-human-review`.

Before any production approval:

1. Review the attribution warnings and answer/evidence distinctions with humans;
   complete the required gold/scientific review rather than promoting draft
   labels or treating membership tests as correctness.
2. Separately approve and deploy the hardened candidate to founder-review,
   verify artifact packaging/configuration and repeat a small smoke/timing check.
   Record measured generation latency and review regressions.
3. Agree production abuse/cost controls, monitoring/alerts, withdrawal ownership
   and configuration-disable procedure, including the lack of an instant hot flag.
4. Complete privacy/provider/log-retention and corpus licensing review and the
   broader existing release checklist. Obtain explicit founder approval.

The exact withdrawal/retraction procedure is
[`docs\RAG_WITHDRAWAL_RUNBOOK.md`](RAG_WITHDRAWAL_RUNBOOK.md).
Preview/noindex remains enabled, public release remains blocked, and no
production-ready state is assigned.

## Files changed in this hardening pass

This list excludes unrelated/pre-existing dirty worktree changes:

- `.gitignore`
- `docs\AI_QUESTION_PROTOTYPE.md`
- `docs\RAG_READINESS.md`
- `docs\RAG_WITHDRAWAL_RUNBOOK.md`
- `functions\package.json`
- `functions\scripts\grounding.mjs`
- `functions\scripts\preview-rag.mjs`
- `functions\scripts\test-rag.mjs`
- `functions\scripts\validate-manifest.mjs`
- `functions\src\askHandler.ts`
- `functions\src\evidence.ts`
- `functions\src\openaiAnswer.ts`
- `functions\src\parkinsonsInstructions.ts`
- `functions\src\ragAdapter.ts`
- `functions\src\ragAnswer.ts`
- `functions\tests\ask.test.mjs`
- `functions\tests\rag.test.mjs`
- `functions\tests\readiness.test.mjs`
- `public\ask.js`
- `rag\indexing\openai-client.ts`
- `rag\retrieval\runtime-manifest.ts`
- `rag\scripts\runtime-manifest.ts`
- `rag\tests\runtime-retrieval.test.mjs`
- `src\pages\privacy.astro`
- `tests\ask-browser\ask.spec.ts`
- `tests\static.test.mjs`

The ignored generated `functions\runtime-manifest.sha256` was also added
alongside the unchanged existing snapshot. No dependency installation or
manifest-content regeneration was required by this pass.
