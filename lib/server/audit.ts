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
const POLITICIAN_ACTIONS = ["add politician", "edit politician", "remove politician"];

/** Entries on a page of the audit log. */
export const AUDIT_PAGE_SIZE = 100;

/** A page of the audit log, newest first, each entry with whom it's about; and how many pages there are. */
export async function recentChanges(page = 1): Promise<{ changes: LoggedChange[]; pages: number }> {
  const [{ total }] = await query<{ total: number }>("SELECT count(*)::int AS total FROM audit_log");
  const changes = await query<LoggedChange>(
    `SELECT a.id::int AS id, a.at, a.actor, a.action, a.details,
       (SELECT json_build_object('id', p.id, 'name', p.name) FROM notable_people p
        WHERE p.id::text = CASE WHEN a.action = ANY($2) THEN a.details->>'id' ELSE a.details->>'politicianId' END) AS politician,
       (SELECT json_build_object('id', s.id, 'name', s.name) FROM supporters_summary s
        WHERE a.action = 'view supporter' AND s.id::text = a.details->>'id') AS supporter
     FROM audit_log a ORDER BY a.at DESC, a.id DESC LIMIT $1 OFFSET $3`,
    [AUDIT_PAGE_SIZE, POLITICIAN_ACTIONS, (page - 1) * AUDIT_PAGE_SIZE],
  );
  return { changes, pages: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)) };
}
