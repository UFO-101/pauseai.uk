// Saved filters' parameters: which of a list's URL parameters a saved filter
// keeps, and comparing them. lib/server/saved-filters.ts stores them.
import { filtersPath, valuesOf, WHO_PARAMS, type ParamValue, type Params } from "@/lib/staff-search";

/** The lists that can have saved filters. */
export const SAVED_LISTS = ["politicians", "supporters", "events"] as const;
export type SavedList = (typeof SAVED_LISTS)[number];

/** Each list's page. */
export const SAVED_LIST_PATHS: Record<SavedList, string> = {
  politicians: "/staff/politicians",
  supporters: "/staff/supporters",
  events: "/staff/events",
};

/** Each list's parameters that choose what it shows, its tab apart on the events list. */
const CHOOSING_PARAMS: Record<SavedList, readonly string[]> = {
  ...WHO_PARAMS,
  events: ["q", "owner", "tag", "place", "removed"],
};

const SAVED_PARAMS: Record<SavedList, readonly string[]> = {
  politicians: [...CHOOSING_PARAMS.politicians, "sort", "dir"],
  supporters: [...CHOOSING_PARAMS.supporters, "sort", "dir"],
  events: ["when", ...CHOOSING_PARAMS.events, "sort", "dir"],
};

/** What goes with a list's URL but isn't part of a filter, kept when one is loaded: who a mailing is being chosen for. */
const CARRIED_PARAMS = ["mailing", "pasted"];

type RawParams = Partial<Record<string, ParamValue>>;

/** Those of `params` named `names`, without blanks: one value as text, several as a list. */
function picked(names: readonly string[], params: RawParams): Params {
  const kept: Params = {};
  for (const name of names) {
    const values = valuesOf(params[name]);
    if (values.length) kept[name] = values.length === 1 ? values[0] : values;
  }
  return kept;
}

/** What a saved filter keeps of a list's URL parameters. */
export function savedParams(list: SavedList, params: RawParams): Params {
  return picked(SAVED_PARAMS[list], params);
}

/** What a saved filter's parameters choose, without its tab or sort on the events list, or its sort on the others. */
export function choosingParams(list: SavedList, params: RawParams): Params {
  return picked(CHOOSING_PARAMS[list], params);
}

/** What goes with a list's URL into a saved filter's link. */
export function carriedParams(params: RawParams): Params {
  return picked(CARRIED_PARAMS, params);
}

/** Whether two sets of parameters mean the same, whatever their order, and leaving out blanks. */
export function sameParams(one: RawParams, other: RawParams): boolean {
  const sorted = (params: RawParams, name: string) => valuesOf(params[name]).toSorted().join("\n");
  return [...Object.keys(one), ...Object.keys(other)].every((name) => sorted(one, name) === sorted(other, name));
}

/** `params` without `gone`, each "<parameter>=<value>", as filterProblems() gives them. */
export function withoutValues(params: RawParams, gone: string[]): Params {
  const kept: Params = {};
  for (const [name, value] of Object.entries(params)) {
    kept[name] = valuesOf(value).filter((one) => !gone.includes(`${name}=${one}`));
  }
  return kept;
}

/** The link that loads saved filter `id`, with `carried` from the list's URL. */
export function savedFilterHref(list: SavedList, id: number, params: Params, carried: Params = {}): string {
  return filtersPath(SAVED_LIST_PATHS[list], { ...params, ...carried, saved: String(id) });
}

/** A saved filter's ID from the `saved` of a list's URL, if it could be one. */
export function savedFilterId(saved: ParamValue | undefined): number | undefined {
  const [text = ""] = valuesOf(saved);
  return /^\d+$/.test(text) && Number(text) > 0 && Number.isSafeInteger(Number(text)) ? Number(text) : undefined;
}

/** A list's URL, and its parameters: what the saved filter forms send as `back`. */
export function urlParams(url: string): Params {
  const params: Params = {};
  const search = new URL(url, "https://staff.invalid").searchParams;
  for (const name of new Set(search.keys())) params[name] = search.getAll(name);
  return params;
}
