// What a staff member may do beyond the ordinary staff pages. Any
// pauseai.uk address can log in; these are granted on /staff/permissions
// (lib/server/staff-permissions.ts).

export const PERMISSIONS = ["admin", "supporters"] as const;
/** 'supporters' sees supporters; 'admin' grants and revokes permissions, and reads the audit log. */
export type Permission = (typeof PERMISSIONS)[number];

/** Has every permission without a row in the table, so there's an admin before anyone has granted one. */
export const BUILT_IN_ADMIN = "admin@pauseai.uk";

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}

/** The permissions `email` has, given its row's: every one for the built-in admin. */
export function effectivePermissions(email: string, granted: readonly Permission[]): Permission[] {
  return email.toLowerCase() === BUILT_IN_ADMIN ? [...PERMISSIONS] : [...granted];
}
