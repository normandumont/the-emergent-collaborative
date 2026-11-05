import { main, argumentsFor, printSummary } from "./cli.js";
import { selectQuery } from "../shared/config.js";
import { discover } from "../discovery/pubmed-search.js";
import { ingest } from "../ingestion/ingest.js";

await main(async (config, client, store) => {
  const args = argumentsFor("ingest-query", process.argv.slice(2));
  const discovery = await discover(
    client,
    store,
    selectQuery(config, args.positional[0] ?? "", args.limit),
    config,
  );
  printSummary(
    await ingest(client, store, config, discovery.pmids, args.refresh),
    discovery,
  );
});
