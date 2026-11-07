import { addressesIn } from "@/lib/email-parsing/addresses";
import { quotedHeaders } from "@/lib/email-parsing/quoted";

// One-off emails: threads with a politician that aren't a letter of a
// campaign or mailing. What counts as one, and who a thread's people are
// (lib/server/one-off-emails.ts keeps them).

/** The mailboxes whose threads with politicians the regular read keeps: the shared one, and Joseph's, as he's agreed. */
const KEPT_MAILBOXES: readonly string[] = ["policy@pauseai.uk", "joseph@pauseai.uk"];

/** Whether the regular read keeps an account's threads with politicians. */
export function keepsPoliticianThreads(account: string): boolean {
  return KEPT_MAILBOXES.includes(account.toLowerCase());
}

/** Parliaments' own domains: an address on one, or a subdomain of one, counts whoever it is. */
export const PARLIAMENT_DOMAINS = [
  "parliament.uk",
  "parliament.scot",
  "senedd.wales",
  "senedd.cymru",
  "niassembly.gov.uk",
] as const;

/**
 * PauseAI's addresses besides the connected Gmails: kept by hand, as Gmail's
 * API can't tell an alias from another address.
 */
const PAUSEAI_ALIASES: readonly string[] = ["joseph@pauseai.info", "info@pauseai.info"];

/** What the site knows of politicians' addresses: each they have or have had, and each domain of one's own, with whose. */
export type PoliticianBook = { addresses: Map<string, number[]>; domains: Map<string, number> };

const domainOf = (address: string) => address.slice(address.lastIndexOf("@") + 1);

/** Whether an address is on a parliament's domain or a subdomain of one. */
export function onParliamentDomain(address: string): boolean {
  const domain = domainOf(address);
  return PARLIAMENT_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));
}

/** The politicians an address is, by name or by their own domain. */
export function politiciansOf(book: PoliticianBook, address: string): number[] {
  const known = book.addresses.get(address);
  if (known) return known;
  const owner = book.domains.get(domainOf(address));
  return owner === undefined ? [] : [owner];
}

/** What a message's addresses say of it: whether it counts as a thread with a politician, and whose. */
export function politiciansIn(book: PoliticianBook, addresses: string[]): { counts: boolean; people: number[] } {
  const people = [...new Set(addresses.flatMap((address) => politiciansOf(book, address)))];
  return { counts: people.length > 0 || addresses.some(onParliamentDomain), people };
}

/** The addresses in the blocks a message quotes or forwards: From, To and Cc. */
export function quotedAddresses(text: string): string[] {
  return quotedHeaders(text).flatMap((quote) => addressesIn(`${quote.from} ${quote.to} ${quote.cc}`));
}

/** Whether a politician or a parliament's address wrote after a thread's first message, given its senders in order. */
export function politicianAnswered(book: PoliticianBook, senders: string[]): boolean {
  return politiciansIn(book, senders.slice(1)).counts;
}

/** Who wrote in a thread, each once, in the order they first wrote, given its senders in order. */
export function participants(senders: { name: string; address: string }[]): string[] {
  return [...new Set(senders.map(({ name, address }) => name || address))];
}

/** Which politician each address is, leaving out one that several share, as it can't say whose. */
export function politicianAddresses(book: PoliticianBook, addresses: string[]): Record<string, number> {
  const known = addresses.map((address) => [address, politiciansOf(book, address)] as const);
  return Object.fromEntries(known.filter(([, ids]) => ids.length === 1).map(([address, [id]]) => [address, id]));
}

/** Whether an address is one of PauseAI's: a connected Gmail or an alias. */
export function isPauseaiAddress(address: string, connected: readonly string[]): boolean {
  return connected.includes(address) || PAUSEAI_ALIASES.includes(address);
}

/** Whether an address is anyone's at PauseAI, connected or not. */
export function isAtPauseai(address: string): boolean {
  return /@pauseai\.(uk|info)$/.test(address);
}

/** Whether a sender hides its thread from staff without `supporters`: neither a politician, nor on a parliament's domain, nor PauseAI's. */
export function isSomeoneElse(book: PoliticianBook, address: string, connected: readonly string[]): boolean {
  return !isPauseaiAddress(address, connected) && !politiciansIn(book, [address]).counts;
}

/**
 * Mail the site recognises as nothing a person need look at, in a shared
 * mailbox: its own forwards and sign-in codes, bounces, spam and Gmail's own
 * mail.
 */
export function isRecognisedMail(from: string, labels: readonly string[]): boolean {
  if (labels.includes("SPAM") || labels.includes("TRASH")) return true;
  return (
    /^(mailer-daemon|postmaster)@/.test(from) ||
    /@(notify\.pauseai\.uk|google\.com|accounts\.google\.com|googlegroups\.com)$/.test(from) ||
    /^noreply@/.test(from)
  );
}
