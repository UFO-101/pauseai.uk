// Every absolute URL on this site, for a link in an email or a redirect,
// comes from siteUrl(). ESLint keeps the other ways of finding the site's
// address out of the rest of the code (SITE_URL_RULE in eslint.config.mjs).

/**
 * An absolute URL on this site, built from the deploy's own address, fixed at
 * build time (SITE_ORIGIN in next.config.ts): pauseai.uk in production. Never
 * from the request. On Netlify its URL has the main--pauseaiuk.netlify.app
 * host, where none of the pauseai.uk cookies are, and whoever sends it can
 * set its Host, so a login link built from it could hand them the token.
 * Only a local build, which Netlify didn't make, uses the request's origin.
 */
export function siteUrl(path: string, request: Request): URL {
  const origin = process.env.SITE_ORIGIN || (process.env.DEPLOY_CONTEXT === "local" ? request.url : "");
  if (!origin) throw new Error("This build doesn't know its own address: SITE_ORIGIN isn't set");
  return new URL(path, origin);
}
