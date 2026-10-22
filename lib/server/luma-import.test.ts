import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { query, transaction } from "@/lib/server/db";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { server } from "@/tests/fixtures/msw";
import { importLuma } from "./luma-import";

const API = "https://public-api.luma.com/v1";

/** An ISO time `n` days from now. */
const days = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

type Guest = Record<string, unknown>;

/** A small Luma: its lists, how it pages them, and what it refuses. Every request is noted. */
type FakeLuma = {
  events: Record<string, unknown>[];
  guests: Record<string, Guest[]>;
  contacts: Record<string, unknown>[];
  pageSize: number;
  remaining?: number;
  /** Events whose guest list answers 500. */
  failGuests: string[];
  /** Events whose guest list answers 429. */
  rateLimitGuests: string[];
  failEvents: boolean;
  /** A contacts cursor that answers 500. */
  failContactsCursor?: string;
  /** "events", "guests:evt-1" or "contacts", with the cursor if any. */
  requests: string[];
};

function page(fake: FakeLuma, list: unknown[], cursor: string | null) {
  const from = Number(cursor ?? 0);
  const entries = list.slice(from, from + fake.pageSize);
  const more = from + fake.pageSize < list.length;
  const headers: Record<string, string> =
    fake.remaining === undefined ? {} : { "x-ratelimit-remaining": String(fake.remaining) };
  return HttpResponse.json(
    { entries, has_more: more, next_cursor: more ? String(from + fake.pageSize) : undefined },
    { headers },
  );
}

function fakeLuma(fake: Partial<FakeLuma> = {}): FakeLuma {
  const luma: FakeLuma = {
    events: [],
    guests: {},
    contacts: [],
    pageSize: 50,
    failGuests: [],
    rateLimitGuests: [],
    failEvents: false,
    requests: [],
    ...fake,
  };
  const note = (what: string, cursor: string | null) => luma.requests.push(cursor ? `${what}@${cursor}` : what);
  server.use(
    http.get(`${API}/calendars/events/list`, ({ request }) => {
      const cursor = new URL(request.url).searchParams.get("pagination_cursor");
      note("events", cursor);
      if (luma.failEvents) return new HttpResponse(null, { status: 500 });
      return page(luma, luma.events, cursor);
    }),
    http.get(`${API}/events/guests/list`, ({ request }) => {
      const params = new URL(request.url).searchParams;
      const id = params.get("event_id")!;
      const cursor = params.get("pagination_cursor");
      note(`guests:${id}`, cursor);
      if (luma.failGuests.includes(id)) return new HttpResponse(null, { status: 500 });
      if (luma.rateLimitGuests.includes(id)) return new HttpResponse(null, { status: 429 });
      return page(luma, luma.guests[id] ?? [], cursor);
    }),
    http.get(`${API}/calendars/contacts/list`, ({ request }) => {
      const cursor = new URL(request.url).searchParams.get("pagination_cursor");
      note("contacts", cursor);
      if (cursor && cursor === luma.failContactsCursor) return new HttpResponse(null, { status: 500 });
      return page(luma, luma.contacts, cursor);
    }),
  );
  return luma;
}

const event = (id: string, startAt: string, more: Record<string, unknown> = {}) => ({
  id,
  url: `https://luma.com/${id}`,
  name: `Event ${id}`,
  start_at: startAt,
  visibility: "public",
  access: "manage",
  geo_address_json: { city: "London", address: "Somewhere" },
  coordinate: { latitude: 51.5, longitude: -0.1 },
  ...more,
});

const guest = (n: number, more: Guest = {}): Guest => ({
  id: `gst-${n}`,
  user_id: `usr-${n}`,
  user_email: `Person${n}@Example.com`,
  user_name: `Person ${n}`,
  approval_status: "approved",
  registered_at: "2026-10-01T10:00:00.000Z",
  phone_number: null,
  utm_source: null,
  registration_answers: [],
  ...more,
});

const contact = (n: number, createdAt = "2026-09-01T00:00:00.000Z") => ({
  user_id: `usr-${n}`,
  email: `person${n}@example.com`,
  name: `Person ${n}`,
  created_at: createdAt,
});

