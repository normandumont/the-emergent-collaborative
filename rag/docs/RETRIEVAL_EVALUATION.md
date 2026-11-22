# Development retrieval evaluation

## Opt-in gold pipeline diagnostics

```powershell
npm run rag:eval -- --gold --diagnostics
npm run rag:eval -- --gold --diagnostics --candidate-depths 30,50,100
# Inside rag:
npm run retrieval-eval -- --gold --diagnostics --candidate-depths 30,50,100
```

Diagnostics and normal development search default to depth 50.
The comparison explicitly runs 15 questions at each supported depth,
with ten final papers and two supporting chunks per paper unchanged.
The installed OpenAI API supports at most 50 results and exposes no search
continuation parameter: depth 100 is recorded as **unsupported**, with no request,
no clamping, and no simulated metric. No default limits, scores, rewriting,
governance or vector contents change.

Reports: `data\evaluation\gold-diagnostics-latest.json` and
`data\evaluation\gold-diagnostics-latest.md`, separate from ordinary evaluations.
Every main gold question–PMID judgment records raw chunk and paper rank/score,
filter reasons, known safety/synchronization conflicts, eligible semantic paper
rank, existing score adjustments, reranked paper rank, paper-limit suppression,
diversification suppression and final rank. Q1/Q14 include the full raw pool with
per-candidate adjustments and final ten results. Provider-reported rewrites are
recorded alongside the original query sent with `rewrite_query=true`.

Primary stage counts use K=5; K=10 counts and highly relevant subset counts are
separate. `reranking-miss` means crossing from within K in eligible semantic paper
order to outside K in local score order. `diversification-miss` means a selected
paper disappears from final output: the current grouping/chunk cap does not do
this. Ordinary cutoff losses are `outside-final-k`; duplicate chunk suppression
is not paper suppression. Raw candidate absence is `candidate-retrieval-miss`
unless a known authoritative safety conflict explains exclusion. All returned
chunks rejected locally is `local-filter-miss`. Final rank within K is `gold-hit`.

Raw pools are observed **after provider filters and provider ranking**. They do
not expose pre-filter embedding candidates. Diagnostic gold loading reports
blocked labels for human adjudication instead of stopping at the first conflict;
it never admits blocked sources to retrieval. Ordinary gold loading remains
strict. Provenance and manifest checks remain authoritative.

Candidate recall is reported both macro (mean per-question recall) and micro
(returned gold judgments / all gold judgments). Repeated chunks never multiply
gold credit. Depth pools come from independent searches and need not be nested.
Elapsed search time includes client rate limiting/retries and parsing. Neither
candidate absence nor low recall alone proves a query-rewrite defect. Labels
remain `draft-human-review`, and unlisted papers remain unjudged.

This phase evaluates **retrieval only**, independently of answer generation.
It does not call Responses, modify `askParkinsons`, publish citations in the UI,
or provide personalized medical interpretation. Queries and retrieved text go to
OpenAI when a live command is explicitly run. Use public research questions only;
never supply personal health information or credentials.

## Direct search

```powershell
npm run rag:search-vector -- "exercise and Parkinson's motor symptoms"
npm run rag:search-vector -- "cycling motor outcomes" --human-only --year-from 2020 --year-to 2026 --max-tier 2 --papers 5 --chunks-per-paper 2
npm run rag:search-vector -- "mitophagy" --topic mitochondria --score-threshold 0.3 --no-rewrite
npm run rag:search-vector -- "exercise trials" --study-type randomized-controlled-trial
```

Defaults: **50 remote candidate chunks, five unique papers, two chunks per paper**,
query rewriting enabled, semantic score threshold 0. Limits accept 1-50;
semantic score thresholds must be 0-1. Rewriting can be disabled for controlled
comparisons; a rewritten query is reported rather than silently substituting it.
No score threshold has been calibrated for research relevance. Development flags
`--candidate-limit`, `--papers`, `--chunks-per-paper`, and `--debug-ranking`
configure diversification or expose deterministic ranking diagnostics.
`--max-results` remains a legacy alias for the paper limit.
See [ranking rules and exact adjustments](RETRIEVAL_RANKING.md).

