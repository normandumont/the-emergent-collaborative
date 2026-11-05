import { main, argumentsFor } from "./cli.js";
import { selectQuery } from "../shared/config.js";
import { discover } from "../discovery/pubmed-search.js";

await main(async (config, client, store) => {
  const args = argumentsFor("search", process.argv.slice(2));
  const result = await discover(
    client,
    store,
    selectQuery(config, args.positional[0] ?? "", args.limit),
    config,
  );
  console.log(
    `Query: ${result.queryId}\nPubMed matches: ${result.totalMatches}\nPMIDs retrieved: ${result.retrievedPmids}\nNew PMIDs: ${result.newPmids}\nExisting PMIDs: ${result.existingPmids}`,
  );
});
