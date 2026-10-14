import "server-only";
import type { SyncedMp } from "@/lib/mps";
import { outsideFetch } from "./outside-fetch";

// Only file allowed to talk to api.airtable.com (enforced by the
// no-restricted-syntax rule in eslint.config.mjs) so the filters and field
// whitelists below can't be bypassed by a new call site elsewhere. Read only.
//
// Airtable's "UK Parliamentarians" table is the source of truth for who the
// MPs are and their emails (plans/email-your-mp-v2.md). Who has signed what
// lives in our database; the signatories are read from here once, to import.
const BASE_ID = "appBInVvIm6opJ1Ob";
const TABLE_ID = "tblH3ks9wqQHLpYx3";

export class AirtableRequestError extends Error {}

// Well past any realistic table (each page holds up to 100 records), so a
// repeated/looping offset can't spin the request forever.
const MAX_PAGES = 100;

type AirtableRecord = { id: string; fields: Record<string, unknown> };

/** Every record matching `formula`, with only `fields`. */
async function fetchRecords(token: string, formula: string, fields: readonly string[]): Promise<AirtableRecord[]> {
  const params = new URLSearchParams();
  params.set("filterByFormula", formula);
  for (const field of fields) params.append("fields[]", field);
  const found: AirtableRecord[] = [];
  let offset: string | undefined;
  let pages = 0;
  do {
    if (++pages > MAX_PAGES) throw new AirtableRequestError(`Airtable pagination exceeded ${MAX_PAGES} pages`);
    if (offset) params.set("offset", offset);
    const res = await outsideFetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new AirtableRequestError(`Airtable request failed with status ${res.status}`);
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

export const MPS_FORMULA = "AND({Body}='House of Commons',NOT({No longer in office}))";
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

export type SignatoryToImport = { airtableId: string; name: string; party: string; constituency: string; email: string; body: string };

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
