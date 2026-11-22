# Parkinson's retrieval gold set: draft for human review

**Status: `draft-human-review` (version 1). Not validated or authoritative.**
This is an agent-assisted curation proposal, not completed human adjudication.
Founder/scientific reviewer approval is pending. It measures retrieval, not
medical correctness, treatment efficacy, or answer quality.

## Independent selection and provenance

Candidates came from a title census of **516 locally retrieval-enabled papers**,
followed by reading candidate abstracts, publication types, populations and
governed metadata. No retrieval ranks were inspected to choose these labels.
Both favorable and negative findings were retained. No corpus metadata was edited.
Selection used abstracts; availability of full text does **not** imply a
full-text methodological appraisal. Review full text where available before approval.

Source snapshot: `rag\data\retrieval\manifest.json`, SHA-256
`caed7eee6bb9bf74d62d3cc12c49b9813d852d654edcc47b2868f77dfbb0fce4`.
For each PMID, the inspected citation and abstract are in
`rag\data\normalized\<PMID>.json`; governed records are in
`rag\data\corpus\versions\<PMID>\<normalizedRecordSha256>.json`.
Their provenance lists original raw paths, source URLs and SHA-256 hashes.
Evaluation rechecks active manifest membership, blocking flags, document and
source hashes **before any search**; labels are never silently dropped.

**15 questions; 55 main relevance judgments, including 38 highly relevant
judgments; one additional acceptable judgment; 50 distinct papers.**
Repeated papers across questions are separate question-paper judgments.

H = highly relevant (also in the main relevant pool); R = relevant;
A = acceptable context, excluded from primary metrics.
Study type/population below are the **governed metadata**, not an independent
quality rating. Rationale describes the actual design when automated labels are
unknown or misleading. In particular, human-derived cells do not mean a human
clinical trial. Primary gold for clinical questions favors direct human endpoints;
mechanism questions intentionally include nonhuman work.

Pools are not an exhaustive relevance census. Unlisted papers are unjudged,
not adjudicated irrelevant. Closed-pool precision gives them no credit and may
underestimate precision. Overlapping systematic reviews do not represent
independent clinical replications. None of the judgments should be changed solely
to fit current retrieval results.

## 1. Aerobic exercise and motor symptoms

**Question:** What human evidence supports aerobic exercise for motor symptoms in Parkinson's disease?

Intent: `clinical-evidence`. Topics: `exercise`.
Highly relevant: 41171380, 42170720.
Relevant: 41171380, 42170720, 42789569, 42859236.

| Label / PMID | Title | Governed study type / population | Rationale |
| --- | --- | --- | --- |
| H / 41171380 | Parkinson's disease, aerobic exercise and photobiomodulation: a randomised controlled trial. | randomized-controlled-trial / human | Direct motor and walking outcomes; exercise improved some outcomes without additive PBM benefit. |
| H / 42170720 | Efficacy of Aerobic Exercise on Brain MRI Measures in Parkinson's Disease. | randomized-controlled-trial / human | Direct aerobic RCT with null motor/MRI findings; negative results are relevant. |
| R / 42789569 | Effects of exercise interventions on gait, motor function, and balance in patients with Parkinson's disease: A meta-analysis with clinical implications. | meta-analysis / human | Twenty-RCT motor/FOG synthesis; broader than aerobic exercise alone. |
| R / 42859236 | Exercise modality and planned weekly exercise exposure for motor outcomes in Parkinson's disease: a systematic review, Bayesian network meta-analysis, and meta-regression. | systematic-review / human | Broad modality/dose comparison; low confidence, not an optimal individual prescription. |

Review caveat: cardiopulmonary-only pilot 42928476 is not primary gold for motor
symptoms. Benefit on symptoms does not establish neuroprotection.

## 2. Exercise, mitophagy and translation

**Question:** How might exercise influence mitophagy and neuroprotection in Parkinson's disease, and what has been shown in humans?

Intent: `mechanism`. Topics: `exercise`, `mitochondria`, `neuroprotection`.
Highly relevant: 42734454, 42342162, 42170720.
Relevant: 42734454, 42342162, 42653440, 42170720.

