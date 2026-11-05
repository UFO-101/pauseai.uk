import "server-only";
import { checkMailingDoc, letterFor, type MailingDoc } from "@/lib/mailing-doc";
import { toText } from "@/lib/letter-format";
import { now } from "@/lib/now";
import { storedFilter, type Params } from "@/lib/staff-search";
import {
  firstWords,
  messageScheduleProblems,
  messageTerms,
  FIELD_WORDS,
  MESSAGE_SENDER,
  TEXT_REPLY_HOURS,
  TEXT_SENDER_NAME,
  type MessageChannel,
  type MessageScheduleProblem,
  type MessageTerms,
} from "@/lib/supporter-messages";
import { logChange } from "./audit";
import { query, transaction } from "./db";
import { gmailAccount } from "./gmail-accounts";
import type { ChannelResult } from "./mailing-channels";
import {
  getWrittenMailing,
  mailingChangesFrom,
  openWrittenMailing,
  saveDraft,
  sendTestCopy,
  type MailingChanges,
  type SaveResult,
  type WrittenMailing,
} from "./mailing-drafts";
import { messageBackend, textSenderNumber } from "./message-channels";
import { supporterAudience, type SupporterRecipient } from "./message-recipients";
import { filterProblems } from "./stored-filters";
import type { Topic } from "@/lib/contact-permissions";

// A message to supporters written on the site: a mailing to the supporters
// list's filter, with one channel and one topic, fixed when it's made from
// the list's Contact filter. Saved as a mailing is (mailing-drafts.ts);
// scheduling fixes who gets it, a message each. A text goes on a WhatsApp
// template: one approved, or new words, which scheduling sends for approval.

/** A text's words, as WhatsApp approves them. */
export type MessageTemplate = {
  id: number;
  name: string;
  body: MailingDoc;
  status: "pending" | "approved" | "rejected";
  /** Who made it, or none for one made in WhatsApp Manager. */
  createdBy: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectedReason: string | null;
  /** When it last went, and to how many; none if it never has. */
  lastUsedAt: string | null;
  lastUsedTo: number;
};

export type WrittenMessage = WrittenMailing & {
  /** The subject, for an email; for a text, its template's name or its first words. */
  title: string;
  channel: MessageChannel;
  topic: Topic;
  template: MessageTemplate | null;
};

const SELECT_TEMPLATES = `
  SELECT t.id::int AS id, t.name, t.body, t.status, t.created_by AS "createdBy", t.approved_at AS "approvedAt",
    t.rejected_at AS "rejectedAt", t.rejected_reason AS "rejectedReason", u.at AS "lastUsedAt", coalesce(u.n, 0)::int AS "lastUsedTo"
  FROM message_templates t LEFT JOIN LATERAL (
    SELECT m.due_at AS at, (SELECT count(*) FROM messages_to_supporters c WHERE c.mailing_id = m.id) AS n
    FROM mailings m WHERE m.template_id = t.id AND m.state IN ('sending', 'sent', 'cancelled')
    ORDER BY m.due_at DESC LIMIT 1) u ON true`;

/** The templates WhatsApp has approved, most recently used first, then newest approved. */
export async function approvedTemplates(): Promise<MessageTemplate[]> {
  return query<MessageTemplate>(
    `${SELECT_TEMPLATES} WHERE t.status = 'approved' ORDER BY u.at DESC NULLS LAST, t.approved_at DESC, t.id DESC`,
  );
}

/** A message written here, as stored; undefined for none, or a mailing to politicians. */
export async function getWrittenMessage(id: number, opening = false): Promise<WrittenMessage | undefined> {
  const written = await (opening ? openWrittenMailing : getWrittenMailing)(id, "supporters");
  if (!written) return undefined;
  const [{ title, channel, topic, templateId }] = await query<{
    title: string;
    channel: MessageChannel;
    topic: Topic;
    templateId: number | null;
  }>(`SELECT title, channel, topic, template_id::int AS "templateId" FROM mailings WHERE id = $1`, [id]);
  const [template] = templateId
    ? await query<MessageTemplate>(`${SELECT_TEMPLATES} WHERE t.id = $1`, [templateId])
    : [];
  return { ...written, title, channel, topic, template: template ?? null };
}

/** Who a new message appears from: for an email the address we write from; for a text the business account. */
const senderOf = (channel: MessageChannel): { sentFrom: string; fromName: string } =>
  channel === "email"
    ? { sentFrom: MESSAGE_SENDER.email, fromName: MESSAGE_SENDER.name }
    : { sentFrom: textSenderNumber() ?? "", fromName: TEXT_SENDER_NAME };

/**
 * Makes a draft to those the supporters list's `params` find, by `by`, its
 * channel and topic from their Contact filter. Returns its ID; undefined
 * with no Contact filter answered yes.
 */
