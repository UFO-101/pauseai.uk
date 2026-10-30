import "server-only";
import { gunzipSync } from "node:zlib";
import { checkMailingDoc, letterFor, type MailingRecipientValues } from "@/lib/mailing-doc";
import type { LetterDoc } from "@/lib/letter-format";
import { replyText } from "@/lib/reply-text";
import { query } from "./db";
import { firstOfType, parseMime, partText } from "./mime";
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
  subject: string;
  /** Its plain text, or its HTML's text, without the mail it quotes; null if the kept message can't be read. */
  text: string | null;
};

export type LetterThread = {
  mailingTitle: string;
  subject: string;
  /** Whom it went to, and when. */
  to: { name: string; email: string | null };
  sentAt: string | null;
  /** The letter as it went; null for one imported, whose text we don't have. */
  letter: LetterDoc | null;
  /** The account it went from and the name it was from, and its Gmail thread if Gmail sent it. */
  sentFrom: string | null;
  fromName: string | null;
  gmailThreadId: string | null;
  messages: ThreadMessage[];
};

/** Some HTML's text: its tags gone, its breaks kept. */
function tagsGone(html: string): string {
  return html
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/** An HTML part's text, what's in a blockquote marked with "> " as plain text quotes it. */
function htmlText(html: string): string {
  let depth = 0;
  return html
    .replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .split(/(<\/?blockquote\b[^>]*>)/i)
    .map((part) => {
      if (/^<blockquote/i.test(part)) {
        depth++;
        return "\n";
      }
      if (/^<\/blockquote/i.test(part)) {
        depth--;
        return "\n";
      }
      const text = tagsGone(part);
      return depth > 0 ? text.replace(/^/gm, "> ") : text;
    })
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** A kept message's text, without the mail it quotes: its plain text if it has one, else its HTML's; null if it's gone or has neither. */
export async function messageText(blobKey: string): Promise<string | null> {
  const gzipped = await letterReply(blobKey);
  if (!gzipped) return null;
  const message = parseMime(gunzipSync(gzipped).toString("latin1"));
  const plain = firstOfType(message, "text/plain");
  if (plain) return replyText(partText(plain).replace(/\r\n/g, "\n").trim());
  const html = firstOfType(message, "text/html");
  return html ? replyText(htmlText(partText(html))) : null;
}

/** One of a mailing's letters and its thread; undefined if the mailing has no such letter. */
export async function letterThread(mailingId: number, letterId: number): Promise<LetterThread | undefined> {
  const [row] = await query<
    Omit<LetterThread, "letter" | "messages"> & {
      body: unknown;
      mergeValues: MailingRecipientValues | null;
    }
  >(
    `SELECT m.title AS "mailingTitle", m.subject, json_build_object('name', n.name, 'email', n.email) AS "to",
       l.sent_at AS "sentAt", m.body, p.merge_values AS "mergeValues",
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
  const replies = await query<Omit<ThreadMessage, "text"> & { blobKey: string }>(
    `SELECT id::int AS id, at, from_name AS "fromName", from_address AS "fromAddress", from_us AS "fromUs", subject,
       blob_key AS "blobKey"
     FROM letter_replies WHERE letter_id = $1 ORDER BY at, id`,
    [letterId],
  );
  const { body: stored, mergeValues, ...thread } = row;
  const body = checkMailingDoc(stored);
  return {
    ...thread,
    letter: body && mergeValues ? letterFor(body, mergeValues) : null,
    messages: await Promise.all(
      replies.map(async ({ blobKey, ...reply }) => ({ ...reply, text: await messageText(blobKey) })),
    ),
  };
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
