import "server-only";
import { IMPORT_JOBS, JOB_SCHEDULES, type ImportJob } from "@/lib/import-runs";
import { query } from "./db";

// How long the import log and the audit log keep what they hold, so neither
// grows for ever. Run once a day, by the nightly politicians sync
// (app/api/cron/sync-politicians).
//
// An import run is kept for a week if its job runs hourly, a month if it
// runs nightly, and a one-off job keeps its last 50 runs. Every job keeps its
// newest run, however old, as its page shows it, and a held sync is kept
// until someone applies or discards it.
//
// An audit log entry is kept for a month, but for a politician's history
// (politicianHistory in ./politicians.ts): their row added, edited or
// removed, their statuses set, and their address blocked or unblocked. That
// is kept while the politician is.

/** How many runs a one-off job keeps. */
export const ONE_OFF_RUNS = 50;

const jobsThat = (schedule: (typeof JOB_SCHEDULES)[ImportJob]) =>
  IMPORT_JOBS.filter((job) => JOB_SCHEDULES[job] === schedule);

/** An audit log entry `a` that's part of a politician's history, while they're here. */
const POLITICIAN_HISTORY = `(
  (a.action IN ('add politician', 'edit politician', 'remove politician')
    AND EXISTS (SELECT 1 FROM notable_people n WHERE n.id::text = a.details->>'id'))
  OR (a.action = 'set status'
    AND EXISTS (SELECT 1 FROM notable_people n WHERE n.id::text = a.details->>'politicianId'))
  OR (a.action IN ('block address', 'unblock address')
    AND EXISTS (SELECT 1 FROM notable_people n WHERE lower(n.email) = a.details->>'address')))`;

/** Deletes what the logs no longer keep. Returns how many import runs and audit log entries went. */
export async function tidyLogs(): Promise<{ importRuns: number; auditEntries: number }> {
  const runs = await query(
    `DELETE FROM import_runs r
     WHERE r.status <> 'held'
       AND r.id <> (SELECT n.id FROM import_runs n WHERE n.job = r.job ORDER BY n.at DESC, n.id DESC LIMIT 1)
       AND ((r.job = ANY($1) AND r.at < now() - interval '7 days')
         OR (r.job = ANY($2) AND r.at < now() - interval '1 month')
         OR (r.job = ANY($3) AND r.id NOT IN (
               SELECT k.id FROM import_runs k WHERE k.job = r.job ORDER BY k.at DESC, k.id DESC LIMIT $4)))
     RETURNING 1`,
    [jobsThat("hourly"), jobsThat("nightly"), jobsThat("oneOff"), ONE_OFF_RUNS],
  );
  const entries = await query(
    `DELETE FROM audit_log a WHERE a.at < now() - interval '1 month' AND NOT ${POLITICIAN_HISTORY} RETURNING 1`,
  );
  return { importRuns: runs.length, auditEntries: entries.length };
}
