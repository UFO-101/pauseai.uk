// Reads the staff pages' URLs: each filter as typed, for its form, and what
// it filters by, leaving out anything blank or unknown. lib/staff-forms.ts
// reads their forms.
import { staffCopy } from "@/lib/content/staff-interface";
import { listWindow, type DashboardWindow } from "./staff-dashboard";
import { contactState } from "@/lib/contact-permissions";
import { CHANGE_SORTS } from "@/lib/change-sort";
import type { ChangesFilter } from "@/lib/server/audit";
import type { BlocksFilter } from "@/lib/server/email";
import type { SentEmailsFilter } from "@/lib/server/sent-emails";
import { campaignBySlug } from "@/lib/email-your-mp";
import { LETTER_SORTS, type LetterSort } from "@/lib/letter-sort";
import { SENT_EMAIL_SORTS } from "@/lib/sent-email-sort";
import { POLITICIAN_FLAGS, type PoliticianFlag } from "@/lib/politician-filters";
import { parseSort, type SortSpec } from "@/lib/staff-sort";
import { EVENT_SORTS, type EventFilter } from "@/lib/staff-events-list";
import { ACCOUNT_SORTS, type AccountSort } from "@/lib/staff-account-sort";
import { isSupporterBadge, NEAR_MILES, SUPPORTER_SORTS, type SupporterFilter } from "@/lib/supporters";

/** Which of a campaign's letters its counts can show: those that arrived, failed, were replied to, whose politician answered its ask, or whose text was changed. */
export const LETTER_TABS = ["sent", "failed", "replied", "answered", "changed"] as const;
export type LetterTab = (typeof LETTER_TABS)[number];

export type LettersSearch = {
  tab: string;
  status: string;
  q: string;
  /** As LETTER_REPLIES. */
  answered: string;
  /** Campaigns' slugs. */
  campaign: string[];
  /** The MP's markers, as POLITICIAN_FLAGS. */
  flag: string[];
  /** What sent it, as LETTER_BACKENDS. */
  backend: string[];
  sort: string;
  dir: string;
  page: string;
};

/**
 * What sent a letter: pauseai.info's old form, whose letters are copied
 * from Airtable, or this site, by Postmark or by a staff member's Gmail.
 */
export const LETTER_BACKENDS = ["airtable", "postmark", "gmail"] as const;
export type LetterBackend = (typeof LETTER_BACKENDS)[number];

/** Whether a letter was delivered: the statuses a supporter's letter can have. */
const LETTER_STATUSES = ["queued", "sending", "sent", "not_sent", "bounced", "spam_complaint"] as const;

/**
 * What came back to a letter: a written reply, only an automatic one (an
 * office's acknowledgement or out-of-office), or neither.
 */
export const LETTER_REPLIES = ["yes", "auto", "no"] as const;
export type LetterReply = (typeof LETTER_REPLIES)[number];

/** The filters of the letters list that repeat, which can leave out as well as find. */
type NegatableLetterFilter = "campaign" | "flags" | "backend";

/** Which letters the letters page lists (recentLetters in lib/server/letters.ts). */
export type LetterFilter = {
  /** A letter's status, as LETTER_STATUSES. */
  status?: string;
  /** Over the sender's name and email, and the MP's name. */
  search?: string;
  /** What came back to it. */
  answered?: LetterReply;
  /** Which of a campaign's counts it's showing. */
  tab?: LetterTab;
  /** In any of these campaigns, by slug. */
  campaign?: string[];
  /** To an MP with any of these markers. */
  flags?: PoliticianFlag[];
  /** Sent by any of these. */
  backend?: LetterBackend[];
  /** One supporter's letters (/staff/letters/supporter/[id]). */
  supporterId?: number;
  /** One letter (/staff/letters/[id]). */
  letterId?: number;
  /** Those with none of these, each a filter above that repeats. */
  not?: Pick<LetterFilter, NegatableLetterFilter>;
  sort?: SortSpec<LetterSort>;
};

/** What a campaign's slug looks like, as the campaigns table checks it. */
const isSlug = (value: string) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value);

/** The values of `values` that are among `known`. */
export function among<T extends string>(values: string[], known: readonly T[]): T[] {
  return values.filter((value): value is T => (known as readonly string[]).includes(value));
}

