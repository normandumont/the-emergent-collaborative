# Governed local corpus expansion

This is a development corpus workflow, not a production release. Only the
configured PubMed/PMC services are used for acquisition. No OpenAI key is
required or read, and no discovery, ingestion, preparation or reporting entrypoint
imports vector indexing. There is no vector-sync step.

## Planned and authorized execution

```powershell
npm run rag:discover-all -- --limit-per-query 75 --dry-run
```

The default is a dry run even without `--dry-run`: it prints enabled queries,
effective per-query caps and maximum candidate slots, without acquiring a lock,
writing data or making a network request.

The current registry has eight enabled queries, all capped at 100:
core trials, systematic reviews, exercise, sleep, digital biomarkers, GLP-1,
alpha-synuclein and stem cells. Default workload: **8 x 75 = 600 candidate slots**,
before overlap and eligibility. Limits 1-100 are supported; 50, 75 and 100 are
recommended. Smaller configured query caps are respected.

Only after explicit human authorization:

```powershell
npm run rag:discover-all -- --limit-per-query 75 --execute
npm run rag:prepare
npm run rag:corpus-report
```

`discover-all --execute` runs each enabled query independently using the existing
ESearch history/paging implementation, then ingests the union of discovered PMIDs
in configured EFetch batches. Existing normalized catalog records are not
refetched; incomplete records reuse verified raw caches. Existing PMC dataset,
identity, CC BY/CC0 license checks and immutable provenance handling are unchanged.
Denied full text can leave an eligible abstract; publisher sites/PDFs are never used.

Preparation is intentionally an explicit, separate cache-only step over the full
catalog. Ingestion disables the prior local retrieval manifest before changing
source material. Do not attempt indexing between ingestion and preparation.
Preparation's fail-closed publication-relationship inventory is not relaxed:
one missing/corrupt notice can prevent safe retrieval for other records.

Only eight queries are currently enabled, not one query for each of the 22
governed topics. Secondary topic assignments may broaden coverage, but 600
candidate slots cannot guarantee 500 unique eligible papers. Do not alter
governance or force quotas to achieve 500-1,000 articles.

## Deduplication, progress and recovery

PMID is the storage/deduplication key. The catalog retains cumulative query IDs,
topic tags, first/last discovery timestamps and explicit `discoveredBy` mappings
of query IDs to cumulative discovery topic tags. Legacy catalog entries remain
valid; missing historical mappings are not fabricated. New rediscoveries add
their exact relationships. Each multi-query report also preserves the exact
query/topic relationships for that run. Governed canonical topics are derived
by the existing taxonomy during preparation, not by relabeling discovery tags.

Reports are incrementally written to:

```text
rag\data\discovery-runs\multi-query-<timestamp>-<uuid>.json
rag\data\discovery-runs\multi-query-progress-<plan-hash>.json
```

The report embeds descriptions, exact queries, tags, requested/effective limits,
match totals, returned PMIDs, known/new counts and cross-query duplicates.
Known/new counts use the catalog at the start of the entire run. Cross-query
duplicates count slots already returned by preceding successful queries, not
previously ingested articles. Each query links its independent discovery report.
PMID outcomes and categorized errors are recorded separately from query errors.

The fingerprint contains the enabled query definitions/order/caps, not secrets.
An unfinished/partial/fatal matching plan resumes automatically: completed
queries are skipped, failed queries retry, and only not-yet-normalized PMIDs
are ingested. Completed queries retain their original PubMed snapshot dates.
After a successfully completed run, another execution performs fresh discovery
but reuses unchanged normalized/raw material. A changed plan creates a new run;
previous journals and downloaded sources remain available.

Progress is persisted after every completed query and ingestion batch, while
the existing ingestion pipeline persists each PMID/catalog update. An interruption
within unfinished ESearch paging can repeat that query; it does not restart
completed queries. A crash between multi-file writes can require explicit cache
repair/refresh; journals are atomic files, not cross-file database transactions.
The existing single-writer lock can remain stale after a crash: verify its
recorded process is no longer running before manually removing only
`rag\data\.run.lock`. Never remove raw caches or vector state to resume.

