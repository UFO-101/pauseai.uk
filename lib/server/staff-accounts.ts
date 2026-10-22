import "server-only";
import type { Permission } from "@/lib/staff-permissions";
import { logChange } from "./audit";
import { query, transaction, type Queryable } from "./db";
import { isStaffEmail } from "./staff-login";

// Who may use the staff pages (staff_accounts): read on every request by
// requireStaff(), kept by admins on /staff/accounts, each change in the
// audit log. Logging in stays open to any pauseai.uk address; without an
// account, the home page says whom to ask. admin@pauseai.uk starts with an
// account and the admin permission (the migration), as an ordinary row.

export type StaffAccount = {
  email: string;
  permissions: Permission[];
  addedBy: string;
  addedAt: string;
};

/** The account for `email`, if it has one. */
export async function accountOf(email: string): Promise<{ permissions: Permission[] } | undefined> {
  const [row] = await query<{ permissions: Permission[] }>("SELECT permissions FROM staff_accounts WHERE email = $1", [
    email.trim().toLowerCase(),
  ]);
  return row;
}

/** Every account, by address. */
export async function listStaffAccounts(): Promise<StaffAccount[]> {
  return query<StaffAccount>(
    `SELECT email, permissions, added_by AS "addedBy", added_at AS "addedAt" FROM staff_accounts ORDER BY email`,
  );
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
