import "server-only";
import {
  checkMailingDoc,
  isBlankMailing,
  letterFor,
  type MailingDoc,
  type MailingRecipientValues,
} from "@/lib/mailing-doc";
import { MAX_ATTACHMENT_BYTES } from "@/lib/mailing-attachments";
import { scheduleProblems, type ScheduleProblem } from "@/lib/mailing-schedule";
import { toHtml, toText } from "@/lib/letter-format";
import { staffCopy } from "@/lib/content/staff-interface";
import { now } from "@/lib/now";
import { logChange } from "./audit";
import { query, transaction } from "./db";
import { gmailAccount } from "./gmail-accounts";
import { gmailEmail, mailingChannel, postmarkEmail, type ChannelResult } from "./mailing-channels";
import { politicianAudience, type PoliticianRecipient } from "./mailing-recipients";
import type { Attachment } from "./outside-services/postmark";
import type { StoredFilter } from "@/lib/staff-search";
import { checkStoredFilter, filterProblems } from "./stored-filters";

// A mailing written on the site: a draft from the first change worth
// keeping, saved with a version number so that a second person editing it
// is told rather than overwritten; then scheduled, which fixes who gets it,
// a PauseAI letter each; then sent. Stopping a scheduled mailing makes it a
// draft again, and stopping one that's sending sends no more.

export type MailingState = "draft" | "scheduled" | "sending" | "sent" | "cancelled";

export type MailingAttachmentSummary = { id: number; filename: string; contentType: string; size: number };

export type WrittenMailing = {
  id: number;
  filter: StoredFilter;
  subject: string;
  body: MailingDoc;
  /** The ask it makes, by slug. */
  ask: string | null;
  createdBy: string;
  /** Whose account it's sent from, and the name it's from. */
  sentFrom: string | null;
  fromName: string | null;
  dueAt: string | null;
  state: MailingState;
  version: number;
  attachments: MailingAttachmentSummary[];
};

/** What a save can change. */
export type MailingChanges = Partial<
  Pick<WrittenMailing, "filter" | "subject" | "body" | "ask" | "sentFrom" | "fromName" | "dueAt">
>;

/** Each change, by its column. */
const COLUMNS: Record<keyof MailingChanges, string> = {
  filter: "filter",
  subject: "subject",
  body: "body",
  ask: "ask",
  sentFrom: "sent_from",
  fromName: "from_name",
  dueAt: "due_at",
};

/** A save, or why not: someone else saved since, it's no longer a draft, or it's gone. */
export type SaveResult = { saved: true; version: number } | { saved: false; reason: "conflict" | "not-draft" | "gone" };

const SELECT_WRITTEN = `
  SELECT m.id::int AS id, m.filter, m.subject, m.body, m.ask, m.created_by AS "createdBy", m.sent_from AS "sentFrom",
    m.from_name AS "fromName", m.due_at AS "dueAt", m.state, m.version,
    coalesce((SELECT json_agg(json_build_object('id', a.id, 'filename', a.filename, 'contentType', a.content_type, 'size', octet_length(a.content))
                ORDER BY a.id) FROM mailing_attachments a WHERE a.mailing_id = m.id), '[]') AS attachments
  FROM mailings m WHERE m.body IS NOT NULL`;

/** The values a save writes, as SQL's parameters: JSON as text, the rest as it is. */
function columnValue(name: keyof MailingChanges, value: unknown): unknown {
  return name === "filter" || name === "body" ? JSON.stringify(value) : value;
}

/** The changes that are set, as `column = $n` and their values, from $`first`. */
function assignments(changes: MailingChanges, first: number): [string[], unknown[]] {
  const set = (Object.keys(COLUMNS) as (keyof MailingChanges)[]).filter((name) => changes[name] !== undefined);
  // The title is the subject, for the list of mailings.
  const sql = set.flatMap((name, i) =>
    name === "subject" ? [`subject = $${first + i}`, `title = $${first + i}`] : [`${COLUMNS[name]} = $${first + i}`],
  );
  return [sql, set.map((name) => columnValue(name, changes[name]))];
}

/**
 * A save's changes as the editor sends them, if each is what it should be:
 * the letter as a mailing's may be, a time that's a time. The filter isn't
 * among them: it's changed from the list (Change who).
 */
