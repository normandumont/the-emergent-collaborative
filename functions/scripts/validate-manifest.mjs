import { readFile } from "node:fs/promises";
import { verifyRuntimeManifest } from "../runtime/retrieval/runtime-manifest.js";
import { indexable } from "../runtime/indexing/metadata.js";

try {
  const [text, digest] = await Promise.all([
    readFile(new URL("../runtime-manifest.json", import.meta.url), "utf8"),
    readFile(new URL("../runtime-manifest.sha256", import.meta.url), "utf8"),
  ]);
  const manifest = verifyRuntimeManifest(text, digest);
  if (process.env.RAG_ENABLED === "true" && !process.env.OPENAI_VECTOR_STORE_ID)
    throw new Error("Missing vector configuration.");
  if (
    process.env.OPENAI_VECTOR_STORE_ID &&
    manifest.storeId !== process.env.OPENAI_VECTOR_STORE_ID
  )
    throw new Error("Store mismatch.");
  console.log(
    JSON.stringify({
      status: "runtime-manifest-valid",
      records: manifest.papers.length,
      eligible: manifest.papers.filter((paper) => indexable(paper.entry))
        .length,
      checksumVerified: true,
      storeCompatibilityChecked: Boolean(process.env.OPENAI_VECTOR_STORE_ID),
    }),
  );
} catch {
  console.error(
    JSON.stringify({
      status: "runtime-manifest-invalid",
      category: "rag-not-configured",
    }),
  );
  process.exitCode = 1;
}
