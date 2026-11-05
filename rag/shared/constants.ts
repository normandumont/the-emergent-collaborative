import { fileURLToPath } from "node:url";

export const RAG_ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/";
export const PMC_OAI_BASE = "https://pmc.ncbi.nlm.nih.gov/api/oai/v1/mh/";
export const MAX_RESULTS = 100;
export const MAX_BATCH_SIZE = 50;
export const REQUEST_TIMEOUT_MS = 30_000;
export const MAX_RESPONSE_BYTES = 20 * 1024 * 1024;
export const MAX_ATTEMPTS = 3;
export const MAX_RETRY_WAIT_MS = 120_000;
