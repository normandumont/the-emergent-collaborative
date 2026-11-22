# Development vector indexing

This is an explicitly operated **development prototype**, not a production RAG
service. Commands run locally but, when invoked, upload approved public research
documents to OpenAI and persist remote data there. They do not change the website,
`askParkinsons`, `/api/ask`, Firebase, deployment settings or acquisition behavior.
No answer generation, scheduling or automatic daily indexing is implemented.
Evidence, Experience and Exploration remain separate; this index is research
information, not personal health data or medical interpretation.

## Setup and lifecycle

Use Node 24 and the isolated official OpenAI SDK dependency:

```powershell
npm --prefix rag ci
```

Provide the API key through **`OPENAI_API_KEY` only**, using your normal secret
management mechanism. Do not paste it into source, committed shell scripts,
config files, logs or questions. No `.env` loading, alternate key variable,
production secret lookup or account-specific store ID is supplied.

Optional `OPENAI_RAG_VECTOR_STORE_ID` selects an explicit development store;
otherwise `rag\data\vector-state.json` remembers the current store. The
environment selection takes precedence. The ignored state contains a workspace
UUID, store/file receipts, document and manifest hashes, timestamps and pending
operations, **never credentials**. Prior store receipts survive `--force-new`;
state revisions are archived under ignored `data\history`.

These are live commands: run them only after deciding to upload the corpus and
reviewing external-hosting rights/attribution, including abstract rights. Public
abstract availability is not blanket redistribution permission.

```powershell
npm run rag:prepare
npm run rag:corpus
npm run rag:vector:create
npm run rag:vector:sync
npm run rag:vector:status
npm run rag:search-vector -- "exercise and Parkinson's motor symptoms"
npm run rag:eval
```

Creation prints the ID, name and creation timestamp. Existing configured/current
stores are reused, not duplicated. Registration of an explicitly configured store
does not adopt unknown files or establish ownership of that store.

```powershell
npm run rag:vector:create -- --force-new --expires-days 7
```

New stores default to an expiration policy of **7 days after provider-defined
`last_active_at`**; `--expires-days` accepts 1-365. Existing store policies are
not changed by this option. Do not assume inspecting local state renews remote
retention. Expired stores cannot be synced; explicitly create a new development
store. Expiration does not promise deletion of underlying uploaded Files objects.
`--force-new` leaves the old store intact. If the environment variable still
selects an old ID, update/remove it before syncing the new store; creation reports
that override explicitly.

## Manifest authority and verification

`data\retrieval\manifest.json` is the **only corpus-selection authority**.
No Markdown glob, directory scan, catalog discovery or remote filename determines
inclusion. Both `eligible` and `retrievalEnabled` must be true. The entry must be
active, have an upsert action and not be retracted, concerned or superseded.
An explicit remove action takes precedence over otherwise enabled flags.

Before any document upload:

1. Validate the manifest and current policy/taxonomy hashes.
2. Read the indicated file as bytes; verify its SHA-256 against the manifest and
   require valid round-trippable UTF-8. Never silently normalize differing bytes.
3. Verify governed/base-normalized snapshots and each recorded raw-source hash.
4. Derive compact attributes and a fingerprint of document hash, attributes and
   chunking configuration.

A mismatch reports the PMID, prevents that document's upload, removes its tracked
stale index attachment and makes the command fail. Other independently verified
documents may complete; per-document failures are explicit, not success defaults.
Source files, catalog and immutable history are preserved.

All commands use the acquisition/preparation single-writer `data\.run.lock`, but
do not call acquisition code. The manifest generation is checked again before
remote mutations and before returning search results. A lock is local, not
distributed: do not run another machine against the same development store.

## Reconciliation

Sync compares the manifest, per-store local receipts and paginated remote inventory.

| Condition                                                                          | Action                                                       |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| New enabled document                                                               | Verify, upload and attach                                    |
| Same fingerprint, completed remote attachment and matching attributes/chunks       | No upload/removal                                            |
| Changed hash, metadata or chunk settings                                           | Detach old attachment; verify and index replacement          |
| Previously indexed attachment missing remotely                                     | Re-upload                                                    |
| Disabled, retracted, concerned, superseded, removed action or absent from manifest | Detach tracked attachment                                    |
| Unknown remote file                                                                | Report its ID; never silently adopt/delete                   |
| Indexing still in progress                                                         | Resume polling; do not re-upload                             |
| Permanent/unknown per-file failure                                                 | Retain and report failure; no automatic retry                |
| Confirmed per-file `server_error`                                                  | Retire failed attachment and retry on the next explicit sync |

`reindexRequired`/upsert describe manifest intent, not an instruction to upload on
every run. Matching receipts acknowledge that intent without rewriting governance
history. A second successful unchanged sync performs no uploads or removals.

The CLI prints the desired indexed document count before upload. Prototype batches
default to **10 files**, configurable with `--batch-size` from 1-500. Files are
uploaded serially and attached through provider batch ingestion with **per-file**
attributes/chunk settings. Every batch is polled to terminal per-file status;
failures retain the PMID, file ID and safe error code locally. Polling permits
60 cycles, spaced 2 seconds apart; network requests have separate timeouts.
Timeouts preserve state and can be resumed with sync.

More than **100 desired documents** requires `--allow-large-sync`, even if many
already exist. Safety removals happen before this cost gate. Keep the existing
10-document exercise corpus initially; the override is not permission for an
unreviewed full PubMed upload.

