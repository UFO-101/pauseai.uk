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

export async function recentChanges(limit = 200): Promise<AuditEntry[]> {
  return query<AuditEntry>(
    "SELECT id::int AS id, at, actor, action, details FROM audit_log ORDER BY at DESC, id DESC LIMIT $1",
    [limit],
  );
}
