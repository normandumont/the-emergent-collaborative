# Local corpus governance

This is a deterministic, local preparation policy for public research sources.
It is not clinical appraisal, a medical recommendation, or production retrieval.
Evidence is kept separate from personal Experience and technology Exploration.

## Policy version 1

`config\corpus-policy.json` controls publication types, populations, year bounds,
title/date/abstract/full-text requirements, evidence categories, topic matching and
manual PMID disabling. Its exact bytes and the topic taxonomy are preserved by
SHA-256. Changing behavior requires a new policy version; hashes also distinguish
accidental edits made without a version bump.

Default inclusion requires:

- A normalized article with an approved Parkinson's discovery-query association,
  Parkinson's MeSH descriptor, or bounded Parkinson's title/author-keyword match.
- A supported publication type, with exclusions always taking precedence.
  Journal articles, reviews, systematic reviews, meta-analyses, trials,
  observational/comparative/evaluation studies, case reports and guidelines qualify.
- A title and an actual abstract or approved reusable body prose.
- A permitted population/evidence category and publication year within configured
  bounds, when known.
- No retraction, expression of concern, supersession, duplicate-publication state
  or retraction/correction/concern notice.

Editorials, comments, letters, news, preprints, duplicate publications and
withdrawal/correction notices are excluded by default. Notice records still
provide relationships that can disable or annotate original articles.

Human, animal and unknown populations are permitted, but clearly distinguished.
Unknown study design/population/tier is a warning, not invented classification.
The minimum known year is 1900; there is no default upper bound. Missing date
metadata is warned about, not fabricated. Years after the fixed policy reference
date are warned about; legitimate forthcoming journal dates are not automatically
discarded. A dated reference avoids wall-clock-dependent policy results.

Retractions, concerns, supersession and duplicates are mandatory safety gates;
the policy parser refuses removal of these gates. `retrievalDisabledPmids`
allows an otherwise eligible record to remain disabled without deleting it.
Reinstatement of previously recorded blocking states requires a future reviewed
workflow; mere disappearance of metadata does not automatically reinstate a paper.

## Lifecycle and audits

Supported states: discovered, ingested, normalized, eligible, excluded, active,
corrected, retracted, superseded, retrieval-disabled and error.

The existing catalog `status` remains the ingestion status, preserving prototype
compatibility. Its additive `corpus` cursor records current governance state,
decision path and retrieval eligibility. Decision histories record known ingestion
timestamps, eligibility/activation and correction/withdrawal transitions.
Corrected originals can be active: the correction flag and relationship remain
visible rather than being hidden by the active state.

For every current cataloged normalized article, preparation writes:

```text
data/corpus/policies/<policy-hash>.json
data/corpus/taxonomies/<taxonomy-hash>.json
data/corpus/versions/<pmid>/<governed-record-hash>.json
data/corpus/decisions/<pmid>/<dependency-hash>.json
data/corpus/decisions/<pmid>/current.json
```

Governed records are additive schema-version-1 snapshots. They include source
relationships, expanded classification, topic-assignment explanations and
`studyDesignTier`. Original `data\normalized` files remain untouched by preparation.
Original ingestion's `rct` alias remains compatible; governed records use
`randomized-controlled-trial`.

An audit contains PMID, first evaluation timestamp for that exact input, policy
version/hash, taxonomy hash, original and governed normalized hashes, eligibility,
retrieval-enabled flag, state, content scope, reasons, warnings and lifecycle.
Dependency hashes cover the governed record, input normalized bytes, policy,
taxonomy and deterministic decision. Identical cached reruns reuse audits and
produce byte-identical documents/manifests.

No ineligible raw or normalized article is deleted. Historical decisions and
documents are immutable. A manifest tombstone disables a previously known PMID
if its catalog record disappears; removal from the catalog is not an approved
way to erase history. Orphan/corrupt records require local repair.

## Topic taxonomy

`config\corpus-topics.json` contains:

core-clinical, exercise, sleep, gait, tremor, wearable, digital-biomarker,
alpha-synuclein, glp1, stem-cell, gene-therapy, mitochondria, neuroinflammation,
microbiome, nutrition, neuroprotection, disease-modification,
deep-brain-stimulation, focused-ultrasound, biomarkers, medication, rehabilitation.

Multiple labels are allowed. Every assignment records matching query IDs, MeSH
descriptors or bounded title/author-keyword rules. Legacy discovery tags and
queries are not renamed. A topic label such as neuroprotection identifies subject
matter, not established efficacy. Abstract prose is not used to guess study design.

## Study design and tier

