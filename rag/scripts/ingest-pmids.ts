import { main, argumentsFor, printSummary } from "./cli.js";
import { ingest } from "../ingestion/ingest.js";

await main(async (config, client, store) => {
  const args = argumentsFor("ingest", process.argv.slice(2));
  printSummary(
    await ingest(client, store, config, args.positional, args.refresh),
  );
});
