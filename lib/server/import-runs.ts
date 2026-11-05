import "server-only";
import { jobTitles, staffCopy } from "@/lib/content/staff-interface";
import { importPath, type AnyImportRun, type ImportJob, type ImportRunStatus } from "@/lib/import-runs";
import { query, type Queryable } from "./db";
import { notifyStaff, staffLink } from "./notifications";
import { describeError } from "./problems";
import { currentRun, inRun } from "./run-store";

// One log of every run of every import and check: the MPs and the
// signatories from Airtable, the check against Parliament, and ControlAI's
// letter. Each run is a row: when, who started it, how it ended, why it
// failed, what went wrong along the way (problems.ts), and the job's own
// account of what it found. Failures are kept
// too, so each job's page under /staff/import-data can say what went
// wrong, and so are runs that changed nothing, so it can say when the job
// last ran. Each job's page lists all of its runs. The types are in lib/import-runs.ts,
// for the components.

const COLUMNS = `id::int AS id, at, job, started_by AS "startedBy", status, error, result, problems, decided_by AS "decidedBy"`;

/** Keeps a run that ended, with the problems reported so far, and returns its ID. */
export async function recordRun(
  job: ImportJob,
  startedBy: string,
  status: Exclude<ImportRunStatus, "failed">,
  result: object,
  db?: Queryable,
): Promise<number> {
  const run = currentRun();
  const [{ id }] = await query<{ id: number }>(
    "INSERT INTO import_runs (job, started_by, status, result, problems) VALUES ($1, $2, $3, $4, $5) RETURNING id::int AS id",
    [job, startedBy, status, JSON.stringify(result), JSON.stringify(run?.problems ?? [])],
    db,
  );
  if (run) run.recorded = id;
  return id;
}

/** Keeps a run that failed, with why, and the problems reported before it did. */
export async function recordFailure(job: ImportJob, startedBy: string, error: unknown): Promise<number> {
  const run = currentRun();
  const [{ id }] = await query<{ id: number }>(
    "INSERT INTO import_runs (job, started_by, status, error, problems) VALUES ($1, $2, 'failed', $3, $4) RETURNING id::int AS id",
    [job, startedBy, describeError(error), JSON.stringify(run?.problems ?? [])],
  );
  if (run) run.recorded = id;
  return id;
}

/**
 * Runs a job's work as a run: what it reports with problem() is kept on the
 * run it records, and once it's done, staff are emailed if it failed or had
 * problems that the run before didn't (below). A failure is kept as a failed
 * run and thrown on, for the caller to log, and ends any press of the job.
 */
export async function keepingFailure<T>(job: ImportJob, startedBy: string, work: () => Promise<T>): Promise<T> {
  let recorded: number | undefined;
  try {
    return await inRun(async (run) => {
      try {
        const result = await work();
        recorded = run.recorded;
        // Problems reported after the run was recorded, as a job's last steps may.
        if (recorded) {
          await query("UPDATE import_runs SET problems = $2 WHERE id = $1", [recorded, JSON.stringify(run.problems)]);
        }
        return result;
      } catch (error) {
        recorded = await recordFailure(job, startedBy, error);
        throw error;
      }
    });
  } finally {
    if (recorded) await alertIfNew(job, recorded);
  }
}

/** What a run went wrong with, as the alert tells it apart from the run before: its problems by name, those with an alert of their own aside, or that it failed. */
function wentWrong(run: AnyImportRun | undefined): string[] {
  if (!run) return [];
  if (run.status === "failed") return ["failed"];
  return run.problems.filter((p) => !p.told).map((p) => p.what);
}

/**
 * Emails the notification inbox about run `id` if it went wrong in a way the
 * run before didn't: a failure, or a problem by its name. A job failing every
 * hour, or stuck on the same problem, says so once; it says so again once a
 * run has gone right, or when something new goes wrong.
 */
async function alertIfNew(job: ImportJob, id: number): Promise<void> {
  const [run, before] = await query<AnyImportRun>(
    `SELECT ${COLUMNS} FROM import_runs WHERE job = $1 AND id <= $2 ORDER BY at DESC, id DESC LIMIT 2`,
    [job, id],
  );
  const wrong = wentWrong(run);
  const already = new Set(wentWrong(before));
  if (!wrong.length || wrong.every((what) => already.has(what))) return;
  const title = jobTitles[job];
  const link = staffLink(importPath(job), undefined);
  if (run.status === "failed") {
    const words = staffCopy.notifications.importFailed;
    await notifyStaff(words.subject(title), words.body(title, run.error, link));
    return;
  }
  const words = staffCopy.notifications.importProblems;
  await notifyStaff(
    words.subject(title),
    words.body(
      title,
      run.problems.map((p) => (p.error ? `- ${p.what}: ${p.error}` : `- ${p.what}`)),
      link,
    ),
  );
}

/** Longer than any press can run, so one that died is ignored. */
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
