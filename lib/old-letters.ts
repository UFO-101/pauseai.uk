import { docFromMarkup, toText } from "./letter-format";
import { FORM_VERSIONS, type FormVersion } from "./content/pauseai-info-form";
import type { MailingDoc } from "./mailing-doc";

// The rules of the import of letters written before the site could send them
// (lib/server/old-letters-import.ts): which sent email is which letter, which
// mailing each belongs to, what a reply answers, and what's left of a
// mailing's text once what each letter has of its own is taken out.

/** How long before production's time a letter's sent email can have gone, and after: Airtable noted it once it had. */
const SENT_BEFORE_MS = 5_000;
const SENT_AFTER_MS = 25 * 60_000;

/** A letter's time, given when its email went: the window it can be in. */
export function joinWindow(sentAt: Date): { from: Date; to: Date } {
  return { from: new Date(sentAt.getTime() - SENT_BEFORE_MS), to: new Date(sentAt.getTime() + SENT_AFTER_MS) };
}

/** A letter a sent email might be: a form letter has its sender. */
export type JoinCandidate = { id: number; at: Date; senderEmail?: string; senderName?: string };

/** A sent email's copy, to its people and text. */
export type SentCopy = { at: Date; cc: string[]; text: string };

/**
 * Which letter a sent email is, if only one fits: where several do, the
 * sender's address or name picks the form letter's email, and failing that,
 * the only one within a second of the nearest.
 */
export function joinSent(candidates: JoinCandidate[], sent: SentCopy): JoinCandidate | undefined {
  if (candidates.length < 2) return candidates[0];
  const bySender = candidates.filter(
    (c) =>
      (c.senderEmail && sent.cc.includes(c.senderEmail.trim().toLowerCase())) ||
      (c.senderName && sent.text.includes(c.senderName)),
  );
  const left = bySender.length ? bySender : candidates;
  if (left.length === 1) return left[0];
  const away = (c: JoinCandidate) => Math.abs(c.at.getTime() - sent.at.getTime());
  const near = [...left].sort((a, b) => away(a) - away(b));
  return near.filter((c) => away(c) - away(near[0]) < 1000).length === 1 ? near[0] : undefined;
}

/** Whether a sent email answers or passes on another, rather than starting a thread. */
export function isReplySubject(subject: string, inReplyTo: string | undefined): boolean {
  return Boolean(inReplyTo) || /^(re|fwd?):/i.test(subject.trim());
}

/**
 * The mailings the import fills: each send has its own, so the mailings list
 * shows it and its counts. `from` names a mailing there already, by its
 * tick box in Airtable; `key` one the import makes.
 */
export type OldMailing = {
  key: string;
  /** Its tick box in Airtable, if it's a mailing there already. */
  airtableField?: string;
  /** Its dates, for one the import makes: the constraints need them on an imported mailing. */
  between?: [string, string];
  /** The ask it makes, by slug. */
  ask?: string;
  /** Whether its letters are one text: "each its own" otherwise, keeping theirs whole. */
  template: boolean;
};

/** The DeepMind letter's ask, as lib/asks.ts names it. */
const DEEPMIND = "deepmind-letter";
const EDINBURGH = "edinburgh-conference-2026";

export const OLD_MAILINGS: readonly OldMailing[] = [
  { key: "deepmind-30-june", between: ["2025-06-04", "2025-06-20"], ask: DEEPMIND, template: true },
  { key: "deepmind-ten", between: ["2025-06-20", "2025-06-21"], ask: DEEPMIND, template: true },
  { key: "deepmind-25", between: ["2025-07-08", "2025-07-23"], ask: DEEPMIND, template: true },
  { key: "deepmind-40", between: ["2025-07-23", "2025-08-06"], ask: DEEPMIND, template: true },
  { key: "deepmind-august", between: ["2025-08-06", "2025-08-23"], ask: DEEPMIND, template: false },
  { key: "deepmind-others", airtableField: undefined, ask: DEEPMIND, template: false },
  { key: "documentary-everyone", airtableField: "Documentary Invitation", template: true },
  { key: "documentary-signatories", between: ["2025-10-13", "2025-10-14"], template: true },
  { key: "documentary-reminder", between: ["2025-10-20", "2025-10-21"], template: true },
  { key: "westminster-hall", airtableField: "Westminster Hall Debate Invitation", template: true },
  { key: "csrb", airtableField: "CSRB Iqbal Amendment", template: true },
  { key: "edinburgh", airtableField: "Edinburgh Conference Nov 26 Invitation", ask: EDINBURGH, template: true },
  { key: "ben-lake", airtableField: "Ben Lake October 2026 Debate", template: true },
  { key: "russell-speak", between: ["2026-06-15", "2026-08-04"], template: false },
  { key: "russell-cohost", between: ["2026-08-13", "2026-08-14"], template: true },
  { key: "conference-parliament", between: ["2026-09-03", "2026-09-04"], template: false },
  { key: "liability-own", between: ["2026-05-20", "2026-06-17"], template: false },
  { key: "frontier-own", between: ["2026-06-19", "2026-10-16"], template: false },
];

