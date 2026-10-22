// Supporters, as the staff pages show them: the shapes the server
// (lib/server/supporters.ts) gives the components.
import { staffCopy } from "./content/staff-interface";
import type { OptOutList } from "./opt-outs";
import type { SortColumns, SortDirection } from "./staff-sort";

/** Where a supporter's records come from (lib/server/supporter-sources.ts). */
export const SUPPORTER_SOURCES = ["luma", "letter", "member"] as const;
export type SupporterSource = (typeof SUPPORTER_SOURCES)[number];

export function isSupporterSource(value: string): value is SupporterSource {
  return (SUPPORTER_SOURCES as readonly string[]).includes(value);
}

/** One row of the list: what's known of a supporter across their sources. */
export type SupporterSummary = {
  id: number;
  /** The newest name any source gave, or null when none did. */
  name: string | null;
  emails: string[];
  phone: string | null;
  postcode: string | null;
  sources: SupporterSource[];
  /** Whether they follow the Luma calendar. */
  lumaContact: boolean;
  firstSeenAt: string | null;
  lastActiveAt: string | null;
  /** Events registered for, declined ones left out. */
  events: number;
  letters: number;
  /** The lists any of their addresses is opted out of. */
  optedOut: OptOutList[];
  /** Whether they're a PauseAI member now: a member's record we read at the last import. */
  member: boolean;
  /** What their newest such record chose on the join form: Keep informed, Act now, Volunteer, Lead or None. */
  intent: string | null;
};

/** What a supporter did, from any source: `kind` says what, `title` and `detail` which and how. */
export type SupporterActivity = {
  source: string;
  at: string;
  kind:
    "luma-contact" | "luma-registered" | "letter" | "letter-replied" | "member-joined" | "opted-out" | "resubscribed";
  title: string | null;
  /** Who or what it was with: the event's status, the MP's name, the site they joined on, or the address. */
  detail: string | null;
  href: string | null;
  /** A letter's status; null for every other kind. */
  status: string | null;
};

/** A name and email one source gave, and when the person was first seen there. */
export type SupporterIdentity = { source: SupporterSource; email: string; name: string; seenAt: string | null };

/** A phone, postcode, city or place one source gave, and when. */
export type SupporterContact = {
  source: SupporterSource;
  at: string;
  phone: string | null;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
};

/** One of the supporter's member records: how and when they joined, and what they said to "Keep me informed". */
export type SupporterMember = {
  id: string;
  email: string;
  /** Their first join. */
  joinedAt: string;
  /** This record's. */
  createdAt: string;
  /** The site the join form was on, if it was recorded. */
  sourcePage: string | null;
  intent: string | null;
  keepInformed: boolean;
  /** Not read at the last import: no longer shared with us, or gone from the dataset. */
  removed: boolean;
};

/** Why a source record is this supporter's. */
export type SupporterLink = {
  source: SupporterSource;
  sourceId: string;
  matchedBy: "email";
  matchedValue: string;
  linkedAt: string;
};

/**
 * Where one of the supporter's addresses stands on a list, and why:
 * subscribed, as far as we know; unsubscribed, told by `source`; or, for
 * the members' updates, what they did on joining: declined (left "Keep me
 * informed" unticked), rejoined (declined, then ticked it on re-joining),
 * asked (ticked it), or on the list because the form required the box
 * (required) or had none (unasked). `at` is when.
 */
export type SupporterOptOut = {
  list: OptOutList;
  address: string;
  status: "subscribed" | "unsubscribed" | "declined" | "rejoined" | "asked" | "required" | "unasked";
  at: string | null;
  source: string | null;
};

export type SupporterDetails = {
  summary: SupporterSummary;
  identities: SupporterIdentity[];
  contacts: SupporterContact[];
  links: SupporterLink[];
  members: SupporterMember[];
  activity: SupporterActivity[];
  optOuts: SupporterOptOut[];
};

/** What the list can be sorted by, a column heading or the Sort by field, and which way a first click goes. */
export const SUPPORTER_SORTS: SortColumns<"active" | "first" | "name" | "events" | "letters"> = {
  active: "desc",
  first: "asc",
  name: "asc",
  events: "desc",
  letters: "desc",
};
export type SupporterSort = keyof typeof SUPPORTER_SORTS;

/** The list's filters, as the server applies them. */
export type SupporterFilter = {
  /** Over names, emails and phones. */
  search?: string;
  source?: SupporterSource;
  /** Registered for at least one event. */
  registered?: boolean;
  /** Last active within this many days, or longer ago than a year. */
  active?: "30" | "90" | "365" | "older";
  /** First sign-up from this day, yyyy-mm-dd. */
  from?: string;
  /** First sign-up up to this day, yyyy-mm-dd. */
  to?: string;
  unsubscribed?: boolean;
  sort: SupporterSort;
  dir: SortDirection;
  page: number;
};

export const SUPPORTERS_PAGE_SIZE = 200;

/** A supporter's page's name: theirs, or the stand-in for one with none. */
export function supporterTitle(summary: Pick<SupporterSummary, "name">): string {
  return summary.name ?? staffCopy.supporters.noName;
}
