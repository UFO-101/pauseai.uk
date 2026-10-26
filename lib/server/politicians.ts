import "server-only";
import type { AskStatus } from "@/lib/asks";
import type { Mp, MpStatuses } from "@/lib/email-your-mp";
import { parseSort, type SortSpec } from "@/lib/staff-sort";
import { POLITICIAN_COLUMNS, POLITICIAN_SORTS, type PoliticianSort } from "@/lib/politician-sort";
import { query, transaction, type Queryable } from "./db";
import { type AuditEntry, logChange } from "./audit";

// Politicians, the notable people who are in a parliament or were, and
// their answer to each ask. A politician is a row of notable_people, with
// what all notable people have, and one of politicians, with what only
// politicians have. They're copied from Airtable nightly
// (politician-sync.ts), and staff set statuses in the staff interface.

export const HOUSES = ["commons", "lords", "scottish-parliament", "senedd", "ni-assembly", "other"] as const;
export type House = (typeof HOUSES)[number];

export function isHouse(value: string): value is House {
  return (HOUSES as readonly string[]).includes(value);
}

/** Whether they're in office. One who leaves is marked, never deleted. */
export const PERSON_STATUSES = ["in_office", "died", "retired", "left_office"] as const;
export type PersonStatus = (typeof PERSON_STATUSES)[number];

export function isPersonStatus(value: string): value is PersonStatus {
  return (PERSON_STATUSES as readonly string[]).includes(value);
}

export const COUNTRIES = ["england", "scotland", "wales", "northern-ireland"] as const;
export type Country = (typeof COUNTRIES)[number];

export type StatusRecord = {
  status: AskStatus;
  /** yyyy-mm-dd, if known. */
  date: string | null;
  note: string;
  updatedAt: string;
  updatedBy: string;
};

export type Politician = {
  id: number;
  /** Airtable's record ID, for those copied from it. Null for the test MPs, and anyone added by hand. */
  airtableId: string | null;
  /** When their record was no longer in Airtable. */
  airtableRemovedAt: string | null;
  house: House;
  name: string;
  forename: string | null;
  surname: string | null;
  salutation: string;
  constituency: string | null;
  party: string;
  country: Country | null;
  city: string | null;
  email: string | null;
  status: PersonStatus;
  notes: string;
  importantTarget: boolean;
  personalConnection: boolean;
  isTest: boolean;
  /** Their address bounced or complained, so nothing is sent to it (lib/server/email.ts). */
  emailBlocked: boolean;
  /** Letters written to them (bar those never sent), and how many of those got a reply. */
  letters: number;
  replies: number;
  /** Their answer to each ask, by the ask's slug. */
  statuses: Record<string, StatusRecord>;
};

/** An MP the form can write to, with their row's ID. */
export type FoundMp = Mp & { id: number; isTest: boolean };

/** A politician's two rows, as n (notable_people) and p (politicians). */
const POLITICIANS = "notable_people n JOIN politicians p ON p.id = n.id";

const MP_COLUMNS = `n.id::int AS id, n.name, n.salutation, p.constituency, n.email, p.is_test AS "isTest",
  EXISTS (SELECT 1 FROM email_blocks b WHERE b.address = lower(n.email)) AS unreachable`;

/** The MP in office for a constituency. */
export async function findMpInOffice(constituency: string): Promise<FoundMp | undefined> {
  const [mp] = await query<FoundMp>(
    `SELECT ${MP_COLUMNS} FROM ${POLITICIANS}
     WHERE p.house = 'commons' AND n.status = 'in_office' AND NOT p.is_test AND p.constituency = $1 LIMIT 1`,
    [constituency],
  );
  return mp;
}

/** The test MP with this postcode, added by the sync. */
export async function findTestMp(postcode: string): Promise<FoundMp | undefined> {
  const [mp] = await query<FoundMp>(`SELECT ${MP_COLUMNS} FROM ${POLITICIANS} WHERE p.test_postcode = $1`, [postcode]);
  return mp;
}

/** What one politician has answered to the letters we've asked them to sign, by ask. */
export async function statusesOf(politicianId: number): Promise<MpStatuses> {
  const rows = await query<{ ask: string; status: AskStatus }>(
    "SELECT ask, status FROM ask_statuses WHERE notable_person_id = $1 AND ask_kind = 'letter'",
    [politicianId],
  );
  return Object.fromEntries(rows.map((row) => [row.ask, row.status]));
}

type Row = Omit<Politician, "statuses"> & { statuses: Record<string, StatusRecord> | null };

