# Research ingestion, governance and development retrieval prototype

Standalone, locally operated Meridian Station Parkinson's research pipeline.
Acquisition/preparation use local storage; explicitly invoked development vector
commands upload public research to OpenAI. This subsystem does **not** change the website, Firebase
Hosting, `askParkinsons`, or its OpenAI endpoint. Nothing is deployed.

## Architecture and data flow

```text
Controlled query registry
  -> ESearch with history, bounded paging
  -> PMID deduplication + discovery summary + local catalog
  -> batched PubMed EFetch
  -> exact raw response snapshot + per-PMID source manifest
  -> PubMed metadata/abstract parsing
  -> PMCID, when PubMed provides one
  -> PMC OAI-PMH front matter + license/dataset verification
  -> reusable PMC full text only after approval
  -> repeat identity/license verification before saving full text
  -> deterministic normalization + article JSON + catalog + run summary
  -> cache-only corpus governance + immutable governed versions + decision audits
  -> original-source Markdown + retrieval manifest + corpus statistics
  -> explicitly operated development vector indexing + direct search + evaluation
```

- **Discovery** searches only enabled registered queries. It does not fetch
  articles, enrich evidence, or call OpenAI.
- **Ingestion** fetches source records, preserves source provenance and writes
  local documents. Discovery-created catalog entries are not treated as already
  ingested articles.
- **Licensing** is a separate conservative decision module. A PMCID or public
  availability does not establish reuse permission.
- **Normalization** preserves source prose, structured abstract labels, original
  section headings and paragraph boundaries. It does not rewrite or summarize.
- **Storage** uses local files and a single-writer lock. Future storage adapters
  can consume canonical article JSON; no cloud database/storage adapter is included.
- **Corpus preparation** resolves publication relationships, applies versioned
  deterministic eligibility/topic/design rules, and writes retrieval documents.
  It never calls NCBI, OpenAI or another external service.
- **Development indexing/retrieval** uses the official OpenAI SDK only when its
  separate CLI commands are explicitly invoked. The manifest drives selection;
  document/provenance verification and local retrieval guards fail closed.

Evidence, Experience and Exploration remain distinct. Metadata classification
is not critical appraisal, clinical validation or a treatment recommendation.
No private health data is involved; do not enter it into development queries.

## Source APIs and usage policy

