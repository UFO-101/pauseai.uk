// Reads the staff pages' URLs: each filter as typed, for its form, and what
// it filters by, leaving out anything blank or unknown. lib/staff-forms.ts
// reads their forms.
import { staffCopy } from "@/lib/content/staff-interface";
import { emailState } from "@/lib/email-permissions";
import type { BlocksFilter } from "@/lib/server/email";
import { campaignBySlug } from "@/lib/email-your-mp";
import { parseSort } from "@/lib/staff-sort";
import { isSupporterBadge, NEAR_MILES, SUPPORTER_SORTS, type SupporterFilter } from "@/lib/supporters";

export type LettersSearch = {
  status: string;
  q: string;
  /** "yes" or "no". */
  answered: string;
  /** A campaign's slug. */
  campaign: string;
  /** "yes" or "no". */
  consent: string;
  page: string;
};

/** Which letters the letters page lists (recentLetters in lib/server/letters.ts). */
export type LetterFilter = {
  /** A letter's status, or "replied" (a person replied) or "auto_reply" (a machine did). */
  status?: string;
  /** Over the sender's name and email, and the MP's name. */
  search?: string;
  /** Whether the MP replied. */
  answered?: boolean;
  /** A campaign's slug. */
  campaign?: string;
  /** Whether the sender agreed to hear about events and ways to help. */
  consent?: boolean;
  /** One supporter's letters (/staff/letters/supporter/[id]). */
  supporterId?: number;
  /** One letter (/staff/letters/[id]). */
  letterId?: number;
};

/** A yes-or-no filter: "yes" or "no", or neither. */
function yesOrNo(value: string): boolean | undefined {
  return value === "yes" ? true : value === "no" ? false : undefined;
}

/** The letters page's filters, as the URL gives them and as the server applies them. */
export function lettersSearch({
  status = "",
  q = "",
  answered = "",
  campaign = "",
  consent = "",
  page = "",
}: Partial<LettersSearch>): LettersSearch & { filter: LetterFilter & { page: number } } {
  const filter: LetterFilter = {
    status: Object.hasOwn(staffCopy.letters.status, status) ? status : undefined,
    search: q.trim() || undefined,
    answered: yesOrNo(answered),
    campaign: campaignBySlug(campaign)?.slug,
    consent: yesOrNo(consent),
  };
  return { status, q, answered, campaign, consent, page, filter: { ...filter, page: pageNumber(page) } };
}

/** A mailing's ID from its page's URL: a whole number, or undefined. */
export function mailingId(id: string): number | undefined {
  return politicianId(id);
}

/** A politician's ID from their page's URL: a whole number, or undefined. */
export function politicianId(id: string): number | undefined {
  return /^\d+$/.test(id) ? Number(id) : undefined;
}

/** The blocked addresses page's filters: a search of the addresses, and blocked by a hard bounce, or a complaint. */
export function emailsSearch({ q = "", kind = "" }: { q?: string; kind?: string }): {
  q: string;
  kind: string;
  filter: BlocksFilter;
} {
  return {
    q,
    kind,
    filter: { kind: kind === "hard" || kind === "complaint" ? kind : undefined, search: q.trim() || undefined },
  };
}

/** A list's page from its URL: a whole number from 1, or the first page. */
export function pageNumber(page = ""): number {
  return /^\d+$/.test(page) && Number(page) > 0 ? Number(page) : 1;
}

/** A list's URL at a page: the first page at the list's own, any other with `?page=`. */
export function pagePath(path: string, page: number): string {
  return page > 1 ? `${path}?page=${page}` : path;
}

/** A URL parameter's value: one, or a list, for a filter chosen more than once, its name repeated in the URL. */
export type ParamValue = string | string[];

/** A list's parameters, each as typed. */
export type Params = Record<string, ParamValue>;

/** Every value of a parameter, the blanks left out. */
export function valuesOf(value: ParamValue | undefined): string[] {
  return (Array.isArray(value) ? value : [value ?? ""]).filter(Boolean);
}

/** The mark before a value a filter leaves out, in its URL: `event=!evt-2` is those not at evt-2. */
export const NOT = "!";

/** A filter's value without its mark, and whether it's one the filter leaves out. */
export function notValue(value: string): { value: string; not: boolean } {
  return value.startsWith(NOT) ? { value: value.slice(NOT.length), not: true } : { value, not: false };
}

/**
 * A repeating filter's values, split: those it finds any of, then those it
 * leaves out, each read by `read`, which drops what it doesn't know; a
 * list with none is undefined.
 */