| Filter                     | Provider translation      | Local enforcement                           |
| -------------------------- | ------------------------- | ------------------------------------------- |
| `--human-only`             | `population = human`      | Unknown/mixed and animal records excluded   |
| `--year-from`, `--year-to` | Numeric `gte`/`lte`       | Missing years excluded                      |
| `--study-type`             | Canonical type equality   | Same equality; `rct` is an alias            |
| `--max-tier`               | Numeric `study_tier <= N` | Missing tiers excluded                      |
| `--topic`                  | No primary-only shortcut  | Full manifest topics, at most 50 candidates |

All queries include provider `retracted = false`. Every hit is then checked
against its locally indexed file receipt and the current manifest, fingerprint,
attributes and verified source/document hashes. Unknown, stale, removed,
retrieval-disabled, withdrawn or mismatched sources are suppressed; counts and
reasons are returned. This remains necessary during eventual-consistency windows.
Top-level results are unique papers with final and semantic scores, verified
titles, current metadata/warnings, and nested score-ordered supporting chunks
with text, filename and file ID. It never writes an AI answer.

Topic filtering can miss relevant papers ranked below the provider's 50-candidate
cap (50 by default, configurable from 1 to 50). Safety suppression can also reduce the requested count; the implementation
does not silently keep paging to an unbounded cost. `candidateLimit`,
`remoteHasMore` and the filter method make this limitation visible. Default search
returns at most two chunks per paper, not repeated top-level article entries.
Counts expose actual remote chunks, eligible/unique candidates, returned
papers/chunks and excess-chunk/paper-limit suppression.

## Question registry and judgments

`evaluation\questions.json` contains 24 maintained questions spanning exercise,
cycling, sleep, tremor, digital biomarkers/wearables, GLP-1, alpha-synuclein,
stem cells, disease modification, nutrition and mitochondria. Difficult cases
test unsupported cure premises, inadequate corpus coverage, review preference,
longitudinal endpoints and human-versus-animal discrimination.

Each entry supports:

```json
{
  "id": "exercise-001",
  "question": "What evidence supports aerobic exercise for Parkinson's disease?",
  "expectedTopics": ["exercise"],
  "preferredStudyTypes": ["systematic-review", "randomized-controlled-trial"],
  "expectedPmids": [],
  "judgments": {},
  "filters": { "humanOnly": true },
  "notes": "Human review required before adding relevance labels."
}
```

Humans should review source content and fill `expectedPmids` for known relevant
papers and/or explicit `judgments` mapping PMID to `relevant` or `irrelevant`.
Conflicting labels are rejected. An omitted judgment is **unjudged**, not
irrelevant. The checked-in starter has no asserted PMID relevance labels:
automatically generated topic/design expectations are review aids, not gold
scientific judgments. No model-generated relevance judging is implemented.

Expected PMIDs can identify relevant sources outside the current index, making a
coverage failure visible. Do not trim the expected set just to increase recall.
Do not label all exercise-tagged papers relevant to every exercise question.
Record reviewer rationale in notes and review treatment/causal claims skeptically.

## Running and reports

After explicitly creating/syncing the small development store:

```powershell
npm run rag:eval
```

Evaluation runs 24 sequential searches with rewriting enabled, threshold 0 and
at most 50 candidate chunks per question, using each question's filters, then
returns up to ten distinct papers with two supporting chunks each. It
generates the ignored, run-specific artifacts:

```text
rag/data/evaluation/latest.json
rag/data/evaluation/latest.md
```

Earlier report bytes are retained under ignored history. The report records
timestamp, remote store ID, exact manifest/question-registry hashes, filters,
rewritten queries, results/scores, suppression counts and methodology. Markdown
shows the top five distinct papers, study types, populations, topics, bounded
chunk excerpts, metadata-proxy checks and curated assessment notes.
Schema-version-2 reports include intent and diversity counts; JSON includes
per-candidate ranking diagnostics. Human assessment remains pending until
someone actually reviews the run.
Failure of a remote search fails the evaluation; no invented fallback results
or success-shaped partial report replace the previous report.

## Metrics

Paper ranks use the first occurrence of each PMID, so repeated chunks do not
inflate recall or precision. Paper ordering is deterministic local retrieval
reranking, not provider chunk ordering and not scientific-quality appraisal.

