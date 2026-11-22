import { loadConfig } from "../shared/config.js";
import { LocalStore } from "../shared/storage.js";
import { category, log } from "../shared/logging.js";
import {
  discoverAll,
  discoveryOptions,
  discoveryPlan,
  printDiscoveryPlan,
} from "../discovery/discover-all.js";

try {
  const options = discoveryOptions(process.argv.slice(2));
  const config = await loadConfig(process.env);
  printDiscoveryPlan(discoveryPlan(config, options));
  const result = await discoverAll(config, new LocalStore(), options);
  if ("summary" in result) {
    console.log(
      JSON.stringify(
        { runId: result.runId, status: result.status, ...result.summary },
        null,
        2,
      ),
    );
    console.log(`Report: rag\\data\\discovery-runs\\${result.runId}.json`);
    console.log(
      "Next: npm run rag:prepare; npm run rag:corpus-report (local only).",
    );
    if (result.status !== "completed") process.exitCode = 1;
  } else
    console.log(
      "Dry run: no network requests or data writes. Use --execute to authorize PubMed/PMC acquisition.",
    );
} catch (error) {
  log({ status: "failed", category: category(error) });
  console.error(
    "Multi-query acquisition failed. Inspect the categorized log and persistent run journal; no vector operation was invoked.",
  );
  process.exitCode = 1;
}
