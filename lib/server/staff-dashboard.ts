import "server-only";
import { IMPORT_JOBS } from "@/lib/import-runs";
import { now } from "@/lib/now";
import { type Count, DASHBOARD_DAYS, type Dashboard, type DashboardMetric } from "@/lib/staff-dashboard";
import { query } from "./db";
import { latestRun } from "./import-runs";

// Fills the staff home's dashboard (lib/staff-dashboard.ts): one query of
// counts, each twice, within the window ("since") and within the one before
// it, and each import's newest run.

/** Each metric's rows: a table and the column that dates them, with a condition. Counted in each window. */
const SOURCES: Record<DashboardMetric, { from: string; at: string }> = {
  lettersSent: { from: "letters WHERE sent_at IS NOT NULL", at: "sent_at" },
  lettersReplied: { from: "letters WHERE replied_at IS NOT NULL", at: "replied_at" },
  lettersBounced: { from: "letter_events WHERE status = 'bounced'", at: "at" },
  mpsSigned: { from: "campaign_statuses WHERE status = 'signed'", at: "updated_at" },
  supportersAdded: { from: "supporters WHERE true", at: "created_at" },
  eventRegistrations: {
    from: "luma_guests WHERE approval_status = 'approved' AND removed_at IS NULL",
    at: "registered_at",
  },
  unsubscribes: { from: "opt_outs WHERE resubscribed_at IS NULL", at: "unsubscribed_at" },
  addressesBlocked: { from: "email_blocks b JOIN email_problems p ON p.id = b.problem_id WHERE true", at: "p.at" },
};

const COUNTS = Object.entries(SOURCES)
  .map(
    ([metric, { from, at }]) =>
      `(SELECT count(*)::int FROM ${from} AND ${at} >= $1) AS "${metric}_week",
       (SELECT count(*)::int FROM ${from} AND ${at} >= $2 AND ${at} < $1) AS "${metric}_previous"`,
  )
  .join(",\n");

const WINDOW_MS = DASHBOARD_DAYS * 24 * 60 * 60 * 1000;

/** The dashboard as of now: the last DASHBOARD_DAYS days, against the DASHBOARD_DAYS before. */
export async function dashboard(): Promise<Dashboard> {
  const since = new Date(now().getTime() - WINDOW_MS).toISOString();
  const before = new Date(now().getTime() - 2 * WINDOW_MS).toISOString();
  const [[row], ...imports] = await Promise.all([
    query<Record<string, number>>(`SELECT ${COUNTS}`, [since, before]),
    ...IMPORT_JOBS.map((job) => latestRun(job)),
  ]);
  const counts = Object.fromEntries(
    Object.keys(SOURCES).map((metric) => [
      metric,
      { week: row[`${metric}_week`], previous: row[`${metric}_previous`] },
    ]),
  ) as Record<DashboardMetric, Count>;
  return { since, counts, imports };
}