Network/source errors are isolated to queries/PMIDs where possible. A partial run
is journaled and exits nonzero; configuration/storage/internal errors preventing
reliable discovery/checkpointing are fatal and exit nonzero. Ingestion's existing
per-PMID error handling remains authoritative. License-denied full text is a
recorded skip, not necessarily a failed article. Preparation errors are handled
by the separate preparation command and remain fail-closed.

Use the existing NCBI environment settings and serialized rate/retry policy.
PMC attempts beyond 100 are refused during weekday 05:00-21:00 US Eastern.
Run large acquisitions off-peak; do not repeatedly restart to evade this guard.

## Local coverage reports

`rag:corpus-report` writes:

```text
rag\data\reports\corpus-latest.json
rag\data\reports\corpus-latest.md
```

It reads the catalog, authoritative manifest and hash-verified governed/base
records/raw provenance, checking enabled retrieval-document hashes as well.
Corrupt provenance, changed policy/taxonomy or discovery relationships and
unprepared catalog entries are explicit repair/preparation issues. Reports
describe the last governance snapshot; they do not reevaluate or change policy.
Missing supplemental records are not silently replaced with invented evidence
or population labels. The command exits nonzero for provenance/governance errors
while still preserving a diagnostic report when possible.

All configured taxonomy topics are reported, including zeros. Discovered coverage
combines canonical catalog/query relationships and governed topical assignments;
eligible/enabled counts come from the manifest. Rows overlap. Design/tier and
population counts distinguish all governed versus eligible records.

Population reporting precedence: explicit Humans + Animals MeSH -> mixed;
cellular evidence category or in-vitro design -> in-vitro/cellular; otherwise
canonical human/animal/unknown. Unverified supplemental metadata -> unknown.
Canonical governance population labels are retained separately and never changed.
Ordinary reviews remain unknown when governance cannot identify a design.

Publication years use the policy reference year. Future warnings/years are listed,
not newly excluded. "Very old" means more than 30 years before that reference
year. Missing year/date lists are explicit. Full-text licensing denials and
actual reusable-full-text requirement exclusions are separate; ordinary
abstract-only eligibility is not treated as a licensing failure.

Coverage gaps use transparent eligible-article counts:

| Eligible count | Corpus coverage |
| -------------- | --------------- |
| 0-9            | critical        |
| 10-24          | low             |
| 25-49          | moderate        |
| 50+            | substantial     |

Human RCT, systematic-review and meta-analysis counts accompany each topic.
These labels describe **corpus coverage only**, not scientific evidence strength.

Planning targets are reported, not enforced: syntheses 100-150; RCTs 150-250;
cohort/longitudinal 100-150; mechanistic/translational proxy 100-200; other
governed evidence remaining. The trial proxy includes classified RCTs only,
not inferred nonrandomized controlled trials. The mechanism proxy uses the
existing human-mechanistic/animal/cellular evidence categories, not claims
that every such paper is translational. Target categories can overlap (for
example, animal syntheses); other evidence is the complement of their union.

Query overlap counts unique PMIDs per one/two/three-or-more queries, lists the
highest-overlap PMIDs and ranks query-pair intersections. This describes the
selected discovery window and accumulated query relationships, not unbiased
coverage of all Parkinson's literature.

Readiness can be `needs-local-preparation-or-repair` or
`prepared-locally-awaiting-human-review`. Neither means production-ready,
scientifically appraised, clinically recommended or authorized for vector upload.
Selection remains publication-date biased and classifications incomplete.
Human corpus review and approval of genuinely missing topic queries should
precede a separately authorized indexing/evaluation phase.

## Cached repair and preparation diagnostics

```powershell
npm run rag:repair -- --help
npm run rag:repair -- --cached-only
# Optional: normalize only unresolved records whose required sources are cached:
npm run rag:repair -- --cached-only --normalize-cached
npm run rag:prepare
npm run rag:corpus-report
```