Publication types are used first; specific original-study MeSH descriptors follow.
Ordinary reviews are not misclassified as cohort/animal studies merely because
they discuss those designs. Titles alone do not establish a study design.

Supported designs include systematic-review, meta-analysis,
randomized-controlled-trial, clinical-trial, cohort, longitudinal, case-control,
cross-sectional, observational, case-report, basic-science, animal, in-vitro,
editorial, commentary, guideline and unknown.

In-vitro requires explicit cultured-cell and in-vitro metadata without a clear
human/animal population. Basic-science requires explicit basic-research or
mechanistic-study metadata; it is not a catch-all for unrecognized studies.
Humans plus Animals, or neither, remains population unknown.

| Study design tier | Deterministic basis                                                        |
| ----------------- | -------------------------------------------------------------------------- |
| 1                 | Human systematic review or meta-analysis                                   |
| 2                 | Human randomized controlled trial                                          |
| 3                 | Human longitudinal study, or cohort with prospective/longitudinal metadata |
| 4                 | Other human cohort/case-control/cross-sectional/observational design       |
| 5                 | Explicit human mechanistic/basic-science study                             |
| 6                 | Supported animal research design                                           |
| 7                 | Explicit in-vitro/cellular research                                        |
| 8                 | Editorial/commentary                                                       |
| Unknown           | Insufficient evidence, including uncertain review populations              |

Guidelines and non-randomized clinical trials can remain tier unknown.
Tier is a **study-design prioritization aid, not an individual-paper quality
score**. It does not assess bias, sample size, outcomes or generalizability.
Opinion/guidance remains a distinct evidence category even where no tier applies.

## Licensing and content scopes

The existing full-text gate is unchanged: `pmc-open` membership plus unambiguous
CC BY/CC0 permissions, verified again against the retrieved full-text envelope.
NC, ND, SA, custom or ambiguous permissions remain outside this prototype policy.

| Content scope             | Retrieval behavior                                                      |
| ------------------------- | ----------------------------------------------------------------------- |
| full-text-retrievable     | Citation, original abstract if present and approved body sections       |
| abstract-only-retrievable | Citation, original abstract, MeSH/publication metadata and source links |
| metadata-only             | Retained record; no document enabled for retrieval                      |
| excluded                  | Retained history; not enabled for retrieval                             |

Eligible-but-manually-disabled records retain their potential content scope while
`retrievalEnabled=false`. Abstract-only documents say **Content scope: abstract
only**, do not include invented sections and do not imply access to full study text.

Public abstract availability is not blanket redistribution permission. Documents
are local preparation artifacts; external upload/publication requires separate
rights, terms and attribution review. Future license expansion must be documented,
reviewed and versioned, not silently enabled to increase corpus size.

## Retrieval format and uploader contract

`data\retrieval\<pmid>.md` separates deterministic metadata from fenced original
source text. Fences adapt to literal backticks in source content. Original section
headings, paragraphs and source wording are retained; tables/figures/bibliography
remain outside this prototype.

Every document carries citation identifiers/authors/date/source URLs, source type,
license evidence/statement/copyright, each raw source path/hash/retrieval timestamp,
governed normalized path/hash, original normalized hash and policy version/hash.
Correction relationships and warnings remain visible.

`data\retrieval\manifest.json` is the indexing source of truth. Entries contain
PMID, current path/document hash, eligibility/state/scope, study design/tier,
population/topics/year, withdrawal flags, license, policy and normalized/source
hashes, decision path and pending `indexAction`/`reindexRequired`.

Uploaders must:

- Use only entries with `eligible=true` and `retrievalEnabled=true`; never glob
  Markdown files. Old documents can remain on disk after exclusion.
- Verify document/normalized/source hashes and current policy/taxonomy hashes.
- Honor `indexAction=remove` for withdrawals and disabled records.
- Coordinate using the local writer lock and revalidate the manifest generation
  before publishing an index; an old read is not authorization to upload.
- Treat all actions as pending until indexing/de-indexing is acknowledged.

Preparation first disables the old manifest, then atomically publishes the new
one after artifacts/catalog writes. Any new/refresh ingestion disables the existing
manifest before source updates, because a new notice could affect another paper.
A failed job cannot leave its old entries enabled. An incomplete
cached relationship inventory fails closed because a missing notice could affect
another paper. Files are not a multi-file database transaction; manual repair and
rerun may be required after a crash.

Preparation itself creates no remote index. The separately authorized
[development indexing layer](VECTOR_INDEXING.md) now implements this uploader
contract and local retrieval guards; no production retrieval is connected.