export function mailingChangesFrom(value: unknown): MailingChanges | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const changes: MailingChanges = {};
  const textOrNull = (one: unknown) => one === null || typeof one === "string";
  for (const [name, one] of Object.entries(value)) {
    if (name === "subject" && typeof one === "string") changes.subject = one;
    else if (name === "body" && checkMailingDoc(one)) changes.body = checkMailingDoc(one);
    else if ((name === "ask" || name === "fromName") && textOrNull(one)) changes[name] = (one as string | null) || null;
    else if (name === "sentFrom" && textOrNull(one)) changes.sentFrom = (one as string | null)?.toLowerCase() || null;
    else if (name === "dueAt" && (one === null || (typeof one === "string" && !Number.isNaN(Date.parse(one))))) {
      changes.dueAt = one;
    } else return undefined;
  }
  return changes;
}

/** Makes a draft to the politicians `filter` finds, by `by`, with its first changes. Returns its ID and version. */
export async function createDraft(
  by: string,
  filter: StoredFilter & { list: "politicians" },
  changes: MailingChanges,
): Promise<{ id: number; version: number }> {
  return transaction(async (db) => {
    const [{ id }] = await query<{ id: number }>(
      `INSERT INTO mailings (title, audience, channel, filter, body, created_by, state)
       VALUES ('', 'politicians', 'email', $1, $2, $3, 'draft') RETURNING id::int AS id`,
      [JSON.stringify(filter), JSON.stringify(changes.body ?? { type: "doc", content: [] }), by],
      db,
    );
    const [sql, values] = assignments({ ...changes, filter: undefined }, 2);
    if (sql.length) await query(`UPDATE mailings SET ${sql.join(", ")} WHERE id = $1`, [id, ...values], db);
    await logChange(by, "create mailing", { id }, db);
    return { id, version: 1 };
  });
}

/** A mailing written here, as stored; undefined for none, or one imported from Airtable. */
export async function getWrittenMailing(id: number): Promise<WrittenMailing | undefined> {
  const [row] = await query<WrittenMailing>(`${SELECT_WRITTEN} AND m.id = $1`, [id]);
  if (!row) return undefined;
  return { ...row, filter: checkStoredFilter(row.filter)!, body: checkMailingDoc(row.body)! };
}

/** A mailing written here, as someone opens it, which keeps it from being tidied away. */
export async function openWrittenMailing(id: number): Promise<WrittenMailing | undefined> {
  await query("UPDATE mailings SET opened_at = now() WHERE id = $1 AND body IS NOT NULL", [id]);
  return getWrittenMailing(id);
}

/** Why a save to `id` at a version didn't happen. */
async function notSaved(id: number): Promise<SaveResult> {
  const [row] = await query<{ state: MailingState }>("SELECT state FROM mailings WHERE id = $1 AND body IS NOT NULL", [
    id,
  ]);
  return { saved: false, reason: !row ? "gone" : row.state === "draft" ? "conflict" : "not-draft" };
}

/** Saves changes to a draft, if it's still at `version`: no one else has saved it since. */
export async function saveDraft(id: number, version: number, changes: MailingChanges): Promise<SaveResult> {
  const [sql, values] = assignments(changes, 3);
  const [row] = await query<{ version: number }>(
    `UPDATE mailings SET ${[...sql, "version = version + 1", "updated_at = now()"].join(", ")}
     WHERE id = $1 AND version = $2 AND state = 'draft' AND body IS NOT NULL RETURNING version`,
    [id, version, ...values],
  );
  return row ? { saved: true, version: row.version } : notSaved(id);
}

/** Attaches a file to a draft at `version`, which counts as a save; not one too big to send. */
export async function addAttachment(
  id: number,
  version: number,
  file: { filename: string; contentType: string; content: Buffer },
): Promise<SaveResult | { saved: false; reason: "too-big" }> {
  if (file.content.length > MAX_ATTACHMENT_BYTES) return { saved: false, reason: "too-big" };
  return transaction(async (db) => {
    const [row] = await query<{ version: number }>(
      `UPDATE mailings SET version = version + 1, updated_at = now()
       WHERE id = $1 AND version = $2 AND state = 'draft' AND body IS NOT NULL RETURNING version`,
      [id, version],
      db,
    );
    if (!row) return notSaved(id);
    await query(
      "INSERT INTO mailing_attachments (mailing_id, filename, content_type, content) VALUES ($1, $2, $3, $4)",
      [id, file.filename, file.contentType, file.content],
      db,
    );
    return { saved: true, version: row.version };
  });
}

