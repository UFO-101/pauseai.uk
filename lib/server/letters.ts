import "server-only";
import type { Permission } from "@/lib/staff-permissions";
import type { LetterBackend, LetterFilter } from "@/lib/staff-search";
import { messageIdSearch, postmarkSearch, sentNearSearch, type GmailFind } from "@/lib/letter-links";
import { LETTER_COLUMNS } from "@/lib/letter-sort";
import type { PoliticianFlag } from "@/lib/politician-filters";
import { query } from "./db";
import { FLAG_CONDITIONS } from "./politicians";

// Letters, for the staff interface.

export type LetterEvent = { at: string; status: string; details: Record<string, unknown> };

export type LetterSummary = {
  id: number;
  campaign: string;
  /** The campaign's title, as the campaigns table has it. */
  campaignTitle: string;
  /** Where an old campaign's letter can be read, as the campaigns table has it. */
  campaignUrl: string | null;
  status: string;
  senderName: string;
  senderEmail: string;
  /** Whether they agreed to hear about events and ways to help. */
  contactConsent: boolean;
  mpName: string;
  politicianId: number;
  isTest: boolean;
  /** What sent it; none for one of this site's never sent. */
  backend: LetterBackend | null;
  createdAt: string;
  sentAt: string | null;
  /** When a reply from anyone but the sender first reached us. */
  repliedAt: string | null;
  /** The supporter the sender is, once linked. */
  supporterId: number | null;
  events: LetterEvent[];
};

/** How many letters the letters page shows at once. */
export const LETTERS_PAGE_SIZE = 100;

export type LettersPage = { letters: LetterSummary[]; total: number; pages: number; pageSize: number };

/** One page of the letters page's list, in its sort, and how many the filter finds in all. */
export async function listLetters({ page = 1, ...filter }: LetterFilter & { page?: number }): Promise<LettersPage> {
  const rows = await letterRows({ ...filter, limit: LETTERS_PAGE_SIZE, offset: (page - 1) * LETTERS_PAGE_SIZE });
  // A page past the end has no rows to carry the count, so it counts again from the first.
  const total = rows[0]?.total ?? (page > 1 ? ((await letterRows({ ...filter, limit: 1 }))[0]?.total ?? 0) : 0);
  return {
    letters: rows.map(withoutTotal),
    total,
    pages: Math.max(1, Math.ceil(total / LETTERS_PAGE_SIZE)),
    pageSize: LETTERS_PAGE_SIZE,
  };
}

function withoutTotal(row: LetterSummary & { total: number }): LetterSummary {
  const letter: Partial<typeof row> = { ...row };
  delete letter.total;
  return letter as LetterSummary;
}

/**
 * Letters, newest written first unless the filter sorts them, filtered (LetterFilter), or only those to
 * one politician; the newest 200, or `limit`, or with null every one.
 */
export async function recentLetters(filter: LetterFilter & { politicianId?: number; limit?: number | null } = {}) {
  return (await letterRows(filter)).map(withoutTotal);
}

/**
 * What sent a supporter's letter `s`: Airtable, for one copied from it,
 * or the backend of its newest send that went.
 */
const BACKEND = `CASE WHEN s.airtable_id IS NOT NULL THEN 'airtable' ELSE (SELECT e.backend FROM email_sends e
  WHERE e.letter_id = s.id AND e.purpose = 'letter' AND e.outcome = 'sent' ORDER BY e.at DESC, e.id DESC LIMIT 1) END`;

/** Letters as recentLetters finds them, from `offset`, each with how many the filter finds in all. */
async function letterRows({
  status,
  search,
  answered,
  campaign,
  flags,
  backend,
  consent,
  supporterId,
  letterId,
  politicianId,
  limit = 200,
  offset = 0,
  not,
  sort = { key: "created", dir: "desc" },
}: LetterFilter & { politicianId?: number; limit?: number | null; offset?: number }): Promise<
  (LetterSummary & { total: number })[]
