import { main, argumentsFor } from "./cli.js";
import { prepareCorpus } from "../corpus/prepare.js";

await main(async (config, _client, store) => {
  argumentsFor("status", process.argv.slice(2));
  const result = await prepareCorpus(store, config);
  console.log(
    `Corpus entries: ${result.manifest.entries.length}\nChanged decisions/documents: ${result.changed}\nErrors: ${result.errors}`,
  );
  if (result.errors) process.exitCode = 1;
});
