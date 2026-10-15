// The letter between the form, its preview and the "sent" page, which are
// separate pages: kept in sessionStorage, so it survives a reload or going
// back to edit, and never goes in a URL. Once it's sent, only the MP's name
// is kept, for the "sent" page.
import type { LetterDoc } from "@/lib/letter-format";
import type { Mp, MpStatuses } from "@/lib/email-your-mp";

const DRAFT_KEY = "email-your-mp-draft";
const SENT_KEY = "email-your-mp-sent";

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

function read<T extends { campaign: string }>(key: string, campaign: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    const value: T | null = raw ? JSON.parse(raw) : null;
    return value?.campaign === campaign ? value : null;
  } catch {
    return null;
  }
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