| Label / PMID | Title | Governed study type / population | Rationale |
| --- | --- | --- | --- |
| H / 42734454 | Nitric oxide signaling and mitophagy in Parkinson's disease: implications for aerobic exercise-related neuroprotection. | unknown / unknown | Narrative framework links NO/exercise/mitophagy and identifies missing direct human/neural evidence. |
| H / 42342162 | The irisin-PINK1/Parkin axis plays an essential role in mediating microglial mitophagy: A crucial mechanism for exercise-induced neuroprotection against Parkinson's disease. | unknown / unknown | Mouse and microglial perturbation experiments directly test the pathway; not human efficacy. |
| R / 42653440 | Activation of the Nrf2-ARE Signaling Pathway Mediates the Neuroprotective Effects of Exercise in a Mouse Model of Chronic Parkinson's Disease. | animal / animal | Exercise/Nrf2 perturbation links mitochondrial ROS and microglial responses. |
| H / 42170720 | Efficacy of Aerobic Exercise on Brain MRI Measures in Parkinson's Disease. | randomized-controlled-trial / human | Human primary MRI outcome is null, constraining preclinical translation. |

Review caveat: intentional mixed-population question, with no universal
human-only restriction.

## 3. Sleep treatment evidence

**Question:** What trial evidence exists for improving sleep quality and daytime sleepiness in Parkinson's disease?

Intent: `treatment-evidence`. Topics: `sleep`.
Highly relevant and relevant: 42782386, 42263875, 42558005.

| Label / PMID | Title | Governed study type / population | Rationale |
| --- | --- | --- | --- |
| H / 42782386 | Pharmacological treatment of sleep disorder phenotypes in Parkinson's disease: a systematic review and meta-analysis of randomised controlled trials. | meta-analysis / human | Direct 29-RCT synthesis; heterogeneous EDS findings and low-certainty sleep benefit. |
| H / 42263875 | Effects of light therapy on sleep and anxiety in Parkinson's disease: A pilot trial. | randomized-controlled-trial / human | Bright/dim crossover pilot measures PSQI/ESS/PSG in 33 people. |
| H / 42558005 | Blue light therapy delivered through light glasses improves sleep quality and daytime sleepiness in Parkinson's disease: A randomized trial. | randomized-controlled-trial / human | Placebo-controlled light-glasses pilot measures the requested outcomes. |

Review caveat: pilot light evidence and a drug synthesis are not a complete
treatment inventory. Isolated RBD conversion studies are not intervention evidence.

## 4. Freezing of gait

**Question:** What evidence supports exercise or brain stimulation for freezing of gait in Parkinson's disease?

Intent: `synthesis`. Topics: `gait`, `exercise`, `deep-brain-stimulation`.
Highly relevant: 42789569, 42909654.
Relevant: 42789569, 42909654, 42615931.

| Label / PMID | Title | Governed study type / population | Rationale |
| --- | --- | --- | --- |
| H / 42789569 | Effects of exercise interventions on gait, motor function, and balance in patients with Parkinson's disease: A meta-analysis with clinical implications. | meta-analysis / human | Explicit FOG Questionnaire endpoint with low-certainty exercise evidence. |
| H / 42909654 | STN-SNr co-stimulation in Parkinson's disease: a systematic review and meta-analysis of motor and freezing-of-gait outcomes. | meta-analysis / human | No consistent incremental freezing benefit; distinguishes direct versus baseline comparisons. |
| R / 42615931 | Towards the Prevention of Freezing of Gait in Parkinson's Disease. | unknown / unknown | Narrative prevention review provides proposals and limitations, not demonstrated prevention efficacy. |

Review caveat: general gait improvement alone is not evidence for freezing.

## 5. Tremor

**Question:** What clinical evidence evaluates treatments specifically for Parkinsonian tremor?

Intent: `treatment-evidence`. Topics: `tremor`.
Highly relevant: 42178793, 42709169.
Relevant: 42178793, 42709169, 41396751.

| Label / PMID | Title | Governed study type / population | Rationale |
| --- | --- | --- | --- |
| H / 42178793 | Deep Brain Stimulation of the Posterior Subthalamic Area and the Subthalamic Nucleus in Tremor-Dominant Parkinson's Disease: A Randomized, Crossover Trial. | randomized-controlled-trial / human | Direct primary tremor outcome and target comparison; attrition limits certainty. |
| H / 42709169 | Sublingual apomorphine for Parkinsonian tremor: a post-hoc analysis of pivotal trial data. | randomized-controlled-trial / human | Direct tremor subgroup outcomes; actual analysis is post-hoc and hypothesis-generating. |
| R / 41396751 | Investigating the Effectiveness of Haptic Resistive Force Feedback to Improve Tremors in Parkinson's Disease: A Training Impact Study. | randomized-controlled-trial / human | Seven-person PD task-specific pilot; much weaker than established general treatment evidence. |

