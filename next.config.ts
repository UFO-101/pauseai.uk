import type { NextConfig } from "next";
import { EVENT_IMAGE_HOSTS } from "@/lib/event-image-hosts";
import { campaigns } from "@/lib/content/email-your-mp";
import { march } from "@/lib/content/march";

// Third-party origins the site actually depends on. Kept here as one list so
// adding an embed means updating the policy in the same place.
const GA = ["https://www.googletagmanager.com", "https://www.google-analytics.com"];
const GA_COLLECT = [
  ...GA,
  "https://analytics.google.com",
  "https://*.analytics.google.com",
  "https://*.google-analytics.com",
];
// Google Ads conversion / remarketing tags, loaded through the GTM container
// (see components/layout/CookieConsent.tsx). The container is edited outside this repo,
// so this is the usual set for Ads tags; tune it from CSP reports.
const GOOGLE_ADS = [
  "https://www.googleadservices.com",
  "https://googleads.g.doubleclick.net",
  "https://www.google.com",
  "https://www.google.co.uk",
];

// Where violation reports are sent. Relative, so reports stay in whatever
// environment produced them — a deploy preview reports to itself, not to
// production. app/api/csp-report handles both wire formats.
const REPORT_PATH = "/api/csp-report";
// Reporting-Endpoints (the report-to directive) needs an absolute URL, which we
// only know for certain in production. Netlify sets URL to the site's address.
const REPORT_ORIGIN = process.env.URL ?? (process.env.NODE_ENV === "production" ? "https://pauseai.uk" : null);

// Shipped as Content-Security-Policy-Report-Only: violations are reported
// without breaking anything, so the allowlist can be proven against real
// traffic before it's enforced. Switch the header name in securityHeaders() to
// enforce.
//
// 'unsafe-inline' in script-src is required while this is report-only: Next
// emits inline bootstrap/hydration scripts, and nonces need a per-request
// (dynamic) response, which this mostly-static site doesn't have. Enforcing
// the policy with 'unsafe-inline' still present would buy little against XSS,
// so treat nonces as a prerequisite for flipping this to enforcing.
// Cloudflare Turnstile, the anti-spam check on the Email your MP form: its
// script, the frame it draws the widget in, and the requests it makes.
const TURNSTILE = "https://challenges.cloudflare.com";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${[...GA, "https://www.googleadservices.com", "https://googleads.g.doubleclick.net", "https://tally.so", TURNSTILE].join(" ")}`,
  "style-src 'self' 'unsafe-inline'",
  // next/font self-hosts both Lato and Inter at build time, so no font CDN.
  "font-src 'self' data:",
  // blob:/data: cover next/image; EVENT_IMAGE_HOSTS are the Luma event covers.
  `img-src 'self' data: blob: ${[...EVENT_IMAGE_HOSTS.map((host) => `https://${host}`), ...GA, ...GOOGLE_ADS].join(" ")}`,
  `connect-src 'self' ${[...GA_COLLECT, ...GOOGLE_ADS, TURNSTILE].join(" ")}`,
  // The MP-email and onboarding embeds, the Tally story form, and Turnstile's
  // widget. GTM's <noscript> iframe is in app/layout.tsx; td.doubleclick.net
  // is used by Ads tags in the container.
  `frame-src https://pauseai.info https://tally.so https://www.googletagmanager.com https://td.doubleclick.net ${TURNSTILE}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  // report-uri is deprecated but still the only one Firefox and Safari honour;
  // report-to is the replacement, and Chrome prefers it when both are present.
  `report-uri ${REPORT_PATH}`,
  ...(REPORT_ORIGIN ? ["report-to csp-endpoint"] : []),
].join("; ");

function securityHeaders() {
  return [
    // Enforced. X-Frame-Options is what actually blocks framing today, since
    // frame-ancestors above is only being reported on.
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
    // Report-only for now — see the note above contentSecurityPolicy.
    { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy },
    // Defines the group the report-to directive above refers to. Omitted when
    // we can't build an absolute URL, in which case report-uri carries it.
    ...(REPORT_ORIGIN
      ? [
          {
            key: "Reporting-Endpoints",
            value: `csp-endpoint="${REPORT_ORIGIN}${REPORT_PATH}"`,
          },
        ]
      : []),
  ];
}

