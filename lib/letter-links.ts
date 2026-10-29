// Where to read a letter as it was sent, in Google. A supporter's letter
// was Bcc'd to policy@pauseai.uk, a Google Group, which finds a message by
// its Message-ID; Postmark makes that from its own ID, at mtasv.net.
// PauseAI's letters were sent from a Gmail account, with no ID kept, so
// the way to them is a search of the account for mail to the politician
// sent a few minutes either side of when we recorded it.

/** The policy@ group's page for the message Postmark sent with `postmarkId`. */
export function googleGroupUrl(postmarkId: string): string {
  return `https://groups.google.com/a/pauseai.uk/d/msgid/policy/${postmarkId}@mtasv.net`;
}

/** How far either side of a letter's time a Gmail search looks, in minutes. */
const GMAIL_SEARCH_MINUTES = 5;

/** A search of the signed-in Gmail account for mail to `address` sent within GMAIL_SEARCH_MINUTES of `sentAt`. */
export function gmailSearchUrl(address: string, sentAt: string | Date): string {
  const seconds = Math.floor(new Date(sentAt).getTime() / 1000);
  const margin = GMAIL_SEARCH_MINUTES * 60;
  const search = `to:${address} after:${seconds - margin} before:${seconds + margin}`;
  return `https://mail.google.com/mail/#search/${encodeURIComponent(search)}`;
}