const runs = () =>
  query<{ status: string; error: string | null; result: Record<string, unknown> }>(
    "SELECT status, error, result FROM import_runs ORDER BY id",
  );
const guestRows = () =>
  query<{ id: string; event_id: string; user_id: string; removed_at: Date | null; postcode: string | null }>(
    "SELECT id, event_id, user_id, removed_at, postcode FROM luma_guests ORDER BY id",
  );
const eventRows = () =>
  query<{ id: string; guests_synced_at: Date | null; guests_error: string | null }>(
    "SELECT id, guests_synced_at, guests_error FROM luma_events ORDER BY id",
  );
const setSynced = (id: string, interval: string | null) =>
  query(
    `UPDATE luma_events SET guests_synced_at = CASE WHEN $2::text IS NULL THEN NULL ELSE now() - $2::interval END WHERE id = $1`,
    [id, interval],
  );

beforeEach(() => vi.stubEnv("LUMA_API_KEY", "k"));
afterEach(() => vi.unstubAllEnvs());

describeWithDatabase("importLuma", () => {
  useTestDatabase();

  it("copies the events, their registered guests and the contacts, once", async () => {
    const jane = guest(1, {
      phone_number: "+447700900001",
      registration_answers: [{ label: "Your postcode", answer: "M1 1AE" }],
      utm_source: "flyer",
    });
    const luma = fakeLuma({
      events: [
        event("evt-live", days(1)),
        event("evt-old", days(-60), { geo_address_json: null, coordinate: null }),
        { id: "evt-private", url: "p", name: "P", start_at: days(2), visibility: "private" },
      ],
      guests: {
        "evt-live": [
          jane,
          { api_id: "gst-2", guest: guest(2, { approval_status: "waitlist" }) },
          guest(3, { approval_status: "invited", registered_at: null }),
          guest(4, { approval_status: "session" }),
          // Luma never lists a guest twice; if it did, the row would be written once.
          jane,
        ],
        "evt-old": [guest(1, { id: "gst-6" }), guest(5, { approval_status: "declined" })],
      },
      contacts: [contact(1), contact(6)],
    });

    const result = await importLuma("jo@pauseai.uk");
    expect(result).toEqual({
      events: 2,
      eventsSynced: 2,
      eventsLeft: 0,
      guestsChanged: 4,
      people: 3,
      contacts: 2,
      supportersAdded: 4,
      linked: 4,
      requests: 4,
    });
    expect(await query("SELECT count(*)::int AS n FROM supporter_links")).toEqual([{ n: 4 }]);
    expect(luma.requests).toEqual(["events", "guests:evt-live", "guests:evt-old", "contacts"]);
    expect(await query("SELECT id, name, city, latitude FROM luma_events ORDER BY id")).toEqual([
      { id: "evt-live", name: "Event evt-live", city: "London", latitude: 51.5 },
      { id: "evt-old", name: "Event evt-old", city: null, latitude: null },
    ]);
    expect(await query("SELECT user_id, email, name, contact_since FROM luma_people ORDER BY user_id")).toEqual([
      {
        user_id: "usr-1",
        email: "person1@example.com",
        name: "Person 1",
        contact_since: new Date(contact(1).created_at),
      },
      { user_id: "usr-2", email: "person2@example.com", name: "Person 2", contact_since: null },
      { user_id: "usr-5", email: "person5@example.com", name: "Person 5", contact_since: null },
      {
        user_id: "usr-6",
        email: "person6@example.com",
        name: "Person 6",
        contact_since: new Date(contact(1).created_at),
      },
    ]);
    expect(await query("SELECT id, approval_status, phone, postcode, utm_source FROM luma_guests ORDER BY id")).toEqual(
      [
        { id: "gst-1", approval_status: "approved", phone: "+447700900001", postcode: "M1 1AE", utm_source: "flyer" },
        { id: "gst-2", approval_status: "waitlist", phone: null, postcode: null, utm_source: null },
        { id: "gst-5", approval_status: "declined", phone: null, postcode: null, utm_source: null },
        { id: "gst-6", approval_status: "approved", phone: null, postcode: null, utm_source: null },
      ],
    );
    expect((await eventRows()).map((e) => e.guests_synced_at !== null)).toEqual([true, true]);
    expect((await runs())[0]).toMatchObject({ status: "ok", result: { events: 2 } });

    // An hour later: the live event's guests aren't due again, nor the old one's, and nothing's new.
    const again = await importLuma("jo@pauseai.uk");
    expect(again).toEqual({
      events: 0,
      eventsSynced: 0,
      eventsLeft: 0,
      guestsChanged: 0,
      people: 0,
      contacts: 0,
      supportersAdded: 0,
      linked: 0,
      requests: 2,
    });
    expect((await runs())[1].status).toBe("unchanged");

    // An event edited in Luma: changed here, and its guests not read again for it.
    luma.events[0] = event("evt-live", days(1), { name: "Renamed" });
    expect(await importLuma("jo@pauseai.uk")).toMatchObject({ events: 1, eventsSynced: 0, requests: 2 });
  });

  it("stops at the first events page with nothing new, and once a day reads every page and marks events gone from the calendar removed", async () => {
    const luma = fakeLuma({
      events: [event("evt-3", days(3)), event("evt-2", days(2)), event("evt-1", days(1))],
      guests: { "evt-1": [guest(1)] },
      pageSize: 1,
    });
    await importLuma("jo@pauseai.uk");
    expect(luma.requests.filter((r) => r.startsWith("events"))).toEqual(["events", "events@1", "events@2"]);
    expect(await guestRows()).toHaveLength(1);

    // Not due a full pass, so the first unchanged page ends it.
    luma.requests.length = 0;
    luma.events[0] = event("evt-3", days(3), { name: "Renamed" });
    expect((await importLuma("jo@pauseai.uk")).events).toBe(1);
    expect(luma.requests.filter((r) => r.startsWith("events"))).toEqual(["events", "events@1"]);

    // Due one: every page, and the event no longer listed is marked removed, keeping its guests.
    const fullPassDue = () =>
      query("UPDATE luma_import_state SET full_pass_at = now() - interval '1 day' WHERE list = 'events'");
    const removed = () => query<{ id: string }>("SELECT id FROM luma_events WHERE removed_at IS NOT NULL");
    await fullPassDue();
    const gone = luma.events.pop()!;
    luma.requests.length = 0;
    expect((await importLuma("jo@pauseai.uk")).events).toBe(1);
    expect(luma.requests.filter((r) => r.startsWith("events"))).toEqual(["events", "events@1"]);
    expect(await removed()).toEqual([{ id: "evt-1" }]);
    expect(await guestRows()).toHaveLength(1);

    // Its guests aren't read while it's removed, however long since they were.
    await setSynced("evt-1", "100 days");
    luma.requests.length = 0;
    await importLuma("jo@pauseai.uk");
    expect(luma.requests).not.toContain("guests:evt-1");

    // A second full pass leaves it as it was; listed again, it's back.
    await fullPassDue();
    expect((await importLuma("jo@pauseai.uk")).events).toBe(0);
    luma.events.push(gone);
    await fullPassDue();
    expect((await importLuma("jo@pauseai.uk")).events).toBe(1);
    expect(await removed()).toEqual([]);
  });

  it("reads guests again when due, live events first, then never read, then settled, with failed ones last", async () => {
    const luma = fakeLuma({
      events: [
        event("evt-live", days(1)),
        event("evt-new", days(-10)),
        event("evt-settled-early", days(-10)),
        event("evt-settled-stale", days(-100)),
        event("evt-settled-fresh", days(-100)),
        event("evt-failed", days(2)),
        event("evt-view", days(1), { access: "view" }),
      ],
      failGuests: ["evt-failed"],
    });
    await importLuma("jo@pauseai.uk");
    expect((await eventRows()).find((e) => e.id === "evt-failed")).toMatchObject({
      guests_synced_at: null,
      guests_error: "Error: Luma answered 500 for /v1/events/guests/list",
    });
    await setSynced("evt-live", "2 hours");
    await setSynced("evt-new", null);
    // Read a day after it started, so still settling.
    await query("UPDATE luma_events SET guests_synced_at = start_at + interval '1 day' WHERE id = 'evt-settled-early'");
    await setSynced("evt-settled-stale", "31 days");
    await setSynced("evt-settled-fresh", "10 days");
    luma.requests.length = 0;
    luma.failGuests = [];
    const result = await importLuma("jo@pauseai.uk");
    expect(luma.requests).toEqual([
      "events",
      "guests:evt-live",
      "guests:evt-new",
      "guests:evt-settled-early",
      "guests:evt-settled-stale",
      "guests:evt-failed",
      "contacts",
    ]);
    expect(result).toMatchObject({ eventsSynced: 5, eventsLeft: 0 });
    expect((await eventRows()).find((e) => e.id === "evt-failed")).toMatchObject({ guests_error: null });
  });

  it("marks a guest gone from the list as removed, and back again when seen, and changes a person's details", async () => {
    const luma = fakeLuma({ events: [event("evt-1", days(1))], guests: { "evt-1": [guest(1), guest(2)] } });
    await importLuma("jo@pauseai.uk");
    luma.guests["evt-1"] = [guest(1, { user_name: "Person One" })];
    await setSynced("evt-1", "2 hours");
    expect(await importLuma("jo@pauseai.uk")).toMatchObject({ guestsChanged: 1, people: 1 });
    expect((await guestRows()).map((g) => [g.id, g.removed_at !== null])).toEqual([
      ["gst-1", false],
      ["gst-2", true],
    ]);
    luma.guests["evt-1"] = [guest(1, { user_name: "Person One" }), guest(2)];
    await setSynced("evt-1", "2 hours");
    expect(await importLuma("jo@pauseai.uk")).toMatchObject({ guestsChanged: 1, people: 0 });
    expect((await guestRows()).map((g) => g.removed_at)).toEqual([null, null]);
  });

  it("never brings back an erased user, as a guest or a contact", async () => {
    await query("INSERT INTO luma_erased (user_id) VALUES ('usr-1')");
    fakeLuma({ events: [event("evt-1", days(1))], guests: { "evt-1": [guest(1), guest(2)] }, contacts: [contact(1)] });
    expect(await importLuma("jo@pauseai.uk")).toMatchObject({ guestsChanged: 1, people: 1, contacts: 0 });
    expect((await query("SELECT user_id FROM luma_people")).map((p) => p.user_id)).toEqual(["usr-2"]);
  });

  it("stops choosing work when Luma's rate limit is near, or reached, or its time is up, and says so", async () => {
    const luma = fakeLuma({ events: [event("evt-1", days(1)), event("evt-2", days(2))], remaining: 10 });
    expect(await importLuma("jo@pauseai.uk")).toMatchObject({
      events: 2,
      eventsSynced: 0,
      eventsLeft: 2,
      requests: 1,
      stoppedBy: "rate-limit",
    });
    expect((await runs()).at(-1)).toMatchObject({ status: "ok", result: { stoppedBy: "rate-limit" } });

    luma.remaining = undefined;
    luma.rateLimitGuests = ["evt-2"];
    expect(await importLuma("jo@pauseai.uk")).toMatchObject({
      eventsSynced: 0,
      eventsLeft: 2,
      requests: 2,
      stoppedBy: "rate-limit",
    });

    luma.rateLimitGuests = [];
    expect(await importLuma("jo@pauseai.uk", 0)).toEqual({
      events: 0,
      eventsSynced: 0,
      eventsLeft: 2,
      guestsChanged: 0,
      people: 0,
      contacts: 0,
      supportersAdded: 0,
      linked: 0,
      requests: 0,
      stoppedBy: "time",
    });
    expect((await runs()).at(-1)).toMatchObject({ status: "unchanged" });
  });

  it("records a run started while another holds the lock, and stops", async () => {
    fakeLuma({ events: [event("evt-1", days(1))] });
    const result = await transaction(async (db) => {
      await query("SELECT pg_advisory_xact_lock(hashtext('import-luma'))", [], db);
      return importLuma("jo@pauseai.uk");
    });
    expect(result).toMatchObject({ events: 0, requests: 0, stoppedBy: "running" });
    expect(await runs()).toMatchObject([{ status: "unchanged", result: { stoppedBy: "running" } }]);
  });

  it("fails the run, keeping nothing, when Luma won't list the events", async () => {
    fakeLuma({ events: [event("evt-1", days(1))], failEvents: true });
    await expect(importLuma("jo@pauseai.uk")).rejects.toThrow("Luma answered 500");
    expect(await eventRows()).toEqual([]);
    expect(await runs()).toMatchObject([
      { status: "failed", error: "Luma answered 500 for /v1/calendars/events/list" },
    ]);
  });

  it("reads contacts until a page holds nothing new, and once a week every page, ten a run", async () => {
    const contacts = Array.from({ length: 12 }, (_, i) => contact(i + 1));
    const luma = fakeLuma({ contacts, pageSize: 1 });
    const contactRequests = () => luma.requests.filter((r) => r.startsWith("contacts"));

    // The first run starts the first full pass: ten pages, and the cursor kept.
    expect((await importLuma("jo@pauseai.uk")).contacts).toBe(10);
    expect(contactRequests()).toHaveLength(10);
    expect(await query("SELECT cursor, full_pass_at FROM luma_import_state WHERE list = 'contacts'")).toEqual([
      { cursor: "10", full_pass_at: null },
    ]);

    // The next finishes it.
    luma.requests.length = 0;
    expect((await importLuma("jo@pauseai.uk")).contacts).toBe(2);
    expect(contactRequests()).toEqual(["contacts@10", "contacts@11"]);
    const [state] = await query<{ cursor: string; full_pass_at: Date | null }>(
      "SELECT cursor, full_pass_at FROM luma_import_state WHERE list = 'contacts'",
    );
    expect(state.cursor).toBe("");
    expect(state.full_pass_at).not.toBeNull();

    // Between passes, the first page with nothing new ends it; a new contact at the top is read.
    luma.requests.length = 0;
    expect((await importLuma("jo@pauseai.uk")).contacts).toBe(0);
    expect(contactRequests()).toEqual(["contacts"]);
    luma.contacts.unshift(contact(13));
    luma.requests.length = 0;
    expect((await importLuma("jo@pauseai.uk")).contacts).toBe(1);
    expect(contactRequests()).toEqual(["contacts", "contacts@1"]);
  });

  it("doesn't count a full pass of the contacts as done when the run ran out before reading any", async () => {
    // Luma's rate limit is near after the events' page, so the contacts aren't read.
    const luma = fakeLuma({ contacts: [contact(1), contact(2)], pageSize: 1, remaining: 10 });
    expect((await importLuma("jo@pauseai.uk")).stoppedBy).toBe("rate-limit");
    expect(await query("SELECT cursor, full_pass_at FROM luma_import_state WHERE list = 'contacts'")).toEqual([
      { cursor: "", full_pass_at: null },
    ]);
    // The next run, with room, reads the whole pass.
    luma.remaining = undefined;
    luma.requests.length = 0;
    expect((await importLuma("jo@pauseai.uk")).contacts).toBe(2);
    expect(luma.requests.filter((r) => r.startsWith("contacts"))).toEqual(["contacts", "contacts@1"]);
  });

  it("drops a contacts cursor Luma no longer honours, failing that run, and starts the pass again on the next", async () => {
    const luma = fakeLuma({ contacts: [contact(1), contact(2)], pageSize: 1, failContactsCursor: "stale" });
    await query("INSERT INTO luma_import_state (list, cursor) VALUES ('contacts', 'stale')");
    await expect(importLuma("jo@pauseai.uk")).rejects.toThrow("Luma answered 500");
    expect(await query("SELECT cursor FROM luma_import_state WHERE list = 'contacts'")).toEqual([{ cursor: "" }]);
    luma.requests.length = 0;
    expect((await importLuma("jo@pauseai.uk")).contacts).toBe(2);
    expect(luma.requests).toEqual(["events", "contacts", "contacts@1"]);

    // Between passes, a failure is just a failure.
    await query("UPDATE luma_import_state SET full_pass_at = now() WHERE list = 'contacts'");
    luma.failContactsCursor = undefined;
    luma.contacts.unshift(contact(3));
    luma.failContactsCursor = "1";
    await expect(importLuma("jo@pauseai.uk")).rejects.toThrow("Luma answered 500");
    expect(await query("SELECT cursor FROM luma_import_state WHERE list = 'contacts'")).toEqual([{ cursor: "" }]);
  });
});