| Metric                               | Definition and missing-judgment behavior                                                                                                           |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Recall@5 / Recall@10                 | Fraction of distinct expected PMIDs in the first 5/10 distinct papers; null without expected PMIDs                                                 |
| Precision@5                          | Explicitly relevant top-five papers divided by 5; missing result slots count zero; null if no judgments or any returned top-five paper is unjudged |
| Reciprocal rank / MRR                | First expected PMID's reciprocal rank, zero if absent; mean only over questions with expected PMIDs                                                |
| Topic-match rate                     | Fraction of returned distinct papers intersecting expected topics; metadata proxy, not relevance                                                   |
| Human-only correctness               | All returned papers have human metadata for a human-only question; null for an unrequested filter or empty results                                 |
| Retracted / disabled exclusion       | Check returned metadata; null for empty results; suppressed candidate counts are reported separately                                               |
| Preferred evidence retrieved / first | Top-five contains a preferred design / first paper has one; metadata proxies, not critical appraisal                                               |
| Unique-PMID rate                     | Distinct eligible candidate papers divided by eligible candidate chunks, before diversification; null for no eligible candidates                   |
| Duplicate-chunk suppression count    | Sum of chunks above the per-PMID cap across eligible groups; paper-limit omissions excluded                                                        |
| Unique papers in top 5               | Actual count, up to five; no duplicate PMID credit                                                                                                 |
| Human-evidence presence              | At least one human-metadata paper in the top five for clinical-evidence/treatment intent; null for other intents or empty results                  |

New count/rate aggregates report per-question means; evidence/human presence
aggregates report passing/evaluated question counts. Results-only metric calls
without candidate context calculate the unique-PMID rate from supporting chunks
and report zero candidate-cap suppression.

Empty labeled retrieval yields recall/MRR/precision zero. Empty unjudged
retrieval does not become an artificial safety PASS or a fabricated relevance
score. Each aggregate includes its number of evaluated questions. There is
**no single "RAG accuracy" score**.

Safety metrics measure the application-returned set, not independent proof that
OpenAI has physically deleted every source. Mock tests separately exercise
withdrawn, disabled, unknown, stale and nonhuman candidates. Clinical population
and design classification can be incomplete or wrong; review the paper itself.

## Historical initial limitations and review procedure

The initial corpus is only ten exercise-associated documents: nine abstracts and
one reusable full text. It cannot represent Parkinson's literature broadly.
Sleep, GLP-1, transplantation and many other questions will probably have weak
or absent direct coverage. A live exercise search exposed same-paper chunk
dominance; source relevance and corpus-wide query quality still require review.
Do not describe mocked fixture success as good real-world retrieval.

Static provider chunks can include metadata or cross section boundaries.
Scores are not probabilities of scientific truth; a semantically close paper
can fail an endpoint, population, design or causal requirement. Unknown design,
mixed population and a forthcoming publication date need human attention.

Recommended review after an explicit small live run:

1. Confirm the ten intended PMIDs, source scope, hashes and storage usage.
2. Examine exercise/cycling/mitochondrial queries and gap questions side by side.
3. Curate PMID-level relevance and negative judgments with rationale.
4. Check whether a directly relevant synthesis outranks weak observational papers.
5. Review human filtering, source traceability, excerpts and unsupported premises.
6. Compare stable question/manifest versions before proposing chunk/filter changes.

Founder approval of retrieval quality is required before any separate proposal
to connect retrieval to the public AI endpoint. Corpus expansion, custom
section-aware chunks, learned/LLM reranking and answer generation are deferred.
The current keyword/metadata reranking is only a development retrieval heuristic,
not scientific quality assessment or a clinical recommendation.

## Draft corpus-bounded gold set

The expanded development corpus now supports a separate **15-question draft**
in `rag\evaluation\gold.json`, with a readable source/design/population/rationale
review in [`gold-review.md`](../evaluation/gold-review.md). These files are
version-controlled beside the existing registry, rather than under ignored
runtime data. Status is **`draft-human-review`**. This agent-assisted proposal is
not approved human ground truth. The original 24 heuristic questions are unchanged.

