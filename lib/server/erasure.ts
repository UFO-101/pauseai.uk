import "server-only";
import { logChange } from "./audit";
import { query, transaction } from "./db";

// Erasing a supporter, when they ask to be forgotten: for each source,
// what that source holds about them goes. A form entry goes with its letter,
// the letter's events and the copies of replies forwarded to the sender; a
// Luma user goes with
// their registrations and contact, and their Luma ID is kept in
// luma_erased so the import never copies them back; a member's record goes
// the same way, its ID kept in members_erased. What stays is what
// exists to stop us mailing the address: email_problems, email_blocks and
// opt_outs. The audit log entry carries the supporter's ID and the
// request's reference, never a name or address. Luma's own copy is left
// for a person to deal with, as is Stichting PauseAI's of a member
// (docs/data-protection.md).

export type ErasureResult = { lumaUsers: number; formEntries: number; letters: number; members: number };

/** Erases supporter `id`, as `by`, under the request's `reference`. Undefined if there's no such supporter. */
export async function eraseSupporter(id: number, reference: string, by: string): Promise<ErasureResult | undefined> {
  return transaction(async (db) => {
    const [supporter] = await query("SELECT 1 FROM supporters WHERE id = $1 FOR UPDATE", [id], db);
    if (!supporter) return undefined;
    const lumaUsers = (
      await query<{ userId: string }>(
        `SELECT luma_user_id AS "userId" FROM supporter_links WHERE supporter_id = $1 AND luma_user_id IS NOT NULL`,
        [id],
        db,
      )
    ).map((row) => row.userId);
    const members = (
      await query<{ id: string }>(
        "SELECT member_id AS id FROM supporter_links WHERE supporter_id = $1 AND member_id IS NOT NULL",
        [id],
        db,
      )
    ).map((row) => row.id);
    const entries = (
      await query<{ id: number }>(
        "SELECT form_entry_id::int AS id FROM supporter_links WHERE supporter_id = $1 AND form_entry_id IS NOT NULL",
        [id],
        db,
      )
    ).map((row) => row.id);
    const letters = await query<{ id: number }>(
      `DELETE FROM letters WHERE id IN (SELECT id FROM supporter_letters WHERE entry_id = ANY($1::bigint[])) RETURNING id::int AS id`,
      [entries],
      db,
    );
    await query("DELETE FROM form_entries WHERE id = ANY($1::bigint[])", [entries], db);
    await query(
      `DELETE FROM email_sends WHERE purpose = 'forwarded-reply' AND letter_id IS NULL
       AND address IN (SELECT lower(matched_value) FROM supporter_links WHERE supporter_id = $1)`,
      [id],
      db,
    );
    await query("INSERT INTO luma_erased (user_id) SELECT unnest($1::text[]) ON CONFLICT DO NOTHING", [lumaUsers], db);
    await query("DELETE FROM luma_people WHERE user_id = ANY($1::text[])", [lumaUsers], db);
    await query("INSERT INTO members_erased (id) SELECT unnest($1::text[]) ON CONFLICT DO NOTHING", [members], db);
    await query("DELETE FROM members WHERE id = ANY($1::text[])", [members], db);
    await query("DELETE FROM supporters WHERE id = $1", [id], db);
    const result: ErasureResult = {
      lumaUsers: lumaUsers.length,
      formEntries: entries.length,
      letters: letters.length,
      members: members.length,
    };
    await logChange(by, "erase supporter", { id, reference, ...result }, db);
    return result;
  });
}
