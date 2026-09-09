import { NextResponse } from "next/server";

// Receives Content-Security-Policy violation reports. Without this the
// report-only policy in next.config.ts reports to nobody: violations reach the
// console of whoever happens to have devtools open on the right page, which is
// how the Airtable frame-src drift went unnoticed. Reports land in the server
// logs (Netlify function logs in production).
//
// Two wire formats, because the directives that drive them differ:
//   report-uri  → application/csp-report, a single { "csp-report": {...} }
//   report-to   → application/reports+json, an array of { type, body }
//
// This endpoint is unauthenticated by necessity — the browser sends the report,
// not the user — so it treats every field as hostile: the body is size-capped
// before parsing, only known fields are read, and each is truncated before it
// reaches a log line.

const MAX_BODY_BYTES = 64 * 1024;
const MAX_FIELD_LENGTH = 300;

// Browser extensions inject scripts and stylesheets into every page and
// generate a constant stream of violations that say nothing about our policy.
const IGNORED_SCHEMES = [
  "chrome-extension:",
  "moz-extension:",
  "safari-extension:",
  "safari-web-extension:",
  "webkit-masked-url:",
];

type CspReportBody = {
  "document-uri"?: string;
  documentURL?: string;
  "violated-directive"?: string;
  effectiveDirective?: string;
  "effective-directive"?: string;
  "blocked-uri"?: string;
  blockedURL?: string;
  disposition?: string;
};

function truncate(value: unknown): string | undefined {
  if (typeof value !== "string" || value === "") return undefined;
  return value.length > MAX_FIELD_LENGTH ? `${value.slice(0, MAX_FIELD_LENGTH)}…` : value;
}

/** Normalise both wire formats to the handful of fields worth logging. */
function normalise(report: CspReportBody) {
  return {
    documentUri: truncate(report["document-uri"] ?? report.documentURL),
    directive: truncate(
      report["violated-directive"] ?? report.effectiveDirective ?? report["effective-directive"],
    ),
    blockedUri: truncate(report["blocked-uri"] ?? report.blockedURL),
    disposition: truncate(report.disposition),
  };
}

function isExtensionNoise(blockedUri: string | undefined): boolean {
  if (!blockedUri) return false;
  return IGNORED_SCHEMES.some((scheme) => blockedUri.startsWith(scheme));
}

function extractReports(parsed: unknown): CspReportBody[] {
  // report-to sends an array of envelopes; report-uri sends a single object.
  if (Array.isArray(parsed)) {
    return parsed
      .filter((entry): entry is { type?: string; body?: CspReportBody } => !!entry && typeof entry === "object")
      .filter((entry) => entry.type === undefined || entry.type === "csp-violation")
      .map((entry) => entry.body)
      .filter((body): body is CspReportBody => !!body && typeof body === "object");
  }
  if (parsed && typeof parsed === "object") {
    const single = (parsed as { "csp-report"?: CspReportBody })["csp-report"];
    if (single && typeof single === "object") return [single];
  }
  return [];
}

export async function POST(request: Request) {
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) {
    // 204 rather than 413: there is no point asking a browser to retry, and an
    // error status only invites it to keep trying.
    return new NextResponse(null, { status: 204 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  for (const report of extractReports(parsed)) {
    const entry = normalise(report);
    if (isExtensionNoise(entry.blockedUri)) continue;
    if (!entry.directive && !entry.blockedUri) continue;
    console.warn("[csp]", JSON.stringify(entry));
  }

  // Always 204: the browser has nothing useful to do with any other answer.
  return new NextResponse(null, { status: 204 });
}
