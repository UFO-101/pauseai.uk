import "server-only";
import { IMPORT_JOBS } from "@/lib/import-runs";
import { now } from "@/lib/now";
import {
  BY_CAMPAIGN,
  type CampaignMetric,
  type Count,
  type Dashboard,
  type DashboardAction,
  type DashboardMetric,
  type DashboardWindow,
  SERIES_POINTS,
  type SeriesMetric,
  type SeriesPoint,
  WITH_SERIES,
} from "@/lib/staff-dashboard";
import { query } from "./db";
import { latestRun } from "./import-runs";

// Fills the staff home's dashboard (lib/staff-dashboard.ts): the counts in
// the window and the one before it, in one query; the campaign breakdowns
// and the sparklines' series, a query each; and what needs a person,
// including any import whose newest run failed.

/** Letters, statuses and their politician, so test MPs can be left out. */
const LETTERS = "letters l JOIN politicians p ON p.id = l.politician_id";
const STATUSES = "campaign_statuses s JOIN politicians p ON p.id = s.politician_id";

/** Each metric's rows: a table with a condition, and the column that dates them. Counted in each window. */
const SOURCES: Record<DashboardMetric, { from: string; at: string }> = {
  lettersSent: { from: `${LETTERS} WHERE l.sent_at IS NOT NULL AND NOT p.is_test`, at: "l.sent_at" },
  lettersReplied: { from: `${LETTERS} WHERE l.replied_at IS NOT NULL AND NOT p.is_test`, at: "l.replied_at" },
  mpsSigned: { from: `${STATUSES} WHERE s.status = 'signed' AND NOT p.is_test`, at: "s.updated_at" },
  eventRegistrations: {
    from: "luma_guests WHERE approval_status = 'approved' AND removed_at IS NULL",
    at: "registered_at",
  },
  eventsHeld: { from: "luma_events WHERE removed_at IS NULL", at: "start_at" },
  supportersAdded: { from: "supporters WHERE true", at: "first_seen_at" },
  unsubscribes: { from: "email_unsubscribes WHERE topic = 'luma-calendar'", at: "at" },
};

/** Letters to test MPs, counted apart from the letters tile's number. */
const TEST_LETTERS = { from: `${LETTERS} WHERE l.sent_at IS NOT NULL AND p.is_test`, at: "l.sent_at" };

/** The column a campaign breakdown groups by. */
const CAMPAIGN_OF: Record<CampaignMetric, string> = { lettersSent: "l.campaign", mpsSigned: "s.campaign" };

/** $1 is the window's start, $2 the window before's, $3 now. */
const COUNTS = [
  ...Object.entries(SOURCES).map(
    ([metric, { from, at }]) =>
      `(SELECT count(*)::int FROM ${from} AND ${at} >= $1 AND ${at} < $3) AS "${metric}_current",
       (SELECT count(*)::int FROM ${from} AND ${at} >= $2 AND ${at} < $1) AS "${metric}_previous"`,
  ),
  `(SELECT count(*)::int FROM ${TEST_LETTERS.from} AND ${TEST_LETTERS.at} >= $1 AND ${TEST_LETTERS.at} < $3) AS "testLetters"`,
].join(",\n");

const DAY_MS = 24 * 60 * 60 * 1000;

/** The window's count by campaign, as a map. */
async function byCampaign(metric: CampaignMetric, since: string, until: string): Promise<Record<string, number>> {
  const { from, at } = SOURCES[metric];
  const rows = await query<{ campaign: string; count: number }>(
    `SELECT ${CAMPAIGN_OF[metric]} AS campaign, count(*)::int AS count FROM ${from} AND ${at} >= $1 AND ${at} < $2
     GROUP BY ${CAMPAIGN_OF[metric]} ORDER BY ${CAMPAIGN_OF[metric]}`,
    [since, until],
  );
  return Object.fromEntries(rows.map((row) => [row.campaign, row.count]));
}

