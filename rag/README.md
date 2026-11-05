# PubMed ingestion prototype

Standalone, local-only first stage of a future Meridian Station Parkinson's
research pipeline. This subsystem does **not** change the website, Firebase
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
  can consume canonical article JSON; no cloud SDK is included.

Evidence, Experience and Exploration remain distinct. Metadata classification
is not critical appraisal, clinical validation or a treatment recommendation.
No private health data is involved.

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

Structured logs contain only run/query/PMID identifiers, status, counts, timing
and error categories. They never attach API keys, raw exceptions, XML, article
text or abstracts. The CLI prints aggregate summaries, not source content.

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

`npm run rag:test` builds and runs fixture tests without NCBI requests. Coverage
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
- No evidence-quality assessment, retraction/correction monitoring, study outcome
  extraction, citation graph, versioned corpus migration or scheduled refresh.
- Local single-writer files and bounded retries are not distributed transactions,
  coordination or production-scale operations.
- Metadata classification and exploratory query matches do not establish efficacy.

**Not implemented:** OpenAI vector stores, embeddings, RAG retrieval, answer
generation, evidence enrichment agents, Firestore, Cloud Storage, Cloud Scheduler,
Cloud Run, automated production ingestion or production deployment.

Next: review corpus scope, attribution/redistribution rules, correction/retraction
handling and evidence-quality requirements. Then specify chunk provenance and
evaluation criteria before adding embeddings or choosing external storage.
Any integration into `askParkinsons` requires a separately approved phase.