/** Takes a file off a draft at `version`, which counts as a save. */
export async function removeAttachment(id: number, version: number, attachmentId: number): Promise<SaveResult> {
  return transaction(async (db) => {
    const [row] = await query<{ version: number }>(
      `UPDATE mailings SET version = version + 1, updated_at = now()
       WHERE id = $1 AND version = $2 AND state = 'draft' AND body IS NOT NULL RETURNING version`,
      [id, version],
      db,
    );
    if (!row) return notSaved(id);
    await query("DELETE FROM mailing_attachments WHERE id = $1 AND mailing_id = $2", [attachmentId, id], db);
    return { saved: true, version: row.version };
  });
}

/** One of a mailing's files, to open, or undefined for none. */
export async function attachmentFile(
  mailingId: number,
  attachmentId: number,
): Promise<{ filename: string; contentType: string; content: Buffer } | undefined> {
  const [file] = await query<{ filename: string; contentType: string; content: Buffer }>(
    `SELECT filename, content_type AS "contentType", content FROM mailing_attachments WHERE id = $2 AND mailing_id = $1`,
    [mailingId, attachmentId],
  );
  return file;
}

/** A mailing's files, as they're sent. */
export async function attachmentsOf(id: number): Promise<Attachment[]> {
  return query<Attachment>(
    `SELECT filename AS "Name", encode(content, 'base64') AS "Content", content_type AS "ContentType"
     FROM mailing_attachments WHERE mailing_id = $1 ORDER BY id`,
    [id],
  );
}

/** Deletes a draft, which has sent nothing, so isn't kept. Says whether it was. */
export async function deleteDraft(id: number, by: string): Promise<boolean> {
  return transaction(async (db) => {
    const deleted = await query(
      "DELETE FROM mailings WHERE id = $1 AND state = 'draft' AND body IS NOT NULL RETURNING id",
      [id],
      db,
    );
    if (deleted.length) await logChange(by, "delete mailing", { id }, db);
    return deleted.length > 0;
  });
}

/** Deletes the drafts with no subject, letter or file that nobody has opened for a day. Returns how many. */
export async function deleteForgottenDrafts(): Promise<number> {
  const drafts = await query<{ id: number; body: unknown }>(
    `SELECT m.id::int AS id, m.body FROM mailings m
     WHERE m.state = 'draft' AND m.body IS NOT NULL AND m.subject = '' AND m.opened_at < now() - interval '1 day'
       AND NOT EXISTS (SELECT 1 FROM mailing_attachments a WHERE a.mailing_id = m.id)`,
  );
  const blank = drafts.filter((draft) => isBlankMailing(checkMailingDoc(draft.body)!)).map((draft) => draft.id);
  await query("DELETE FROM mailings WHERE id = ANY($1::bigint[])", [blank]);
  return blank.length;
}

export type ScheduleResult =
  | { scheduled: true }
  | { scheduled: false; problems: ScheduleProblem[] }
  | { scheduled: false; reason: "conflict" | "not-draft" | "gone" };

/**
 * Schedules a draft at `version`, if nothing stops it: its recipients are
 * fixed, a scheduled PauseAI letter each, keeping the values of its merge
 * fields and the answers they'd given.
 */
export async function scheduleMailing(
  id: number,
  version: number,
  by: string,
  channel = mailingChannel("email"),
): Promise<ScheduleResult> {
  return transaction(async (db) => {
    const [locked] = await query<{ state: MailingState; version: number }>(
      "SELECT state, version FROM mailings WHERE id = $1 AND body IS NOT NULL FOR UPDATE",
      [id],
      db,
    );
    if (!locked) return { scheduled: false, reason: "gone" };
    if (locked.state !== "draft") return { scheduled: false, reason: "not-draft" };
    if (locked.version !== version) return { scheduled: false, reason: "conflict" };
    const mailing = (await getWrittenMailing(id))!;
    const [audience, unknown] = await Promise.all([politicianAudience(mailing.filter), filterProblems(mailing.filter)]);
    const problems = scheduleProblems({
      ...mailing,
      recipients: audience.recipients.length,
      lacking: audience.fields.filter((field) => field.lacking).map((field) => field.id),
      unknown,
      sends: Boolean(channel?.sendsMailings),
      connected: Boolean(mailing.sentFrom && (await gmailAccount(mailing.sentFrom))),
    });
    if (problems.length) return { scheduled: false, problems };
    await query(
      // With no name of its own, it goes in the name the Gmail account has.
      `UPDATE mailings SET state = 'scheduled', from_name = coalesce(from_name, ''), version = version + 1, updated_at = now()
       WHERE id = $1`,
      [id],
      db,
    );
    await query(
      `WITH r AS (SELECT * FROM json_to_recordset($2::json) AS r (id bigint, "values" json, meets json)),
         l AS (INSERT INTO letters (kind, notable_person_id, status) SELECT 'pauseai', r.id, 'scheduled' FROM r
               RETURNING id, notable_person_id)
       INSERT INTO letters_from_pauseai (id, mailing_id, merge_values)
       SELECT l.id, $1, json_build_object('values', r."values", 'meets', r.meets) FROM l JOIN r ON r.id = l.notable_person_id`,
      [id, JSON.stringify(audience.recipients.map((r) => ({ id: r.id, values: r.values, meets: r.meets })))],
      db,
    );
    await logChange(by, "schedule mailing", { id, recipients: audience.recipients.length }, db);
    return { scheduled: true };
  });
}

