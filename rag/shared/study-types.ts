import type { StudyType } from "./article-schema.js";

export const canonicalStudy = (type: string) =>
  type === "rct" ? "randomized-controlled-trial" : type;
export const studyTypes: StudyType[] = [
  "rct",
  "systematic-review",
  "meta-analysis",
  "clinical-trial",
  "unknown",
  "randomized-controlled-trial",
  "cohort",
  "longitudinal",
  "case-control",
  "cross-sectional",
  "observational",
  "case-report",
  "basic-science",
  "animal",
  "in-vitro",
  "editorial",
  "commentary",
  "guideline",
];
