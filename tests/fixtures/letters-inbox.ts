// The fake Gmail's letters inbox (LETTERS_INBOX): a mailbox that keeps
// what's sent to its addresses, the plain one and every proxy, and serves
// it to the site's reading of it, so letters can be relayed end to end on
// fixture data. Every other account's mailbox is empty
// (outside-services.ts).
//
// One mailbox for each storyboard flow, by the database it names
// (`scope`), as flows run at once against one server; one for each Vitest
// process. Mail from outside, an MP's reply or a bounce, is a file a test
// writes in LETTERS_INBOX_DIR/<scope>/ (deliverToLettersInbox), which the
// server picks up the next time it looks, or in Vitest, put straight in.
// A file whose name ends .spam.eml arrives in Spam.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type InboxMessage = { id: string; raw: string; labels: Set<string>; historyId: number };

type Mailbox = { messages: InboxMessage[]; files: Set<string> };

/** The first history ID a mailbox has, as the fake profile says for any account. */
const FIRST_HISTORY = 1000;

const MAILBOXES = ((globalThis as { fixtureLettersInbox?: Map<string, Mailbox> }).fixtureLettersInbox ??= new Map());

/** The mailbox of `scope`, with any files written for it since it was last looked at. */
export function lettersMailbox(scope = "default"): Mailbox {
  let mailbox = MAILBOXES.get(scope);
  if (!mailbox) {
    mailbox = { messages: [], files: new Set() };
    MAILBOXES.set(scope, mailbox);
  }
  const dir = process.env.LETTERS_INBOX_DIR && join(process.env.LETTERS_INBOX_DIR, scope);
  if (dir && existsSync(dir)) {
    for (const file of readdirSync(dir).sort()) {
      if (mailbox.files.has(file)) continue;
      mailbox.files.add(file);
      receive(mailbox, readFileSync(join(dir, file), "latin1"), file.endsWith(".spam.eml"));
    }
  }
  return mailbox;
}

/** Puts a message in a mailbox, unread, in its Inbox or Spam. */
function receive(mailbox: Mailbox, raw: string, spam: boolean): InboxMessage {
  const historyId = FIRST_HISTORY + mailbox.messages.length + 1;
  const id = createHash("sha256").update(`${historyId}\n${raw}`).digest("hex").slice(0, 16);
  const message = { id, raw, labels: new Set([spam ? "SPAM" : "INBOX", "UNREAD"]), historyId };
  mailbox.messages.push(message);
  return message;
}

/** The mailbox's history ID now: its newest message's. */
export function historyIdOf(mailbox: Mailbox): number {
  return FIRST_HISTORY + mailbox.messages.length;
}

/** Delivers a message sent by the site, to one of the letters inbox's addresses, to its mailbox. */
export function deliverSent(raw: string, scope?: string): void {
  receive(lettersMailbox(scope), raw, false);
}

let written = 0;

/**
 * Delivers `raw`, a whole message, to the letters inbox of `scope`: a
 * file for the server to pick up where LETTERS_INBOX_DIR is set, else
 * straight into this process's mailbox. In Spam if `spam`.
 */
export function deliverToLettersInbox(raw: string, { scope = "default", spam = false } = {}): void {
  const dir = process.env.LETTERS_INBOX_DIR;
  if (!dir) {
    receive(lettersMailbox(scope), raw, spam);
    return;
  }
  mkdirSync(join(dir, scope), { recursive: true });
  const name = `${Date.now()}-${process.pid}-${String(++written).padStart(4, "0")}${spam ? ".spam" : ""}.eml`;
  writeFileSync(join(dir, scope, name), raw, "latin1");
}

/** A message's headers, by name as written, unfolded. */
function headersOf(raw: string): { name: string; value: string }[] {
  const end = raw.search(/\r?\n\r?\n/);
  return (end < 0 ? raw : raw.slice(0, end))
    .replace(/\r?\n[ \t]+/g, " ")
    .split(/\r?\n/)
    .filter((line) => line.includes(":"))
    .map((line) => ({
      name: line.slice(0, line.indexOf(":")).trim(),
      value: line.slice(line.indexOf(":") + 1).trim(),
    }));
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
}

/** The labels a mailbox has made, by name. */
const LABELS = ((globalThis as { fixtureInboxLabels?: Map<string, string> }).fixtureInboxLabels ??= new Map());

/**
 * The Gmail API, for the letters inbox: its history, its messages'
 * headers and whole, labelling and trashing them, and its labels.
 * Undefined for a call it doesn't answer, which the fake for every
 * account does.
 */
export function lettersInboxResponse(
  path: string,
  params: URLSearchParams,
  init: RequestInit | undefined,
  scope: string | undefined,
): Response | undefined {
  const mailbox = lettersMailbox(scope);
  const body = () => JSON.parse(String(init!.body)) as Record<string, unknown>;
  if (path === "/profile") return undefined;
  if (path === "/history") {
    const start = Number(params.get("startHistoryId"));
    const added = mailbox.messages.filter((m) => m.historyId > start);
    return json({
      historyId: String(historyIdOf(mailbox)),
      ...(added.length && {
        history: added.map((m) => ({ id: String(m.historyId), messagesAdded: [{ message: { id: m.id } }] })),
      }),
    });
  }
  if (path === "/labels") {
    if (init?.method === "POST") {
      const name = String(body().name);
      const id = `Label_${LABELS.size + 1}`;
      LABELS.set(name, id);
      return json({ id, name });
    }
    return json({
      labels: [
        { id: "INBOX", name: "INBOX", type: "system" },
        ...[...LABELS].map(([name, id]) => ({ id, name, type: "user" })),
      ],
    });
  }
  const match = /^\/messages\/(\w+)(\/modify|\/trash)?$/.exec(path);
  const message = match && mailbox.messages.find((m) => m.id === match[1]);
  if (!message) return undefined;
  if (match[2] === "/modify") {
    const { addLabelIds = [], removeLabelIds = [] } = body() as { addLabelIds?: string[]; removeLabelIds?: string[] };
    for (const label of removeLabelIds) message.labels.delete(label);
    for (const label of addLabelIds) message.labels.add(label);
    return json({ id: message.id, labelIds: [...message.labels] });
  }
  if (match[2] === "/trash") {
    message.labels.add("TRASH");
    return json({ id: message.id });
  }
  if (params.get("format") === "raw") {
    return json({
      id: message.id,
      threadId: message.id,
      raw: Buffer.from(message.raw, "latin1").toString("base64url"),
    });
  }
  const wanted = params.getAll("metadataHeaders").map((name) => name.toLowerCase());
  const headers = headersOf(message.raw);
  const date = Date.parse(headers.find((h) => h.name.toLowerCase() === "date")?.value ?? "");
  return json({
    id: message.id,
    threadId: message.id,
    labelIds: [...message.labels],
    internalDate: String(Number.isNaN(date) ? 0 : date),
    payload: { headers: headers.filter((h) => wanted.includes(h.name.toLowerCase())) },
  });
}

/** Empties every mailbox and forgets the labels made, for a test that starts afresh. */
export function resetLettersInbox(): void {
  MAILBOXES.clear();
  LABELS.clear();
}

/** A message's labels, by name: a system label's ID is its name, and the labels the site made are named as it made them. */
export function labelNames(message: InboxMessage): string[] {
  const names = new Map([...LABELS].map(([name, id]) => [id, name]));
  return [...message.labels].map((id) => names.get(id) ?? id).sort();
}
