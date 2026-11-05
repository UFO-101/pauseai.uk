import "server-only";
import { jobTitles, staffCopy } from "@/lib/content/staff-interface";
import { importPath, type AnyImportRun, type ImportJob, type ImportRunStatus } from "@/lib/import-runs";
import { query, type Queryable } from "./db";
import { notifyStaff, staffLink } from "./notifications";

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

/**
 * Keeps a run that failed, with why; and, unless its run before failed too,
 * emails the notification inbox, so a job failing every hour says so once.
 */
export async function recordFailure(job: ImportJob, startedBy: string, error: unknown): Promise<void> {
  const why = String(error).replace(/^Error: /, "");
  const [before] = await query<{ status: string }>(
    "SELECT status FROM import_runs WHERE job = $1 ORDER BY at DESC, id DESC LIMIT 1",
    [job],
  );
  await query("INSERT INTO import_runs (job, started_by, status, error) VALUES ($1, $2, 'failed', $3)", [
    job,
    startedBy,
    why,
  ]);
  if (before?.status === "failed") return;
  const words = staffCopy.notifications.importFailed;
  await notifyStaff(
    words.subject(jobTitles[job]),
    words.body(jobTitles[job], why, staffLink(importPath(job), undefined)),
  );
}

/**
 * Runs a job's work, keeping the failure if it throws and ending any press of
 * it, then throwing it on for the caller to log. The work records its own success, with what it found.
 */
export async function keepingFailure<T>(job: ImportJob, startedBy: string, work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    await recordFailure(job, startedBy, error);
    await endPress(job);
    throw error;
  }
}

/** Longer than any press can run: a background function's 15 minutes. */
const PRESS_LASTS = "16 minutes";

/** A job's button pressed and not finished. */
export type JobPress = { startedBy: string; startedAt: string };

/** The press of `job` that's still running, if any. */
export async function currentPress(job: ImportJob): Promise<JobPress | undefined> {
  const [press] = await query<JobPress>(
    `SELECT started_by AS "startedBy", started_at AS "startedAt" FROM job_presses
     WHERE job = $1 AND started_at > now() - interval '${PRESS_LASTS}'`,
    [job],
  );
  return press;
}

/** Marks `job` pressed, unless a press of it is still running: says whether it may go ahead. */
export async function takePress(job: ImportJob, startedBy: string): Promise<boolean> {
  const taken = await query(
    `INSERT INTO job_presses (job, started_by) VALUES ($1, $2)
     ON CONFLICT (job) DO UPDATE SET started_by = $2, started_at = now()
     WHERE job_presses.started_at <= now() - interval '${PRESS_LASTS}' RETURNING job`,
    [job, startedBy],
  );
  return taken.length > 0;
}

/** Marks a press of `job` finished. */
export async function endPress(job: ImportJob): Promise<void> {
  await query("DELETE FROM job_presses WHERE job = $1", [job]);
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