const SELECT_POLITICIANS = `
  SELECT n.id::int AS id, n.airtable_id AS "airtableId", n.airtable_removed_at AS "airtableRemovedAt", p.house,
    n.name, n.forename, n.surname, n.salutation, p.constituency, p.party, p.country, p.city, n.email, n.status,
    n.notes, n.important_target AS "importantTarget", n.personal_connection AS "personalConnection",
    p.is_test AS "isTest",
    EXISTS (SELECT 1 FROM email_blocks b WHERE b.address = lower(n.email)) AS "emailBlocked",
    (SELECT count(*)::int FROM letters l WHERE l.notable_person_id = n.id AND l.status <> 'not_sent') AS "letters",
    (SELECT count(*)::int FROM letters l WHERE l.notable_person_id = n.id AND l.replied_at IS NOT NULL) AS "replies",
    json_object_agg(s.ask, json_build_object(
      'status', s.status, 'date', to_char(s.status_date, 'YYYY-MM-DD'), 'note', s.note,
      'updatedAt', s.updated_at, 'updatedBy', s.updated_by
    )) FILTER (WHERE s.ask IS NOT NULL) AS statuses
  FROM ${POLITICIANS} LEFT JOIN ask_statuses s ON s.notable_person_id = n.id`;

function toPolitician({ statuses, ...row }: Row): Politician {
  return { ...row, statuses: statuses ?? {} };
}

export type PoliticianFilter = {
  /** Matches name, constituency, party or email. */
  search?: string;
  house?: House;
  status?: PersonStatus;
  party?: string;
  importantTarget?: boolean;
  personalConnection?: boolean;
  /** Only those whose record is no longer in Airtable. */
  airtableRemoved?: boolean;
  /** Their answer to an ask: with `answer`, only those who gave it, or "none" for those who gave none. */
  ask?: string;
  /** A status, "none" for no answer, or, when undefined, any answer. */
  answer?: string;
  /** Only those whose address is blocked. */
  emailBlocked?: boolean;
  sort?: SortSpec<PoliticianSort>;
};

/** The politicians page's filters, each as typed in its URL. */
export type PoliticiansSearch = {
  q: string;
  house: string;
  status: string;
  party: string;
  /** "important", "connection" or "removed": the boxes ticked in Airtable, and those it no longer has. */
  flag: string;
  ask: string;
  answer: string;
  email: string;
  sort: string;
  dir: string;
};

/**
 * The politicians page's filter, from its URL: each field as typed, for the
 * form, and the filter they make, leaving out what's blank or unknown.
 */
export function politiciansSearch({
  q = "",
  house = "",
  status = "",
  party = "",
  flag = "",
  ask = "",
  answer = "",
  email = "",
  sort = "",
  dir = "",
}: Partial<PoliticiansSearch>): PoliticiansSearch & { filter: PoliticianFilter } {
  const filter: PoliticianFilter = {
    search: q || undefined,
    house: isHouse(house) ? house : undefined,
    status: isPersonStatus(status) ? status : undefined,
    party: party || undefined,
    importantTarget: flag === "important" || undefined,
    personalConnection: flag === "connection" || undefined,
    airtableRemoved: flag === "removed" || undefined,
    ask: ask || undefined,
    answer: (ask && answer) || undefined,
    emailBlocked: email === "blocked" || undefined,
    sort: parseSort(POLITICIAN_SORTS, "name", sort, dir),
  };
  return { q, house, status, party, flag, ask, answer, email, sort, dir, filter };
}

/** Politicians for the staff interface: the test MPs first, then by the column asked for, by name to start. */
export async function listPoliticians(filter: PoliticianFilter = {}, limit = 200): Promise<Politician[]> {
  const where: string[] = [];
  const values: unknown[] = [];
  const value = (v: unknown) => {
    values.push(v);
    return `$${values.length}`;
  };
  if (filter.search) {
    const like = value(`%${filter.search}%`);
    where.push(
      `(n.name ILIKE ${like} OR p.constituency ILIKE ${like} OR p.party ILIKE ${like} OR n.email ILIKE ${like})`,
    );
  }
  if (filter.house) where.push(`p.house = ${value(filter.house)}`);
  if (filter.status) where.push(`n.status = ${value(filter.status)}`);
  if (filter.party) where.push(`p.party = ${value(filter.party)}`);
  if (filter.importantTarget) where.push("n.important_target");
  if (filter.personalConnection) where.push("n.personal_connection");
  if (filter.airtableRemoved) where.push("n.airtable_removed_at IS NOT NULL");
  if (filter.ask) {
    const ask = value(filter.ask);
    if (filter.answer === "none") {
      where.push(`NOT EXISTS (SELECT 1 FROM ask_statuses a WHERE a.notable_person_id = n.id AND a.ask = ${ask})`);
    } else {
      const answer = filter.answer ? ` AND a.status = ${value(filter.answer)}` : "";
      where.push(`EXISTS (SELECT 1 FROM ask_statuses a WHERE a.notable_person_id = n.id AND a.ask = ${ask}${answer})`);
    }
  }
  if (filter.emailBlocked) {
    where.push("EXISTS (SELECT 1 FROM email_blocks b WHERE b.address = lower(n.email))");
  }
  const rows = await query<Row>(
    `${SELECT_POLITICIANS} ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     GROUP BY n.id, p.id ORDER BY p.is_test DESC, ${POLITICIAN_COLUMNS[filter.sort?.key ?? "name"]} ${filter.sort?.dir === "desc" ? "DESC" : "ASC"} NULLS LAST, n.name LIMIT ${value(limit)}`,
    values,
  );
  return rows.map(toPolitician);
}

