// Names shared by proxy.ts and lib/server/staff-auth.ts. Kept apart from
// the latter so the proxy doesn't bundle the database driver.

/** The session cookie. Its value is a random token; the database holds its hash. */
export const SESSION_COOKIE = "staff_session";

export const LOGIN_PATH = "/staff/login";

/** Where a login email's link goes. Opened in the browser that asked for it, it logs in. */
export const LOGIN_LINK_PATH = "/staff/api/callback";

/**
 * Set on the browser that asks for a login link. The link only works in a
 * browser with it. Its value is a random token; the link's row holds its hash.
 */
export const LOGIN_BROWSER_COOKIE = "staff_login";

/** Staff paths that work without a session: the login page and the two steps of logging in. */
export const OPEN_STAFF_PATHS = [LOGIN_PATH, "/staff/api/login", LOGIN_LINK_PATH];

/**
 * An absolute URL on this site for a redirect. Built from the deploy's own
 * origin, fixed at build time (SITE_ORIGIN in next.config.ts): on Netlify
 * the request's own URL has the main--pauseaiuk.netlify.app host, where
 * none of the pauseai.uk cookies are. Only a build without it, such as a
 * local one, uses the request's origin.
 */
export function siteUrl(path: string, request: Request): URL {
  return new URL(path, process.env.SITE_ORIGIN || request.url);
}
