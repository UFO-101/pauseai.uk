// What a staff account may do beyond the ordinary staff pages. Any
// pauseai.uk address can log in; an account (lib/server/staff-accounts.ts)
// opens the staff pages, and these open more.

// In the order forms list them.
export const PERMISSIONS = ["supporters", "admin"] as const;
/** 'supporters' sees supporters; 'admin' adds and removes accounts and sets permissions. */
export type Permission = (typeof PERMISSIONS)[number];

/** Exactly an address at pauseai.uk: not a subdomain, and not anything else. */
export function isStaffEmail(email: string): boolean {
  return /^[^\s@]+@pauseai\.uk$/i.test(email);
}

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}
