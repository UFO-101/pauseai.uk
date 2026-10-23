// What a staff account may do beyond the pages about politicians and
// campaigns. Any pauseai.uk address can log in, and gets an account
// (lib/server/staff-accounts.ts) with none of these on its first login.

// In the order forms list them.
export const PERMISSIONS = ["supporters", "admin"] as const;
/** 'supporters' sees supporters; 'admin' adds and removes accounts and sets permissions. */
export type Permission = (typeof PERMISSIONS)[number];

/** Who added an account its first login made. */
export const ADDED_BY_LOGIN = "login";

/** Exactly an address at pauseai.uk: not a subdomain, and not anything else. */
export function isStaffEmail(email: string): boolean {
  return /^[^\s@]+@pauseai\.uk$/i.test(email);
}

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}
