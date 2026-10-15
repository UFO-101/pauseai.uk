import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { staffCopy } from "@/lib/content/staff-interface";
import { LOGIN_BROWSER_COOKIE, LOGIN_LINK_PATH } from "@/lib/staff-session";
import { query, transaction } from "./db";
import { notifyDomain, sendEmail } from "./postmark";

// Logging in by email: a staff member types their pauseai.uk address and
// gets a link. The link only works in the browser that asked for it, which
// holds a cookie the link's row knows the hash of. So a mail scanner that
// follows the link, or anyone the email is forwarded to, logs nobody in and
// doesn't use it up. Each link works once, for LINK_MINUTES.

export const LINK_MINUTES = 15;
/** At most this many login emails an hour to one address. */
export const HOURLY_LINKS = 5;

/** Exactly an address at pauseai.uk: not a subdomain, and not anything else. */
export function isStaffEmail(email: string): boolean {
  return /^[^\s@]+@pauseai\.uk$/i.test(email);
}

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** A new token for the browser asking for a link, unless it already has one from an earlier request. */
export function loginBrowser(existing: string | undefined): string {
  return existing && /^[\w-]{43}$/.test(existing) ? existing : randomBytes(32).toString("base64url");
}

/** The cookie that marks the browser that asked for a link. It lasts as long as the link does. */
export function loginBrowserCookie(browser: string) {
  return { name: LOGIN_BROWSER_COOKIE, value: browser, httpOnly: true, secure: true, sameSite: "lax" as const, path: "/staff", maxAge: LINK_MINUTES * 60 };
}

/**
 * Where login links point. Fixed at build time from Netlify's own settings
 * (next.config.ts), never from the request, whose Host an attacker could
 * set: a link to their own site would hand them the token. Only a local
 * build, which Netlify didn't make, uses the request's origin.
 */
export function linkOrigin(requestOrigin: string): string | undefined {
  if (process.env.SITE_ORIGIN) return process.env.SITE_ORIGIN;
  return process.env.DEPLOY_CONTEXT === "local" ? requestOrigin : undefined;
}

/**
 * Emails a login link to a pauseai.uk address, that works only in the
 * browser holding `browser`. Says nothing either way, so the form can't be
 * used to find out which addresses work.
 */
export async function sendLoginLink(typed: string, requestOrigin: string, browser: string): Promise<void> {
  const email = typed.trim().toLowerCase();
  const origin = linkOrigin(requestOrigin);
  if (!isStaffEmail(email)) return;
  if (!origin) {
    console.error("Staff login links can't be sent: SITE_ORIGIN isn't set");
    return;
  }
  const token = randomBytes(32).toString("base64url");
  const saved = await transaction(async (db) => {
    // Locks out a second request for the same address until this one is saved.
    await query("SELECT pg_advisory_xact_lock(hashtext($1))", [email], db);
    const [{ count }] = await query<{ count: number }>(
      "SELECT count(*)::int AS count FROM staff_login_links WHERE lower(email) = $1 AND created_at > now() - interval '1 hour'",
      [email],
      db,
    );
    if (count >= HOURLY_LINKS) return false;
    await query("DELETE FROM staff_login_links WHERE created_at < now() - interval '1 day'", [], db);
    await query(`INSERT INTO staff_login_links (token_hash, email, browser_hash, expires_at) VALUES ($1, $2, $3, now() + interval '${LINK_MINUTES} minutes')`, [hash(token), email, hash(browser)], db);
    return true;
  });
  if (!saved) return;
  try {
    await sendEmail({
      From: `PauseAI UK staff login <noreply@${notifyDomain()}>`,
      To: email,
      Subject: staffCopy.loginEmail.subject,
      TextBody: staffCopy.loginEmail.body(`${origin}${LOGIN_LINK_PATH}?token=${token}`, LINK_MINUTES),
      Tag: "staff-login",
    });
  } catch (error) {
    console.error("Couldn't send a staff login link:", error);
    await query("DELETE FROM staff_login_links WHERE token_hash = $1", [hash(token)]);
  }
}

/**
 * Uses a login link: the address it was sent to, if it's current, unused and
 * opened in the browser that asked for it. It then can't be used again.
 * Opened in another browser, it's left as it was: "elsewhere".
 */
export async function redeemLoginLink(token: string, browser: string): Promise<{ email: string } | { refused: "elsewhere" | "failed" }> {
  if (!token) return { refused: "failed" };
  const [link] = await query<{ email: string }>(
    "UPDATE staff_login_links SET used_at = now() WHERE token_hash = $1 AND browser_hash = $2 AND used_at IS NULL AND expires_at > now() RETURNING email",
    [hash(token), hash(browser)],
  );
  if (link) return { email: link.email };
  const [current] = await query("SELECT 1 FROM staff_login_links WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()", [hash(token)]);
  return { refused: current ? "elsewhere" : "failed" };
}
