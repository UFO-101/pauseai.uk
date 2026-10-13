import "server-only";
import type { MpStatuses } from "@/lib/email-your-mp";
import { outsideFetch } from "./outside-fetch";

// Only file allowed to talk to api.airtable.com (enforced by the
// no-restricted-syntax rule in eslint.config.mjs) so the signed-only filter
// and field whitelist below can't be bypassed by a new call site elsewhere.
const BASE_ID = "appBInVvIm6opJ1Ob";
const TABLE_ID = "tblH3ks9wqQHLpYx3";
// The Emails table. Its 8am automation sends each new record to the MP.
const LETTERS_TABLE_ID = "tblkzjrRHiZiqMDGR";

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

    const res = await outsideFetch(
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

const API = `https://api.airtable.com/v0/${BASE_ID}`;

/** An MP's record in the parliamentarians table, and their campaign statuses. */
export type Parliamentarian = { recordId: string; statuses: MpStatuses };

/**
 * The parliamentarian with this email. The email goes into a formula, so it
 * must come from our own MP list, never from a form.
 */
export async function fetchParliamentarian(token: string, email: string): Promise<Parliamentarian | undefined> {
  const params = new URLSearchParams();
  params.set("filterByFormula", `{Email} = ${JSON.stringify(email)}`);
  params.append("fields[]", "Signed Frontier AI Letter");
  const res = await outsideFetch(`${API}/${TABLE_ID}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new AirtableRequestError(`Airtable request failed with status ${res.status}`);
  const data = await res.json();
  const record = data.records?.[0];
  if (!record) return undefined;
  // Airtable records only the first campaign. The others start in the
  // database (stage 3 of plans/email-your-mp-v2.md).
  const statuses: MpStatuses = record.fields["Signed Frontier AI Letter"] ? { "letter-to-the-prime-minister": "signed" } : {};
  return { recordId: record.id, statuses };
}

export type LetterRecord = {
  senderEmail: string;
  senderName: string;
  senderPostcode: string;
  mpRecordId: string;
  subject: string;
  message: string;
  /** The Campaign single-select, which the automation reads. */
  campaign: string;
  contactConsent: boolean;
};

/** A letter for the 8am automation to send. Returns the new record's ID. */
export async function createLetterRecord(token: string, letter: LetterRecord): Promise<string> {
  const res = await outsideFetch(`${API}/${LETTERS_TABLE_ID}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      // Lets a new campaign name become a new option on the Campaign field.
      typecast: true,
      fields: {
        "Sender email": letter.senderEmail,
        "Sender name": letter.senderName,
        "Sender postcode": letter.senderPostcode,
        Recipient: [letter.mpRecordId],
        Subject: letter.subject,
        Message: letter.message,
        Campaign: letter.campaign,
        "Contact consent": letter.contactConsent ? "Yes" : "No",
      },
    }),
  });
  if (!res.ok) throw new AirtableRequestError(`Airtable request failed with status ${res.status}`);
  const data = await res.json();
  return data.id;
}
