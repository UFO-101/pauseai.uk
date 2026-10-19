// Canned responses for the outside services the site calls. One table, used
// by both:
//
// - lib/outside-fetch.ts when DATA_FIXTURES=1, so a Playwright run renders
//   every page from this data instead of the live APIs;
// - tests/fixtures/msw.ts, so Vitest tests get the same responses over a
//   real fetch.
//
// Matched on host and path rather than the full URL, so query strings
// (dates, pagination, filters) don't need listing.
import { createHash } from "node:crypto";
import lumaFuture from "./luma-calendar-future.json";
import lumaPast from "./luma-calendar-past.json";
import lumaGuests from "./luma-guests.json";
import airtableMps from "./airtable-mps.json";
import airtableSignatories from "./airtable-signatories.json";
import parliamentMembers from "./parliament-members.json";
import controlaiLetter from "./controlai-letter.json";

/** A UUID-shaped id that depends only on `text`. */
function fixtureUuid(text: string): string {
  const hex = createHash("sha256").update(text).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
}

// postcodes.io knows one postcode. Its MP is in airtable-mps.json.
const POSTCODES: Record<string, string> = { SW1A1AA: "Cities of London and Westminster" };

export function fixtureResponse(url: string, init?: RequestInit): Response | undefined {
  const { hostname, pathname, searchParams } = new URL(url);
  if (hostname === "public-api.luma.com" && pathname === "/v1/calendars/events/list") {
    // lib/server/luma-calendar.ts asks for past events with "before", upcoming with "after".
    return json(searchParams.has("before") ? lumaPast : lumaFuture);
  }
  if (hostname === "public-api.luma.com" && pathname === "/v1/event/get-guests") {
    return json(lumaGuests);
  }
  if (hostname.endsWith("airtable.com") && pathname.startsWith("/v0/")) {
    // The MPs (lib/server/airtable.ts asks for the House of Commons), or the signatories.
    return json(searchParams.get("filterByFormula")?.includes("House of Commons") ? airtableMps : airtableSignatories);
  }
  if (hostname === "api.postcodes.io" && pathname.startsWith("/postcodes/")) {
    const postcode = decodeURIComponent(pathname.slice("/postcodes/".length)).replace(/\s+/g, "").toUpperCase();
    const constituency = POSTCODES[postcode];
    return constituency
      ? json({
          status: 200,
          result: {
            postcode,
            parliamentary_constituency: constituency,
            codes: { parliamentary_constituency: "E14001172" },
            latitude: 51.501009,
            longitude: -0.141588,
          },
        })
      : new Response(JSON.stringify({ status: 404, error: "Postcode not found" }), { status: 404 });
  }
  if (hostname === "members-api.parliament.uk" && pathname === "/api/Members/Search") {
    return json(parliamentMembers);
  }
  const contact = hostname === "members-api.parliament.uk" && pathname.match(/^\/api\/Members\/(\d+)\/Contact$/);
  if (contact) {
    // Every fixture MP's office address, in the API's own pattern.
    return json({
      value: [{ type: "Parliamentary office", typeId: 1, email: `mp${contact[1]}.office@parliament.uk ` }],
    });
  }
  // ControlAI's letter page, and its PDF: made by pdf-lib, naming the
  // fixture MPs, a peer, and names nobody has.
  if (hostname === "controlai.org" && pathname === "/uk-pm-letter") {
    return new Response(controlaiLetter.html, { headers: { "Content-Type": "text/html" } });
  }
  if (hostname === "images.controlai.com" && pathname.endsWith(".pdf")) {
    return new Response(Buffer.from(controlaiLetter.pdf, "base64"), { headers: { "Content-Type": "application/pdf" } });
  }
  // Postmark accepts every email. What was sent is checked from the request
  // (Vitest) or the outbox (Playwright, tests/fixtures/outbox.ts). The
  // MessageID is made from the email, so the same letter gets the same id
  // every run: it shows on the staff letters page, which the storyboard
  // compares. Each letter's address ends in random digits, so they're left out.
  if (hostname === "api.postmarkapp.com" && pathname === "/email") {
    return json({
      To: "",
      SubmittedAt: new Date().toISOString(),
      MessageID: fixtureUuid(String(init?.body ?? "").replace(/\.\d{6}@/g, "@")),
      ErrorCode: 0,
      Message: "OK",
    });
  }
  if (hostname === "challenges.cloudflare.com" && pathname === "/turnstile/v0/siteverify") {
    return json({ success: true, hostname: "localhost" });
  }
  return undefined;
}