export async function createMessageDraft(by: string, params: Params): Promise<number | undefined> {
  const filter = storedFilter("supporters", params);
  const terms = messageTerms(filter.params.contact);
  if (!terms) return undefined;
  const { sentFrom, fromName } = senderOf(terms.channel);
  return transaction(async (db) => {
    const [{ id }] = await query<{ id: number }>(
      `INSERT INTO mailings (title, audience, channel, topic, filter, body, created_by, sent_from, from_name, state)
       VALUES ('', 'supporters', $1, $2, $3, $4, $5, $6, $7, 'draft') RETURNING id::int AS id`,
      [
        terms.channel,
        terms.topic,
        JSON.stringify(filter),
        JSON.stringify({ type: "doc", content: [] }),
        by,
        sentFrom,
        fromName,
      ],
      db,
    );
    await logChange(by, "create message", { id, channel: terms.channel, topic: terms.topic }, db);
    return id;
  });
}

/**
 * Keeps who a draft goes to: the list's `params`, while their Contact filter
 * still says its channel and topic, as they're fixed. Says whether it did.
 */
export async function changeMessageFilter(id: number, params: Params): Promise<boolean> {
  const message = await getWrittenMessage(id);
  if (message?.state !== "draft") return false;
  const filter = storedFilter("supporters", params);
  if (!sameTerms(messageTerms(filter.params.contact), message)) return false;
  await query("UPDATE mailings SET filter = $2, version = version + 1, updated_at = now() WHERE id = $1", [
    id,
    JSON.stringify(filter),
  ]);
  return true;
}

/** Whether a filter's terms are the message's own. */
export function sameTerms(terms: MessageTerms | undefined, message: MessageTerms): boolean {
  return terms?.channel === message.channel && terms.topic === message.topic;
}

/**
 * A save's changes as the writer sends them, if each is what it should be
 * for the channel: a text has no subject, says who it's from by its account,
 * and may name a template, or null for none.
 */
export function messageChangesFrom(value: unknown, channel: MessageChannel): MailingChanges | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const { templateId, ...rest } = value as Record<string, unknown>;
  const changes = mailingChangesFrom(rest);
  if (!changes || "ask" in changes) return undefined;
  if (channel === "email") return templateId === undefined ? changes : undefined;
  if ("subject" in changes || "sentFrom" in changes || "fromName" in changes) return undefined;
  if (templateId === undefined) return changes;
  return typeof templateId === "number" || templateId === null ? { ...changes, templateId } : undefined;
}

/**
 * Saves changes to a draft message at `version`. Choosing a template takes
 * its words and name; a text's new words title it by its first words.
 */
export async function saveMessageDraft(
  message: WrittenMessage,
  version: number,
  changes: MailingChanges,
): Promise<SaveResult> {
  if (message.channel === "email") return saveDraft(message.id, version, changes);
  const template = changes.templateId
    ? (await approvedTemplates()).find((one) => one.id === changes.templateId)
    : undefined;
  if (changes.templateId && !template) return { saved: false, reason: "conflict" };
  if (template) {
    return saveDraft(message.id, version, { ...changes, body: checkMailingDoc(template.body)!, title: template.name });
  }
  return saveDraft(
    message.id,
    version,
    changes.body ? { ...changes, title: firstWords(changes.body, FIELD_WORDS) } : changes,
  );
}

export type MessageScheduleResult =
  | { scheduled: true }
  | { scheduled: false; problems: MessageScheduleProblem[] }
  | { scheduled: false; reason: "conflict" | "not-draft" | "gone" };

/**
 * Schedules a draft message at `version`, if nothing stops it: its recipients
 * are fixed, a scheduled message each, keeping their name, place and merge
 * values, which erasing them deletes. A text on new words sends them for
 * approval as a new template, and stays held until WhatsApp decides.
 */
export async function scheduleMessage(id: number, version: number, by: string): Promise<MessageScheduleResult> {
  return transaction(async (db) => {
    const [locked] = await query<{ state: string; version: number }>(
      "SELECT state, version FROM mailings WHERE id = $1 AND audience = 'supporters' AND body IS NOT NULL FOR UPDATE",
      [id],
      db,
    );
    if (!locked) return { scheduled: false, reason: "gone" };
    if (locked.state !== "draft") return { scheduled: false, reason: "not-draft" };
    if (locked.version !== version) return { scheduled: false, reason: "conflict" };
    const message = (await getWrittenMessage(id))!;
    const [audience, unknown, connected] = await Promise.all([
      supporterAudience(message.filter, message),
      filterProblems(message.filter),
      message.sentFrom ? gmailAccount(message.sentFrom) : undefined,
    ]);
    const problems = messageScheduleProblems({
      ...message,
      recipients: audience.recipients.length,
      unknown,
      byGmail: message.channel === "email" && message.sentFrom !== MESSAGE_SENDER.email,
      connected: Boolean(connected),
      sends: Boolean(messageBackend()),
    });
    if (problems.length) return { scheduled: false, problems };
    if (message.channel === "text" && message.template?.status !== "approved") {
      await query(
        `WITH t AS (INSERT INTO message_templates (name, body, status, created_by)
           VALUES ($2, $3, 'pending', $4) RETURNING id)
         UPDATE mailings SET template_id = t.id FROM t WHERE mailings.id = $1`,
        [id, firstWords(message.body, FIELD_WORDS), JSON.stringify(message.body), by],
        db,
      );
    }
    await query(
      "UPDATE mailings SET state = 'scheduled', from_name = coalesce(from_name, ''), version = version + 1, updated_at = now() WHERE id = $1",
      [id],
      db,
    );
    await query(
      `INSERT INTO messages_to_supporters (mailing_id, supporter_id, address, status, merge_values)
       SELECT $1, r.id, r.address, 'scheduled', r.merge FROM json_to_recordset($2::json) AS r (id bigint, address text, merge jsonb)`,
      [
        id,
        JSON.stringify(
          audience.recipients.map((r) => ({
            id: r.id,
            address: r.address,
            merge: { name: r.name, place: r.place, values: r.values, meets: r.meets },
          })),
        ),
      ],
      db,
    );
    await logChange(by, "schedule message", { id, recipients: audience.recipients.length }, db);
    return { scheduled: true };
  });
}