/** When the August DeepMind letters began, which went from a Gmail we can't read. */
const AUGUST_FROM = new Date("2025-08-06T00:00:00Z");
/** The first day a quote of an August letter says "join 50", not "join 40". */
const JOIN_50_FROM = new Date("2025-08-08T00:00:00Z");

/** A key among OLD_MAILINGS. */
export type OldMailingKey = (typeof OLD_MAILINGS)[number]["key"];

/** A text's words on one line, to look for a phrase in however it wrapped. */
const flat = (text: string) => text.replace(/\s+/g, " ");

/**
 * Which mailing a DeepMind letter belongs to, by the phrases of its text; by
 * its date for one whose text we can't read from August on; otherwise the
 * others, each its own.
 */
export function deepmindMailing(text: string | null, at: Date): OldMailingKey {
  if (text === null) return at >= AUGUST_FROM ? "deepmind-august" : "deepmind-others";
  const words = flat(text);
  if (/join 40 of your/.test(words)) return "deepmind-40";
  if (/join 25 of your/.test(words)) return "deepmind-25";
  if (/ten of your colleagues/i.test(words)) return "deepmind-ten";
  if (/by 30 June/.test(words)) return "deepmind-30-june";
  return "deepmind-others";
}

/**
 * Which of the documentary's sends a letter was, by its subject and text:
 * the first went to signatories under its own subject, and on the day, a
 * reminder thanking them went beside the invitation to everyone.
 */
export function documentaryMailing(subject: string, text: string): OldMailingKey {
  if (/documentary screening/i.test(subject)) return "documentary-signatories";
  return /thank you again for signing/i.test(flat(text)) ? "documentary-reminder" : "documentary-everyone";
}

/** The mailing of a mailing's letters as they're copied from Airtable, by its tick box or, for DeepMind's, its dates. */
export function mailingOfLetter(field: string | null, subject: string, text: string | null, at: Date): OldMailingKey {
  if (field === "Documentary Invitation") return documentaryMailing(subject, text ?? "");
  const named = OLD_MAILINGS.find((mailing) => mailing.airtableField && mailing.airtableField === field);
  return named ? named.key : deepmindMailing(text, at);
}