const nextConfig: NextConfig = {
  env: {
    // Netlify's deploy context ("production", "deploy-preview", ...), fixed
    // at build time. Outside production, letters go only to the test MP
    // (lib/server/mp-letters.ts).
    DEPLOY_CONTEXT: process.env.CONTEXT ?? "local",
    // This deploy's own address, from Netlify: in production the site's main
    // domain, pauseai.uk. Read only by siteUrl() (lib/site-url.ts), for every
    // link in an email and every redirect. Empty for a local build.
    SITE_ORIGIN: (process.env.CONTEXT === "production" ? process.env.URL : process.env.DEPLOY_PRIME_URL) ?? "",
  },
  experimental: {
    // A file attached to a mailing comes in a Server Action's request, up to
    // MAX_ATTACHMENT_BYTES (lib/mailing-attachments.ts) and the form around it.
    serverActions: { bodySizeLimit: "5mb" },
  },
  // The PDFs attached to letters, read from disk when one is sent.
  outputFileTracingIncludes: {
    "/api/email-your-mp/letters": ["./public/pdfs/*.pdf"],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders() },
      // The QR tool reads existing codes with the camera. Listed last so it
      // overrides the site-wide camera=() for this page only.
      {
        source: "/tools/qr",
        headers: [{ key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" }],
      },
      // The home page's events band finds events near the visitor's location
      // when they ask it to, so the home page alone may ask for it.
      {
        source: "/",
        headers: [{ key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=()" }],
      },
    ];
  },
  images: {
    // Luma event cover images (components/events/EventList.tsx).
    remotePatterns: EVENT_IMAGE_HOSTS.map((hostname) => ({ protocol: "https" as const, hostname })),
  },
  async redirects() {
    return [
      // The stories section moved to /people; shared story permalinks
      // (CopyLinkButton) predate the rename and must keep resolving.
      { source: "/stories", destination: "/people", permanent: true },
      { source: "/stories/:slug", destination: "/people/:slug", permanent: true },
      // Email your MP's campaign pages were built at /campaigns-v2 before
      // replacing /campaigns, and links to them were shared while testing.
      { source: "/campaigns-v2", destination: `/campaigns/${campaigns[0].slug}`, permanent: true },
      { source: "/campaigns-v2/:path*", destination: "/campaigns/:path*", permanent: true },
      // Staff alerts about bounced letters linked to the blocked emails page
      // under its first two names, before it split in two; the letters were
      // to politicians.
      { source: "/staff/blocked-addresses", destination: "/staff/politicians/blocked-emails", permanent: true },
      { source: "/staff/blocked-emails", destination: "/staff/politicians/blocked-emails", permanent: true },
      // Your sessions are on your own page, with your Gmail.
      { source: "/staff/sessions", destination: "/staff/me#sessions", permanent: true },
      // The Glasgow local group became the Scotland local group.
      { source: "/glasgow", destination: "/scotland", permanent: true },
      // There's no list of protests yet, so /protests goes to the current one.
      // Temporary, so browsers don't remember it when the next protest comes.
      { source: "/protests", destination: march.path, permanent: false },
      // /campaigns goes to the first campaign in priority order, which can
      // change, so temporary. Here rather than a page's redirect(): a page
      // that redirects while rendering leaves the site's header and footer
      // with nothing between them for a moment on a client-side navigation.
      { source: "/campaigns", destination: `/campaigns/${campaigns[0].slug}`, permanent: false },
      // The march's short link, keeping its utm_source. Temporary, so it can
      // point to the next march.
      { source: march.shortPath, destination: march.path, permanent: false },
      // Old backlink used a space instead of a hyphen in the filename.
      // Source matches the raw request path, so the space must stay percent-encoded.
      { source: "/pdfs/Donor%20Prospectus.pdf", destination: "/pdfs/Donor-Prospectus.pdf", permanent: true },
      // Malformed crawled URL: destination concatenated onto itself with no separator.
      // Next collapses the request's repeated "//" before matching, so only one
      // slash survives after the colon here.
      {
        source: "/global-ai-sentiment-2026https\\:/pauseai.uk/global-ai-sentiment-2026",
        destination: "/global-ai-sentiment-2026",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
