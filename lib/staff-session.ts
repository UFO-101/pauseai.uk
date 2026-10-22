// Names shared by proxy.ts and lib/server/staff-auth.ts. Kept apart from
// the latter so the proxy doesn't bundle the database driver.

/** The session cookie. Its value is a random token; the database holds its hash. */
export const SESSION_COOKIE = "staff_session";

/**
 * Set beside the session cookie when "Keep me signed in" was ticked, so the
 * proxy, which has no database, knows to renew both cookies on every
 * request. Its value is "1".
 */
export const KEEP_COOKIE = "staff_keep";

/** How long a session lasts: a day, or with "Keep me signed in", 30 days, renewed on use. */
export const SESSION_HOURS = 24;
export const KEEP_DAYS = 30;

const COOKIE = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/staff" };

/**
 * The session cookie: HttpOnly, Secure, SameSite=Lax, only under /staff.
 * Kept for 30 days when `remember`; otherwise it has no expiry, so the
 * browser drops it when closed, and the server's day applies meanwhile.
 */
export function sessionCookie(token: string, remember: boolean) {
  return { ...COOKIE, name: SESSION_COOKIE, value: token, ...(remember ? { maxAge: KEEP_DAYS * 24 * 60 * 60 } : {}) };
}

/** The marker beside a kept session's cookie, for the same 30 days. */
export function keepCookie() {
  return { ...COOKIE, name: KEEP_COOKIE, value: "1", maxAge: KEEP_DAYS * 24 * 60 * 60 };
}

export const LOGIN_PATH = "/staff/login";

/** Where a login email's link goes. Opened in the browser that asked for it, it logs in. */
export const LOGIN_LINK_PATH = "/staff/api/callback";

/**
 * Set on the browser that asks for a login link. The link only works in a
 * browser with it. Its value is a random token; the link's row holds its hash.
 */
export const LOGIN_BROWSER_COOKIE = "staff_login";

/** The dev login's route (DevLogin): a session at once, in a fixture build only. */
export const DEV_LOGIN_PATH = "/staff/api/dev-login";

/** Staff paths that work without a session: the login page, the two steps of logging in, and the dev login. */
export const OPEN_STAFF_PATHS = [LOGIN_PATH, "/staff/api/login", LOGIN_LINK_PATH, DEV_LOGIN_PATH];
