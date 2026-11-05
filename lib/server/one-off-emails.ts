import "server-only";
import { gzipSync } from "node:zlib";
import { addressesIn, realSender } from "@/lib/old-letters";
import {
  isPauseaiAddress,
  isRecognisedMail,
  isSomeoneElse,
  politiciansIn,
  quotedAddresses,
  type OneOffFilter,
  type PoliticianBook,
} from "@/lib/one-off";
import { staffCopy } from "@/lib/content/staff-interface";
import { now } from "@/lib/now";
import type { Permission } from "@/lib/staff-permissions";
import { query, type Queryable } from "./db";
import { messageContent, wholeTextOf } from "./letter-threads";
import { decodeWords, fromAddress, messageIds, parseMime } from "./mime";
import { notifyStaff, staffLink } from "./notifications";
import { deleteLetterReply, saveLetterReply } from "./outside-services/blobs";
import { gmailMessageHeaders, gmailRawMessage, unlessGone, type GmailMessageHeaders } from "./outside-services/gmail";
import { connectedAccounts, politicianBook } from "./politician-book";

// One-off emails: threads with a politician that aren't a letter of a campaign
// or mailing, read from a mailbox and kept whole, in Netlify Blobs with a row
// in one_off_messages. A message is kept once by its Message-ID, and threaded
// across mailboxes by the IDs it answers, as each has its own Gmail threads.
// docs/domain-concepts.md says what counts, and who sees what.

/** The headers that say who a message is from and to, and what it answers. */
export const ONE_OFF_HEADERS = [
  "From",
  "To",
  "Cc",
  "Reply-To",
  "X-Original-From",
  "Subject",
  "Message-ID",
  "In-Reply-To",
  "References",
  "List-Id",
  "Auto-Submitted",
  "X-Autoreply",
  "X-Autorespond",
  "Precedence",
];

/** Everyone on a message by its headers, lowercased, its real sender first. */
export function addressesOn(headers: Map<string, string>): string[] {
  const sender = realSender(headers.get("from") ?? "", headers.get("x-original-from"), headers.get("reply-to"));
  const lines = [sender, headers.get("from"), headers.get("reply-to"), headers.get("to"), headers.get("cc")];
  return [...new Set(addressesIn(decodeWords(lines.filter(Boolean).join(" "))))];
}

/** Who a message is from, the real sender where the group rewrote it. */
export function senderOf(headers: Map<string, string>): { address: string; name: string } {
  return fromAddress(realSender(headers.get("from") ?? "", headers.get("x-original-from"), headers.get("reply-to")));
}

/** Whether a message is in the group's mail, which is shared. */
export function isGroupMail(headers: Map<string, string>): boolean {
  return /policy(-archive)?\.pauseai\.uk/i.test(headers.get("list-id") ?? "");
}

/**
 * Keeps a message of a thread with a politician, once, in the thread it
 * answers, or that its Gmail thread is in, or a new one. Threads a message
 * joins together become one. Gives what it kept, or nothing if it's kept.
 */
