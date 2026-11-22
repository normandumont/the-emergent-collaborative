import { loadCorpusConfig } from "../corpus/config.js";
import { generateCorpusReport } from "../corpus/report.js";
import { LocalStore } from "../shared/storage.js";
import { category, log, RagError } from "../shared/logging.js";

try {
  if (process.argv.length > 2)
    throw new RagError("configuration", "Corpus report accepts no arguments.");
  const config = await loadCorpusConfig();
  const store = new LocalStore();
  const report = await store.locked(() => generateCorpusReport(store, config));
  console.log(
    JSON.stringify(
      { ...report.summary, readiness: report.readiness.status },
      null,
      2,
    ),
  );
  console.log(
    "Reports: rag\\data\\reports\\corpus-latest.json and corpus-latest.md",
  );
  if (report.readiness.issues.length || report.governance.errors.length)
    process.exitCode = 1;
} catch (error) {
  log({ status: "corpus-report-failed", category: category(error) });
  console.error(
    "Local corpus reporting failed; no network or vector operation was invoked.",
  );
  process.exitCode = 1;
}