Requests are serialized with at least 250 ms spacing. Safe reads/polls receive
at most three attempts for connection errors, 408, 429 and server errors.
Retry-After is respected up to 60 seconds; longer waits fail instead of retrying
too early. SDK automatic retries/debug logging are disabled. Non-idempotent
creation, upload and batch requests are **not blindly retried**. Error bodies,
request headers and raw provider exceptions are never printed.

## Interrupted operations

Intent is persisted before remote writes and receipts immediately afterward.
Creation can recover exactly one matching workspace/creation-token store after an
ambiguous response. An unresolved creation requires dashboard inspection before
an explicit `--force-new`; it is not silently repeated.

An ambiguous file upload blocks subsequent uploads. Inspect `pendingUpload` and
its exact generated filename in the OpenAI dashboard. Confirm/remove the orphan
Files object before manually clearing that specific journal field under the local
lock. Do not delete the whole state file or infer ownership from a PMID alone.

An ambiguous batch is recoverable if all its known file IDs appear remotely.
If some never appear, the command refuses to reattach blindly. Inspect/cancel the
provider batch, confirm its outcome and reconcile only those receipts before
clearing the specific pending batch. Permanent file failures require fixing the
document/configuration and a new fingerprint, or deliberate operator repair after
the cause is understood. Missing state is not permission to adopt unknown files.

## Attributes and chunks

Each file receives at most 10 attributes:

`pmid`, `year`, `study_type`, `study_tier`, `population`, `content_scope`,
`license`, `retracted`, `topic_primary`, `document_sha256`.

There are currently **10 possible keys** (well below OpenAI's 16-key limit).
Unknown year/tier/license are omitted, not encoded as zero or invented values.
`rct` is canonicalized to `randomized-controlled-trial`. `topic_primary` is the
alphabetically first full topic tag, deterministically chosen, not a relevance
judgment. Complete topics and provenance remain local; topic filtering checks
the full manifest list rather than silently discarding secondary topics.

Explicit static chunking:

```json
{
  "type": "static",
  "static": { "max_chunk_size_tokens": 800, "chunk_overlap_tokens": 100 }
}
```

One paper is always one uploaded file. Article boundaries, original headings and
PMID/provenance metadata remain in the Markdown. Provider-managed static chunking
does **not** guarantee section-aware cuts, source offsets, whole short abstracts,
or repetition of PMID/headings in every chunk. Some retrieved text may include
governance/metadata prose rather than article findings. Do not interpret that
prose as evidence. File attributes and local manifest association preserve paper
identity. See [chunking analysis](CHUNKING_STRATEGY.md) for deferred section-aware
requirements; custom chunking/reranking are not implemented.

## Removal, status, costs and deletion

Detachment preserves local research history. OpenAI removals are eventually
consistent: a detached file may briefly remain in provider search. Successful
removal receipts prevent repeated detach requests on stale listings. Local search
guards reject removed, disabled, withdrawn, unknown and mismatched receipts, even
before the provider stops returning them. This is not an independent proof of
immediate provider deletion.

Status reports ID/name, provider indexed count, desired documents not yet ready
(pending, excluding known failures), failed work, disabled
entries, retracted removal receipts, source/hash mismatches, unknown remote IDs,
last successful sync, manifest-generation alignment and provider usage bytes.
It is a live read, not an offline health check.

Vector storage and search may incur account/project-specific charges; provider
parsed/chunked bytes can exceed source bytes, especially with overlap.
Use reported `usageBytes`, the OpenAI dashboard and
[current pricing](https://openai.com/api/pricing/). No live indexing or search
was run during implementation, so there is no measured storage/cost estimate.
There is no generation-token cost from this code because it never calls Responses.

Delete only a workspace-created development store with exact ID confirmation:

```powershell
npm run rag:vector:delete -- --confirm vs_EXACT_DEVELOPMENT_STORE_ID
```

The command checks live workspace/scope metadata and refuses an unidentified/shared
store. **It does not delete underlying Files objects.** Use the OpenAI dashboard
or official `files.delete` API for only the recorded workspace file IDs, after
confirming they are not attached/needed elsewhere. Do not delete unknown files.
Detached/replaced Files objects and expired stores need this separate retention
review. Removing local state alone does not delete remote data.

## Tests

`npm run rag:test` uses authored fixtures/mocks and needs no OpenAI access.
The optional live test is disabled unless explicitly enabled. Create a fresh,
empty workspace-owned smoke-test store (not a shared development index):

```powershell
npm run rag:vector:create -- --force-new --smoke-test
$env:OPENAI_RAG_VECTOR_STORE_ID = "vs_ID_PRINTED_ABOVE"
$env:RAG_LIVE_VECTOR_CONFIRM = $env:OPENAI_RAG_VECTOR_STORE_ID
$env:RAG_LIVE_VECTOR_TEST = "1"
npm run rag:test
Remove-Item Env:RAG_LIVE_VECTOR_TEST
Remove-Item Env:RAG_LIVE_VECTOR_CONFIRM
```

The test refuses stores without matching workspace, development and smoke-test
metadata, any existing remote files, or prior local file receipts. It derives an
isolated two-document manifest from the current real manifest, uploads/indexes,
searches for an expected PMID, withdraws one document and checks local exclusion
and removal state. It cleans up only its own uploaded file IDs and preserves
receipts/journals in the real ignored state even on failure. Ambiguous writes may
still need manual orphan cleanup. The empty store remains for explicit deletion;
use a fresh smoke-test store for another run.

No live test should be enabled merely because an API key happens to be available.
Normal validation must leave both live test opt-ins disabled.
