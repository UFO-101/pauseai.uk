import { contactState, type Topic } from "./contact-permissions";
import { staffCopy } from "./content/staff-interface";
import { GMAIL_DAILY_LIMIT } from "./gmail-connect";
import { inlinesOf, isBlankMailing, type MailingDoc, type MailingRecipientValues } from "./mailing-doc";
import { now } from "./now";
import { anyAndNone, valuesOf, type ParamValue } from "./staff-search";

// The rules of messages to supporters, for the server to keep and the pages
// to say: how the Contact filter fixes a message's channel and topic, its
// merge fields, what it costs, and what stops it being scheduled.

/** How a message goes. Staff choose text, never the backend that sends it. */
export type MessageChannel = "email" | "text";

/** What a message is, fixed when it's made: its channel and its topic. */
export type MessageTerms = { channel: MessageChannel; topic: Topic };

/**
 * A message's channel and topic, from the supporters list's Contact filter:
 * one topic, answered yes. Undefined for anything else, as "not sure" isn't
 * enough, and two topics wouldn't say which it's about. What the filter leaves
 * out doesn't count.
 */
export function messageTerms(contact: ParamValue | undefined): MessageTerms | undefined {
  const [found] = anyAndNone(valuesOf(contact), (values) => values.flatMap((value) => contactState(value) ?? []));
  if (found?.length !== 1) return undefined;
  const [{ channel, topic, send }] = found;
  if (!topic || send !== "yes") return undefined;
  return { channel: channel === "email" ? "email" : "text", topic };
}

/** The merge fields of a message to supporters. No one has all of them, so each has a fallback. */
export const MESSAGE_FIELDS = ["firstName", "localGroup", "mp"] as const;

/** Each merge field's words, as a template's row and a title say it. */
export const FIELD_WORDS: Record<string, string> = staffCopy.messagePages.fieldWords;

/** A message's merge fields filled in with their own words, `{first name}`, to show its words for everyone. */
export const FIELDS_AS_WORDS: MailingRecipientValues = {
  values: Object.fromEntries(MESSAGE_FIELDS.map((field) => [field, `{${FIELD_WORDS[field]}}`])),
  meets: [],
};

/** The condition that someone has a value for a field. */
export function hasField(field: string): string {
  return `has:${field}`;
}

/** The condition that someone volunteers, and that they're a member. */
export const VOLUNTEER_CONDITION = "volunteer:yes";
export const MEMBER_CONDITION = "member:yes";

/** Who an email to supporters appears from, unless a connected Gmail is chosen. */
export const MESSAGE_SENDER = { name: "PauseAI UK", email: "hello@pauseai.uk" };

/** The name a text appears from: the WhatsApp business account's. */
export const TEXT_SENDER_NAME = "PauseAI UK";

/** How long after its time a text may still go, a fixed limit nobody sets. */
const TEXT_SENDS_FOR_DAYS = 3;

/** When a text due at `dueAt` stops sending, as an ISO string. */
export function textStopsAt(dueAt: string): string {
  return new Date(Date.parse(dueAt) + TEXT_SENDS_FOR_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

/** A reply to a text is free for this long after the person's last message. */
export const TEXT_REPLY_HOURS = 24;

/** Until when a reply to a text can go, as an ISO string: `TEXT_REPLY_HOURS` after their last message, or never with none. */
export function textReplyUntil(lastFromThem: string | null): string | null {
  return lastFromThem && new Date(Date.parse(lastFromThem) + TEXT_REPLY_HOURS * 60 * 60 * 1000).toISOString();
}

/** What an email costs by Postmark's broadcast stream, in dollars (https://postmarkapp.com/pricing). */
const EMAIL_DOLLARS_EACH = 0.00125;

/** What a text costs when delivered, in pence, for a marketing message to the UK (https://whatsappbusiness.com/products/platform-pricing/). */
const TEXT_PENCE_EACH = 4.4;

/** What `n` messages by `channel` cost, in words. */
export function messageCost(channel: MessageChannel, n: number): string {
  const copy = staffCopy.messagePages.cost;
  return channel === "email"
    ? copy.email((n * EMAIL_DOLLARS_EACH).toFixed(2))
    : copy.text(((n * TEXT_PENCE_EACH) / 100).toFixed(2), TEXT_PENCE_EACH);
}

/** The most of a message's words its title and a template's row say. */
const FIRST_WORDS = 80;

/** A message's first words, its merge fields each as `{label}`, for a title or a template's row. */
export function firstWords(doc: MailingDoc, labels: Record<string, string>): string {
  const words = doc.content
    .flatMap((block) => [...inlinesOf(block), { type: "hardBreak" as const }])
    .map((node) => {
      if (node.type === "field") return `{${labels[node.attrs.field] ?? node.attrs.field}}`;
      return node.type === "text" ? node.text : " ";
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  return words.length > FIRST_WORDS ? `${words.slice(0, FIRST_WORDS).trimEnd()}…` : words;
}

export type MessageScheduleProblem =
  | "unknown-filter"
  | "no-recipients"
  | "no-subject"
  | "no-letter"
  | "no-template"
  | "not-connected"
  | "too-many"
  | "no-time"
  | "time-passed"
  | "cannot-send";

/** A message as far as scheduling it goes. */
export type SchedulingMessage = {
  channel: MessageChannel;
  subject: string;
  body: MailingDoc;
  dueAt: string | null;
  /** How many it goes to. */
  recipients: number;
  /** The values of its filter the site no longer knows. */
  unknown: string[];
  /** Whether it's from a staff member's Gmail, and whether that's connected. */
  byGmail: boolean;
  connected: boolean;
  /** Whether its channel sends yet. */
  sends: boolean;
};

/**
 * What stops a message being scheduled: none, for one that can be. Unlike a
 * mailing to politicians, a field some recipients lack doesn't, as each has
 * a fallback. A text with no words has no template chosen yet.
 */
export function messageScheduleProblems(message: SchedulingMessage): MessageScheduleProblem[] {
  const blank = isBlankMailing(message.body);
  const email = message.channel === "email";
  // In the order of the page's sections: who it's to, what's written, who it's from, when.
  const checks: [MessageScheduleProblem, boolean][] = [
    ["unknown-filter", message.unknown.length > 0],
    ["no-recipients", message.recipients === 0],
    ["no-subject", email && !message.subject.trim()],
    ["no-letter", email && blank],
    ["no-template", !email && blank],
    ["not-connected", message.byGmail && !message.connected],
    ["too-many", message.byGmail && message.recipients > GMAIL_DAILY_LIMIT],
    ["no-time", !message.dueAt],
    ["time-passed", Boolean(message.dueAt) && new Date(message.dueAt!) <= now()],
    ["cannot-send", !message.sends],
  ];
  return checks.filter(([, fails]) => fails).map(([problem]) => problem);
}
