import "server-only";
import { docFromMarkup, toText } from "@/lib/letter-format";
import type { OldLettersImportResult } from "@/lib/import-runs";
import { ownWords } from "@/lib/letter-changes";
import {
  augustColleagues,
  augustTemplate,
  fitTemplate,
  formDraft,
  formVersionAt,
  isAcknowledgement,
  isReplySubject,
  joinSent,
  joinWindow,
  mailingOfLetter,
  mailingOfNewLetter,
  OLD_MAILINGS,
  placeReply,
  templateDoc,
  templateOf,
  type ReplyCandidate,
} from "@/lib/old-letters";
import {
  PARLIAMENT_DOMAINS,
  isPauseaiAddress,
  politiciansIn,
  quotedAddresses,
  type PoliticianBook,
} from "@/lib/one-off";
import { staffCopy } from "@/lib/content/staff-interface";
import { query } from "./db";
import { gmailAccess } from "./gmail-accounts";
import { keepReply, noteAutoReply } from "./gmail-reading";
import { keepingFailure, recordRun } from "./import-runs";
import { wholeTextOf } from "./letter-threads";
import { decodeWords, firstOfType, messageIds, parseMime } from "./mime";
import { addressesOn, keepOneOff, ONE_OFF_HEADERS, senderOf } from "./one-off-emails";
import { airtableToken, fetchWebFormLetters } from "./outside-services/airtable";
import {
  gmailFullMessage,
  gmailMessageHeaders,
  gmailRawMessage,
  gmailThreadMessageIds,
  GmailError,
  searchAllGmail,
  unlessGone,
  type GmailMessageHeaders,
} from "./outside-services/gmail";
import { connectedAccounts, politicianBook } from "./politician-book";
import { isMachineReply } from "./postmark-webhooks";
import { htmlAsText } from "./old-letters-text";

// The one-off import of the letters written before the site could send them
// (import-old-letters): each press starts a background function, which calls
// importOldLettersChunk again and again, as the site's own functions last only
// seconds, for up to 15 minutes. Its place is kept in old_letters_mail, so
// pressing it again takes up what's left and skips what's kept. Its order:
// make the mailings, copy the form letters' text, read each sent email and
// join it, read the replies, keep the one-off emails, then the templates and
// replied_at. A dry run has rows of its own in old_letters_mail, and writes
// nothing else. Gmail's limit is shared with the site, so it reads at most two
// a second, and stops the moment Gmail refuses.

const JOB = "import-old-letters";

/** The mailboxes it reads. */
const JOSEPH = "joseph@pauseai.uk";
const POLICY = "policy@pauseai.uk";

/** The gap between Gmail requests: at most 2 a second. */
const PACE_MS = 500;

/** How long one call of the site works, well inside what a function is given. */
const CHUNK_MS = 20_000;

/** The group's mail, as Gmail lists it. */
const GROUP_SEARCH = "list:policy@pauseai.uk OR list:policy-archive@pauseai.uk";

/** How many addresses a Gmail search names at once. */
const ADDRESSES_A_SEARCH = 30;

/** The whole of a run's reading: its place within listing, and what it found. */
export type ChunkOptions = {
  startedBy: string;
  dryRun: boolean;
  /** The run it continues, once its first call has made it. */
  runId?: number;
  /** For tests, how long to wait between Gmail requests, and to work for. */
  paceMs?: number;
  chunkMs?: number;
};

/** What one call did: its run, and whether there's more to do. */
export type ChunkResult = { runId: number; more: boolean; result: OldLettersImportResult };

/** Why reading stopped short. */
class ChunkOver extends Error {}

/** A fresh run's account of itself. */
function emptyResult(dryRun: boolean): OldLettersImportResult {
  return {
    dryRun,
    finished: false,
    listed: 0,
    read: 0,
    left: 0,
    requests: 0,
    formTexts: 0,
    postmarkTexts: 0,
    joined: {},
    added: {},
    notJoined: {},
    replies: 0,
    autoReplies: 0,
    oneOffs: 0,
    unreadable: [],
    unmatched: [],
    templates: 0,
    ownText: 0,
    repliedSet: 0,
  };
}

type Reader = {
  /** Waits its turn, and stops the chunk once its time is up. */
  turn(): Promise<void>;
  book: PoliticianBook;
  connected: string[];
  tokens: Map<string, string>;
  dryRun: boolean;
  result: OldLettersImportResult;
};

/** Waits for each Gmail request's turn, and stops the call when its time is up. */
function pacer(paceMs: number, until: number, result: OldLettersImportResult) {
  let next = 0;
  return async () => {
    const at = Date.now();
    if (at >= until) throw new ChunkOver();
    if (next > at) await new Promise((resolve) => setTimeout(resolve, next - at));
    next = Math.max(at, next) + paceMs;
    result.requests++;
  };
}

