import "server-only";
import type { SentEmailSort } from "@/lib/sent-email-sort";
import type { SortSpec } from "@/lib/staff-sort";
import { query } from "./db";

// The send log, for the admins' list of everything the site has sent, and the
// letters Joseph sent that the import read from his Sent mail. A person
// outside PauseAI shows as their name, linked to their page: through the
// row's letter where it has one, otherwise by matching the address to one
// politician or supporter. If several match, the address alone. Staff and
// PauseAI's addresses stay plain, whoever else has them.

/** Someone an email's address is: a politician's page, or a supporter's, which an admin without `supporters` sees no link to. */
export type SentPerson = { name: string; href: string | null };

export type SentEmail = {
  id: number;
  at: string;
  purpose: string;
  imported: boolean;
  address: string;
  outcome: string;
  /** Bounced or complained of, by Postmark's report or a read of Gmail. */
  problem: "hard" | "soft" | "complaint" | null;
  backend: string;
  fromAddress: string | null;
  subject: string | null;
  letterId: number | null;
  letterHref: string | null;
  /** Its campaign's or mailing's page, through its letter. */
  campaignHref: string | null;
  mailingHref: string | null;
  to: SentPerson | null;
  from: SentPerson | null;
};

/** Which rows the list shows. */
export type SentEmailsFilter = {
  search?: string;
  purpose?: string[];
  outcome?: string[];
  backend?: string[];
  /** Has any of these to lead to. */
  link?: string[];
  not?: { purpose?: string[]; outcome?: string[]; backend?: string[]; link?: string[] };
  sort?: SortSpec<SentEmailSort>;
  page?: number;
};

const PAGE_SIZE = 100;

/** What each row's problem is: its report by the provider's ID. */
const PROBLEM = `(SELECT p.kind FROM email_problems p WHERE p.message_id = e.message_id AND p.kind <> 'soft' ORDER BY p.at DESC LIMIT 1)`;
/** What a row's outcome reads as: a bounce or complaint on one that went. */
const OUTCOME = `coalesce((CASE ${PROBLEM} WHEN 'hard' THEN 'bounced' WHEN 'complaint' THEN 'complaint' END), e.outcome)`;

/** Whether a row leads to any of the kinds in `param`: a letter, or through one, its campaign or mailing. */
const HAS_LINK = (param: string) => `(
  ('letter' = ANY(${param}) AND e.letter_id IS NOT NULL)
  OR ('campaign' = ANY(${param}) AND EXISTS (SELECT 1 FROM letters_from_supporters c WHERE c.id = e.letter_id))
  OR ('mailing' = ANY(${param}) AND EXISTS (SELECT 1 FROM letters_from_pauseai m WHERE m.id = e.letter_id)))`;

/** Each sort's column in the query. */
const SORT_COLUMNS: Record<SentEmailSort, string> = {
  when: "e.at",
  what: "e.purpose",
  to: "e.address",
  from: "coalesce(e.from_address, e.sender)",
  backend: "e.backend",
  subject: "lower(e.subject)",
  outcome: OUTCOME,
};

/** Who a row is to, and who it's from, by its letter, and failing that by its address when only one person has it. */
const ONE_POLITICIAN = (
  column: string,
) => `(SELECT CASE WHEN count(*) = 1 THEN json_build_object('name', min(n.name), 'href', '/staff/politicians/' || min(n.id)) END
    FROM notable_people n WHERE lower(n.email) = ${column})`;
const ONE_SUPPORTER = (
  column: string,
  supporters: boolean,
) => `(SELECT CASE WHEN count(DISTINCT k.supporter_id) = 1 THEN json_build_object(
      'name', (SELECT i.name FROM supporter_identity i WHERE i.supporter_id = min(k.supporter_id) AND i.name IS NOT NULL ORDER BY i.seen_at DESC LIMIT 1),
      'href', ${supporters ? `'/staff/supporters/' || min(k.supporter_id)` : "NULL"}) END
    FROM supporter_links k WHERE k.matched_value = ${column} AND ${column} NOT LIKE '%@pauseai.%')`;

