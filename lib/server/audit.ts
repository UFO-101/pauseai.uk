import "server-only";
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

/** The actions whose details name a politician by `id`; others name one by `politicianId`. */
const POLITICIAN_ACTIONS = ["add politician", "edit politician", "remove politician", "delete politician"];

/** Entries on a page of the audit log. */
export const AUDIT_PAGE_SIZE = 100;

/** A page of the audit log and how many entries and pages it has. */
export type ChangesPage = { changes: LoggedChange[]; total: number; pages: number; pageSize: number };

/**
 * A page of the audit log, newest first, each entry with whom it's about;
 * with a `limit` of null, every entry, for a download. Whom it's about is
 * looked up for the page's entries only, not every one before them.
 */
export async function recentChanges(page = 1, limit: number | null = AUDIT_PAGE_SIZE): Promise<ChangesPage> {
  const [{ total }] = await query<{ total: number }>("SELECT count(*)::int AS total FROM audit_log");
  const changes = await query<LoggedChange>(
    `SELECT a.id::int AS id, a.at, a.actor, a.action, a.details,
       (SELECT json_build_object('id', p.id, 'name', p.name) FROM notable_people p
        WHERE p.id::text = CASE WHEN a.action = ANY($2) THEN a.details->>'id' ELSE a.details->>'politicianId' END) AS politician,
       (SELECT json_build_object('id', s.id, 'name', s.name) FROM supporters_listed s
        WHERE s.id = CASE WHEN a.action = 'view supporter' THEN (a.details->>'id')::bigint END) AS supporter
     FROM (SELECT * FROM audit_log ORDER BY at DESC, id DESC LIMIT $1 OFFSET $3) a ORDER BY a.at DESC, a.id DESC`,
    [limit, POLITICIAN_ACTIONS, (page - 1) * (limit ?? 0)],
  );
  return { changes, total, pages: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)), pageSize: AUDIT_PAGE_SIZE };
}
