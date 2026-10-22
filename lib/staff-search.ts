// Reads the staff pages' URLs: each filter as typed, for its form, and what
// it filters by, leaving out anything blank or unknown. lib/staff-forms.ts
// reads their forms.
import { staffCopy } from "@/lib/content/staff-interface";
import { parseSort } from "@/lib/staff-sort";
import { isSupporterSource, SUPPORTER_SORTS, type SupporterFilter } from "@/lib/supporters";

export type LettersSearch = {
  status: string;
  q: string;
  /** "yes" or "no". */
  answered: string;
  /** A supporter's ID: their letters alone, from their page. No field shows it. */
  supporter: string;
  /** A letter's ID: that letter alone, from where it's named (a politician's page, the blocked addresses). No field shows it. */
  letter: string;
};

/** Which letters the letters page lists (recentLetters in lib/server/letters.ts). */
export type LetterFilter = {
  /** A letter's status, or "replied" (a person replied) or "auto_reply" (a machine did). */
  status?: string;
  /** Over the sender's name and email, the MP's name and the subject. */
  search?: string;
  /** Whether the MP replied. */
  answered?: boolean;
  supporterId?: number;
  letterId?: number;
};

/** The letters page's filters, as the URL gives them and as the server applies them. */
export function lettersSearch({
  status = "",
  q = "",
  answered = "",
  supporter = "",
  letter = "",
}: Partial<LettersSearch>): LettersSearch & { filter: LetterFilter } {
  const filter: LetterFilter = {
    status: Object.hasOwn(staffCopy.letters.status, status) ? status : undefined,
    search: q.trim() || undefined,
    answered: answered === "yes" ? true : answered === "no" ? false : undefined,
    supporterId: supporterId(supporter),
    letterId: politicianId(letter),
  };
  return { status, q, answered, supporter, letter, filter };
}

/** A politician's ID from their page's URL: a whole number, or undefined. */
export function politicianId(id: string): number | undefined {
  return /^\d+$/.test(id) ? Number(id) : undefined;
}

/** The blocked addresses page's filter: blocked by a hard bounce, or a complaint. */
export function emailsSearch({ kind = "" }: { kind?: string }): { kind: string; filter?: "hard" | "complaint" } {
  return { kind, filter: kind === "hard" || kind === "complaint" ? kind : undefined };
}

/** A supporter's ID from their page's URL: a whole number, or undefined. */
export function supporterId(id: string): number | undefined {
  return politicianId(id);
}

export type SupportersSearch = {
  q: string;
  source: string;
  registered: string;
  active: string;
  from: string;
  to: string;
  unsubscribed: string;
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
  source = "",
  registered = "",
  active = "",
  from = "",
  to = "",
  unsubscribed = "",
  sort = "",
  dir = "",
  page = "",
  erased = "",
}: Partial<SupportersSearch>): SupportersSearch & { filter: SupporterFilter } {
  const sorting = parseSort(SUPPORTER_SORTS, "active", sort, dir);
  const filter: SupporterFilter = {
    search: q.trim() || undefined,
    source: isSupporterSource(source) ? source : undefined,
    registered: registered !== "" || undefined,
    active: active === "30" || active === "90" || active === "365" || active === "older" ? active : undefined,
    from: DAY.test(from) ? from : undefined,
    to: DAY.test(to) ? to : undefined,
    unsubscribed: unsubscribed !== "" || undefined,
    sort: sorting.key,
    dir: sorting.dir,
    page: /^\d+$/.test(page) && Number(page) > 0 ? Number(page) : 1,
  };
  return { q, source, registered, active, from, to, unsubscribed, sort, dir, page, erased, filter };
}

/** The accounts page's notice, after a refused change. */
export function accountsSearch({ notice = "" }: { notice?: string }): { notice: string } {
  return { notice: notice === "last-admin" || notice === "not-pauseai" ? notice : "" };
}