/** A sent email with no letter that's one all the same, by its subject: a letter production has no record of. */
export function mailingOfNewLetter(subject: string, text: string, at: Date): OldMailingKey | undefined {
  const about = subject.trim();
  if (/^Invitation to speak on panel with Professor Stuart Russell/i.test(about)) return "russell-speak";
  if (/^Invitation to Co-host Panel Discussion on AI Risk/i.test(about)) return "russell-cohost";
  if (/^PauseAI Conference in Parliament/i.test(about)) return "conference-parliament";
  if (/^Request to co-sign letter on AI liability/i.test(about)) return "liability-own";
  if (/^Request to co-sign letter on frontier AI risks/i.test(about)) return "frontier-own";
  if (/^Westminster Hall Debate on AI Safety/i.test(about)) return "westminster-hall";
  if (/^Request to co-sign letter on Google's breach/i.test(about)) return deepmindMailing(text, at);
  return undefined;
}

/** A text's paragraphs, each on one line: a mail's plain text wraps within them. */
export function paragraphs(text: string): string[] {
  return text
    .replace(/\r/g, "")
    .split(/\n[ \t]*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}

/** The part of a mailing's text with what each letter has of its own taken out. */
export type OldTemplate = { before: string[]; after: string[] };

/** A paragraph that opens a letter by name. */
const isGreeting = (paragraph: string) => /^(dear|hi|hello)\b/i.test(paragraph);

/** The share of a mailing's letters that must have a paragraph, more than this, for it to be the mailing's own. */
const SHARED = 0.5;

/**
 * A mailing's template, from its letters' texts: the paragraphs most of them
 * share, in the order they come, split where most letters have one of their
 * own, between the shared ones. Undefined if they share nothing.
 */
export function templateOf(texts: string[]): OldTemplate | undefined {
  const letters = texts.map((text) => paragraphs(text).filter((p, i) => !(i === 0 && isGreeting(p))));
  const counts = new Map<string, number>();
  for (const letter of letters) for (const p of new Set(letter)) counts.set(p, (counts.get(p) ?? 0) + 1);
  const isShared = (p: string) => counts.get(p)! > letters.length * SHARED;
  const order = letters.find((letter) => letter.filter(isShared).length === [...counts.keys()].filter(isShared).length);
  if (!order) return undefined;
  const shared = order.filter(isShared);
  if (!shared.length) return undefined;
  // Where the letters' own paragraphs fall: after how many of the shared ones.
  const slots = new Map<number, number>();
  for (const letter of letters) {
    let seen = 0;
    let own = -1;
    for (const p of letter) {
      if (isShared(p)) seen++;
      else if (own < 0) own = seen;
    }
    if (own >= 0) slots.set(own, (slots.get(own) ?? 0) + 1);
  }
  const slot = [...slots].sort((a, b) => b[1] - a[1])[0]?.[0] ?? shared.length;
  return { before: shared.slice(0, slot), after: shared.slice(slot) };
}

/** What a letter has of its own within its template: its greeting and own paragraph. */
export type OldLetterValues = { values: { greeting: string; own: string }; meets: string[] };

/** A letter's own part, if it fits its template: its greeting, shared paragraphs in order, and at most one run of its own between. */
export function fitTemplate(text: string, template: OldTemplate): OldLetterValues | undefined {
  const all = paragraphs(text);
  const greeting = all[0] && isGreeting(all[0]) ? all[0] : "";
  const rest = greeting ? all.slice(1) : all;
  const { before, after } = template;
  const starts = before.every((p, i) => rest[i] === p);
  const ends = after.every((p, i) => rest[rest.length - after.length + i] === p);
  if (!starts || !ends || rest.length < before.length + after.length) return undefined;
  const own = rest.slice(before.length, rest.length - after.length).join("\n\n");
  return { values: { greeting, own }, meets: [] };
}

const textParagraph = (text: string): MailingDoc["content"][number] => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});
const fieldParagraph = (field: string): MailingDoc["content"][number] => ({
  type: "paragraph",
  content: [{ type: "field", attrs: { field } }],
});

/** A template as a mailing's text, its greeting and own paragraph its fields. */
export function templateDoc({ before, after }: OldTemplate): MailingDoc {
  return {
    type: "doc",
    content: [
      fieldParagraph("greeting"),
      ...before.map(textParagraph),
      fieldParagraph("own"),
      ...after.map(textParagraph),
    ],
  };
}

/** How many colleagues an August letter said to join, by its date: the only thing quotes of them differ in. */
export function augustColleagues(at: Date): string {
  return at >= JOIN_50_FROM ? "50" : "40";
}

/**
 * The August letters' text, from replies quoting one: its paragraphs most
 * quotes share, each number of colleagues a field, as they went out in turn.
 * The greeting, and what each letter had of its own, can't be told.
 */
export function augustTemplate(quotes: string[]): MailingDoc | undefined {
  const asTemplate = (p: string) => p.replace(/join \d+ of your/g, "join {colleagues} of your");
  // A reply's mail system adds its own disclaimer under what it quotes.
  const ours = (p: string) => !/disclaimer|e-?mail is confidential/i.test(p);
  const template = templateOf(quotes.map((quote) => paragraphs(quote).filter(ours).map(asTemplate).join("\n\n")));
  if (!template) return undefined;
  const words = [...template.before, ...template.after];
  return {
    type: "doc",
    content: [
      fieldParagraph("greeting"),
      ...words.map((p): MailingDoc["content"][number] => {
        const [start, end] = p.split("{colleagues}");
        return end === undefined
          ? textParagraph(p)
          : {
              type: "paragraph",
              content: [
                { type: "text", text: start },
                { type: "field", attrs: { field: "colleagues" } },
                { type: "text", text: end },
              ],
            };
      }),
    ],
  };
}

/** How long after a commit its version was live: Netlify's deploy of pauseai.info. */
const DEPLOY_MS = 10 * 60_000;

/** The form's version live at `at`; the first, for a letter before it. */
export function formVersionAt(at: Date): FormVersion {
  const live = FORM_VERSIONS.filter((v) => new Date(v.committedAt).getTime() + DEPLOY_MS <= at.getTime());
  return live.at(-1) ?? FORM_VERSIONS[0];
}

/** Who a form letter's draft is from and to. */
export type FormNames = { salutation: string; constituency: string; name: string; postcode: string };

