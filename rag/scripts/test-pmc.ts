import { loadConfig } from "../shared/config.js";
import { LocalStore } from "../shared/storage.js";
import { category, log, RagError } from "../shared/logging.js";
import { pmid } from "../discovery/deduplicate.js";
import {
  PubmedClient,
  type HttpDiagnostic,
} from "../discovery/pubmed-client.js";
import { planAcquisitionRetry } from "../ingestion/retry-acquisition.js";
import { parsePmc } from "../ingestion/fetch-pmc.js";

try {
  const args = process.argv.slice(2);
  if (args.length === 1 && ["--help", "-h"].includes(args[0]!)) {
    console.log(
      "Usage: npm run rag:test-pmc -- <PMID>\nRead-only diagnostic: resolve one technical acquisition failure from verified PubMed caches and fetch its first missing PMC artifact only. Cached front matter must authorize full text. No cache writes, normalization, discovery, OpenAI or vector calls.",
    );
  } else {
    if (args.length !== 1)
      throw new RagError(
        "configuration",
        "Usage: npm run rag:test-pmc -- <PMID>",
      );
    const id = pmid(args[0]!);
    const config = await loadConfig(process.env);
    const store = new LocalStore();
    const plan = await planAcquisitionRetry(store, config, id);
    const target = plan.targets[0];
    if (
      !target ||
      (!target.failure && !target.frontMatterNeeded && !target.fullTextNeeded)
    )
      console.log(
        JSON.stringify({
          pmid: id,
          status: "skipped",
          reason: target
            ? "artifacts-already-cached"
            : "not-an-unresolved-acquisition-target",
          cacheWrites: false,
        }),
      );
    else if (target.failure) {
      console.log(
        JSON.stringify({
          pmid: id,
          status: "blocked",
          ...target.failure,
          cacheWrites: false,
        }),
      );
      process.exitCode = 1;
    } else {
      if (!target.pmcid)
        throw new RagError("missing-record", "Missing PMC identity.");
      const events: HttpDiagnostic[] = [];
      const client = new PubmedClient(
        config,
        fetch,
        undefined,
        undefined,
        (event) => {
          events.push(event);
          console.log(JSON.stringify(event));
        },
      );
      const format = target.frontMatterNeeded ? "pmc_fm" : "pmc";
      console.log(
        JSON.stringify({
          pmid: id,
          pmcid: target.pmcid,
          url: client.oaiUrl(target.pmcid, format),
          status: "starting",
          cacheWrites: false,
        }),
      );
      const started = Date.now();
      const body = await client.oai(target.pmcid, format);
      const parsed = parsePmc(body, target.pmcid, id);
      console.log(
        JSON.stringify({
          pmid: id,
          pmcid: target.pmcid,
          artifact: format,
          status: "completed",
          httpStatus: events.at(-1)?.status,
          elapsedMs: Date.now() - started,
          bytes: Buffer.byteLength(body),
          sourceAvailable: parsed.article !== null,
          unavailableReason: parsed.unavailableReason,
          cacheWrites: false,
        }),
      );
    }
  }
} catch (error) {
  log({ status: "pmc-diagnostic-failed", category: category(error) });
  if (error instanceof RagError && error.category === "configuration")
    console.error(error.message);
  process.exitCode = 1;
}