/** The searches for mail to or from politicians' addresses: their domains, then the addresses on no such domain, a few at a time. */
export function politicianSearches(book: PoliticianBook, side: "sent" | "received"): string[] {
  const words = (addresses: string[]) =>
    side === "sent"
      ? `in:sent {${addresses.map((a) => `to:${a} cc:${a}`).join(" ")}}`
      : `-in:sent {${addresses.map((a) => `from:${a}`).join(" ")}}`;
  const domains = [...PARLIAMENT_DOMAINS, ...book.domains.keys()];
  const others = [...book.addresses.keys()].filter(
    (address) => !domains.some((d) => address.endsWith(`.${d}`) || address.endsWith(`@${d}`)),
  );
  const searches = [words(domains)];
  for (let i = 0; i < others.length; i += ADDRESSES_A_SEARCH)
    searches.push(words(others.slice(i, i + ADDRESSES_A_SEARCH)));
  return searches;
}

/** The whole list of what it reads, in order: where listing got to is an index into this. */
function everySearch(book: PoliticianBook): { account: string; source: string; q: string }[] {
  return [
    ...politicianSearches(book, "sent").map((q) => ({ account: JOSEPH, source: "sent", q })),
    ...politicianSearches(book, "received").map((q) => ({ account: JOSEPH, source: "received", q })),
    { account: JOSEPH, source: "group", q: GROUP_SEARCH },
    { account: POLICY, source: "policy", q: "" },
  ];
}

/** Lists what's left to list; each message listed once. */
async function list(reader: Reader, searchesDone: { n: number }): Promise<void> {
  const searches = everySearch(reader.book);
  while (searchesDone.n < searches.length) {
    const { account, source, q } = searches[searchesDone.n];
    const found = await searchAllGmail(reader.tokens.get(account)!, q, reader.turn);
    await query(
      `INSERT INTO old_letters_mail (dry_run, account, gmail_message_id, gmail_thread_id, source)
       SELECT $1, $2, id, thread, $3 FROM unnest($4::text[], $5::text[]) AS m (id, thread)
       ON CONFLICT DO NOTHING`,
      [reader.dryRun, account, source, found.map((m) => m.id), found.map((m) => m.threadId)],
    );
    reader.result.listed += found.length;
    searchesDone.n++;
  }
}

/** Makes the mailings it fills, once: those there already are found by their tick box, DeepMind's by its dates. */
async function makeMailings(): Promise<void> {
  const titles = staffCopy.oldLetters.mailingTitles;
  await query(
    `UPDATE mailings SET old_letters_key = 'deepmind-others', title = $1
     WHERE old_letters_key IS NULL AND ask = 'deepmind-letter' AND airtable_sent_between IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM mailings WHERE old_letters_key = 'deepmind-others')`,
    [titles["deepmind-others"]],
  );
  for (const mailing of OLD_MAILINGS) {
    if (mailing.airtableField) {
      await query("UPDATE mailings SET old_letters_key = $1 WHERE airtable_field = $2 AND old_letters_key IS NULL", [
        mailing.key,
        mailing.airtableField,
      ]);
    } else if (mailing.between) {
      await query(
        `INSERT INTO mailings (title, ask, airtable_sent_between, audience, channel, state, old_letters_key)
         VALUES ($1, $2, tstzrange($3, $4), 'politicians', 'email', 'sent', $5)
         ON CONFLICT (old_letters_key) DO NOTHING`,
        [titles[mailing.key], mailing.ask ?? null, mailing.between[0], mailing.between[1], mailing.key],
      );
    }
  }
}

/** Copies each form letter's text from Airtable, and the form's version live then, with its names. */
async function copyFormTexts(reader: Reader): Promise<void> {
  const waiting = new Map(
    (
      await query<{
        airtableId: string;
        id: number;
        at: Date;
        salutation: string;
        constituency: string | null;
        name: string;
        postcode: string | null;
      }>(
        `SELECT s.airtable_id AS "airtableId", s.id::int AS id, l.created_at AS at, n.salutation, p.constituency, f.name, f.postcode
         FROM letters_from_supporters s JOIN letters l USING (id) JOIN notable_people n ON n.id = l.notable_person_id
           LEFT JOIN politicians p ON p.id = n.id JOIN form_entries f ON f.id = s.entry_id
         WHERE s.airtable_id IS NOT NULL AND s.letter IS NULL`,
      )
    ).map((row) => [row.airtableId, row]),
  );
  if (!waiting.size) return;
  for (const letter of await fetchWebFormLetters(airtableToken())) {
    const row = waiting.get(letter.airtableId);
    if (!row || !letter.message.trim()) continue;
    const doc = docFromMarkup(letter.message.replace(/\r/g, ""));
    const draft = formDraft(formVersionAt(new Date(row.at)), {
      salutation: row.salutation,
      constituency: row.constituency ?? "",
      name: row.name,
      postcode: row.postcode ?? "",
    });
    reader.result.formTexts++;
    if (reader.dryRun) continue;
    await query(
      `UPDATE letters_from_supporters SET letter = $2, draft = $3, draft_approximate = false, own_words = $4 WHERE id = $1`,
      [row.id, JSON.stringify(doc), draft, ownWords(draft, toText(doc))],
    );
  }
}

