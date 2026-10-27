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

/** Where the login page's `next` is: the staff page to return to once logged in. */
export const NEXT_PARAM = "next";

/** The header the proxy gives each staff request, with its path and query, for requireStaff() to return to. */
export const STAFF_PATH_HEADER = "x-staff-path";

/**
 * Where to go once logged in: `next`, if it's a staff page, or the staff
 * home. Anything else, such as another site or a login step, is ignored, so
 * a link can't use the login to send someone off the site.
 */
export function afterLogin(next: unknown): string {
  if (typeof next !== "string" || !/^\/staff([/?]|$)/.test(next)) return "/staff";
  const path = next.split("?")[0];
  return OPEN_STAFF_PATHS.includes(path) || path.startsWith("/staff/api/") ? "/staff" : next;
}

/** The login page, with the staff page to return to afterwards, if there's one. */
export function loginPath(next: string | undefined): string {
  const back = afterLogin(next);
  return back === "/staff" ? LOGIN_PATH : `${LOGIN_PATH}?${NEXT_PARAM}=${encodeURIComponent(back)}`;
}
