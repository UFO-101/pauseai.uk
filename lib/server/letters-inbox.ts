import "server-only";

// The letters inbox: the Gmail account supporters' letters to MPs go from,
// used for nothing else. Its address is LETTERS_INBOX, set only where the
// site runs, as the repo is public; every proxy is a plus address on it,
// <local>+<tag>@<domain>, built from the variable, so no address is
// written in the code. It's connected on /staff/me by someone logged in as
// it, like a staff member's Gmail (lib/server/gmail-accounts.ts).

export { LETTERS_DAILY_LIMIT } from "@/lib/gmail-connect";

/** The letters inbox's own address, lowercased; undefined where it isn't set. */
export function lettersInbox(): string | undefined {
  return process.env.LETTERS_INBOX?.trim().toLowerCase() || undefined;
}

/** The letters inbox's address split at its @. */
function parts(): { local: string; domain: string } | undefined {
  const inbox = lettersInbox();
  if (!inbox) return undefined;
  const at = inbox.lastIndexOf("@");
  return { local: inbox.slice(0, at), domain: inbox.slice(at + 1) };
}

/** The proxy with `tag`: letters+jane.smith@example.org. Throws where LETTERS_INBOX isn't set. */
export function proxyAddress(tag: string): string {
  const inbox = parts();
  if (!inbox) throw new Error("LETTERS_INBOX isn't set");
  return `${inbox.local}+${tag}@${inbox.domain}`;
}

/**
 * Whether `address` is the letters inbox's, its own or a proxy, in any
 * case: mail to one comes back to us.
 */
export function isLettersInboxAddress(address: string): boolean {
  const inbox = parts();
  const match = /^([^@+]+)(?:\+[^@]*)?@(.+)$/.exec(address.trim().toLowerCase());
  return !!inbox && !!match && match[1] === inbox.local && match[2] === inbox.domain;
}

/** The tag of a proxy, lowercased: jane.smith for letters+Jane.Smith@example.org; undefined for any other address. */
export function proxyTag(address: string): string | undefined {
  const inbox = parts();
  const match = /^([^@+]+)\+([^@]+)@(.+)$/.exec(address.trim().toLowerCase());
  return inbox && match && match[1] === inbox.local && match[3] === inbox.domain ? match[2] : undefined;
}