/**
 * Stops a message: a scheduled one becomes a draft again, its recipients let
 * go and any new words it sent for approval taken back; one sending sends no
 * more. Says whether it stopped.
 */
export async function stopMessage(id: number, by: string): Promise<boolean> {
  return transaction(async (db) => {
    const [message] = await query<{ state: string; templateId: number | null }>(
      `SELECT state, template_id AS "templateId" FROM mailings WHERE id = $1 AND audience = 'supporters' FOR UPDATE`,
      [id],
      db,
    );
    if (message?.state === "scheduled") {
      await query("DELETE FROM messages_to_supporters WHERE mailing_id = $1", [id], db);
      await query(
        "UPDATE mailings SET state = 'draft', version = version + 1, updated_at = now() WHERE id = $1",
        [id],
        db,
      );
      await query("DELETE FROM message_templates WHERE id = $1 AND status = 'pending'", [message.templateId], db);
    } else if (message?.state === "sending") {
      await query(
        "UPDATE messages_to_supporters SET status = 'cancelled' WHERE status = 'scheduled' AND mailing_id = $1",
        [id],
        db,
      );
      await query("UPDATE mailings SET state = 'cancelled', updated_at = now() WHERE id = $1", [id], db);
    } else {
      return false;
    }
    await logChange(by, "stop message", { id, was: message.state }, db);
    return true;
  });
}

/**
 * Sends `to` one recipient's copy of a draft, as they'd get it: an email by
 * Postmark or the Gmail it's from, whatever the recipient's permissions; a
 * text by the backend, only on an approved template, as WhatsApp sends no
 * other. Undefined when it can't go.
 */
export async function sendMessageTest(
  message: WrittenMessage,
  recipient: SupporterRecipient,
  to: string,
): Promise<ChannelResult | undefined> {
  if (message.channel === "email") return sendTestCopy(message, recipient, to);
  const backend = messageBackend();
  if (!backend || message.template?.status !== "approved") return undefined;
  return backend.send({
    channel: "text",
    to,
    subject: message.template.name,
    text: toText(letterFor(message.body, recipient)),
  });
}

/** One copy of a message, as replying to it needs it. */
type CopyToReply = {
  id: number;
  address: string | null;
  channel: MessageChannel;
  subject: string;
  lastFromThem: string | null;
};

/**
 * Sends a staff member's reply to a copy of a message, and keeps it: by its
 * channel, a text only within the free window after the person's last
 * message. Says whether it went.
 */
export async function replyToMessage(copyId: number, body: string, by: string): Promise<boolean> {
  const words = body.trim();
  const backend = messageBackend();
  if (!words || !backend) return false;
  const [one] = await query<CopyToReply>(
    `SELECT c.id::int AS id, c.address, m.channel, m.subject,
       (SELECT max(r.at) FROM message_replies r WHERE r.message_id = c.id AND r.sent_by IS NULL) AS "lastFromThem"
     FROM messages_to_supporters c JOIN mailings m ON m.id = c.mailing_id WHERE c.id = $1`,
    [copyId],
  );
  if (!one?.address) return false;
  const closes = one.lastFromThem ? new Date(one.lastFromThem).getTime() + TEXT_REPLY_HOURS * 60 * 60 * 1000 : 0;
  if (one.channel === "text" && closes <= now().getTime()) return false;
  const result = await backend.send({ channel: one.channel, to: one.address, subject: one.subject, text: words });
  if (!result.sent) return false;
  await transaction(async (db) => {
    await query("INSERT INTO message_replies (message_id, body, sent_by) VALUES ($1, $2, $3)", [copyId, words, by], db);
    await logChange(by, "reply to message", { id: copyId }, db);
  });
  return true;
}
