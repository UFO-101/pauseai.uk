import "server-only";
import { gunzipSync } from "node:zlib";
import { checkMailingDoc, letterFor, type MailingRecipientValues } from "@/lib/mailing-doc";
import { docFromMarkup, type LetterDoc } from "@/lib/letter-format";
import { firstOfType, decodeWords, parseMime, wholeTextOf } from "@/lib/email-parsing/mime";
import { letterText, replyParts } from "@/lib/email-parsing/reply-text";
import { isMachineReply } from "@/lib/email-parsing/subjects";
import { query } from "./db";
import { letterReply } from "./outside-services/blobs";

// The thread of one of PauseAI's letters, for staff, below what its page
// says of it (letters.ts): the letter as it went, rebuilt from its
// mailing's letter and the values it was sent with, then each later message
// in the thread read from Gmail (letter_replies), the politician's replies
// and our answers, oldest first.

/** A later message in a letter's thread, with its text. */
export type ThreadMessage = {
  id: number;
  at: string;
  fromName: string;
  fromAddress: string;
  /** Our answer, rather than their reply. */
  fromUs: boolean;
  /** For a supporter's letter, the supporter's own message through their MP's proxy, rather than the office's. */
  fromSupporter: boolean;
  /** An automatic reply, such as an office's acknowledgement or an out-of-office, as reading it noted. */
  auto: boolean;
  subject: string;
  /** Its plain text, or its HTML's text, without the mail it quotes or its footer; null if the kept message can't be read. */
  text: string | null;
  /** The mail it quotes and its footer, folded under its text; empty if none or the kept message can't be read. */
  quoted: string;
  /** Who it was copied to, as its Cc said; null if nobody, or the kept message can't be read. */
  cc: string | null;
};

export type LetterThread = {
  mailingTitle: string;
  subject: string;
  /** Whom it went to, and when. */
  to: { name: string; email: string | null };
  sentAt: string | null;
  /** The letter as it went; null for one imported, whose text we don't have. */
  letter: LetterDoc | null;
  /** The letter's text is rebuilt from replies quoting others like it, not what they received. */
  approximate: boolean;
  /** The account it went from and the name it was from, and its Gmail thread if Gmail sent it. */
  sentFrom: string | null;
  fromName: string | null;
  gmailThreadId: string | null;
  messages: ThreadMessage[];
};

/**
 * A kept message's text and, apart, the mail it quotes and its footer: from
 * its plain text if it has one, else its HTML's; its text null if it has
 * neither. Whom it was copied to, as its Cc said, or null. And whether a
 * machine sent it, by its headers and subject. Null, empty and false if it's
 * gone.
 */
export async function messageContent(
  blobKey: string,
): Promise<{ text: string | null; quoted: string; cc: string | null; auto: boolean }> {
  const gzipped = await letterReply(blobKey);
  if (!gzipped) return { text: null, quoted: "", cc: null, auto: false };
  const message = parseMime(gunzipSync(gzipped).toString("latin1"));
  const cc = message.headers.get("cc");
  const whole = firstOfType(message, "text/plain") || firstOfType(message, "text/html") ? wholeTextOf(message) : null;
  const parts = whole === null ? { text: null, quoted: "" } : replyParts(whole);
  const auto = isMachineReply((name) => message.headers.get(name), decodeWords(message.headers.get("subject") ?? ""));
  return { ...parts, cc: cc ? decodeWords(cc) : null, auto };
}

/** One of a mailing's letters and its thread; undefined if the mailing has no such letter. */
export async function letterThread(mailingId: number, letterId: number): Promise<LetterThread | undefined> {
  const [row] = await query<
    Omit<LetterThread, "letter" | "messages"> & {
      body: unknown;
      mergeValues: MailingRecipientValues | null;
      ownText: string | null;
    }
  >(
    `SELECT m.title AS "mailingTitle", m.subject, json_build_object('name', n.name, 'email', n.email) AS "to",
       l.sent_at AS "sentAt", coalesce(m.body, m.imported_text) AS body, p.merge_values AS "mergeValues", p.own_text AS "ownText",
       m.imported_text_approximate AS approximate,
       m.sent_from AS "sentFrom",
       -- With no name of its own, it went in the Gmail's, as that was when it last connected.
       coalesce(nullif(m.from_name, ''), (SELECT a.gmail_name FROM staff_accounts a WHERE a.email = m.sent_from)) AS "fromName",
       (SELECT s.gmail_thread_id FROM email_sends s WHERE s.letter_id = l.id AND s.outcome = 'sent'
        ORDER BY s.id DESC LIMIT 1) AS "gmailThreadId"
     FROM letters_from_pauseai p JOIN letters l USING (id) JOIN mailings m ON m.id = p.mailing_id
       JOIN notable_people n ON n.id = l.notable_person_id
     WHERE p.mailing_id = $1 AND l.id = $2`,
    [mailingId, letterId],
  );
  if (!row) return undefined;
  const { body: stored, mergeValues, ownText, ...thread } = row;
  const body = checkMailingDoc(stored);
  return {
    ...thread,
    letter: ownText ? docFromMarkup(letterText(ownText)) : body && mergeValues ? letterFor(body, mergeValues) : null,
    messages: await threadMessages(letterId),
  };
}

/** Each message kept in a letter's thread, oldest first, with its text. */
export async function threadMessages(letterId: number): Promise<ThreadMessage[]> {
  const replies = await query<Omit<ThreadMessage, "text" | "cc"> & { blobKey: string }>(
    `SELECT id::int AS id, at, from_name AS "fromName", from_address AS "fromAddress", from_us AS "fromUs",
       from_supporter AS "fromSupporter", subject, blob_key AS "blobKey",
       EXISTS (SELECT 1 FROM letter_events e WHERE e.letter_id = r.letter_id AND e.status = 'auto_reply'
         AND e.details->>'gmailMessageId' = r.gmail_message_id) AS auto
     FROM letter_replies r WHERE letter_id = $1 ORDER BY at, id`,
    [letterId],
  );
  return Promise.all(
    replies.map(async ({ blobKey, ...reply }) => {
      const { text, quoted, cc } = await messageContent(blobKey);
      return { ...reply, text, quoted, cc };
    }),
  );
}

/** The kept messages after `after`, by ID, as many as `limit`, for the backup: each one's ID and key. */
export async function repliesAfter(after: number, limit = 100): Promise<{ id: number; key: string }[]> {
  return query<{ id: number; key: string }>(
    `SELECT id::int AS id, blob_key AS key FROM letter_replies WHERE id > $1 ORDER BY id LIMIT $2`,
    [after, limit],
  );
}

/** A kept message, gzipped, by its row's ID; undefined if there's no such row or message. */
export async function replyFile(id: number): Promise<Buffer | undefined> {
  const [row] = await query<{ key: string }>("SELECT blob_key AS key FROM letter_replies WHERE id = $1", [id]);
  return row && letterReply(row.key);
}