const count = (counts: Record<string, number>, key: string) => {
  counts[key] = (counts[key] ?? 0) + 1;
};

/** What's said of a message once handled. */
type Handled = { outcome: string; letterId?: number; mailingKey?: string; rfc?: string | null; quoted?: string };

/** A message's text from the API's answer: its plain text if it has any, or its HTML's. */
function textFrom(message: { plain: string; html: string }): string {
  return message.plain.trim() ? message.plain.replace(/\r\n/g, "\n").trim() : htmlAsText(message.html);
}

/** The ID of the mailing with `key`. */
async function mailingIdOf(key: string): Promise<number> {
  const [row] = await query<{ id: number }>("SELECT id::int AS id FROM mailings WHERE old_letters_key = $1", [key]);
  return row.id;
}

/** Whether Gmail's ID is an email the site sent. */
async function sentBySite(account: string, id: string): Promise<boolean> {
  const [row] = await query("SELECT 1 FROM email_sends WHERE sender = $1 AND message_id = $2", [account, id]);
  return !!row;
}

/** The imported row of a letter's sent email. */
async function recordSent(
  letterId: number,
  purpose: "letter" | "mailing",
  account: string,
  message: GmailMessageHeaders,
  to: string,
  from: string,
  rfc: string | null,
): Promise<void> {
  await query(
    `INSERT INTO email_sends (at, purpose, letter_id, address, outcome, message_id, backend, sender, rfc_message_id,
       gmail_thread_id, subject, from_address, imported)
     VALUES ($1, $2, $3, $4, 'sent', $5, 'gmail', $6, $7, $8, $9, $10, true)`,
    [
      new Date(Number(message.internalDate)),
      purpose,
      letterId,
      to,
      message.id,
      account,
      rfc,
      message.threadId,
      decodeWords(message.headers.get("subject") ?? ""),
      from,
    ],
  );
}

/** A letter a sent email could be: to a politician it's to, around when it went, and not already joined to another. */
async function candidatesFor(reader: Reader, people: number[], at: Date) {
  const { from, to } = joinWindow(at);
  return query<{
    id: number;
    at: Date;
    kind: "pauseai" | "supporter";
    senderEmail?: string;
    senderName?: string;
    field: string | null;
    person: number;
  }>(
    `SELECT l.id::int AS id, coalesce(l.sent_at, l.created_at) AS at, l.kind, f.email AS "senderEmail", f.name AS "senderName",
       m.airtable_field AS field, l.notable_person_id::int AS person
     FROM letters l LEFT JOIN letters_from_pauseai p ON p.id = l.id AND l.kind = 'pauseai' LEFT JOIN mailings m ON m.id = p.mailing_id
       LEFT JOIN letters_from_supporters s ON s.id = l.id AND l.kind = 'supporter' LEFT JOIN form_entries f ON f.id = s.entry_id
     WHERE l.notable_person_id = ANY($1::bigint[]) AND coalesce(l.sent_at, l.created_at) BETWEEN $2 AND $3
       AND (p.airtable_id IS NOT NULL OR s.airtable_id IS NOT NULL)
       AND NOT EXISTS (SELECT 1 FROM old_letters_mail o WHERE o.dry_run = $4 AND o.letter_id = l.id AND o.outcome = 'joined')`,
    [people, from, to, reader.dryRun],
  );
}

/** The letter a message answers by its Gmail thread or the IDs it names, as the letter's own sent email has them. */
async function letterByThread(
  reader: Reader,
  account: string,
  message: GmailMessageHeaders,
): Promise<number | undefined> {
  const refs = [...messageIds(message.headers.get("in-reply-to")), ...messageIds(message.headers.get("references"))];
  const [row] = await query<{ id: number }>(
    `SELECT id::int AS id FROM (
       SELECT letter_id AS id, 1 AS rank FROM old_letters_mail WHERE dry_run = $1 AND letter_id IS NOT NULL AND rfc_message_id = ANY($2::text[])
       UNION ALL SELECT letter_id, 2 FROM old_letters_mail WHERE dry_run = $1 AND letter_id IS NOT NULL AND account = $3 AND gmail_thread_id = $4 AND source = 'sent'
       UNION ALL SELECT letter_id, 3 FROM email_sends WHERE letter_id IS NOT NULL AND purpose = 'mailing' AND (rfc_message_id = ANY($2::text[]) OR (sender = $3 AND gmail_thread_id = $4))
       UNION ALL SELECT letter_id, 4 FROM letter_replies WHERE rfc_message_id = ANY($2::text[])
     ) found ORDER BY rank LIMIT 1`,
    [reader.dryRun, refs, account, message.threadId],
  );
  return row?.id;
}

