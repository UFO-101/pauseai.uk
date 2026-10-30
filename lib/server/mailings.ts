import "server-only";
import { staffCopy } from "@/lib/content/staff-interface";
import { mailingGroups, type MailingGroup } from "@/lib/mailing-groups";
import { now } from "@/lib/now";
import { query } from "./db";
import { checkStoredFilter } from "./stored-filters";
import { politicianAudience } from "./mailing-recipients";
import type { MailingState } from "./mailing-drafts";

// PauseAI's mailings to politicians: one mail to many, each recipient's a
// PauseAI letter (letters_from_pauseai). Those sent before the site could send
// them are copied from Airtable's Emails table, which keeps only who got
// each one, and whether it was personalised: no text, sender or attachments.
// Those written here are drafts until they're scheduled (mailing-drafts.ts).

export type MailingSummary = {
  id: number;
  title: string;
  /** The ask it makes, if any: its slug and title. */
  ask: string | null;
  askTitle: string | null;
  /** Copied from Airtable, so with no text, sender or attachments. */
  imported: boolean;
  state: MailingState;
  /** Who wrote it, and the name it's from, or with none the Gmail it goes from; neither for one imported. */
  createdBy: string | null;
  fromName: string | null;
  /** When it goes, or went. */
  dueAt: string | null;
  updatedAt: string;
  /** How many it goes to: its letters, or for a draft, who its filter finds now. */
  to: number;
  /** The first of its letters sent, or none yet. */
  sentAt: string | null;
  sent: number;
  /** Recipients it wasn't sent to: unticked, or cancelled. */
  skipped: number;
  bounced: number;
  replied: number;
  /** Recipients who have answered its ask. */
  answered: number;
};

export type MailingRecipient = {
  letterId: number;
  politicianId: number;
  name: string;
  /** Their seat and party, as the politicians list has them. */
  constituency: string | null;
  party: string | null;
  status: string;
  sentAt: string | null;
  repliedAt: string | null;
  personalised: boolean;
  /** Their answer to the mailing's ask, if any. */
  answer: string | null;
  /** Why it wasn't sent, if it was skipped. */
  skipReason: "blocked" | "left-office" | null;
};

/** Which of a mailing's recipients its page lists: everyone, those who replied, bounced, were skipped or answered its ask. */
export const RECIPIENT_TABS = ["all", "replied", "bounced", "skipped", "answered"] as const;
export type RecipientTab = (typeof RECIPIENT_TABS)[number];

const TAB_CONDITIONS: Record<RecipientTab, string> = {
  all: "true",
  replied: "l.replied_at IS NOT NULL",
  bounced: "l.status IN ('bounced', 'spam_complaint')",
  skipped: "l.status IN ('not_sent', 'cancelled', 'skipped')",
  answered: `EXISTS (SELECT 1 FROM ask_statuses s JOIN mailings asked ON asked.id = p.mailing_id
    WHERE s.notable_person_id = n.id AND s.ask = asked.ask)`,
};

/** A mailing with a page of its recipients in a tab, of `recipientsTotal`, on `pages` pages of `pageSize`. */
export type Mailing = MailingSummary & {
  tab: RecipientTab;
  recipients: MailingRecipient[];
  recipientsTotal: number;
  page: number;
  pages: number;
  pageSize: number;
};

const RECIPIENTS_PAGE_SIZE = 100;

const SELECT_MAILINGS = `
  SELECT m.id::int AS id, m.title, m.ask, a.title AS "askTitle", (m.airtable_field IS NOT NULL OR m.airtable_sent_between IS NOT NULL) AS imported,
    m.state, m.created_by AS "createdBy", coalesce(nullif(m.from_name, ''), m.sent_from) AS "fromName", m.due_at AS "dueAt",
    m.updated_at AS "updatedAt",
    min(l.sent_at) AS "sentAt",
    count(l.id)::int AS "to",
    count(l.id) FILTER (WHERE l.status IN ('sent', 'bounced', 'spam_complaint'))::int AS sent,
    count(l.id) FILTER (WHERE l.status IN ('not_sent', 'cancelled', 'skipped'))::int AS skipped,
    count(l.id) FILTER (WHERE l.status IN ('bounced', 'spam_complaint'))::int AS bounced,
    count(l.replied_at)::int AS replied,
    count(l.id) FILTER (WHERE EXISTS (SELECT 1 FROM ask_statuses s WHERE s.notable_person_id = l.notable_person_id AND s.ask = m.ask))::int AS answered
  FROM mailings m LEFT JOIN asks a ON a.slug = m.ask
    LEFT JOIN letters_from_pauseai p ON p.mailing_id = m.id LEFT JOIN letters l ON l.id = p.id`;

