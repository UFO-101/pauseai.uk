// Email your MP's steps are separate pages: the lookup on the campaign's
// page, then writing the letter, its preview, and "sent". What one hands to
// the next is kept in sessionStorage, so it survives a reload or going back,
// and never goes in a URL: the lookup, then the letter as written, and once
// it's sent, only the MP's name.
import type { Place } from "@/lib/events";
import type { LetterDoc } from "@/lib/letter-format";
import type { Mp, MpStatuses } from "@/lib/email-your-mp";

const LOOKUP_KEY = "email-your-mp-lookup";
const DRAFT_KEY = "email-your-mp-draft";
const SENT_KEY = "email-your-mp-sent";

/** Who's writing to which MP, for which campaign: from "Find my MP". */
export type Lookup = {
  /** The slug of the campaign to write for. */
  campaign: string;
  name: string;
  postcode: string;
  mp: Mp;
  statuses: MpStatuses;
  /** The campaign whose page moved on to this one, as the MP had done it. */
  movedFrom?: string;
  /** Where the postcode is, for events nearby, if known. */
  place?: Place | null;
};

export type Draft = {
  /** The slug of the campaign it's for. */
  campaign: string;
  name: string;
  postcode: string;
  mp: Mp;
  statuses: MpStatuses;
  email: string;
  address: string;
  subject: string;
  letter: LetterDoc;
  /** The hidden field only a bot fills in, passed on for the server to check. */
  nickname: string;
};

export type Sent = { campaign: string; mpName: string };

function save(key: string, value: unknown): boolean {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** What's kept under `key`, if it's for `campaign`, or for any if none is given. */
function read<T extends { campaign: string }>(key: string, campaign?: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    const value: T | null = raw ? JSON.parse(raw) : null;
    return campaign === undefined || value?.campaign === campaign ? value : null;
  } catch {
    return null;
  }
}

/**
 * A new lookup, which starts a new letter: any draft goes. False if the
 * browser won't store it, so there's no page to write the letter on.
 */
export function saveLookup(lookup: Lookup): boolean {
  if (!save(LOOKUP_KEY, lookup)) return false;
  sessionStorage.removeItem(DRAFT_KEY);
  return true;
}

/** The latest lookup, for this campaign or, without one, for any. Left in place, so a reload or going back finds it again. */
export function readLookup(campaign?: string): Lookup | null {
  return read<Lookup>(LOOKUP_KEY, campaign);
}

/** False if the browser won't store it, so there's no preview to go to. */
export function saveDraft(draft: Draft): boolean {
  return save(DRAFT_KEY, draft);
}

/** The draft for this campaign, if any. Left in place, so a reload finds it again. */
export function readDraft(campaign: string): Draft | null {
  return read<Draft>(DRAFT_KEY, campaign);
}

/** Once it's sent: the draft goes, and the MP's name stays for the "sent" page. */
export function markSent(sent: Sent): void {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // The browser won't store anything, so there's no draft to remove.
  }
  save(SENT_KEY, sent);
}

/** The letter just sent for this campaign, if any. */
export function readSent(campaign: string): Sent | null {
  return read<Sent>(SENT_KEY, campaign);
}
