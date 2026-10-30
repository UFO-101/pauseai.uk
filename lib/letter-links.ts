// Where to find a letter as it was sent, in Gmail: a search, which works
// pasted into any mailbox, delegated ones too, and a link that opens the
// mailbox it's in, which works only for someone signed in to that account
// itself. The search names the email by its Message-ID where we know it;
// a supporter's letter's comes from Postmark's ID for it, at mtasv.net. A
// letter with none, one copied from Airtable, is searched for by its MP's
// address and a few minutes either side of when we recorded it went.

/** A letter's way into Gmail: the mailbox it's in, if we know it; the search for it there; and its thread, if we know that. */
export type GmailFind = { mailbox: string | null; search: string; threadId: string | null };

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

/**
 * Gmail, as `mailbox`, at the letter's thread or else its search. Gmail
 * switches to the account named by `authuser` when it's signed in, and
 * otherwise opens the first signed in; it doesn't open a delegated mailbox.
 */
export function gmailUrl(mailbox: string, { search, threadId }: Pick<GmailFind, "search" | "threadId">): string {
  const at = threadId ? `all/${threadId}` : `search/${encodeURIComponent(search)}`;
  return `https://mail.google.com/mail/?authuser=${encodeURIComponent(mailbox)}#${at}`;
}
