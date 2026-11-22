# Development paper-level retrieval ranking

**Retrieval reranking is NOT an assessment of scientific quality or a clinical
recommendation.** It is a deterministic development heuristic for choosing
research sources. No LLM classifies intent or reranks papers. No indexing,
chunking, manifest eligibility, source text, licensing or production chat changes
are required.

## Why diversify

A live exercise query returned ten chunks from only two papers: PMID 42734454
occupied eight slots and PMID 42928476 occupied two. Long full-text documents can
dominate a chunk-ranked list simply because they contain more matching passages.
Those passages are not independent studies.

Normal search now requests **50 candidate chunks**, validates the existing
manifest/receipt/hash/metadata safety conditions, and groups eligible chunks by
PMID. A paper's semantic score is its **highest chunk score**, never its sum or
chunk count. Chunks within each group sort by descending original semantic score.
The default response contains up to **five unique papers**, each with at most
**two supporting chunks**. Fewer eligible papers means fewer results, not invented
sources or weakened filters.

```powershell
npm run rag:search-vector -- "What evidence supports aerobic exercise for Parkinson's disease?"
npm run rag:search-vector -- "cycling outcomes" --papers 5 --chunks-per-paper 2 --candidate-limit 50 --debug-ranking
npm run rag:search-vector -- "mitophagy pathways" --papers 5 --human-only --no-rewrite
```

`--candidate-limit`, `--papers` and `--chunks-per-paper` each accept 1-50.
The provider-supported candidate maximum remains 50. `--max-results` remains a
legacy alias for the **paper limit**, not chunk count; conflicting alias/explicit
paper limits fail. Existing human/year/type/tier/topic filters and query rewriting
are preserved. Topic post-filtering uses the same requested candidate pool, not
an automatic larger or unbounded query.

## Transparent intent rules

Text is lowercased, Greek alpha is normalized, and punctuation/hyphens become
spaces. Rules run in this order; the first matching rule wins:

| Intent            | Rule                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------- |
| clinical-evidence | Explicit clinical/human evidence, randomized, trial, outcomes, or `does ... improve`     |
| treatment         | Treatment/treating, therapy/therapies, medication, drug, levodopa                        |
| epidemiology      | Epidemiology, incidence, prevalence, risk factor                                         |
| biomarkers        | Biomarker, sensor, measurement, validation/validated                                     |
| mechanism         | Mechanism, pathway, mitochondria/mitochondrial, mitophagy, alpha-synuclein, inflammation |
| technology        | Technology, wearable, device, digital, app, artificial intelligence/AI                   |
| clinical-evidence | Broader `what evidence` or symptoms, if no earlier rule matched                          |
| general-research  | No clear match                                                                           |

Explicit clinical endpoints override mechanistic keywords. A question about
mitochondrial mechanisms can remain mechanistic even if it says "what evidence."
Mixed questions are imperfectly classified: output exposes `intent` and
`intentRule`, not an assertion of what the visitor meant.

Topic matches reuse the existing taxonomy's IDs, keywords and MeSH phrases,
matching normalized whole phrases. Cycling/bicycling/biking additionally map to
the existing exercise topic. An explicit `--topic` is also considered.
Repeated words or multiple matched topics never multiply the bonus.

## Exact adjustments

Final paper score = highest semantic chunk score + adjustments.
**Positive adjustments require semantic score >= 0.4 and no more than 0.15 below
the best eligible candidate.** This gate is an uncalibrated development safeguard,
not a relevance cutoff: lower-score sources remain retrievable without bonuses.
Penalties remain mild and do not disable eligibility.

Clinical settings below apply to both clinical-evidence and treatment intents:

