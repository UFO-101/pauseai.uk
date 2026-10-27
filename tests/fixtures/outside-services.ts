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
import lumaContacts from "./luma-contacts.json";
import airtablePoliticians from "./airtable-politicians.json";
import airtableEmails from "./airtable-emails.json";
import airtableWebForm from "./airtable-web-form.json";
import airtableGoToParliament from "./airtable-go-to-parliament.json";
import airtableMembers from "./airtable-members.json";
import parliamentMembers from "./parliament-members.json";
import controlaiLetter from "./controlai-letter.json";
import stripeCheckoutSessions from "./stripe-checkout-sessions.json";
import stripePaymentIntents from "./stripe-payment-intents.json";

/** A UUID-shaped id that depends only on `text`. */
function fixtureUuid(text: string): string {
  const hex = createHash("sha256").update(text).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
}

// postcodes.io knows one postcode. Its MP is in airtable-politicians.json.
const POSTCODES: Record<string, string> = { SW1A1AA: "Cities of London and Westminster" };
// And one outcode, the first half of a postcode, in Manchester.
const OUTCODES: Record<string, { latitude: number; longitude: number; admin_district: string[] }> = {
  M1: { latitude: 53.4794, longitude: -2.2353, admin_district: ["Manchester"] },
};

// Where postcodes.io places the fixture's postcodes and towns: a council area or town, its point, its nation.
const PLACES: Record<string, { admin_district: string; latitude: number; longitude: number; country: string }> = {
  BS11AA: { admin_district: "Bristol, City of", latitude: 51.4545, longitude: -2.5879, country: "England" },
  E16AN: { admin_district: "Tower Hamlets", latitude: 51.5205, longitude: -0.0726, country: "England" },
  E151AA: { admin_district: "Newham", latitude: 51.5413, longitude: -0.0039, country: "England" },
  EC1A1BB: { admin_district: "City of London", latitude: 51.5202, longitude: -0.0978, country: "England" },
  G11AA: { admin_district: "Glasgow City", latitude: 55.8609, longitude: -4.249, country: "Scotland" },
  HU11AA: { admin_district: "Kingston upon Hull, City of", latitude: 53.7443, longitude: -0.3326, country: "England" },
  LE11AA: { admin_district: "Leicester", latitude: 52.6345, longitude: -1.13, country: "England" },
  LS11AA: { admin_district: "Leeds", latitude: 53.797, longitude: -1.5492, country: "England" },
  LS27EY: { admin_district: "Leeds", latitude: 53.8079, longitude: -1.5566, country: "England" },
  M11AE: { admin_district: "Manchester", latitude: 53.4794, longitude: -2.2353, country: "England" },
  M41HQ: { admin_district: "Manchester", latitude: 53.484, longitude: -2.237, country: "England" },
  M202RN: { admin_district: "Manchester", latitude: 53.4317, longitude: -2.2303, country: "England" },
  NR11AA: { admin_district: "Norwich", latitude: 52.6286, longitude: 1.2925, country: "England" },
  OX11AA: { admin_district: "Oxford", latitude: 51.752, longitude: -1.2577, country: "England" },
  SE17PB: { admin_district: "Lambeth", latitude: 51.5007, longitude: -0.1167, country: "England" },
  SK41AA: { admin_district: "Stockport", latitude: 53.4106, longitude: -2.1575, country: "England" },
  YO17HH: { admin_district: "York", latitude: 53.9617, longitude: -1.0817, country: "England" },
  SW1A1AA: { admin_district: "Westminster", latitude: 51.501009, longitude: -0.141588, country: "England" },
};
const TOWNS: Record<
  string,
  { name_1: string; local_type: string; latitude: number; longitude: number; country: string }
> = {
  manchester: { name_1: "Manchester", local_type: "City", latitude: 53.4794, longitude: -2.2453, country: "England" },
  london: { name_1: "London", local_type: "City", latitude: 51.5072, longitude: -0.1276, country: "England" },
  bristol: { name_1: "Bristol", local_type: "City", latitude: 51.4545, longitude: -2.5879, country: "England" },
  cardiff: { name_1: "Cardiff", local_type: "City", latitude: 51.4816, longitude: -3.1791, country: "Wales" },
  oxford: { name_1: "Oxford", local_type: "City", latitude: 51.752, longitude: -1.2577, country: "England" },
  leeds: { name_1: "Leeds", local_type: "City", latitude: 53.7997, longitude: -1.5492, country: "England" },
  glasgow: { name_1: "Glasgow", local_type: "City", latitude: 55.8642, longitude: -4.2518, country: "Scotland" },
  leicester: { name_1: "Leicester", local_type: "City", latitude: 52.6369, longitude: -1.1398, country: "England" },
};

/** An event on the calendar that isn't public, which the import leaves out. */
const LUMA_PRIVATE_EVENT = {
  id: "evt-fixture-private-planning",
  url: "https://luma.com/fixture-private-planning",
  name: "Organisers' planning call",
  start_at: "2030-03-20T19:00:00.000Z",
  visibility: "private",
  access: "manage",
  platform: "luma",
  geo_address_json: null,
  coordinate: null,
};

