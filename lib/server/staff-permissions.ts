import "server-only";
import { BUILT_IN_ADMIN, effectivePermissions, type Permission } from "@/lib/staff-permissions";
import { logChange } from "./audit";
import { query, transaction } from "./db";

// Who may do what beyond the ordinary staff pages (staff_permissions):
// read on every request by requireStaff(), set by admins on
// /staff/permissions, each change in the audit log.

export type StaffPermissions = {
  email: string;
  permissions: Permission[];
  /** The admin who last changed them, or null for the built-in admin. */
  grantedBy: string | null;
  grantedAt: string | null;
};

/** The permissions `email` has: its row's, or every one for the built-in admin. */
export async function permissionsOf(email: string): Promise<Permission[]> {
  const [row] = await query<{ permissions: Permission[] }>(
    "SELECT permissions FROM staff_permissions WHERE email = $1",
    [email.toLowerCase()],
  );
  return effectivePermissions(email, row?.permissions ?? []);
}

/** Everyone with a permission, the built-in admin first, then by address. */
export async function listStaffPermissions(): Promise<StaffPermissions[]> {
  const rows = await query<StaffPermissions>(
    `SELECT email, permissions, granted_by AS "grantedBy", granted_at AS "grantedAt"
     FROM staff_permissions WHERE email <> $1 ORDER BY email`,
    [BUILT_IN_ADMIN],
  );
  return [
    { email: BUILT_IN_ADMIN, permissions: effectivePermissions(BUILT_IN_ADMIN, []), grantedBy: null, grantedAt: null },
    ...rows,
  ];
}

/** The addresses to ask for a permission: every admin. */
export async function admins(): Promise<string[]> {
  const rows = await query<{ email: string }>(
    "SELECT email FROM staff_permissions WHERE 'admin' = ANY(permissions) AND email <> $1 ORDER BY email",
    [BUILT_IN_ADMIN],
  );
  return [BUILT_IN_ADMIN, ...rows.map((row) => row.email)];
}

/**
 * Gives `email` exactly `permissions`, as `by`, logging the change. None
 * removes their row. The built-in admin's can't be changed. Returns whether
 * anything changed.
 */
export async function setStaffPermissions(email: string, permissions: Permission[], by: string): Promise<boolean> {
  const address = email.trim().toLowerCase();
  if (address === BUILT_IN_ADMIN) return false;
  const to = [...new Set(permissions)].sort();
  return transaction(async (db) => {
    const [row] = await query<{ permissions: Permission[] }>(
      "SELECT permissions FROM staff_permissions WHERE email = $1 FOR UPDATE",
      [address],
      db,
    );
    const from = [...(row?.permissions ?? [])].sort();
    if (from.join() === to.join()) return false;
    if (to.length === 0) {
      await query("DELETE FROM staff_permissions WHERE email = $1", [address], db);
    } else {
      await query(
        `INSERT INTO staff_permissions (email, permissions, granted_by) VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE SET permissions = $2, granted_by = $3, granted_at = now()`,
        [address, to, by],
        db,
      );
    }
    await logChange(by, "set staff permissions", { email: address, from, to }, db);
    return true;
  });
}