> {
  // Each marker's condition is SQL of our own (FLAG_CONDITIONS), so it goes in the query as it is.
  const marked = (flags: PoliticianFlag[]) => `(${flags.map((flag) => FLAG_CONDITIONS[flag]).join(" OR ")})`;
  const flagConditions = [flags && marked(flags), not?.flags && `${marked(not.flags)} IS NOT TRUE`]
    .filter(Boolean)
    .map((condition) => `AND ${condition}`)
    .join(" ");
  return query<LetterSummary & { total: number }>(
    `SELECT l.id::int AS id, s.campaign, c.title AS "campaignTitle", c.url AS "campaignUrl", l.status, f.name AS "senderName", f.email AS "senderEmail",
       f.contact_consent AS "contactConsent", n.name AS "mpName", n.id::int AS "politicianId", p.is_test AS "isTest", ${BACKEND} AS backend, l.created_at AS "createdAt", l.sent_at AS "sentAt", l.replied_at AS "repliedAt",
       (SELECT k.supporter_id::int FROM supporter_links k WHERE k.form_entry_id = s.entry_id) AS "supporterId",
       coalesce((SELECT json_agg(json_build_object('at', e.at, 'status', e.status, 'details', e.details) ORDER BY e.at DESC, e.id DESC)
                 FROM letter_events e WHERE e.letter_id = l.id), '[]') AS events,
       count(*) OVER ()::int AS total
     FROM letters_from_supporters s JOIN letters l ON l.id = s.id JOIN form_entries f ON f.id = s.entry_id
       JOIN campaigns c ON c.slug = s.campaign JOIN notable_people n ON n.id = l.notable_person_id JOIN politicians p ON p.id = n.id
     WHERE ($1::text IS NULL OR l.status = $1 OR ($1 = 'replied' AND l.replied_at IS NOT NULL)
       OR ($1 = 'auto_reply' AND EXISTS (SELECT 1 FROM letter_events e WHERE e.letter_id = l.id AND e.status = 'auto_reply')))
       AND ($3::bigint IS NULL OR l.notable_person_id = $3)
       AND ($4::text IS NULL OR f.name ILIKE $4 OR f.email ILIKE $4 OR n.name ILIKE $4)
       AND ($5::boolean IS NULL OR (l.replied_at IS NOT NULL) = $5)
       AND ($6::bigint IS NULL OR EXISTS (SELECT 1 FROM supporter_links k WHERE k.form_entry_id = s.entry_id AND k.supporter_id = $6))
       AND ($7::bigint IS NULL OR l.id = $7)
       AND ($8::text[] IS NULL OR s.campaign = ANY($8))
       AND ($9::boolean IS NULL OR f.contact_consent = $9)
       AND ($11::text[] IS NULL OR s.campaign <> ALL($11))
       AND ($12::text[] IS NULL OR ${BACKEND} = ANY($12))
       AND ($13::text[] IS NULL OR (${BACKEND} = ANY($13)) IS NOT TRUE) ${flagConditions}
     ORDER BY ${LETTER_COLUMNS[sort.key]} ${sort.dir === "asc" ? "ASC" : "DESC"} NULLS LAST, l.created_at DESC, l.id DESC
     LIMIT $2 OFFSET $10`,
    [
      status ?? null,
      limit,
      politicianId ?? null,
      search ? `%${search}%` : null,
      answered ?? null,
      supporterId ?? null,
      letterId ?? null,
      campaign ?? null,
      consent ?? null,
      offset,
      not?.campaign ?? null,
      backend ?? null,
      not?.backend ?? null,
    ],
  );
}

/** A letter of a mailing from PauseAI to a politician: when, which mailing, and whether it was personalised. */
export type PauseaiLetter = {
  id: number;
  mailingId: number;
  mailing: string;
  status: string;
  /** When it was sent, or else made. */
  at: string;
  personalised: boolean;
};

