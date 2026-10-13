// Names shared by proxy.ts and lib/server/staff-auth.ts. Kept apart from
// the latter so the proxy doesn't bundle the database driver.

/** The session cookie. Its value is a random token; the database holds its hash. */
export const SESSION_COOKIE = "staff_session";

/** Holds the login's state and PKCE verifier between Google and our callback. */
export const LOGIN_COOKIE = "staff_login";

export const LOGIN_PATH = "/staff/login";

/** Staff paths that work without a session: the login page, and the two steps of logging in. */
export const OPEN_STAFF_PATHS = [LOGIN_PATH, "/staff/api/login", "/staff/api/callback"];