Review caveat: relevance is not clinical endorsement; small post-hoc/device
studies require explicit limitations.

## 6. Levodopa formulations

**Question:** What are the clinical benefits and risks of extended-release oral or continuous subcutaneous levodopa for Parkinson's motor fluctuations?

Intent: `intervention-comparison`. Topics: `medication`.
Highly relevant and relevant: 42685769, 41984314.

| Label / PMID | Title | Governed study type / population | Rationale |
| --- | --- | --- | --- |
| H / 42685769 | Efficacy and safety of extended-release carbidopa-levodopa (IPX203) versus immediate-release carbidopa-levodopa for Parkinson's disease: A systematic review. | systematic-review / human | Three randomized oral-formulation trials directly assess ON/OFF time and adverse events. |
| H / 41984314 | Foslevodopa/Foscarbidopa Subcutaneous Infusion Safety and Efficacy in Patients with and Without Prior Deep Brain Stimulation. | clinical-trial / human | Open-label phase-3 post-hoc analysis reports infusion ON/OFF benefits and safety. |

**Thin comparison coverage:** no head-to-head oral-versus-infusion trial is
asserted. Across-study differences cannot establish route superiority.

## 7. Deep brain stimulation strategies

**Question:** How do different deep brain stimulation strategies compare for gait and motor outcomes in Parkinson's disease?

Intent: `intervention-comparison`. Topics: `deep-brain-stimulation`, `gait`.
Highly relevant: 42167724, 42909654, 42297980.
Relevant: 42167724, 42909654, 42297980, 42586498.

| Label / PMID | Title | Governed study type / population | Rationale |
| --- | --- | --- | --- |
| H / 42167724 | Effect of high, low, and asymmetric frequency stimulation of the subthalamic nucleus in Parkinson's disease. | randomized-controlled-trial / human | Direct frequency comparison with axial/balance/gait outcomes. |
| H / 42909654 | STN-SNr co-stimulation in Parkinson's disease: a systematic review and meta-analysis of motor and freezing-of-gait outcomes. | meta-analysis / human | Direct co-stimulation comparison and uncertainty around incremental effects. |
| H / 42297980 | Adaptive deep brain stimulation for dynamic gait control in Parkinson's disease: a randomized feasibility trial. | randomized-controlled-trial / human | Gait-synchronized adaptive versus continuous stimulation; five enrolled, three multi-day completers. |
| R / 42586498 | Direct substantia nigra deep brain stimulation in Parkinson's disease: Efficacy, safety, and the frequency-response relationship. | randomized-controlled-trial / human | Acute SN-frequency/STN comparison, with a separate small nonrandomized chronic phase. |

Review caveat: short-term feasibility and acute programming comparisons must
not be represented as definitive long-term superiority.

## 8. Focused ultrasound ablation

**Question:** What motor benefits and adverse effects have been reported after focused ultrasound ablation for Parkinson's disease?

Intent: `clinical-evidence`. Topics: `focused-ultrasound`.
Highly relevant and relevant: 42309086, 42759119.

| Label / PMID | Title | Governed study type / population | Rationale |
| --- | --- | --- | --- |
| H / 42309086 | Safety and efficacy of staged, bilateral magnetic resonance-guided focused ultrasound pallidothalamic tractotomy for motor complications of Parkinson's disease: a prospective, multicentre, single-arm trial. | clinical-trial / human | Direct motor and persistent speech/gait/balance harm outcomes, including severe anarthria. |
| H / 42759119 | Dyskinesias induced by focused ultrasound subthalamotomy in Parkinson's disease are associated with better patient impression of change. | randomized-controlled-trial / human | Actual publication is a retrospective subgroup analysis of RCT participants with dyskinesia and patient-reported outcomes. |

**Weak/narrow coverage:** different ablative targets, uncontrolled study and
secondary analysis. Nonablative low-intensity ultrasound reviews are not
interchangeable evidence and were not added to pad the pool.

