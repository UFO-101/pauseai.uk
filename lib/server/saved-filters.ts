import "server-only";
import { staffCopy } from "@/lib/content/staff-interface";
import {
  choosingParams,
  sameParams,
  savedFilterId,
  savedParams,
  withoutValues,
  type SavedList,
} from "@/lib/saved-filters";
import { valuesOf, type ParamValue, type Params } from "@/lib/staff-search";
import { logChange } from "./audit";
import { query, transaction, type Queryable } from "./db";
import { filterProblems } from "./stored-filters";

// Filters staff have saved on a list, shared with everyone who can open it,
// who can each change or delete any of them. Each is read and changed only
// through its list, so one's ID never reaches another list. The audit log
// gets its ID and list, never its name or parameters, which can name a
// supporter.

export type SavedFilter = {
  id: number;
  name: string;
  params: Params;
  createdBy: string;
  createdAt: string;
  /** When it was last changed: when it was made, if it hasn't been. */
  changedAt: string;
};

/** The saved filter a list's URL has loaded. */
export type LoadedFilter = {
  id: number;
  name: string;
  /** Its parameters, without any that no longer exist. */
  params: Params;
  /** Whether the URL's filters differ from it. */
  edited: boolean;
  /** Its values that no longer exist, each as "<parameter>=<value>". */
  gone: string[];
};

/** A list's saved filters, the one its URL has loaded, and the URL's parameters to use, without any that no longer exist. */
export type SavedFiltersState = { rows: SavedFilter[]; loaded?: LoadedFilter; params: Params };

const COLUMNS = `id::int AS id, name, params, created_by AS "createdBy", created_at AS "createdAt",
  coalesce(updated_at, created_at) AS "changedAt"`;

/** A list's saved filters, those changed most recently first. */
async function listSavedFilters(list: SavedList): Promise<SavedFilter[]> {
  return query<SavedFilter>(
    `SELECT ${COLUMNS} FROM saved_filters WHERE list = $1 ORDER BY coalesce(updated_at, created_at) DESC, id DESC`,
    [list],
  );
}

/**
 * What a list's URL means for its saved filters. A loaded filter's values
 * that no longer exist are left out of the list as well as said, so the
 * list runs on what's left, whichever link brought it here. An ID that's
 * unknown, deleted or another list's loads nothing.
 */
export async function savedFiltersState(
  list: SavedList,
  params: Partial<Record<string, ParamValue>>,
): Promise<SavedFiltersState> {
  const rows = await listSavedFilters(list);
  const id = savedFilterId(params.saved);
  const found = rows.find((row) => row.id === id);
  if (!found) return { rows, params: withoutValues(params, []) };
  const gone = await filterProblems({ list, params: choosingParams(list, found.params) });
  const left = withoutValues(params, gone);
  const stored = savedParams(list, withoutValues(found.params, gone));
  return {
    rows,
    params: left,
    loaded: {
      id: found.id,
      name: found.name,
      params: stored,
      edited: !sameParams(savedParams(list, left), stored),
      gone,
    },
  };
}

/** Saves `params` as a new filter on `list`, as `by`. Returns its ID. */
export async function createSavedFilter(list: SavedList, name: string, params: Params, by: string): Promise<number> {
  return transaction(async (db) => {
    const [{ id }] = await query<{ id: number }>(
      "INSERT INTO saved_filters (list, name, params, created_by) VALUES ($1, $2, $3, $4) RETURNING id::int AS id",
      [list, name, JSON.stringify(savedParams(list, params)), by],
      db,
    );
    await logChange(by, "save filter", { id, list }, db);
    return id;
  });
}

/** Runs `sql` on a filter of `list`, with `values` after the list and the ID, and logs `action` if there is one. */
async function change(
  action: string,
  list: SavedList,
  id: number,
  by: string,
  sql: string,
  values: unknown[],
): Promise<boolean> {
  return transaction(async (db) => {
    const rows = await query(`${sql} WHERE list = $1 AND id = $2 RETURNING id`, [list, id, ...values], db);
    if (rows.length) await logChange(by, action, { id, list }, db);
    return rows.length > 0;
  });
}

