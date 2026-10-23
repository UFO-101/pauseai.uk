import "server-only";
import { ADDED_BY_LOGIN, isStaffEmail, type Permission } from "@/lib/staff-permissions";
import { logChange } from "./audit";
import { query, transaction, type Queryable } from "./db";

// Who uses the staff pages, and with which permissions (staff_accounts):
// read on every request by requireStaff(), kept by admins on
// /staff/accounts, each change in the audit log. Any pauseai.uk address can
// log in, and gets an account with no permissions the first time it does,
// so the mailbox decides who can log in. admin@pauseai.uk starts with an
// account and the admin permission (the migration), as an ordinary row.

export type StaffAccount = {
  email: string;
  permissions: Permission[];
  /** The admin who added it, or ADDED_BY_LOGIN. */
  addedBy: string;
  addedAt: string;
  lastLoginAt: string | null;
  lastSeenAt: string | null;
  /** Sessions not yet expired. */
  sessions: number;
};

/** The account for `email`, if it has one. */
export async function accountOf(email: string): Promise<{ permissions: Permission[] } | undefined> {
  const [row] = await query<{ permissions: Permission[] }>("SELECT permissions FROM staff_accounts WHERE email = $1", [
    email.trim().toLowerCase(),
  ]);
  return row;
}

/**
 * Gives `email` an account with no permissions if it has none, as on its
 * first login, logging it as added by its own login.
 */
export async function accountOnLogin(email: string): Promise<void> {
  const [address] = normalise(email, []);
  await transaction(async (db) => {
    const added = await query(
      `INSERT INTO staff_accounts (email, permissions, added_by) VALUES ($1, '{}', $2)
       ON CONFLICT (email) DO NOTHING RETURNING email`,
      [address, ADDED_BY_LOGIN],
      db,
    );
    if (added.length) await logChange(address, "add staff account", { email: address, to: [] }, db);
  });
}

/** Every account, by address, with when it last logged in and was seen, and its sessions open. */
export async function listStaffAccounts(): Promise<StaffAccount[]> {
  return query<StaffAccount>(
    `SELECT a.email, a.permissions, a.added_by AS "addedBy", a.added_at AS "addedAt",
       a.last_login_at AS "lastLoginAt", a.last_seen_at AS "lastSeenAt", coalesce(s.sessions, 0) AS sessions
     FROM staff_accounts a
     LEFT JOIN (SELECT lower(email) AS email, count(*)::int AS sessions FROM staff_sessions
                WHERE expires_at > now() GROUP BY lower(email)) s ON s.email = a.email
     ORDER BY a.email`,
  );
}

/** Ends every session `email` has, as `by`, logging it when there were any. Returns how many. */
export async function endStaffSessions(email: string, by: string): Promise<number> {
  const [address] = normalise(email, []);
  return transaction(async (db) => {
    const ended = await query("DELETE FROM staff_sessions WHERE lower(email) = $1 RETURNING 1", [address], db);
    if (ended.length) await logChange(by, "end staff sessions", { email: address, sessions: ended.length }, db);
    return ended.length;
  });
}

/** The addresses to ask for an account or a permission: every admin. */
export async function admins(db?: Queryable): Promise<string[]> {
  const rows = await query<{ email: string }>(
    "SELECT email FROM staff_accounts WHERE 'admin' = ANY(permissions) ORDER BY email",
    [],
    db,
  );
  return rows.map((row) => row.email);
}

/**
 * How a change to an account ended: done, nothing to do, or refused,
 * because it would leave no admin or the address isn't at pauseai.uk.
 */
export type AccountChange = "changed" | "unchanged" | "last-admin" | "not-pauseai";

function normalise(email: string, permissions: Permission[]): [string, Permission[]] {
  return [email.trim().toLowerCase(), [...new Set(permissions)].sort()];
}

/** Whether taking admin from `email` would leave nobody with it. */
async function wouldLeaveNoAdmin(email: string, db: Queryable): Promise<boolean> {
  const others = (await admins(db)).filter((admin) => admin !== email);
  return others.length === 0;
}

/**
 * Gives `email` an account with exactly `permissions`, or an existing
 * account exactly those, as `by`, logging the change. Refuses to take
 * admin from the last admin, and an address not at pauseai.uk, which the
 * table refuses too.
 */
export async function saveStaffAccount(email: string, permissions: Permission[], by: string): Promise<AccountChange> {
  const [address, to] = normalise(email, permissions);
  if (!isStaffEmail(address)) return "not-pauseai";
  return transaction(async (db) => {
    const [row] = await query<{ permissions: Permission[] }>(
      "SELECT permissions FROM staff_accounts WHERE email = $1 FOR UPDATE",
      [address],
      db,
    );
    const from = row ? [...row.permissions].sort() : undefined;
    if (from && from.join() === to.join()) return "unchanged";
    if (from?.includes("admin") && !to.includes("admin") && (await wouldLeaveNoAdmin(address, db))) return "last-admin";
    await query(
      `INSERT INTO staff_accounts (email, permissions, added_by) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET permissions = $2`,
      [address, to, by],
      db,
    );
    await logChange(by, from ? "set staff permissions" : "add staff account", { email: address, from, to }, db);
    return "changed";
  });
}

/**
 * Removes `email`'s account and ends their sessions, as `by`, logging it.
 * Refuses for the last admin; nothing to do for an address with none.
 */
export async function removeStaffAccount(email: string, by: string): Promise<AccountChange> {
  const [address] = normalise(email, []);
  return transaction(async (db) => {
    const [row] = await query<{ permissions: Permission[] }>(
      "SELECT permissions FROM staff_accounts WHERE email = $1 FOR UPDATE",
      [address],
      db,
    );
    if (!row) return "unchanged";
    if (row.permissions.includes("admin") && (await wouldLeaveNoAdmin(address, db))) return "last-admin";
    await query("DELETE FROM staff_accounts WHERE email = $1", [address], db);
    await query("DELETE FROM staff_sessions WHERE lower(email) = $1", [address], db);
    await query("DELETE FROM staff_login_links WHERE lower(email) = $1", [address], db);
    await logChange(by, "remove staff account", { email: address, permissions: row.permissions }, db);
    return "changed";
  });
}
