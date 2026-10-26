// Supporters, as the staff pages show them: the shapes the server
// (lib/server/supporters.ts) gives the components.
import { staffCopy } from "./content/staff-interface";
import type { EmailPermission, EmailState } from "./email-permissions";
import type { SortColumns, SortDirection } from "./staff-sort";

/** Where a supporter's records come from (lib/server/supporter-sources.ts). */
export const SUPPORTER_SOURCES = ["luma", "letter", "member"] as const;
export type SupporterSource = (typeof SUPPORTER_SOURCES)[number];

/** The lozenges in the list's Activities column, in its order: a member, a contact of the Luma calendar, registered for events, wrote to their MP. */
export const SUPPORTER_BADGES = ["member", "lumaContact", "registered", "letter"] as const;
export type SupporterBadge = (typeof SUPPORTER_BADGES)[number];

export function isSupporterBadge(value: string): value is SupporterBadge {
  return (SUPPORTER_BADGES as readonly string[]).includes(value);
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
  /** Whether they're a contact of the Luma calendar, as registering for an event or following it makes them. */
  lumaContact: boolean;
  firstSeenAt: string | null;
  lastActiveAt: string | null;
  /** Events registered for, declined ones left out. */
  events: number;
  letters: number;
  /** Whether they're a PauseAI member now: a member's record we read at the last import. */
  member: boolean;
};

/** One row of the list, with whether we'd email each of their addresses about each topic. */
export type SupporterRow = SupporterSummary & { permissions: EmailPermission[] };

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

/** Why a source record is this supporter's. */
export type SupporterLink = {
  source: SupporterSource;
  sourceId: string;
  matchedBy: "email";
  matchedValue: string;
  linkedAt: string;
};

export type SupporterDetails = {
  summary: SupporterSummary;
  identities: SupporterIdentity[];
  contacts: SupporterContact[];
  links: SupporterLink[];
  activity: SupporterActivity[];
  /** Whether we may email each of their addresses about each topic, and why. */
  permissions: EmailPermission[];
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
  /** Has this lozenge in the Activities column. */
  activity?: SupporterBadge;
  /** Last active within this many days, or longer ago than a year. */
  active?: "30" | "90" | "365" | "older";
  /** First sign-up from this day, yyyy-mm-dd. */
  from?: string;
  /** First sign-up up to this day, yyyy-mm-dd. */
  to?: string;
  /** Has this answer about a topic, or is blocked, at any of their addresses. */
  subscription?: EmailState;
  sort: SupporterSort;
  dir: SortDirection;
  page: number;
};

export const SUPPORTERS_PAGE_SIZE = 100;

/** A supporter's page's name: theirs, or the stand-in for one with none. */
export function supporterTitle(summary: Pick<SupporterSummary, "name">): string {
  return summary.name ?? staffCopy.supporters.noName;
}
