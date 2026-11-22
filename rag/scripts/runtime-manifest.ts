import path from "node:path";
import { hash, LocalStore } from "../shared/storage.js";
import { RagError, category } from "../shared/logging.js";
import { loadCorpusConfig } from "../corpus/config.js";
import {
  indexingManifest,
  unchangedManifest,
  verifyDocument,
} from "../indexing/manifest-input.js";
import { indexable, fingerprint } from "../indexing/metadata.js";
import { readState, currentStore } from "../indexing/state.js";
import {
  parseRuntimeManifest,
  type RuntimeManifest,
} from "../retrieval/runtime-manifest.js";
import { RAG_ROOT } from "../shared/constants.js";

export async function exportRuntimeManifest(
  store: LocalStore,
  storeId: string,
): Promise<RuntimeManifest> {
  const { manifest, manifestHash } = await indexingManifest(store);
  const stateText = await store.read("vector-state.json");
  if (stateText === null)
    throw new RagError("configuration", "Missing synchronized state.");
  const target = currentStore(await readState(store), storeId);
  if (
    target.manifestHash !== manifestHash ||
    target.pendingBatch ||
    target.pendingUpload
  )
    throw new RagError(
      "configuration",
      "Runtime export requires the synchronized current manifest with no pending work.",
    );
  const papers: RuntimeManifest["papers"] = [];
  for (const entry of manifest.entries) {
    const receipt = target.files.find(
      (file) =>
        file.pmid === entry.pmid &&
        file.status === "indexed" &&
        file.fingerprint === fingerprint(entry),
    );
    if (indexable(entry) && !receipt)
      throw new RagError(
        "configuration",
        "A retrieval-enabled paper is unavailable in the synchronized store.",
      );
    const title = indexable(entry)
      ? (await verifyDocument(store, entry)).title
      : null;
    papers.push({
      fileId: receipt?.fileId ?? null,
      fingerprint: receipt?.fingerprint ?? null,
      title,
      url: `https://pubmed.ncbi.nlm.nih.gov/${entry.pmid}/`,
      entry: {
        pmid: entry.pmid,
        year: entry.year,
        studyType: entry.studyType,
        studyDesignTier: entry.studyDesignTier,
        population: entry.population,
        contentScope: entry.contentScope,
        license: entry.license,
        retracted: entry.retracted,
        topics: entry.topics,
        retrievalEnabled: entry.retrievalEnabled,
        warnings: entry.warnings,
        corrected: entry.corrected,
        superseded: entry.superseded,
        status: entry.status,
        eligible: entry.eligible,
        expressionOfConcern: entry.expressionOfConcern,
        indexAction: entry.indexAction,
        sha256: entry.sha256,
      },
    });
  }
  const taxonomy = (await loadCorpusConfig()).topics.map(
    ({ id, keywords, mesh }) => ({ id, keywords, mesh, queries: [] }),
  );
  await unchangedManifest(store, manifestHash);
  const currentState = await store.read("vector-state.json");
  if (currentState === null || hash(currentState) !== hash(stateText))
    throw new RagError(
      "configuration",
      "Vector state changed during runtime export.",
    );
  return parseRuntimeManifest({
    schemaVersion: 1,
    storeId,
    manifestSha256: manifestHash,
    taxonomySha256: manifest.taxonomySha256,
    papers,
    taxonomy,
  });
}
async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== "--store-id" || !args[1])
    throw new RagError(
      "configuration",
      "Usage: runtime-manifest --store-id vs_DEVELOPMENT_ID",
    );
  const manifest = await exportRuntimeManifest(new LocalStore(), args[1]);
  const output = new LocalStore(path.join(RAG_ROOT, "..", "functions"));
  const text = JSON.stringify(manifest) + "\n";
  await output.write("runtime-manifest.json", text, true);
  await output.write("runtime-manifest.sha256", hash(text) + "\n", true);
  console.log(
    JSON.stringify({
      status: "runtime-manifest-exported",
      papers: manifest.papers.length,
      eligible: manifest.papers.filter((p) => indexable(p.entry)).length,
    }),
  );
}
// Run only as an entry point; tests import the exporter without writing artifacts.
import { fileURLToPath } from "node:url";
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((error: unknown) => {
    console.error(
      JSON.stringify({
        status: "runtime-manifest-export-failed",
        category: category(error),
      }),
    );
    process.exitCode = 1;
  });
