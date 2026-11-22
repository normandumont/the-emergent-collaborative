# RAG grounding review

Status: new local sample captured; 6 candidates awaiting human adjudication.

The original 19 candidates remain unrecoverable from aggregate-only captures.
This is a new sample of the same seven controlled questions, using the current
local pipeline unchanged, not the older deployed revision. It is not production
approval or automated scientific truth scoring. No A-E intervention is justified
solely by structural matches. Review disease modification versus symptom change,
preclinical versus clinical efficacy and observational association versus causation
against only the captured excerpts. A shared paragraph citation may suffice.

Answers captured: 7/7. New structural warnings: 6.
Classified: 0. Candidates marked as requiring a code/prompt change: 0 assigned; 6 still unreviewed.

| Classification | Assigned count |
| --- | ---: |
| citation-required | 0 |
| general-framing | 0 |
| adjacent-citation-sufficient | 0 |
| overbroad | 0 |
| unsupported | 0 |

Unassigned candidates are not evidence of zero unsupported/overbroad claims.
The complete text, paragraph context, citation offsets and evidence excerpts are
in ignored local bundles under `functions\data\grounding-review\`. Offsets use
UTF-16 code units; warningIndex is zero-based within each question.

Disease-modification, animal/mechanistic and observational-causality verdicts
require explicit human assessment against the bundles; this renderer assigns no
automatic scientific pass. Unsupported/overbroad findings are recorded only
when a human adjudication is supplied.

| Question:warningIndex | Claim | Nearby citations | Available PMIDs | Classification | Supporting PMIDs | Action | Rationale |
| --- | --- | --- | --- | --- | --- | --- | --- |
| general:0 | It commonly affects movement, causing slowness, stiffness, tremor, and problems with balance or walking; it can also involve non-motor symptoms such as changes in mood, thinking, smell, or automatic body functions. | \[PMID 40762930\] | 41995965, 42653440, 41164908, 42515380, 40762930 | pending-human-review | Unassigned | Review captured paragraph and excerpts | Not scientifically adjudicated |
| clinical:0 | Human evidence suggests structured exercise can improve Parkinson’s motor function, gait, and balance: a meta-analysis of 20 randomized trials \(714 participants\) found improvements in motor scores and balance, though all trials had some concerns or high risk of bias. | \[PMID 42789569\] | 42789569, 42758697, 42928476, 42082156, 42734454 | pending-human-review | Unassigned | Review captured paragraph and excerpts | Not scientifically adjudicated |
| progression:0 | The strongest evidence here supports exercise improving symptoms and function—not slowing the underlying neurodegeneration. | \[PMID 42789569\] | 42615931, 42789569, 42758697, 42159410, 42082156 | pending-human-review | Unassigned | Review captured paragraph and excerpts | Not scientifically adjudicated |
| mechanistic:0 | In Parkinson’s disease research, impaired mitochondrial function is thought to contribute to stress and vulnerability in dopamine-producing neurons. | \[PMID 42734454\], \[PMID 42343639\] | 42734454, 42877680, 42343639, 42233523, 42742907 | pending-human-review | Unassigned | Review captured paragraph and excerpts | Not scientifically adjudicated |
| emerging-therapy:0 | Stem-cell therapy is a promising experimental approach, but it is not yet established as a treatment that restores function or slows Parkinson’s disease progression. | \[PMID 42381498\] | 42405498, 42682180, 42925426, 42381498, 42712434 | pending-human-review | Unassigned | Review captured paragraph and excerpts | Not scientifically adjudicated |
| clinical-repeat:0 | Human evidence suggests exercise can improve Parkinson’s motor and physical-function outcomes, but the supplied evidence does not isolate aerobic exercise’s effects well. | \[PMID 42789569\] | 42789569, 42758697, 42928476, 42082156, 42734454 | pending-human-review | Unassigned | Review captured paragraph and excerpts | Not scientifically adjudicated |
