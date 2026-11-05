import "server-only";
import { logChange } from "./audit";
import { query, transaction } from "./db";
import { gmailAccess } from "./gmail-accounts";
import { lettersInbox } from "./letters-inbox";
import { deleteLetterReply } from "./outside-services/blobs";
import { trashGmailMessage } from "./outside-services/gmail";
import { deleteOneOffBlobs, eraseOneOffs, eraseRepliesToFormLetters } from "./one-off-emails";
import { eraseFromSavedFilters } from "./saved-filters";
import { refreshSupportersList } from "./supporter-facts";
import { problem } from "./problems";
import { staffCopy } from "@/lib/content/staff-interface";
import type { EraseLeftover } from "@/lib/staff-search";

// Erasing a supporter, when they ask to be forgotten: for each source,
// what that source holds about them goes. A form entry goes with its letter,
// the letter's events and the copies of replies forwarded to the sender; a
// letter from the letters inbox with its sender's proxy, its draft, every
// message kept both ways and their blobs, and its mail there goes to
// Trash; a Luma user goes with their registrations and contact, and their
// Luma ID is kept in
// luma_erased so the import never copies them back; a member's record goes
// the same way, its ID kept in members_erased; a message of a mailing
// sent to them loses its address and merge values; a one-off email with their
// address on it goes, with its blob, its IDs kept in one_off_erased so that
// reading its thread again doesn't keep it again, as does a reply on a form letter
// read from a staff mailbox; staff's notes on them go with their row; their
// details come out of saved filters. What stays is what
// exists to stop us mailing the address: email_problems, email_blocks and
// opt_outs. The audit log entry carries the supporter's ID and the
// request's reference, never a name or address. Luma's own copy is left
// for a person to deal with, as is Stichting PauseAI's of a member
// (docs/data-protection.md).

export type ErasureResult = {
  lumaUsers: number;
  formEntries: number;
  letters: number;
  members: number;
  /** Their proxies on the letters inbox, and the messages of their letters there, trashed. */
  proxies: number;
  messages: number;
  /** One-off emails with their address on, deleted. */
  oneOffs: number;
  /** What couldn't be cleared afterwards: the erasure itself is done. */
  notCleared: EraseLeftover[];
};

/** Erases supporter `id`, as `by`, under the request's `reference`. Undefined if there's no such supporter. */
export async function eraseSupporter(id: number, reference: string, by: string): Promise<ErasureResult | undefined> {
  return transaction(async (db) => {
    const [supporter] = await query("SELECT 1 FROM supporters WHERE id = $1 FOR UPDATE", [id], db);
    if (!supporter) return undefined;
    await eraseFromSavedFilters(id, by, db);
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
    const proxyIds = (
      await query<{ id: number }>(
        `SELECT DISTINCT proxy_id::int AS id FROM letters_from_supporters WHERE entry_id = ANY($1::bigint[]) AND proxy_id IS NOT NULL`,
        [entries],
        db,
      )
    ).map((row) => row.id);
    // The letters inbox's mail of their letters, every message both ways and what we sent, to trash after.
    const mail = await query<{ blobKey: string | null; gmailId: string }>(
      `SELECT r.blob_key AS "blobKey", r.gmail_message_id AS "gmailId" FROM letter_replies r
         JOIN letters_from_supporters s ON s.id = r.letter_id
       WHERE s.entry_id = ANY($1::bigint[]) AND s.proxy_id IS NOT NULL
       UNION ALL SELECT NULL, e.message_id FROM email_sends e JOIN letters_from_supporters s ON s.id = e.letter_id
       WHERE s.entry_id = ANY($1::bigint[]) AND s.proxy_id IS NOT NULL AND e.outcome = 'sent' AND e.backend = 'gmail'`,
      [entries],
      db,
    );
    // A letter's row stays, as a record it went to that MP, without what could say who wrote it.
    await query(
      `UPDATE email_sends SET from_address = NULL, subject = NULL
       WHERE letter_id IN (SELECT id FROM letters_from_supporters WHERE entry_id = ANY($1::bigint[]))`,
      [entries],
      db,
    );
    const oneOffs = await eraseOneOffs(id, db);
    const formLetterReplies = await eraseRepliesToFormLetters(entries, db);
    await query(
      `DELETE FROM email_sends WHERE purpose IN ('letter-copy', 'relay', 'supporter-notice')
       AND letter_id IN (SELECT id FROM letters_from_supporters WHERE entry_id = ANY($1::bigint[]))`,
      [entries],
      db,
    );
    const letters = await query<{ id: number }>(
      `DELETE FROM letters WHERE id IN (SELECT id FROM letters_from_supporters WHERE entry_id = ANY($1::bigint[])) RETURNING id::int AS id`,
      [entries],
      db,
    );
    await query("DELETE FROM form_entries WHERE id = ANY($1::bigint[])", [entries], db);
    // Their proxies: mail to one now is not understood.
    const proxies = await query("DELETE FROM proxies WHERE id = ANY($1::bigint[]) RETURNING id", [proxyIds], db);
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
    // A message they were sent keeps only that it was, not what was said after it.
    await query(
      "DELETE FROM message_replies WHERE message_id IN (SELECT id FROM messages_to_supporters WHERE supporter_id = $1)",
      [id],
      db,
    );
    await query(
      "UPDATE messages_to_supporters SET supporter_id = NULL, address = NULL, merge_values = NULL WHERE supporter_id = $1",
      [id],
      db,
    );
    await query("DELETE FROM supporters WHERE id = $1", [id], db);
    // Off the list now, not at the next import.
    await refreshSupportersList(db);
    const result: Omit<ErasureResult, "notCleared"> = {
      lumaUsers: lumaUsers.length,
      formEntries: entries.length,
      letters: letters.length,
      members: members.length,
      proxies: proxies.length,
      messages: mail.length,
      oneOffs: oneOffs.length,
    };
    await logChange(by, "erase supporter", { id, reference, ...result }, db);
    return { result, mail, blobs: [...oneOffs, ...formLetterReplies] };
  }).then(async (erased) => {
    if (!erased) return undefined;
    const notCleared = [
      ...(await leftOver("mail", () => clearMail(erased.mail))),
      ...(await leftOver("oneOffs", () => deleteOneOffBlobs(erased.blobs))),
    ];
    return { ...erased.result, notCleared };
  });
}

/**
 * Does a clean-up after an erasure. A failure is reported, not thrown, and
 * named for whoever erased: the erasure itself is done.
 */
async function leftOver(what: EraseLeftover, clear: () => Promise<void>): Promise<EraseLeftover[]> {
  try {
    await clear();
    return [];
  } catch (error) {
    problem(`${staffCopy.erase.partly} ${staffCopy.erase.notCleared[what]}`, error);
    return [what];
  }
}

/**
 * Deletes the kept messages of erased letters from Netlify Blobs, and
 * moves them and what we sent in the letters inbox to Trash, which Gmail
 * empties after 30 days.
 */
async function clearMail(mail: { blobKey: string | null; gmailId: string }[]): Promise<void> {
  if (!mail.length) return;
  for (const { blobKey } of mail) if (blobKey) await deleteLetterReply(blobKey);
  const token = await gmailAccess(lettersInbox()!);
  for (const { gmailId } of mail) await trashGmailMessage(token, gmailId);
}
