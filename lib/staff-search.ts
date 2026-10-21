// Reads the staff pages' URLs: each filter as typed, for its form, and what
// it filters by, leaving out anything blank or unknown. lib/staff-forms.ts
// reads their forms.
import { staffCopy } from "@/lib/content/staff-interface";
import { isImportJob, type ImportJob } from "@/lib/import-runs";
import { isSupporterSource, type SupporterFilter } from "@/lib/supporters";

/** The import history's job filter. */
export function historySearch({ job = "" }: { job?: string }): { job: string; filter?: ImportJob } {
  return { job, filter: isImportJob(job) ? job : undefined };
}

/** The letters page's status filter. */
export function lettersSearch({ status = "" }: { status?: string }): { status: string; filter?: string } {
  return { status, filter: Object.hasOwn(staffCopy.letters.status, status) ? status : undefined };
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
  postcode: string;
  sort: string;
  page: string;
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
  postcode = "",
  sort = "",
  page = "",
}: Partial<SupportersSearch>): SupportersSearch & { filter: SupporterFilter } {
  const filter: SupporterFilter = {
    search: q.trim() || undefined,
    source: isSupporterSource(source) ? source : undefined,
    registered: registered !== "" || undefined,
    active: active === "30" || active === "90" || active === "365" || active === "older" ? active : undefined,
    from: DAY.test(from) ? from : undefined,
    to: DAY.test(to) ? to : undefined,
    unsubscribed: unsubscribed !== "" || undefined,
    hasPostcode: postcode !== "" || undefined,
    sort: sort === "first" || sort === "name" ? sort : "active",
    page: /^\d+$/.test(page) && Number(page) > 0 ? Number(page) : 1,
  };
  return { q, source, registered, active, from, to, unsubscribed, postcode, sort, page, filter };
}
