import "server-only";
import { changedFields } from "@/lib/field-changes";
import type { PoliticianSyncResult, StatusCounts } from "@/lib/import-runs";
import type { AirtableMp } from "@/lib/mp-check";
import {
  changeCount,
  comparePoliticians,
  MAX_UNCHECKED_CHANGES,
  renamedIn,
  type PoliticianChanges,
  type PoliticianRecord,
  type Renamed,
  type SyncedPolitician,
} from "@/lib/politician-sync";
import { TEST_MPS } from "@/lib/test-mps";
import { AIRTABLE_ASKS, airtableToken, fetchPoliticians } from "./outside-services/airtable";
import { logChange } from "./audit";
import { query, transaction, type Queryable } from "./db";
import { keepingFailure, recordRun } from "./import-runs";
import { addPolitician } from "./politicians";

// Copies every politician from Airtable's UK Parliamentarians into the
// database, nightly (app/api/cron/sync-politicians) or when staff ask, keyed
// by the record's ID, with their answers to the asks Airtable records. A
// sync that would change more than MAX_UNCHECKED_CHANGES politicians, or
// any one's name, is held for a person to check; the statuses are set
// either way, for those already here. Every run goes in the import log
// (import-runs.ts), as "sync-politicians".

const JOB = "sync-politicians";
/** The audit log's actor for the politicians the sync adds, changes and loses. */
const SYNC = "sync";
/** The audit log's actor, and `updated_by`, for the statuses the sync sets, which it alone changes. */
export const AIRTABLE = "airtable";

export type SyncResult = {
  status: "applied" | "held" | "unchanged";
  changes: PoliticianChanges;
  renamed: Renamed[];
  statuses: StatusCounts;
};

const SYNCED_COLUMNS = `n.airtable_id AS "airtableId", n.name, n.forename, n.surname, n.salutation, n.email, n.status,
  p.house, p.constituency, p.party, p.country, p.city, n.notes, n.important_target AS "importantTarget",
  n.personal_connection AS "personalConnection"`;

/** The politicians copied from Airtable whose records it still has, as the sync compares them. */
async function syncedPoliticians(db: Queryable): Promise<SyncedPolitician[]> {
  return query<SyncedPolitician>(
    `SELECT ${SYNCED_COLUMNS} FROM notable_people n JOIN politicians p ON p.id = n.id
     WHERE n.airtable_id IS NOT NULL AND n.airtable_removed_at IS NULL ORDER BY n.airtable_id`,
    [],
    db,
  );
}

/** The records Airtable no longer had. */
async function goneRecords(db: Queryable): Promise<Set<string>> {
  const rows = await query<{ airtableId: string }>(
    `SELECT airtable_id AS "airtableId" FROM notable_people WHERE airtable_removed_at IS NOT NULL`,
    [],
    db,
  );
  return new Set(rows.map((row) => row.airtableId));
}

/** The MPs in office copied from Airtable, by constituency, for the check against Parliament. */
export async function mpsInOffice(): Promise<AirtableMp[]> {
  return query<AirtableMp>(
    `SELECT n.name, p.constituency, n.email FROM notable_people n JOIN politicians p ON p.id = n.id
     WHERE n.airtable_id IS NOT NULL AND n.airtable_removed_at IS NULL AND n.status = 'in_office'
       AND p.house = 'commons' AND p.constituency IS NOT NULL
     ORDER BY p.constituency`,
  );
}

/**
 * The test MPs, whose letters go to TEST_MP_EMAIL: kept in step with that
 * setting on every sync, except the one who has no email and the one with
 * an address of their own. Their statuses are set only when they're added,
 * so staff can change them.
 */
async function ensureTestMps(db: Queryable): Promise<void> {
  const email = process.env.TEST_MP_EMAIL?.trim() || null;
  for (const mp of TEST_MPS) {
    const address = mp.noEmail ? null : (mp.email ?? email);
    const [existing] = await query<{ id: number }>(
      `UPDATE notable_people SET email = $2, updated_at = now()
       WHERE id = (SELECT id FROM politicians WHERE test_postcode = $1) RETURNING id::int AS id`,
      [mp.postcode, address],
      db,
    );
    if (existing) continue;
    const id = await addPolitician(
      { house: "commons", name: mp.name, salutation: mp.salutation, constituency: mp.constituency, email: address },
      db,
      mp.postcode,
    );
    for (const [ask, status] of Object.entries(mp.statuses)) {
      await query(
        `INSERT INTO ask_statuses (notable_person_id, ask, ask_kind, status, updated_by)
         SELECT $1, slug, kind, $3, 'sync' FROM asks WHERE slug = $2`,
        [id, ask, status],
        db,
      );
    }
  }
}

