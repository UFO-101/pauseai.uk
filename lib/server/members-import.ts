import "server-only";
import type { MembersImportResult } from "@/lib/import-runs";
import { KEEP_INFORMED_FREE_FROM } from "@/lib/members";
import { query, transaction, type Queryable } from "./db";
import { keepingFailure, recordRun } from "./import-runs";
import { airtableToken, fetchMembers, type MemberToImport } from "./outside-services/airtable";
import { refreshSupporterFacts } from "./supporter-facts";
import { linkSupporters } from "./supporters";

// Copies PauseAI's UK members whom we may hold into `members`: hourly
// (app/api/cron/import-members) or when staff ask, each run in the import
// log as "import-members". Every run reads every one of them, so a run is
// whole and the next corrects anything the last missed. An upsert touches a
// row only when a value differs; a member no longer read is marked
// removed, and kept, with their links, until they're erased.
//
// "Keep me informed" left unticked, when ticking it was a free choice, is
// an opt-out from the members' updates (opt_outs, "pauseai-updates"). The
// import never lifts an opt-out another source recorded.

const JOB = "import-members";

/** Upserts the members, but none erased; returns how many were added and how many changed. */
async function upsertMembers(members: MemberToImport[], db: Queryable): Promise<{ added: number; changed: number }> {
  const rows = await query<{ added: boolean }>(
    `INSERT INTO members (id, email, name, phone, city, postcode, joined_at, created_at, keep_informed,
       share_permission, source_page, intent, source_modified_at)
     SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::timestamptz[],
       $8::timestamptz[], $9::boolean[], $10::boolean[], $11::text[], $12::text[], $13::timestamptz[])
       AS m(id, email, name, phone, city, postcode, joined_at, created_at, keep_informed, share_permission, source_page, intent, source_modified_at)
     WHERE m.id NOT IN (SELECT id FROM members_erased)
     ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name, phone = EXCLUDED.phone,
       city = EXCLUDED.city, postcode = EXCLUDED.postcode, joined_at = EXCLUDED.joined_at,
       created_at = EXCLUDED.created_at, keep_informed = EXCLUDED.keep_informed,
       share_permission = EXCLUDED.share_permission, source_page = EXCLUDED.source_page, intent = EXCLUDED.intent,
       source_modified_at = EXCLUDED.source_modified_at, removed_at = NULL, changed_at = now()
     WHERE (members.email, members.name, members.phone, members.city, members.postcode, members.joined_at,
         members.created_at, members.keep_informed, members.share_permission, members.source_page, members.intent,
         members.source_modified_at, members.removed_at)
       IS DISTINCT FROM (EXCLUDED.email, EXCLUDED.name, EXCLUDED.phone, EXCLUDED.city, EXCLUDED.postcode,
         EXCLUDED.joined_at, EXCLUDED.created_at, EXCLUDED.keep_informed, EXCLUDED.share_permission,
         EXCLUDED.source_page, EXCLUDED.intent, EXCLUDED.source_modified_at, NULL)
     RETURNING xmax = 0 AS added`,
    [
      members.map((m) => m.id),
      members.map((m) => m.email),
      members.map((m) => m.name),
      members.map((m) => m.phone),
      members.map((m) => m.city),
      members.map((m) => m.postcode),
      members.map((m) => m.joinedAt),
      members.map((m) => m.createdAt),
      members.map((m) => m.keepInformed),
      members.map((m) => m.sharePermission),
      members.map((m) => m.sourcePage),
      members.map((m) => m.intent),
      members.map((m) => m.modifiedAt),
    ],
    db,
  );
  const added = rows.filter((row) => row.added).length;
  return { added, changed: rows.length - added };
}

/** Marks removed every member not read this run; returns how many. */
async function markRemoved(ids: string[], db: Queryable): Promise<number> {
  const rows = await query(
    `UPDATE members SET removed_at = now(), changed_at = now()
     WHERE removed_at IS NULL AND NOT (id = ANY($1::text[])) RETURNING id`,
    [ids],
    db,
  );
  return rows.length;
}

/**
 * An opt-out from the members' updates for each member who left "Keep me
 * informed" unticked when it was a free choice, dated when they joined,
 * unless a later record of theirs ticked it freely or their address is
 * opted out already (opt_outs_open: of two such records, the earlier
 * wins). Keyed by the record, so a record's opt-out is recorded once, even
 * after it's lifted.
 */
async function recordOptOuts(db: Queryable): Promise<number> {
  const rows = await query(
    `INSERT INTO opt_outs (address, list, source, source_ref, unsubscribed_at)
     SELECT m.email, 'pauseai-updates', 'airtable-import', m.id, m.created_at FROM members m
     WHERE m.removed_at IS NULL AND NOT m.keep_informed AND m.created_at >= $1
       AND NOT EXISTS (
         SELECT 1 FROM members later
         WHERE later.email = m.email AND later.removed_at IS NULL AND later.keep_informed
           AND later.created_at > m.created_at
       )
     ORDER BY m.email, m.created_at
     ON CONFLICT DO NOTHING RETURNING id`,
    [KEEP_INFORMED_FREE_FROM],
    db,
  );
  return rows.length;
}

/**
 * Lifts the import's own opt-outs where the same address has since ticked
 * "Keep me informed" freely: on the same record, when it was last changed,
 * or on a record made after the opt-out, a re-join, when that was made.
 */
async function liftOptOuts(db: Queryable): Promise<number> {
  const rows = await query(
    `UPDATE opt_outs o SET resubscribed_at = r.at
     FROM (
       SELECT o.id, min(CASE WHEN m.id = o.source_ref THEN m.source_modified_at ELSE m.created_at END) AS at
       FROM opt_outs o JOIN members m ON m.email = o.address
       WHERE o.list = 'pauseai-updates' AND o.source = 'airtable-import' AND o.resubscribed_at IS NULL
         AND m.removed_at IS NULL AND m.keep_informed AND m.created_at >= $1
         AND (m.id = o.source_ref OR m.created_at > o.unsubscribed_at)
       GROUP BY o.id
     ) r
     WHERE o.id = r.id RETURNING o.id`,
    [KEEP_INFORMED_FREE_FROM],
    db,
  );
  return rows.length;
}

/** Runs the import, keeping the run. A failure, of Airtable's or the database's, rolls the run back. */
export function importMembers(startedBy: string): Promise<MembersImportResult> {
  return keepingFailure(JOB, startedBy, async () => {
    const members = await fetchMembers(airtableToken());
    return transaction(async (db) => {
      const { added, changed } = await upsertMembers(members, db);
      const result: MembersImportResult = {
        members: members.length,
        added,
        changed,
        removed: await markRemoved(
          members.map((m) => m.id),
          db,
        ),
        optedOut: await recordOptOuts(db),
        resubscribed: await liftOptOuts(db),
        ...(await linkSupporters(db)),
      };
      // A record already linked may have changed, so everyone's facts, not only the newly linked.
      await refreshSupporterFacts(db);
      const anything = added + changed + result.removed + result.optedOut + result.resubscribed + result.linked;
      await recordRun(JOB, startedBy, anything > 0 ? "ok" : "unchanged", result, db);
      return result;
    });
  });
}
