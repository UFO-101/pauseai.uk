import "server-only";
import type { MpSync, MpSyncResult } from "@/lib/import-runs";
import { changeCount, compareMps, MAX_UNCHECKED_CHANGES, type MpChanges, type SyncedMp } from "@/lib/mps";
import { TEST_MPS } from "@/lib/test-mps";
import { airtableToken, fetchMps } from "./outside-services/airtable";
import { logChange } from "./audit";
import { query, transaction, type Queryable } from "./db";
import { keepingFailure, recordRun } from "./import-runs";
import { addPolitician } from "./politicians";
import { changedFields } from "@/lib/field-changes";

// Copies the sitting MPs from Airtable into the politicians table, nightly
// (app/api/cron/sync-mps) or when staff ask. A sync that would change more
// than MAX_UNCHECKED_CHANGES MPs is held for a person to check. Every run
// goes in the import log (import-runs.ts), as "sync-mps".

const JOB = "sync-mps";
/** The audit log's actor for what the sync does by itself. */
const SYNC = "sync";

export type SyncResult = { status: "applied" | "held" | "unchanged"; changes: MpChanges };

/** The MPs copied from Airtable who are still in office, by constituency. */
export async function sittingMps(db?: Queryable): Promise<SyncedMp[]> {
  return query<SyncedMp>(
    `SELECT n.airtable_id AS "airtableId", n.name, n.salutation, p.constituency, p.party, n.email
     FROM notable_people n JOIN politicians p ON p.id = n.id
     WHERE n.airtable_id IS NOT NULL AND n.status = 'in_office' ORDER BY p.constituency`,
    [],
    db,
  );
}

/**
 * The test MPs, whose letters go to TEST_MP_EMAIL: kept in step with that
 * setting on every sync, except the one who has no email and the one with
 * an address of their own. Their statuses
 * are set only when they're added, so staff can change them.
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

/**
 * Makes the table match `mps`: adds and updates them, and marks the rest as
 * no longer sitting. Each politician added, changed or marked gets their
 * own entry in the audit log, by their row's id, so their page can tell it
 * (lib/server/politicians.ts, politicianHistory).
 */
async function applyMps(mps: SyncedMp[], db: Queryable): Promise<void> {
  const before = await sittingMps(db);
  const changes = compareMps(before, mps);
  const was = new Map(before.map((mp) => [mp.airtableId, mp]));
  for (const mp of mps) {
    const [existing] = await query<{ id: number }>(
      `UPDATE notable_people SET name = $2, salutation = $3, email = $4, status = 'in_office', updated_at = now()
       WHERE airtable_id = $1 RETURNING id::int AS id`,
      [mp.airtableId, mp.name, mp.salutation, mp.email],
      db,
    );
    if (existing) {
      await query(
        "UPDATE politicians SET house = 'commons', constituency = $2, party = $3 WHERE id = $1",
        [existing.id, mp.constituency, mp.party],
        db,
      );
    }
    const id = existing?.id ?? (await addPolitician({ ...mp, house: "commons" }, db));
    const { airtableId, ...details } = mp;
    if (changes.added.some((added) => added.airtableId === airtableId)) {
      await logChange(SYNC, "add politician", { id, airtableId, house: "commons", ...details }, db);
    } else if (changes.changed.some((changed) => changed.airtableId === airtableId)) {
      // What changed, each field before and after, and their name to know them by.
      const changed = changedFields(was.get(airtableId)!, mp);
      await logChange(SYNC, "edit politician", { id, airtableId, name: mp.name, changed }, db);
    }
  }
  const gone = await query<{ id: number; name: string }>(
    `UPDATE notable_people SET status = 'left_office', updated_at = now()
     WHERE airtable_id IS NOT NULL AND status = 'in_office' AND NOT (airtable_id = ANY($1::text[]))
     RETURNING id::int AS id, name`,
    [mps.map((mp) => mp.airtableId)],
    db,
  );
  for (const mp of gone) await logChange(SYNC, "remove politician", mp, db);
}

/**
 * Fetches the MPs from Airtable and applies them, or holds them if too much
 * has changed, keeping the run either way. `startedBy` is NIGHTLY or the
 * staff member's email.
 */
export function syncMps(startedBy: string): Promise<SyncResult> {
  return keepingFailure(JOB, startedBy, async () => {
    const fetched = await fetchMps(airtableToken());
    return transaction(async (db) => {
      await ensureTestMps(db);
      const before = await sittingMps(db);
      const changes = compareMps(before, fetched);
      const count = changeCount(changes);
      if (count === 0) {
        await recordRun(JOB, startedBy, "unchanged", { changes }, db);
        return { status: "unchanged", changes };
      }
      // The very first sync fills an empty table, so there's nothing to check it against.
      const status = count > MAX_UNCHECKED_CHANGES && before.length > 0 ? "held" : "applied";
      if (status === "applied") await applyMps(fetched, db);
      const result: MpSyncResult = status === "held" ? { changes, mps: fetched } : { changes };
      await recordRun(JOB, startedBy, status, result, db);
      await logChange(
        SYNC,
        status === "held" ? "hold MP sync" : "apply MP sync",
        { added: changes.added.length, removed: changes.removed.length, changed: changes.changed.length },
        db,
      );
      return { status, changes };
    });
  });
}

/** What the import page shows: the newest sync, and any held one still waiting for a decision. */
export async function syncsToShow(): Promise<MpSync[]> {
  return query<MpSync>(
    `SELECT id::int AS id, at, job, started_by AS "startedBy", status, error, result, decided_by AS "decidedBy"
     FROM import_runs WHERE job = $1
       AND (status = 'held' OR id = (SELECT id FROM import_runs WHERE job = $1 ORDER BY at DESC, id DESC LIMIT 1))
     ORDER BY at DESC, id DESC`,
    [JOB],
  );
}

/** Applies or discards a held sync. False if there's no held sync with that ID. */
export async function decideHeldSync(id: number, decision: "apply" | "discard", staff: string): Promise<boolean> {
  return transaction(async (db) => {
    const [held] = await query<{ mps: SyncedMp[] }>(
      "SELECT result->'mps' AS mps FROM import_runs WHERE id = $1 AND job = $2 AND status = 'held' FOR UPDATE",
      [id, JOB],
      db,
    );
    if (!held) return false;
    if (decision === "apply") await applyMps(held.mps, db);
    await query(
      "UPDATE import_runs SET status = $2, decided_by = $3, decided_at = now() WHERE id = $1",
      [id, decision === "apply" ? "applied" : "discarded", staff],
      db,
    );
    await logChange(staff, `${decision} held MP sync`, { id }, db);
    return true;
  });
}
