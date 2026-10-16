import "server-only";
import type { MpSync, MpSyncResult } from "@/lib/import-runs";
import { changeCount, compareMps, MAX_UNCHECKED_CHANGES, type MpChanges, type SyncedMp } from "@/lib/mps";
import { TEST_MPS } from "@/lib/test-mps";
import { airtableToken, fetchMps } from "./airtable";
import { logChange } from "./audit";
import { query, transaction, type Queryable } from "./db";
import { keepingFailure, recordRun } from "./import-runs";

// Copies the sitting MPs from Airtable into the politicians table, nightly
// (app/api/cron/sync-mps) or when staff ask. A sync that would change more
// than MAX_UNCHECKED_CHANGES MPs is held for a person to check. Every run
// goes in the import log (import-runs.ts), as "sync-mps".

const JOB = "sync-mps";

export type SyncResult = { status: "applied" | "held" | "unchanged"; changes: MpChanges };

/** The MPs copied from Airtable who are still sitting, by constituency. */
export async function sittingMps(db?: Queryable): Promise<SyncedMp[]> {
  return query<SyncedMp>(
    `SELECT airtable_id AS "airtableId", name, salutation, constituency, party, email
     FROM politicians WHERE airtable_id IS NOT NULL AND sitting ORDER BY constituency`,
    [],
    db,
  );
}

/**
 * The test MPs, whose letters go to TEST_MP_EMAIL: kept in step with that
 * setting on every sync, except the one who has no email. Their statuses
 * are set only when they're added, so staff can change them.
 */
async function ensureTestMps(db?: Queryable): Promise<void> {
  const email = process.env.TEST_MP_EMAIL?.trim() || null;
  for (const mp of TEST_MPS) {
    const [{ id, added }] = await query<{ id: number; added: boolean }>(
      `INSERT INTO politicians (house, name, salutation, constituency, email, is_test, test_postcode)
       VALUES ('commons', $1, $2, $3, $4, true, $5)
       ON CONFLICT (test_postcode) DO UPDATE SET email = $4, updated_at = now()
       -- xmax is 0 on a row this statement inserted, not on one it updated.
       RETURNING id::int AS id, xmax = 0 AS added`,
      [mp.name, mp.salutation, mp.constituency, mp.noEmail ? null : email, mp.postcode],
      db,
    );
    if (!added) continue;
    for (const [campaign, status] of Object.entries(mp.statuses)) {
      await query(
        "INSERT INTO campaign_statuses (politician_id, campaign, status, updated_by) VALUES ($1, $2, $3, 'sync')",
        [id, campaign, status],
        db,
      );
    }
  }
}

/** Makes the table match `mps`: adds and updates them, and marks the rest as no longer sitting. */
async function applyMps(mps: SyncedMp[], db: Queryable): Promise<void> {
  for (const mp of mps) {
    await query(
      `INSERT INTO politicians (airtable_id, house, name, salutation, constituency, party, email)
       VALUES ($1, 'commons', $2, $3, $4, $5, $6)
       ON CONFLICT (airtable_id) DO UPDATE
       SET house = 'commons', name = $2, salutation = $3, constituency = $4, party = $5, email = $6, sitting = true, updated_at = now()`,
      [mp.airtableId, mp.name, mp.salutation, mp.constituency, mp.party, mp.email],
      db,
    );
  }
  await query(
    `UPDATE politicians SET sitting = false, updated_at = now()
     WHERE airtable_id IS NOT NULL AND sitting AND NOT (airtable_id = ANY($1::text[]))`,
    [mps.map((mp) => mp.airtableId)],
    db,
  );
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
        "sync",
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
