import "server-only";
import type { MailingDoc, MailingRecipientValues } from "@/lib/mailing-doc";
import { checkMailingDoc } from "@/lib/mailing-doc";
import type { MailingChoice } from "@/lib/mailing-fields";
import { mailingGroups, type MailingGroup } from "@/lib/mailing-groups";
import { now } from "@/lib/now";
import { firstOf, pageNumber, type ParamValue, type StoredFilter } from "@/lib/staff-search";
import { textReplyUntil, type MessageChannel, type MessageTerms } from "@/lib/supporter-messages";
import { staffCopy } from "@/lib/content/staff-interface";
import { query } from "./db";
import { gmailAccounts, type GmailAccount } from "./gmail-accounts";
import { isLettersInboxAddress } from "./letters-inbox";
import { messageBackend, textSenderNumber } from "./message-channels";
import { approvedTemplates, getWrittenMessage, type MessageTemplate, type WrittenMessage } from "./message-drafts";
import { supporterAudience, type MessageLeftOut, type SupporterRecipient } from "./message-recipients";
import type { MailingSummary } from "./mailings";
import { checkStoredFilter, filterProblems } from "./stored-filters";
import { supporterChoices, type SupporterChoices } from "./supporters";

// What the pages of messages to supporters show: the list of them, a draft
// to write, one scheduled or sent with its recipients, and one copy with its
// replies. To staff, messages are apart from mailings, though both are rows
// of `mailings`, so this reads only those to supporters.

/** A message in the list: a mailing's summary, with what only a message has. */
export type MessageSummary = MailingSummary & {
  channel: MessageChannel;
  /** Copies its provider says arrived, of the `sent` that have gone. */
  delivered: number;
  read: number;
  /** Scheduled on new words, which WhatsApp hasn't yet decided on. */
  waiting: boolean;
};

const STOPPED = "(c.status = 'cancelled' OR c.skip_reason = 'unsubscribed')";
const FAILED = "(c.status = 'failed' OR (c.status = 'skipped' AND c.skip_reason <> 'unsubscribed'))";
const WAS_READ = "EXISTS (SELECT 1 FROM message_events e WHERE e.message_id = c.id AND e.kind = 'read')";
const REPLIED = "EXISTS (SELECT 1 FROM message_replies r WHERE r.message_id = c.id AND r.sent_by IS NULL)";

const SELECT_MESSAGES = `
  SELECT m.id::int AS id, m.title, m.ask, NULL AS "askTitle", false AS imported, m.state, m.created_by AS "createdBy",
    coalesce(nullif(m.from_name, ''), m.sent_from) AS "fromName", m.sent_from AS "sentFrom", m.due_at AS "dueAt",
    m.updated_at AS "updatedAt", m.channel, (m.state = 'scheduled' AND t.status IS NOT DISTINCT FROM 'pending') AS waiting,
    min(c.sent_at) AS "sentAt",
    count(c.id)::int AS "to",
    count(c.id) FILTER (WHERE c.status IN ('sent', 'delivered'))::int AS sent,
    count(c.id) FILTER (WHERE c.status = 'delivered')::int AS delivered,
    count(c.id) FILTER (WHERE ${FAILED})::int AS failed,
    count(c.id) FILTER (WHERE ${STOPPED})::int AS stopped,
    count(c.id) FILTER (WHERE ${WAS_READ})::int AS read,
    count(c.id) FILTER (WHERE ${REPLIED})::int AS replied,
    0 AS answered
  FROM mailings m LEFT JOIN message_templates t ON t.id = m.template_id
    LEFT JOIN messages_to_supporters c ON c.mailing_id = m.id
  WHERE m.audience = 'supporters'`;