/** Every mailing to politicians but the drafts, newest first, those not yet sent at the top. */
export async function listMailings(): Promise<MailingSummary[]> {
  return query<MailingSummary>(
    `${SELECT_MAILINGS} WHERE m.state <> 'draft' AND m.audience = 'politicians' GROUP BY m.id, a.title
     ORDER BY min(l.sent_at) DESC NULLS FIRST, m.id DESC`,
  );
}

/**
 * The mailings page's three parts, of the mailings to politicians: the drafts, newest edited first, each
 * with how many its filter finds now; those coming up or sending, soonest
 * first; and the rest, as listMailings has them.
 */
export async function mailingsOverview(): Promise<{
  drafts: MailingSummary[];
  comingUp: MailingSummary[];
  sent: MailingSummary[];
}> {
  const [drafts, all] = await Promise.all([
    query<MailingSummary & { filter: unknown }>(
      `SELECT * FROM (${SELECT_MAILINGS} WHERE m.state = 'draft' AND m.audience = 'politicians' GROUP BY m.id, a.title) d
       JOIN (SELECT id::int AS id, filter FROM mailings) f USING (id) ORDER BY "updatedAt" DESC, id DESC`,
    ),
    listMailings(),
  ]);
  const counted = await Promise.all(
    drafts.map(async ({ filter, ...draft }) => ({
      ...draft,
      to: (await politicianAudience(checkStoredFilter(filter)!)).recipients.length,
    })),
  );
  const coming = (m: MailingSummary) => m.state === "scheduled" || m.state === "sending";
  return {
    drafts: counted,
    comingUp: all.filter(coming).sort((a, b) => Date.parse(a.dueAt!) - Date.parse(b.dueAt!)),
    sent: all.filter((m) => !coming(m)),
  };
}

/** The mailings page: its groups (mailingGroups), and now, which says which year needn't be written. */
export async function mailingsPage(): Promise<{ groups: MailingGroup[]; now: string }> {
  const at = now();
  return { groups: mailingGroups(await mailingsOverview(), at), now: at.toISOString() };
}

/** A mailing's title, for its page's title, a draft's with none said so; or undefined for no such mailing. */
export async function mailingTitle(id: number): Promise<string | undefined> {
  const [mailing] = await query<{ title: string }>("SELECT title FROM mailings WHERE id = $1", [id]);
  return mailing && (mailing.title || staffCopy.mailingPages.untitled);
}

/** The title of the draft the politicians list is choosing for, from its `mailing` parameter: none for a new mailing. */
export async function choosingTitle(mailing: string): Promise<string | undefined> {
  return /^\d+$/.test(mailing) ? mailingTitle(Number(mailing)) : undefined;
}

/** One mailing, with a page, from 1, of its recipients in `tab`, by name, with their outcomes. */
export async function getMailing(id: number, page = 1, tab: RecipientTab = "all"): Promise<Mailing | undefined> {
  const [mailing] = await query<MailingSummary>(`${SELECT_MAILINGS} WHERE m.id = $1 GROUP BY m.id, a.title`, [id]);
  if (!mailing) return undefined;
  const from = `FROM letters_from_pauseai p JOIN letters l USING (id) JOIN notable_people n ON n.id = l.notable_person_id
    LEFT JOIN politicians seat ON seat.id = n.id
    WHERE p.mailing_id = $1 AND ${TAB_CONDITIONS[tab]}`;
  const [recipients, [{ total }]] = await Promise.all([
    query<MailingRecipient>(
      `SELECT l.id::int AS "letterId", n.id::int AS "politicianId", n.name, seat.constituency, seat.party, l.status, l.sent_at AS "sentAt",
         l.replied_at AS "repliedAt", p.personalised, p.skip_reason AS "skipReason",
         (SELECT s.status FROM ask_statuses s WHERE s.notable_person_id = n.id AND s.ask = $4) AS answer
       ${from} ORDER BY n.name, l.id LIMIT $2 OFFSET $3`,
      [id, RECIPIENTS_PAGE_SIZE, (page - 1) * RECIPIENTS_PAGE_SIZE, mailing.ask],
    ),
    query<{ total: number }>(`SELECT count(*)::int AS total ${from}`, [id]),
  ]);
  return {
    ...mailing,
    tab,
    recipients,
    recipientsTotal: total,
    page,
    pages: Math.max(1, Math.ceil(total / RECIPIENTS_PAGE_SIZE)),
    pageSize: RECIPIENTS_PAGE_SIZE,
  };
}
