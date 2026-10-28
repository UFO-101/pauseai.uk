import "server-only";
import { ASK_STATUSES } from "@/lib/asks";
import { contactState } from "@/lib/contact-permissions";
import { staffCopy } from "@/lib/content/staff-interface";
import { campaignBySlug } from "@/lib/email-your-mp";
import { COUNTRIES, EMAIL_STATES, POLITICIAN_FLAGS } from "@/lib/politician-filters";
import { notValue, valuesOf, type Params } from "@/lib/staff-search";
import { NEAR_MILES, SUPPORTER_BADGES } from "@/lib/supporters";
import { query } from "./db";
import { HOUSES, PERSON_STATUSES } from "./politicians";

// Who a list shows, kept apart from how it shows them (the sort and the
// page), so a mailing can keep it and run it again. It's kept as the list's
// URL parameters, which the list's own parser reads, its pills say in
// words, and "Change who" puts back in the list's URL. Read strictly: a
// value the site no longer knows, such as a deleted event or a renamed
// party, is a problem to fix, as the parser would drop it and the filter
// would quietly find more people.

/** The lists a mailing can be to. */
export const FILTER_LISTS = ["politicians", "supporters"] as const;
export type FilterList = (typeof FILTER_LISTS)[number];

/** Who a list shows: the list, and its parameters that choose who. */
export type StoredFilter = { list: FilterList; params: Params };

/** Each list's parameters that choose who it shows. */
const WHO_PARAMS: Record<FilterList, readonly string[]> = {
  politicians: ["q", "house", "status", "party", "flag", "country", "email", "ask", "answer"],
  supporters: ["q", "activity", "contact", "event", "campaign", "wrote", "country", "near", "within"],
};

/** Who a list's URL parameters show, without the sort, the page or anything else, nor blanks. */
export function storedFilter(list: FilterList, params: Partial<Record<string, string | string[]>>): StoredFilter {
  const kept: Params = {};
  for (const name of WHO_PARAMS[list]) {
    const values = valuesOf(params[name]);
    if (values.length) kept[name] = values.length === 1 ? values[0] : values;
  }
  return { list, params: kept };
}

/** A stored filter, as read back from JSON, if it is one; otherwise undefined. */
export function checkStoredFilter(value: unknown): StoredFilter | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const { list, params } = value as Record<string, unknown>;
  if (!(FILTER_LISTS as readonly unknown[]).includes(list) || typeof params !== "object" || params === null) {
    return undefined;
  }
  const entries = Object.entries(params);
  const fine = entries.every(
    ([name, value]) =>
      WHO_PARAMS[list as FilterList].includes(name) &&
      (typeof value === "string" || (Array.isArray(value) && value.every((one) => typeof one === "string"))),
  );
  return fine ? storedFilter(list as FilterList, params as Params) : undefined;
}

/** What the site knows each parameter's values can be: a list, or any, for words typed. */
type Known = Record<string, readonly string[] | "any">;

async function politicianValues(params: Params): Promise<Known> {
  const [parties, asks] = await Promise.all([
    query<{ party: string }>("SELECT DISTINCT party FROM politicians WHERE party <> ''"),
    query<{ slug: string; kind: keyof typeof ASK_STATUSES }>("SELECT slug, kind FROM asks"),
  ]);
  const ask = asks.find((one) => one.slug === valuesOf(params.ask)[0]);
  const answers = ask ? ASK_STATUSES[ask.kind] : Object.values(ASK_STATUSES).flat();
  return {
    q: "any",
    house: HOUSES,
    status: [...PERSON_STATUSES, "any"],
    party: parties.map((row) => row.party),
    flag: POLITICIAN_FLAGS,
    country: COUNTRIES,
    email: EMAIL_STATES,
    ask: asks.map((one) => one.slug),
    answer: [...answers, "none"],
  };
}

async function supporterValues(params: Params): Promise<Known> {
  const plain = (name: string) => valuesOf(params[name]).map((value) => notValue(value).value);
  const found = await query<{ id: string }>("SELECT id FROM luma_events WHERE id = ANY($1)", [plain("event")]);
  return {
    q: "any",
    activity: SUPPORTER_BADGES,
    contact: plain("contact").filter((value) => contactState(value)),
    event: found.map((row) => row.id),
    campaign: valuesOf(params.campaign).filter((slug) => campaignBySlug(slug)),
    wrote: ["no"],
    country: Object.keys(staffCopy.countries),
    near: "any",
    within: NEAR_MILES.map(String),
  };
}

/**
 * The values of a stored filter the site no longer knows, each as
 * "<parameter>=<value>": none, for one that can be run as it was chosen.
 */
export async function filterProblems(filter: StoredFilter): Promise<string[]> {
  const known = await (filter.list === "politicians" ? politicianValues : supporterValues)(filter.params);
  return Object.entries(filter.params).flatMap(([name, value]) =>
    valuesOf(value)
      .filter((one) => known[name] !== "any" && !known[name].includes(notValue(one).value))
      .map((one) => `${name}=${one}`),
  );
}
