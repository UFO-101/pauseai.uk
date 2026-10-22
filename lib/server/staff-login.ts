import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { staffCopy } from "@/lib/content/staff-interface";
import { siteUrl } from "@/lib/site-url";
import { LOGIN_BROWSER_COOKIE, LOGIN_LINK_PATH } from "@/lib/staff-session";
import { query, transaction } from "./db";
import { send } from "./email";
import { notifyDomain } from "./outside-services/postmark";
import { randomId } from "./random-id";
import { isStaffEmail } from "@/lib/staff-permissions";

// Logging in by email: a staff member types their pauseai.uk address and
// gets a link. The link only works in the browser that asked for it, which
// holds a cookie the link's row knows the hash of. So a mail scanner that
// follows the link, or anyone the email is forwarded to, logs nobody in and
// doesn't use it up. Each link works once, for LINK_MINUTES.

const LINK_MINUTES = 15;
/** At most this many login emails an hour to one address. */
export const HOURLY_LINKS = 5;

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** A new token for the browser asking for a link, unless it already has one from an earlier request. */
export function loginBrowser(existing: string | undefined): string {
  return existing && /^[\w-]{43}$/.test(existing) ? existing : randomBytes(32).toString("base64url");
}

/** The cookie that marks the browser that asked for a link. It lasts as long as the link does. */
export function loginBrowserCookie(browser: string) {
  return {
    name: LOGIN_BROWSER_COOKIE,
    value: browser,
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/staff",
    maxAge: LINK_MINUTES * 60,
  };
}

/**
 * Emails a login link to a pauseai.uk address, that works only in the
 * browser holding `browser`; `remember` is "Keep me signed in", kept with
 * the link for the session it starts. Says nothing either way, so the form
 * can't be used to find out which addresses work.
 */
export async function sendLoginLink(typed: string, request: Request, browser: string, remember = false): Promise<void> {
  const email = typed.trim().toLowerCase();
  if (!isStaffEmail(email)) {
    console.info("No staff login link sent: the address typed isn't at pauseai.uk");
    return;
  }
  const link = siteUrl(LOGIN_LINK_PATH, request);
  const token = await transaction(async (db) => {
    // Locks out a second request for the same address until this one is saved.
    await query("SELECT pg_advisory_xact_lock(hashtext($1))", [email], db);
    const [{ count }] = await query<{ count: number }>(
      "SELECT count(*)::int AS count FROM staff_login_links WHERE lower(email) = $1 AND created_at > now() - interval '1 hour'",
      [email],
      db,
    );
    if (count >= HOURLY_LINKS) return undefined;
    // The address and how many it's had: a different seed for each link.
    const token = (await randomId(32, () => `login ${email} ${count}`)).toString("base64url");
    await query("DELETE FROM staff_login_links WHERE created_at < now() - interval '1 day'", [], db);
    await query(
      `INSERT INTO staff_login_links (token_hash, email, browser_hash, remember, expires_at)
       VALUES ($1, $2, $3, $4, now() + interval '${LINK_MINUTES} minutes')`,
      [hash(token), email, hash(browser), remember],
      db,
    );
    return token;
  });
  if (!token) {
    console.info(`No staff login link sent: ${HOURLY_LINKS} have already been sent to that address in the last hour`);
    return;
  }
  const result = await send(
    {
      From: `PauseAI UK staff login <noreply@${notifyDomain()}>`,
      To: email,
      Subject: staffCopy.loginEmail.subject,
      TextBody: staffCopy.loginEmail.body(`${link.href}?token=${token}`, LINK_MINUTES),
      Tag: "staff-login",
    },
    "staff-login",
  );
  // Not sent, so it can't be used.
  if (!result.sent) await query("DELETE FROM staff_login_links WHERE token_hash = $1", [hash(token)]);
}

/**
 * Uses a login link: the address it was sent to, and whether to keep them
 * signed in, if it's current, unused and opened in the browser that asked
 * for it. It then can't be used again. Opened in another browser, it's left
 * as it was: "elsewhere".
 */
export async function redeemLoginLink(
  token: string,
  browser: string,
): Promise<{ email: string; remember: boolean } | { refused: "elsewhere" | "failed" }> {
  if (!token) return { refused: "failed" };
  const [link] = await query<{ email: string; remember: boolean }>(
    "UPDATE staff_login_links SET used_at = now() WHERE token_hash = $1 AND browser_hash = $2 AND used_at IS NULL AND expires_at > now() RETURNING email, remember",
    [hash(token), hash(browser)],
  );
  if (link) return link;
  const [current] = await query(
    "SELECT 1 FROM staff_login_links WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()",
    [hash(token)],
  );
  return { refused: current ? "elsewhere" : "failed" };
}
