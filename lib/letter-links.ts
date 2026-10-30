// Where to find a letter as it was sent, in Gmail: a search to paste into
// the mailbox it's in, which works in any mailbox, a delegated one too. A
// link can't open a delegated mailbox, so there's none. The search names the email by its Message-ID where we know it;
// a supporter's letter's comes from Postmark's ID for it, at mtasv.net. A
// letter with none, one copied from Airtable, is searched for by its MP's
// address and a few minutes either side of when we recorded it went.

/** A letter's way into Gmail: the mailbox it's in, if we know it, and the search for it there. */
export type GmailFind = { mailbox: string | null; search: string };

/** How far either side of a letter's time a search by time looks, in minutes. */
const SEARCH_MINUTES = 5;

/** A search for the email that went with Message-ID `id`. */
export function messageIdSearch(id: string): string {
  return `rfc822msgid:${id}`;
}

/** A search for the Message-ID Postmark gave the email it sent with `postmarkId`. */
export function postmarkSearch(postmarkId: string): string {
  return messageIdSearch(`${postmarkId}@mtasv.net`);
}

/** A search for mail to `address` sent within SEARCH_MINUTES of `sentAt`. */
export function sentNearSearch(address: string, sentAt: string | Date): string {
  const seconds = Math.floor(new Date(sentAt).getTime() / 1000);
  const margin = SEARCH_MINUTES * 60;
  return `to:${address} after:${seconds - margin} before:${seconds + margin}`;
}