/** The letters page's filters and sort, as the URL gives them and as the server applies them. */
export function lettersSearch(
  params: Partial<Record<keyof LettersSearch, ParamValue>>,
): LettersSearch & { filter: LetterFilter & { page: number } } {
  const [tab, status, q, answered, sort, dir, page] = (
    ["tab", "status", "q", "answered", "sort", "dir", "page"] as const
  ).map((name) => firstOf(params[name]));
  const [campaign, flag, backend] = (["campaign", "flag", "backend"] as const).map((name) => valuesOf(params[name]));
  const [campaigns, notCampaigns] = anyAndNone(campaign, (values) => values.filter(isSlug));
  const [flags, notFlags] = anyAndNone(flag, (values) => among(values, POLITICIAN_FLAGS));
  const [backends, notBackends] = anyAndNone(backend, (values) => among(values, LETTER_BACKENDS));
  const sorting = parseSort(LETTER_SORTS, "created", sort, dir);
  const filter: LetterFilter = {
    status: among([status], LETTER_STATUSES)[0],
    search: q.trim() || undefined,
    answered: among([answered], LETTER_REPLIES)[0],
    tab: among([tab], LETTER_TABS)[0],
    campaign: campaigns,
    flags,
    backend: backends,
    not: notOf({ campaign: notCampaigns, flags: notFlags, backend: notBackends }),
    sort: sorting,
  };
  return {
    tab,
    status,
    q,
    answered,
    campaign,
    flag,
    backend,
    sort,
    dir,
    page,
    filter: { ...filter, page: pageNumber(page) },
  };
}

/** What a sent email can lead to, which its Links filter finds. */
/** The kinds of email with no supporter's details on them: all that staff without `supporters` see. */
export const SENT_EMAILS_WITHOUT_SUPPORTERS: readonly string[] = [
  "mailing",
  "mailing-test",
  "staff-login",
  "staff-alert",
  "staff-report",
];

export const SENT_EMAIL_LINKS = ["letter", "campaign", "mailing"] as const;

/** The sent emails' URL filters. */
export type SentEmailsSearch = {
  q: string;
  purpose: string[];
  outcome: string[];
  backend: string[];
  link: string[];
  sort: string;
  dir: string;
  page: string;
};

/** Reads the sent emails' URL. */
export function sentEmailsSearch(
  params: Partial<Record<keyof SentEmailsSearch, ParamValue>>,
): SentEmailsSearch & { filter: SentEmailsFilter } {
  const q = firstOf(params.q);
  const page = firstOf(params.page);
  const [sort, dir] = [firstOf(params.sort), firstOf(params.dir)];
  const [purpose, outcome, backend, link] = (["purpose", "outcome", "backend", "link"] as const).map((name) =>
    valuesOf(params[name]),
  );
  const [purposes, notPurposes] = anyAndNone(purpose, (values) => values);
  const [outcomes, notOutcomes] = anyAndNone(outcome, (values) => values);
  const [backends, notBackends] = anyAndNone(backend, (values) => values);
  const [links, notLinks] = anyAndNone(link, (values) => among(values, SENT_EMAIL_LINKS));
  return {
    q,
    purpose,
    outcome,
    backend,
    link,
    sort,
    dir,
    page,
    filter: {
      search: q.trim() || undefined,
      sort: parseSort(SENT_EMAIL_SORTS, "when", sort, dir),
      purpose: purposes,
      outcome: outcomes,
      backend: backends,
      link: links,
      not: notOf({ purpose: notPurposes, outcome: notOutcomes, backend: notBackends, link: notLinks }),
      page: pageNumber(page),
    },
  };
}

export type ChangesSearch = {
  q: string;
  /** Who did it: a staff email, or "sync". */
  actor: string[];
  /** What they did. */
  action: string[];
  /** Those of the last so many days. */
  when: string;
  sort: string;
  dir: string;
  page: string;
  /** The saved filter loaded, by ID. */
  saved: string;
};

