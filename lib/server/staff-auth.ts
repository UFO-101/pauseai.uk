import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LOGIN_PATH, SESSION_COOKIE } from "@/lib/staff-session";
import { query } from "./db";

// Staff sessions, kept in the database. Every staff page, Server Action and
// route handler calls requireStaff() first; scripts/check-staff-auth.mjs
// fails CI if one doesn't. proxy.ts only turns away requests with no cookie.

const SESSION_HOURS = 12;

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

/** The session cookie: HttpOnly, Secure, SameSite=Lax, only under /staff, for 12 hours. */
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

export type Staff = { email: string; token: string };

/** The logged-in staff member. Anyone else is sent to the login page. */
export async function requireStaff(): Promise<Staff> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const email = token ? await sessionEmail(token) : undefined;
  if (!token || !email) redirect(LOGIN_PATH);
  return { email, token };
}
