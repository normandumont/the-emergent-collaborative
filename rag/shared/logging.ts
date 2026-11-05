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

export interface LogRecord {
  runId?: string;
  queryId?: string;
  pmid?: string;
  status: string;
  count?: number;
  latencyMs?: number;
  category?: ErrorCategory;
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
