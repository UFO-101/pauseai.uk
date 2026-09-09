import type { NextConfig } from "next";

// Third-party origins the site actually depends on. Kept here as one list so
// adding an embed means updating the policy in the same place.
const GA = ["https://www.googletagmanager.com", "https://www.google-analytics.com"];
const GA_COLLECT = [...GA, "https://analytics.google.com", "https://*.analytics.google.com", "https://*.google-analytics.com"];

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
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${[...GA, "https://tally.so"].join(" ")}`,
  "style-src 'self' 'unsafe-inline'",
  // next/font self-hosts both Lato and Inter at build time, so no font CDN.
  "font-src 'self' data:",
  // blob:/data: cover next/image; images.lumacdn.com is the Luma event covers.
  `img-src 'self' data: blob: https://images.lumacdn.com ${GA.join(" ")}`,
  `connect-src 'self' ${GA_COLLECT.join(" ")}`,
  // The MP-email and onboarding embeds, the Tally story form, and the
  // Airtable signatories embed that campaigns/page.tsx falls back to when
  // AIRTABLE_TOKEN is unset (local and preview builds).
  "frame-src https://pauseai.info https://tally.so https://airtable.com",
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
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders() }];
  },
  images: {
    remotePatterns: [
      // Luma event cover images (components/EventList.tsx)
      { protocol: "https", hostname: "images.lumacdn.com" },
    ],
  },
  async redirects() {
    return [
      // The stories section moved to /people; shared story permalinks
      // (CopyLinkButton) predate the rename and must keep resolving.
      { source: "/stories", destination: "/people", permanent: true },
      { source: "/stories/:slug", destination: "/people/:slug", permanent: true },
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
