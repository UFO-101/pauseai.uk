import "server-only";
import { GO_TO_PARLIAMENT_ASK, type AskStatus } from "@/lib/asks";
import type { GoToParliamentImportResult } from "@/lib/import-runs";
import { logChange } from "./audit";
import { query, transaction } from "./db";
import { keepingFailure, recordRun } from "./import-runs";
import { airtableToken, fetchGoToParliamentMeetings } from "./outside-services/airtable";
import { AIRTABLE } from "./politician-sync";

// Copies, once, the meetings arranged for Go to Parliament (20 October
// 2026) from Airtable: each MP a constituent was booked to meet gets a
// status on GO_TO_PARLIAMENT_ASK, owned by Airtable, from the guest's "MP
// Meeting Status". Nothing about the constituent is read. A status staff
// have set is left alone. Each run is in the import log, as
// "import-go-to-parliament"; running it again changes only what Airtable
// has changed.

const JOB = "import-go-to-parliament";

/**
 * "MP Meeting Status", as statuses, firmest first: when an MP has two
 * guests, the firmer answer wins, and a firm one, yes or no, beats a
 * tentative one.
 */
const MEETING_STATUSES: [string, AskStatus][] = [
  ["Secured", "going"],
  ["Meeting with staff", "meeting_staff"],
  ["Declined but surgery appointment", "declined_surgery"],
  ["Declined", "declined"],
  ["Tentative yes", "tentative"],
  ["Tentative meeting with staff", "tentative_staff"],
];

/** Sets each MP's status from their guests' meetings. A status it doesn't know is refused. */
export function importGoToParliament(startedBy: string): Promise<GoToParliamentImportResult> {
  return keepingFailure(JOB, startedBy, async () => {
    const meetings = await fetchGoToParliamentMeetings(airtableToken());
    const rank = new Map(MEETING_STATUSES.map(([name], i) => [name, i]));
    const best = new Map<string, number>();
    for (const meeting of meetings) {
      const i = rank.get(meeting.status);
      if (i === undefined) throw new Error(`Unknown MP Meeting Status "${meeting.status}"`);
      for (const mp of meeting.politicians) best.set(mp, Math.min(best.get(mp) ?? i, i));
    }
    return transaction(async (db) => {
      const result: GoToParliamentImportResult = {
        guests: meetings.length,
        mps: best.size,
        added: 0,
        changed: 0,
        notFound: 0,
      };
      for (const [airtableId, i] of best) {
        const status = MEETING_STATUSES[i][1];
        const [person] = await query<{ id: number }>(
          "SELECT id::int AS id FROM notable_people WHERE airtable_id = $1",
          [airtableId],
          db,
        );
        if (!person) {
          result.notFound++;
          continue;
        }
        const [set] = await query<{ added: boolean }>(
          `INSERT INTO ask_statuses (notable_person_id, ask, ask_kind, status, updated_by)
           VALUES ($1, $2, 'event', $3, $4)
           ON CONFLICT (notable_person_id, ask) DO UPDATE SET status = $3, updated_at = now()
           WHERE ask_statuses.updated_by = $4 AND ask_statuses.status <> $3
           -- xmax is 0 on a row this statement inserted, not on one it updated.
           RETURNING xmax = 0 AS added`,
          [person.id, GO_TO_PARLIAMENT_ASK, status, AIRTABLE],
          db,
        );
        if (!set) continue;
        result[set.added ? "added" : "changed"]++;
        await logChange(
          AIRTABLE,
          "set status",
          { politicianId: person.id, ask: GO_TO_PARLIAMENT_ASK, status, date: null, note: "" },
          db,
        );
      }
      await logChange(startedBy, "import Go to Parliament", { added: result.added, changed: result.changed }, db);
      await recordRun(JOB, startedBy, "ok", result, db);
      return result;
    });
  });
}
