import "server-only";
import type { Permission } from "@/lib/staff-permissions";
import type { LetterFilter } from "@/lib/staff-search";
import { query } from "./db";

// Letters, for the staff interface.

export type LetterEvent = { at: string; status: string; details: Record<string, unknown> };

export type LetterSummary = {
  id: number;
  campaign: string;
  status: string;
  senderName: string;
  senderEmail: string;
  /** Whether they agreed to hear about events and ways to help. */
  contactConsent: boolean;
  mpName: string;
  politicianId: number;
  isTest: boolean;
  /** Sent through pauseai.info's old form, and copied from Airtable. */
  imported: boolean;
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

/** One page of the letters page's list, newest first, and how many the filter finds in all. */
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
 * Recent letters, newest first, filtered (LetterFilter), or only those to
 * one politician; the newest 200, or `limit`, or with null every one.
 */
export async function recentLetters(filter: LetterFilter & { politicianId?: number; limit?: number | null } = {}) {
  return (await letterRows(filter)).map(withoutTotal);
}

/** Letters as recentLetters finds them, from `offset`, each with how many the filter finds in all. */
async function letterRows({
  status,
  search,
  answered,
  campaign,
  consent,
  supporterId,
  letterId,
  politicianId,
  limit = 200,
  offset = 0,
}: LetterFilter & { politicianId?: number; limit?: number | null; offset?: number }): Promise<
  (LetterSummary & { total: number })[]
> {
  return query<LetterSummary & { total: number }>(
    `SELECT l.id::int AS id, s.campaign, l.status, s.sender_name AS "senderName", s.sender_email AS "senderEmail",
       s.contact_consent AS "contactConsent", n.name AS "mpName", n.id::int AS "politicianId", p.is_test AS "isTest", s.airtable_id IS NOT NULL AS imported, l.created_at AS "createdAt", l.sent_at AS "sentAt", l.replied_at AS "repliedAt",
       (SELECT k.supporter_id::int FROM supporter_links k WHERE k.letter_id = l.id) AS "supporterId",
       coalesce((SELECT json_agg(json_build_object('at', e.at, 'status', e.status, 'details', e.details) ORDER BY e.at, e.id)
                 FROM letter_events e WHERE e.letter_id = l.id), '[]') AS events,
       count(*) OVER ()::int AS total
     FROM supporter_letters s JOIN letters l ON l.id = s.id
       JOIN notable_people n ON n.id = l.notable_person_id JOIN politicians p ON p.id = n.id
     WHERE ($1::text IS NULL OR l.status = $1 OR ($1 = 'replied' AND l.replied_at IS NOT NULL)
       OR ($1 = 'auto_reply' AND EXISTS (SELECT 1 FROM letter_events e WHERE e.letter_id = l.id AND e.status = 'auto_reply')))
       AND ($3::bigint IS NULL OR l.notable_person_id = $3)
       AND ($4::text IS NULL OR s.sender_name ILIKE $4 OR s.sender_email ILIKE $4 OR n.name ILIKE $4)
       AND ($5::boolean IS NULL OR (l.replied_at IS NOT NULL) = $5)
       AND ($6::bigint IS NULL OR EXISTS (SELECT 1 FROM supporter_links k WHERE k.letter_id = l.id AND k.supporter_id = $6))
       AND ($7::bigint IS NULL OR l.id = $7)
       AND ($8::text IS NULL OR s.campaign = $8)
       AND ($9::boolean IS NULL OR s.contact_consent = $9)
     ORDER BY l.created_at DESC, l.id DESC LIMIT $2 OFFSET $10`,
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
     FROM pauseai_letters p JOIN letters l USING (id) JOIN mailings m ON m.id = p.mailing_id
     WHERE l.notable_person_id = $1 ORDER BY l.created_at DESC, l.id DESC`,
    [politicianId],
  );
}

/** A letter on an MP's page for staff without `supporters`: what happened to it, and nothing of who wrote it. */
export type UnsignedLetter = Pick<LetterSummary, "id" | "campaign" | "status" | "createdAt" | "repliedAt">;

/** An MP's letters: with their senders, or without. */
export type PoliticianLetters =
  { senders: true; letters: LetterSummary[] } | { senders: false; letters: UnsignedLetter[] };

/** The letters to a politician, newest first, selecting nothing of their senders, so none reach the page. */
async function unsignedLetters(politicianId: number, limit = 200): Promise<UnsignedLetter[]> {
  return query<UnsignedLetter>(
    `SELECT l.id::int AS id, s.campaign, l.status, l.created_at AS "createdAt", l.replied_at AS "repliedAt"
     FROM supporter_letters s JOIN letters l ON l.id = s.id
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
