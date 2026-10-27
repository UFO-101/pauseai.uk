import "server-only";
import {
  CONTROLAI_STATEMENT_ASK,
  DEEPMIND_LETTER_ASK,
  EDINBURGH_CONFERENCE_ASK,
  FRONTIER_AI_LETTER_ASK,
  type AskStatus,
} from "@/lib/asks";
import type { PoliticianRecord, SyncedPolitician } from "@/lib/politician-sync";
import { outsideFetch } from "./outside-fetch";

// Only file allowed to talk to api.airtable.com (enforced by the
// no-restricted-syntax rule in eslint.config.mjs) so the filters and field
// whitelists below can't be bypassed by a new call site elsewhere. Read only.
//
// Airtable's "UK Parliamentarians" table is the source of truth for who the
// politicians are, their emails, and their answers to the asks it records.
// The site copies them nightly (lib/server/politician-sync.ts); staff set
// the rest of the statuses in our database.
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

// Every politician but the records ticked Test: the site keeps its own test
// MPs (lib/test-mps.json).
export const POLITICIANS_FORMULA = "NOT({Test})";

/**
 * The fields that record an answer to an ask (lib/asks.ts), each with the
 * ask and the status each of its values means: a tick box means signed, and
 * a select one of its answers. A value it doesn't know is refused.
 */
const ASK_FIELDS: Record<string, { ask: string; statuses: Record<string, AskStatus> }> = {
  "Signed Frontier AI Letter": { ask: FRONTIER_AI_LETTER_ASK, statuses: { true: "signed" } },
  "Signed DeepMind Letter": { ask: DEEPMIND_LETTER_ASK, statuses: { true: "signed" } },
  "ControlAI Signatory": { ask: CONTROLAI_STATEMENT_ASK, statuses: { true: "signed" } },
  "Edinburgh Conference November 2026": {
    ask: EDINBURGH_CONFERENCE_ASK,
    statuses: { Going: "going", Declined: "declined", "Passed on request": "passed_on" },
  },
};

/** The only fields read from a politician's record. */
export const POLITICIAN_FIELDS = [
  "Full name or Title",
  "Salutation",
  "Email",
  "Status",
  "Body",
  "Constituency",
  "Party",
  "Country",
  "Notes",
  "Recommended",
  "Important target",
  "Personal connection",
  ...Object.keys(ASK_FIELDS),
] as const;

const STATUSES: Record<string, SyncedPolitician["status"]> = {
  "": "in_office",
  Died: "died",
  Retired: "retired",
  "No longer in office": "left_office",
};

const HOUSES: Record<string, SyncedPolitician["house"]> = {
  "House of Commons": "commons",
  "House of Lords": "lords",
  "Scottish Parliament": "scottish-parliament",
  "Welsh Parliament": "senedd",
  "Northern Ireland Assembly": "ni-assembly",
};

const COUNTRIES: Record<string, SyncedPolitician["country"]> = {
  England: "england",
  Scotland: "scotland",
  Wales: "wales",
  "Northern Ireland": "northern-ireland",
};

/**
 * One record as a politician. Without a Body, someone with no constituency
 * is a peer; a Status or Country it doesn't know is refused, so the sync
 * fails rather than guess.
 */
function politicianFrom(record: AirtableRecord): SyncedPolitician {
  const body = text(record, "Body");
  const constituency = text(record, "Constituency") || null;
  const status = STATUSES[text(record, "Status")];
  if (!status) throw new AirtableRequestError(`Unknown Status "${text(record, "Status")}" on ${record.id}`);
  const country = text(record, "Country");
  if (country && !COUNTRIES[country]) throw new AirtableRequestError(`Unknown Country "${country}" on ${record.id}`);
  return {
    airtableId: record.id,
    name: text(record, "Full name or Title"),
    salutation: text(record, "Salutation"),
    email: text(record, "Email") || null,
    status,
    house: HOUSES[body] ?? (body || constituency ? "other" : "lords"),
    constituency,
    party: text(record, "Party"),
    country: COUNTRIES[country] ?? null,
    notes: [text(record, "Notes"), ticked(record, "Recommended") ? "Recommended" : ""].filter(Boolean).join("\n"),
    importantTarget: ticked(record, "Important target"),
    personalConnection: ticked(record, "Personal connection"),
  };
}

/** A record's answers to the asks, by the ask's slug. */
function statusesFrom(record: AirtableRecord): Record<string, AskStatus> {
  return Object.fromEntries(
    Object.entries(ASK_FIELDS).flatMap(([field, { ask, statuses }]) => {
      const value = record.fields[field];
      if (value === undefined || value === false || value === "") return [];
      const status = statuses[String(value)];
      if (!status) throw new AirtableRequestError(`Unknown ${field} "${String(value)}" on ${record.id}`);
      return [[ask, status]];
    }),
  );
}

/** Every politician in UK Parliamentarians but the test records, with their answers to the asks, by name. */
export async function fetchPoliticians(token: string): Promise<PoliticianRecord[]> {
  const records = await fetchRecords(token, POLITICIANS_FORMULA, POLITICIAN_FIELDS);
  return records
    .map((record) => ({ politician: politicianFrom(record), statuses: statusesFrom(record) }))
    .sort((a, b) => a.politician.name.localeCompare(b.politician.name));
}

