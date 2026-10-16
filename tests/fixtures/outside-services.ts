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
import lumaFuture from "./luma-calendar-future.json";
import lumaPast from "./luma-calendar-past.json";
import lumaGuests from "./luma-guests.json";
import airtableMps from "./airtable-mps.json";
import airtableSignatories from "./airtable-signatories.json";
import parliamentMembers from "./parliament-members.json";
import controlaiLetter from "./controlai-letter.json";

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
}

// postcodes.io knows one postcode. Its MP is in airtable-mps.json.
const POSTCODES: Record<string, string> = { SW1A1AA: "Cities of London and Westminster" };

export function fixtureResponse(url: string): Response | undefined {
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
  // (Vitest) or the outbox (Playwright, tests/fixtures/outbox.ts).
  if (hostname === "api.postmarkapp.com" && pathname === "/email") {
    return json({
      To: "",
      SubmittedAt: new Date().toISOString(),
      MessageID: crypto.randomUUID(),
      ErrorCode: 0,
      Message: "OK",
    });
  }
  if (hostname === "challenges.cloudflare.com" && pathname === "/turnstile/v0/siteverify") {
    return json({ success: true, hostname: "localhost" });
  }
  return undefined;
}
