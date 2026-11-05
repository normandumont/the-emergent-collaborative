import { main, argumentsFor } from "./cli.js";

await main(async (_config, _client, store) => {
  argumentsFor("status", process.argv.slice(2));
  const entries = Object.values((await store.catalog()).articles);
  console.log(
    `Articles: ${entries.length}\nDiscovered: ${entries.filter((entry) => entry.status === "discovered").length}\nNormalized: ${entries.filter((entry) => entry.status === "normalized").length}\nErrors: ${entries.filter((entry) => entry.status === "error").length}`,
  );
});
