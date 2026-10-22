import "server-only";
import type { SyncedMp } from "@/lib/mps";
import { outsideFetch } from "./outside-fetch";

// Only file allowed to talk to api.airtable.com (enforced by the
// no-restricted-syntax rule in eslint.config.mjs) so the filters and field
// whitelists below can't be bypassed by a new call site elsewhere. Read only.
//
// Airtable's "UK Parliamentarians" table is the source of truth for who the
// MPs are and their emails. Who has signed what
// lives in our database; the signatories are read from here once, to import.
const BASE_ID = "appBInVvIm6opJ1Ob";
const TABLE_ID = "tblH3ks9wqQHLpYx3";

/** The table in Airtable's own interface, for staff to open. */
export const PARLIAMENTARIANS_TABLE_URL = `https://airtable.com/${BASE_ID}/${TABLE_ID}`;

// Stichting PauseAI's "Members & Actions" base: everyone who joined
// PauseAI, worldwide. Its Members table is theirs; we read the UK members
// we may hold (MEMBERS_FORMULA).
const MEMBERS_BASE_ID = "appWPTGqZmUcs3NWu";
const MEMBERS_TABLE_ID = "tblL1icZBhTV1gQ9o";

export class AirtableRequestError extends Error {}

/** AIRTABLE_TOKEN, or throws: without it, nothing can be read from Airtable. */
export function airtableToken(): string {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) throw new Error("AIRTABLE_TOKEN isn't set, so nothing can be read from Airtable");
  return token;
}

// Well past any realistic table (each page holds up to 100 records), so a
// repeated/looping offset can't spin the request forever.
const MAX_PAGES = 100;

type AirtableRecord = { id: string; fields: Record<string, unknown> };

/** Every record in `table` (base and table IDs) matching `formula`, with only `fields`. */
async function fetchRecords(
  token: string,
  formula: string,
  fields: readonly string[],
  table = `${BASE_ID}/${TABLE_ID}`,
): Promise<AirtableRecord[]> {
  const params = new URLSearchParams();
  params.set("filterByFormula", formula);
  for (const field of fields) params.append("fields[]", field);
  const found: AirtableRecord[] = [];
  let offset: string | undefined;
  let pages = 0;
  do {
    if (++pages > MAX_PAGES) throw new AirtableRequestError(`Airtable pagination exceeded ${MAX_PAGES} pages`);
    if (offset) params.set("offset", offset);
    const res = await outsideFetch(`https://api.airtable.com/v0/${table}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    // Airtable says what's wrong (a field the table doesn't have, a bad
    // formula) in the body, which the log needs to say which.
    if (!res.ok)
      throw new AirtableRequestError(`Airtable request failed with status ${res.status}: ${await res.text()}`);
    const data = await res.json();
    found.push(...(data.records ?? []));
    offset = data.offset;
  } while (offset);
  return found;
}

/** A field as trimmed text, or "" if it's missing or not text. */
function text(record: AirtableRecord, field: string): string {
  const value = record.fields[field];
  return typeof value === "string" ? value.trim() : "";
}

// Status is blank while they're in office; otherwise Died, Retired or No
// longer in office.
export const MPS_FORMULA = "AND({Body}='House of Commons',{Status}=BLANK())";
const MP_FIELDS = ["Full name or Title", "Salutation", "Constituency", "Party", "Email"] as const;

/** The sitting MPs, sorted by constituency. */
export async function fetchMps(token: string): Promise<SyncedMp[]> {
  const records = await fetchRecords(token, MPS_FORMULA, MP_FIELDS);
  return records
    .map((record) => ({
      airtableId: record.id,
      name: text(record, "Full name or Title"),
      salutation: text(record, "Salutation"),
      constituency: text(record, "Constituency"),
      party: text(record, "Party"),
      email: text(record, "Email") || null,
    }))
    .sort((a, b) => a.constituency.localeCompare(b.constituency));
}

const SIGNATORY_FIELDS = ["Full name or Title", "Party", "Constituency", "Email", "Body"] as const;

export type SignatoryToImport = {
  airtableId: string;
  name: string;
  party: string;
  constituency: string;
  email: string;
  body: string;
};

/** Everyone who signed the letter to the Prime Minister. */
export async function fetchSignatoriesForImport(token: string): Promise<SignatoryToImport[]> {
  const records = await fetchRecords(token, "{Signed Frontier AI Letter}=TRUE()", SIGNATORY_FIELDS);
  return records.map((record) => ({
    airtableId: record.id,
    name: text(record, "Full name or Title"),
    party: text(record, "Party"),
    constituency: text(record, "Constituency"),
    email: text(record, "Email"),
    body: text(record, "Body"),
  }));
}

// UK members who shared their details with PauseAI UK on the join form, or
// joined before it asked (from July 2026), less the losing half of each
// merged duplicate.
export const MEMBERS_FORMULA =
  "AND({Country}='United Kingdom',OR({GDPR chapter share permission}=TRUE(),IS_BEFORE({Created Datetime},'2026-07-01')),{Merged into}=BLANK())";

/** The only fields copied from a member's record: what the members table stores (docs/data-protection.md). */
export const MEMBER_FIELDS = [
  "Full name",
  "Email",
  "Phone",
  "City",
  "Zip code",
  "Joined Datetime",
  "Created Datetime",
  "Last Modified",
  "Email subscription",
  "Email subscription (old)",
  "GDPR chapter share permission",
  "Source page",
  "Intent",
] as const;

export type MemberToImport = {
  id: string;
  /** Trimmed and lowercased. */
  email: string;
  name: string;
  phone: string | null;
  city: string | null;
  postcode: string | null;
  /** Their first join. Airtable gives a day: the record's own time when it's that day, else its midnight. */
  joinedAt: string;
  createdAt: string;
  /** "Keep me informed": ticked, and not "No" in the older Yes/No field. */
  keepInformed: boolean;
  sharePermission: boolean;
  sourcePage: string | null;
  intent: string | null;
  modifiedAt: string;
};

/** A checkbox: Airtable leaves out an unticked one. */
function ticked(record: AirtableRecord, field: string): boolean {
  return record.fields[field] === true;
}

/** Every UK member we may hold, without those with no email. */
export async function fetchMembers(token: string): Promise<MemberToImport[]> {
  const records = await fetchRecords(token, MEMBERS_FORMULA, MEMBER_FIELDS, `${MEMBERS_BASE_ID}/${MEMBERS_TABLE_ID}`);
  return records
    .map((record) => {
      const createdAt = text(record, "Created Datetime");
      const joined = text(record, "Joined Datetime");
      return {
        id: record.id,
        email: text(record, "Email").toLowerCase(),
        name: text(record, "Full name"),
        phone: text(record, "Phone") || null,
        city: text(record, "City") || null,
        postcode: text(record, "Zip code") || null,
        joinedAt: !joined || createdAt.startsWith(joined) ? createdAt : `${joined}T00:00:00.000Z`,
        createdAt,
        keepInformed: ticked(record, "Email subscription") && text(record, "Email subscription (old)") !== "No",
        sharePermission: ticked(record, "GDPR chapter share permission"),
        sourcePage: text(record, "Source page") || null,
        intent: text(record, "Intent") || null,
        modifiedAt: text(record, "Last Modified"),
      };
    })
    .filter((member) => member.email !== "");
}
