import { loadConfig } from "../shared/config.js";
import { LocalStore } from "../shared/storage.js";
import { category, log, RagError } from "../shared/logging.js";
import {
  repairCachedIngestion,
  repairOptions,
  repairUsage,
} from "../ingestion/repair.js";
import { retryAcquisition } from "../ingestion/retry-acquisition.js";

try {
  const options = repairOptions(process.argv.slice(2));
  if (options.mode === "help") console.log(repairUsage);
  else {
    const config = await loadConfig(process.env);
    const store = new LocalStore();
    if (options.mode === "retry-acquisition") {
      const result = await store.locked(() => retryAcquisition(store, config));
      const { outcomes, runId, ...summary } = result;
      console.log(JSON.stringify(summary, null, 2));
      console.log(`Report: rag\\data\\ingestion-runs\\${runId}.json`);
      console.log(
        "Acquisition only; catalog/normalized records are unchanged. Next: repair --cached-only --normalize-cached, then prepare and corpus-report. No vector operation is invoked.",
      );
      if (result.remaining) process.exitCode = 1;
    } else {
      const result = await store.locked(() =>
        repairCachedIngestion(store, config, options.normalizeCached),
      );
      console.log(
        JSON.stringify(
          {
            mode: "cached-only",
            networkAllowed: false,
            unresolvedAtStart: result.unresolvedAtStart,
            restoredReferences: result.restoredReferences.length,
            normalizedWritten: result.normalizedWritten,
            deferred: result.deferred.length,
            missingSourceReferences: result.missingSourceReferences.length,
            issues: result.issues.length,
          },
          null,
          2,
        ),
      );
      console.log(
        "Report: rag\\data\\reports\\cache-repair-latest.json. Run local preparation afterward; no network or vector operation was invoked.",
      );
      if (result.issues.length) process.exitCode = 1;
    }
  }
} catch (error) {
  log({ status: "repair-failed", category: category(error) });
  if (error instanceof RagError && error.category === "configuration")
    console.error(error.message);
  process.exitCode = 1;
}