Candidate selection used the local corpus title census and candidate abstracts,
publication types, populations and governed metadata **before retrieving answers
to the draft questions**. Favorable, null and conflicting evidence is retained.
The draft has 55 main question-PMID judgments (38 highly relevant), plus one
acceptable supporting judgment, across 50 distinct papers. Full-text availability
does not imply a full-text quality appraisal. Human review remains mandatory.

Each question records stable ID/text, expected `intent`, `topics`,
`preferredStudyTypes`, nonempty `relevantPmids`, optional `highlyRelevantPmids`
and `acceptablePmids`, per-PMID `rationales`, and limitations in `notes`.
Highly relevant IDs must be a subset of relevant IDs; acceptable IDs are disjoint.
Duplicate IDs within a list/question IDs, malformed PMIDs and missing rationales
fail validation. A paper may legitimately occur in more than one question.

Before any gold search, all labeled papers (including acceptable context) must
exist in the current manifest, be active, eligible and retrieval-enabled, not be
retracted, expression-of-concern or superseded, and pass document/normalized/raw
provenance checks. Invalid labels fail explicitly; no silent denominator trimming.
The expected intent is reported, not fed into ranking: the current intent
classifier and all existing ranking/search defaults remain unchanged.

Run **search-only evaluation** against the existing development vector store:

```powershell
npm.cmd --prefix rag run retrieval-eval -- --gold
npm.cmd --prefix rag run retrieval-eval
```

The first command evaluates the 15 draft questions and writes
`rag\data\evaluation\gold-latest.json` / `.md`. The second evaluates the existing
24-question registry and retains its separate `latest.json` / `.md` reports.
Previous report bytes are archived locally. Neither command ingests, uploads,
attaches, detaches, changes chunking, syncs vectors or generates answers.
They send public query text to OpenAI's existing vector-search endpoint.
No new sync is needed or implied. Provider query rewriting is still enabled,
so labels/metric calculations are deterministic but remote retrieval need not be
bit-for-bit reproducible. Store, manifest and question hashes identify each run.

### Gold metric definitions

All ranks first deduplicate by PMID, preserving the existing diversified
paper order. Let `R` be the distinct **main relevant** PMID set, and `P_K` the
first K distinct returned papers.

| Metric                | Definition                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| Recall@5 / Recall@10  | `count(R intersect P_K) / count(R)`                                                             |
| Precision@5           | `count(R intersect P_5) / 5`; absent slots count zero                                           |
| Reciprocal rank / MRR | `1 / first relevant paper rank`, or zero if none; macro mean over labeled questions             |
| Hit@1 / Hit@3 / Hit@5 | Boolean `count(R intersect P_K) > 0`; aggregate reports proportion, passed and evaluated counts |
| Highly-relevant Hit@5 | Same hit test using only `highlyRelevantPmids`, separately; null if no high labels              |
| First relevant rank   | One-based first main relevant paper rank; null for absent or unlabeled relevance                |

MRR is bounded by the ten returned papers (**MRR@10**); no full-index MRR is
claimed. Macro means weight questions equally, not by pool size. Empty labeled
results produce zero recall/precision/RR/hits, but not artificial safety passes.
Highly relevant papers are already in `R`, so are counted only once.
Acceptable supporting papers do not enter `R` or silently receive primary credit.

Gold precision is **closed-pool precision**: unlisted and acceptable papers earn
zero credit, without asserting that all unlisted papers are scientifically
irrelevant. Incomplete relevance pools can underestimate precision and distort
recall interpretation. Human reviewers should expand/adjudicate the pool, not
optimize it against current top results. Gold labels are frozen before the run;
do not tune rankings/weights against this draft during measurement.

Legacy heuristic questions keep their prior missing-label behavior: relevance
metrics remain null without expected PMIDs; partial explicit top-five judgments
still yield null precision. Hit metrics are also null when unlabeled. All
existing topic, candidate-diversity, evidence-preference, human-population and
exclusion metrics remain; none is replaced by a single accuracy score.

Weak coverage is called out in the review: oral-versus-infusion levodopa has no
asserted head-to-head trial; ultrasound ablation has only two narrow studies;
stem-cell transplantation is early-phase/uncontrolled. GLP-1 syntheses overlap
in their primary trials. Some mechanistic and review populations/designs are
automatically unknown; interpretation uses abstracts without changing metadata.
