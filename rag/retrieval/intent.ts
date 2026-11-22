import type { TopicRule } from "../corpus/schema.js";

export type QueryIntent =
  | "clinical-evidence"
  | "mechanism"
  | "treatment"
  | "epidemiology"
  | "biomarkers"
  | "technology"
  | "general-research";
const normalized = (text: string) =>
  text
    .toLowerCase()
    .replace(/α/g, "alpha")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const rules: { intent: QueryIntent; id: string; pattern: RegExp }[] = [
  {
    intent: "clinical-evidence",
    id: "explicit-clinical-endpoints",
    pattern:
      /\b(clinical evidence|human evidence|randomized|trials?|outcomes?)\b|\bdoes\b.*\bimprove\b/,
  },
  {
    intent: "treatment",
    id: "treatment-interventions",
    pattern:
      /\b(treatments?|treating|therapies|therapy|medications?|drugs?|levodopa)\b/,
  },
  {
    intent: "epidemiology",
    id: "population-frequency-risk",
    pattern: /\b(epidemiolog\w*|incidence|prevalence|risk factors?)\b/,
  },
  {
    intent: "biomarkers",
    id: "biomarker-measurement",
    pattern: /\b(biomarkers?|sensors?|measurement|validation|validated)\b/,
  },
  {
    intent: "mechanism",
    id: "mechanistic-pathways",
    pattern:
      /\b(mechanisms?|pathways?|mitochondri\w*|mitophagy|alpha synuclein|inflammation|inflammatory)\b/,
  },
  {
    intent: "technology",
    id: "technology-devices",
    pattern:
      /\b(technolog\w*|wearables?|devices?|digital|apps?|artificial intelligence|ai)\b/,
  },
  {
    intent: "clinical-evidence",
    id: "broad-evidence-symptoms",
    pattern: /\b(what evidence|symptoms?)\b/,
  },
];
export function classifyIntent(query: string): {
  intent: QueryIntent;
  rule: string;
} {
  const text = normalized(query);
  const match = rules.find((rule) => rule.pattern.test(text));
  return match
    ? { intent: match.intent, rule: match.id }
    : { intent: "general-research", rule: "no-clear-rule" };
}
export function isClinicalIntent(intent: QueryIntent): boolean {
  return intent === "clinical-evidence" || intent === "treatment";
}
export function queryTopics(query: string, taxonomy: TopicRule[]): string[] {
  const text = ` ${normalized(query)} `;
  return taxonomy
    .filter((topic) =>
      [
        topic.id,
        ...topic.keywords,
        ...topic.mesh,
        ...(topic.id === "exercise" ? ["cycling", "bicycling", "biking"] : []),
      ].some((phrase) => text.includes(` ${normalized(phrase)} `)),
    )
    .map((topic) => topic.id)
    .sort();
}