/** The asks the politicians' records answer, which the sync alone sets from them. */
export const AIRTABLE_ASKS = Object.values(ASK_FIELDS).map((field) => field.ask);

/** A link to records in another table: their IDs. */
function links(record: AirtableRecord, field: string): string[] {
  const value = record.fields[field];
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
}

// PauseAI's emails to politicians, a record each, with a tick box for the
// mailing it was part of. Only those from 2026 are copied.
/** The IDs of the politicians' records ticked Test, which the politicians sync skips. */
export async function fetchTestPoliticianIds(token: string): Promise<string[]> {
  const records = await fetchRecords(token, "{Test}", ["Test"]);
  // Checked here too, as the formula only narrows what Airtable sends.
  return records.filter((record) => ticked(record, "Test")).map((record) => record.id);
}

const EMAILS_TABLE_ID = "tblp4nH5Jymq48rcm";
export const EMAILS_FORMULA = "IS_AFTER({Timestamp},'2025-12-31T23:59:59.000Z')";

export type EmailToImport = {
  airtableId: string;
  /** When it was sent. */
  at: string;
  /** The politicians' Airtable record IDs: one, unless the record is broken. */
  politicians: string[];
  personalised: boolean;
  /** Which of the mailings' tick boxes are ticked. */
  mailings: string[];
};

/** PauseAI's 2026 emails to politicians, reading the tick boxes of the mailings named `mailingFields`. */
export async function fetchEmails(token: string, mailingFields: readonly string[]): Promise<EmailToImport[]> {
  const fields = ["Timestamp", "UK Parliamentarian", "Personalized", ...mailingFields];
  const records = await fetchRecords(token, EMAILS_FORMULA, fields, `${BASE_ID}/${EMAILS_TABLE_ID}`);
  return records.map((record) => ({
    airtableId: record.id,
    at: text(record, "Timestamp"),
    politicians: links(record, "UK Parliamentarian"),
    personalised: ticked(record, "Personalized"),
    mailings: mailingFields.filter((field) => ticked(record, field)),
  }));
}

// The letters supporters sent through pauseai.info's old form, which wrote
// each to Airtable for an automation to send. Never the message itself.
const WEB_FORM_TABLE_ID = "tblkzjrRHiZiqMDGR";
const WEB_FORM_FIELDS = [
  "Sender email",
  "Sender name",
  "Sender postcode",
  "Recipient",
  "Subject",
  "Form Submitted Timestamp",
  "Email Sent Time",
  "Spam",
  "Invalid, can't send",
  "Campaign",
  "Contact consent",
] as const;

export type WebFormLetterToImport = {
  airtableId: string;
  senderName: string;
  senderEmail: string;
  senderPostcode: string;
  /** The politician's Airtable record ID: one, unless the record is broken. */
  recipients: string[];
  subject: string;
  /** Airtable's Campaign: "Frontier AI letter", "Liability letter" or "DeepMind letter". */
  campaign: string;
  submittedAt: string | null;
  /** When the automation sent it, if it did. */
  sentAt: string | null;
  spam: boolean;
  invalid: boolean;
  /** "Contact consent": ticked Yes. Blank, as on every letter before the box was added, is no. */
  consent: boolean;
};

/** Every letter in the old form's table. */
export async function fetchWebFormLetters(token: string): Promise<WebFormLetterToImport[]> {
  const records = await fetchRecords(token, "TRUE()", WEB_FORM_FIELDS, `${BASE_ID}/${WEB_FORM_TABLE_ID}`);
  return records.map((record) => ({
    airtableId: record.id,
    senderName: text(record, "Sender name"),
    senderEmail: text(record, "Sender email"),
    senderPostcode: text(record, "Sender postcode"),
    recipients: links(record, "Recipient"),
    subject: text(record, "Subject"),
    campaign: text(record, "Campaign"),
    submittedAt: text(record, "Form Submitted Timestamp") || null,
    sentAt: text(record, "Email Sent Time") || null,
    spam: ticked(record, "Spam"),
    invalid: ticked(record, "Invalid, can't send"),
    consent: text(record, "Contact consent") === "Yes",
  }));
}

// Go to Parliament, 20 October 2026: a record per guest, with whether a
// meeting with their MP was arranged. Only the MP and that are read.
const GO_TO_PARLIAMENT_TABLE_ID = "tblminXS1xSuBbEjz";
export const GO_TO_PARLIAMENT_FORMULA = "{MP Meeting Status}!=''";

export type MeetingToImport = {
  /** The MPs' Airtable record IDs. */
  politicians: string[];
  /** "MP Meeting Status": Secured, Tentative yes, Meeting with staff, and so on. */
  status: string;
};

/** Every guest whose meeting with their MP has a status, by the MP. */
export async function fetchGoToParliamentMeetings(token: string): Promise<MeetingToImport[]> {
  const records = await fetchRecords(
    token,
    GO_TO_PARLIAMENT_FORMULA,
    ["UK Parliamentarians", "MP Meeting Status"],
    `${BASE_ID}/${GO_TO_PARLIAMENT_TABLE_ID}`,
  );
  return records.map((record) => ({
    politicians: links(record, "UK Parliamentarians"),
    status: text(record, "MP Meeting Status"),
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
