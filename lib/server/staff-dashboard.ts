import "server-only";
import { campaignForAsk } from "@/lib/email-your-mp";
import { IMPORT_JOBS } from "@/lib/import-runs";
import { now } from "@/lib/now";
import {
  BY_CAMPAIGN,
  BY_LETTER_KIND,
  type CampaignMetric,
  type Count,
  type Dashboard,
  type DashboardAction,
  type DashboardMetric,
  type DashboardWindow,
  type LetterKindMetric,
  type LetterKinds,
  SERIES_POINTS,
  type SeriesMetric,
  type SeriesPoint,
  type SourcePoint,
  WITH_SERIES,
} from "@/lib/staff-dashboard";
import type { SupporterSource } from "@/lib/supporters";
import { query } from "./db";
import { latestRun } from "./import-runs";

// Fills the staff home's dashboard (lib/staff-dashboard.ts): the counts in
// the window and the one before it, in one query; the campaign breakdowns,
// the sparklines' series and new supporters by source, a query each; and what needs a person,
// including any import whose newest run failed.

/** Letters, statuses and their politician, so test MPs can be left out. */
const LETTERS = "letters l JOIN politicians p ON p.id = l.notable_person_id";
const STATUSES = "ask_statuses s JOIN politicians p ON p.id = s.notable_person_id";

/**
 * Each metric's rows: a table with a condition, the column that dates them,
 * and what's counted in each window, one row each unless it says. Each counts
 * what its tile's list shows (METRIC_LINKS), a person or a politician once.
 */
const SOURCES: Record<DashboardMetric, { from: string; at: string; count?: string }> = {
  lettersSent: { from: `${LETTERS} WHERE l.sent_at IS NOT NULL AND NOT p.is_test`, at: "l.sent_at" },
  lettersReplied: { from: `${LETTERS} WHERE l.replied_at IS NOT NULL AND NOT p.is_test`, at: "l.replied_at" },
  // Not Airtable's: it records signatures from before the site, with no date.
  mpsSigned: {
    from: `${STATUSES} WHERE s.status = 'signed' AND s.updated_by <> 'airtable' AND NOT p.is_test`,
    at: "s.updated_at",
    count: "DISTINCT p.id",
  },
  eventRegistrations: {
    from: `luma_guests g JOIN supporter_links k ON k.luma_user_id = g.user_id
      WHERE g.approval_status = 'approved' AND g.removed_at IS NULL`,
    at: "g.registered_at",
    count: "DISTINCT k.supporter_id",
  },
  eventsHeld: { from: "luma_events WHERE access = 'manage' AND removed_at IS NULL", at: "start_at" },
  supportersAdded: { from: "supporters WHERE true", at: "first_seen_at" },
  // Only an address that's still a supporter's: an opt-out outlives its contact, so that they're never emailed.
  unsubscribes: {
    from: `contact_unsubscribes u JOIN supporter_identity i ON i.email = u.address
      WHERE u.channel = 'email' AND u.topic = 'luma-calendar'`,
    at: "u.at",
    count: "DISTINCT i.supporter_id",
  },
};

/** Letters to test MPs, counted apart from the letters tile's number. */
const TEST_LETTERS = { from: `${LETTERS} WHERE l.sent_at IS NOT NULL AND p.is_test`, at: "l.sent_at" };

/** A breakdown by campaign: the rows, and the column to group by: a supporter's letter's campaign, a signature's ask. */
const CAMPAIGN_SOURCES: Record<CampaignMetric, { from: string; at: string; column: string }> = {
  lettersSent: {
    from: `${LETTERS} JOIN letters_from_supporters sl ON sl.id = l.id WHERE l.sent_at IS NOT NULL AND NOT p.is_test`,
    at: "l.sent_at",
    column: "sl.campaign",
  },
  mpsSigned: { from: SOURCES.mpsSigned.from, at: SOURCES.mpsSigned.at, column: "s.ask" },
};

/** What a metric counts, as SQL. */
const counted = (metric: DashboardMetric) => `count(${SOURCES[metric].count ?? "*"})::int`;