export type NewPolitician = {
  house: House;
  name: string;
  salutation?: string;
  email: string | null;
  constituency?: string | null;
  party?: string;
  airtableId?: string;
};

/** Adds a politician: their notable person, then their politician row. Returns their ID. */
export async function addPolitician(politician: NewPolitician, db: Queryable, testPostcode?: string): Promise<number> {
  const [{ id }] = await query<{ id: number }>(
    `INSERT INTO notable_people (kind, name, salutation, email, airtable_id)
     VALUES ('politician', $1, $2, $3, $4) RETURNING id::int AS id`,
    [politician.name, politician.salutation ?? "", politician.email, politician.airtableId ?? null],
    db,
  );
  await query(
    `INSERT INTO politicians (id, house, constituency, party, is_test, test_postcode) VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      id,
      politician.house,
      politician.constituency ?? null,
      politician.party ?? "",
      testPostcode !== undefined,
      testPostcode ?? null,
    ],
    db,
  );
  return id;
}

/** Every party a politician has, for the list's filter. */
export async function politicianParties(): Promise<string[]> {
  const rows = await query<{ party: string }>(
    "SELECT DISTINCT party FROM politicians WHERE party <> '' ORDER BY party",
  );
  return rows.map((row) => row.party);
}

export async function getPolitician(id: number): Promise<Politician | undefined> {
  const [row] = await query<Row>(`${SELECT_POLITICIANS} WHERE n.id = $1 GROUP BY n.id, p.id`, [id]);
  return row && toPolitician(row);
}

export type StatusChange = { status: AskStatus | null; date: string | null; note: string };

/**
 * Sets, or with a null status clears, one politician's answer to one ask.
 * The ask's kind comes from the asks table, whose foreign keys refuse a
 * status the kind doesn't allow.
 */
export async function setStatus(
  politicianId: number,
  ask: string,
  change: StatusChange,
  staff: string,
  db?: Queryable,
): Promise<void> {
  const write = async (db: Queryable) => {
    if (change.status) {
      await query(
        `INSERT INTO ask_statuses (notable_person_id, ask, ask_kind, status, status_date, note, updated_by)
         SELECT $1, slug, kind, $3, $4, $5, $6 FROM asks WHERE slug = $2
         ON CONFLICT (notable_person_id, ask) DO UPDATE
         SET status = $3, status_date = $4, note = $5, updated_by = $6, updated_at = now()`,
        [politicianId, ask, change.status, change.date, change.note, staff],
        db,
      );
    } else {
      await query("DELETE FROM ask_statuses WHERE notable_person_id = $1 AND ask = $2", [politicianId, ask], db);
    }
    await logChange(staff, "set status", { politicianId, ask, ...change }, db);
  };
  await (db ? write(db) : transaction(write));
}

export type Signatory = { name: string; party: string; constituency: string; house: House };

/** Everyone who has signed a letter we asked them to, for the public list. Never the test MPs. */
export async function signatories(ask: string): Promise<Signatory[]> {
  return query<Signatory>(
    `SELECT n.name, p.party, coalesce(p.constituency, '') AS constituency, p.house
     FROM ${POLITICIANS} JOIN ask_statuses s ON s.notable_person_id = n.id
     WHERE s.ask = $1 AND s.status = 'signed' AND NOT p.is_test
     ORDER BY n.name`,
    [ask],
  );
}

/** A change to one politician from the audit log: who, when, what, and the details logged. */
export type PoliticianChange = AuditEntry;

/**
 * Everything the audit log holds about one politician, newest first: their
 * row added, their details edited, by staff or the sync, their record gone
 * from Airtable, their statuses set, by staff or an import, and their
 * address blocked or unblocked.
 */
export async function politicianHistory(id: number, email: string | null): Promise<PoliticianChange[]> {
  return query<PoliticianChange>(
    `SELECT id::int AS id, at, actor, action, details FROM audit_log
     WHERE (action IN ('add politician', 'edit politician', 'remove politician') AND (details->>'id')::bigint = $1)
        OR (action = 'set status' AND (details->>'politicianId')::bigint = $1)
        OR (action IN ('block address', 'unblock address') AND $2::text IS NOT NULL AND details->>'address' = lower($2))
     ORDER BY at DESC, id DESC`,
    [id, email],
  );
}
