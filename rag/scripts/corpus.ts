import { main, argumentsFor } from "./cli.js";
import { corpusStatistics, printStatistics } from "../corpus/statistics.js";

await main(async (_config, _client, store) => {
  argumentsFor("status", process.argv.slice(2));
  printStatistics(await corpusStatistics(store));
});