/** SERIES_POINTS windows of `days` ending now, oldest first: how many rows fell in each. */
async function series(metric: SeriesMetric, until: Date, days: DashboardWindow): Promise<SeriesPoint[]> {
  const { from, at } = SOURCES[metric];
  const windowMs = days * DAY_MS;
  const start = new Date(until.getTime() - SERIES_POINTS * windowMs);
  // Bucket 0 is the current window, counting back.
  const rows = await query<{ bucket: number; count: number }>(
    `SELECT floor(extract(epoch FROM ($2::timestamptz - ${at})) / $3)::int AS bucket, count(*)::int AS count
     FROM ${from} AND ${at} >= $1 AND ${at} < $2 GROUP BY bucket`,
    [start.toISOString(), until.toISOString(), days * 24 * 60 * 60],
  );
  const counts = new Map(rows.map((row) => [row.bucket, row.count]));
  return Array.from({ length: SERIES_POINTS }, (_, i) => {
    const bucket = SERIES_POINTS - 1 - i;
    return { from: new Date(until.getTime() - (bucket + 1) * windowMs).toISOString(), count: counts.get(bucket) ?? 0 };
  });
}

/** Every MP sync still held for a decision, oldest first. */
async function heldSyncs(): Promise<DashboardAction[]> {
  const rows = await query<{ at: Date; added: number; removed: number; changed: number }>(
    `SELECT at, jsonb_array_length(result->'changes'->'added')::int AS added,
            jsonb_array_length(result->'changes'->'removed')::int AS removed,
            jsonb_array_length(result->'changes'->'changed')::int AS changed
     FROM import_runs WHERE job = 'sync-mps' AND status = 'held' ORDER BY at, id`,
  );
  return rows.map(({ at, ...counts }) => ({ kind: "held-sync", at: at.toISOString(), ...counts }));
}

/** Every sitting politician whose address is blocked, with the problem that blocked it, oldest first. */
async function blockedMps(): Promise<DashboardAction[]> {
  const rows = await query<{ politicianId: number; name: string; at: Date }>(
    `SELECT p.id::int AS "politicianId", p.name, pr.at
     FROM politicians p JOIN email_blocks b ON b.address = lower(p.email) JOIN email_problems pr ON pr.id = b.problem_id
     WHERE p.sitting ORDER BY pr.at, p.id`,
  );
  return rows.map(({ at, ...rest }) => ({ kind: "blocked-mp", at: at.toISOString(), ...rest }));
}

/** The politician who signed in the window, if only one did. */
async function signedMp(since: string, until: string): Promise<number | null> {
  const { from, at } = SOURCES.mpsSigned;
  const rows = await query<{ id: number }>(
    `SELECT DISTINCT p.id::int AS id FROM ${from} AND ${at} >= $1 AND ${at} < $2 LIMIT 2`,
    [since, until],
  );
  return rows.length === 1 ? rows[0].id : null;
}

/** The dashboard as of now: the last `days` days against the `days` before, and what's waiting. */
export async function dashboard(days: DashboardWindow): Promise<Dashboard> {
  const at = now();
  const until = at.toISOString();
  const since = new Date(at.getTime() - days * DAY_MS).toISOString();
  const before = new Date(at.getTime() - 2 * days * DAY_MS).toISOString();
  const [[row], [letterCampaigns, signedCampaigns], [registrations, supporters], signer, held, blocked, imports] =
    await Promise.all([
      query<Record<string, number>>(`SELECT ${COUNTS}`, [since, before, until]),
      Promise.all(BY_CAMPAIGN.map((metric) => byCampaign(metric, since, until))),
      Promise.all(WITH_SERIES.map((metric) => series(metric, at, days))),
      signedMp(since, until),
      heldSyncs(),
      blockedMps(),
      Promise.all(IMPORT_JOBS.map((job) => latestRun(job))),
    ]);
  const counts = Object.fromEntries(
    Object.keys(SOURCES).map((metric) => [
      metric,
      { current: row[`${metric}_current`], previous: row[`${metric}_previous`] },
    ]),
  ) as Record<DashboardMetric, Count>;
  const failed: DashboardAction[] = imports.flatMap((run) =>
    run?.status === "failed"
      ? [{ kind: "failed-import", job: run.job, at: new Date(run.at).toISOString(), error: run.error }]
      : [],
  );
  return {
    days,
    asOf: until,
    since,
    counts,
    testLetters: row.testLetters,
    byCampaign: { lettersSent: letterCampaigns, mpsSigned: signedCampaigns },
    signedMp: signer,
    series: { eventRegistrations: registrations, supportersAdded: supporters },
    actions: [...held, ...blocked, ...failed],
  };
}
