import type { Catalog } from "../shared/article-schema.js";
import { object, strings } from "../shared/config.js";
import { category, log, RagError } from "../shared/logging.js";
import { hash, type LocalStore } from "../shared/storage.js";
import type {
  CorpusConfig,
  ManifestEntry,
  RetrievalManifest,
  TopicRule,
} from "./schema.js";
import { readManifest } from "./manifest.js";

export interface ReportDetail {
  meshTerms: string[];
  evidenceCategory: string;
  fullTextSkipReason: string | null;
  publicationDate: string | null;
  queryIds?: string[];
}
export type CoverageLevel = "critical" | "low" | "moderate" | "substantial";
export function coverageLevel(count: number): CoverageLevel {
  return count < 10
    ? "critical"
    : count < 25
      ? "low"
      : count < 50
        ? "moderate"
        : "substantial";
}
const synthesis = (entry: ManifestEntry) =>
  ["systematic-review", "meta-analysis"].includes(entry.studyType);
const randomized = (entry: ManifestEntry) =>
  ["rct", "randomized-controlled-trial"].includes(entry.studyType);
const countBy = (
  values: string[],
  defaults: string[] = [],
): Record<string, number> => {
  const counts = Object.fromEntries(defaults.map((key) => [key, 0]));
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return Object.fromEntries(
    Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)),
  );
};

export function queryOverlap(catalog: Catalog) {
  const papers = Object.values(catalog.articles).map((entry) => ({
    pmid: entry.pmid,
    queryIds: [...new Set(entry.queryIds)].sort(),
  }));
  const pairs = new Map<
    string,
    { queryIds: [string, string]; pmids: string[] }
  >();
  for (const paper of papers)
    for (let a = 0; a < paper.queryIds.length; a++)
      for (let b = a + 1; b < paper.queryIds.length; b++) {
        const first = paper.queryIds[a]!;
        const second = paper.queryIds[b]!;
        const key = JSON.stringify([first, second]);
        const pair = pairs.get(key) ?? { queryIds: [first, second], pmids: [] };
        pair.pmids.push(paper.pmid);
        pairs.set(key, pair);
      }
  return {
    matchingNoQuery: papers.filter((paper) => !paper.queryIds.length).length,
    matchingOneQuery: papers.filter((paper) => paper.queryIds.length === 1)
      .length,
    matchingTwoQueries: papers.filter((paper) => paper.queryIds.length === 2)
      .length,
    matchingThreeOrMoreQueries: papers.filter(
      (paper) => paper.queryIds.length >= 3,
    ).length,
    highestOverlap: papers
      .filter((paper) => paper.queryIds.length > 1)
      .sort(
        (a, b) =>
          b.queryIds.length - a.queryIds.length ||
          Number(a.pmid) - Number(b.pmid),
      )
      .slice(0, 20),
    queryPairs: [...pairs.values()]
      .map((pair) => ({
        ...pair,
        pmids: pair.pmids.sort((a, b) => Number(a) - Number(b)),
        count: pair.pmids.length,
      }))
      .sort(
        (a, b) =>
          b.count - a.count ||
          a.queryIds.join("|").localeCompare(b.queryIds.join("|")),
      ),
  };
}

function populationBucket(
  detail: ReportDetail | undefined,
  entry: ManifestEntry,
): string {
  if (!detail) return "unknown";
  const mesh = detail.meshTerms.map((term) => term.toLowerCase());
  if (mesh.includes("humans") && mesh.includes("animals")) return "mixed";
  if (detail.evidenceCategory === "cellular" || entry.studyType === "in-vitro")
    return "in-vitro/cellular";
  return entry.population;
}