/** $1 is the window's start, $2 the window before's, $3 now; the window runs up to now, and includes it. */
const COUNTS = [
  ...Object.entries(SOURCES).map(
    ([metric, { from, at }]) =>
      `(SELECT ${counted(metric as DashboardMetric)} FROM ${from} AND ${at} >= $1 AND ${at} <= $3) AS "${metric}_current",
       (SELECT ${counted(metric as DashboardMetric)} FROM ${from} AND ${at} >= $2 AND ${at} < $1) AS "${metric}_previous"`,
  ),
  `(SELECT count(*)::int FROM ${TEST_LETTERS.from} AND ${TEST_LETTERS.at} >= $1 AND ${TEST_LETTERS.at} <= $3) AS "testLetters"`,
].join(",\n");

const DAY_MS = 24 * 60 * 60 * 1000;

/** The window's count by campaign, as a map. */
async function byCampaign(metric: CampaignMetric, since: string, until: string): Promise<Record<string, number>> {
  const { from, at, column } = CAMPAIGN_SOURCES[metric];
  const rows = await query<{ campaign: string; count: number }>(
    `SELECT ${column} AS campaign, count(*)::int AS count FROM ${from} AND ${at} >= $1 AND ${at} <= $2
     GROUP BY ${column} ORDER BY ${column}`,
    [since, until],
  );
  // A signature is counted under the campaign that made its ask.
  const key = (value: string) => (metric === "mpsSigned" ? (campaignForAsk(value)?.slug ?? value) : value);
  return Object.fromEntries(rows.map((row) => [key(row.campaign), row.count]));
}

/** The window's letters by who they're from. */
async function byLetterKind(metric: LetterKindMetric, since: string, until: string): Promise<LetterKinds> {
  const { from, at } = SOURCES[metric];
  const rows = await query<{ kind: keyof LetterKinds; count: number }>(
    `SELECT l.kind, count(*)::int AS count FROM ${from} AND ${at} >= $1 AND ${at} <= $2 GROUP BY l.kind`,
    [since, until],
  );
  return { supporter: 0, pauseai: 0, ...Object.fromEntries(rows.map((row) => [row.kind, row.count])) };
}

/** SERIES_POINTS windows of `days` ending now, oldest first: how many fell in each. */
async function series(metric: SeriesMetric, until: Date, days: DashboardWindow): Promise<SeriesPoint[]> {
  const { from, at } = SOURCES[metric];
  const windowMs = days * DAY_MS;
  const start = new Date(until.getTime() - SERIES_POINTS * windowMs);
  // Bucket 0 is the current window, counting back.
  const rows = await query<{ bucket: number; count: number }>(
    `SELECT floor(extract(epoch FROM ($2::timestamptz - ${at})) / $3)::int AS bucket, ${counted(metric)} AS count
     FROM ${from} AND ${at} >= $1 AND ${at} <= $2 GROUP BY bucket`,
    [start.toISOString(), until.toISOString(), days * 24 * 60 * 60],
  );
  const counts = new Map(rows.map((row) => [row.bucket, row.count]));
  return Array.from({ length: SERIES_POINTS }, (_, i) => {
    const bucket = SERIES_POINTS - 1 - i;
    return { from: new Date(until.getTime() - (bucket + 1) * windowMs).toISOString(), count: counts.get(bucket) ?? 0 };
  });
}

/** SERIES_POINTS windows of `days` ending now, oldest first: the supporters first seen in each, once each, under their earliest source. */
async function supportersBySource(until: Date, days: DashboardWindow): Promise<SourcePoint[]> {
  const windowMs = days * DAY_MS;
  const start = new Date(until.getTime() - SERIES_POINTS * windowMs);
  const rows = await query<{ bucket: number; source: SupporterSource; count: number }>(
    `SELECT floor(extract(epoch FROM ($2::timestamptz - s.first_seen_at)) / $3)::int AS bucket, first.source,
            count(*)::int AS count
     FROM supporters s
     CROSS JOIN LATERAL (SELECT i.source FROM supporter_identity i WHERE i.supporter_id = s.id
                         ORDER BY i.seen_at, i.source LIMIT 1) first
     WHERE s.first_seen_at >= $1 AND s.first_seen_at <= $2 GROUP BY bucket, first.source`,
    [start.toISOString(), until.toISOString(), days * 24 * 60 * 60],
  );
  return Array.from({ length: SERIES_POINTS }, (_, i) => {
    const bucket = SERIES_POINTS - 1 - i;
    const those = rows.filter((row) => row.bucket === bucket);
    return {
      from: new Date(until.getTime() - (bucket + 1) * windowMs).toISOString(),
      count: those.reduce((sum, row) => sum + row.count, 0),
      sources: Object.fromEntries(those.map((row) => [row.source, row.count])),
    };
  });
}

