import "server-only";
import type { CampaignStatus } from "@/lib/content/email-your-mp";
import type { Mp, MpStatuses } from "@/lib/email-your-mp";
import { query, transaction, type Queryable } from "./db";
import { logChange } from "./audit";

// Politicians and their status for each campaign. MPs are copied from
// Airtable nightly (mp-sync.ts); other signers came from the signatory
// import, and staff edit them and set statuses in the staff interface.

export const HOUSES = ["commons", "lords", "scottish-parliament", "senedd", "ni-assembly", "other"] as const;
export type House = (typeof HOUSES)[number];

export function isHouse(value: string): value is House {
  return (HOUSES as readonly string[]).includes(value);
}

export type StatusRecord = {
  status: CampaignStatus;
  /** yyyy-mm-dd, if known. */
  date: string | null;
  note: string;
  updatedAt: string;
  updatedBy: string;
};

export type Politician = {
  id: number;
  /** Airtable's record ID, for MPs copied from it. Null for signers added by hand, and the test MPs. */
  airtableId: string | null;
  house: House;
  name: string;
  salutation: string;
  constituency: string | null;
  party: string;
  email: string | null;
  isTest: boolean;
  sitting: boolean;
  /** Their address bounced or complained, so nothing is sent to it (lib/server/email.ts). */
  emailBlocked: boolean;
  statuses: Record<string, StatusRecord>;
};

/** An MP the form can write to, with their row's ID. */
export type FoundMp = Mp & { id: number; isTest: boolean };

const MP_COLUMNS = `id::int AS id, name, salutation, constituency, email, is_test AS "isTest",
  EXISTS (SELECT 1 FROM email_blocks b WHERE b.address = lower(politicians.email)) AS unreachable`;

/** The sitting MP for a constituency. */
export async function findSittingMp(constituency: string): Promise<FoundMp | undefined> {
  const [mp] = await query<FoundMp>(
    `SELECT ${MP_COLUMNS} FROM politicians WHERE house = 'commons' AND sitting AND NOT is_test AND constituency = $1 LIMIT 1`,
    [constituency],
  );
  return mp;
}

/** The test MP with this postcode, added by the sync. */
export async function findTestMp(postcode: string): Promise<FoundMp | undefined> {
  const [mp] = await query<FoundMp>(`SELECT ${MP_COLUMNS} FROM politicians WHERE test_postcode = $1`, [postcode]);
  return mp;
}

/** What one politician has done, by campaign. */
export async function statusesOf(politicianId: number): Promise<MpStatuses> {
  const rows = await query<{ campaign: string; status: CampaignStatus }>(
    "SELECT campaign, status FROM campaign_statuses WHERE politician_id = $1",
    [politicianId],
  );
  return Object.fromEntries(rows.map((row) => [row.campaign, row.status]));
}

type Row = Omit<Politician, "statuses"> & { statuses: Record<string, StatusRecord> | null };

const SELECT_POLITICIANS = `
  SELECT p.id::int AS id, p.airtable_id AS "airtableId", p.house, p.name, p.salutation, p.constituency,
    p.party, p.email, p.is_test AS "isTest", p.sitting,
    EXISTS (SELECT 1 FROM email_blocks b WHERE b.address = lower(p.email)) AS "emailBlocked",
    json_object_agg(s.campaign, json_build_object(
      'status', s.status, 'date', to_char(s.status_date, 'YYYY-MM-DD'), 'note', s.note,
      'updatedAt', s.updated_at, 'updatedBy', s.updated_by
    )) FILTER (WHERE s.campaign IS NOT NULL) AS statuses
  FROM politicians p LEFT JOIN campaign_statuses s ON s.politician_id = p.id`;

function toPolitician({ statuses, ...row }: Row): Politician {
  return { ...row, statuses: statuses ?? {} };
}

export type PoliticianFilter = {
  /** Matches name, constituency, party or email. */
  search?: string;
  house?: House;
  /** Only those with a status for this campaign. */
  campaign?: string;
  /** Only those whose address is blocked. */
  emailBlocked?: boolean;
};

/**
 * The politicians page's filter, from its URL: each field as typed, for the
 * form, and the filter they make, leaving out what's blank or not a house.
 */