/** Keeps a message as a one-off, and queues the rest of its Gmail thread, so the thread is kept whole. */
async function asOneOff(
  reader: Reader,
  account: string,
  message: GmailMessageHeaders,
  raw?: Buffer,
  people: number[] = [],
): Promise<Handled> {
  reader.result.oneOffs++;
  if (reader.dryRun) return { outcome: "one_off" };
  const token = reader.tokens.get(account)!;
  await reader.turn();
  const whole = raw ?? (await gmailRawMessage(token, message.id));
  await keepOneOff(account, message, whole, reader.book, reader.connected, people);
  await reader.turn();
  const siblings = await gmailThreadMessageIds(token, message.threadId);
  await query(
    `INSERT INTO old_letters_mail (dry_run, account, gmail_message_id, gmail_thread_id, source)
     SELECT false, $1, id, $2, 'thread' FROM unnest($3::text[]) AS id ON CONFLICT DO NOTHING`,
    [account, message.threadId, siblings],
  );
  return { outcome: "one_off" };
}

/** Handles one message of Joseph's Sent mail. */
async function handleSent(reader: Reader, account: string, id: string): Promise<Handled> {
  if (await sentBySite(account, id)) return { outcome: "skipped" };
  await reader.turn();
  const message = await gmailFullMessage(reader.tokens.get(account)!, id).catch(unlessGone);
  if (!message) return { outcome: "skipped" };
  const rfc = messageIds(message.headers.get("message-id"))[0] ?? null;
  const subject = decodeWords(message.headers.get("subject") ?? "");
  const to = addressesOn(new Map([["to", message.headers.get("to") ?? ""]]));
  const cc = addressesOn(new Map([["to", message.headers.get("cc") ?? ""]]));
  const from = senderOf(message.headers).address;
  const { people } = politiciansIn(reader.book, [...to, ...cc]);
  const at = new Date(Number(message.internalDate));
  if (isReplySubject(subject, message.headers.get("in-reply-to"))) {
    const letter = await letterByThread(reader, account, message);
    if (letter) {
      reader.result.replies++;
      if (!reader.dryRun) {
        await reader.turn();
        await keepReply(account, reader.tokens.get(account)!, letter, message, {
          from: senderOf(message.headers),
          fromUs: true,
        });
      }
      return { outcome: "reply", letterId: letter, rfc };
    }
    return { ...(await asOneOff(reader, account, message)), rfc };
  }
  const text = textFrom(message);
  const candidates = people.length ? await candidatesFor(reader, people, at) : [];
  const letter = joinSent(candidates, { at, cc, text });
  const address = [...to, ...cc].find((a) => politiciansIn(reader.book, [a]).people.length) ?? to[0] ?? "";
  if (letter) {
    const row = candidates.find((c) => c.id === letter.id)!;
    if (row.kind === "supporter") {
      count(reader.result.joined, "form");
      if (!reader.dryRun) await recordSent(letter.id, "letter", account, message, address, from, rfc);
      return { outcome: "joined", letterId: letter.id, rfc };
    }
    const key = mailingOfLetter(row.field, subject, text, at);
    count(reader.result.joined, key);
    if (!reader.dryRun) {
      await query("UPDATE letters_from_pauseai SET mailing_id = $2, own_text = $3 WHERE id = $1", [
        letter.id,
        await mailingIdOf(key),
        text,
      ]);
      await recordSent(letter.id, "mailing", account, message, address, from, rfc);
    }
    return { outcome: "joined", letterId: letter.id, mailingKey: key, rfc };
  }
  const key = people.length ? mailingOfNewLetter(subject, text, at) : undefined;
  if (key) {
    count(reader.result.added, key);
    if (reader.dryRun) return { outcome: "added", mailingKey: key, rfc };
    const [{ id: letterId }] = await query<{ id: number }>(
      `INSERT INTO letters (kind, notable_person_id, status, created_at, sent_at) VALUES ('pauseai', $1, 'sent', $2, $2) RETURNING id::int AS id`,
      [people[0], at],
    );
    await query("INSERT INTO letters_from_pauseai (id, mailing_id, own_text) VALUES ($1, $2, $3)", [
      letterId,
      await mailingIdOf(key),
      text,
    ]);
    await recordSent(letterId, "mailing", account, message, address, from, rfc);
    return { outcome: "added", letterId, mailingKey: key, rfc };
  }
  return { ...(await asOneOff(reader, account, message)), rfc };
}