/** A page of the send log, newest first, and how many the filter finds. */
export async function listSentEmails(
  { search, purpose, outcome, backend, link, not, sort = { key: "when", dir: "desc" }, page = 1 }: SentEmailsFilter,
  supporters: boolean,
): Promise<{ emails: SentEmail[]; total: number; pages: number; page: number; pageSize: number }> {
  const params: unknown[] = [
    search ? `%${search}%` : null,
    purpose ?? null,
    outcome ?? null,
    backend ?? null,
    not?.purpose ?? null,
    not?.outcome ?? null,
    not?.backend ?? null,
    link ?? null,
    not?.link ?? null,
  ];
  const where = `($1::text IS NULL OR e.address ILIKE $1 OR e.subject ILIKE $1 OR e.from_address ILIKE $1)
    AND ($2::text[] IS NULL OR e.purpose = ANY($2)) AND ($3::text[] IS NULL OR ${OUTCOME} = ANY($3))
    AND ($4::text[] IS NULL OR e.backend = ANY($4)) AND ($5::text[] IS NULL OR e.purpose <> ALL($5))
    AND ($6::text[] IS NULL OR ${OUTCOME} <> ALL($6)) AND ($7::text[] IS NULL OR e.backend <> ALL($7))
    AND ($8::text[] IS NULL OR ${HAS_LINK("$8")}) AND ($9::text[] IS NULL OR NOT ${HAS_LINK("$9")})`;
  const [emails, [{ total }]] = await Promise.all([
    query<SentEmail>(
      `SELECT e.id::int AS id, e.at, e.purpose, e.imported, e.address, ${OUTCOME} AS outcome, ${PROBLEM} AS problem, e.backend,
         coalesce(e.from_address, CASE WHEN e.backend = 'gmail' THEN e.sender END) AS "fromAddress", e.subject,
         e.letter_id::int AS "letterId",
         CASE WHEN l.kind = 'supporter' THEN '/staff/letters/' || l.id
              WHEN l.kind = 'pauseai' THEN '/staff/mailings/' || p.mailing_id || '/letters/' || l.id END AS "letterHref",
         CASE WHEN l.kind = 'supporter' THEN '/staff/campaigns/' || s.campaign END AS "campaignHref",
         CASE WHEN l.kind = 'pauseai' THEN '/staff/mailings/' || p.mailing_id END AS "mailingHref",
         -- The letter's own people where the address is theirs, else whoever has the address alone.
         coalesce(
           CASE WHEN lower(n.email) = e.address OR e.purpose IN ('letter', 'mailing') THEN json_build_object('name', n.name, 'href', '/staff/politicians/' || n.id) END,
           CASE WHEN lower(trim(f.email)) = e.address THEN json_build_object('name', f.name, 'href', ${supporters ? `(SELECT '/staff/supporters/' || k.supporter_id FROM supporter_links k WHERE k.form_entry_id = f.id)` : "NULL"}) END,
           ${ONE_POLITICIAN("e.address")}, ${ONE_SUPPORTER("e.address", supporters)}) AS "to",
         CASE WHEN l.kind = 'supporter' AND e.purpose IN ('letter', 'office-notice') THEN json_build_object('name', f.name, 'href', ${supporters ? `(SELECT '/staff/supporters/' || k.supporter_id FROM supporter_links k WHERE k.form_entry_id = f.id)` : "NULL"})
              WHEN l.kind = 'supporter' AND e.purpose = 'relay' AND lower(trim(f.email)) = e.address THEN json_build_object('name', n.name, 'href', '/staff/politicians/' || n.id) END AS "from"
       FROM email_sends e LEFT JOIN letters l ON l.id = e.letter_id LEFT JOIN notable_people n ON n.id = l.notable_person_id
         LEFT JOIN letters_from_pauseai p ON p.id = l.id LEFT JOIN letters_from_supporters s ON s.id = l.id LEFT JOIN form_entries f ON f.id = s.entry_id
       WHERE ${where} ORDER BY ${SORT_COLUMNS[sort.key]} ${sort.dir === "asc" ? "ASC" : "DESC"} NULLS LAST, e.at DESC, e.id DESC LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
      params,
    ),
    query<{ total: number }>(`SELECT count(*)::int AS total FROM email_sends e WHERE ${where}`, params),
  ]);
  return { emails, total, page, pageSize: PAGE_SIZE, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}