export function buildCorpusReport(
  catalog: Catalog,
  manifest: RetrievalManifest | null,
  topics: TopicRule[],
  details: ReadonlyMap<string, ReportDetail>,
  referenceYear: number,
  issues: { pmid: string | null; reason: string }[] = [],
) {
  const entries = manifest?.entries ?? [];
  const governed = entries.filter((entry) => entry.status !== "error");
  const byId = new Map(entries.map((entry) => [entry.pmid, entry]));
  const catalogEntries = Object.values(catalog.articles);
  const eligible = entries.filter((entry) => entry.eligible);
  const enabled = entries.filter(
    (entry) => entry.eligible && entry.retrievalEnabled,
  );
  const topicCoverage = topics.map((topic) => {
    const discovered = new Set(
      catalogEntries
        .filter(
          (entry) =>
            entry.topics.includes(topic.id) ||
            entry.queryIds.some((id) => topic.queries.includes(id)),
        )
        .map((entry) => entry.pmid),
    );
    const assigned = entries.filter((entry) => entry.topics.includes(topic.id));
    for (const entry of assigned) discovered.add(entry.pmid);
    const accepted = assigned.filter((entry) => entry.eligible);
    return {
      topic: topic.id,
      discovered: discovered.size,
      eligible: accepted.length,
      retrievalEnabled: accepted.filter((entry) => entry.retrievalEnabled)
        .length,
      fullText: accepted.filter(
        (entry) => entry.contentScope === "full-text-retrievable",
      ).length,
      abstractOnly: accepted.filter(
        (entry) => entry.contentScope === "abstract-only-retrievable",
      ).length,
      excluded: [...discovered].filter(
        (id) =>
          byId.has(id) &&
          !byId.get(id)!.eligible &&
          byId.get(id)!.status !== "error",
      ).length,
      technicalErrors: [...discovered].filter(
        (id) => byId.get(id)?.status === "error",
      ).length,
      pendingPreparation: [...discovered].filter((id) => !byId.has(id)).length,
      humanRcts: accepted.filter(
        (entry) =>
          randomized(entry) &&
          populationBucket(details.get(entry.pmid), entry) === "human",
      ).length,
      systematicReviews: accepted.filter(
        (entry) => entry.studyType === "systematic-review",
      ).length,
      metaAnalyses: accepted.filter(
        (entry) => entry.studyType === "meta-analysis",
      ).length,
      coverage: coverageLevel(accepted.length),
      governedQueryIds: topic.queries,
    };
  });
  const designs = [
    "systematic-review",
    "meta-analysis",
    "randomized-controlled-trial",
    "clinical-trial",
    "cohort",
    "longitudinal",
    "case-control",
    "cross-sectional",
    "observational",
    "guideline",
    "basic-science",
    "animal",
    "in-vitro",
    "editorial",
    "commentary",
    "unknown",
  ];
  const designName = (entry: ManifestEntry) =>
    entry.studyType === "rct" ? "randomized-controlled-trial" : entry.studyType;
  const evidenceCategories = [
    "human-synthesis",
    "human-interventional",
    "human-observational",
    "human-mechanistic",
    "animal",
    "cellular",
    "guidance",
    "opinion",
    "unknown",
  ];
  const designCounts = (items: ManifestEntry[]) =>
    countBy(items.map(designName), designs);
  const populationCounts = (items: ManifestEntry[]) =>
    countBy(
      items.map((entry) => populationBucket(details.get(entry.pmid), entry)),
      ["human", "animal", "in-vitro/cellular", "mixed", "unknown"],
    );
  const mechanistic = eligible.filter((entry) =>
    ["human-mechanistic", "animal", "cellular"].includes(
      details.get(entry.pmid)?.evidenceCategory ?? "",
    ),
  ).length;
  const syntheses = eligible.filter(synthesis).length;
  const trials = eligible.filter(randomized).length;
  const longitudinal = eligible.filter((entry) =>
    ["cohort", "longitudinal"].includes(entry.studyType),
  ).length;
  const warningCounts = countBy(
    entries.flatMap((entry) => [...new Set(entry.warnings)]),
  );
  const reasons = countBy(
    entries
      .filter((entry) => !entry.eligible && entry.status !== "error")
      .flatMap((entry) => [...new Set(entry.reasons)])
      .filter(
        (reason) =>
          ![
            "parkinsons-topic-match",
            "supported-publication-type",
            "abstract-available",
            "reusable-full-text-available",
            "retrieval-disabled-by-policy",
          ].includes(reason),
      ),
  );
  const catalogErrors = catalogEntries.filter(
    (entry) => entry.status === "error",
  );
  const pending = catalogEntries
    .filter((entry) => !byId.has(entry.pmid))
    .map((entry) => entry.pmid)
    .sort();
  const oldThreshold = referenceYear - 30;
  return {
    schemaVersion: 1,
    title: "Meridian Station Parkinson's Research Corpus",
    referenceYear,
    governanceSnapshot: manifest
      ? {
          policyVersion: manifest.policyVersion,
          policySha256: manifest.policySha256,
          taxonomySha256: manifest.taxonomySha256,
        }
      : null,
    summary: {
      uniquePmids: catalogEntries.length,
      manifestEntries: entries.length,
      governedRecords: governed.length,
      normalized: catalogEntries.filter(
        (entry) => entry.status === "normalized",
      ).length,
      eligible: eligible.length,
      active: entries.filter((entry) => entry.status === "active").length,
      retrievalEnabled: enabled.length,
      reusableFullText: entries.filter((entry) => entry.hasFullText).length,
      fullTextRetrievable: eligible.filter(
        (entry) => entry.contentScope === "full-text-retrievable",
      ).length,
      abstractOnly: eligible.filter(
        (entry) => entry.contentScope === "abstract-only-retrievable",
      ).length,
      metadataOnly: entries.filter(
        (entry) => entry.contentScope === "metadata-only",
      ).length,
      excluded: entries.filter(
        (entry) => !entry.eligible && entry.status !== "error",
      ).length,
      technicalErrors: entries.filter((entry) => entry.status === "error")
        .length,
      pendingPreparation: pending.length,
    },
    evidenceDesign: {
      allGoverned: designCounts(governed),
      eligible: designCounts(eligible),
      evidenceCategories: countBy(
        governed.map(
          (entry) => details.get(entry.pmid)?.evidenceCategory ?? "unknown",
        ),
        evidenceCategories,
      ),
      mechanisticHuman: governed.filter(
        (entry) =>
          details.get(entry.pmid)?.evidenceCategory === "human-mechanistic",
      ).length,
      tiers: countBy(
        governed.map((entry) => String(entry.studyDesignTier ?? "unknown")),
        ["1", "2", "3", "4", "5", "6", "7", "8", "unknown"],
      ),
      eligibleTiers: countBy(
        eligible.map((entry) => String(entry.studyDesignTier ?? "unknown")),
        ["1", "2", "3", "4", "5", "6", "7", "8", "unknown"],
      ),
    },
    topicCoverage,
    population: {
      allGoverned: populationCounts(governed),
      eligible: populationCounts(eligible),
      canonical: countBy(
        governed.map((entry) => entry.population),
        ["human", "animal", "unknown"],
      ),
    },
    publicationYears: {
      counts: countBy(governed.map((entry) => String(entry.year ?? "missing"))),
      futureDatedPmids: entries
        .filter(
          (entry) =>
            entry.warnings.includes("future-dated-publication-metadata") ||
            (entry.year !== null && entry.year > referenceYear),
        )
        .map((entry) => entry.pmid)
        .sort(),
      veryOldDefinition: `Publication year < ${oldThreshold} (more than 30 years before policy reference year)`,
      veryOldPmids: entries
        .filter((entry) => entry.year !== null && entry.year < oldThreshold)
        .map((entry) => entry.pmid)
        .sort(),
      missingYearPmids: entries
        .filter((entry) => entry.year === null)
        .map((entry) => entry.pmid)
        .sort(),
      missingDatePmids: entries
        .filter(
          (entry) =>
            details.has(entry.pmid) &&
            details.get(entry.pmid)!.publicationDate === null,
        )
        .map((entry) => entry.pmid)
        .sort(),
    },
    contentScope: {
      counts: countBy(
        entries.map((entry) =>
          entry.status === "error" ? "technical-error" : entry.contentScope,
        ),
        [
          "full-text-retrievable",
          "abstract-only-retrievable",
          "metadata-only",
          "excluded",
          "technical-error",
        ],
      ),
      excludedInsufficientContent: entries.filter(
        (entry) =>
          !entry.eligible &&
          entry.reasons.some((reason) =>
            ["no-retrievable-source-content", "abstract-required"].includes(
              reason,
            ),
          ),
      ).length,
      excludedByReuseRequirement: entries.filter(
        (entry) =>
          !entry.eligible &&
          entry.reasons.includes("reusable-full-text-required"),
      ).length,
      fullTextAccess: countBy(
        entries.map((entry) => {
          const detail = details.get(entry.pmid);
          return entry.hasFullText
            ? "reusable-full-text"
            : !detail
              ? "unverified"
              : (detail.fullTextSkipReason ?? "no-reusable-full-text");
        }),
      ),
      licenses: countBy(entries.map((entry) => entry.license ?? "none")),
      exclusionReasons: reasons,
    },
    governance: {
      states: countBy(
        entries.map((entry) => entry.status),
        [
          "active",
          "eligible",
          "excluded",
          "retracted",
          "corrected",
          "superseded",
          "retrieval-disabled",
          "error",
        ],
      ),
      retractedPmids: entries
        .filter((entry) => entry.retracted)
        .map((entry) => entry.pmid)
        .sort(),
      correctedPmids: entries
        .filter((entry) => entry.corrected)
        .map((entry) => entry.pmid)
        .sort(),
      supersededPmids: entries
        .filter((entry) => entry.superseded)
        .map((entry) => entry.pmid)
        .sort(),
      expressionOfConcernPmids: entries
        .filter((entry) => entry.expressionOfConcern)
        .map((entry) => entry.pmid)
        .sort(),
      retrievalDisabled: entries.filter((entry) => !entry.retrievalEnabled)
        .length,
      blockedPmids: entries
        .filter((entry) => !entry.eligible || !entry.retrievalEnabled)
        .map((entry) => ({
          pmid: entry.pmid,
          status: entry.status,
          reasons: entry.reasons,
        })),
      errors: [
        ...new Set([
          ...catalogErrors.map((entry) => entry.pmid),
          ...entries
            .filter((entry) => entry.status === "error")
            .map((entry) => entry.pmid),
        ]),
      ].sort(),
      acquisitionErrors: catalogErrors.map((entry) => ({
        pmid: entry.pmid,
        category: entry.errorCategory,
      })),
      technicalErrors: entries
        .filter((entry) => entry.status === "error")
        .map((entry) => ({
          pmid: entry.pmid,
          category:
            entry.reasons
              .find((reason) => reason.startsWith("preparation-error:"))
              ?.slice("preparation-error:".length) ?? "unknown",
          failureCode:
            entry.reasons
              .find((reason) => reason.startsWith("technical-error:"))
              ?.slice("technical-error:".length) ?? "unknown",
          reference:
            entry.reasons
              .find((reason) => reason.startsWith("technical-reference:"))
              ?.slice("technical-reference:".length) ?? null,
          acquisitionCategory:
            catalog.articles[entry.pmid]?.errorCategory ?? null,
        })),
      warningCounts,
      warningPmids: entries
        .filter((entry) => entry.warnings.length)
        .map((entry) => ({ pmid: entry.pmid, warnings: entry.warnings })),
    },
    queryOverlap: queryOverlap(catalog),
    coverageGaps: topicCoverage.map((topic) => ({
      topic: topic.topic,
      eligible: topic.eligible,
      humanRcts: topic.humanRcts,
      systematicReviews: topic.systematicReviews,
      metaAnalyses: topic.metaAnalyses,
      status: topic.coverage,
    })),
    evidenceMixTargets: [
      {
        category: "systematic-review/meta-analysis",
        actual: syntheses,
        targetMin: 100,
        targetMax: 150,
      },
      {
        category: "randomized/controlled trials (classified RCTs only)",
        actual: trials,
        targetMin: 150,
        targetMax: 250,
      },
      {
        category: "cohort/longitudinal",
        actual: longitudinal,
        targetMin: 100,
        targetMax: 150,
      },
      {
        category:
          "mechanistic/translational proxy (human-mechanistic/animal/cellular)",
        actual: mechanistic,
        targetMin: 100,
        targetMax: 200,
      },
      {
        category: "other governed evidence",
        actual: eligible.filter(
          (entry) =>
            !synthesis(entry) &&
            !randomized(entry) &&
            !["cohort", "longitudinal"].includes(entry.studyType) &&
            !["human-mechanistic", "animal", "cellular"].includes(
              details.get(entry.pmid)?.evidenceCategory ?? "",
            ),
        ).length,
        targetMin: null,
        targetMax: null,
      },
    ],
    readiness: {
      status:
        !manifest ||
        !entries.length ||
        pending.length ||
        issues.length ||
        entries.some((entry) => entry.status === "error")
          ? "needs-local-preparation-or-repair"
          : "prepared-locally-awaiting-human-review",
      pendingPmids: pending,
      issues,
      productionReady: false,
      vectorUploadAuthorized: false,
      note: "Coverage and metadata classifications are not scientific evidence quality or clinical recommendations. No indexing is performed or authorized.",
    },
  };
}

