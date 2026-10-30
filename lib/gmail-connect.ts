// Staff members' Gmail, for the pages: connecting it, through the route
// that goes to Google's consent and the one it comes back to, which goes
// back to the page it started from (app/(staff)/staff/api/gmail/); and the
// daily limit.

import { staffBack } from "./staff-search";

/**
 * The most the site sends from one account in a day, counting every
 * mailing: under Gmail's 2,000 (https://support.google.com/a/answer/166852),
 * so the person's own email still goes.
 */
/** The Gmail a new mailing is sent from when it's connected: the policy team's shared account. */
export const DEFAULT_SENDER = "policy@pauseai.uk";

export const GMAIL_DAILY_LIMIT = 1800;

const GMAIL_CONNECT_PATH = "/staff/api/gmail/connect";
export const GMAIL_CALLBACK_PATH = "/staff/api/gmail/callback";

/** The cookie that holds the consent's state, to check it comes back to the browser that started it, and the page to go back to. */
export const GMAIL_STATE_COOKIE = "staff_gmail";

/** How connecting ended, in the `gmail` parameter of the page it goes back to. */
export type GmailConnectOutcome = "connected" | "other-account" | "refused" | "failed";

/** A staff page to go back to: one of ours, never another site; the page of your own otherwise. */
export function backPath(back: string | null | undefined): string {
  return staffBack(back, "/staff/me");
}

/** Where connecting from `back` starts. */
export function connectPath(back: string): string {
  return `${GMAIL_CONNECT_PATH}?${new URLSearchParams({ back })}`;
}

/** `back`, saying how connecting ended. */
export function backWithOutcome(back: string, outcome: GmailConnectOutcome): string {
  const [path, query = ""] = back.split("?");
  const params = new URLSearchParams(query);
  params.set("gmail", outcome);
  return `${path}?${params}`;
}
