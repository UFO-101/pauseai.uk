// Canned responses for the outside services the site calls. One table, used
// by both:
//
// - lib/outside-fetch.ts when DATA_FIXTURES=1, so a Playwright run renders
//   every page from this data instead of the live APIs;
// - tests/fixtures/msw.ts, so Vitest tests get the same responses over a
//   real fetch.
//
// Matched on host and path rather than the full URL, so query strings
// (period, pagination, filters) don't need listing.
import lumaFuture from "./luma-calendar-future.json";
import lumaPast from "./luma-calendar-past.json";
import lumaGuests from "./luma-guests.json";
import airtableMps from "./airtable-mps.json";
import airtableSignatories from "./airtable-signatories.json";
import parliamentMembers from "./parliament-members.json";
import googleLogin from "./google-login.json";

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
}

// postcodes.io knows one postcode. Its MP is in airtable-mps.json.
const POSTCODES: Record<string, string> = { SW1A1AA: "Cities of London and Westminster" };

export function fixtureResponse(url: string, init?: RequestInit): Response | undefined {
  const { hostname, pathname, searchParams } = new URL(url);
  if (hostname === "api2.luma.com" && pathname === "/calendar/get-items") {
    return json(searchParams.get("period") === "past" ? lumaPast : lumaFuture);
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
      ? json({ status: 200, result: { postcode, parliamentary_constituency: constituency } })
      : new Response(JSON.stringify({ status: 404, error: "Postcode not found" }), { status: 404 });
  }
  if (hostname === "members-api.parliament.uk" && pathname === "/api/Members/Search") {
    return json(parliamentMembers);
  }
  const contact = hostname === "members-api.parliament.uk" && pathname.match(/^\/api\/Members\/(\d+)\/Contact$/);
  if (contact) {
    // Every fixture MP's office address, in the API's own pattern.
    return json({ value: [{ type: "Parliamentary office", typeId: 1, email: `mp${contact[1]}.office@parliament.uk ` }] });
  }
  // Google's side of staff login. The code names the account: fixture-staff
  // is staff@pauseai.uk, fixture-outsider a Gmail account. Its ID tokens were
  // signed once, for the client ID "fixture-client-id", and expire in 2100;
  // the key that signed them wasn't kept.
  if (hostname === "oauth2.googleapis.com" && pathname === "/token") {
    const code = new URLSearchParams(String(init?.body ?? "")).get("code") ?? "";
    const idToken = (googleLogin.tokens as Record<string, string>)[code];
    return idToken ? json({ id_token: idToken, token_type: "Bearer" }) : new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 });
  }
  if (hostname === "www.googleapis.com" && pathname === "/oauth2/v3/certs") {
    return json(googleLogin.keys);
  }
  // Postmark accepts every email. What was sent is checked from the request
  // (Vitest) or the outbox (Playwright, tests/fixtures/outbox.ts).
  if (hostname === "api.postmarkapp.com" && pathname === "/email") {
    return json({ To: "", SubmittedAt: new Date().toISOString(), MessageID: crypto.randomUUID(), ErrorCode: 0, Message: "OK" });
  }
  if (hostname === "challenges.cloudflare.com" && pathname === "/turnstile/v0/siteverify") {
    return json({ success: true, hostname: "localhost" });
  }
  return undefined;
}
