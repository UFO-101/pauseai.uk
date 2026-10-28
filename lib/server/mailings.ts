import "server-only";
import { query } from "./db";

// PauseAI's mailings to politicians: one mail to many, each recipient's a
// PauseAI letter (pauseai_letters). Those sent before the site could send
// them are copied from Airtable's Emails table, which keeps only who got
// each one, and whether it was personalised: no text, sender or attachments.

export type MailingSummary = {
  id: number;
  title: string;
  /** The ask it makes, if any: its slug and title. */
  ask: string | null;
  askTitle: string | null;
  /** Copied from Airtable, so with no text, sender or attachments. */
  imported: boolean;
  /** The first of its letters sent, or none yet. */
  sentAt: string | null;
  sent: number;
  /** Recipients it wasn't sent to: unticked, or cancelled. */
  skipped: number;
  bounced: number;
  replied: number;
};

export type MailingRecipient = {
  letterId: number;
  politicianId: number;
  name: string;
  status: string;
  sentAt: string | null;
  repliedAt: string | null;
  personalised: boolean;
};

/** A mailing with a page of its recipients, of `recipientsTotal`, on `pages` pages of `pageSize`. */
export type Mailing = MailingSummary & {
  recipients: MailingRecipient[];
  recipientsTotal: number;
  page: number;
  pages: number;
  pageSize: number;
};

const RECIPIENTS_PAGE_SIZE = 100;

const SELECT_MAILINGS = `
  SELECT m.id::int AS id, m.title, m.ask, a.title AS "askTitle", (m.airtable_field IS NOT NULL OR m.airtable_sent_between IS NOT NULL) AS imported,
    min(l.sent_at) AS "sentAt",
    count(l.id) FILTER (WHERE l.status IN ('sent', 'bounced', 'spam_complaint'))::int AS sent,
    count(l.id) FILTER (WHERE l.status IN ('not_sent', 'cancelled'))::int AS skipped,
    count(l.id) FILTER (WHERE l.status IN ('bounced', 'spam_complaint'))::int AS bounced,
    count(l.replied_at)::int AS replied
  FROM mailings m LEFT JOIN asks a ON a.slug = m.ask
    LEFT JOIN pauseai_letters p ON p.mailing_id = m.id LEFT JOIN letters l ON l.id = p.id`;

/** Every mailing, newest first, those not yet sent at the top. */
export async function listMailings(): Promise<MailingSummary[]> {
  return query<MailingSummary>(
    `${SELECT_MAILINGS} GROUP BY m.id, a.title ORDER BY min(l.sent_at) DESC NULLS FIRST, m.id DESC`,
  );
}

/** A mailing's title, for its page's title, without its recipients; or undefined for no such mailing. */
export async function mailingTitle(id: number): Promise<string | undefined> {
  const [mailing] = await query<{ title: string }>("SELECT title FROM mailings WHERE id = $1", [id]);
  return mailing?.title;
}

/** One mailing, with a page of its recipients' outcomes, by name, from 1. */
export async function getMailing(id: number, page = 1): Promise<Mailing | undefined> {
  const [mailing] = await query<MailingSummary>(`${SELECT_MAILINGS} WHERE m.id = $1 GROUP BY m.id, a.title`, [id]);
  if (!mailing) return undefined;
  const [recipients, [{ total }]] = await Promise.all([
    query<MailingRecipient>(
      `SELECT l.id::int AS "letterId", n.id::int AS "politicianId", n.name, l.status, l.sent_at AS "sentAt",
         l.replied_at AS "repliedAt", p.personalised
       FROM pauseai_letters p JOIN letters l USING (id) JOIN notable_people n ON n.id = l.notable_person_id
       WHERE p.mailing_id = $1 ORDER BY n.name, l.id LIMIT $2 OFFSET $3`,
      [id, RECIPIENTS_PAGE_SIZE, (page - 1) * RECIPIENTS_PAGE_SIZE],
    ),
    query<{ total: number }>("SELECT count(*)::int AS total FROM pauseai_letters WHERE mailing_id = $1", [id]),
  ]);
  return {
    ...mailing,
    recipients,
    recipientsTotal: total,
    page,
    pages: Math.max(1, Math.ceil(total / RECIPIENTS_PAGE_SIZE)),
    pageSize: RECIPIENTS_PAGE_SIZE,
  };
}