/** The page of messages: what's coming up, and those sent under their months and years; and now, which says which year needn't be written. */
export async function messagesPage(): Promise<{ groups: MailingGroup<MessageSummary>[]; now: string }> {
  const [drafts, all] = await Promise.all([
    query<MessageSummary & { filter: unknown; topic: MessageTerms["topic"] }>(
      `SELECT d.*, f.filter, f.topic FROM (${SELECT_MESSAGES} AND m.state = 'draft' GROUP BY m.id, t.status) d
       JOIN (SELECT id::int AS id, filter, topic FROM mailings) f USING (id) ORDER BY d."updatedAt" DESC, d.id DESC`,
    ),
    query<MessageSummary>(
      `${SELECT_MESSAGES} AND m.state <> 'draft' GROUP BY m.id, t.status ORDER BY min(c.sent_at) DESC NULLS FIRST, m.id DESC`,
    ),
  ]);
  const counted = await Promise.all(
    drafts.map(async ({ filter, topic, ...draft }) => ({
      ...draft,
      to: (await supporterAudience(checkStoredFilter(filter)!, { channel: draft.channel, topic })).recipients.length,
    })),
  );
  const coming = (m: MessageSummary) => m.state === "scheduled" || m.state === "sending";
  const at = now();
  return {
    groups: mailingGroups(
      {
        drafts: counted,
        comingUp: all.filter(coming).sort((a, b) => Date.parse(a.dueAt!) - Date.parse(b.dueAt!)),
        sent: all.filter((m) => !coming(m)),
      },
      at,
    ),
    now: at.toISOString(),
  };
}

/** One recipient of a message, on its page. */
export type MessageRecipient = {
  copyId: number;
  supporterId: number | null;
  /** None for someone erased since. */
  name: string | null;
  place: string | null;
  status: string;
  skipReason: string | null;
  sentAt: string | null;
  read: boolean;
  replies: number;
};

/** Which of a message's recipients its page lists. */
export const MESSAGE_TABS = ["all", "delivered", "failed", "stopped", "read", "replied"] as const;
export type MessageTab = (typeof MESSAGE_TABS)[number];

const TAB_CONDITIONS: Record<MessageTab, string> = {
  all: "true",
  delivered: "c.status = 'delivered'",
  failed: FAILED,
  stopped: STOPPED,
  read: WAS_READ,
  replied: REPLIED,
};

const RECIPIENTS_PAGE_SIZE = 100;

/** A recipient, as the preview picks and fills in their copy. */
export type MessagePreviewRecipient = Pick<SupporterRecipient, "id" | "name" | "address"> & MailingRecipientValues;

/** What writing a message needs. */
export type MessageWriterData = {
  filter: StoredFilter;
  choices: SupporterChoices;
  /** The values of the filter the site no longer knows. */
  unknown: string[];
  /** How many it goes to; and one of them for each mix of conditions, which is all a preview needs. */
  count: number;
  recipients: MessagePreviewRecipient[];
  leftOut: MessageLeftOut[];
  fields: MailingChoice[];
  conditions: MailingChoice[];
  /** The connected Gmail accounts an email can be from instead. */
  senders: GmailAccount[];
  me: string;
  /** Whether a message can be sent yet. */
  sends: boolean;
  templates: MessageTemplate[];
  /** The WhatsApp business account's number, if one is set. */
  textNumber: string | null;
};

export type MessagePageData =
  | ({ kind: "draft"; draft: WrittenMessage } & MessageWriterData)
  | {
      kind: "written";
      written: WrittenMessage;
      summary: MessageSummary;
      choices: SupporterChoices;
      tab: MessageTab;
      recipients: MessageRecipient[];
      recipientsTotal: number;
      page: number;
      pages: number;
      pageSize: number;
    };

/** One recipient for each mix of conditions they meet. */
function oneOfEachMix(recipients: SupporterRecipient[]): MessagePreviewRecipient[] {
  const mixes = new Map<string, MessagePreviewRecipient>();
  for (const { id, name, address, values, meets } of recipients) {
    const mix = meets.toSorted().join();
    if (!mixes.has(mix)) mixes.set(mix, { id, name, address, values, meets });
  }
  return [...mixes.values()];
}

