import "server-only";
import { type ImportJob, type ImportRun, type ImportRunStatus } from "@/lib/import-runs";
import { query, type Queryable } from "./db";

// One log of every run of every import and check: the MPs and the
// signatories from Airtable, the check against Parliament, and ControlAI's
// letter. Each run is a row: when, who started it, how it ended, why it
// failed, and the job's own account of what it found. Failures are kept
// too, so /staff/import-data and /staff/check-data can say what went wrong,
// and so are runs that changed nothing, so they can say when a job last ran.
// The types are in lib/import-runs.ts, for the components.

/** How many of a job's runs the staff pages show. */
const RECENT_RUNS = 20;

/** Keeps a run that ended, and returns its ID. */
export async function recordRun(
  job: ImportJob,
  startedBy: string,
  status: Exclude<ImportRunStatus, "failed">,
  result: object,
  db?: Queryable,
): Promise<number> {
  const [{ id }] = await query<{ id: number }>(
    "INSERT INTO import_runs (job, started_by, status, result) VALUES ($1, $2, $3, $4) RETURNING id::int AS id",
    [job, startedBy, status, JSON.stringify(result)],
    db,
  );
  return id;
}

/** Keeps a run that failed, with why. */
export async function recordFailure(job: ImportJob, startedBy: string, error: unknown): Promise<void> {
  await query("INSERT INTO import_runs (job, started_by, status, error) VALUES ($1, $2, 'failed', $3)", [
    job,
    startedBy,
    String(error).replace(/^Error: /, ""),
  ]);
}

/**
 * Runs a job's work, keeping the failure if it throws, then throwing it on
 * for the caller to log. The work records its own success, with what it found.
 */
export async function keepingFailure<T>(job: ImportJob, startedBy: string, work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    await recordFailure(job, startedBy, error);
    throw error;
  }
}

/** A job's newest runs, newest first. */
export async function recentRuns<Result>(job: ImportJob, limit = RECENT_RUNS): Promise<ImportRun<Result>[]> {
  return query<ImportRun<Result>>(
    `SELECT id::int AS id, at, started_by AS "startedBy", status, error, result, decided_by AS "decidedBy"
     FROM import_runs WHERE job = $1 ORDER BY at DESC, id DESC LIMIT $2`,
    [job, limit],
  );
}
