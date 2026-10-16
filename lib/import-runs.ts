// The import log's types, shared by the server (lib/server/import-runs.ts)
// and the staff components that show it.

export type ImportJob = "sync-mps" | "check-mps" | "import-controlai" | "import-signatories";

/** Who starts the scheduled runs (netlify/functions/). Staff runs are started by the staff member's email. */
export const NIGHTLY = "nightly";

/** ok or failed; a sync-mps run is instead unchanged, held, applied or discarded. */
export type ImportRunStatus = "ok" | "failed" | "unchanged" | "held" | "applied" | "discarded";

/** One run of a job: how it ended, and the job's own account of what it found, unless it failed. */
export type ImportRun<Result> = {
  id: number;
  at: string;
  /** NIGHTLY, a staff member's email, or null for a run kept before 16 Oct 2026, when this wasn't recorded. */
  startedBy: string | null;
  /** Who applied or discarded a held sync. */
  decidedBy: string | null;
} & (
  | { status: "failed"; error: string; result: Record<string, never> }
  | { status: Exclude<ImportRunStatus, "failed">; error: null; result: Result }
);
