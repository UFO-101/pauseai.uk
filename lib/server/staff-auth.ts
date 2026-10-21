import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Permission } from "@/lib/staff-permissions";
import { LOGIN_PATH, SESSION_COOKIE } from "@/lib/staff-session";
import { query } from "./db";
import { permissionsOf } from "./staff-permissions";

// Staff sessions, kept in the database. Every staff page, Server Action and
// route handler calls requireStaff() first, naming the permission it needs
// if it needs one; tests/checks/staff-auth.test.ts fails if one doesn't.
// proxy.ts only turns away requests with no cookie.

const SESSION_HOURS = 24 * 7;

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Starts a session for a staff member. Returns the token for the cookie. */
export async function createSession(email: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await query("DELETE FROM staff_sessions WHERE expires_at < now()");
  await query(
    `INSERT INTO staff_sessions (token_hash, email, expires_at) VALUES ($1, $2, now() + interval '${SESSION_HOURS} hours')`,
    [hash(token), email],
  );
  return token;
}

/** The staff member a session token belongs to, if it's current. */
export async function sessionEmail(token: string): Promise<string | undefined> {
  const [row] = await query<{ email: string }>(
    "SELECT email FROM staff_sessions WHERE token_hash = $1 AND expires_at > now()",
    [hash(token)],
  );
  return row?.email;
}

export async function deleteSession(token: string): Promise<void> {
  await query("DELETE FROM staff_sessions WHERE token_hash = $1", [hash(token)]);
}

/** The session cookie: HttpOnly, Secure, SameSite=Lax, only under /staff, for a week. */
export function sessionCookie(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/staff",
    maxAge: SESSION_HOURS * 60 * 60,
  };
}

export type Staff = { email: string; token: string; permissions: Permission[] };

/** Where someone without the permission a page needs is sent: the staff home, which lists what they can see. */
const STAFF_HOME = "/staff";

/**
 * The logged-in staff member, with their permissions. Anyone else is sent
 * to the login page, and a staff member without `permission` to the staff
 * home.
 */
export async function requireStaff(permission?: Permission): Promise<Staff> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const email = token ? await sessionEmail(token) : undefined;
  if (!token || !email) redirect(LOGIN_PATH);
  const permissions = await permissionsOf(email);
  if (permission && !permissions.includes(permission)) redirect(STAFF_HOME);
  return { email, token, permissions };
}