async function writerData(draft: WrittenMessage, me: string): Promise<MessageWriterData> {
  const [audience, unknown, choices, senders, templates] = await Promise.all([
    supporterAudience(draft.filter, draft),
    filterProblems(draft.filter),
    supporterChoices(),
    gmailAccounts(),
    approvedTemplates(),
  ]);
  return {
    filter: draft.filter,
    choices,
    unknown,
    count: audience.recipients.length,
    recipients: oneOfEachMix(audience.recipients),
    leftOut: audience.leftOut,
    fields: audience.fields,
    conditions: audience.conditions,
    // Never the letters inbox, which sends supporters' letters and nothing else.
    senders: senders.filter((sender) => !isLettersInboxAddress(sender.email)),
    me,
    sends: Boolean(messageBackend()),
    templates,
    textNumber: textSenderNumber(),
  };
}

/**
 * A message's page: a draft, to write, which opening keeps from being tidied
 * away; or one scheduled or sent, with a page of its recipients in a tab; as
 * `me`, the staff member looking. Undefined for none.
 */
export async function messagePageData(
  id: number,
  search: { page?: ParamValue; tab?: ParamValue },
  me: string,
): Promise<MessagePageData | undefined> {
  const written = await getWrittenMessage(id, true);
  if (!written) return undefined;
  if (written.state === "draft") return { kind: "draft", draft: written, ...(await writerData(written, me)) };
  const tab = MESSAGE_TABS.find((one) => one === firstOf(search.tab)) ?? "all";
  const page = pageNumber(firstOf(search.page));
  const from = `FROM messages_to_supporters c WHERE c.mailing_id = $1 AND ${TAB_CONDITIONS[tab]}`;
  const [[summary], recipients, [{ total }], choices] = await Promise.all([
    query<MessageSummary>(`${SELECT_MESSAGES} AND m.id = $1 GROUP BY m.id, t.status`, [id]),
    query<MessageRecipient>(
      `SELECT c.id::int AS "copyId", c.supporter_id::int AS "supporterId", c.merge_values ->> 'name' AS name,
         c.merge_values ->> 'place' AS place, c.status, c.skip_reason AS "skipReason", c.sent_at AS "sentAt",
         ${WAS_READ} AS read,
         (SELECT count(*)::int FROM message_replies r WHERE r.message_id = c.id AND r.sent_by IS NULL) AS replies
       ${from} ORDER BY c.merge_values ->> 'name' NULLS LAST, c.id LIMIT $2 OFFSET $3`,
      [id, RECIPIENTS_PAGE_SIZE, (page - 1) * RECIPIENTS_PAGE_SIZE],
    ),
    query<{ total: number }>(`SELECT count(*)::int AS total ${from}`, [id]),
    supporterChoices(),
  ]);
  return {
    kind: "written",
    written,
    summary,
    choices,
    tab,
    recipients,
    recipientsTotal: total,
    page,
    pages: Math.max(1, Math.ceil(total / RECIPIENTS_PAGE_SIZE)),
    pageSize: RECIPIENTS_PAGE_SIZE,
  };
}

/** A message's title, for its page's title, one with none said so; or undefined for no such message. */
export async function messageTitle(id: number): Promise<string | undefined> {
  const [message] = await query<{ title: string }>(
    "SELECT title FROM mailings WHERE id = $1 AND audience = 'supporters'",
    [id],
  );
  return message && (message.title || staffCopy.messagePages.untitled);
}

/** What was said after a message: `sentBy` for a staff member's answer, none for the supporter's reply. */
export type MessageReply = { id: number; at: string; body: string; sentBy: string | null };

/** One supporter's copy of a message, and every reply, oldest first. */
export type MessageCopy = {
  id: number;
  messageId: number;
  title: string;
  channel: MessageChannel;
  /** How many the whole message went to. */
  to: number;
  subject: string;
  body: MailingDoc;
  fromName: string;
  sentFrom: string;
  /** What's kept of them: none once they're erased. */
  supporterId: number | null;
  name: string | null;
  address: string | null;
  merge: MailingRecipientValues | null;
  status: string;
  skipReason: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  replies: MessageReply[];
  /** Until when a reply to a text can go; none until they've written. */
  replyUntil: string | null;
  /** Whether a reply can be sent yet. */
  sends: boolean;
  now: string;
};