/** A politician's letters, for placing their reply. */
async function lettersTo(people: number[]): Promise<ReplyCandidate[]> {
  if (!people.length) return [];
  return query<ReplyCandidate>(
    `SELECT l.id::int AS id, coalesce(l.sent_at, l.created_at) AS at,
       coalesce((SELECT e.subject FROM email_sends e WHERE e.letter_id = l.id AND e.imported ORDER BY e.id LIMIT 1), s.subject, nullif(m.subject, ''),
         (SELECT o.subject FROM mailings o WHERE o.id = m.id), '') AS subject,
       f.email AS "senderEmail", f.name AS "senderName"
     FROM letters l LEFT JOIN letters_from_pauseai p ON p.id = l.id LEFT JOIN mailings m ON m.id = p.mailing_id
       LEFT JOIN letters_from_supporters s ON s.id = l.id LEFT JOIN form_entries f ON f.id = s.entry_id
     WHERE l.notable_person_id = ANY($1::bigint[])`,
    [people],
  );
}

/** Whether a message is a machine's: marked so, or its subject says so. */
function isAutomatic(message: GmailMessageHeaders): boolean {
  const subject = message.headers.get("subject") ?? "";
  return isMachineReply((name) => message.headers.get(name), subject) || isAcknowledgement(subject);
}

/** The subject the August letters went under: only replies to one quote it. */
const AUGUST_SUBJECT = /co-sign letter on google/i;

/** A politician's message read from any mailbox: a reply to a letter, an automatic one, or a one-off. */
async function handlePoliticianMessage(
  reader: Reader,
  account: string,
  message: GmailMessageHeaders,
  people: number[],
  group: boolean,
): Promise<Handled> {
  const rfc = messageIds(message.headers.get("message-id"))[0] ?? null;
  const token = reader.tokens.get(account)!;
  const automatic = isAutomatic(message);
  const subject = decodeWords(message.headers.get("subject") ?? "");
  const at = new Date(Number(message.internalDate));
  const letters = await lettersTo(people);
  let letter = await letterByThread(reader, account, message);
  letter ??= placeReply(letters, { at, subject, automatic, group })?.id;
  if (automatic) {
    if (!letter) return { ...(await asOneOff(reader, account, message, undefined, people)), rfc };
    reader.result.autoReplies++;
    if (!reader.dryRun) await noteAutoReply(letter, message);
    return { outcome: "auto_reply", letterId: letter, rfc };
  }
  await reader.turn();
  const raw = await gmailRawMessage(token, message.id);
  const text = wholeTextOf(parseMime(raw.toString("latin1")));
  letter ??= placeReply(letters, { at, subject, automatic, text, group })?.id;
  if (!letter) return { ...(await asOneOff(reader, account, message, raw, people)), rfc };
  reader.result.replies++;
  if (!reader.dryRun)
    await keepReply(account, token, letter, message, { raw, from: senderOf(message.headers), fromUs: false });
  const quoted =
    AUGUST_SUBJECT.test(subject) && /join \d+ of your/.test(text.replace(/\s+/g, " ")) ? quotedLetter(text) : undefined;
  return { outcome: "reply", letterId: letter, rfc, quoted };
}

/** What a reply quotes, once its quote's headers are past: the letter, for rebuilding a text we can't read. */
function quotedLetter(text: string): string {
  const clean = text.replace(/\r/g, "").replace(/^[> ]+/gm, "");
  const start = clean.search(/^(dear|hi|hello)\b.*$/im);
  return start < 0 ? clean : clean.slice(start);
}

/** Whether a message is a copy of a mail already handled, by its Message-ID. */
async function seenElsewhere(reader: Reader, rfc: string | null): Promise<boolean> {
  if (!rfc) return false;
  const [row] = await query(
    `SELECT 1 FROM old_letters_mail WHERE dry_run = $1 AND rfc_message_id = $2 AND outcome IS NOT NULL
     UNION ALL SELECT 1 FROM letter_replies WHERE rfc_message_id = $2
     UNION ALL SELECT 1 FROM email_sends WHERE rfc_message_id = $2
     LIMIT 1`,
    [reader.dryRun, rfc],
  );
  return !!row;
}

