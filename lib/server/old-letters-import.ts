import "server-only";
import { docFromMarkup, toText } from "@/lib/letter-format";
import { type ImportJob, NIGHTLY, type OldLettersImportResult, type OldLettersProgress } from "@/lib/import-runs";
import { ownWords } from "@/lib/letter-changes";
import {
  addressesIn,
  augustColleagues,
  augustTemplate,
  CUT_DOWN_CHARACTERS,
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
  restoreCutDown,
  templateDoc,
  templateOf,
  WHOLE_CHARACTERS,
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
import { query, transaction } from "./db";
import { gmailAccess } from "./gmail-accounts";
import { keepReply, noteAutoReply } from "./gmail-reading";
import { keepingFailure, recordRun } from "./import-runs";
import { wholeTextOf } from "./letter-threads";
import { messageIds, parseMime } from "./mime";
import { addressesOn, headerText, keepOneOff, ONE_OFF_HEADERS, rfcIdOf, senderOf } from "./one-off-emails";
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
import { problem } from "./problems";

// The import of the letters written before the site could send them
// (import-old-letters): a run every 5 minutes, and one for each press of its
// button. Each reads for seconds, as Gmail's limit is shared with the site, and
// carries on from where the last stopped: old_letters_mail has what's read, and
// the last run how far listing got. Once one finishes, the schedule does nothing
// more; a press goes through it all again, skipping what's kept. Its order: make
// the mailings, copy the form letters' text, put right what's kept, read each sent
// email and join it, read the replies, keep the one-off emails, then the templates
// and replied_at. Text goes right before templates, as they're never rebuilt.
// It reads at most two a second, and stops the moment Gmail refuses.

const JOB = "import-old-letters";

/** The mailboxes it reads. */
const JOSEPH = "joseph@pauseai.uk";
const POLICY = "policy@pauseai.uk";

/** The gap between Gmail requests: at most 2 a second. */
const PACE_MS = 500;

/** How long a run reads, well inside what a function is given. */
const READ_MS = 20_000;

/** The group's mail, as Gmail lists it. */
const GROUP_SEARCH = "list:policy@pauseai.uk OR list:policy-archive@pauseai.uk";

/** How many addresses a Gmail search names at once. */
const ADDRESSES_A_SEARCH = 30;

/** Why reading stopped short. */
class TimeUp extends Error {}

/** A fresh run's account of itself. */
function emptyResult(): OldLettersImportResult {
  return {
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
  /** Waits its turn, and stops the run once its time is up. */
  turn(): Promise<void>;
  book: PoliticianBook;
  connected: string[];
  tokens: Map<string, string>;
  result: OldLettersImportResult;
};

/** Waits for each Gmail request's turn, and stops the run when its time is up. */
function pacer(paceMs: number, until: number, result: OldLettersImportResult) {
  let next = 0;
  return async () => {
    const at = Date.now();
    if (at >= until) throw new TimeUp();
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
      `INSERT INTO old_letters_mail (account, gmail_message_id, gmail_thread_id, source)
       SELECT $1, id, thread, $2 FROM unnest($3::text[], $4::text[]) AS m (id, thread)
       ON CONFLICT DO NOTHING`,
      [account, source, found.map((m) => m.id), found.map((m) => m.threadId)],
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
        constituency: string;
        name: string;
        postcode: string;
      }>(
        `SELECT s.airtable_id AS "airtableId", s.id::int AS id, l.created_at AS at, n.salutation, coalesce(p.constituency, '') AS constituency, f.name, coalesce(f.postcode, '') AS postcode
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
      constituency: row.constituency,
      name: row.name,
      postcode: row.postcode,
    });
    reader.result.formTexts++;
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
  return restoreCutDown(message.plain.trim() ? message.plain.replace(/\r\n/g, "\n").trim() : htmlAsText(message.html));
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
      headerText(message.headers, "subject"),
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
    campaign: string | null;
    field: string | null;
    person: number;
  }>(
    `SELECT l.id::int AS id, coalesce(l.sent_at, l.created_at) AS at, l.kind, f.email AS "senderEmail", f.name AS "senderName", s.campaign,
       m.airtable_field AS field, l.notable_person_id::int AS person
     FROM letters l LEFT JOIN letters_from_pauseai p ON p.id = l.id AND l.kind = 'pauseai' LEFT JOIN mailings m ON m.id = p.mailing_id
       LEFT JOIN letters_from_supporters s ON s.id = l.id AND l.kind = 'supporter' LEFT JOIN form_entries f ON f.id = s.entry_id
     WHERE l.notable_person_id = ANY($1::bigint[]) AND coalesce(l.sent_at, l.created_at) BETWEEN $2 AND $3
       AND (p.airtable_id IS NOT NULL OR s.airtable_id IS NOT NULL)
       AND NOT EXISTS (SELECT 1 FROM old_letters_mail o WHERE o.letter_id = l.id AND o.outcome = 'joined')`,
    [people, from, to],
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
       SELECT letter_id AS id, 1 AS rank FROM old_letters_mail WHERE letter_id IS NOT NULL AND rfc_message_id = ANY($1::text[])
       UNION ALL SELECT letter_id, 2 FROM old_letters_mail WHERE letter_id IS NOT NULL AND account = $2 AND gmail_thread_id = $3 AND source = 'sent'
       UNION ALL SELECT letter_id, 3 FROM email_sends WHERE letter_id IS NOT NULL AND purpose = 'mailing' AND (rfc_message_id = ANY($1::text[]) OR (sender = $2 AND gmail_thread_id = $3))
       UNION ALL SELECT letter_id, 4 FROM letter_replies WHERE rfc_message_id = ANY($1::text[])
     ) found ORDER BY rank LIMIT 1`,
    [refs, account, message.threadId],
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
  const token = reader.tokens.get(account)!;
  await reader.turn();
  const whole = raw ?? (await gmailRawMessage(token, message.id).catch(unlessGone));
  if (!whole) return { outcome: "skipped" };
  await keepOneOff(account, message, whole, reader.book, reader.connected, people);
  await reader.turn();
  const siblings = await gmailThreadMessageIds(token, message.threadId);
  await query(
    `INSERT INTO old_letters_mail (account, gmail_message_id, gmail_thread_id, source)
     SELECT $1, id, $2, 'thread' FROM unnest($3::text[]) AS id ON CONFLICT DO NOTHING`,
    [account, message.threadId, siblings],
  );
  reader.result.oneOffs++;
  return { outcome: "one_off" };
}

/** The form letter a supporter wrote to one of these politicians: a repeat of it has no letter of its own. */
async function formLetterFrom(address: string, people: number[]) {
  const [letter] = await query<{ id: number; campaign: string }>(
    `SELECT s.id::int AS id, s.campaign FROM letters_from_supporters s JOIN letters l USING (id) JOIN form_entries f ON f.id = s.entry_id
     WHERE s.airtable_id IS NOT NULL AND lower(f.email) = $1 AND l.notable_person_id = ANY($2::bigint[]) ORDER BY l.id LIMIT 1`,
    [address, people],
  );
  return letter;
}

/** Handles one message of Joseph's Sent mail. */
async function handleSent(reader: Reader, account: string, id: string): Promise<Handled> {
  if (await sentBySite(account, id)) return { outcome: "skipped" };
  await reader.turn();
  const message = await gmailFullMessage(reader.tokens.get(account)!, id).catch(unlessGone);
  if (!message) return { outcome: "skipped" };
  const rfc = rfcIdOf(message.headers);
  const subject = headerText(message.headers, "subject");
  const to = addressesIn(headerText(message.headers, "to"));
  const cc = addressesIn(headerText(message.headers, "cc"));
  const from = senderOf(message.headers).address;
  const { people } = politiciansIn(reader.book, [...to, ...cc]);
  const at = new Date(Number(message.internalDate));
  if (isReplySubject(subject, message.headers.get("in-reply-to"))) {
    const letter = await letterByThread(reader, account, message);
    if (letter) {
      await reader.turn();
      await keepReply(account, reader.tokens.get(account)!, letter, message, {
        from: senderOf(message.headers),
        fromUs: true,
      });
      reader.result.replies++;
      return { outcome: "reply", letterId: letter, rfc };
    }
    return { ...(await asOneOff(reader, account, message)), rfc };
  }
  const text = textFrom(message);
  const candidates = people.length ? await candidatesFor(reader, people, at) : [];
  const letter = joinSent(candidates, { at, cc, text });
  // Only used once it's a letter, which is to a politician.
  const address = () => [...to, ...cc].find((a) => politiciansIn(reader.book, [a]).people.length)!;
  if (letter) {
    const row = candidates.find((c) => c.id === letter.id)!;
    if (row.kind === "supporter") {
      count(reader.result.joined, row.campaign!);
      await recordSent(letter.id, "letter", account, message, address(), from, rfc);
      return { outcome: "joined", letterId: letter.id, rfc };
    }
    const key = mailingOfLetter(row.field, subject, text, at);
    count(reader.result.joined, key);
    await query("UPDATE letters_from_pauseai SET mailing_id = $2, own_text = $3 WHERE id = $1", [
      letter.id,
      await mailingIdOf(key),
      text,
    ]);
    await recordSent(letter.id, "mailing", account, message, address(), from, rfc);
    return { outcome: "joined", letterId: letter.id, mailingKey: key, rfc };
  }
  // Only PauseAI's own mail is a letter of PauseAI's. A supporter's is their form letter sent again, or a one-off.
  const ours = isPauseaiAddress(from, reader.connected);
  const repeat = people.length && !ours ? await formLetterFrom(from, people) : undefined;
  if (repeat) {
    count(reader.result.joined, repeat.campaign);
    await recordSent(repeat.id, "letter", account, message, address(), from, rfc);
    return { outcome: "joined", letterId: repeat.id, rfc };
  }
  const key = people.length && ours ? mailingOfNewLetter(subject, text, at) : undefined;
  if (key) {
    count(reader.result.added, key);
    const [{ id: letterId }] = await query<{ id: number }>(
      `INSERT INTO letters (kind, notable_person_id, status, created_at, sent_at) VALUES ('pauseai', $1, 'sent', $2, $2) RETURNING id::int AS id`,
      [people[0], at],
    );
    await query("INSERT INTO letters_from_pauseai (id, mailing_id, own_text) VALUES ($1, $2, $3)", [
      letterId,
      await mailingIdOf(key),
      text,
    ]);
    await recordSent(letterId, "mailing", account, message, address(), from, rfc);
    return { outcome: "added", letterId, mailingKey: key, rfc };
  }
  return { ...(await asOneOff(reader, account, message)), rfc };
}

/**
 * What every DeepMind letter was called: those with no sent email, as August's
 * have none, go by it, as their mailing's subject isn't known until the end.
 */
const DEEPMIND_SUBJECT = "Request to co-sign letter on Google's breach of AI safety pledges";

/** A politician's letters, for placing their reply. */
async function lettersTo(people: number[]): Promise<ReplyCandidate[]> {
  if (!people.length) return [];
  return query<ReplyCandidate>(
    `SELECT l.id::int AS id, coalesce(l.sent_at, l.created_at) AS at,
       coalesce((SELECT e.subject FROM email_sends e WHERE e.letter_id = l.id AND e.imported ORDER BY e.id LIMIT 1), s.subject, nullif(m.subject, ''),
         CASE WHEN m.ask = 'deepmind-letter' THEN $2 END, '') AS subject,
       f.email AS "senderEmail", f.name AS "senderName"
     FROM letters l LEFT JOIN letters_from_pauseai p ON p.id = l.id LEFT JOIN mailings m ON m.id = p.mailing_id
       LEFT JOIN letters_from_supporters s ON s.id = l.id LEFT JOIN form_entries f ON f.id = s.entry_id
     WHERE l.notable_person_id = ANY($1::bigint[])`,
    [people, DEEPMIND_SUBJECT],
  );
}

/** Whether a message is a machine's: marked so, or its subject says so. */
function isAutomatic(message: GmailMessageHeaders): boolean {
  const subject = headerText(message.headers, "subject");
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
  const rfc = rfcIdOf(message.headers);
  const token = reader.tokens.get(account)!;
  const automatic = isAutomatic(message);
  const subject = headerText(message.headers, "subject");
  const at = new Date(Number(message.internalDate));
  const letters = await lettersTo(people);
  let letter = await letterByThread(reader, account, message);
  letter ??= placeReply(letters, { at, subject, automatic, group })?.id;
  if (automatic) {
    if (!letter) return { ...(await asOneOff(reader, account, message, undefined, people)), rfc };
    reader.result.autoReplies++;
    await noteAutoReply(letter, message);
    return { outcome: "auto_reply", letterId: letter, rfc };
  }
  await reader.turn();
  const raw = await gmailRawMessage(token, message.id).catch(unlessGone);
  if (!raw) return { outcome: "skipped", rfc };
  const text = wholeTextOf(parseMime(raw.toString("latin1")));
  letter ??= placeReply(letters, { at, subject, automatic, text, group })?.id;
  if (!letter) return { ...(await asOneOff(reader, account, message, raw, people)), rfc };
  await keepReply(account, token, letter, message, { raw, from: senderOf(message.headers), fromUs: false });
  reader.result.replies++;
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
async function seenElsewhere(rfc: string | null): Promise<boolean> {
  if (!rfc) return false;
  const [row] = await query(
    `SELECT 1 FROM old_letters_mail WHERE rfc_message_id = $1 AND outcome IS NOT NULL
     UNION ALL SELECT 1 FROM letter_replies WHERE rfc_message_id = $1
     UNION ALL SELECT 1 FROM email_sends WHERE rfc_message_id = $1
     LIMIT 1`,
    [rfc],
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
  await reader.turn();
  const raw = await gmailRawMessage(reader.tokens.get(account)!, message.id).catch(unlessGone);
  if (!raw) return { outcome: "skipped", rfc };
  await query("UPDATE letters_from_supporters SET letter = $2 WHERE id = $1 AND letter IS NULL", [
    letter.id,
    JSON.stringify(docFromMarkup(wholeTextOf(parseMime(raw.toString("latin1"))))),
  ]);
  reader.result.postmarkTexts++;
  return { outcome: "skipped", letterId: letter.id, rfc };
}

/** Handles one message from Joseph's received mail, the group's, or policy@'s own. */
async function handleReceived(reader: Reader, account: string, id: string, source: string): Promise<Handled> {
  await reader.turn();
  const message = await gmailMessageHeaders(reader.tokens.get(account)!, id, ONE_OFF_HEADERS).catch(unlessGone);
  if (!message) return { outcome: "skipped" };
  const rfc = rfcIdOf(message.headers);
  if (source !== "received") {
    const copy = rfc ? await keepPostmarkCopy(reader, account, message, rfc) : undefined;
    if (copy) return copy;
  }
  if (await seenElsewhere(rfc)) return { outcome: "skipped", rfc };
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
  const raw = await gmailRawMessage(reader.tokens.get(account)!, id).catch(unlessGone);
  if (!raw) return { outcome: "skipped", rfc };
  const quoted = politiciansIn(reader.book, quotedAddresses(wholeTextOf(parseMime(raw.toString("latin1")))));
  if (quoted.counts) return { ...(await asOneOff(reader, account, message, raw, quoted.people)), rfc };
  if (!isPauseaiAddress(from, reader.connected)) {
    reader.result.unmatched.push({
      from: headerText(message.headers, "from"),
      subject: headerText(message.headers, "subject"),
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
  const rfc = rfcIdOf(message.headers);
  await reader.turn();
  const raw = await gmailRawMessage(token, id).catch(unlessGone);
  if (!raw) return { outcome: "skipped", rfc };
  await keepOneOff(account, message, raw, reader.book, reader.connected);
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
    return { outcome: "unreadable" };
  }
}

/**
 * Puts right what's kept, needing no mail read. An email added as PauseAI's own
 * letter though a supporter sent it goes back on the list, with what joined that
 * letter, to be read again as what it is. A send keeps its first address alone,
 * and a letter's text its whole characters.
 */
async function putRightWhatsKept(reader: Reader): Promise<void> {
  const added = await query<{ id: number; from: string }>(
    `SELECT o.letter_id::int AS id, split_part(e.from_address, ',', 1) AS from
     FROM old_letters_mail o JOIN email_sends e ON e.letter_id = o.letter_id AND e.message_id = o.gmail_message_id
     WHERE o.outcome = 'added'`,
  );
  for (const { id, from } of added) {
    if (isPauseaiAddress(from, reader.connected)) continue;
    await transaction(async (db) => {
      await query("DELETE FROM email_sends WHERE letter_id = $1 AND imported", [id], db);
      await query(
        `UPDATE old_letters_mail SET outcome = NULL, letter_id = NULL, mailing_key = NULL, rfc_message_id = NULL, quoted = NULL WHERE letter_id = $1`,
        [id],
        db,
      );
      await query("DELETE FROM letters WHERE id = $1", [id], db);
    });
  }
  await query(
    `UPDATE email_sends SET from_address = split_part(from_address, ',', 1) WHERE imported AND from_address LIKE '%,%'`,
  );
  await query(
    "UPDATE letters_from_pauseai SET own_text = translate(own_text, $1, $2) WHERE own_text ~ ('[' || $1 || ']')",
    [CUT_DOWN_CHARACTERS, WHOLE_CHARACTERS],
  );
}

/**
 * Reads again the letters whose kept text has a replacement character, as a
 * character was lost in decoding it. `done` is its place, so one that stays that
 * way is passed over and can't hold up the rest.
 */
async function readGarbledAgain(reader: Reader, done: { id: number }): Promise<void> {
  for (;;) {
    const batch = await query<{ id: number; account: string; messageId: string }>(
      `SELECT p.id::int AS id, e.sender AS account, e.message_id AS "messageId"
       FROM letters_from_pauseai p JOIN email_sends e ON e.letter_id = p.id AND e.imported
       WHERE p.own_text LIKE '%' || chr(65533) || '%' AND p.id > $1 ORDER BY p.id LIMIT 20`,
      [done.id],
    );
    if (!batch.length) return;
    for (const { id, account, messageId } of batch) {
      await reader.turn();
      try {
        const message = await gmailFullMessage(reader.tokens.get(account)!, messageId).catch(unlessGone);
        if (message)
          await query("UPDATE letters_from_pauseai SET own_text = $2 WHERE id = $1", [id, textFrom(message)]);
        reader.result.read++;
      } catch (error) {
        if (!(error instanceof GmailError && error.status === 400)) throw error;
        reader.result.unreadable.push(messageId);
      }
      done.id = id;
    }
  }
}

/** Works through what's listed, oldest first in each mailbox, sent mail before replies, until the run's time is up. */
async function readQueue(reader: Reader): Promise<void> {
  for (;;) {
    const batch = await query<{ account: string; id: string; source: string }>(
      `SELECT account, gmail_message_id AS id, source FROM old_letters_mail
       WHERE outcome IS NULL
       ORDER BY array_position(ARRAY['sent', 'received', 'group', 'policy', 'thread'], source),
         length(gmail_message_id), gmail_message_id
       LIMIT 20`,
    );
    if (!batch.length) return;
    for (const { account, id, source } of batch) {
      const handled = await handleOne(reader, account, id, source);
      await query(
        `UPDATE old_letters_mail SET outcome = $3, letter_id = $4, mailing_key = $5, rfc_message_id = $6, quoted = $7
         WHERE account = $1 AND gmail_message_id = $2`,
        [
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
       AND NOT EXISTS (SELECT 1 FROM old_letters_mail o WHERE o.letter_id = l.id AND o.outcome = 'joined')`,
  );
  reader.result.notJoined["deepmind-august"] = row.august;
  reader.result.notJoined["deepmind-others"] = row.others;
  const notJoined = await query<{ key: string; total: number }>(
    `SELECT coalesce(m.old_letters_key, s.campaign, m.title) AS key, count(*)::int AS total
     FROM letters l LEFT JOIN letters_from_pauseai p ON p.id = l.id LEFT JOIN mailings m ON m.id = p.mailing_id
       LEFT JOIN letters_from_supporters s ON s.id = l.id
     WHERE (p.airtable_id IS NOT NULL OR s.airtable_id IS NOT NULL) AND coalesce(m.old_letters_key, '') <> 'deepmind-others'
       AND NOT EXISTS (SELECT 1 FROM old_letters_mail o WHERE o.letter_id = l.id AND o.outcome = 'joined')
     GROUP BY 1`,
  );
  for (const { key, total } of notJoined) reader.result.notJoined[key] = total;
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
      // Only a mailing with no template yet: after that, only the letters that didn't fit have their text.
      `SELECT id::int AS id, own_text AS text FROM letters_from_pauseai
       WHERE mailing_id = $1 AND own_text IS NOT NULL AND (SELECT imported_text IS NULL FROM mailings WHERE id = $1)`,
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
  const quotes = await query<{ quoted: string }>("SELECT quoted FROM old_letters_mail WHERE quoted IS NOT NULL");
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
  const set = await query(
    `UPDATE letters l SET replied_at = least(l.replied_at, first.at)
     FROM (SELECT letter_id, min(at) AS at FROM letter_replies WHERE NOT from_us GROUP BY letter_id) first
     WHERE first.letter_id = l.id AND (l.replied_at IS NULL OR l.replied_at > first.at) RETURNING l.id`,
  );
  // least() ignores a NULL, so a letter with none takes the first reply's.
  reader.result.repliedSet = set.length;
}

/** What's still to read. */
async function leftToRead(): Promise<number> {
  const [{ left }] = await query<{ left: number }>(
    "SELECT count(*)::int AS left FROM old_letters_mail WHERE outcome IS NULL",
  );
  return left;
}

/** The newest run that didn't fail, which says where the next carries on. */
async function lastRun(): Promise<OldLettersImportResult | undefined> {
  const [last] = await query<{ result: OldLettersImportResult }>(
    `SELECT result FROM import_runs WHERE job = $1 AND status <> 'failed' ORDER BY at DESC, id DESC LIMIT 1`,
    [JOB],
  );
  return last?.result;
}

/** As far as a run gets in its time, keeping its place and its run. Gmail refusing stops it there, with the reason in its result. */
async function readSome(startedBy: string, paceMs: number, readMs: number): Promise<OldLettersImportResult> {
  const last = await lastRun();
  if (startedBy === NIGHTLY && last?.finished) return last;
  const carrying = last?.finished === false ? last : undefined;
  const result = emptyResult();
  const searchesDone = { n: carrying?.searchesDone ?? 0 };
  const textsDone = { id: carrying?.textsDone ?? 0 };
  const reader: Reader = {
    turn: pacer(paceMs, Date.now() + readMs, result),
    book: await politicianBook(),
    connected: await connectedAccounts(),
    tokens: new Map([
      [JOSEPH, await gmailAccess(JOSEPH)],
      [POLICY, await gmailAccess(POLICY)],
    ]),
    result,
  };
  try {
    if (!carrying) {
      await makeMailings();
      await copyFormTexts(reader);
    }
    await putRightWhatsKept(reader);
    await list(reader, searchesDone);
    await readGarbledAgain(reader, textsDone);
    await readQueue(reader);
    await placeUnjoined(reader);
    await buildTemplates(reader);
    await setRepliedAt(reader);
    result.finished = true;
  } catch (error) {
    if (error instanceof GmailError && (error.status === 403 || error.status === 429)) {
      problem(staffCopy.oldLetters.stoppedByGmail, error);
      result.stoppedBy = "gmail";
      result.stoppedWhy = error.message;
    } else if (!(error instanceof TimeUp)) throw error;
  }
  if (result.unreadable.length) problem(staffCopy.problems.job.unreadable, result.unreadable.join(", "));
  if (result.unmatched.length) problem(staffCopy.problems.job.matchedNothing, result.unmatched.length);
  result.searchesDone = searchesDone.n;
  result.textsDone = textsDone.id;
  result.titles = await countedTitles();
  result.left = await leftToRead();
  await recordRun(JOB, startedBy, "ok", result);
  return result;
}

/**
 * A run of the import, keeping it in the log. Only one runs at a time: a second
 * started meanwhile, a press during a scheduled run, stops at once, leaving no
 * record. The transaction only holds that lock, so what's read stays kept
 * whatever becomes of the run.
 */
export function importOldLetters(
  startedBy: string,
  paceMs = process.env.DATA_FIXTURES === "1" ? 0 : PACE_MS,
  readMs = READ_MS,
): Promise<OldLettersImportResult> {
  return keepingFailure(JOB, startedBy, () =>
    transaction(async (db) => {
      const [{ locked }] = await query<{ locked: boolean }>(
        "SELECT pg_try_advisory_xact_lock(hashtext($1)) AS locked",
        [JOB],
        db,
      );
      return locked ? readSome(startedBy, paceMs, readMs) : emptyResult();
    }),
  );
}

/** How far a job has got, for its page: only the import of old letters says. */
export async function jobProgress(job: ImportJob): Promise<OldLettersProgress | undefined> {
  return job === JOB ? oldLettersProgress() : undefined;
}

/** How far the import has got, over all its runs, from what it has kept of each message. */
async function oldLettersProgress(): Promise<OldLettersProgress> {
  const [counts] = await query<Omit<OldLettersProgress, "refusals" | "byMailing" | "titles">>(
    `SELECT count(*) FILTER (WHERE outcome IS NOT NULL)::int AS read, count(*) FILTER (WHERE outcome IS NULL)::int AS left,
       count(*) FILTER (WHERE outcome IN ('joined', 'added'))::int AS joined, count(*) FILTER (WHERE outcome = 'reply')::int AS replies,
       count(*) FILTER (WHERE outcome = 'auto_reply')::int AS "autoReplies", count(*) FILTER (WHERE outcome = 'one_off')::int AS "oneOffs"
     FROM old_letters_mail`,
  );
  const [{ refusals }] = await query<{ refusals: number }>(
    `SELECT count(*)::int AS refusals FROM import_runs WHERE job = $1 AND result->>'stoppedBy' = 'gmail'`,
    [JOB],
  );
  const mailings = await query<{ key: string; total: number }>(
    `SELECT coalesce(o.mailing_key, s.campaign) AS key, count(*)::int AS total
     FROM old_letters_mail o LEFT JOIN letters_from_supporters s ON s.id = o.letter_id
     WHERE o.outcome IN ('joined', 'added') GROUP BY 1 ORDER BY 2 DESC, 1`,
  );
  return {
    ...counts,
    refusals,
    byMailing: Object.fromEntries(mailings.map(({ key, total }) => [key, total])),
    titles: await countedTitles(),
  };
}

/** What the result's counts are called: the mailings and campaigns they're under, by key. */
async function countedTitles(): Promise<Record<string, string>> {
  const rows = await query<{ key: string; title: string }>(
    `SELECT old_letters_key AS key, title FROM mailings WHERE old_letters_key IS NOT NULL
     UNION ALL SELECT slug, title FROM campaigns`,
  );
  return { ...Object.fromEntries(rows.map(({ key, title }) => [key, title])), ...staffCopy.oldLetters.mailingTitles };
}