PubMed uses [NCBI E-utilities](https://eutilities.github.io/site/Reference_Guide/a_reference/):

- `esearch.fcgi`: `db=pubmed`, exact registered term, `retmode=json`,
  `usehistory=y`, bounded `retstart`/`retmax`, publication-date sorting.
  Subsequent pages use the returned WebEnv and query key to retain the result set.
- `efetch.fcgi`: explicit PMID batches, `db=pubmed`, `retmode=xml`.
  ESummary is not needed because EFetch supplies metadata and abstracts together.

E-utilities parameters are sent in POST bodies, not API-key-bearing URLs.
Provenance URLs represent the safe retrieval parameters and never include
the API key. Redirects are refused. Provider error bodies are not logged.

PMC uses the current [OAI-PMH service](https://pmc.ncbi.nlm.nih.gov/tools/oai/):

- Base: `https://pmc.ncbi.nlm.nih.gov/api/oai/v1/mh/`
- `verb=GetRecord`, `identifier=oai:pubmedcentral.nih.gov:<numeric-pmcid>`
- `metadataPrefix=pmc_fm` for front matter/permissions, without the article body.
- `metadataPrefix=pmc` for full text, only after approval.
- Compressed transfer requested with `Accept-Encoding: gzip, deflate`.

The legacy [PMC OA Web Service](https://pmc.ncbi.nlm.nih.gov/tools/oa-service/)
was retired August 25, 2026. This prototype does not use `oa.fcgi`, retired FTP
datasets, publisher scraping, PubMed HTML, PDFs or browser automation.
See also [PMC automated retrieval guidance](https://pmc.ncbi.nlm.nih.gov/tools/textmining/).

Requests are serialized. E-utilities defaults to at most 3 requests/second
without an API key; an API key permits configuration up to 10/second under
[NCBI's default key policy](https://eutilities.github.io/site/API_Key/usageandkey/).
PMC is always capped at 3/second, even with a key. Retries consume the same
rate budget. Limits apply across users sharing an IP, so coordinate concurrent
processes outside this prototype. This is not a distributed rate limiter.

PMC attempts beyond 100 in a client run are refused during weekday
05:00-21:00 US Eastern, following PMC guidance. Run larger jobs off-peak;
do not restart repeatedly to circumvent this guard. Registered tool/contact
details and NCBI approval may be needed for expanded access. Merely including
tool/email parameters does not register a project with NCBI.

Network errors, timeouts, HTTP 429/5xx and NCBI HTTP-200 rate-limit errors
receive at most three attempts. Retry-After seconds/dates are respected;
waits over 120 seconds fail rather than retry too early. Each attempt times
out after 30 seconds; decompressed responses are limited to 20 MiB.
Malformed source payloads and terminal HTTP errors are not blindly retried.

## Setup and commands

Requires the repository's Node 24 runtime. Install only this package:

```powershell
npm --prefix rag ci
```

Optional environment variables, scoped to your current shell:

| Variable                   | Default                          | Constraint                                   |
| -------------------------- | -------------------------------- | -------------------------------------------- |
| `NCBI_API_KEY`             | None                             | Optional; never commit or log it             |
| `NCBI_TOOL`                | `meridian-station-rag-prototype` | Letters, digits, `_`, `-`; no spaces         |
| `NCBI_EMAIL`               | `contact@meridianstation.org`    | Use an appropriate project contact           |
| `NCBI_REQUESTS_PER_SECOND` | `3`                              | Positive; no-key maximum 3, keyed maximum 10 |
| `NCBI_BATCH_SIZE`          | `20`                             | Integer 1-50                                 |

The package does not load `.env` files. Use environment variables;
`.env*` is ignored as an additional precaution.

From the repository root:

```powershell
npm run rag:search -- pd_exercise
npm run rag:search -- pd_exercise --limit 100
npm run rag:ingest -- 12345678
npm run rag:ingest -- 12345678 23456789
npm run rag:ingest-query -- pd_exercise --limit 10
npm run rag:status
npm run rag:test
```

For execute-gated all-enabled-query discovery/ingestion and comprehensive local
coverage reporting, see [CORPUS_EXPANSION.md](docs/CORPUS_EXPANSION.md):

```powershell
npm run rag:discover-all -- --limit-per-query 75 --dry-run
# Only after explicit authorization of PubMed/PMC network acquisition:
npm run rag:discover-all -- --limit-per-query 75 --execute
npm run rag:prepare
npm run rag:corpus-report
```

Default planning covers eight enabled queries and at most 600 candidate slots
before overlap. Missing `--execute` always means no network or data writes.
The workflow resumes matching unfinished plans and never invokes OpenAI or
vector synchronization. Coverage reports include all 22 governed topics,
even those without a dedicated enabled discovery query.

For failed acquisitions, `npm run rag:repair -- --help` lists explicit repair
modes without loading configuration, writing data or accessing the network.
`npm run rag:repair -- --cached-only` restores missing source references from
verified retained batches; this offline behavior is also the default.
Add `--normalize-cached` to normalize cache-complete unresolved records.

Only `npm run rag:repair -- --retry-acquisition` authorizes network access:
it targets current technical acquisition failures and downloads only missing
PMC artifacts, reusing verified PubMed caches. It never rediscovers queries,
fetches PubMed again, overwrites healthy records or calls OpenAI/vector services.
It stops after acquisition, leaving catalog/normalized/governed records untouched.
Run `npm run rag:repair -- --cached-only --normalize-cached`, then
`npm run rag:prepare` and `npm run rag:corpus-report` explicitly afterward.
For more than 100 PMC attempts, use off-peak hours; the existing daytime guard
is not bypassed. See [repair details](docs/CORPUS_EXPANSION.md#cached-repair-and-preparation-diagnostics)
for summary meanings and resumability.

For a read-only HTTP diagnostic, run `npm run rag:test-pmc -- 42059110`.
It resolves one unresolved PMID from verified caches and requests only its first
missing PMC artifact (front matter, or full text already permitted by cached
front matter). Healthy/cache-complete records are skipped. It prints a safe URL,
HTTP status, attempt timing and body-completion timing without article text,
secrets or cache writes; it never chains into full-corpus repair.
Set `RAG_HTTP_DIAGNOSTICS=1` for the same safe per-attempt diagnostics during
other development ingestion/repair commands. NCBI requests identify the project
using the configured `NCBI_TOOL` as their User-Agent.

Every command builds the isolated TypeScript package first. Direct package
commands also work: `npm --prefix rag run ingest-query -- pd_exercise --limit 10`.
Data/configuration locations are anchored to the package, not the caller's cwd.

Limits must fit the query's configured cap (currently 100). Direct PMID ingestion
accepts at most 100 positional IDs and deduplicates them. Unknown/disabled queries,
invalid IDs and unsupported CLI flags fail explicitly.

All eight initial queries are in `config\pubmed-queries.json`, with enabled flag,
description, exact query, controlled topic tags and prototype cap. The registry
covers core trials, systematic reviews, exercise, sleep, digital biomarkers,
GLP-1, alpha-synuclein and stem cells. These are discovery categories, not
claims about effectiveness or evidence strength.

### Caching, refresh and recovery

Default ingestion skips successfully normalized articles. A discovered or failed
catalog entry remains eligible for ingestion. Cached raw sources can be reused
after a failed run without changing their original retrieval timestamps.

Explicit `--refresh` on `rag:ingest` or `rag:ingest-query` refetches and replaces
per-PMID manifests and PMC raw files. PubMed batch snapshots are uniquely named;
older snapshots are retained. Normalized JSON and catalog updates are atomic
file replacements. Raw files are never silently reconstructed or overwritten.

`data\.run.lock` prevents concurrent writers using these commands. A crash can
leave a stale lock. Inspect its PID and timestamp, verify the process is no
longer running, then remove only that specific lock file manually. No automatic
stale-lock deletion is performed.

Corrupt JSON, absent source manifests, hash mismatches or missing normalized
files fail explicitly. A crash between raw and provenance writes can require an
explicit refresh. Multi-file writes are not database transactions. Per-article
errors are counted and categorized; any errors cause a nonzero ingestion exit.
Already completed records remain available.

Acquisition structured logs contain only run/query/PMID identifiers, status, counts, timing
and error categories. They never attach API keys, raw exceptions, XML, article
text or abstracts. Acquisition CLIs print summaries, not source content.
Direct development search deliberately prints research queries/results/chunks,
but never raw provider errors, request headers or credentials.

## Folder structure and storage

```text
rag/
  config/       approved query/topic registry and deterministic evidence rules
  discovery/    request client, rate limiter, history search, PMID deduplication
  ingestion/    PubMed/PMC parsing, licensing, normalization, orchestration
  shared/       schema, configuration, safe logs, XML helpers, local storage
  scripts/      thin search/ingest/ingest-query/status CLIs
  tests/        authored synthetic XML fixtures and deterministic tests
  data/
    catalog.json
    discovery-runs/<timestamp-uuid>.json
    ingestion-runs/<timestamp-uuid>.json
    raw/pubmed/batches/<run-batch>.xml
    raw/pubmed/batches/<run-batch>.xml.provenance.json
    raw/pubmed/<pmid>.json
    raw/pmc/<pmcid>.metadata.xml
    raw/pmc/<pmcid>.metadata.xml.provenance.json
    raw/pmc/<pmcid>.xml
    raw/pmc/<pmcid>.xml.provenance.json
    normalized/<pmid>.json
```

PubMed returns a single XML document per batch. Saving its **exact original
payload once** and using per-PMID JSON provenance manifests avoids rewriting
source XML into synthetic per-article "raw" files. Manifests identify the batch,
source URL, SHA-256 and original retrieval timestamp. PMC snapshots are the
exact returned OAI envelopes, not reserialized JATS fragments.

Generated data, compiled `lib`, dependencies and `.env*` are ignored by Git.
Live data stays local; it is not published with the website or committed.
Retain source/license attribution if later exporting permitted material.

## Canonical schema

`shared\article-schema.ts` defines schema version 1:

- `identity`: PMID primary key, nullable PMCID and DOI.
- `citation`: nullable title/journal/date/year; named and collective authors.
  Date precision is retained; no fabricated January 1 dates.
- `classification`: publication types, MeSH descriptors, registered topic tags,
  deterministic study type and human/animal/unknown population.
- `source`: PubMed/PMC URLs, original PubMed retrieval timestamp, source type,
  explicit license ID/URL/all discovered license URLs/statement/copyright/evidence
  URL, full-text reuse decision and skip reason, query IDs, raw provenance.
- `content`: nullable abstract and original body sections with heading, deterministic
  section kind and text. Structured abstract labels and paragraph breaks are kept.
- `status`: abstract presence, extracted full-text presence, normalized flag.

Each source snapshot has its own retrieval timestamp and hash. `hasFullText`
means body prose was extracted, not that every table, image or supplement is present.
Catalog query/topic associations are cumulative; a normalized document records
the associations known when it was written. Refresh updates that snapshot.

Publication-type precedence: meta-analysis, systematic review, RCT, clinical trial,
unknown. Population is human only with `Humans` and no `Animals`; animal only
with `Animals` and no `Humans`; both or neither remain unknown.
These rules do not infer population or study quality from prose.

## Conservative full-text licensing policy

Approval requires **both** membership in the PMC `pmc-open` dataset and an explicit,
recognized license URL:

- CC BY 1.0/2.0/2.5/3.0/4.0, or CC0 1.0.
- License URLs can come from JATS license hrefs, namespaced `license_ref` nodes
  or license ext-links.
- Conflicting URLs or restrictive statements/copyright notices cause denial.
- NC, ND, SA, custom, ambiguous or absent licenses are outside this prototype's
  allowlist. This does not assert that every rejected license forbids every use.
- PMC/PMID identities are verified. Full-text permissions must match the approved
  front-matter license; mismatches are not saved or normalized.

Denied records retain only PubMed metadata/abstract plus available PMC front-matter
provenance and an explicit skip reason. No denied article body is fetched after a
negative front-matter decision. An unverified full-text response is discarded,
not persisted. Previously approved snapshots can remain on disk after a later
license change; refreshed ingestion never incorporates them against the new gate.

`reuseAllowed` describes **this full-text ingestion policy**, not blanket rights
to redistribute PubMed metadata or abstracts. Public abstract availability is not
an unrestricted redistribution license. Future public corpus publication requires
separate rights and attribution review.

## Tests and live prototype

`npm run rag:test` builds and runs fixture tests without NCBI or OpenAI requests. Coverage
includes registry parsing, request construction, serialization/rate limits,
timeouts/retries/throttling, deduplication, PubMed parsing and missing fields,
DOI/PMCID/MeSH/classification, canonical normalization, conservative licensing,
PMC identity/sections, local cache/catalog/refresh/locking and end-to-end ingestion.
Test XML/prose is synthetic and authored for these tests.

One optional live one-record smoke test is disabled by default:

```powershell
$env:RAG_LIVE_TEST = "1"
npm run rag:test
Remove-Item Env:RAG_LIVE_TEST
```

It uses a temporary local directory and removes only its own generated files.
The requested persistent 10-record exercise prototype is:

```powershell
npm run rag:ingest-query -- pd_exercise --limit 10
```

An initial no-key run retrieved 10 of 3,836 matches, normalized all 10 abstracts,
found one PMCID and ingested its CC BY 4.0 full text, with zero errors.
Counts and licensing availability can change in later runs.

Example **real normalized-record excerpt**, without abstract/body content:

```json
{
  "schemaVersion": 1,
  "identity": { "pmid": "42734454", "pmcid": "PMC13667388" },
  "classification": { "topics": ["exercise"] },
  "source": { "reuseAllowed": true, "fullTextSkipReason": null },
  "status": { "hasAbstract": true, "hasFullText": true, "normalized": true }
}
```

The excerpt intentionally omits fields; consult `data\normalized\42734454.json`
for the complete record, including its actual DOI and citation.

## Limitations and next phase

- Prototype cap 100/query; not an exhaustive search or production ingestion service.
- PMCID detection uses PubMed article identifiers; no separate ID-converter enrichment.
- PubMed journal articles are supported. Book records/unexpected structures fail
  explicitly rather than silently losing metadata.
- Source XML is parsed as UTF-8; internal entity declarations are rejected and
  external DTDs are never fetched.
- Body prose only: original nested section headings are retained; figures,
  tables, bibliography and supplements are not ingested.
- No evidence-quality assessment, live retraction/correction monitoring, study
  outcome extraction, citation graph or scheduled refresh. Cached source metadata
  now supports deterministic withdrawal/correction detection and versioned governance.
- Local single-writer files and bounded retries are not distributed transactions,
  coordination or production-scale operations.
- Metadata classification and exploratory query matches do not establish efficacy.

**Not implemented:** production retrieval, RAG answer generation, evidence
enrichment agents, Firestore, Cloud Storage, Cloud Scheduler,
Cloud Run, automated production ingestion or production deployment.

Development Vector Store indexing/search/evaluation is implemented separately.
External-upload rights review and an explicitly operated small live evaluation
must precede any claims about real retrieval quality.
Any integration into `askParkinsons` requires a separately approved phase.

## Corpus preparation and governance

```powershell
npm run rag:prepare
npm run rag:corpus
```

`rag:prepare` reads current cached source records, preserves original normalized
files and produces additive schema-version-1 governed snapshots. No network is
required. `rag:corpus` reports statistics only; it fails explicitly if preparation
has not been run.

Configuration: `config\corpus-policy.json` and `config\corpus-topics.json`.
The existing discovery registry and its tags remain compatible.

Outputs:

```text
data/corpus/policies/<policy-sha>.json
data/corpus/taxonomies/<taxonomy-sha>.json
data/corpus/versions/<pmid>/<normalized-sha>.json
data/corpus/decisions/<pmid>/<dependency-sha>.json
data/corpus/decisions/<pmid>/current.json
data/retrieval/<pmid>.md
data/retrieval/versions/<pmid>/<document-sha>.md
data/retrieval/manifest.json
data/history/<sha>/<original-relative-path>
```

Every document includes source attribution and raw/governed/original normalized
hashes. Abstract-only records are clearly labeled; only approved CC BY/CC0 body
text is included. Source blocks are original text, never AI summaries.

Eligibility, warnings and evidence tiers are deterministic classifications, not
claims of clinical quality. Retracted, concerned, superseded, duplicate or otherwise
ineligible records are retained but disabled. Corrected originals retain their
original text and link their notices.

Refresh now archives old raw/normalized bytes before replacement and disables
the existing retrieval manifest first. Preparation temporarily disables the old
manifest before publishing a new one. Uploaders obey the manifest,
not scan all Markdown files: historical files remain after exclusion.

The cached 10-article exercise corpus prepared successfully: 10 eligible/enabled,
nine abstract-only, one reusable full text, zero exclusions or preparation errors.
Seven have human metadata; three remain population unknown. Design tiers are
1: one paper, 2: three papers, 3: one paper, unknown: five papers. The source's
2027 publication date is retained with a forthcoming-date warning.

Details:

- [Corpus governance](docs/CORPUS_GOVERNANCE.md)
- [Corrections, retractions and versioning](docs/CORRECTIONS_AND_RETRACTIONS.md)
- [Chunking analysis and prototype compromise](docs/CHUNKING_STRATEGY.md)
- [Development vector indexing](docs/VECTOR_INDEXING.md)
- [Retrieval evaluation](docs/RETRIEVAL_EVALUATION.md)
- [Development paper-level ranking](docs/RETRIEVAL_RANKING.md)

## Development vector commands

Read [VECTOR_INDEXING.md](docs/VECTOR_INDEXING.md) before live use. Supply the key
only through `OPENAI_API_KEY`; optional `OPENAI_RAG_VECTOR_STORE_ID` overrides the
ignored current development store. Commands do not run automatically during build,
preparation or normal tests.

```powershell
npm run rag:vector:create
npm run rag:vector:sync
npm run rag:vector:status
npm run rag:search-vector -- "exercise and Parkinson's motor symptoms" --human-only
npm run rag:eval
```

Static chunks are explicitly 800 tokens with 100 overlap; one paper per file.
Development search retrieves 50 candidates by default, then returns up to five
unique papers with two supporting chunks each using deterministic, explainable
metadata/intent adjustments. This is retrieval ranking, not scientific quality
assessment or clinical guidance. `--debug-ranking` exposes the adjustments.
Sync is manifest-only, hash-verified, state-journaled and idempotent. Batch size
defaults to ten; more than 100 desired documents needs `--allow-large-sync`.
Unknown remote files are reported, not deleted. Removed sources can briefly
remain searchable remotely; local retrieval guards still suppress them.

State (`data\vector-state.json`) and evaluation reports (`data\evaluation\latest.*`)
are ignored. New stores expire seven days after provider-defined last activity.
Detaching/deleting a vector store does not delete underlying uploaded Files.
The optional live OpenAI smoke test requires an explicitly configured, fresh,
empty workspace-owned smoke-test store and opt-in/confirmation variables;
normal tests never require an API key.

No live OpenAI indexing, searches or evaluation were run during implementation.
No production vector ID, answer generation, website integration or deployment
has been added.