/** The Bcc'd copy of a letter Postmark sent: its Message-ID is that of Postmark's send. Keeps its text. */
async function keepPostmarkCopy(
  reader: Reader,
  account: string,
  message: GmailMessageHeaders,
  rfc: string,
): Promise<Handled | undefined> {
  const postmarkId = /^(.+)@mtasv\.net$/.exec(rfc)?.[1];
  if (!postmarkId) return undefined;
  const [letter] = await query<{ id: number }>(
    `SELECT s.id::int AS id FROM email_sends e JOIN letters_from_supporters s ON s.id = e.letter_id
     WHERE e.purpose = 'letter' AND e.message_id = $1`,
    [postmarkId],
  );
  if (!letter) return { outcome: "skipped", rfc };
  reader.result.postmarkTexts++;
  if (reader.dryRun) return { outcome: "skipped", letterId: letter.id, rfc };
  await reader.turn();
  const raw = await gmailRawMessage(reader.tokens.get(account)!, message.id);
  const mime = parseMime(raw.toString("latin1"));
  if (firstOfType(mime, "text/plain") || firstOfType(mime, "text/html")) {
    await query("UPDATE letters_from_supporters SET letter = $2 WHERE id = $1 AND letter IS NULL", [
      letter.id,
      JSON.stringify(docFromMarkup(wholeTextOf(mime))),
    ]);
  }
  return { outcome: "skipped", letterId: letter.id, rfc };
}

/** Handles one message from Joseph's received mail, the group's, or policy@'s own. */
async function handleReceived(reader: Reader, account: string, id: string, source: string): Promise<Handled> {
  await reader.turn();
  const message = await gmailMessageHeaders(reader.tokens.get(account)!, id, ONE_OFF_HEADERS).catch(unlessGone);
  if (!message) return { outcome: "skipped" };
  const rfc = messageIds(message.headers.get("message-id"))[0] ?? null;
  if (source !== "received") {
    const copy = rfc ? await keepPostmarkCopy(reader, account, message, rfc) : undefined;
    if (copy) return copy;
  }
  if (await seenElsewhere(reader, rfc)) return { outcome: "skipped", rfc };
  const from = senderOf(message.headers).address;
  const isPolitician = politiciansIn(reader.book, [from]).counts;
  const { people } = politiciansIn(reader.book, addressesOn(message.headers));
  if (isPolitician) return handlePoliticianMessage(reader, account, message, people, source !== "received");
  if (politiciansIn(reader.book, addressesOn(message.headers)).counts) {
    return { ...(await asOneOff(reader, account, message, undefined, people)), rfc };
  }
  if (source === "received") return { outcome: "skipped", rfc };
  // Shared mail: a politician named in what it quotes or forwards.
  await reader.turn();
  const raw = await gmailRawMessage(reader.tokens.get(account)!, id);
  const quoted = politiciansIn(reader.book, quotedAddresses(wholeTextOf(parseMime(raw.toString("latin1")))));
  if (quoted.counts) return { ...(await asOneOff(reader, account, message, raw, quoted.people)), rfc };
  if (!isPauseaiAddress(from, reader.connected)) {
    reader.result.unmatched.push({
      from: decodeWords(message.headers.get("from") ?? ""),
      subject: decodeWords(message.headers.get("subject") ?? ""),
    });
  }
  return { outcome: "unmatched", rfc };
}

/** A message of a thread kept as a one-off, read last. */
async function handleThreadMessage(reader: Reader, account: string, id: string): Promise<Handled> {
  await reader.turn();
  const token = reader.tokens.get(account)!;
  const message = await gmailMessageHeaders(token, id, ONE_OFF_HEADERS).catch(unlessGone);
  if (!message) return { outcome: "skipped" };
  const rfc = messageIds(message.headers.get("message-id"))[0] ?? null;
  await reader.turn();
  await keepOneOff(account, message, await gmailRawMessage(token, id), reader.book, reader.connected);
  return { outcome: "one_off", rfc };
}

/**
 * Handles one message, whichever list it's from. One Gmail won't give (it
 * answers 400, as it does for a message it holds in a form it can't serve) is
 * noted and passed over, as it would stop every press at the same place.
 */
async function handleOne(reader: Reader, account: string, id: string, source: string): Promise<Handled> {
  try {
    if (source === "sent") return await handleSent(reader, account, id);
    if (source === "thread") return await handleThreadMessage(reader, account, id);
    return await handleReceived(reader, account, id, source);
  } catch (error) {
    if (!(error instanceof GmailError && error.status === 400)) throw error;
    reader.result.unreadable.push(id);
    return { outcome: "skipped" };
  }
}