## 9. GLP-1 trial syntheses

**Question:** What do randomized-trial syntheses show about motor benefit and tolerability of GLP-1 receptor agonists in Parkinson's disease?

Intent: `synthesis`. Topics: `glp1`, `disease-modification`.
Highly relevant: 41995965, 42105060, 42098470.
Relevant: 39642803, 40067438, 40760123, 40835782, 41077616, 41995965, 42098470, 42105060.

| Label / PMID | Title | Governed study type / population | Rationale |
| --- | --- | --- | --- |
| R / 39642803 | GLP-1 receptor agonists for Parkinson's disease: An updated meta-analysis. | meta-analysis / human | Earlier trial synthesis provides contrasting ON/OFF motor and cognition findings. |
| R / 40067438 | Efficacy and safety of GLP-1 agonists in Parkinson's disease: a systematic review and meta-analysis of randomized controlled trials. | meta-analysis / human | Motor/QoL and gastrointestinal-event/weight-loss synthesis. |
| R / 40760123 | Clinical efficacy of GLP-1 receptor agonists in the treatment of Parkinson's disease: a systematic review and meta-analysis of randomized controlled trials. | meta-analysis / human | Overall nonsignificant effect with short-acting subgroup signal. |
| R / 40835782 | From diabetes to dopamine: Evaluating the disease-modifying potential of GLP-1 receptor agonists in Parkinson's disease. A systematic review and meta-analysis of placebo-controlled trials. | meta-analysis / human | Separates ON/OFF and follow-up effects; harms and insufficient routine-use evidence. |
| R / 41077616 | Evaluating the neuroprotective effect of GLP-1 receptor agonists in parkinson's disease: a systematic review and meta-analysis of randomized controlled trials. | meta-analysis / human | Null overall clinical findings contrast with animal neuroprotection. |
| H / 41995965 | Efficacy of GLP-1 receptor agonists in Parkinson's disease: a systematic review and exploratory network meta-analysis of randomized controlled trials. | systematic-review / human | Dose-specific comparative synthesis with overall uncertainty and GI harms. |
| H / 42098470 | Evaluating the clinical effects of GLP-1 receptor agonists for Alzheimer's and Parkinson's diseases using minimal clinically important difference: systematic review and meta-analysis. | meta-analysis / human | Addresses clinical meaningfulness and tolerability; isolate PD from mixed-disease findings. |
| H / 42105060 | Efficacy and safety of GLP-1 receptor agonists in Parkinson's disease: a systematic review and meta-analysis of randomized clinical trials. | meta-analysis / human | Direct motor/nonmotor/safety synthesis; no consistent benefit or disease-modifying support. |

Eight direct syntheses are retained rather than trimming real relevance to
meet a count target. Overlapping primary trials and different cutoffs/analyses
must be considered when interpreting conflicting conclusions.

## 10. Stem-cell-derived dopamine transplantation

**Question:** What has human research shown about the safety and limitations of stem-cell-derived dopamine cell transplantation for Parkinson's disease?

Intent: `emerging-research`. Topics: `stem-cell`.
Highly relevant: 42426223, 42497857.
Relevant: 42426223, 42497857, 42076911, 42381498.

| Label / PMID | Title | Governed study type / population | Rationale |
| --- | --- | --- | --- |
| H / 42426223 | Human embryonic stem cell-derived dopaminergic cells for Parkinson's disease: a phase 1/2 open-label trial. | clinical-trial / human | Eight-person STEM-PD safety/interim study; uncontrolled design and immunosuppression risks. |
| H / 42497857 | Dissecting divergent outcomes in stem cell-derived dopamine cell therapy trials for Parkinson's disease. | unknown / unknown | Review directly addresses product, immune, patient and graft-site differences between human trial outcomes. |
| R / 42076911 | Homogenous Cell Transplantation Trials in Parkinson's Disease: A Systematic Review and Meta-Analysis. | meta-analysis / human | Human transplant synthesis, but broader graft types and largely open-label studies. |
| R / 42381498 | Parkinson's Disease Cell Transplantation Therapy: A New Dawn With Pluripotent Stem Cell-Based Therapy. | unknown / unknown | Review of clinical feasibility and unresolved long-term safety/efficacy. |

