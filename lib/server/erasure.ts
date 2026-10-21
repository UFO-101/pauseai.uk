import "server-only";
import { logChange } from "./audit";
import { query, transaction } from "./db";
import { removeCalendarContact } from "./outside-services/luma-calendar";

// Erasing a supporter, when they ask to be forgotten: for each source,
// what that source holds about them goes. A letter goes with its events
// and the copies of replies forwarded to the sender; a Luma user goes with
// their registrations and contact, and their Luma ID is kept in
// luma_erased so the import never copies them back. What stays is what
// exists to stop us mailing the address: email_problems, email_blocks and
// opt_outs. The audit log entry carries the supporter's ID and the
// request's reference, never a name or address. Luma is asked to remove
// the contact too; if it can't be, the entry says so, with the user IDs.

export type ErasureResult = {
  lumaUsers: number;
  letters: number;
  /** Luma users Luma didn't remove from the calendar's contacts, to be done by hand. */
  lumaFailed: string[];
};

/** Erases supporter `id`, as `by`, under the request's `reference`. Undefined if there's no such supporter. */
export async function eraseSupporter(id: number, reference: string, by: string): Promise<ErasureResult | undefined> {
  const [supporter] = await query("SELECT 1 FROM supporters WHERE id = $1", [id]);
  if (!supporter) return undefined;
  const lumaUsers = (
    await query<{ userId: string }>(
      `SELECT luma_user_id AS "userId" FROM supporter_links WHERE supporter_id = $1 AND luma_user_id IS NOT NULL`,
      [id],
    )
  ).map((row) => row.userId);
  // Luma first, so a failure there is known before anything is deleted here.
  const lumaFailed: string[] = [];
  for (const userId of lumaUsers) {
    try {
      await removeCalendarContact(userId);
    } catch {
      lumaFailed.push(userId);
    }
  }
  return transaction(async (db) => {
    const letters = await query<{ id: number }>(
      `DELETE FROM letters WHERE id IN (SELECT letter_id FROM supporter_links WHERE supporter_id = $1) RETURNING id::int AS id`,
      [id],
      db,
    );
    await query(
      `DELETE FROM email_sends WHERE purpose = 'forwarded-reply' AND letter_id IS NULL
       AND address IN (SELECT lower(matched_value) FROM supporter_links WHERE supporter_id = $1)`,
      [id],
      db,
    );
    await query("INSERT INTO luma_erased (user_id) SELECT unnest($1::text[]) ON CONFLICT DO NOTHING", [lumaUsers], db);
    await query("DELETE FROM luma_people WHERE user_id = ANY($1::text[])", [lumaUsers], db);
    await query("DELETE FROM supporters WHERE id = $1", [id], db);
    const result: ErasureResult = { lumaUsers: lumaUsers.length, letters: letters.length, lumaFailed };
    await logChange(by, "erase supporter", { id, reference, ...result }, db);
    return result;
  });
}