/** Works through what's listed, oldest first in each mailbox, sent mail before replies, until the call's time is up. */
async function readQueue(reader: Reader): Promise<void> {
  for (;;) {
    const batch = await query<{ account: string; id: string; source: string }>(
      `SELECT account, gmail_message_id AS id, source FROM old_letters_mail
       WHERE dry_run = $1 AND outcome IS NULL
       ORDER BY array_position(ARRAY['sent', 'received', 'group', 'policy', 'thread'], source),
         length(gmail_message_id), gmail_message_id
       LIMIT 20`,
      [reader.dryRun],
    );
    if (!batch.length) return;
    for (const { account, id, source } of batch) {
      const handled = await handleOne(reader, account, id, source);
      await query(
        `UPDATE old_letters_mail SET outcome = $4, letter_id = $5, mailing_key = $6, rfc_message_id = $7, quoted = $8
         WHERE dry_run = $1 AND account = $2 AND gmail_message_id = $3`,
        [
          reader.dryRun,
          account,
          id,
          handled.outcome,
          handled.letterId ?? null,
          handled.mailingKey ?? null,
          handled.rfc ?? null,
          handled.quoted ?? null,
        ],
      );
      reader.result.read++;
    }
  }
}

/** Letters with no sent email: those from August went from a Gmail we can't read. Moves them, by their date. */
async function placeUnjoined(reader: Reader): Promise<void> {
  const [row] = await query<{ august: number; others: number; other: number }>(
    `SELECT count(*) FILTER (WHERE l.sent_at >= '2025-08-06')::int AS august, count(*) FILTER (WHERE l.sent_at < '2025-08-06')::int AS others
     FROM letters_from_pauseai p JOIN letters l USING (id) JOIN mailings m ON m.id = p.mailing_id
     WHERE m.old_letters_key = 'deepmind-others'
       AND NOT EXISTS (SELECT 1 FROM old_letters_mail o WHERE o.dry_run = $1 AND o.letter_id = l.id AND o.outcome = 'joined')`,
    [reader.dryRun],
  );
  reader.result.notJoined["deepmind-august"] = row.august;
  reader.result.notJoined["deepmind-others"] = row.others;
  const notJoined = await query<{ key: string; total: number }>(
    `SELECT coalesce(m.old_letters_key, s.campaign) AS key, count(*)::int AS total
     FROM letters l LEFT JOIN letters_from_pauseai p ON p.id = l.id LEFT JOIN mailings m ON m.id = p.mailing_id
       LEFT JOIN letters_from_supporters s ON s.id = l.id
     WHERE (p.airtable_id IS NOT NULL OR s.airtable_id IS NOT NULL) AND coalesce(m.old_letters_key, '') <> 'deepmind-others'
       AND NOT EXISTS (SELECT 1 FROM old_letters_mail o WHERE o.dry_run = $1 AND o.letter_id = l.id AND o.outcome = 'joined')
     GROUP BY 1`,
    [reader.dryRun],
  );
  for (const { key, total } of notJoined) reader.result.notJoined[key] = total;
  if (reader.dryRun) return;
  const others = await mailingIdOf("deepmind-others");
  const august = await mailingIdOf("deepmind-august");
  const moved = await query<{ id: number; at: Date; salutation: string }>(
    `UPDATE letters_from_pauseai p SET mailing_id = $2 FROM letters l JOIN notable_people n ON n.id = l.notable_person_id
     WHERE p.id = l.id AND p.mailing_id = $1 AND l.sent_at >= '2025-08-06' AND p.own_text IS NULL
     RETURNING p.id::int AS id, l.sent_at AS at, n.salutation`,
    [others, august],
  );
  for (const { id, at, salutation } of moved) {
    await query("UPDATE letters_from_pauseai SET merge_values = $2 WHERE id = $1", [
      id,
      JSON.stringify({
        values: { greeting: `Dear ${salutation},`, colleagues: augustColleagues(new Date(at)) },
        meets: [],
      }),
    ]);
  }
}

/** Each mailing's template, from its letters' own text; each letter that fits it then keeps only what's its own. */
async function buildTemplates(reader: Reader): Promise<void> {
  if (reader.dryRun) return;
  for (const mailing of OLD_MAILINGS) {
    const id = await mailingIdOf(mailing.key);
    const sent = await query<{ fromAddress: string; subject: string }>(
      `SELECT e.from_address AS "fromAddress", e.subject FROM email_sends e JOIN letters_from_pauseai p ON p.id = e.letter_id
       WHERE p.mailing_id = $1 AND e.imported GROUP BY 1, 2 ORDER BY count(*) DESC LIMIT 1`,
      [id],
    );
    if (sent[0]) {
      await query(
        "UPDATE mailings SET sent_from = coalesce(sent_from, $2), subject = CASE WHEN subject = '' THEN $3 ELSE subject END WHERE id = $1",
        [id, sent[0].fromAddress, sent[0].subject],
      );
    }
    if (!mailing.template) continue;
    const letters = await query<{ id: number; text: string }>(
      "SELECT id::int AS id, own_text AS text FROM letters_from_pauseai WHERE mailing_id = $1 AND own_text IS NOT NULL",
      [id],
    );
    const template = letters.length ? templateOf(letters.map((letter) => letter.text)) : undefined;
    if (!template) continue;
    reader.result.templates++;
    await query("UPDATE mailings SET imported_text = $2 WHERE id = $1", [id, JSON.stringify(templateDoc(template))]);
    for (const letter of letters) {
      const values = fitTemplate(letter.text, template);
      if (!values) {
        reader.result.ownText++;
        continue;
      }
      await query("UPDATE letters_from_pauseai SET merge_values = $2, own_text = NULL WHERE id = $1", [
        letter.id,
        JSON.stringify(values),
      ]);
    }
  }
  const quotes = await query<{ quoted: string }>(
    "SELECT quoted FROM old_letters_mail WHERE dry_run = false AND quoted IS NOT NULL",
  );
  const august = augustTemplate(quotes.map((row) => row.quoted));
  if (august) {
    reader.result.templates++;
    await query(
      `UPDATE mailings SET imported_text = $1, imported_text_approximate = true, subject = (SELECT subject FROM mailings WHERE old_letters_key = 'deepmind-40')
       WHERE old_letters_key = 'deepmind-august'`,
      [JSON.stringify(august)],
    );
    await query("UPDATE old_letters_mail SET quoted = NULL WHERE quoted IS NOT NULL");
  }
}