export function anyAndNone<T>(values: string[], read: (values: string[]) => T[]): [T[] | undefined, T[] | undefined] {
  const [any, none] = [false, true].map((not) =>
    read(
      values
        .map(notValue)
        .filter((one) => one.not === not && one.value)
        .map((one) => one.value),
    ),
  );
  return [any.length ? any : undefined, none.length ? none : undefined];
}

/** The fields of `fields` that are on, or undefined if none is: what a filter leaves out. */
export function notOf<T extends object>(fields: T): Partial<T> | undefined {
  const on = Object.entries(fields).filter(([, value]) => value !== undefined);
  return on.length ? (Object.fromEntries(on) as Partial<T>) : undefined;
}

/** A parameter that takes one value: its first, or blank. */
export function firstOf(value: ParamValue | undefined): string {
  return valuesOf(value)[0] ?? "";
}

/**
 * A list's URL with its filters as typed, `changes` made to them, leaving
 * out the blank ones; a list's values each as the parameter again.
 */
export function filtersPath(path: string, filters: Params, changes: Params = {}): string {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries({ ...filters, ...changes })) {
    for (const one of valuesOf(value)) params.append(name, one);
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

/** The `page` of a list's URL at page `n`: none for the first. */
export function pageParam(n: number): { page: string } {
  return { page: n > 1 ? String(n) : "" };
}

/** A letter's ID from its page's URL: a whole number, or undefined. */
export function letterId(id: string): number | undefined {
  return politicianId(id);
}

/** A supporter's ID from their page's URL: a whole number, or undefined. */
export function supporterId(id: string): number | undefined {
  return politicianId(id);
}

export type SupportersSearch = {
  q: string;
  activity: string[];
  /** Each "blocked", or "<topic>:<reason>". */
  subscription: string[];
  /** "yes" or "no". */
  phone: string;
  email: string;
  /** Luma event IDs. */
  event: string[];
  /** A campaign's slug; with `wrote` "no", those who didn't write in it. */
  campaign: string;
  wrote: string;
  country: string[];
  /** A postcode, the first half of one, or a town; and how many miles from it. */
  near: string;
  within: string;
  sort: string;
  dir: string;
  page: string;
  /** After an erasure: "1". */
  erased: string;
};

/** The supporters list's filters and sort, each as typed and as applied. */
export function supportersSearch(
  params: Partial<Record<keyof SupportersSearch, ParamValue>>,
): SupportersSearch & { filter: SupporterFilter } {
  const [q, phone, email, campaign, wrote, near, within, sort, dir, page, erased] = (
    ["q", "phone", "email", "campaign", "wrote", "near", "within", "sort", "dir", "page", "erased"] as const
  ).map((name) => firstOf(params[name]));
  const [activity, subscription, event, country] = (["activity", "subscription", "event", "country"] as const).map(
    (name) => valuesOf(params[name]),
  );
  const sorting = parseSort(SUPPORTER_SORTS, "active", sort, dir);
  const [badges, notBadges] = anyAndNone(activity, (values) => values.filter(isSupporterBadge));
  const [states, notStates] = anyAndNone(subscription, (values) => values.flatMap((value) => emailState(value) ?? []));
  const [events, notEvents] = anyAndNone(event, (values) => values);
  const [countries, notCountries] = anyAndNone(country, (values) =>
    values.filter((value) => Object.hasOwn(staffCopy.countries, value)),
  );
  const miles = NEAR_MILES.find((n) => String(n) === within) ?? NEAR_MILES[1];
  const filter: SupporterFilter = {
    search: q.trim() || undefined,
    activity: badges,
    subscription: states,
    phone: yesOrNo(phone),
    email: yesOrNo(email),
    event: events,
    campaign: campaignBySlug(campaign)?.slug,
    wrote: campaignBySlug(campaign) ? wrote !== "no" : undefined,
    country: countries,
    near: near.trim() ? { text: near.trim(), miles } : undefined,
    not: notOf({ activity: notBadges, subscription: notStates, event: notEvents, country: notCountries }),
    sort: sorting.key,
    dir: sorting.dir,
    page: pageNumber(page),
  };
  return {
    q,
    activity,
    subscription,
    phone,
    email,
    event,
    campaign,
    wrote,
    country,
    near,
    within,
    sort,
    dir,
    page,
    erased,
    filter,
  };
}

/** The accounts page's notice, after a refused change. */
export function accountsSearch({ notice = "" }: { notice?: string }): { notice: string } {
  return { notice: notice === "last-admin" || notice === "not-pauseai" ? notice : "" };
}
