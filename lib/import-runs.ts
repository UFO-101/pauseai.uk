// The import log's types, shared by the server (lib/server/import-runs.ts)
// and the staff components that show a run (app/(staff)/staff/_components/Run.tsx).
import type { ControlAiMatchProblem } from "./controlai-letter";
import type { MpProblem } from "./mp-check";
import type { MpChanges, SyncedMp } from "./mps";

export const IMPORT_JOBS = ["sync-mps", "check-mps", "import-controlai", "import-signatories", "import-luma"] as const;
export type ImportJob = (typeof IMPORT_JOBS)[number];

export function isImportJob(value: string): value is ImportJob {
  return (IMPORT_JOBS as readonly string[]).includes(value);
}

/** Who starts the scheduled runs (netlify/functions/). Staff runs are started by the staff member's email. */
/** A job's newest run as a list for RunList: itself, or none if it has never run. */
export function asList<Run>(run: Run | undefined): Run[] {
  return run ? [run] : [];
}

export const NIGHTLY = "nightly";

/** ok or failed; a sync-mps run is instead unchanged, held, applied or discarded. */
export type ImportRunStatus = "ok" | "failed" | "unchanged" | "held" | "applied" | "discarded";

/** One run of a job: how it ended, and the job's own account of what it found, unless it failed. */
export type ImportRun<Job extends ImportJob, Result> = {
  id: number;
  at: string;
  job: Job;
  /** NIGHTLY, a staff member's email, or null for a run kept before 16 Oct 2026, when this wasn't recorded. */
  startedBy: string | null;
  /** Who applied or discarded a held sync. */
  decidedBy: string | null;
} & (
  | { status: "failed"; error: string; result: Record<string, never> }
  | { status: Exclude<ImportRunStatus, "failed">; error: null; result: Result }
);

/** What a sync-mps run keeps: a held one also keeps the full list, to apply later. */
export type MpSyncResult = { changes: MpChanges; mps?: SyncedMp[] };
export type MpSync = ImportRun<"sync-mps", MpSyncResult>;

export type MpCheckResult = { problems: MpProblem[] };
export type MpCheck = ImportRun<"check-mps", MpCheckResult>;

export type ControlAiImportResult = {
  pdfUrl: string;
  /** Names in the letter. */
  signatories: number;
  /** Of those, in our table. */
  matched: number;
  /** Statuses set and removed this run. */
  added: number;
  removed: number;
  problems: ControlAiMatchProblem[];
};
export type ControlAiImport = ImportRun<"import-controlai", ControlAiImportResult>;

export type SignatoryImportResult = { matched: number; added: number; alreadySet: number };
export type SignatoryImport = ImportRun<"import-signatories", SignatoryImportResult>;

/** What a run of the Luma import did: counts of what it copied, and what stopped it, if anything did. */
export type LumaImportResult = {
  /** Events added or changed. */
  events: number;
  /** Events whose guest list was read in full. */
  eventsSynced: number;
  /** Events still waiting for their guest list, for the next run. */
  eventsLeft: number;
  /** Guest rows added, changed or marked as removed. */
  guestsChanged: number;
  /** People added or changed. */
  people: number;
  /** Contacts whose joining date was set. */
  contacts: number;
  requests: number;
  /** Why the run stopped before it was done: its time was up, Luma's rate limit was near, or another run had the lock. */
  stoppedBy?: "time" | "rate-limit" | "running";
};
export type LumaImport = ImportRun<"import-luma", LumaImportResult>;

export type AnyImportRun = MpSync | MpCheck | ControlAiImport | SignatoryImport | LumaImport;
