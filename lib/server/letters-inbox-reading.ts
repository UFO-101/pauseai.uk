import "server-only";
import { gzipSync } from "node:zlib";
import { staffCopy } from "@/lib/content/staff-interface";
import type { GmailRead, NotUnderstoodReason } from "@/lib/import-runs";
import { query } from "./db";
import { handleDeliveryProblem } from "./delivery-problems";
import { sentBy } from "./email";
import { readBounce } from "./gmail-reading";
import { letterEvent } from "./letter-sending";
import { isLettersInboxAddress, proxyTag } from "./letters-inbox";
import { decodeWords, fromAddress, messageIds } from "./mime";
import { saveLetterReply } from "./outside-services/blobs";
import { notifyDomain } from "./outside-services/postmark";
import {
  gmailLabel,
  gmailMessageHeaders,
  gmailRawMessage,
  unlessGone,
  labelGmailMessage,
  type GmailMessageHeaders,
} from "./outside-services/gmail";
import { isMachineReply } from "./postmark-webhooks";
import { overRelayCap, relay } from "./relays";

// Reading the letters inbox (lib/server/letters-inbox.ts), from the hourly
// read of Gmail (gmail-reading.ts). All of its mail is ours, so every
// message is read whole and sorted into one of:
//
// - from the MP's office to the supporter's proxy, or from the supporter to
//   either proxy: kept whole and relayed to the other side (relays.ts),
//   automatic replies too, as with direct email;
// - a bounce of something we sent: recorded, never relayed;
// - our own mail: skipped, or for the supporter's copy, which arrives at
//   the MP's proxy, and the site's own mail to it, such as a staff login
//   link, noted;
// - spam that matches no letter: counted;
// - anything else is not understood, for a person: an unknown proxy, a
//   stranger, mail that fails authentication, or a relay over the cap.
//
// Each is labelled in Gmail, and all but those not understood are marked
// read and archived, so the inbox holds only what needs a person.

/** The headers that say who a message is from and to, and what it answers. */
const HEADERS = [
  "From",
  "To",
  "Cc",
  "Delivered-To",
  "Reply-To",
  "Subject",
  "Message-ID",
  "In-Reply-To",
  "References",
  "Auto-Submitted",
  "X-Autoreply",
  "X-Autorespond",
  "Precedence",
];

/** What reading made of a message, as its label in Gmail. */
type Outcome = keyof typeof staffCopy.lettersInbox.labels;

/** A proxy named in a message: its row. */
type Proxy = { id: number; tag: string; supporterEmail: string | null; politicianId: number | null };

/** Whom a message is from: the supporter, or the MP's office. */
type Party = "supporter" | "office";

/** The account's labels by outcome, made the first time they're needed in a run. */
class Labels {
  private ids = new Map<Outcome, string>();
  constructor(private token: string) {}
  async of(outcome: Outcome): Promise<string> {
    const known = this.ids.get(outcome);
    if (known) return known;
    const id = await gmailLabel(this.token, staffCopy.lettersInbox.labels[outcome]);
    this.ids.set(outcome, id);
    return id;
  }
}

/** Labels a message with what reading made of it, and, but for one not understood, marks it read and archives it. */
async function file(token: string, labels: Labels, id: string, outcome: Outcome): Promise<void> {
  const done = outcome !== "notUnderstood";
  await labelGmailMessage(token, id, [await labels.of(outcome)], done ? ["INBOX", "UNREAD", "SPAM"] : []);
}

/** Every address in a message's To, Cc and Delivered-To, lowercased. */
function addressesTo(message: GmailMessageHeaders): string[] {
  return ["to", "cc", "delivered-to"]
    .flatMap((name) => decodeWords(message.headers.get(name) ?? "").match(/[^\s<>",;]+@[^\s<>",;]+/g) ?? [])
    .map((address) => address.toLowerCase());
}

