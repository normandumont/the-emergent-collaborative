import { RagError } from "../shared/logging.js";

export function pmid(value: string): string {
  if (!/^[1-9]\d{0,8}$/.test(value))
    throw new RagError("malformed-source", "Invalid PMID.");
  return value;
}

export function pmcid(value: string): string {
  if (!/^PMC[1-9]\d{0,9}$/.test(value))
    throw new RagError("malformed-source", "Invalid PMCID.");
  return value;
}

export function deduplicate(ids: string[]): string[] {
  return [...new Set(ids.map(pmid))];
}