**Early-phase coverage:** no claim of an established restorative treatment.
The optimistic wording of a title does not determine the relevance grade.

## 11. Alpha-synuclein clearance mechanisms

**Question:** How do glial uptake and lysosomal clearance affect alpha-synuclein pathology in Parkinson's disease models?

Intent: `mechanism`. Topics: `alpha-synuclein`, `neuroinflammation`.
Highly relevant and relevant: 42842725, 42127911, 42418556.

| Label / PMID | Title | Governed study type / population | Rationale |
| --- | --- | --- | --- |
| H / 42842725 | Human microglia clear intraneuronal alpha-synuclein aggregates by GPNMB-mediated trogocytosis. | unknown / human | iPSC coculture with CRISPRi/IL-10 perturbations identifies protective lysosomal clearance. |
| H / 42127911 | Secreted GPNMB enhances uptake of fibrillar alpha-synuclein in a non-cell-autonomous process that can be blocked by anti-GPNMB antibodies. | unknown / unknown | Secreted microglial GPNMB promotes neuronal uptake/pathology; antibody rescue and postmortem context. |
| H / 42418556 | Targeting of CH25H to boost p62-dependent autophagic degradation of alpha-synuclein in cell and mouse models of Parkinson's disease. | unknown / unknown | Astrocyte CH25H/p62 perturbations directly test autophagic turnover in models. |

Review caveat: context-dependent protective versus harmful GPNMB effects both
belong. Human-derived cells are not human treatment evidence.

## 12. Wearable biomarker validation

**Question:** How well do wearable measures assess gait and tremor, and what evidence supports monitoring Parkinson's motor progression over time?

Intent: `biomarker`. Topics: `wearable`, `digital-biomarker`, `gait`, `tremor`.
Highly relevant: 42124381, 42944474, 41732803.
Relevant: 42124381, 42944474, 41732803, 42788867.

| Label / PMID | Title | Governed study type / population | Rationale |
| --- | --- | --- | --- |
| H / 42124381 | Daily-Life, Sensor-Derived Tremor Measures Are Sensitive to Progression in Early Parkinson's Disease. | unknown / human | Two-year wrist-sensor study evaluates progression sensitivity and medication effects. |
| H / 42944474 | Baseline Wearable Turning-Derived Signature and Dopamine Transporter-Derived Measures in Relation to Subsequent Motor Progression in Parkinson's Disease: An Exploratory Longitudinal Study. | longitudinal / human | Small exploratory prognostic study; no established incremental/external validity. |
| H / 41732803 | Validity of a Wearable Digital Insole for Assessing Gait ON and OFF in Parkinson's Disease. | unknown / human | Direct GAITRite comparison; agreement differs by gait metric. |
| R / 42788867 | Wearable Sensors in Gait Assessment for Parkinson Disease and Stroke in Real-World Environments: Systematic Review and Meta-Analysis. | meta-analysis / human | Synthesis critiques real-world validation and context heterogeneity; separates PD/stroke. |

Review caveat: analytical agreement is not longitudinal prognostic validity.
No automated metadata corrections were made.

## 13. Microbiome intervention

**Question:** What human evidence supports fecal microbiota transplantation for motor or non-motor symptoms in Parkinson's disease?

Intent: `clinical-evidence`. Topics: `microbiome`.
Highly relevant: 41674471, 42533232.
Relevant: 41674471, 42533232, 42611576.

| Label / PMID | Title | Governed study type / population | Rationale |
| --- | --- | --- | --- |
| H / 41674471 | Safety and Efficacy of Fecal Microbiota Transplantation in Alleviating Symptoms of Parkinson's Disease: A Randomized, Placebo-Controlled, Double-Blinded Study. | randomized-controlled-trial / human | No significant 12-month OFF motor benefit in 59-person trial; some nonmotor changes. |
| H / 42533232 | Efficacy and safety of fecal microbiota transplantation in Parkinson's disease: a systematic review and meta-analysis of randomized controlled trials with GRADE assessment. | meta-analysis / human | Seven-RCT synthesis; no lasting overall motor/nonmotor/QoL gains. |
| R / 42611576 | Effects of Fecal Microbiota Transplantation on Intestinal Microbial Characteristics and Clinical Phenotypes in Patients with Parkinson's Disease. | observational / human | Six-person retrospective cohort with longitudinal microbial associations, not causal efficacy. |