/** Every politician sync still held for a decision, oldest first. */
async function heldSyncs(): Promise<DashboardAction[]> {
  const rows = await query<{ at: Date; added: number; removed: number; changed: number }>(
    `SELECT at, jsonb_array_length(result->'changes'->'added')::int AS added,
            jsonb_array_length(result->'changes'->'removed')::int AS removed,
            jsonb_array_length(result->'changes'->'changed')::int AS changed
     FROM import_runs WHERE job = 'sync-politicians' AND status = 'held' ORDER BY at, id`,
  );
  return rows.map(({ at, ...counts }) => ({ kind: "held-sync", at: at.toISOString(), ...counts }));
}

/** Every politician in office whose address is blocked, with the problem that blocked it, oldest first. */
async function blockedMps(): Promise<DashboardAction[]> {
  const rows = await query<{ politicianId: number; name: string; isTest: boolean; at: Date }>(
    `SELECT p.id::int AS "politicianId", p.name, coalesce(seat.is_test, false) AS "isTest", pr.at
     FROM notable_people p JOIN email_blocks b ON b.address = lower(p.email) JOIN email_problems pr ON pr.id = b.problem_id
     LEFT JOIN politicians seat ON seat.id = p.id
     WHERE p.status = 'in_office' ORDER BY pr.at, p.id`,
  );
  return rows.map(({ at, ...rest }) => ({ kind: "blocked-mp", at: at.toISOString(), ...rest }));
}

/** The politician who signed in the window, if only one did. */
async function signedMp(since: string, until: string): Promise<number | null> {
  const { from, at } = SOURCES.mpsSigned;
  const rows = await query<{ id: number }>(
    `SELECT DISTINCT p.id::int AS id FROM ${from} AND ${at} >= $1 AND ${at} <= $2 LIMIT 2`,
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
  const [
    [row],
    [letterCampaigns, signedCampaigns],
    [sentKinds, repliedKinds],
    [registrations],
    bySource,
    signer,
    held,
    blocked,
    imports,
  ] = await Promise.all([
    query<Record<string, number>>(`SELECT ${COUNTS}`, [since, before, until]),
    Promise.all(BY_CAMPAIGN.map((metric) => byCampaign(metric, since, until))),
    Promise.all(BY_LETTER_KIND.map((metric) => byLetterKind(metric, since, until))),
    Promise.all(WITH_SERIES.map((metric) => series(metric, at, days))),
    supportersBySource(at, days),
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
  // Mail in the letters inbox a read couldn't handle, which waits there for a person.
  const inbox: DashboardAction[] = imports.flatMap((run) =>
    run?.job === "read-gmail" && run.status !== "failed"
      ? run.result.accounts.flatMap((account) =>
          account.notUnderstood?.length
            ? [
                {
                  kind: "letters-inbox" as const,
                  inbox: account.account,
                  count: account.notUnderstood.length,
                  at: new Date(run.at).toISOString(),
                },
              ]
            : [],
        )
      : [],
  );
  return {
    days,
    asOf: until,
    since,
    counts,
    testLetters: row.testLetters,
    byCampaign: { lettersSent: letterCampaigns, mpsSigned: signedCampaigns },
    byLetterKind: { lettersSent: sentKinds, lettersReplied: repliedKinds },
    signedMp: signer,
    series: { eventRegistrations: registrations },
    supportersBySource: bySource,
    actions: [...held, ...blocked, ...failed, ...inbox],
  };
}