/** PauseAI's letters to a politician, newest first. */
export async function pauseaiLetters(politicianId: number): Promise<PauseaiLetter[]> {
  return query<PauseaiLetter>(
    `SELECT l.id::int AS id, m.id::int AS "mailingId", m.title AS mailing, l.status, coalesce(l.sent_at, l.created_at) AS at, p.personalised
     FROM letters_from_pauseai p JOIN letters l USING (id) JOIN mailings m ON m.id = p.mailing_id
     WHERE l.notable_person_id = $1 ORDER BY l.created_at DESC, l.id DESC`,
    [politicianId],
  );
}

/** A supporter's letter, for its own page: what the list has, its subject, and where to find its copy in Gmail. */
export type SupporterLetterDetails = LetterSummary & { kind: "supporter"; subject: string; gmail: GmailFind | null };

/** One of PauseAI's letters, for its own page: to whom, at which address now, in which mailing, and what happened. */
export type PauseaiLetterDetails = {
  kind: "pauseai";
  id: number;
  status: string;
  createdAt: string;
  sentAt: string | null;
  mpName: string;
  politicianId: number;
  mpEmail: string | null;
  mailingId: number;
  mailing: string;
  /** The ask the mailing makes, if any, by its slug. */
  mailingAsk: string | null;
  personalised: boolean;
  /** Where to find it in Gmail, if it went. */
  gmail: GmailFind | null;
  events: LetterEvent[];
};

export type LetterDetails = SupporterLetterDetails | PauseaiLetterDetails;

/**
 * What a PauseAI letter's way into Gmail is made of: the mailbox it went
 * from, the Message-ID it went with, if kept, and its first reply's, with
 * the mailbox that read it.
 */
type PauseaiInGmail = {
  sentFrom: string | null;
  sentId: string | null;
  reply: { id: string; account: string } | null;
};

/**
 * Where to find PauseAI's letter in Gmail: by the Message-ID it went with,
 * in the mailbox it went from; or, for one copied from Airtable, which kept
 * none, by a reply's, in the mailbox that read it; or else by its MP's
 * address and when it went. Nothing for one that never went.
 */
function pauseaiGmail(
  { sentAt, mpEmail }: Pick<PauseaiLetterDetails, "sentAt" | "mpEmail">,
  { sentFrom, sentId, reply }: PauseaiInGmail,
): GmailFind | null {
  if (sentId) return { mailbox: sentFrom, search: messageIdSearch(sentId) };
  if (reply) return { mailbox: reply.account, search: messageIdSearch(reply.id) };
  if (!sentAt || !mpEmail) return null;
  return { mailbox: sentFrom, search: sentNearSearch(mpEmail, sentAt) };
}

/**
 * PauseAI's letter `id`, for its page under mailing `mailingId`, or
 * undefined if that mailing has no such letter.
 */
export async function getPauseaiLetter(mailingId: number, id: number): Promise<PauseaiLetterDetails | undefined> {
  const [row] = await query<Omit<PauseaiLetterDetails, "gmail"> & { inGmail: PauseaiInGmail }>(
    `SELECT 'pauseai' AS kind, l.id::int AS id, l.status, l.created_at AS "createdAt", l.sent_at AS "sentAt",
       n.name AS "mpName", n.id::int AS "politicianId", n.email AS "mpEmail", m.id::int AS "mailingId",
       m.title AS mailing, m.ask AS "mailingAsk", p.personalised,
       json_build_object(
         'sentFrom', m.sent_from,
         'sentId', (SELECT s.rfc_message_id FROM email_sends s
                    WHERE s.letter_id = l.id AND s.outcome = 'sent' ORDER BY s.id DESC LIMIT 1),
         'reply', (SELECT json_build_object('id', r.rfc_message_id, 'account', r.account)
                   FROM letter_replies r WHERE r.letter_id = l.id AND r.rfc_message_id IS NOT NULL
                   ORDER BY r.at, r.id LIMIT 1)
       ) AS "inGmail",
       coalesce((SELECT json_agg(json_build_object('at', e.at, 'status', e.status, 'details', e.details) ORDER BY e.at DESC, e.id DESC)
                 FROM letter_events e WHERE e.letter_id = l.id), '[]') AS events
     FROM letters_from_pauseai p JOIN letters l USING (id) JOIN mailings m ON m.id = p.mailing_id
       JOIN notable_people n ON n.id = l.notable_person_id
     WHERE l.id = $1 AND p.mailing_id = $2`,
    [id, mailingId],
  );
  if (!row) return undefined;
  const { inGmail, ...letter } = row;
  return { ...letter, gmail: pauseaiGmail(letter, inGmail) };
}