/** A form version with its names filled in, as the letter's page compares a letter with. */
export function formDraft(version: FormVersion, names: FormNames): string {
  const filled = version.text
    .replaceAll("{salutation}", names.salutation)
    .replaceAll("{constituency}", names.constituency)
    .replaceAll("{name}", names.name)
    .replaceAll("{postcode}", names.postcode.toUpperCase());
  return toText(docFromMarkup(filled));
}

/** What a reply's subject says beside the letter's: without Re:, Automatic reply: and the like, or a case's reference. */
export function plainSubject(subject: string): string {
  return subject
    .replace(/\(?case ref:?[^)]*\)?/i, "")
    .replace(
      /^((re|fw|fwd|aw|automatic reply|auto(matic)? ?response|automated (reply|response)|out of office|ooo|autoreply|thank you for your email)\s*:\s*)+/gi,
      "",
    )
    .trim()
    .toLowerCase();
}

/** Whether a reply's subject is the letter's. */
export function sameSubject(reply: string, letter: string): boolean {
  const ours = plainSubject(letter);
  return ours.length > 0 && plainSubject(reply).includes(ours);
}

/** A subject that says it's an acknowledgement, beyond those isMachineReply knows, which an office's system writes. */
export function isAcknowledgement(subject: string): boolean {
  return (
    /^(automatic reply|auto(matic)?[ -]?(reply|response)|automated (reply|response)|out of office|ooo\b|autoreply)/i.test(
      subject,
    ) ||
    /^(thank you for (contacting|your email|getting in touch|emailing)|thanks for (contacting|your email)|acknowledg)/i.test(
      subject,
    ) ||
    /automatic reply|automated response|out of office/i.test(subject)
  );
}

/** A letter a reply from its politician might answer. */
export type ReplyCandidate = {
  id: number;
  at: Date;
  subject: string;
  senderEmail?: string;
  senderName?: string;
};

/** The headers of a quoted message: who it was from and to, and when it was sent, as written there. */
export type QuotedHeaders = { from: string; sent: string; to: string; cc: string; subject: string };

const ONE_MINUTE = 60_000;
const DAY = 24 * 60 * ONE_MINUTE;