export type CorpusReport = ReturnType<typeof buildCorpusReport>;
const escapeCell = (value: string | number) =>
  String(value)
    .replace(/\|/g, "\\|")
    .replace(/[\r\n]+/g, " ");
function table(headers: string[], rows: (string | number)[][]): string {
  return [
    `| ${headers.map(escapeCell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeCell).join(" | ")} |`),
  ].join("\n");
}
export function corpusReportMarkdown(report: CorpusReport): string {
  const sections = [
    `# ${report.title}`,
    "Local governed research corpus for human review. Not production-ready; no vector upload or deployment authorized.",
    "## Summary",
    table(["Measure", "Count"], Object.entries(report.summary)),
    "## Evidence design",
    table(
      ["Design", "All governed", "Eligible"],
      Object.entries(report.evidenceDesign.allGoverned).map(
        ([design, count]) => [
          design,
          count,
          report.evidenceDesign.eligible[design] ?? 0,
        ],
      ),
    ),
    table(
      ["Tier", "All governed", "Eligible"],
      Object.entries(report.evidenceDesign.tiers).map(([tier, count]) => [
        tier,
        count,
        report.evidenceDesign.eligibleTiers[tier] ?? 0,
      ]),
    ),
    table(
      ["Evidence category", "Count"],
      Object.entries(report.evidenceDesign.evidenceCategories),
    ),
    `Mechanistic human: ${report.evidenceDesign.mechanisticHuman}. Ordinary reviews remain unknown unless governed classification identifies a design.`,
    "## Topic coverage",
    table(
      [
        "Topic",
        "Discovered",
        "Eligible",
        "Enabled",
        "Full text",
        "Abstract",
        "Excluded",
        "Pending",
      ],
      report.topicCoverage.map((topic) => [
        topic.topic,
        topic.discovered,
        topic.eligible,
        topic.retrievalEnabled,
        topic.fullText,
        topic.abstractOnly,
        topic.excluded,
        topic.pendingPreparation,
      ]),
    ),
    "Topic assignments overlap; do not sum topic rows to estimate corpus size. Discovered includes query relationships and governed topical matches.",
    "## Population coverage",
    table(
      ["Population", "All governed", "Eligible"],
      Object.entries(report.population.allGoverned).map(
        ([population, count]) => [
          population,
          count,
          report.population.eligible[population] ?? 0,
        ],
      ),
    ),
    "Reporting precedence: explicit Humans + Animals MeSH = mixed; cellular/in-vitro next; otherwise canonical population. Unverified supplemental metadata = unknown. Canonical governance labels are unchanged.",
    table(
      ["Canonical population", "Count"],
      Object.entries(report.population.canonical),
    ),
    "## Publication years",
    table(["Year", "Count"], Object.entries(report.publicationYears.counts)),
    `Future-dated PMIDs: ${report.publicationYears.futureDatedPmids.join(", ") || "none"}.`,
    `${report.publicationYears.veryOldDefinition}: ${report.publicationYears.veryOldPmids.join(", ") || "none"}.`,
    `Missing year: ${report.publicationYears.missingYearPmids.join(", ") || "none"}; missing date: ${report.publicationYears.missingDatePmids.join(", ") || "none"}. Dates alone do not introduce new exclusions.`,
    "## Licensing/content scope",
    table(["Scope", "Count"], Object.entries(report.contentScope.counts)),
    table(
      ["Full-text access / skip reason", "Count"],
      Object.entries(report.contentScope.fullTextAccess),
    ),
    table(["License", "Count"], Object.entries(report.contentScope.licenses)),
    `Insufficient-content exclusions: ${report.contentScope.excludedInsufficientContent}. Reusable-full-text requirement exclusions: ${report.contentScope.excludedByReuseRequirement}.`,
    "A full-text license denial is not an article exclusion when an abstract remains eligible. There is no new licensing rule.",
    table(
      ["Exclusion reason (overlapping)", "Count"],
      Object.entries(report.contentScope.exclusionReasons),
    ),
    "## Retractions and corrections",
    table(["State", "Count"], Object.entries(report.governance.states)),
    `Retracted: ${report.governance.retractedPmids.join(", ") || "none"}.`,
    `Corrected: ${report.governance.correctedPmids.join(", ") || "none"}. Superseded: ${report.governance.supersededPmids.join(", ") || "none"}.`,
    `Expression of concern: ${report.governance.expressionOfConcernPmids.join(", ") || "none"}. Retrieval-disabled: ${report.governance.retrievalDisabled}.`,
    `Error PMIDs: ${report.governance.errors.join(", ") || "none"}.`,
    table(
      ["PMID", "Acquisition error category"],
      report.governance.acquisitionErrors.map((entry) => [
        entry.pmid,
        entry.category ?? "unknown",
      ]),
    ),
    table(
      [
        "PMID",
        "Technical category",
        "Failure",
        "Reference",
        "Acquisition category",
      ],
      report.governance.technicalErrors.map((entry) => [
        entry.pmid,
        entry.category,
        entry.failureCode,
        entry.reference ?? "none",
        entry.acquisitionCategory ?? "none",
      ]),
    ),
    table(
      ["Blocked PMID", "State", "Reasons"],
      report.governance.blockedPmids.map((entry) => [
        entry.pmid,
        entry.status,
        entry.reasons.join(", "),
      ]),
    ),
    table(
      ["Warning", "Count"],
      Object.entries(report.governance.warningCounts),
    ),
    table(
      ["PMID", "Warnings"],
      report.governance.warningPmids.map((entry) => [
        entry.pmid,
        entry.warnings.join(", "),
      ]),
    ),
    "## Query overlap",
    `No query: ${report.queryOverlap.matchingNoQuery}; one: ${report.queryOverlap.matchingOneQuery}; two: ${report.queryOverlap.matchingTwoQueries}; three or more: ${report.queryOverlap.matchingThreeOrMoreQueries}.`,
    table(
      ["Highest-overlap PMID", "Queries"],
      report.queryOverlap.highestOverlap.map((entry) => [
        entry.pmid,
        entry.queryIds.join(", "),
      ]),
    ),
    table(
      ["Query pair", "Shared PMIDs"],
      report.queryOverlap.queryPairs.map((entry) => [
        entry.queryIds.join(" / "),
        entry.count,
      ]),
    ),
    "## Coverage gaps",
    table(
      [
        "Topic",
        "Eligible",
        "Human RCTs",
        "Systematic reviews",
        "Meta-analyses",
        "Coverage",
      ],
      report.coverageGaps.map((gap) => [
        gap.topic,
        gap.eligible,
        gap.humanRcts,
        gap.systematicReviews,
        gap.metaAnalyses,
        gap.status,
      ]),
    ),
    "Coverage only: <10 critical; 10-24 low; 25-49 moderate; 50+ substantial. These are not evidence-strength labels.",
    "## Planning evidence mix",
    table(
      ["Category", "Eligible actual", "Planning target"],
      report.evidenceMixTargets.map((target) => [
        target.category,
        target.actual,
        target.targetMin === null
          ? "remaining corpus"
          : `${target.targetMin}-${target.targetMax}`,
      ]),
    ),
    "Targets do not govern inclusion or enforce quotas. Categories can overlap (for example, animal syntheses); other evidence is the complement of their union. Controlled nonrandomized trials and translational studies are not inferred from keywords.",
    "## Readiness for vector indexing",
    `Status: **${report.readiness.status}**. Human review remains required.`,
    `Pending preparation PMIDs: ${report.readiness.pendingPmids.join(", ") || "none"}.`,
    table(
      ["PMID", "Preparation/provenance issue"],
      report.readiness.issues.map((issue) => [
        issue.pmid ?? "corpus",
        issue.reason,
      ]),
    ),
    report.readiness.note,
    "This report does not initiate indexing, change corpus eligibility, assess scientific quality, recommend clinical treatment, or authorize production use.",
  ];
  return `${sections.join("\n\n")}\n`;
}