/**
 * Stops a mailing: a scheduled one becomes a draft again, its recipients
 * let go; one sending sends no more. Says whether it stopped.
 */
export async function stopMailing(id: number, by: string): Promise<boolean> {
  return transaction(async (db) => {
    const [mailing] = await query<{ state: MailingState }>(
      "SELECT state FROM mailings WHERE id = $1 AND body IS NOT NULL FOR UPDATE",
      [id],
      db,
    );
    if (mailing?.state === "scheduled") {
      await query(
        "DELETE FROM letters WHERE id IN (SELECT id FROM letters_from_pauseai WHERE mailing_id = $1)",
        [id],
        db,
      );
      await query(
        "UPDATE mailings SET state = 'draft', version = version + 1, updated_at = now() WHERE id = $1",
        [id],
        db,
      );
    } else if (mailing?.state === "sending") {
      await query(
        `UPDATE letters SET status = 'cancelled'
         WHERE status = 'scheduled' AND id IN (SELECT id FROM letters_from_pauseai WHERE mailing_id = $1)`,
        [id],
        db,
      );
      await query("UPDATE mailings SET state = 'cancelled', updated_at = now() WHERE id = $1", [id], db);
    } else {
      return false;
    }
    await logChange(by, "stop mailing", { id, was: mailing.state }, db);
    return true;
  });
}

/** Changes when a scheduled mailing goes, to a time still to come. Says whether it did. */
export async function rescheduleMailing(id: number, dueAt: string, by: string): Promise<boolean> {
  if (new Date(dueAt) <= now()) return false;
  return transaction(async (db) => {
    const changed = await query(
      "UPDATE mailings SET due_at = $2, updated_at = now() WHERE id = $1 AND state = 'scheduled' RETURNING id",
      [id, dueAt],
      db,
    );
    if (changed.length) await logChange(by, "reschedule mailing", { id, dueAt }, db);
    return changed.length > 0;
  });
}

/** One recipient's email of a mailing: its subject, and its letter as HTML and as text. */
export function emailFor(mailing: Pick<WrittenMailing, "subject" | "body">, recipient: MailingRecipientValues) {
  const letter = letterFor(mailing.body, recipient);
  return { subject: mailing.subject, html: toHtml(letter), text: toText(letter) };
}

/**
 * Sends `to`, an address a staff member gave, one recipient's email of a
 * mailing, as that recipient would get it, attachments and all, whatever
 * the recipient's permissions, addressed to the recipient's name at `to`: by the Gmail it's sent from, in its sender's name, if that's
 * connected; otherwise by Postmark.
 */
export async function sendTestCopy(
  mailing: WrittenMailing,
  recipient: PoliticianRecipient,
  to: string,
): Promise<ChannelResult> {
  const email = emailFor(mailing, recipient);
  const gmail = mailing.sentFrom ? await gmailAccount(mailing.sentFrom) : undefined;
  const from = gmail
    ? { name: mailing.fromName || staffCopy.mailingPages.testFromName, address: gmail.email }
    : { name: staffCopy.mailingPages.testFromName, address: to };
  return (gmail ? gmailEmail : postmarkEmail).send(
    { from, to: { name: recipient.name, address: to }, ...email, attachments: await attachmentsOf(mailing.id) },
    "mailing-test",
  );
}