/** The last step: each letter with a person's reply is marked with when the first came. */
async function setRepliedAt(reader: Reader): Promise<void> {
  if (reader.dryRun) return;
  const set = await query(
    `UPDATE letters l SET replied_at = least(l.replied_at, first.at)
     FROM (SELECT letter_id, min(at) AS at FROM letter_replies WHERE NOT from_us GROUP BY letter_id) first
     WHERE first.letter_id = l.id AND (l.replied_at IS NULL OR l.replied_at > first.at) RETURNING l.id`,
  );
  // least() ignores a NULL, so a letter with none takes the first reply's.
  reader.result.repliedSet = set.length;
}

/** What's still to read. */
async function leftToRead(dryRun: boolean): Promise<number> {
  const [{ left }] = await query<{ left: number }>(
    "SELECT count(*)::int AS left FROM old_letters_mail WHERE dry_run = $1 AND outcome IS NULL",
    [dryRun],
  );
  return left;
}

/**
 * One call's work on a press of the import: as far as it gets in its time,
 * keeping its place, and saying whether there's more. It says so in its run,
 * which each call of a press adds to. Gmail refusing stops the press there
 * with the reason in its result, as its limit is the site's too.
 */
export function importOldLettersChunk({
  startedBy,
  dryRun,
  runId,
  paceMs = PACE_MS,
  chunkMs = CHUNK_MS,
}: ChunkOptions): Promise<ChunkResult> {
  return keepingFailure(JOB, startedBy, async () => {
    const [earlier] = runId
      ? await query<{ result: OldLettersImportResult }>("SELECT result FROM import_runs WHERE id = $1", [runId])
      : [];
    const result: OldLettersImportResult = earlier?.result ?? emptyResult(dryRun);
    const until = Date.now() + chunkMs;
    const searchesDone = { n: result.searchesDone ?? 0 };
    const reader: Reader = {
      turn: pacer(paceMs, until, result),
      book: await politicianBook(),
      connected: await connectedAccounts(),
      tokens: new Map([
        [JOSEPH, await gmailAccess(JOSEPH)],
        [POLICY, await gmailAccess(POLICY)],
      ]),
      dryRun,
      result,
    };
    let more = false;
    try {
      if (!runId) {
        if (!dryRun) {
          await query("DELETE FROM old_letters_mail WHERE dry_run");
          await makeMailings();
        }
        await copyFormTexts(reader);
      }
      await list(reader, searchesDone);
      await readQueue(reader);
      await placeUnjoined(reader);
      await buildTemplates(reader);
      await setRepliedAt(reader);
      result.finished = true;
    } catch (error) {
      if (error instanceof ChunkOver) more = true;
      else if (error instanceof GmailError && (error.status === 403 || error.status === 429))
        result.stoppedBy = "gmail";
      else throw error;
    }
    result.searchesDone = searchesDone.n;
    result.left = await leftToRead(dryRun);
    if (runId) {
      await query("UPDATE import_runs SET result = $2 WHERE id = $1", [runId, JSON.stringify(result)]);
      return { runId, more, result };
    }
    const id = await recordRun(JOB, startedBy, "ok", result);
    return { runId: id, more, result };
  });
}

/** The whole of a press, in one call, as a fixture build does it: no background functions there. */
export async function importOldLetters(
  startedBy: string,
  dryRun: boolean,
  paceMs = 0,
): Promise<OldLettersImportResult> {
  let chunk = await importOldLettersChunk({ startedBy, dryRun, paceMs });
  while (chunk.more) chunk = await importOldLettersChunk({ startedBy, dryRun, runId: chunk.runId, paceMs });
  return chunk.result;
}