/** Writes one politician's details over their rows, and marks their record as in Airtable. */
async function writePolitician(id: number, p: SyncedPolitician, db: Queryable): Promise<void> {
  await query(
    `UPDATE notable_people SET airtable_id = $2, name = $3, forename = $4, surname = $5, salutation = $6, email = $7,
       status = $8, notes = $9, important_target = $10, personal_connection = $11, airtable_removed_at = NULL,
       updated_at = now()
     WHERE id = $1`,
    [
      id,
      p.airtableId,
      p.name,
      p.forename,
      p.surname,
      p.salutation,
      p.email,
      p.status,
      p.notes,
      p.importantTarget,
      p.personalConnection,
    ],
    db,
  );
  await query(
    "UPDATE politicians SET house = $2, constituency = $3, party = $4, country = $5, city = $6 WHERE id = $1",
    [id, p.house, p.constituency, p.party, p.country, p.city],
    db,
  );
}

/**
 * Makes the tables match `politicians`: adds and updates them, and marks
 * those whose records have gone, keeping their status. One added who was
 * here before Airtable, added by hand under the same name, is taken to be
 * them. Each politician added, changed or gone gets their own entry in the
 * audit log, by their row's id, so their page can tell it
 * (lib/server/politicians.ts, politicianHistory).
 */
async function applyPoliticians(politicians: SyncedPolitician[], db: Queryable): Promise<void> {
  const before = await syncedPoliticians(db);
  const changes = comparePoliticians(before, politicians, await goneRecords(db));
  const was = new Map(before.map((p) => [p.airtableId, p]));
  const added = new Set(changes.added.map((p) => p.airtableId));
  for (const p of [...changes.added, ...changes.changed]) {
    const [row] = await query<{ id: number }>(
      `SELECT n.id::int AS id FROM notable_people n JOIN politicians p ON p.id = n.id
       WHERE n.airtable_id = $1
          OR ($3 AND n.airtable_id IS NULL AND NOT p.is_test AND n.name = $2)
       ORDER BY n.airtable_id NULLS LAST LIMIT 1`,
      [p.airtableId, p.name, added.has(p.airtableId)],
      db,
    );
    const id = row?.id ?? (await addPolitician({ house: p.house, name: p.name, email: p.email }, db));
    await writePolitician(id, p, db);
    const { airtableId, ...details } = p;
    if (added.has(airtableId)) {
      await logChange(SYNC, "add politician", { id, airtableId, ...details }, db);
    } else {
      // What changed, each field before and after, and their name to know them by.
      const changed = changedFields(was.get(airtableId) ?? {}, p);
      await logChange(SYNC, "edit politician", { id, airtableId, name: p.name, changed }, db);
    }
  }
  const gone = await query<{ id: number; name: string }>(
    `UPDATE notable_people SET airtable_removed_at = now(), updated_at = now()
     WHERE airtable_id = ANY($1::text[]) RETURNING id::int AS id, name`,
    [changes.removed.map((p) => p.airtableId)],
    db,
  );
  for (const p of gone) await logChange(SYNC, "remove politician", p, db);
}

/**
 * Makes Airtable's statuses match its records, for the politicians here:
 * sets those it records, changes those it set, and takes away those it set
 * that it no longer records, for the asks the records answer
 * (AIRTABLE_ASKS). A status set by anyone else, staff or another import, is
 * left alone. Each change is logged against the politician.
 */
