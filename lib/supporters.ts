// Supporters, as the staff pages show them: the shapes the server
// (lib/server/supporters.ts) gives the components.
import { staffCopy } from "./content/staff-interface";
import type { ContactPermission, ContactState } from "./contact-permissions";
import type { SortColumns, SortDirection } from "./staff-sort";

/** Where a supporter came from: Luma, the members, or one of our forms (form_entries.form): Email your MP, pauseai.info's old letter form, or the march sign-up. */
export const SUPPORTER_SOURCES = ["luma", "member", "email-your-mp", "web-form", "march-2026-11"] as const;
export type SupporterSource = (typeof SUPPORTER_SOURCES)[number];

/** What a supporter_links row points at (lib/server/supporter-sources.ts): a Luma user, a form entry or a member. */
export type SupporterLinkSource = "luma" | "form" | "member";

/** The lozenges in the list's Activities column, in its order: a member, a contact of the Luma calendar, registered for events, wrote to their MP, signed up for the march. */
export const SUPPORTER_BADGES = ["member", "lumaContact", "registered", "letter", "march"] as const;
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
  /** The address any source gave most recently. */
  email: string | null;
  /** The newest number any source gave that a topic lets us use, or might. */
  phone: string | null;
  /** Every number any source gave, as phone_number() writes them, newest first, whether we may use them or not. */
  phones: string[];
  postcode: string | null;
  sources: SupporterSource[];
  /** Whether they're a contact of the Luma calendar now, as registering for an event or following it makes them, and unsubscribing undoes. */
  lumaContact: boolean;
  firstSeenAt: string | null;
  lastActiveAt: string | null;
  /** Events registered for, declined ones left out. */
  events: number;
  letters: number;
  /** Whether they're a PauseAI member now: a member's record we read at the last import. */
  member: boolean;
  /** Where they are, as best we know (the supporter_place view); null if we don't. */
  place?: SupporterPlaceName | null;
};

/** A supporter's place: its name, what it's from and what that was (a postcode, a city, an event's name), its nation. */
export type SupporterPlaceName = {
  name: string | null;
  basis: "postcode" | "city" | "event";
  given: string;
  country: string | null;
};

/** One row of the list, with whether we'd contact each of their addresses and numbers about each topic. */
export type SupporterRow = SupporterSummary & { permissions: ContactPermission[] };

/** What a supporter did, from any source: `kind` says what, `title` and `detail` which and how. */
export type SupporterActivity = {
  source: string;
  at: string;
  kind:
    | "luma-contact"
    | "luma-registered"
    | "letter"
    | "letter-replied"
    | "form-entry"
    | "member-joined"
    | "opted-out"
    | "resubscribed";
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
  /** As phone_number() writes it. */
  phone: string | null;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
};

/** Why a source record is this supporter's. */
export type SupporterLink = {
  source: SupporterLinkSource;
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
  /** Whether we may contact each of their addresses and numbers about each topic, and why. */
  permissions: ContactPermission[];
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

/** How far from a place the Near filter reaches, in miles. */
export const NEAR_MILES = [5, 10, 25, 50] as const;

/** The filters that repeat, which can leave out as well as find. */
export type NegatableSupporterFilter = "activity" | "subscription" | "event" | "country";

/** The list's filters, as the server applies them. A filter that repeats finds those with any of its values. */
export type SupporterFilter = {
  /** Over names, emails and phones. */
  search?: string;
  /** Has any of these lozenges in the Activities column. */
  activity?: SupporterBadge[];
  /** Has any of these answers about a topic by a channel, or is blocked, at any of their addresses or numbers. */
  subscription?: ContactState[];
  /** Whether we have a phone number for them we may use, and an email. */
  phone?: boolean;
  email?: boolean;
  /** Registered for any of these Luma events, by ID, but for declined. */
  event?: string[];
  /** Wrote a letter in this campaign, by slug; or, with `wrote` false, never did. */
  campaign?: string;
  wrote?: boolean;
  /** In any of these nations (supporter_place). */
  country?: string[];
  /** Within `miles` of what was typed: a postcode, the first half of one, or a town. */
  near?: { text: string; miles: number };
  /** Those with none of these, each a filter above that repeats. */
  not?: Pick<SupporterFilter, NegatableSupporterFilter>;
  sort: SupporterSort;
  dir: SortDirection;
  page: number;
};

export const SUPPORTERS_PAGE_SIZE = 100;

/** A supporter's page's name: theirs, or the stand-in for one with none. */
export function supporterTitle(summary: Pick<SupporterSummary, "name">): string {
  return summary.name ?? staffCopy.supporters.noName;
}
