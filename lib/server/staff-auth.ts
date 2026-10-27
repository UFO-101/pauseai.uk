import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Permission } from "@/lib/staff-permissions";
import { KEEP_DAYS, loginPath, SESSION_COOKIE, SESSION_HOURS, STAFF_PATH_HEADER } from "@/lib/staff-session";
import { logChange } from "./audit";
import { query } from "./db";
import { accountOnLogin } from "./staff-accounts";

// Staff sessions, kept in the database. Every staff page, Server Action and
// route handler calls requireStaff() first, saying what it needs: an
// account (the default) or a permission; tests/checks/staff-auth.test.ts
// fails if one doesn't. proxy.ts only turns away requests with no cookie.

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** The most of a User-Agent header a session keeps: more than any browser's, less than a header someone made up. */
const USER_AGENT_LENGTH = 512;

/**
 * Starts a session for a staff member, giving them an account if it's
 * their first login: for a day, or with "Keep me signed in", 30 days. Keeps
 * the browser's User-Agent, cut to USER_AGENT_LENGTH, to say which browser
 * it is. Returns the token for the cookie.
 */
export async function createSession(email: string, remember = false, userAgent: string | null = null): Promise<string> {
  await accountOnLogin(email);
  await query("UPDATE staff_accounts SET last_login_at = now(), last_seen_at = now() WHERE email = lower($1)", [email]);
  const token = randomBytes(32).toString("base64url");
  await query("DELETE FROM staff_sessions WHERE expires_at < now()");
  await query(
    `INSERT INTO staff_sessions (token_hash, email, remember, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, now() + CASE WHEN $3 THEN interval '${KEEP_DAYS} days' ELSE interval '${SESSION_HOURS} hours' END)`,
    [hash(token), email, remember, userAgent?.slice(0, USER_AGENT_LENGTH) ?? null],
  );
  return token;
}

/**
 * The staff member a session token belongs to, if it's current, who is
 * then seen now, with how many sessions they have open, this one included,
 * and their account's permissions, or null if their account has gone. A
 * kept session is renewed for another 30 days. One query, as every staff
 * page waits on it.
 */
async function sessionOf(
  token: string,
): Promise<{ email: string; sessions: number; permissions: Permission[] | null } | undefined> {
  const [row] = await query<{ email: string; sessions: number; permissions: Permission[] | null }>(
    `WITH session AS (
       UPDATE staff_sessions SET expires_at = CASE WHEN remember THEN now() + interval '${KEEP_DAYS} days' ELSE expires_at END
       WHERE token_hash = $1 AND expires_at > now() RETURNING email
     ), seen AS (
       UPDATE staff_accounts SET last_seen_at = now() WHERE email IN (SELECT lower(email) FROM session)
     )
     SELECT email, (SELECT count(*)::int FROM staff_sessions o
                    WHERE lower(o.email) = lower(session.email) AND o.expires_at > now()) AS sessions,
       (SELECT a.permissions FROM staff_accounts a WHERE a.email = lower(trim(session.email))) AS permissions
     FROM session`,
    [hash(token)],
  );
  return row;
}

/** The staff member a session token belongs to, if it's current (sessionOf). */
export async function sessionEmail(token: string): Promise<string | undefined> {
  return (await sessionOf(token))?.email;
}

/**
 * One of a staff member's sessions, for the page of them: which (its
 * token's hash, which can't be used to log in), the User-Agent of the
 * browser it began in, when it began and ends, whether it's kept, and
 * whether it's this one.
 */
export type StaffSession = {
  id: string;
  userAgent: string | null;
  startedAt: string;
  expiresAt: string;
  remember: boolean;
  current: boolean;
};

/** Every session `email` has open, newest first, this one first of those begun together, marking it. */
export async function listSessions(email: string, token: string): Promise<StaffSession[]> {
  return query<StaffSession>(
    `SELECT token_hash AS id, user_agent AS "userAgent", created_at AS "startedAt", expires_at AS "expiresAt", remember, token_hash = $2 AS current
     FROM staff_sessions WHERE lower(email) = lower($1) AND expires_at > now()
     ORDER BY created_at DESC, token_hash = $2 DESC, token_hash`,
    [email, hash(token)],
  );
}

/** Ends `email`'s session `id` (StaffSession), as they ask on the page of them. Returns whether there was one to end. */
export async function endSession(email: string, id: string): Promise<boolean> {
  const ended = await query(
    "DELETE FROM staff_sessions WHERE token_hash = $1 AND lower(email) = lower($2) RETURNING 1",
    [id, email],
  );
  if (ended.length)
    await logChange(email.toLowerCase(), "end staff sessions", { email: email.toLowerCase(), sessions: 1 });
  return ended.length > 0;
}

/** The ID listSessions gives the session `token` is. */
export function sessionId(token: string): string {
  return hash(token);
}

export async function deleteSession(token: string): Promise<void> {
  await query("DELETE FROM staff_sessions WHERE token_hash = $1", [hash(token)]);
}

/** The logged-in staff member: who, their session's token, their permissions, and how many sessions they have open. */
export type Staff = { email: string; token: string; permissions: Permission[]; sessions: number };

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
  const session = token ? await sessionOf(token) : undefined;
  const permissions = session?.permissions;
  if (!token || !session || !permissions) redirect(loginPath((await headers()).get(STAFF_PATH_HEADER) ?? undefined));
  if (needs !== "account" && !permissions.includes(needs)) redirect(STAFF_HOME);
  return { email: session.email, token, permissions, sessions: session.sessions };
}