/** The audit log's filters and sort, each as typed and as applied. */
export function changesSearch(
  params: Partial<Record<keyof ChangesSearch, ParamValue>>,
): ChangesSearch & { filter: ChangesFilter } {
  const [q, when, sort, dir, page, saved] = (["q", "when", "sort", "dir", "page", "saved"] as const).map((name) =>
    firstOf(params[name]),
  );
  const [actor, action] = (["actor", "action"] as const).map((name) => valuesOf(params[name]));
  const [actors, notActors] = anyAndNone(actor, (values) => values);
  const [actions, notActions] = anyAndNone(action, (values) => values);
  return {
    q,
    actor,
    action,
    when,
    sort,
    dir,
    page,
    saved,
    filter: {
      search: q.trim() || undefined,
      actor: actors,
      action: actions,
      days: listWindow(when),
      not: notOf({ actor: notActors, action: notActions }),
      sort: parseSort(CHANGE_SORTS, "day", sort, dir),
      page: pageNumber(page),
    },
  };
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
  /** Each "email:blocked", or "<channel>:<topic>", with ":<answer>" or ":<reason>" after it, for one. */
  contact: string[];
  /** Luma event IDs. */
  event: string[];
  /** A campaign's slug; with `wrote` "no", those who didn't write in it. */
  campaign: string;
  wrote: string;
  /** Nations, as staffCopy.countries keys. */
  nation: string[];
  /** MPs' politician IDs. */
  mp: string[];
  /** A postcode, the first half of one, or a town; and how many miles from it. */
  near: string;
  within: string;
  /** Those first seen, registered for an event, or unsubscribed from Luma's emails in the last so many days. */
  first: string;
  registered: string;
  unsubscribed: string;
  sort: string;
  dir: string;
  page: string;
  /** After an erasure: "1", or "partly" with what couldn't be cleared in `why`, as codes. */
  erased: string;
  why: string;
  /** The saved filter loaded, by ID. */
  saved: string;
};

/** What an erasure can leave behind when its clean-up fails. */
export const ERASE_LEFTOVERS = ["mail", "oneOffs"] as const;
export type EraseLeftover = (typeof ERASE_LEFTOVERS)[number];

/** Where an erasure goes afterwards: the list, saying so, and what couldn't be cleared, if anything. */
export function erasedPath(notCleared: EraseLeftover[]): string {
  if (!notCleared.length) return "/staff/supporters?erased=1";
  return `/staff/supporters?erased=partly&why=${notCleared.join(",")}`;
}

/** The codes in an erasure's `why`; anything else in the address is left out. */
export function eraseLeftovers(why: string): EraseLeftover[] {
  const codes = why.split(",");
  return ERASE_LEFTOVERS.filter((leftover) => codes.includes(leftover));
}

/** The supporters list's filters and sort, each as typed and as applied. */
export function supportersSearch(
  params: Partial<Record<keyof SupportersSearch, ParamValue>>,
): SupportersSearch & { filter: SupporterFilter } {
  const [q, campaign, wrote, near, within, first, registered, unsubscribed, sort, dir, page, erased, why, saved] = (
    [
      "q",
      "campaign",
      "wrote",
      "near",
      "within",
      "first",
      "registered",
      "unsubscribed",
      "sort",
      "dir",
      "page",
      "erased",
      "why",
      "saved",
    ] as const
  ).map((name) => firstOf(params[name]));
  const [activity, contact, event, nation, mp] = (["activity", "contact", "event", "nation", "mp"] as const).map(
    (name) => valuesOf(params[name]),
  );
  const sorting = parseSort(SUPPORTER_SORTS, "active", sort, dir);
  const [badges, notBadges] = anyAndNone(activity, (values) => values.filter(isSupporterBadge));
  const [states, notStates] = anyAndNone(contact, (values) => values.flatMap((value) => contactState(value) ?? []));
  const [events, notEvents] = anyAndNone(event, (values) => values);
  const [countries, notCountries] = anyAndNone(nation, (values) =>
    values.filter((value) => Object.hasOwn(staffCopy.countries, value)),
  );
  const [mps, notMps] = anyAndNone(mp, (values) => values.flatMap((value) => politicianId(value) ?? []));
  const miles = NEAR_MILES.find((n) => String(n) === within) ?? NEAR_MILES[1];
  const filter: SupporterFilter = {
    search: q.trim() || undefined,
    activity: badges,
    contact: states,
    event: events,
    campaign: campaignBySlug(campaign)?.slug,
    wrote: campaignBySlug(campaign) ? wrote !== "no" : undefined,
    country: countries,
    mp: mps,
    near: near.trim() ? { text: near.trim(), miles } : undefined,
    firstDays: listWindow(first),
    registeredDays: listWindow(registered),
    unsubscribedDays: listWindow(unsubscribed),
    not: notOf({ activity: notBadges, contact: notStates, event: notEvents, country: notCountries, mp: notMps }),
    sort: sorting.key,
    dir: sorting.dir,
    page: pageNumber(page),
  };
  return {
    q,
    activity,
    contact,
    event,
    campaign,
    wrote,
    nation,
    mp,
    near,
    within,
    first,
    registered,
    unsubscribed,
    sort,
    dir,
    page,
    erased,
    why,
    saved,
    filter,
  };
}