async function readDetail(
  store: LocalStore,
  entry: ManifestEntry,
): Promise<ReportDetail> {
  const path = `corpus/versions/${entry.pmid}/${entry.normalizedRecordSha256}.json`;
  const raw = await store.read(path);
  const base = await store.read(`normalized/${entry.pmid}.json`);
  if (
    raw === null ||
    hash(raw) !== entry.normalizedRecordSha256 ||
    base === null ||
    hash(base) !== entry.baseNormalizedSha256
  )
    throw new RagError("storage", "Governed or base normalized hash mismatch.");
  const record = await store.json(path);
  if (
    !object(record) ||
    !object(record["identity"]) ||
    record["identity"]["pmid"] !== entry.pmid ||
    !object(record["classification"]) ||
    !strings(record["classification"]["meshTerms"]) ||
    typeof record["classification"]["evidenceCategory"] !== "string" ||
    !object(record["citation"]) ||
    (record["citation"]["publicationDate"] !== null &&
      typeof record["citation"]["publicationDate"] !== "string") ||
    !object(record["source"]) ||
    !strings(record["source"]["queryIds"]) ||
    !Array.isArray(record["source"]["provenance"]) ||
    (record["source"]["fullTextSkipReason"] !== null &&
      typeof record["source"]["fullTextSkipReason"] !== "string")
  )
    throw new RagError("storage", "Invalid governed reporting metadata.");
  const hashes: string[] = [];
  for (const source of record["source"]["provenance"] as unknown[]) {
    if (
      !object(source) ||
      typeof source["rawPath"] !== "string" ||
      typeof source["sha256"] !== "string"
    )
      throw new RagError("storage", "Invalid raw provenance.");
    const body = await store.read(source["rawPath"]);
    if (body === null || hash(body) !== source["sha256"])
      throw new RagError("storage", "Raw provenance hash mismatch.");
    hashes.push(source["sha256"]);
  }
  if (JSON.stringify(hashes) !== JSON.stringify(entry.sourceSha256))
    throw new RagError("storage", "Source manifest hash mismatch.");
  if (entry.retrievalEnabled) {
    const document = await store.read(`retrieval/${entry.path}`);
    if (document === null || hash(document) !== entry.sha256)
      throw new RagError("storage", "Retrieval document hash mismatch.");
  }
  return {
    meshTerms: record["classification"]["meshTerms"],
    evidenceCategory: record["classification"]["evidenceCategory"],
    publicationDate: record["citation"]["publicationDate"],
    fullTextSkipReason: record["source"]["fullTextSkipReason"],
    queryIds: record["source"]["queryIds"],
  };
}