/** Each message a text quotes or forwards, by its From, Sent, To and Cc block. */
export function quotedHeaders(text: string): QuotedHeaders[] {
  const clean = text.replace(/\r/g, "").replace(/^[> ]+/gm, "");
  const lines = clean.split("\n");
  const found: QuotedHeaders[] = [];
  const field = (line: string, name: string) =>
    new RegExp(`^\\*?${name}:\\*?\\s*(.*)$`, "i").exec(line.trim())?.[1]?.trim();
  for (let i = 0; i < lines.length; i++) {
    const from = field(lines[i], "from");
    if (from === undefined) continue;
    const block: QuotedHeaders = { from, sent: "", to: "", cc: "", subject: "" };
    for (const line of lines.slice(i + 1, i + 12)) {
      if (!line.trim()) continue;
      const sent = field(line, "sent") ?? field(line, "date");
      const to = field(line, "to");
      const cc = field(line, "cc");
      const subject = field(line, "subject");
      if (sent !== undefined) block.sent = sent;
      else if (to !== undefined) block.to = to;
      else if (cc !== undefined) block.cc = cc;
      else if (subject !== undefined) block.subject = subject;
      else break;
    }
    if (block.sent) found.push(block);
  }
  for (const match of clean.matchAll(
    /^On (.{5,120}?),? (?:at )?.{0,60}?<?([\w.+'&-]+@[\w.-]+\.\w+)>?\s*wrote:\s*$/gim,
  )) {
    found.push({ from: match[2], sent: match[1], to: "", cc: "", subject: "" });
  }
  return found;
}

/** The addresses in some header's text, lowercased. */
export function addressesIn(line: string): string[] {
  return (line.toLowerCase().match(/[\w.+'&-]+@[\w.-]+\.\w+/g) ?? []).filter(Boolean);
}

/** A quoted time as a moment, whichever way its mailer wrote it. */
function quotedTime(sent: string): number | undefined {
  const at = Date.parse(
    sent
      .replace(/ at /, " ")
      .replace(/(\d)(st|nd|rd|th)\b/, "$1")
      .replace(/^(\d\d)\/(\d\d)\/(\d{4})/, "$2/$1/$3"),
  );
  return Number.isNaN(at) ? undefined : at;
}

/** Whether a quoted message is the letter, by its Sent time, in UTC or British Summer Time. */
function quoteIsLetter(quote: QuotedHeaders, letter: ReplyCandidate): boolean {
  const at = quotedTime(quote.sent);
  if (at === undefined) return false;
  return [0, 3_600_000].some((shift) => Math.abs(letter.at.getTime() - (at - shift)) < 2 * ONE_MINUTE);
}

/** What's known of a reply from a politician, to place it. */
export type ReplyToPlace = {
  at: Date;
  subject: string;
  automatic: boolean;
  /** Its whole text, once read: only a person's reply is, and only when it's needed. */
  text?: string;
  /** Read from the group's mail, where a form letter's replies were copied. */
  group?: boolean;
};

/** Which rule placed a reply, by the plan's order. */
export type ReplyRule = "subject" | "time" | "sender" | "quote";

/**
 * Which of a politician's letters a reply answers, past the rules a Gmail
 * thread and Message-ID settle: the politician plus the letter's subject, the
 * latest before it if several; for an automatic reply, the time, within 3
 * days, with no other letter to them within 20 minutes; then, once its text
 * is read, a form letter's sender's address or name in it; and when stuck,
 * the original it quotes. None if one letter doesn't fit.
 */
export function placeReply(
  letters: ReplyCandidate[],
  reply: ReplyToPlace,
): { id: number; rule: ReplyRule } | undefined {
  const before = letters
    .filter((letter) => letter.at.getTime() <= reply.at.getTime() + ONE_MINUTE)
    .sort((a, b) => b.at.getTime() - a.at.getTime());
  if (!before.length) return undefined;
  const bySubject = before.filter((letter) => sameSubject(reply.subject, letter.subject));
  if (bySubject.length) return { id: bySubject[0].id, rule: "subject" };
  if (reply.automatic) {
    const [latest, next] = before;
    const recent = reply.at.getTime() - latest.at.getTime() < 3 * DAY;
    const alone = !next || latest.at.getTime() - next.at.getTime() > 20 * ONE_MINUTE;
    return recent && alone ? { id: latest.id, rule: "time" } : undefined;
  }
  if (reply.text === undefined) return undefined;
  const text = reply.text.toLowerCase();
  const byAddress = before.filter((l) => l.senderEmail && text.includes(l.senderEmail.trim().toLowerCase()));
  if (byAddress.length === 1) return { id: byAddress[0].id, rule: "sender" };
  const byName = before.filter((l) => l.senderName && text.includes(l.senderName.trim().toLowerCase()));
  if (byName.length === 1) return { id: byName[0].id, rule: "sender" };
  const quotes = quotedHeaders(reply.text);
  const byQuote = before.filter((letter) => quotes.some((quote) => quoteIsLetter(quote, letter)));
  if (byQuote.length === 1) return { id: byQuote[0].id, rule: "quote" };
  // In the group's mail, a form letter's politician with only that letter.
  return reply.group && before.length === 1 && before[0].senderEmail ? { id: before[0].id, rule: "quote" } : undefined;
}

/**
 * Which letter a reply of ours answers, past a Gmail thread and Message-ID, by
 * placeReply's rules: among the letters of a supporter it copies, or else only
 * PauseAI's own, as it can't be told which of the politician's constituents a
 * reply copying none is about.
 */
export function placeOurReply(
  letters: ReplyCandidate[],
  reply: { at: Date; subject: string; addresses: string[]; text?: string },
): number | undefined {
  const theirs = letters.filter((l) => l.senderEmail && reply.addresses.includes(l.senderEmail.trim().toLowerCase()));
  const candidates = theirs.length ? theirs : letters.filter((l) => !l.senderEmail);
  return placeReply(candidates, { at: reply.at, subject: reply.subject, text: reply.text, automatic: false })?.id;
}

/** Who a message is really from: the group rewrote many Froms as "'Some MP' via PauseAI UK", with the real one elsewhere. */
export function realSender(from: string, originalFrom?: string, replyTo?: string): string {
  if (originalFrom) return originalFrom;
  return / via /i.test(from) && replyTo ? firstMailbox(replyTo) : from;
}

/** The first of the addresses on a header's line, a comma inside a quoted name not ending it. */
function firstMailbox(line: string): string {
  return /^(?:"[^"]*"|[^,"])*/.exec(line)![0].trim();
}

/**
 * Curly quotes and dashes as Joseph's sends have them: whatever sent those mail
 * kept only each character's low byte, which leaves a control character.
 */
export const CUT_DOWN_CHARACTERS = "\x13\x14\x18\x19\x1c\x1d";

/** The characters those were, in the same order. */
export const WHOLE_CHARACTERS = "\u2013\u2014\u2018\u2019\u201c\u201d";

/** A text with its cut-down characters whole again. */
export function restoreCutDown(text: string): string {
  return text.replace(/[\x13\x14\x18\x19\x1c\x1d]/g, (c) => WHOLE_CHARACTERS[CUT_DOWN_CHARACTERS.indexOf(c)]);
}