/** A list as Luma pages it: the first `size` entries, then, from cursor "page-2", the rest. */
function pageOf<T>(entries: T[], cursor: string | null, size: number) {
  if (cursor === "page-2") return { entries: entries.slice(size), has_more: false };
  return { entries: entries.slice(0, size), has_more: entries.length > size, next_cursor: "page-2" };
}

export function fixtureResponse(url: string, init?: RequestInit): Response | undefined {
  const { hostname, pathname, searchParams } = new URL(url);
  if (hostname === "public-api.luma.com" && pathname === "/v1/calendars/events/list") {
    // lib/server/outside-services/luma-calendar.ts asks for past events with
    // "before", upcoming with "after"; the import asks for every event, and
    // gets both, and a private one it must leave out.
    if (searchParams.has("before")) return json(lumaPast);
    if (searchParams.has("after")) return json(lumaFuture);
    return json({ entries: [...lumaFuture.entries, ...lumaPast.entries, LUMA_PRIVATE_EVENT], has_more: false });
  }
  if (hostname === "public-api.luma.com" && pathname === "/v1/events/guests/list") {
    // The same guests for every event, each guest row's ID made unique to
    // the event, over two pages: the first three, then the rest.
    const eventId = searchParams.get("event_id") ?? "";
    const guests = lumaGuests.entries.map((guest) => ({ ...guest, id: `${guest.id}-${eventId}`, api_id: undefined }));
    return json(pageOf(guests, searchParams.get("pagination_cursor"), 3));
  }
  if (hostname === "public-api.luma.com" && pathname === "/v1/calendars/contacts/list") {
    return json(pageOf(lumaContacts.entries, searchParams.get("pagination_cursor"), 2));
  }
  if (hostname.endsWith("airtable.com") && pathname.endsWith("/tblL1icZBhTV1gQ9o")) {
    // The global members' table: the members staff-data.sql holds, as of
    // FIXTURE_NOW, and one erased there.
    return json(airtableMembers);
  }
  // The UK Parliamentarians base's tables: a politician of each body, one
  // retired and one who left; PauseAI's 2026 emails to them, of each
  // mailing, one with no politician and one with no mailing we know; the
  // web form's letters, with the senders and states the import skips; and
  // Go to Parliament's meetings, one MP with two guests.
  const airtable: Record<string, unknown> = {
    tblH3ks9wqQHLpYx3: airtablePoliticians,
    tblp4nH5Jymq48rcm: airtableEmails,
    tblkzjrRHiZiqMDGR: airtableWebForm,
    tblminXS1xSuBbEjz: airtableGoToParliament,
  };
  const table = hostname.endsWith("airtable.com") && airtable[pathname.split("/").at(-1)!];
  if (table) return json(table);
  if (hostname === "api.postcodes.io" && pathname === "/postcodes" && init?.method === "POST") {
    // A bulk lookup: each postcode with its place, or null.
    const { postcodes } = JSON.parse(String(init.body)) as { postcodes: string[] };
    return json({
      status: 200,
      result: postcodes.map((query) => {
        const place = PLACES[query.replace(/\s+/g, "").toUpperCase()];
        return { query, result: place ? { postcode: query, ...place } : null };
      }),
    });
  }
  if (hostname === "api.postcodes.io" && pathname === "/places") {
    const town = TOWNS[String(searchParams.get("q")).trim().toLowerCase()];
    return json({ status: 200, result: town ? [town] : [] });
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
            admin_district: "Westminster",
          },
        })
      : new Response(JSON.stringify({ status: 404, error: "Postcode not found" }), { status: 404 });
  }
  if (hostname === "api.postcodes.io" && pathname.startsWith("/outcodes/")) {
    const outcode = decodeURIComponent(pathname.slice("/outcodes/".length)).trim().toUpperCase();
    const result = OUTCODES[outcode];
    return result
      ? json({ status: 200, result: { outcode, ...result } })
      : new Response(JSON.stringify({ status: 404, error: "Outcode not found" }), { status: 404 });
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
  if (hostname === "api.stripe.com" && pathname === "/v1/checkout/sessions") {
    // Completed checkouts: donors who said yes, one who said no, one who gave
    // twice, and one from before the wall of thanks question was asked.
    return json(stripeCheckoutSessions);
  }
  if (hostname === "api.stripe.com" && pathname === "/v1/payment_intents") {
    // Payments: monthly ones for donors who said yes and one who said no, a
    // failed one, and a ticket, which isn't a gift.
    return json(stripePaymentIntents);
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
  const unsuppress =
    hostname === "api.postmarkapp.com" && pathname.match(/^\/message-streams\/[\w-]+\/suppressions\/delete$/);
  if (unsuppress) {
    const { Suppressions } = JSON.parse(String(init!.body)) as { Suppressions: { EmailAddress: string }[] };
    return json({
      Suppressions: Suppressions.map(({ EmailAddress }) => ({ EmailAddress, Status: "Deleted", Message: null })),
    });
  }
  if (hostname === "challenges.cloudflare.com" && pathname === "/turnstile/v0/siteverify") {
    return json({ success: true, hostname: "localhost" });
  }
  return undefined;
}