export async function generateCorpusReport(
  store: LocalStore,
  config: CorpusConfig,
): Promise<CorpusReport> {
  const catalog = await store.catalog();
  const manifest = await readManifest(store);
  const details = new Map<string, ReportDetail>();
  const issues: { pmid: string | null; reason: string }[] = [];
  if (
    manifest &&
    (manifest.policySha256 !== config.policySha256 ||
      manifest.taxonomySha256 !== config.taxonomySha256)
  )
    issues.push({
      pmid: null,
      reason: "governance-configuration-changed-run-preparation",
    });
  for (const entry of manifest?.entries ?? []) {
    if (entry.status === "error") continue;
    try {
      const detail = await readDetail(store, entry);
      details.set(entry.pmid, detail);
      if (
        !catalog.articles[entry.pmid] ||
        JSON.stringify([...(detail.queryIds ?? [])].sort()) !==
          JSON.stringify([...catalog.articles[entry.pmid]!.queryIds].sort())
      )
        issues.push({
          pmid: entry.pmid,
          reason: "discovery-relationships-changed-run-preparation",
        });
    } catch (error) {
      issues.push({
        pmid: entry.pmid,
        reason: `report-provenance-error:${category(error)}`,
      });
      log({
        pmid: entry.pmid,
        status: "report-provenance-error",
        category: category(error),
      });
    }
  }
  const report = buildCorpusReport(
    catalog,
    manifest,
    config.topics,
    details,
    Number(config.policy.referenceDate.slice(0, 4)),
    issues,
  );
  await store.writeJson("reports/corpus-latest.json", report, true);
  await store.write(
    "reports/corpus-latest.md",
    corpusReportMarkdown(report),
    true,
  );
  return report;
}
