import "server-only";
import type { AnyImportRun, ImportJob, ImportRunStatus } from "@/lib/import-runs";
import { query, type Queryable } from "./db";

// One log of every run of every import and check: the MPs and the
// signatories from Airtable, the check against Parliament, and ControlAI's
// letter. Each run is a row: when, who started it, how it ended, why it
// failed, and the job's own account of what it found. Failures are kept
// too, so each job's page under /staff/import-data can say what went
// wrong, and so are runs that changed nothing, so it can say when the job
// last ran. Each job's page lists all of its runs. The types are in lib/import-runs.ts,
// for the components.

const COLUMNS = `id::int AS id, at, job, started_by AS "startedBy", status, error, result, decided_by AS "decidedBy"`;

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

/** A job's newest run, if it has ever run. */
export async function latestRun<Run extends AnyImportRun>(job: Run["job"]): Promise<Run | undefined> {
  const [run] = await query<Run>(
    `SELECT ${COLUMNS} FROM import_runs WHERE job = $1 ORDER BY at DESC, id DESC LIMIT 1`,
    [job],
  );
  return run;
}

/** Every run of one job, newest first, for its page. */
export async function listRuns(job: ImportJob): Promise<AnyImportRun[]> {
  return query<AnyImportRun>(`SELECT ${COLUMNS} FROM import_runs WHERE job = $1 ORDER BY at DESC, id DESC`, [job]);
}