/**
 * A supporter's letter `id`, for its page, or undefined if there's none:
 * PauseAI's letters have theirs under their mailing. Its copy is the one
 * Bcc'd to the policy inbox, found by the Message-ID of the newest send
 * Postmark made of it, or, for one copied from Airtable, by its MP's
 * address and when it went.
 */
export async function getSupporterLetter(id: number): Promise<SupporterLetterDetails | undefined> {
  const [letter] = await recentLetters({ letterId: id });
  if (!letter) return undefined;
  const [{ subject, postmarkId, mpEmail }] = await query<{
    subject: string;
    postmarkId: string | null;
    mpEmail: string | null;
  }>(
    `SELECT s.subject, (SELECT e.message_id FROM email_sends e WHERE e.letter_id = s.id AND e.purpose = 'letter'
       AND e.outcome = 'sent' ORDER BY e.at DESC, e.id DESC LIMIT 1) AS "postmarkId", n.email AS "mpEmail"
     FROM letters_from_supporters s JOIN letters l USING (id) JOIN notable_people n ON n.id = l.notable_person_id
     WHERE s.id = $1`,
    [id],
  );
  const search = postmarkId
    ? postmarkSearch(postmarkId)
    : letter.sentAt && mpEmail && sentNearSearch(mpEmail, letter.sentAt);
  const gmail = search ? { mailbox: process.env.POLICY_INBOX || null, search } : null;
  return { ...letter, kind: "supporter", subject, gmail };
}

/** A letter on an MP's page for staff without `supporters`: what happened to it, and nothing of who wrote it. */
export type UnsignedLetter = Pick<
  LetterSummary,
  "id" | "campaign" | "campaignTitle" | "campaignUrl" | "status" | "createdAt" | "repliedAt"
>;

/** An MP's letters: with their senders, or without. */
export type PoliticianLetters =
  { senders: true; letters: LetterSummary[] } | { senders: false; letters: UnsignedLetter[] };

/** The letters to a politician, newest first, selecting nothing of their senders, so none reach the page. */
async function unsignedLetters(politicianId: number, limit = 200): Promise<UnsignedLetter[]> {
  return query<UnsignedLetter>(
    `SELECT l.id::int AS id, s.campaign, c.title AS "campaignTitle", c.url AS "campaignUrl", l.status, l.created_at AS "createdAt", l.replied_at AS "repliedAt"
     FROM letters_from_supporters s JOIN letters l ON l.id = s.id JOIN campaigns c ON c.slug = s.campaign
     WHERE l.notable_person_id = $1 ORDER BY l.created_at DESC, l.id DESC LIMIT $2`,
    [politicianId, limit],
  );
}

/** The letters to a politician, for a staff member: who sent them only with `supporters`. */
export async function politicianLetters(
  politicianId: number,
  permissions: readonly Permission[],
): Promise<PoliticianLetters> {
  return permissions.includes("supporters")
    ? { senders: true, letters: await recentLetters({ politicianId }) }
    : { senders: false, letters: await unsignedLetters(politicianId) };
}
