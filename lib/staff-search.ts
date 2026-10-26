// Reads the staff pages' URLs: each filter as typed, for its form, and what
// it filters by, leaving out anything blank or unknown. lib/staff-forms.ts
// reads their forms.
import { staffCopy } from "@/lib/content/staff-interface";
import { emailState } from "@/lib/email-permissions";
import { campaignBySlug } from "@/lib/email-your-mp";
import { parseSort } from "@/lib/staff-sort";
import { isSupporterBadge, SUPPORTER_SORTS, type SupporterFilter } from "@/lib/supporters";

export type LettersSearch = {
  status: string;
  q: string;
  /** "yes" or "no". */
  answered: string;
  /** A campaign's slug. */
  campaign: string;
};

/** Which letters the letters page lists (recentLetters in lib/server/letters.ts). */
export type LetterFilter = {
  /** A letter's status, or "replied" (a person replied) or "auto_reply" (a machine did). */
  status?: string;
  /** Over the sender's name and email, the MP's name and the subject. */
  search?: string;
  /** Whether the MP replied. */
  answered?: boolean;
  /** A campaign's slug. */
  campaign?: string;
  /** One supporter's letters (/staff/letters/supporter/[id]). */
  supporterId?: number;
  /** One letter (/staff/letters/[id]). */
  letterId?: number;
};

/** The letters page's filters, as the URL gives them and as the server applies them. */
export function lettersSearch({
  status = "",
  q = "",
  answered = "",
  campaign = "",
}: Partial<LettersSearch>): LettersSearch & { filter: LetterFilter } {
  const filter: LetterFilter = {
    status: Object.hasOwn(staffCopy.letters.status, status) ? status : undefined,
    search: q.trim() || undefined,
    answered: answered === "yes" ? true : answered === "no" ? false : undefined,
    campaign: campaignBySlug(campaign)?.slug,
  };
  return { status, q, answered, campaign, filter };
}

/** A politician's ID from their page's URL: a whole number, or undefined. */
export function politicianId(id: string): number | undefined {
  return /^\d+$/.test(id) ? Number(id) : undefined;
}

/** The blocked addresses page's filter: blocked by a hard bounce, or a complaint. */
export function emailsSearch({ kind = "" }: { kind?: string }): { kind: string; filter?: "hard" | "complaint" } {
  return { kind, filter: kind === "hard" || kind === "complaint" ? kind : undefined };
}

/** A list's page from its URL: a whole number from 1, or the first page. */
export function pageNumber(page = ""): number {
  return /^\d+$/.test(page) && Number(page) > 0 ? Number(page) : 1;
}

/** A list's URL at a page: the first page at the list's own, any other with `?page=`. */
export function pagePath(path: string, page: number): string {
  return page > 1 ? `${path}?page=${page}` : path;
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
  activity: string;
  /** "blocked", or "<topic>:<reason>". */
  subscription: string;
  active: string;
  from: string;
  to: string;
  sort: string;
  dir: string;
  page: string;
  /** After an erasure: "1". */
  erased: string;
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The supporters list's filters and sort, each as typed and as applied. */
export function supportersSearch({
  q = "",
  activity = "",
  subscription = "",
  active = "",
  from = "",
  to = "",
  sort = "",
  dir = "",
  page = "",
  erased = "",
}: Partial<SupportersSearch>): SupportersSearch & { filter: SupporterFilter } {
  const sorting = parseSort(SUPPORTER_SORTS, "active", sort, dir);
  const filter: SupporterFilter = {
    search: q.trim() || undefined,
    activity: isSupporterBadge(activity) ? activity : undefined,
    subscription: emailState(subscription),
    active: active === "30" || active === "90" || active === "365" || active === "older" ? active : undefined,
    from: DAY.test(from) ? from : undefined,
    to: DAY.test(to) ? to : undefined,
    sort: sorting.key,
    dir: sorting.dir,
    page: pageNumber(page),
  };
  return { q, activity, subscription, active, from, to, sort, dir, page, erased, filter };
}

/** The accounts page's notice, after a refused change. */
export function accountsSearch({ notice = "" }: { notice?: string }): { notice: string } {
  return { notice: notice === "last-admin" || notice === "not-pauseai" ? notice : "" };
}
