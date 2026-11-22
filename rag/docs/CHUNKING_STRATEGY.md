# Chunking strategy: analysis and development prototype

The section-aware strategy below remains an analysis target. The separately
authorized development OpenAI layer now uses explicit static **800-token chunks
with 100-token overlap**, one paper per file, selected only by the retrieval
manifest. It creates remote chunks/embeddings only when live commands are
explicitly run. No generated answers or production retrieval are implemented.

Provider static chunking preserves paper boundaries, original document headings
and file-level PMID attributes, but cannot guarantee paragraph/section cuts,
whole abstracts, character offsets, neighbor IDs or a full provenance envelope
inside every chunk. Metadata/governance text can also be retrieved. These are
known evaluation limitations, not implemented section-aware guarantees.
See [development indexing](VECTOR_INDEXING.md) and
[retrieval evaluation](RETRIEVAL_EVALUATION.md).

## Source boundaries

Use the enabled retrieval manifest, not directory discovery. Validate policy,
document and normalized hashes before reading content. Parse the generated
Markdown's metadata, section headings and fenced source blocks separately.
Metadata and governance prose are not article claims.

Never combine multiple papers in one chunk. Keep each chunk associated with one
PMID and one immutable document version. Abstract-only documents must remain
marked abstract only at document and chunk level.

## Starting size and overlap

Recommend a target of **600-800 source tokens**, initially about 700, with
**80-120 tokens of overlap** between chunks within the same long section.
Do not use overlap across unrelated sections or papers.

These are evaluation starting points, not fixed requirements for every paper.
Use the actual tokenizer selected for the future indexing model; character
counts are not reliable token measurements. Small abstracts/sections can remain
whole. Avoid filling a chunk with repeated citation/provenance boilerplate.

Split at paragraph boundaries first, then sentence boundaries when a paragraph
exceeds the target. Preserve exact source text and character offsets; do not
AI-rewrite, shorten conclusions or manufacture contextual sentences.

## Section-aware handling

- Preserve original section/subsection headings and ordered section paths.
- Keep short abstracts whole, including structured labels.
- Do not mix Introduction background with Results as if both were findings.
- Long Methods should split by existing subsections, then paragraphs. Preserve
  interventions, comparators, doses/units, timing, inclusion criteria and related
  procedural lists together when practical.
- Keep a result's qualifiers, denominators, uncertainty and nearby explanation
  together. Do not isolate an effect statement from its limitations merely to
  hit a token budget.
- Discussion and Limitations remain distinct from reported Results. Use adjacent
  section identifiers/neighbor links to retrieve context rather than fabricate a
  Results-to-Discussion summary.
- Extremely long paragraphs require sentence-level splitting with offsets and
  explicit continuation links. Tables/figures/supplements are not currently
  available and must not be implied by a chunk.

## Per-chunk provenance envelope

Every future chunk should carry at least:

PMID, PMCID/DOI when known, title, authors, journal/date, source URLs, content scope,
license/attribution, section path and ordinal, source-text character offsets,
document SHA-256, governed normalized SHA-256, original normalized SHA-256,
raw source hashes/timestamps, policy version/hash, topic labels, study design/tier,
population, withdrawal/correction flags and relationship identifiers.

Use a stable chunk ID derived from PMID, immutable document hash, section path
and offsets. Neighbor IDs can provide context without joining paper contents.
Copy current eligibility as an indexing precondition, but enforce it again at
retrieval time: stale chunk metadata must not override a newer withdrawal.

## Evaluation before production use

Assess citation accuracy, source traceability, section completeness, abstraction
scope, retrieval relevance and failure behavior on excluded/corrected/retracted
fixtures. Include queries requiring Methods details and conflicting Results and
Discussion interpretations.

Compare candidate sizes/overlaps using the same curated questions. Evidence tier
may aid ranking, but must not suppress contradictory evidence or substitute for
bias/quality assessment. Unknown-design papers must not be assigned invented
quality or human-population labels.

Review external-upload rights for abstracts and full text before vector indexing.
Then specify uploader generation locks, hash verification, idempotent indexing
and de-index tests. This document does not authorize changing `askParkinsons`.