/** How many letters the all-letters page shows at once. */
export const ALL_LETTERS_PAGE_SIZE = 100;

/** Who sent an email on the all emails page, a one-off thread by its first message. */
export const EMAIL_SENDERS = ["supporter", "pauseai", "politician", "other"] as const;
export type EmailSender = (typeof EMAIL_SENDERS)[number];

/** What a row of the all emails page is: a campaign's letter, a mailing's, or a one-off thread. */
export const EMAIL_TYPES = ["campaign", "mailing", "one-off"] as const;
export type EmailType = (typeof EMAIL_TYPES)[number];

/** The all emails page's filters, each as typed in its URL. */
export type AllLettersSearch = {
  q: string;
  /** Senders, as EMAIL_SENDERS, those marked ! left out. */
  from: string[];
  /** Types, as EMAIL_TYPES, those marked ! left out. */
  type: string[];
  /** Politicians' IDs, those marked ! left out. */
  to: string[];
  /** Those sent in the last so many days. */
  sent: string;
  /** "yes" or "no", whether it got a written reply; or a number, one in the last so many days. */
  replied: string;
  page: string;
};

/** Which emails the all emails page shows, and which page of them. */
export type AllLettersFilter = {
  search?: string;
  from?: EmailSender[];
  notFrom?: EmailSender[];
  type?: EmailType[];
  notType?: EmailType[];
  to?: number[];
  notTo?: number[];
  sentDays?: DashboardWindow;
  replied?: "yes" | "no" | DashboardWindow;
  page: number;
};

/** The all emails page's filters, as typed and as applied. */
export function allLettersSearch(
  params: Partial<Record<keyof AllLettersSearch, ParamValue>>,
): AllLettersSearch & { filter: AllLettersFilter } {
  const [q, sent, replied, page] = (["q", "sent", "replied", "page"] as const).map((name) => firstOf(params[name]));
  const [from, type, to] = (["from", "type", "to"] as const).map((name) => valuesOf(params[name]));
  const [types, notTypes] = anyAndNone(type, (values) => among(values, EMAIL_TYPES));
  const [kinds, notKinds] = anyAndNone(from, (values) => among(values, EMAIL_SENDERS));
  const [people, notPeople] = anyAndNone(to, (values) => values.flatMap((value) => politicianId(value) ?? []));
  return {
    q,
    from,
    type,
    to,
    sent,
    replied,
    page,
    filter: {
      search: q.trim() || undefined,
      from: kinds,
      notFrom: notKinds,
      type: types,
      notType: notTypes,
      to: people,
      notTo: notPeople,
      sentDays: listWindow(sent),
      replied: replied === "yes" || replied === "no" ? replied : listWindow(replied),
      page: pageNumber(page),
    },
  };
}

export type EventsSearch = {
  /** "past" for the Past tab; blank for Future. */
  when: string;
  q: string;
  /** Staff emails, or NO_OWNER. */
  owner: string[];
  tag: string[];
  /** Cities, or ONLINE. */
  place: string[];
  /** "yes" for only those taken off Luma; blank leaves them out. */
  removed: string;
  /** Those held in the last so many days. */
  held: string;
  sort: string;
  dir: string;
  page: string;
  /** The saved filter loaded, by ID. */
  saved: string;
};

