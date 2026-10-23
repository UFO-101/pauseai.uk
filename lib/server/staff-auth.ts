import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Permission } from "@/lib/staff-permissions";
import { KEEP_DAYS, LOGIN_PATH, SESSION_COOKIE, SESSION_HOURS } from "@/lib/staff-session";
import { query } from "./db";
import { accountOf, accountOnLogin } from "./staff-accounts";

// Staff sessions, kept in the database. Every staff page, Server Action and
// route handler calls requireStaff() first, saying what it needs: an
// account (the default) or a permission; tests/checks/staff-auth.test.ts
// fails if one doesn't. proxy.ts only turns away requests with no cookie.

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Starts a session for a staff member, giving them an account if it's
 * their first login: for a day, or with "Keep me signed in", 30 days.
 * Returns the token for the cookie.
 */
export async function createSession(email: string, remember = false): Promise<string> {
  await accountOnLogin(email);
  await query("UPDATE staff_accounts SET last_login_at = now(), last_seen_at = now() WHERE email = lower($1)", [email]);
  const token = randomBytes(32).toString("base64url");
  await query("DELETE FROM staff_sessions WHERE expires_at < now()");
  await query(
    `INSERT INTO staff_sessions (token_hash, email, remember, expires_at)
     VALUES ($1, $2, $3, now() + CASE WHEN $3 THEN interval '${KEEP_DAYS} days' ELSE interval '${SESSION_HOURS} hours' END)`,
    [hash(token), email, remember],
  );
  return token;
}

/**
 * The staff member a session token belongs to, if it's current, who is
 * then seen now. A kept session is renewed for another 30 days.
 */
export async function sessionEmail(token: string): Promise<string | undefined> {
  const [row] = await query<{ email: string }>(
    `WITH session AS (
       UPDATE staff_sessions SET expires_at = CASE WHEN remember THEN now() + interval '${KEEP_DAYS} days' ELSE expires_at END
       WHERE token_hash = $1 AND expires_at > now() RETURNING email
     ), seen AS (
       UPDATE staff_accounts SET last_seen_at = now() WHERE email IN (SELECT lower(email) FROM session)
     )
     SELECT email FROM session`,
    [hash(token)],
  );
  return row?.email;
}

/** How many sessions `email` has open, not yet expired. */
export async function openSessions(email: string): Promise<number> {
  const [{ count }] = await query<{ count: number }>(
    "SELECT count(*)::int AS count FROM staff_sessions WHERE lower(email) = lower($1) AND expires_at > now()",
    [email],
  );
  return count;
}

export async function deleteSession(token: string): Promise<void> {
  await query("DELETE FROM staff_sessions WHERE token_hash = $1", [hash(token)]);
}

export type Staff = { email: string; token: string; permissions: Permission[] };

/** What a page needs: an account (the default), or a permission. */
export type StaffNeeds = "account" | Permission;

/** Where someone without the permission a page needs is sent: the staff home. */
const STAFF_HOME = "/staff";

/**
 * The logged-in staff member, with their permissions. Anyone else, and a
 * session whose account has gone, is sent to the login page; someone
 * without the permission the page needs, to the staff home.
 */
export async function requireStaff(needs: StaffNeeds = "account"): Promise<Staff> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const email = token ? await sessionEmail(token) : undefined;
  const account = email ? await accountOf(email) : undefined;
  if (!token || !email || !account) redirect(LOGIN_PATH);
  if (needs !== "account" && !account.permissions.includes(needs)) redirect(STAFF_HOME);
  return { email, token, permissions: account.permissions };
}