/** One copy of a message, by its message's ID and its own; or undefined. */
export async function messageCopy(messageId: number, copyId: number): Promise<MessageCopy | undefined> {
  const [row] = await query<Omit<MessageCopy, "replies" | "replyUntil" | "sends" | "now">>(
    `SELECT c.id::int AS id, m.id::int AS "messageId", m.title, m.channel, m.subject, m.body,
       m.from_name AS "fromName", m.sent_from AS "sentFrom", c.supporter_id::int AS "supporterId",
       c.merge_values ->> 'name' AS name, c.address,
       CASE WHEN c.merge_values ? 'values' THEN c.merge_values END AS merge, c.status, c.skip_reason AS "skipReason", c.sent_at AS "sentAt",
       (SELECT max(e.at) FROM message_events e WHERE e.message_id = c.id AND e.kind = 'delivered') AS "deliveredAt",
       (SELECT max(e.at) FROM message_events e WHERE e.message_id = c.id AND e.kind = 'read') AS "readAt",
       (SELECT count(*)::int FROM messages_to_supporters a WHERE a.mailing_id = m.id) AS "to"
     FROM messages_to_supporters c JOIN mailings m ON m.id = c.mailing_id
     WHERE c.id = $2 AND m.id = $1 AND m.audience = 'supporters'`,
    [messageId, copyId],
  );
  if (!row) return undefined;
  const replies = await query<MessageReply>(
    `SELECT id::int AS id, at, body, sent_by AS "sentBy" FROM message_replies WHERE message_id = $1 ORDER BY at, id`,
    [copyId],
  );
  const fromThem = replies.filter((reply) => !reply.sentBy).map((reply) => new Date(reply.at).toISOString());
  return {
    ...row,
    body: checkMailingDoc(row.body)!,
    replies,
    replyUntil: textReplyUntil(fromThem.at(-1) ?? null),
    sends: Boolean(messageBackend()),
    now: now().toISOString(),
  };
}

/** A message sent to a supporter, on their page, with their replies. */
export type SupporterMessageRow = {
  copyId: number;
  messageId: number;
  title: string;
  channel: MessageChannel;
  status: string;
  skipReason: string | null;
  sentAt: string | null;
  read: boolean;
  replies: { at: string; body: string }[];
};

/** The messages a supporter was sent, newest first. */
export async function messagesToSupporter(supporterId: number): Promise<SupporterMessageRow[]> {
  return query<SupporterMessageRow>(
    `SELECT c.id::int AS "copyId", m.id::int AS "messageId", m.title, m.channel, c.status, c.skip_reason AS "skipReason",
       c.sent_at AS "sentAt", ${WAS_READ} AS read,
       coalesce((SELECT json_agg(json_build_object('at', r.at, 'body', r.body) ORDER BY r.at, r.id) FROM message_replies r
         WHERE r.message_id = c.id AND r.sent_by IS NULL), '[]') AS replies
     FROM messages_to_supporters c JOIN mailings m ON m.id = c.mailing_id
     WHERE c.supporter_id = $1 ORDER BY c.sent_at DESC NULLS FIRST, c.id DESC`,
    [supporterId],
  );
}

/** The draft the supporters list is choosing who for. */
export type ChoosingMessage = Pick<WrittenMessage, "id" | "channel" | "topic"> & { title: string };

/** The draft the list's `message` parameter names; undefined for none, or one no longer a draft. */
export async function choosingMessage(message: string): Promise<ChoosingMessage | undefined> {
  const draft = /^\d+$/.test(message) ? await getWrittenMessage(Number(message)) : undefined;
  if (draft?.state !== "draft") return undefined;
  return {
    id: draft.id,
    channel: draft.channel,
    topic: draft.topic,
    title: draft.title || staffCopy.messagePages.newTitle[draft.channel],
  };
}