/** The events list's tab, filters and sort, each as typed and as applied. */
export function eventsSearch(
  params: Partial<Record<keyof EventsSearch, ParamValue>>,
): EventsSearch & { filter: EventFilter } {
  const [when, q, removed, held, sort, dir, page, saved] = (
    ["when", "q", "removed", "held", "sort", "dir", "page", "saved"] as const
  ).map((name) => firstOf(params[name]));
  const [owner, tag, place] = (["owner", "tag", "place"] as const).map((name) => valuesOf(params[name]));
  const tab = when === "past" ? "past" : "future";
  const [owners, notOwners] = anyAndNone(owner, (values) => values);
  const [tags, notTags] = anyAndNone(tag, (values) => values);
  const [places, notPlaces] = anyAndNone(place, (values) => values);
  const filter: EventFilter = {
    tab,
    search: q.trim() || undefined,
    owner: owners,
    tag: tags,
    place: places,
    removed: removed === "yes",
    heldDays: listWindow(held),
    not: notOf({ owner: notOwners, tag: notTags, place: notPlaces }),
    sort: parseSort(EVENT_SORTS[tab], "start", sort, dir),
    page: pageNumber(page),
  };
  return { when, q, owner, tag, place, removed, held, sort, dir, page, saved, filter };
}

/** The accounts page's notice, after a refused change. */
export function accountsSearch({ notice = "", sort, dir }: { notice?: string; sort?: string; dir?: string }): {
  notice: string;
  sort: SortSpec<AccountSort>;
} {
  return {
    notice: ["last-admin", "not-pauseai", "removed"].includes(notice) ? notice : "",
    sort: parseSort(ACCOUNT_SORTS, "email", sort, dir),
  };
}

/**
 * An ask's form, from its URL: the page to go back to after saving (the
 * asks page unless it's another staff page), and how the last save went.
 */
export function askFormSearch(params: Record<string, ParamValue>): { back: string; notice: string } {
  return { back: staffBack(firstOf(params.back), "/staff/asks"), notice: firstOf(params.notice) };
}

/** A staff page to go back to, with its query, never another site's; `fallback` for anything else. */
export function staffBack(back: string | null | undefined, fallback: string): string {
  return back && /^\/staff(\/[\w\-/]*)?(\?[^#]*)?$/.test(back) && !back.includes("//") ? back : fallback;
}

// Who a list shows, kept apart from how it shows them (the sort and the
// page), as its URL parameters, so a mailing can keep it and run it again
// (lib/server/stored-filters.ts reads it back strictly).

/** The lists a mailing can be to. */
export const FILTER_LISTS = ["politicians", "supporters"] as const;
export type FilterList = (typeof FILTER_LISTS)[number];

/**
 * The politicians ticked on the list, by ID: who a mailing goes to, exactly,
 * however few. And the last time everyone a filter found was ticked, that
 * filter's parameters, when, and who it found, so the mailing can say who
 * it's to as that group and those added or taken off.
 */
export type Picked = { ids: number[]; from?: { params: Params; at: string; found: number[] } };

/**
 * Who a list shows: the list, and its parameters that choose who. With
 * `picked`, those ticked are who it is, and the parameters aren't used.
 */
export type StoredFilter = { list: FilterList; params: Params; picked?: Picked };

/** Each list's parameters that choose who it shows. */
export const WHO_PARAMS: Record<FilterList, readonly string[]> = {
  politicians: ["q", "house", "status", "party", "flag", "nation", "email", "ask", "answer", "mailed", "agreed"],
  supporters: [
    "q",
    "activity",
    "contact",
    "event",
    "campaign",
    "wrote",
    "nation",
    "mp",
    "near",
    "within",
    "first",
    "registered",
    "unsubscribed",
  ],
};

/** Who a list's URL parameters show, without the sort, the page or anything else, nor blanks. */
export function storedFilter<List extends FilterList>(
  list: List,
  params: Partial<Record<string, string | string[]>>,
): StoredFilter & { list: List } {
  const kept: Params = {};
  for (const name of WHO_PARAMS[list]) {
    const values = valuesOf(params[name]);
    if (values.length) kept[name] = values.length === 1 ? values[0] : values;
  }
  return { list, params: kept };
}