export async function keepOneOff(
  account: string,
  message: GmailMessageHeaders,
  raw: Buffer,
  book: PoliticianBook,
  connected: readonly string[],
  extraPeople: number[] = [],
): Promise<number | undefined> {
  const rfc = messageIds(message.headers.get("message-id"))[0] ?? null;
  const [kept] = await query(
    "SELECT 1 FROM one_off_messages WHERE (account = $1 AND gmail_message_id = $2) OR rfc_message_id = $3",
    [account, message.id, rfc],
  );
  if (kept) return undefined;
  const refs = [...messageIds(message.headers.get("in-reply-to")), ...messageIds(message.headers.get("references"))];
  const addresses = addressesOn(message.headers);
  const from = senderOf(message.headers);
  const at = new Date(Number(message.internalDate));
  const subject = decodeWords(message.headers.get("subject") ?? "");
  const key = `one-off/${account}/${message.id}.eml.gz`;
  await saveLetterReply(key, gzipSync(raw));
  const threads = await query<{ id: number }>(
    `SELECT DISTINCT thread_id::int AS id FROM one_off_messages
     WHERE (account = $1 AND gmail_thread_id = $2) OR rfc_message_id = ANY($3::text[]) OR ($4::text = ANY(in_reply_to))
     ORDER BY id`,
    [account, message.threadId, refs, rfc],
  );
  const [first, ...others] = threads.map((thread) => thread.id);
  const threadId = first ?? (await newThread(subject, at));
  for (const other of others) await mergeThreads(threadId, other);
  await query(
    `INSERT INTO one_off_messages (thread_id, account, gmail_message_id, gmail_thread_id, rfc_message_id, in_reply_to,
       from_address, from_name, to_line, cc_line, addresses, subject, at, from_us, blob_key, size)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
    [
      threadId,
      account,
      message.id,
      message.threadId,
      rfc,
      refs,
      from.address,
      from.name,
      decodeWords(message.headers.get("to") ?? ""),
      decodeWords(message.headers.get("cc") ?? ""),
      addresses,
      subject,
      at,
      isPauseaiAddress(from.address, connected),
      key,
      raw.length,
    ],
  );
  const { people } = politiciansIn(book, addresses);
  await query(
    `INSERT INTO one_off_thread_people (thread_id, notable_person_id) SELECT $1, unnest($2::bigint[]) ON CONFLICT DO NOTHING`,
    [threadId, [...new Set([...people, ...extraPeople])]],
  );
  await query(
    `UPDATE one_off_threads SET latest_at = greatest(latest_at, $2), someone_else = someone_else OR $3 WHERE id = $1`,
    [threadId, at, isSomeoneElse(book, from.address, connected)],
  );
  return threadId;
}

async function newThread(subject: string, at: Date): Promise<number> {
  const [{ id }] = await query<{ id: number }>(
    "INSERT INTO one_off_threads (subject, latest_at) VALUES ($1, $2) RETURNING id::int AS id",
    [subject, at],
  );
  return id;
}

/** Moves a thread's messages and people to another, and deletes it. */
async function mergeThreads(into: number, other: number): Promise<void> {
  await query("UPDATE one_off_messages SET thread_id = $1 WHERE thread_id = $2", [into, other]);
  await query(
    `INSERT INTO one_off_thread_people (thread_id, notable_person_id)
     SELECT $1, notable_person_id FROM one_off_thread_people WHERE thread_id = $2 ON CONFLICT DO NOTHING`,
    [into, other],
  );
  await query(
    `UPDATE one_off_threads t SET latest_at = greatest(t.latest_at, o.latest_at), someone_else = t.someone_else OR o.someone_else
     FROM one_off_threads o WHERE t.id = $1 AND o.id = $2`,
    [into, other],
  );
  await query("DELETE FROM one_off_threads WHERE id = $1", [other]);
}

/**
 * What the site's regular read does with a message in a keeping account that
 * isn't a letter's: keeps it if its headers count, or if it's shared mail
 * (policy@, or the group's), the addresses it quotes do; or it joins a thread
 * already kept. Other shared mail is noted, to report by its Gmail ID once.
 * The rest of a mailbox like Joseph's is left unread. `shared` is whether
 * the whole account is shared.
 */
export async function keepIfPoliticianThread(
  account: string,
  token: string,
  message: GmailMessageHeaders,
  shared: boolean,
): Promise<"kept" | "unmatched" | "ignored"> {
  const { id } = message;
  const [book, connected] = await Promise.all([politicianBook(), connectedAccounts()]);
  const refs = [...messageIds(message.headers.get("in-reply-to")), ...messageIds(message.headers.get("references"))];
  const [inThread] = await query(
    `SELECT 1 FROM one_off_messages WHERE (account = $1 AND gmail_thread_id = $2) OR rfc_message_id = ANY($3::text[]) LIMIT 1`,
    [account, message.threadId, refs],
  );
  const addresses = addressesOn(message.headers);
  const keep = async (raw: Buffer, people: number[] = []) => {
    await keepOneOff(account, message, raw, book, connected, people);
    return "kept" as const;
  };
  if (inThread || politiciansIn(book, addresses).counts) return keep(await gmailRawMessage(token, id));
  const sharedMail = shared || isGroupMail(message.headers);
  if (!sharedMail) return "ignored";
  const from = senderOf(message.headers).address;
  if (isRecognisedMail(from, message.labelIds) || connected.includes(from)) return "ignored";
  const raw = await gmailRawMessage(token, id);
  const quoted = politiciansIn(book, quotedAddresses(wholeTextOf(parseMime(raw.toString("latin1")))));
  if (quoted.counts) return keep(raw, quoted.people);
  await query("INSERT INTO unmatched_mail (account, gmail_message_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [
    account,
    id,
  ]);
  return "unmatched";
}

/** A day between reports. */
const REPORT_EVERY_MS = 24 * 60 * 60_000;

/**
 * Emails the notification inbox the new mail that matched nothing, by sender
 * and subject, read again from Gmail as only its ID is kept: at most once a
 * day. `token` gives the access token of an account. Says how many it listed.
 */
export async function reportUnmatchedMail(token: (account: string) => Promise<string>): Promise<number> {
  const [last] = await query<{ at: Date | null }>("SELECT max(reported_at) AS at FROM unmatched_mail");
  if (last.at && now().getTime() - new Date(last.at).getTime() < REPORT_EVERY_MS) return 0;
  const waiting = await query<{ account: string; id: string }>(
    `SELECT account, gmail_message_id AS id FROM unmatched_mail WHERE reported_at IS NULL ORDER BY found_at`,
  );
  if (!waiting.length) return 0;
  const lines: string[] = [];
  for (const { account, id } of waiting) {
    const message = await gmailMessageHeaders(await token(account), id, ["From", "Subject"]).catch(unlessGone);
    if (message)
      lines.push(
        `- ${decodeWords(message.headers.get("from") ?? "")}: ${decodeWords(message.headers.get("subject") ?? "")}`,
      );
  }
  await query("UPDATE unmatched_mail SET reported_at = now() WHERE reported_at IS NULL");
  if (!lines.length) return 0;
  const words = staffCopy.oneOff.unmatchedAlert;
  await notifyStaff(
    words.subject(lines.length),
    words.body(lines, staffLink("/staff/mailings/one-off", undefined)),
    null,
    "staff-report",
  );
  return lines.length;
}

/** A row of the one-off emails' list. `hidden` for staff who can't see a thread with someone else in it: no name or subject reaches them. */
export type OneOffThreadRow = {
  id: number;
  subject: string | null;
  someoneElse: boolean;
  latestAt: string;
  messages: number;
  people: { id: number; name: string }[];
  /** The first sender who isn't a politician or PauseAI's, or else its first sender; null when hidden. */
  from: string | null;
};

const PAGE_SIZE = 100;

const PEOPLE = `coalesce((SELECT json_agg(json_build_object('id', n.id, 'name', n.name) ORDER BY n.name)
    FROM one_off_thread_people tp JOIN notable_people n ON n.id = tp.notable_person_id WHERE tp.thread_id = t.id), '[]')`;

/** One-off threads, newest first, matching `where`: with permission, everything; otherwise, a thread with someone else in it shows only that it's there. */
async function threadRows(where: string, params: unknown[], supporters: boolean, limit: number, offset: number) {
  const visible = (column: string) => (supporters ? column : `CASE WHEN t.someone_else THEN NULL ELSE ${column} END`);
  return query<OneOffThreadRow>(
    `SELECT t.id::int AS id, ${visible("t.subject")} AS subject, t.someone_else AS "someoneElse", t.latest_at AS "latestAt",
       (SELECT count(*)::int FROM one_off_messages m WHERE m.thread_id = t.id) AS messages, ${PEOPLE} AS people,
       ${visible(`(SELECT coalesce(nullif(m.from_name, ''), m.from_address) FROM one_off_messages m WHERE m.thread_id = t.id ORDER BY m.at, m.id LIMIT 1)`)} AS "from"
     FROM one_off_threads t WHERE ${where} ORDER BY t.latest_at DESC, t.id DESC LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
}

/** A page of the one-off emails. */
export async function listOneOffThreads(
  permissions: readonly Permission[],
  { filter, page = 1 }: { filter?: OneOffFilter; page?: number } = {},
): Promise<{ threads: OneOffThreadRow[]; total: number; pages: number; page: number; pageSize: number }> {
  const where = filter === "pauseai" ? "NOT t.someone_else" : filter === "someone-else" ? "t.someone_else" : "true";
  const supporters = permissions.includes("supporters");
  const [threads, [{ total }]] = await Promise.all([
    threadRows(where, [], supporters, PAGE_SIZE, (page - 1) * PAGE_SIZE),
    query<{ total: number }>(`SELECT count(*)::int AS total FROM one_off_threads t WHERE ${where}`),
  ]);
  return { threads, total, page, pageSize: PAGE_SIZE, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** A politician's one-off emails, newest first. */
export function politicianOneOffs(
  politicianId: number,
  permissions: readonly Permission[],
): Promise<OneOffThreadRow[]> {
  return threadRows(
    "EXISTS (SELECT 1 FROM one_off_thread_people p WHERE p.thread_id = t.id AND p.notable_person_id = $1)",
    [politicianId],
    permissions.includes("supporters"),
    200,
    0,
  );
}

/** A supporter's one-off emails, newest first: those with an address of theirs on them. */
export function supporterOneOffs(supporterId: number): Promise<OneOffThreadRow[]> {
  return threadRows(
    `EXISTS (SELECT 1 FROM one_off_messages m JOIN supporter_links k ON k.matched_value = ANY(m.addresses)
      WHERE m.thread_id = t.id AND k.supporter_id = $1)`,
    [supporterId],
    true,
    200,
    0,
  );
}

/** A message of a thread, as its page shows it. */
export type OneOffMessage = {
  id: number;
  at: string;
  fromName: string;
  fromAddress: string;
  to: string;
  cc: string;
  subject: string;
  account: string;
  text: string | null;
};

/** A one-off thread, for its page: `messages` null for staff who can't see it. */
export type OneOffThread = OneOffThreadRow & { messages_: OneOffMessage[] | null };

/** One thread for its page, or undefined: staff without `supporters` see none of a thread with someone else in it but that it's there. */
export async function getOneOffThread(
  id: number,
  permissions: readonly Permission[],
): Promise<OneOffThread | undefined> {
  const supporters = permissions.includes("supporters");
  const [row] = await threadRows("t.id = $1", [id], supporters, 1, 0);
  if (!row) return undefined;
  if (row.someoneElse && !supporters) return { ...row, messages_: null };
  const rows = await query<Omit<OneOffMessage, "text"> & { blobKey: string }>(
    `SELECT id::int AS id, at, from_name AS "fromName", from_address AS "fromAddress", to_line AS "to", cc_line AS cc,
       subject, account, blob_key AS "blobKey"
     FROM one_off_messages WHERE thread_id = $1 ORDER BY at, id`,
    [id],
  );
  const messages = await Promise.all(
    rows.map(async ({ blobKey, ...message }) => ({ ...message, text: (await messageContent(blobKey)).text })),
  );
  return { ...row, messages_: messages };
}

/** How many threads there are, for the mailings list's row. */
export async function oneOffCount(): Promise<number> {
  const [{ total }] = await query<{ total: number }>("SELECT count(*)::int AS total FROM one_off_threads");
  return total;
}

/**
 * Deletes every one-off message with a supporter's address on it, for their
 * erasure, and any thread left empty. Gives the blobs to delete after.
 */
export async function eraseOneOffs(supporterId: number, db: Queryable): Promise<string[]> {
  const gone = await query<{ blobKey: string; threadId: number }>(
    `DELETE FROM one_off_messages m USING supporter_links k
     WHERE k.supporter_id = $1 AND k.matched_value = ANY(m.addresses)
     RETURNING m.blob_key AS "blobKey", m.thread_id::int AS "threadId"`,
    [supporterId],
    db,
  );
  await query(
    `DELETE FROM one_off_threads t WHERE t.id = ANY($1::bigint[])
       AND NOT EXISTS (SELECT 1 FROM one_off_messages m WHERE m.thread_id = t.id)`,
    [gone.map((row) => row.threadId)],
    db,
  );
  return gone.map((row) => row.blobKey);
}

/** Deletes kept messages' blobs. */
export async function deleteOneOffBlobs(keys: string[]): Promise<void> {
  for (const key of keys) await deleteLetterReply(key);
}
