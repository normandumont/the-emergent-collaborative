# Corrections, retractions and corpus refresh

## Metadata detection

The parser uses PubMed publication types, `CommentsCorrectionsList` and
`PubMedPubDate` retraction history, not model inference. Relationships preserve
RefType, related PMID when present, RefSource, Note and source PMID. Missing
related IDs stay null; the relationship can still establish a correction or
withdrawal state.

Mappings follow the
[NLM PubMed DTD](https://dtd.nlm.nih.gov/ncbi/pubmed/out/pubmed_250101.dtd):

| Metadata | Result |
| --- | --- |
| Retracted Publication, RetractionIn, retracted history | Original retracted; retrieval disabled |
| RetractionOf / Retraction of Publication | Retraction notice; links original |
| ExpressionOfConcernIn | Original concern; retrieval disabled |
| ExpressionOfConcernFor / Expression of Concern | Concern notice; links original |
| ErratumIn | Original corrected; retain text and link notice |
| ErratumFor / Published Erratum | Correction notice; not a replacement article |
| UpdateIn / RepublishedIn | Original superseded; retrieval disabled |
| UpdateOf / RepublishedFrom | Updated article linked to original; independently evaluated |
| CorrectedandRepublishedIn | Original corrected and superseded |
| CorrectedandRepublishedFrom | Corrected replacement linked to original |
| RetractedandRepublishedIn | Original retracted and superseded |
| RetractedandRepublishedFrom | Replacement linked to withdrawn original |
| Duplicate Publication | Duplicate flagged and excluded |

Preparation also resolves incoming notice/replacement relationships within the
cached corpus. A `RetractionOf` notice can disable its original even if the
original's own cached record lacks `RetractionIn`. Supporting raw provenance is
retained in the governed record.

Publication flags describe what these sources support, not a guarantee that no
new notice exists outside the cached corpus. There is no live monitoring or
external retraction database integration in this phase.

## Original text and reinstatement

An ordinary corrected original remains eligible if it meets other policy rules.
Its correction PMID, relationship and warning are included in governed metadata
and retrieval documents. Notice text is not silently substituted, patched or
merged into the original paper.

Retracted/superseded originals and notices remain in the catalog with raw,
normalized, governed and decision history. Their manifest entries disable
retrieval and request removal from any future index.

Previously recorded blocking flags remain sticky. Missing or later absent
metadata is not proof of reinstatement. Explicit reviewed reinstatement is not
implemented; repair does not automatically waive a known withdrawal.

## Current manual workflow

```powershell
npm run rag:search -- pd_exercise --limit 10
npm run rag:ingest-query -- pd_exercise --limit 10 --refresh
npm run rag:prepare
npm run rag:corpus
```

Discovery finds IDs; it does not refresh existing source records. Explicit
ingestion refresh refetches source envelopes. Before any affected refresh,
ingestion marks all existing manifest entries retrieval-disabled, because newly
retrieved relationships could affect an original outside the requested batch. Failed ingestion
therefore cannot leave old content active for a later uploader.

Preparation is cache-only and performs no network calls. It checks current
per-PMID manifests and hashes, rebuilds governed metadata from those sources,
resolves relationships, reevaluates policy and regenerates eligible documents.
An updated raw PubMed manifest is noticed even when the original normalized
prototype file has not yet been refreshed.

## Versioning

- PubMed batches keep their unique original snapshot filenames.
- Before replacing per-PMID manifests, normalized JSON or PMC envelopes/sidecars,
  old exact bytes are saved under `data\history\<sha256>\<original-relative-path>`.
- Governed normalized records, decisions, policies, taxonomy and retrieval
  documents use immutable content/dependency-addressed versions.
- Current JSON pointers and Markdown documents are atomic file replacements;
  their previous bytes remain archived.
- The manifest retains disabled/tombstone entries instead of deleting history.
- SHA-256 proves byte identity, not source correctness or evidence quality.

Raw source, normalized record, policy and document versions can differ
independently. A policy-only change needs reevaluation even when source text is
unchanged. Every retrieval chunk must eventually identify the exact document,
normalized and raw versions rather than only a mutable PMID path.

## Recommended future refresh optimization

```text
PubMed rediscovery
  -> retrieve fresh metadata/source snapshot under coordinated limits
  -> compare source-content hashes with prior versions
  -> unchanged source and unchanged policy/taxonomy:
       retain active document; record freshness observation separately
  -> changed source, relationship, policy or topic classification:
       preserve prior snapshot
       produce new normalized/governed version
       reevaluate corpus policy
       generate new eligible document or disable it
       mark vector re-index/removal required
```

Current explicit refresh preserves new provenance observations and can produce a
new governed/document hash even when body bytes are unchanged, because retrieval
timestamps, snapshot paths or input normalized hashes changed. Separating
freshness observations from canonical source identity is a proposed optimization,
not implemented hash-based HTTP conditional fetching.

Index synchronization and acknowledgment do not exist yet. `reindexRequired`
remains true and `indexAction` expresses pending work only. The next approved
phase must specify idempotent upload/delete operations, generation checks,
de-index acknowledgment and retrieval tests proving withdrawn material cannot
remain searchable.