export function politiciansSearch({
  q = "",
  house = "",
  campaign = "",
  email = "",
}: {
  q?: string;
  house?: string;
  campaign?: string;
  email?: string;
}) {
  const filter: PoliticianFilter = {
    search: q || undefined,
    house: isHouse(house) ? house : undefined,
    campaign: campaign || undefined,
    emailBlocked: email === "blocked" || undefined,
  };
  return { q, house, campaign, email, filter };
}

/** Politicians for the staff interface: the test MP first, then by name. */
export async function listPoliticians(filter: PoliticianFilter = {}, limit = 200): Promise<Politician[]> {
  const where: string[] = [];
  const values: unknown[] = [];
  if (filter.search) {
    values.push(`%${filter.search}%`);
    where.push(
      `(p.name ILIKE $${values.length} OR p.constituency ILIKE $${values.length} OR p.party ILIKE $${values.length} OR p.email ILIKE $${values.length})`,
    );
  }
  if (filter.house) {
    values.push(filter.house);
    where.push(`p.house = $${values.length}`);
  }
  if (filter.campaign) {
    values.push(filter.campaign);
    where.push(
      `EXISTS (SELECT 1 FROM campaign_statuses c WHERE c.politician_id = p.id AND c.campaign = $${values.length})`,
    );
  }
  if (filter.emailBlocked) {
    where.push("EXISTS (SELECT 1 FROM email_blocks b WHERE b.address = lower(p.email))");
  }
  values.push(limit);
  const rows = await query<Row>(
    `${SELECT_POLITICIANS} ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     GROUP BY p.id ORDER BY p.is_test DESC, p.name LIMIT $${values.length}`,
    values,
  );
  return rows.map(toPolitician);
}

export async function getPolitician(id: number): Promise<Politician | undefined> {
  const [row] = await query<Row>(`${SELECT_POLITICIANS} WHERE p.id = $1 GROUP BY p.id`, [id]);
  return row && toPolitician(row);
}

export type PoliticianDetails = {
  house: House;
  name: string;
  salutation: string;
  constituency: string | null;
  party: string;
  email: string | null;
};

/**
 * Edits a politician added by hand. MPs from Parliament are left to the
 * sync, which would only overwrite the change.
 */
export async function updatePolitician(id: number, details: PoliticianDetails, staff: string): Promise<boolean> {
  return transaction(async (db) => {
    const updated = await query(
      `UPDATE politicians SET house = $2, name = $3, salutation = $4, constituency = $5, party = $6, email = $7, updated_at = now()
       WHERE id = $1 AND airtable_id IS NULL AND NOT is_test RETURNING id`,
      [id, details.house, details.name, details.salutation, details.constituency, details.party, details.email],
      db,
    );
    if (updated.length) await logChange(staff, "edit politician", { id, ...details }, db);
    return updated.length > 0;
  });
}

export type StatusChange = { status: CampaignStatus | null; date: string | null; note: string };

/** Sets, or with a null status clears, one politician's status for one campaign. */
export async function setStatus(
  politicianId: number,
  campaign: string,
  change: StatusChange,
  staff: string,
  db?: Queryable,
): Promise<void> {
  const write = async (db: Queryable) => {
    if (change.status) {
      await query(
        `INSERT INTO campaign_statuses (politician_id, campaign, status, status_date, note, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (politician_id, campaign) DO UPDATE
         SET status = $3, status_date = $4, note = $5, updated_by = $6, updated_at = now()`,
        [politicianId, campaign, change.status, change.date, change.note, staff],
        db,
      );
    } else {
      await query(
        "DELETE FROM campaign_statuses WHERE politician_id = $1 AND campaign = $2",
        [politicianId, campaign],
        db,
      );
    }
    await logChange(staff, "set status", { politicianId, campaign, ...change }, db);
  };
  await (db ? write(db) : transaction(write));
}

export type Signatory = { name: string; party: string; constituency: string; house: House };

/** Everyone who has signed a campaign, for the public list. Never the test MP. */
export async function signatories(campaign: string): Promise<Signatory[]> {
  return query<Signatory>(
    `SELECT p.name, p.party, coalesce(p.constituency, '') AS constituency, p.house
     FROM politicians p JOIN campaign_statuses s ON s.politician_id = p.id
     WHERE s.campaign = $1 AND s.status = 'signed' AND NOT p.is_test
     ORDER BY p.name`,
    [campaign],
  );
}