Default and `--cached-only` repair never permit network access.
They restore missing per-PMID EFetch references
only from retained XML batches with their original verified provenance sidecars,
original request IDs, hashes and retrieval timestamps. It does not fabricate
provenance, overwrite healthy source files, or rerun discovery. Optional cached
normalization defers papers missing required PMC front matter/full text and
preserves their original acquisition failure categories for a later, separately
authorized retry. Results are written to `reports\cache-repair-latest.json`.

Network access requires a separate explicit opt-in:

```powershell
# Root command; run only when targeted acquisition is authorized:
npm run rag:repair -- --retry-acquisition
# Equivalent package command:
npm --prefix rag run repair -- --retry-acquisition

# After acquisition, explicitly normalize cached results and prepare locally:
npm run rag:repair -- --cached-only --normalize-cached
npm run rag:prepare
npm run rag:corpus-report
```

`--retry-acquisition` selects only catalog ingestion errors with technical
categories, excluding normalized, merely discovered, configuration-error and
policy-excluded records. An existing normalized record is skipped even if its
catalog error flag is stale; corrupt existing normalized data is blocked for
local review. Verified cached PubMed XML is mandatory: no ESearch/EFetch fallback.
Only missing PMC front matter and subsequently permitted missing full text are
downloaded through the existing NCBI client and licensing checks. Cached corruption
or absent provenance is reported, not silently replaced.

The retry is **artifact-only**: it does not normalize or prepare, update the
catalog, invalidate the retrieval manifest, overwrite healthy records, or touch
governed versions. Preparation alone cannot normalize newly acquired sources;
the explicit cached normalization step above is required. No mode invokes
OpenAI, vector synchronization or deployment. `--normalize-cached` remains valid
alone for compatibility but cannot be combined with `--retry-acquisition`.
Conflicting, duplicate and unknown flags fail configuration validation.
`--help`/`-h` exits successfully before configuration, locks or data access.

The JSON summary reports initial `targetPmids`, `frontMatterNeeded` and
`fullTextNeeded`, plus `repaired`, `alreadyCached`, `remaining`, `throttled`,
`timeouts` and total `failed`. `repaired` means newly completed artifact
acquisition, **not normalized**. `alreadyCached` means all required permitted
artifacts already verify; no request is made. `remaining` counts incomplete or
blocked acquisition targets. Missing front matter leaves full-text permission
unknown: `fullTextUndetermined` reports those targets separately; they may need
an additional full-text request after licensing is verified. Full-text need is
never inferred from a missing front-matter response.

Progress is checkpointed after every PMID to
`ingestion-runs\acquisition-retry-<run>.json` and
`reports\acquisition-retry-latest.json`, with safe per-target failure categories
and references. Failures produce a nonzero exit; successful downloads remain
cached. A rerun recomputes missing artifacts and skips completed downloads even
though catalog ingestion errors remain until explicit normalization.
An interrupted raw/provenance write or other cache corruption remains blocked
for explicit local repair, never automatic destructive refresh.

The shared NCBI client retains three attempts, 30-second per-attempt timeout,
Retry-After, exponential backoff/jitter and serialized request limits.
PMC requests beyond 100 actual attempts are prohibited on weekdays
05:00-21:00 US Eastern; use off-peak hours for larger repairs. Retries count
toward that limit. The repair never restarts the client to evade the guard.

### One-PMID HTTP diagnostic

```powershell
npm run rag:test-pmc -- 42059110
# Equivalent package command:
npm --prefix rag run test-pmc -- 42059110
```

This diagnostic is read-only and does not acquire the writer lock. It verifies
the selected technical acquisition target's cached PubMed provenance, then tests
only the first missing PMC artifact. Missing front matter selects `pmc_fm`;
otherwise verified cached front matter must permit the missing `pmc` full text.
It does not refetch healthy/cache-complete records, write the downloaded response,
change catalog/governed data, or invoke discovery, preparation or vector services.
An OAI unavailable/deleted response is identified separately from article availability.

