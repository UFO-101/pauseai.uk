import "server-only";
import { ASK_STATUSES } from "@/lib/asks";
import { contactState } from "@/lib/contact-permissions";
import { staffCopy } from "@/lib/content/staff-interface";
import { campaignBySlug } from "@/lib/email-your-mp";
import { COUNTRIES, EMAIL_STATES, POLITICIAN_FLAGS } from "@/lib/politician-filters";
import type { SavedList } from "@/lib/saved-filters";
import { DASHBOARD_WINDOWS } from "@/lib/staff-dashboard";
import { NO_OWNER, ONLINE } from "@/lib/staff-events-list";
import {
  FILTER_LISTS,
  notValue,
  storedFilter,
  valuesOf,
  WHO_PARAMS,
  type FilterList,
  type Params,
  type Picked,
  type StoredFilter,
} from "@/lib/staff-search";
import { NEAR_MILES, SUPPORTER_BADGES } from "@/lib/supporters";
import { changeChoices } from "./audit";
import { query } from "./db";
import { HOUSES, PERSON_STATUSES } from "./politicians";
import { eventChoices } from "./staff-events";
import { MP_CHOICES } from "./supporters";

// A mailing's stored filter (StoredFilter, lib/staff-search.ts), or a saved
// filter's choices, read back strictly: a value the site no longer knows,
// such as a deleted event or a renamed party, is a problem to fix, as the
// list's parser would drop it and the filter would quietly find more people.

/** Whether `params` are a list's parameters that choose who, each text or a list of text. */
function isWhoParams(list: FilterList, params: unknown): params is Params {
  if (typeof params !== "object" || params === null) return false;
  return Object.entries(params).every(
    ([name, value]) =>
      WHO_PARAMS[list].includes(name) &&
      (typeof value === "string" || (Array.isArray(value) && value.every((one) => typeof one === "string"))),
  );
}

/** Whether `value` is a list of IDs: whole numbers above nought. */
function isIds(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((one) => Number.isSafeInteger(one) && one > 0);
}

/** Who was ticked, as read back, if it is that; otherwise undefined. */
function checkPicked(list: FilterList, value: unknown): Picked | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const { ids, from } = value as Record<string, unknown>;
  if (!isIds(ids)) return undefined;
  if (from === undefined) return { ids };
  if (typeof from !== "object" || from === null) return undefined;
  const { params, at, found } = from as Record<string, unknown>;
  if (!isWhoParams(list, params) || typeof at !== "string" || Number.isNaN(Date.parse(at)) || !isIds(found)) {
    return undefined;
  }
  return { ids, from: { params: storedFilter(list, params).params, at, found } };
}

/** A stored filter, as read back from JSON, if it is one; otherwise undefined. */
export function checkStoredFilter(value: unknown): StoredFilter | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const { list, params, picked } = value as Record<string, unknown>;
  if (!(FILTER_LISTS as readonly unknown[]).includes(list) || !isWhoParams(list as FilterList, params)) {
    return undefined;
  }
  const filter = storedFilter(list as FilterList, params);
  if (picked === undefined) return filter;
  const read = checkPicked(list as FilterList, picked);
  return read && { ...filter, picked: read };
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
    nation: COUNTRIES,
    email: EMAIL_STATES,
    ask: asks.map((one) => one.slug),
    answer: [...answers, "none"],
    mailed: asks.map((one) => one.slug),
  };
}

async function supporterValues(params: Params): Promise<Known> {
  const plain = (name: string) => valuesOf(params[name]).map((value) => notValue(value).value);
  const [found, mps] = await Promise.all([
    query<{ id: string }>("SELECT id FROM luma_events WHERE id = ANY($1)", [plain("event")]),
    query<{ id: string }>(`SELECT p.id::text AS id FROM (${MP_CHOICES}) p WHERE p.id::text = ANY($1)`, [plain("mp")]),
  ]);
  return {
    q: "any",
    activity: SUPPORTER_BADGES,
    contact: plain("contact").filter((value) => contactState(value)),
    event: found.map((row) => row.id),
    campaign: valuesOf(params.campaign).filter((slug) => campaignBySlug(slug)),
    wrote: ["no"],
    nation: Object.keys(staffCopy.countries),
    mp: mps.map((row) => row.id),
    near: "any",
    within: NEAR_MILES.map(String),
  };
}

async function eventValues(): Promise<Known> {
  const { staff, tags, cities } = await eventChoices();
  return {
    q: "any",
    owner: [NO_OWNER, ...staff],
    tag: tags,
    place: [ONLINE, ...cities],
    removed: Object.keys(staffCopy.events.filters.removed),
  };
}

async function changeValues(): Promise<Known> {
  const { actors, actions } = await changeChoices(true);
  return { q: "any", actor: actors, action: actions, when: DASHBOARD_WINDOWS.map(String) };
}

const VALUES: Record<SavedList, (params: Params) => Promise<Known>> = {
  politicians: politicianValues,
  supporters: supporterValues,
  events: eventValues,
  "audit-log": changeValues,
};

/**
 * The values of a filter the site no longer knows, each as
 * "<parameter>=<value>": none, for one that can be run as it was chosen.
 * `params` are those that choose what it finds, as WHO_PARAMS has them.
 */
export async function filterProblems(filter: { list: SavedList; params: Params; picked?: Picked }): Promise<string[]> {
  if (filter.picked) return pickedProblems(filter.picked.ids);
  const known = await VALUES[filter.list](filter.params);
  return Object.entries(filter.params).flatMap(([name, value]) =>
    valuesOf(value)
      .filter((one) => known[name] !== "any" && !known[name].includes(notValue(one).value))
      .map((one) => `${name}=${one}`),
  );
}

/** Those ticked who aren't politicians any more, such as one deleted when Airtable lost them, as "person=<id>". */
async function pickedProblems(ids: number[]): Promise<string[]> {
  const rows = await query<{ id: number }>("SELECT id::int AS id FROM politicians WHERE id = ANY($1::bigint[])", [ids]);
  const there = new Set(rows.map((row) => row.id));
  return ids.filter((id) => !there.has(id)).map((id) => `person=${id}`);
}
