export type ErrorCategory =
  | "configuration"
  | "network"
  | "timeout"
  | "throttled"
  | "http"
  | "malformed-source"
  | "missing-record"
  | "storage"
  | "policy-limit"
  | "internal";

export class RagError extends Error {
  constructor(
    public readonly category: ErrorCategory,
    message: string,
  ) {
    super(message);
    this.name = "RagError";
  }
}

export type StorageFailure =
  | "normalized-record-missing"
  | "normalized-path-invalid"
  | "raw-source-missing"
  | "provenance-file-missing"
  | "hash-mismatch"
  | "catalog-schema-mismatch"
  | "version-record-missing"
  | "retrieval-path-error"
  | "JSON-read-error"
  | "unsupported-record-version"
  | "relationship-inventory-incomplete"
  | "record-schema-mismatch";

export class StorageError extends RagError {
  constructor(
    public readonly failureCode: StorageFailure,
    public readonly reference: string,
    description: string,
  ) {
    super("storage", description);
  }
}

export interface LogRecord {
  runId?: string;
  queryId?: string;
  pmid?: string;
  status: string;
  count?: number;
  latencyMs?: number;
  category?: ErrorCategory;
  failureCode?: StorageFailure;
  reference?: string;
  description?: string;
}

// Only project metadata is logged. Never attach content, request parameters,
// XML, API keys, provider error bodies or raw exceptions.
export function log(record: LogRecord): void {
  const safe = {
    runId: record.runId,
    queryId: record.queryId,
    pmid: record.pmid,
    status: record.status,
    count: record.count,
    latencyMs: record.latencyMs,
    category: record.category,
    failureCode: record.failureCode,
    reference: record.reference,
    description: record.description,
  };
  console.log(JSON.stringify(safe));
}

export function category(error: unknown): ErrorCategory {
  if (error instanceof RagError) return error.category;
  if (
    error instanceof Error &&
    "code" in error &&
    typeof error.code === "string"
  )
    return "storage";
  return "internal";
}