| Signal                                                            | Adjustment                                                                   |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Human population, clinical                                        | +0.015                                                                       |
| Systematic review or meta-analysis, clinical                      | +0.015                                                                       |
| Randomized controlled trial, clinical                             | +0.012                                                                       |
| Clinical trial, clinical                                          | +0.008                                                                       |
| Cohort or longitudinal, clinical                                  | +0.005                                                                       |
| Known study tier, clinical                                        | `max(0, 0.006 - 0.001 * tier)`; tier 1 +0.005, tier 2 +0.004, tiers 6-8 zero |
| Animal/in-vitro/basic-science study type, mechanism               | +0.005; no clinical human/design/tier bonuses                                |
| Human population, epidemiology                                    | +0.010                                                                       |
| Cohort/longitudinal/systematic review/meta-analysis, epidemiology | +0.010                                                                       |
| Human population, biomarkers                                      | +0.005                                                                       |
| Cohort/longitudinal study type, biomarkers                        | +0.005                                                                       |
| Any clear query-topic match, all intents                          | +0.008 once                                                                  |
| Unknown study type                                                | -0.003                                                                       |
| Unknown population                                                | -0.003                                                                       |
| Null study tier                                                   | -0.003                                                                       |
| `future-dated-publication-metadata` warning, clinical             | -0.005                                                                       |
| Other distinct warnings, clinical                                 | -0.001 each, capped at -0.003                                                |
| Corrected flag, clinical                                          | -0.002; original/correction provenance remains visible                       |

The legacy `rct` type is canonicalized. For mechanism, technology and general
research there is no penalty merely for a known animal population, and no
future-date/other-warning/correction penalty. Unknown metadata still receives
only the mild penalties listed above. Strongly relevant unknown or future-dated
papers can remain first.

Positive adjustments total at most **+0.043**; negative adjustments at most
**-0.019**. A substantially lower semantic score therefore cannot leapfrog a
strongly relevant review simply through trial metadata. Scores/adjustments are
rounded to six decimal places for stable presentation. The final ranking score
is not a probability and can fall outside 0-1; original chunk scores and
`--score-threshold` retain their semantic/vector meaning.

Paper ordering: final score descending, semantic score descending, then numeric
PMID ascending. Chunk ties use file ID, filename and text in deterministic lexical
order. Input order and chunk multiplicity do not change a paper's score.

## Output and debug

Top-level entries are papers with `rank`, `pmid`, verified title, final `score`,
`semanticScore`, current metadata/warnings, and nested `chunks` containing original
scores, text, filename and file ID. No flat ten-entry chunk list is returned.

Response counts distinguish:

- `candidateLimit`: requested remote limit.
- `remoteCandidates`: number actually returned and examined.
- `eligibleCandidates`: chunks passing safety/filter/source verification.
- `uniqueCandidates`: distinct eligible PMIDs before the paper limit.
- `uniquePaperCount` / `chunkCount`: final returned papers/supporting chunks.
- `duplicateChunksSuppressed`: excess chunks beyond each group's cap, across all
  eligible groups; does not include papers discarded by the paper limit.
- `paperLimitSuppressed`: unique papers omitted by the configured paper limit.

`--debug-ranking` adds score-only diagnostics for every unique eligible candidate:
semantic score, individual adjustments, final score, bonus-gate status, unknown
metadata/future-date reasons, all sorted candidate chunk scores and selection
status. It does not expose every discarded chunk's text.

## Safety, evaluation and limitations

Retracted, disabled, concerned, superseded or otherwise policy-blocked sources
remain hard-suppressed **before** grouping/ranking. No preference can reinstate
them. `--human-only` still excludes animal and unknown/mixed records.
Source/hash checks and manifest-generation checks are unchanged.

Evaluation retrieves at most 50 chunks and returns at most ten unique papers
with two chunks each, so Recall@10 can actually inspect ten papers if available.
Recall/MRR/precision use paper ranks. New diversity/presence metrics supplement,
not replace, human relevance judgments. See [evaluation](RETRIEVAL_EVALUATION.md).

This heuristic cannot recover papers missing from the candidate pool. Fifty
chunks might still cover only two papers; the response honestly returns two.
Classification and topic tags are incomplete, semantic scores are uncalibrated,
intent keywords can conflict, and a trial label does not establish scientific
quality, relevance to the endpoint, or treatment efficacy. No within-paper section
diversification or exact-text duplicate removal is implemented; highest-score
chunks can overlap. Human source review remains necessary before evaluating
answer generation or proposing any production integration.
