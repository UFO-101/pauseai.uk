// Only file allowed to talk to api.airtable.com (enforced by the
// no-restricted-syntax rule in eslint.config.mjs) so the signed-only filter
// and field whitelist below can't be bypassed by a new call site elsewhere.
const BASE_ID = "appBInVvIm6opJ1Ob";
const TABLE_ID = "tblH3ks9wqQHLpYx3";

const FIELDS = ["Full name or Title", "Party", "Constituency"] as const;
const FILTER_FORMULA = "{Signed Frontier AI Letter}=TRUE()";

export type Signatory = {
  name: string;
  party: string;
  constituency: string;
};

export class AirtableRequestError extends Error {}

// Well past any realistic number of signatories (each page holds up to 100
// records), so a repeated/looping offset can't spin the request forever.
const MAX_PAGES = 100;

export async function fetchFrontierLetterSignatories(token: string): Promise<Signatory[]> {
  const signatories: Signatory[] = [];
  let offset: string | undefined;
  let pages = 0;

  do {
    if (++pages > MAX_PAGES) {
      throw new AirtableRequestError(`Airtable pagination exceeded ${MAX_PAGES} pages`);
    }

    const params = new URLSearchParams();
    params.set("filterByFormula", FILTER_FORMULA);
    for (const field of FIELDS) params.append("fields[]", field);
    if (offset) params.set("offset", offset);

    const res = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 3600 },
      },
    );

    if (!res.ok) {
      throw new AirtableRequestError(`Airtable request failed with status ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data.records)) {
      throw new AirtableRequestError("Airtable response missing records array");
    }
    for (const record of data.records) {
      signatories.push({
        name: record.fields["Full name or Title"] ?? "",
        party: record.fields["Party"] ?? "",
        constituency: record.fields["Constituency"] ?? "",
      });
    }
    offset = data.offset;
  } while (offset);

  return signatories;
}
