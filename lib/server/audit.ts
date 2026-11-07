import "server-only";
import type { ChangeSort } from "@/lib/change-sort";
import { windowStart } from "@/lib/staff-dashboard";
import type { SortSpec } from "@/lib/staff-sort";
import { query, type Queryable } from "./db";

// Who changed what: every change from the staff interface, and each sync.

export type AuditEntry = { id: number; at: string; actor: string; action: string; details: Record<string, unknown> };

/** `actor` is a staff email, or "sync". Pass `db` to log inside a transaction. */
export async function logChange(actor: string, action: string, details: object, db?: Queryable): Promise<void> {
  await query(
    "INSERT INTO audit_log (actor, action, details) VALUES ($1, $2, $3)",
    [actor, action, JSON.stringify(details)],
    db,
  );
}

/** Someone an entry is about, while they're still here: their ID, and their name if they have one. */
export type Named = { id: number; name: string | null };

/** An entry for the audit log's page, with the politician or supporter it's about. */
export type LoggedChange = AuditEntry & { politician: Named | null; supporter: Named | null };

/** The ID of the politician an entry is about: by `id` in the details of these actions, by `politicianId` in others'. */
const POLITICIAN_ID = `CASE WHEN a.action = ANY(ARRAY['add politician', 'edit politician', 'remove politician', 'delete politician'])
  THEN a.details->>'id' ELSE a.details->>'politicianId' END`;

/** The ID of the supporter an entry is about. */
const SUPPORTER_ID = `(CASE WHEN a.action = 'view supporter' THEN a.details->>'id' ELSE a.details->>'supporterId' END)::bigint`;

/**
 * The entries staff without `supporters` see: not those about a supporter,
 * nor downloads, whose filters may name one, nor an address that isn't a politician's.
 */
const WITHOUT_SUPPORTERS = `NOT (
  action = ANY(ARRAY['view supporter', 'erase supporter', 'download supporters', 'download letters', 'download blocked emails'])
  OR details ? 'supporterId'
  OR (action = ANY(ARRAY['block address', 'unblock address'])
    AND NOT EXISTS (SELECT 1 FROM notable_people n WHERE lower(n.email) = lower(details->>'address')))
)`;

/** Entries on a page of the audit log. */
export const AUDIT_PAGE_SIZE = 100;

/** Which entries the log's page shows, and in what order. */
export type ChangesFilter = {
  /** Over who and what, the details as logged, and the name of whom it's about. */
  search?: string;
  actor?: string[];
  action?: string[];
  /** Only those of the last so many days. */
  days?: number;
  /** Those with none of these. */
  not?: { actor?: string[]; action?: string[] };
  sort?: SortSpec<ChangeSort>;
  page?: number;
};

/** Each sort's column in the query. */
const SORT_COLUMNS: Record<ChangeSort, string> = { day: "a.at", actor: "a.actor", action: "a.action" };

/** A page of the audit log and how many entries and pages it has. */
export type ChangesPage = { changes: LoggedChange[]; total: number; pages: number; pageSize: number };

/** Those `supporters` says they may see: every entry, or not those about a supporter. */
const visibleTo = (supporters: boolean) => (supporters ? "true" : WITHOUT_SUPPORTERS);

/**
 * A page of the entries a filter finds, newest first unless it says
 * otherwise, each with whom it's about, as far as `supporters` says they may
 * see; with a `limit` of null, every one, for a download. Whom it's about is
 * looked up for the page's entries only, not every one before them.
 */
export async function recentChanges(
  supporters: boolean,
  { search, actor, action, days, not, sort = { key: "day", dir: "desc" }, page = 1 }: ChangesFilter = {},
  limit: number | null = AUDIT_PAGE_SIZE,
): Promise<ChangesPage> {
  const params = [
    search ? `%${search}%` : null,
    actor ?? null,
    action ?? null,
    not?.actor ?? null,
    not?.action ?? null,
    days ? windowStart(days) : null,
  ];
  const where = `${visibleTo(supporters)}
    AND ($1::text IS NULL OR a.actor ILIKE $1 OR a.action ILIKE $1 OR a.details::text ILIKE $1
      OR ${POLITICIAN_ID} IN (SELECT n.id::text FROM notable_people n WHERE n.name ILIKE $1)
      OR ${SUPPORTER_ID} IN (SELECT s.id FROM supporters_listed s WHERE s.name ILIKE $1))
    AND ($2::text[] IS NULL OR a.actor = ANY($2)) AND ($3::text[] IS NULL OR a.action = ANY($3))
    AND ($4::text[] IS NULL OR a.actor <> ALL($4)) AND ($5::text[] IS NULL OR a.action <> ALL($5))
    AND ($6::timestamptz IS NULL OR a.at >= $6)`;
  const order = `${SORT_COLUMNS[sort.key]} ${sort.dir === "asc" ? "ASC" : "DESC"}, a.at DESC, a.id DESC`;
  const [{ total }] = await query<{ total: number }>(
    `SELECT count(*)::int AS total FROM audit_log a WHERE ${where}`,
    params,
  );
  const changes = await query<LoggedChange>(
    `SELECT a.id::int AS id, a.at, a.actor, a.action, a.details,
       (SELECT json_build_object('id', p.id, 'name', p.name) FROM notable_people p
        WHERE p.id::text = ${POLITICIAN_ID}) AS politician,
       (SELECT json_build_object('id', s.id, 'name', s.name) FROM supporters_listed s
        WHERE s.id = ${SUPPORTER_ID}) AS supporter
     FROM (SELECT a.* FROM audit_log a WHERE ${where} ORDER BY ${order} LIMIT $7 OFFSET $8) a ORDER BY ${order}`,
    [...params, limit, (page - 1) * (limit ?? 0)],
  );
  return { changes, total, pages: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)), pageSize: AUDIT_PAGE_SIZE };
}

/** Everyone in the log and everything they've done, of the entries `supporters` says they may see: the log's filters' choices. */
export async function changeChoices(supporters: boolean): Promise<{ actors: string[]; actions: string[] }> {
  const [choices] = await query<{ actors: string[]; actions: string[] }>(
    `SELECT coalesce(array_agg(DISTINCT a.actor ORDER BY a.actor), '{}') AS actors,
       coalesce(array_agg(DISTINCT a.action ORDER BY a.action), '{}') AS actions
     FROM audit_log a WHERE ${visibleTo(supporters)}`,
  );
  return choices;
}
