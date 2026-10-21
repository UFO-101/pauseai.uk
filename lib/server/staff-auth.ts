import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Permission } from "@/lib/staff-permissions";
import { KEEP_DAYS, LOGIN_PATH, SESSION_COOKIE, SESSION_HOURS } from "@/lib/staff-session";
import { query } from "./db";
import { accountOf } from "./staff-accounts";

// Staff sessions, kept in the database. Every staff page, Server Action and
// route handler calls requireStaff() first, saying what it needs: an
// account (the default), a permission, or just a login (the home page and
// logging out); tests/checks/staff-auth.test.ts fails if one doesn't.
// proxy.ts only turns away requests with no cookie.

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Starts a session for a staff member: for a day, or with "Keep me signed
 * in", 30 days. Returns the token for the cookie.
 */
export async function createSession(email: string, remember = false): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await query("DELETE FROM staff_sessions WHERE expires_at < now()");
  await query(
    `INSERT INTO staff_sessions (token_hash, email, remember, expires_at)
     VALUES ($1, $2, $3, now() + CASE WHEN $3 THEN interval '${KEEP_DAYS} days' ELSE interval '${SESSION_HOURS} hours' END)`,
    [hash(token), email, remember],
  );
  return token;
}

/** The staff member a session token belongs to, if it's current. A kept session is renewed for another 30 days. */
export async function sessionEmail(token: string): Promise<string | undefined> {
  const [row] = await query<{ email: string }>(
    `UPDATE staff_sessions SET expires_at = CASE WHEN remember THEN now() + interval '${KEEP_DAYS} days' ELSE expires_at END
     WHERE token_hash = $1 AND expires_at > now() RETURNING email`,
    [hash(token)],
  );
  return row?.email;
}

export async function deleteSession(token: string): Promise<void> {
  await query("DELETE FROM staff_sessions WHERE token_hash = $1", [hash(token)]);
}

export type Staff = {
  email: string;
  token: string;
  /** Whether they have a staff account, which the pages need. */
  account: boolean;
  permissions: Permission[];
};

/** What a page needs: a login, an account (the default), or a permission. */
export type StaffNeeds = "login" | "account" | Permission;

/** Where someone without the account or permission a page needs is sent: the staff home, which says whom to ask. */
const STAFF_HOME = "/staff";

/**
 * The logged-in staff member, with their account and permissions. Anyone
 * else is sent to the login page; someone without what the page needs,
 * to the staff home.
 */
export async function requireStaff(needs: StaffNeeds = "account"): Promise<Staff> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const email = token ? await sessionEmail(token) : undefined;
  if (!token || !email) redirect(LOGIN_PATH);
  const account = await accountOf(email);
  const permissions = account?.permissions ?? [];
  if (needs !== "login" && !account) redirect(STAFF_HOME);
  if (needs !== "login" && needs !== "account" && !permissions.includes(needs)) redirect(STAFF_HOME);
  return { email, token, account: account !== undefined, permissions };
}