Review caveat: rodent probiotic studies are not primary human FMT evidence.

## 14. Disease modification versus symptom change

**Question:** What distinguishes symptom improvement from evidence of disease modification in Parkinson's treatment research?

Intent: `emerging-research`. Topics: `disease-modification`, `neuroprotection`.
Highly relevant: 42862400, 40275845, 42170720.
Relevant: 42862400, 40275845, 42170720, 42105060.
Acceptable: 39169806 (not in primary metrics).

| Label / PMID | Title | Governed study type / population | Rationale |
| --- | --- | --- | --- |
| H / 42862400 | Next-generation pharmacological strategies for Parkinson's disease: a systematic literature review of symptom management and disease modification. | systematic-review / unknown | Explicit symptomatic/disease-modifying distinction and translational endpoint limitations. |
| H / 40275845 | [Emerging disease-modifying therapies for Parkinson's disease]. | unknown / human | Clinical review explicitly separates unproven progression modification from symptomatic management. |
| H / 42170720 | Efficacy of Aerobic Exercise on Brain MRI Measures in Parkinson's Disease. | randomized-controlled-trial / human | Concrete trial measures progression markers separately from symptoms/medication. |
| R / 42105060 | Efficacy and safety of GLP-1 receptor agonists in Parkinson's disease: a systematic review and meta-analysis of randomized clinical trials. | meta-analysis / human | Clinical example does not support consistent benefit or a disease-modifying claim. |
| A / 39169806 | Exploring Analysis Approaches for Using the Dopamine Transporter Striatal Binding Ratio in Early- to Mid-Stage Parkinson's Disease Modification Trials. | unknown / human | Biomarker interpretation/region/duration context, not a direct treatment-effect test. |

Review caveat: cross-topic conceptual pool, not an exhaustive therapy pipeline
or a validated surrogate-endpoint framework.

## 15. Mitochondria and neuroinflammation

**Question:** How do mitochondrial dysfunction and inflammatory responses interact with alpha-synuclein pathology in experimental Parkinson's models?

Intent: `mechanism`. Topics: `mitochondria`, `neuroinflammation`, `alpha-synuclein`.
Highly relevant: 42814602, 42811169, 42628329.
Relevant: 42814602, 42811169, 42628329, 42342162.

| Label / PMID | Title | Governed study type / population | Rationale |
| --- | --- | --- | --- |
| H / 42814602 | Distinct mitochondrial states modulate alpha-synuclein toxicity. | unknown / unknown | Yeast respiration/HAP4 perturbations show context-dependent mitochondrial toxicity. |
| H / 42811169 | Condensate-driven triglyceride reduction links alpha-synuclein to mitochondrial dysfunction. | unknown / unknown | C. elegans lipid/condensation experiments link mitochondrial structure and toxicity. |
| H / 42628329 | Crosstalk between alpha-synuclein accumulation, NLRP3 inflammasome activation, oxidative stress, and apoptosis in a rotenone-induced Parkinson rat model. | animal / animal | Time-course co-measurement links inflammation, oxidative stress and pathology; not causal proof of every link. |
| R / 42342162 | The irisin-PINK1/Parkin axis plays an essential role in mediating microglial mitophagy: A crucial mechanism for exercise-induced neuroprotection against Parkinson's disease. | unknown / unknown | Mouse/cell pathway blockade connects mitophagy to microglial inflammation. |

Review caveat: complementary models address different links, not necessarily
the whole cascade in each paper. Nonhuman results do not prove human efficacy.

## Approval checklist

- Inspect the cited abstracts and available full text, including negative findings.
- Confirm each main/strong/supporting label and actual design/population.
- Expand relevance pools independently of current top ranks; adjudicate newly
  discovered candidates rather than silently treating them as false positives.
- Resolve thin comparisons, mixed-population reviews and automated metadata gaps.
- Record human reviewer approval separately before treating this draft as gold.

Metric definitions and commands: [RETRIEVAL_EVALUATION.md](../docs/RETRIEVAL_EVALUATION.md).
The deterministic JSON is [gold.json](gold.json); its per-PMID rationales are
the machine-readable judgment record. Retrieval results are a separate,
ignored `rag\data\evaluation\gold-latest.json`/`.md` artifact, not label inputs.
