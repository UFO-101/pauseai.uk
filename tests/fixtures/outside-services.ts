// Canned responses for the three outside services the site calls (Luma's
// calendar, Luma's guest list, Airtable). One table, used by both:
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
import airtableSignatories from "./airtable-signatories.json";

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
}

export function fixtureResponse(url: string): Response | undefined {
  const { hostname, pathname, searchParams } = new URL(url);
  if (hostname === "api2.luma.com" && pathname === "/calendar/get-items") {
    return json(searchParams.get("period") === "past" ? lumaPast : lumaFuture);
  }
  if (hostname === "public-api.luma.com" && pathname === "/v1/event/get-guests") {
    return json(lumaGuests);
  }
  if (hostname.endsWith("airtable.com") && pathname.startsWith("/v0/")) {
    return json(airtableSignatories);
  }
  return undefined;
}