/** Gives a saved filter new parameters. False if `list` has no such filter. */
export async function updateSavedFilter(list: SavedList, id: number, params: Params, by: string): Promise<boolean> {
  return change(
    "update filter",
    list,
    id,
    by,
    "UPDATE saved_filters SET params = $3, updated_by = $4, updated_at = now()",
    [JSON.stringify(savedParams(list, params)), by],
  );
}

/** Gives a saved filter a new name. False if `list` has no such filter. */
export async function renameSavedFilter(list: SavedList, id: number, name: string, by: string): Promise<boolean> {
  return change(
    "rename filter",
    list,
    id,
    by,
    "UPDATE saved_filters SET name = $3, updated_by = $4, updated_at = now()",
    [name, by],
  );
}

/** Deletes a saved filter. False if `list` has no such filter. */
export async function deleteSavedFilter(list: SavedList, id: number, by: string): Promise<boolean> {
  return change("delete filter", list, id, by, "DELETE FROM saved_filters", []);
}

/** The parameters where words are typed, which can be someone's details. */
const TYPED_PARAMS = ["q", "near"];

/** `name` without `details`, each as whole words, ignoring case, the longest first as one can be inside another, and what they leave at its end. */
function nameWithout(name: string, details: string[]): string {
  let left = name;
  for (const detail of details.toSorted((one, other) => other.length - one.length)) {
    const escaped = detail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    left = left.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "giu"), "");
  }
  if (left === name) return name;
  return (
    left
      .replace(/\s+/g, " ")
      .replace(/ ([,:])/g, "$1")
      .replace(/[\s,:·]+$/u, "")
      .trim() || staffCopy.filters.saved.erasedName
  );
}

/** `params` without those typed that are one of `details`, in lower case; a place goes with its distance. */
function paramsWithout(params: Params, details: string[]): Params {
  const typed = (name: string) => valuesOf(params[name]).some((one) => details.includes(one.trim().toLowerCase()));
  const drop = TYPED_PARAMS.filter(typed);
  const without = drop.includes("near") ? [...drop, "within"] : drop;
  return Object.fromEntries(Object.entries(params).filter(([name]) => !without.includes(name)));
}

/**
 * Takes supporter `id`'s names, emails, phone numbers and postcodes out of
 * every saved filter's name and typed parameters, as `by`, in an erasure's
 * transaction, before their records go. It matches each exactly, ignoring
 * case, so a misspelling or part of a name stays.
 */
export async function eraseFromSavedFilters(id: number, by: string, db: Queryable): Promise<void> {
  const [{ details }] = await query<{ details: string[] }>(
    `SELECT coalesce(array_agg(DISTINCT lower(trim(d))), '{}') AS details FROM (
       SELECT name AS d FROM supporter_identity WHERE supporter_id = $1
       UNION SELECT email FROM supporter_identity WHERE supporter_id = $1
       UNION SELECT phone FROM supporter_contact WHERE supporter_id = $1
       UNION SELECT phone_number(phone) FROM supporter_contact WHERE supporter_id = $1
       UNION SELECT postcode FROM supporter_contact WHERE supporter_id = $1
     ) found WHERE trim(d) <> ''`,
    [id],
    db,
  );
  const filters = await query<{ id: number; name: string; params: Params }>(
    "SELECT id::int AS id, name, params FROM saved_filters FOR UPDATE",
    [],
    db,
  );
  for (const filter of filters) {
    const name = nameWithout(filter.name, details);
    const params = paramsWithout(filter.params, details);
    if (name !== filter.name || !sameParams(params, filter.params)) {
      await query(
        "UPDATE saved_filters SET name = $2, params = $3, updated_by = $4, updated_at = now() WHERE id = $1",
        [filter.id, name, JSON.stringify(params), by],
        db,
      );
    }
  }
}