The command logs a credential-free PMC URL and controlled per-attempt diagnostics:
host, operation, attempt, start/end timestamps, HTTP status, failure category and
elapsed milliseconds. Body completion, not just receipt of HTTP headers, is timed.
`RAG_HTTP_DIAGNOSTICS=1` enables these per-attempt events for other development
NCBI operations; logs never include source text, request bodies, API keys or email.

All NCBI requests send the configured tool identifier as `User-Agent`.
During the timeout investigation, the generic Node user-agent received HTTP 200
quickly but the PMC full-text body streamed too slowly for the 30-second deadline;
native Node fetch of that exact full-text URL also timed out. Changing only
User-Agent in the otherwise unchanged client completed the same response quickly.
Fast Identify/front-matter responses were not equivalent full-body tests.
The server-side cause of this user-agent-dependent transfer behavior is unknown.
Fresh per-attempt controllers, deadline cleanup, retry limits, provenance/license
gates and serialized scheduling remain unchanged.

The expanded corpus exposed two integration defects: unnormalized acquisition-only
PMIDs were included in the global cached relationship inventory, and a descendant
`ArticleId` search incorrectly selected PMC/DOI identifiers from cited references.
The parser now reads only an article's direct `PubmedData/ArticleIdList`.
Well-formed batches retain valid individual records and retry only failed groups;
invalid whole XML receives one parsing retry before bounded binary splitting.
Normal successful EFetch remains batched. Cached corruption is never hidden by
automatic refetching.

The relationship inventory covers verified cached PubMed sources and historically
ingested records, not mere discovery IDs that never acquired a source. Missing or
corrupt historically ingested sources still disable retrieval globally. A failed
new acquisition with no normalized/source record is a technical error for that
PMID, not evidence that a previously valid paper's provenance is corrupt.

Safe diagnostics identify PMID, portable relative reference, concise controlled
description and specific failure code: missing normalized/raw/provenance/version,
invalid path/schema/version, hash mismatch, JSON read failure or incomplete
relationship inventory. No raw payload, full text, credentials or provider
exception is logged. Reports distinguish manifest entries, successfully governed
records, technical errors and policy exclusions; technical errors do not inflate
scientific exclusion counts.

Raw hashes and immutable base normalized hashes are unchanged when discovery
relationships change. New taxonomy/discovery metadata can create a new derived
governed snapshot and document; previous versions and the original source hashes
remain intact. This is metadata reevaluation, not content-provenance replacement.
Portable persisted paths use `/`, resolving to native filesystem paths locally;
absolute paths and traversal are rejected.

NCBI network retries remain bounded to three attempts with a 30-second timeout,
serialized configured rate limits, exponential backoff with up to 25% jitter
when Retry-After is absent, and exact bounded Retry-After handling when present.
HTTP-200 JSON/XML/HTML throttling envelopes are recognized without treating
ordinary scientific XML as a throttle response. Exhausted requests remain
resumable acquisition failures, not endless retry loops.

## Offline safety tests

Tests cover enabled selection, caps, execution guard, idempotency, relationship
preservation through ingestion, cache reuse, query/PMID isolation, journal
recovery, overlap, taxonomy/design/population/date/license statistics and reports.
A transitive import-graph regression rejects vector/OpenAI dependencies in discovery,
preparation, reporting and repair entrypoints. A guarded child runtime refuses OpenAI/vector module imports
and unexpected network requests while completing mocked NCBI acquisition,
cache-only preparation and report generation, with zero vector/OpenAI attempts.
No live service is required.
Targeted repair tests also cover side-effect-free help, offline default/explicit
cached mode, targeted selection, cache/provenance preservation, conditional
licensing, front-matter-only/full-text-only acquisition, interruption recovery,
idempotency and bounded throttle/timeout failures with mocked requests.