async function applyStatuses(records: PoliticianRecord[], db: Queryable): Promise<StatusCounts> {
  const wanted = records.flatMap(({ politician, statuses }) =>
    Object.entries(statuses).map(([ask, status]) => ({ airtableId: politician.airtableId, ask, status })),
  );
  await query(
    `CREATE TEMP TABLE airtable_statuses ON COMMIT DROP AS
     SELECT n.id AS person, w.ask, a.kind, w.status
     FROM json_to_recordset($1::json) AS w ("airtableId" text, ask text, status text)
       JOIN notable_people n ON n.airtable_id = w."airtableId" JOIN asks a ON a.slug = w.ask`,
    [JSON.stringify(wanted)],
    db,
  );
  const added = await query<{ politicianId: number; ask: string; status: string }>(
    `INSERT INTO ask_statuses (notable_person_id, ask, ask_kind, status, updated_by)
     SELECT person, ask, kind, status, $1 FROM airtable_statuses
     ON CONFLICT (notable_person_id, ask) DO NOTHING
     RETURNING notable_person_id::int AS "politicianId", ask, status`,
    [AIRTABLE],
    db,
  );
  const changed = await query<{ politicianId: number; ask: string; status: string }>(
    `UPDATE ask_statuses s SET status = w.status, updated_at = now()
     FROM airtable_statuses w
     WHERE s.notable_person_id = w.person AND s.ask = w.ask AND s.updated_by = $1 AND s.status <> w.status
     RETURNING s.notable_person_id::int AS "politicianId", s.ask, s.status`,
    [AIRTABLE],
    db,
  );
  const removed = await query<{ politicianId: number; ask: string }>(
    `DELETE FROM ask_statuses s WHERE s.updated_by = $1 AND s.ask = ANY($2::text[])
       AND NOT EXISTS (SELECT 1 FROM airtable_statuses w WHERE w.person = s.notable_person_id AND w.ask = s.ask)
     RETURNING s.notable_person_id::int AS "politicianId", s.ask`,
    [AIRTABLE, AIRTABLE_ASKS],
    db,
  );
  await query("DROP TABLE airtable_statuses", [], db);
  for (const { politicianId, ask, status } of [...added, ...changed]) {
    await logChange(AIRTABLE, "set status", { politicianId, ask, status, date: null, note: "" }, db);
  }
  for (const { politicianId, ask } of removed) {
    await logChange(AIRTABLE, "set status", { politicianId, ask, status: null, date: null, note: "" }, db);
  }
  return { added: added.length, changed: changed.length, removed: removed.length };
}

/**
 * Fetches the politicians from Airtable and applies them, or holds them if
 * too much has changed or a name has, keeping the run either way; then sets
 * Airtable's statuses for those here. `startedBy` is NIGHTLY or the staff
 * member's email.
 */
export function syncPoliticians(startedBy: string): Promise<SyncResult> {
  return keepingFailure(JOB, startedBy, async () => {
    const records = await fetchPoliticians(airtableToken());
    const fetched = records.map((record) => record.politician);
    return transaction(async (db) => {
      await ensureTestMps(db);
      const before = await syncedPoliticians(db);
      const changes = comparePoliticians(before, fetched, await goneRecords(db));
      const renamed = renamedIn(before, changes);
      const count = changeCount(changes);
      // The very first sync fills an empty table, so there's nothing to check it against.
      const held = (count > MAX_UNCHECKED_CHANGES && before.length > 0) || renamed.length > 0;
      if (count > 0 && !held) await applyPoliticians(fetched, db);
      const statuses = await applyStatuses(records, db);
      const changedStatuses = statuses.added + statuses.changed + statuses.removed;
      const status = held ? "held" : count + changedStatuses > 0 ? "applied" : "unchanged";
      const result: PoliticianSyncResult = { changes, renamed, statuses, ...(held ? { records } : {}) };
      await recordRun(JOB, startedBy, status, result, db);
      if (count > 0) {
        await logChange(
          SYNC,
          held ? "hold politician sync" : "apply politician sync",
          { added: changes.added.length, removed: changes.removed.length, changed: changes.changed.length },
          db,
        );
      }
      return { status, changes, renamed, statuses };
    });
  });
}

/** Applies or discards a held sync, with its statuses. False if there's no held sync with that ID. */
export async function decideHeldSync(id: number, decision: "apply" | "discard", staff: string): Promise<boolean> {
  return transaction(async (db) => {
    const [held] = await query<{ records: PoliticianRecord[] }>(
      "SELECT result->'records' AS records FROM import_runs WHERE id = $1 AND job = $2 AND status = 'held' FOR UPDATE",
      [id, JOB],
      db,
    );
    if (!held) return false;
    if (decision === "apply") {
      await applyPoliticians(
        held.records.map((record) => record.politician),
        db,
      );
      await applyStatuses(held.records, db);
    }
    await query(
      "UPDATE import_runs SET status = $2, decided_by = $3, decided_at = now() WHERE id = $1",
      [id, decision === "apply" ? "applied" : "discarded", staff],
      db,
    );
    await logChange(staff, `${decision} held politician sync`, { id }, db);
    return true;
  });
}
