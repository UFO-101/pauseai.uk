// Names shared by proxy.ts and lib/server/staff-auth.ts. Kept apart from
// the latter so the proxy doesn't bundle the database driver.

/** The session cookie. Its value is a random token; the database holds its hash. */
export const SESSION_COOKIE = "staff_session";

export const LOGIN_PATH = "/staff/login";

/** Where a login email's link goes: a page with the button that logs in. */
export const LOGIN_CONFIRM_PATH = "/staff/login/confirm";

/**
 * Staff paths that work without a session: the login page, where the
 * emailed link goes, and the two steps of logging in.
 */
export const OPEN_STAFF_PATHS = [LOGIN_PATH, LOGIN_CONFIRM_PATH, "/staff/api/login", "/staff/api/callback"];
