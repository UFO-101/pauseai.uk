import "server-only";
import { outsideFetch } from "./outside-fetch";

// Only file allowed to talk to api.airtable.com (enforced by the
// no-restricted-syntax rule in eslint.config.mjs) so the signed-only filter
// and field whitelist below can't be bypassed by a new call site elsewhere.
//
// All that's left is reading the signatories for their one-off import into
// the database (lib/server/signatory-import.ts). Once that has run in
// production, this file goes (plans/email-your-mp-v2.md).
const BASE_ID = "appBInVvIm6opJ1Ob";
const TABLE_ID = "tblH3ks9wqQHLpYx3";

const FIELDS = ["Full name or Title", "Party", "Constituency", "Email"] as const;
const FILTER_FORMULA = "{Signed Frontier AI Letter}=TRUE()";

export class AirtableRequestError extends Error {}

// Well past any realistic number of signatories (each page holds up to 100
// records), so a repeated/looping offset can't spin the request forever.
const MAX_PAGES = 100;

export type SignatoryToImport = { name: string; party: string; constituency: string; email: string };

/** Everyone who signed the letter to the Prime Minister, with their email. */
export async function fetchSignatoriesForImport(token: string): Promise<SignatoryToImport[]> {
  const params = new URLSearchParams();
  params.set("filterByFormula", FILTER_FORMULA);
  for (const field of FIELDS) params.append("fields[]", field);
  const found: SignatoryToImport[] = [];
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
    for (const record of data.records ?? []) {
      found.push({
        name: record.fields["Full name or Title"] ?? "",
        party: record.fields["Party"] ?? "",
        constituency: record.fields["Constituency"] ?? "",
        email: record.fields["Email"] ?? "",
      });
    }
    offset = data.offset;
  } while (offset);
  return found;
}