/** The proxies a message names, and the tags it names that aren't ours. */
async function proxiesNamed(message: GmailMessageHeaders): Promise<{ proxies: Proxy[]; unknown: string[] }> {
  const tags = [
    ...new Set(
      addressesTo(message)
        .map(proxyTag)
        .filter((tag): tag is string => !!tag),
    ),
  ];
  const proxies = await query<Proxy>(
    `SELECT id::int AS id, tag, supporter_email AS "supporterEmail", notable_person_id::int AS "politicianId"
     FROM proxies WHERE tag = ANY($1) ORDER BY id`,
    [tags],
  );
  return { proxies, unknown: tags.filter((tag) => !proxies.some((p) => p.tag === tag)) };
}

/** The domain of an address, or what an Authentication-Results field names: example.org of a@example.org. */
const domainOf = (value: string) => value.slice(value.lastIndexOf("@") + 1).toLowerCase();

/** Whether two domains are aligned, as DMARC's relaxed mode has it: one is the other or under it. */
const aligned = (a: string, b: string) => a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`);

/**
 * Whether Google's servers found a message is from the domain of `from`:
 * by the Authentication-Results that mx.google.com added, it passed DMARC;
 * or, where the domain has no DMARC policy, SPF or DKIM aligned with it.
 * Any other server's results could be forged, so they're ignored.
 */
export function authenticated(raw: string, from: string): boolean {
  const head = raw.slice(0, raw.search(/\r?\n\r?\n/));
  const results = [...head.replace(/\r?\n[ \t]+/g, " ").matchAll(/^Authentication-Results:\s*(.*)$/gim)]
    .map(([, value]) => value)
    .filter((value) => /^mx\.google\.com\s*;/i.test(value));
  const domain = domainOf(from);
  return results.some((value) => {
    const result = (method: string) => new RegExp(`\\b${method}=(\\w+)`, "i").exec(value)?.[1].toLowerCase();
    const field = (name: string) => new RegExp(`\\b${name.replace(".", "\\.")}=([^\\s;]+)`, "i").exec(value)?.[1];
    const dmarc = result("dmarc");
    if (dmarc === "pass") return aligned(domainOf(field("header.from") ?? domain), domain);
    if (dmarc !== undefined && dmarc !== "none") return false;
    const spf = result("spf") === "pass" && aligned(domainOf(field("smtp.mailfrom") ?? ""), domain);
    const dkim = result("dkim") === "pass" && aligned(domainOf(field("header.d") ?? field("header.i") ?? ""), domain);
    return spf || dkim;
  });
}

/** Whether an address is the office's: an address of Parliament's, or the one the letter went to. */
async function isOffice(letterId: number, address: string): Promise<boolean> {
  if (aligned(domainOf(address), "parliament.uk")) return true;
  const [sent] = await query(
    "SELECT 1 FROM email_sends WHERE letter_id = $1 AND purpose IN ('letter', 'relay') AND address = $2 LIMIT 1",
    [letterId, address],
  );
  return !!sent;
}

/**
 * Which of `letters` a message belongs to: the only one; else, in order,
 * one its In-Reply-To or References names; one in the same Gmail thread;
 * one a Case Ref in its subject was seen on; one whose subject is in its
 * subject; failing those, the latest, as an uncertain match.
 */
async function chooseLetter(
  letters: number[],
  account: string,
  message: GmailMessageHeaders,
  subject: string,
): Promise<{ letterId: number; uncertain: boolean }> {
  if (letters.length === 1) return { letterId: letters[0], uncertain: false };
  const refs = [...messageIds(message.headers.get("in-reply-to")), ...messageIds(message.headers.get("references"))];
  const caseRef = /\(Case Ref: ([A-Z0-9]+)\)/i.exec(subject)?.[0] ?? null;
  const [found] = await query<{ letterId: number }>(
    `SELECT letter_id::int AS "letterId" FROM (
       SELECT letter_id, 1 AS rank FROM email_sends WHERE rfc_message_id = ANY($2)
       UNION ALL SELECT letter_id, 1 FROM letter_replies WHERE rfc_message_id = ANY($2)
       UNION ALL SELECT letter_id, 1 FROM letter_relays WHERE rfc_message_id = ANY($2)
       UNION ALL SELECT letter_id, 2 FROM email_sends WHERE sender = $3 AND gmail_thread_id = $4
       UNION ALL SELECT letter_id, 2 FROM letter_replies WHERE account = $3 AND gmail_thread_id = $4
       UNION ALL SELECT letter_id, 3 FROM letter_replies WHERE $5::text IS NOT NULL AND strpos(lower(subject), lower($5)) > 0
       UNION ALL SELECT id, 4 FROM letters_from_supporters WHERE strpos(lower($6), lower(subject)) > 0
     ) found WHERE letter_id = ANY($1) ORDER BY rank LIMIT 1`,
    [letters, refs, account, message.threadId, caseRef, subject],
  );
  if (found) return { letterId: found.letterId, uncertain: false };
  const [latest] = await query<{ id: number }>(
    "SELECT id::int AS id FROM letters WHERE id = ANY($1) ORDER BY created_at DESC, id DESC LIMIT 1",
    [letters],
  );
  return { letterId: latest.id, uncertain: true };
}

/** A letter from the letters inbox, by its sender's proxy, to which MP. */
type ProxiedLetter = { id: number; proxyId: number; politicianId: number; supporterEmail: string };

/** The letters of the supporters' proxies `proxyIds`, or of the supporter at `email`, to the MPs `politicianIds` if any are given. */
async function lettersOf(filter: { proxyIds?: number[]; email?: string; politicianIds: number[] }) {
  return query<ProxiedLetter>(
    `SELECT l.id::int AS id, s.proxy_id::int AS "proxyId", l.notable_person_id::int AS "politicianId",
       p.supporter_email AS "supporterEmail"
     FROM letters_from_supporters s JOIN letters l USING (id) JOIN proxies p ON p.id = s.proxy_id
     WHERE (s.proxy_id = ANY($1) OR p.supporter_email = $2)
       AND (cardinality($3::bigint[]) = 0 OR l.notable_person_id = ANY($3))
     ORDER BY l.id`,
    [filter.proxyIds ?? [], filter.email ?? null, filter.politicianIds],
  );
}

/** The letter a message answers, by an email of ours it names: for automatic replies and bounces to the plain address. */
async function letterAnswered(message: GmailMessageHeaders): Promise<ProxiedLetter | undefined> {
  const refs = [...messageIds(message.headers.get("in-reply-to")), ...messageIds(message.headers.get("references"))];
  const [row] = await query<{ id: number }>(
    `SELECT e.letter_id::int AS id FROM email_sends e JOIN letters_from_supporters s ON s.id = e.letter_id
     WHERE e.rfc_message_id = ANY($1) AND s.proxy_id IS NOT NULL ORDER BY e.id DESC LIMIT 1`,
    [refs],
  );
  if (!row) return undefined;
  const [letter] = await query<ProxiedLetter>(
    `SELECT l.id::int AS id, s.proxy_id::int AS "proxyId", l.notable_person_id::int AS "politicianId",
       p.supporter_email AS "supporterEmail"
     FROM letters_from_supporters s JOIN letters l USING (id) JOIN proxies p ON p.id = s.proxy_id WHERE l.id = $1`,
    [row.id],
  );
  return letter;
}

/**
 * Whose a message is and which letter it's for: the supporter, writing to
 * either proxy; or the MP's office, writing to the supporter's proxy; or
 * either, answering an email of ours at the plain address. Otherwise why
 * it isn't understood.
 */
async function place(
  account: string,
  message: GmailMessageHeaders,
  from: string,
  subject: string,
): Promise<{ letterId: number; party: Party; uncertain: boolean } | { reason: NotUnderstoodReason }> {
  const { proxies, unknown } = await proxiesNamed(message);
  const politicianIds = proxies.flatMap((p) => (p.politicianId ? [p.politicianId] : []));
  const supporters = proxies.filter((p) => p.supporterEmail);
  if (!proxies.length) {
    const answered = await letterAnswered(message);
    if (!answered) return { reason: unknown.length ? "unknown_proxy" : "no_proxy" };
    const party: Party = from === answered.supporterEmail ? "supporter" : "office";
    if (party === "office" && !(await isOffice(answered.id, from))) return { reason: "stranger" };
    return { letterId: answered.id, party, uncertain: false };
  }
  const own = await lettersOf({ email: from, politicianIds });
  if (own.length) {
    const ids = [...new Set(own.map((l) => l.id))];
    return { ...(await chooseLetter(ids, account, message, subject)), party: "supporter" };
  }
  const theirs = await lettersOf({ proxyIds: supporters.map((p) => p.id), politicianIds: [] });
  if (!theirs.length) return { reason: "stranger" };
  const chosen = await chooseLetter(
    theirs.map((l) => l.id),
    account,
    message,
    subject,
  );
  if (!(await isOffice(chosen.letterId, from))) return { reason: "stranger" };
  return { ...chosen, party: "office" };
}

/** Who a message was to and copied to, a line each as it came, for its event. */
function addressed(message: GmailMessageHeaders) {
  const line = (name: string) => {
    const value = message.headers.get(name);
    return value === undefined ? undefined : decodeWords(value);
  };
  return { to: line("to"), cc: line("cc") };
}

/** Keeps a message whole (letter_replies, and in Netlify Blobs). Returns its row's ID. */
async function keep(
  account: string,
  letterId: number,
  message: GmailMessageHeaders,
  raw: Buffer,
  party: Party,
  subject: string,
): Promise<number> {
  const from = fromAddress(message.headers.get("from"));
  const key = `${account}/${message.id}.eml.gz`;
  await saveLetterReply(key, gzipSync(raw));
  const [kept] = await query<{ id: number }>(
    `INSERT INTO letter_replies (letter_id, account, gmail_message_id, gmail_thread_id, rfc_message_id, from_address,
       from_name, subject, at, from_us, from_supporter, blob_key, size)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, $10, $11, $12) RETURNING id::int AS id`,
    [
      letterId,
      account,
      message.id,
      message.threadId,
      messageIds(message.headers.get("message-id"))[0] ?? null,
      from.address,
      from.name,
      subject,
      new Date(Number(message.internalDate)),
      party === "supporter",
      key,
      raw.length,
    ],
  );
  return kept.id;
}

/** Whether a message is one we sent, or a copy of one: by its Message-ID, or Gmail's ID for it in Sent. */
async function isOurs(account: string, message: GmailMessageHeaders): Promise<boolean> {
  const [id] = messageIds(message.headers.get("message-id"));
  const [row] = await query(
    `SELECT 1 FROM email_sends WHERE sender = $1 AND (rfc_message_id = $2 OR message_id = $3)
     UNION ALL SELECT 1 FROM letter_replies WHERE account = $1 AND (gmail_message_id = $3 OR rfc_message_id = $2)`,
    [account, id ?? null, message.id],
  );
  return !!row;
}

/** Records each address a bounce of an email we sent says failed. Returns how many, or undefined for a bounce of nothing we sent. */
async function bounce(
  account: string,
  raw: Buffer,
  message: GmailMessageHeaders,
  subject: string,
  request: Request | undefined,
) {
  const { addresses, messageId } = readBounce(raw.toString("latin1"));
  const [sent] = await query<{ messageId: string }>(
    `SELECT message_id AS "messageId" FROM email_sends WHERE sender = $1 AND outcome = 'sent' AND rfc_message_id = $2`,
    [account, messageId ?? null],
  );
  if (!sent) return undefined;
  for (const failed of addresses) {
    await handleDeliveryProblem(
      {
        address: failed.address,
        messageId: sent.messageId,
        kind: failed.delayed ? "soft" : "hard",
        reason: failed.reason || failed.status || subject,
        canReset: true,
        details: { ...(failed.status && { status: failed.status }), account },
        gmailMessageId: message.id,
      },
      request,
    );
  }
  return addresses.length;
}

/** An account's line of the run, with the letters inbox's counts. */
type LettersInboxRead = GmailRead & Required<Pick<GmailRead, "relayed" | "spam" | "uncertain" | "notUnderstood">>;

/** Reads one message of the letters inbox and files it (above); one gone since, skipped. */
async function readMessage(
  account: string,
  token: string,
  labels: Labels,
  id: string,
  read: LettersInboxRead,
  request: Request | undefined,
): Promise<void> {
  const message = await gmailMessageHeaders(token, id, HEADERS).catch(unlessGone);
  if (!message) return;
  // Our own: what we sent is in Sent, and a supporter's copy from when copies went to the MP's proxy, in the
  // Inbox too.
  if (message.labelIds.includes("SENT"))
    return message.labelIds.includes("INBOX") ? file(token, labels, id, "noted") : undefined;
  if (await isOurs(account, message)) return file(token, labels, id, "noted");
  const from = fromAddress(message.headers.get("from"));
  const subject = decodeWords(message.headers.get("subject") ?? "");
  const spam = message.labelIds.includes("SPAM");
  const notUnderstood = async (reason: NotUnderstoodReason) => {
    if (spam && reason !== "not_verified" && reason !== "over_cap") {
      read.spam++;
      return file(token, labels, id, "spam");
    }
    read.notUnderstood.push({ gmailMessageId: id, from: from.address, subject, reason });
    return file(token, labels, id, "notUnderstood");
  };
  // From one of our own addresses: a proxy's, or the site's own mail to it, a staff login link or alert.
  if (isLettersInboxAddress(from.address) || from.address.endsWith(`@${notifyDomain()}`)) {
    return file(token, labels, id, "noted");
  }
  const raw = await gmailRawMessage(token, id);
  if (/^(mailer-daemon|postmaster)@/.test(from.address)) {
    const bounces = await bounce(account, raw, message, subject, request);
    if (bounces === undefined) return notUnderstood("bounce");
    read.bounces += bounces;
    return file(token, labels, id, "noted");
  }
  const placed = await place(account, message, from.address, subject);
  if ("reason" in placed) return notUnderstood(placed.reason);
  const { letterId, party, uncertain } = placed;
  const auto = isMachineReply((name) => message.headers.get(name), subject);
  const event = {
    from: from.address,
    name: from.name,
    ...addressed(message),
    gmailMessageId: id,
    ...(uncertain && { uncertain }),
    // What received it, as every email's event says (sentBy in email.ts).
    ...sentBy({ name: "gmail", account }),
  };
  if (!authenticated(raw.toString("latin1"), from.address)) {
    await letterEvent(letterId, "not_relayed", { ...event, reason: "not_verified" });
    return notUnderstood("not_verified");
  }
  const replyId = await keep(account, letterId, message, raw, party, subject);
  await letterEvent(letterId, auto ? "auto_reply" : "replied", event);
  if (party === "office" && !auto) {
    await query("UPDATE letters SET replied_at = coalesce(replied_at, $2) WHERE id = $1", [
      letterId,
      new Date(Number(message.internalDate)),
    ]);
  }
  if (auto) read.autoReplies++;
  else read.replies++;
  if (uncertain) read.uncertain++;
  if (await overRelayCap(letterId)) {
    await letterEvent(letterId, "not_relayed", { gmailMessageId: id, reason: "over_cap" });
    return notUnderstood("over_cap");
  }
  await relay(letterId, replyId, party === "office");
  read.relayed++;
  return file(token, labels, id, "relayed");
}

/**
 * Reads the letters inbox's messages `ids`, in order, into `read`, the
 * account's line of the run. `request` is the job's call, for links in
 * alerts.
 */
export async function readLettersInbox(
  account: string,
  token: string,
  ids: string[],
  read: GmailRead,
  request: Request | undefined,
): Promise<GmailRead> {
  const tally: LettersInboxRead = { ...read, relayed: 0, spam: 0, uncertain: 0, notUnderstood: [] };
  const labels = new Labels(token);
  for (const id of ids) await readMessage(account, token, labels, id, tally, request);
  return tally;
}
