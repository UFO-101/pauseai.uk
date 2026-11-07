import "server-only";
import { now } from "@/lib/now";
import { windowStart } from "@/lib/staff-dashboard";
import { ALL_LETTERS_PAGE_SIZE, type AllLettersFilter } from "@/lib/staff-search";
import { query } from "./db";

// The all-letters page: every letter to a politician, a supporter's or from
// one of PauseAI's mailings, but those to the test MPs, as the dashboard's
// tiles leave them out too.

/** A letter on the all-letters page: a supporter's, with its campaign, or PauseAI's, with its mailing. */
export type AnyLetter = {
  id: number;
  status: string;
  sentAt: string | null;
  repliedAt: string | null;
  mpName: string;
  politicianId: number;
} & (
  | {
      kind: "supporter";
      senderName: string;
      senderEmail: string;
      supporterId: number | null;
      campaign: string;
      campaignTitle: string;
    }
  | { kind: "pauseai"; mailingId: number; mailingTitle: string }
);

export type AllLettersFound = { letters: AnyLetter[]; total: number; pages: number };

/** One page of the letters `filter` finds, newest sent first with those not sent last, and how many it finds in all. */
export async function listAllLetters(filter: AllLettersFilter): Promise<AllLettersFound> {
  const values: unknown[] = [];
  const add = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };
  const where = ["NOT p.is_test"];
  if (filter.search) {
    const like = add(`%${filter.search}%`);
    where.push(`(f.name ILIKE ${like} OR f.email ILIKE ${like} OR n.name ILIKE ${like} OR m.title ILIKE ${like})`);
  }
  if (filter.from) where.push(`l.kind = ${add(filter.from)}`);
  if (filter.sentDays) {
    where.push(`l.sent_at >= ${add(windowStart(filter.sentDays))} AND l.sent_at <= ${add(now())}`);
  }
  if (filter.replied === "yes") where.push("l.replied_at IS NOT NULL");
  else if (filter.replied === "no") where.push("l.replied_at IS NULL");
  else if (filter.replied) {
    where.push(`l.replied_at >= ${add(windowStart(filter.replied))} AND l.replied_at <= ${add(now())}`);
  }
  const from = `letters l JOIN politicians p ON p.id = l.notable_person_id JOIN notable_people n ON n.id = p.id
    LEFT JOIN letters_from_supporters s ON s.id = l.id LEFT JOIN form_entries f ON f.id = s.entry_id
    LEFT JOIN campaigns c ON c.slug = s.campaign
    LEFT JOIN letters_from_pauseai lp ON lp.id = l.id LEFT JOIN mailings m ON m.id = lp.mailing_id
    WHERE ${where.join(" AND ")}`;
  const [{ total }] = await query<{ total: number }>(`SELECT count(*)::int AS total FROM ${from}`, values);
  const rows = await query<AnyLetter>(
    `SELECT l.id::int AS id, l.kind, l.status, l.sent_at AS "sentAt", l.replied_at AS "repliedAt",
       n.name AS "mpName", n.id::int AS "politicianId",
       f.name AS "senderName", f.email AS "senderEmail", s.campaign, c.title AS "campaignTitle",
       (SELECT k.supporter_id::int FROM supporter_links k WHERE k.form_entry_id = s.entry_id) AS "supporterId",
       m.id::int AS "mailingId", m.title AS "mailingTitle"
     FROM ${from}
     ORDER BY l.sent_at DESC NULLS LAST, l.id DESC
     LIMIT ${add(ALL_LETTERS_PAGE_SIZE)} OFFSET ${add((filter.page - 1) * ALL_LETTERS_PAGE_SIZE)}`,
    values,
  );
  return { letters: rows, total, pages: Math.max(1, Math.ceil(total / ALL_LETTERS_PAGE_SIZE)) };
}
