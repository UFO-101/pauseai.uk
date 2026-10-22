import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { getEvents, listCalendarContacts, listCalendarEvents } from "./luma-calendar";

const CALENDAR = "https://public-api.luma.com/v1/calendars/events/list";

/** Answers the calendar request with these events, as Luma's API lists them. */
function calendar(...entries: unknown[]) {
  server.use(http.get(CALENDAR, () => HttpResponse.json({ entries, has_more: false })));
}

describe("getEvents", () => {
  beforeEach(() => {
    vi.stubEnv("LUMA_API_KEY", "k");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("asks for upcoming events from the start of today, soonest first, with the key", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-21T15:30:00Z"), toFake: ["Date"] });
    let request: Request | undefined;
    server.use(
      http.get(CALENDAR, ({ request: r }) => {
        request = r;
        return undefined;
      }),
    );
    const events = await getEvents();
    const params = new URL(request!.url).searchParams;
    expect(params.get("after")).toBe("2026-11-21T00:00:00.000Z");
    expect(params.has("before")).toBe(false);
    expect(params.get("sort_direction")).toBe("asc");
    expect(params.getAll("access")).toEqual(["manage", "view"]);
    expect(request!.headers.get("x-luma-api-key")).toBe("k");
    expect(events[0].url).toBe("fixture-london-protest");
  });

  it("asks for past events before today, most recent first", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-21T15:30:00Z"), toFake: ["Date"] });
    let url: URL | undefined;
    server.use(
      http.get(CALENDAR, ({ request }) => {
        url = new URL(request.url);
        return undefined;
      }),
    );
    const events = await getEvents("past");
    expect(url?.searchParams.get("before")).toBe("2026-11-21T00:00:00.000Z");
    expect(url?.searchParams.get("sort_direction")).toBe("desc");
    expect(events[0].url).toBe("fixture-past-london-march");
  });

  it("returns nothing without an API key, without calling Luma", async () => {
    vi.stubEnv("LUMA_API_KEY", "");
    let called = false;
    server.use(
      http.get(CALENDAR, () => {
        called = true;
        return HttpResponse.json({});
      }),
    );
    expect(await getEvents()).toEqual([]);
    expect(called).toBe(false);
  });

  it("gives the site's shape: the slug as url, and the address as geo_address_info", async () => {
    calendar(
      {
        url: "https://luma.com/pauseai-nov26",
        name: "March",
        start_at: "2030-01-01T12:00:00Z",
        visibility: "public",
        geo_address_json: { address: "All Souls' Place", city: "London", region: null, country: "United Kingdom" },
      },
      {
        url: "already-a-slug",
        name: "Call",
        start_at: "2030-01-02T18:00:00Z",
        visibility: "public",
        geo_address_json: null,
      },
    );
    expect(await getEvents()).toEqual([
      {
        url: "pauseai-nov26",
        name: "March",
        start_at: "2030-01-01T12:00:00Z",
        geo_address_info: {
          address: "All Souls' Place",
          city: "London",
          region: undefined,
          country: "United Kingdom",
        },
      },
      { url: "already-a-slug", name: "Call", start_at: "2030-01-02T18:00:00Z" },
    ]);
  });

  it("gives an in-person event its place, when Luma has both coordinates", async () => {
    const event = { name: "E", start_at: "2030-01-01T00:00:00Z", visibility: "public" };
    calendar(
      { ...event, url: "placed", coordinate: { latitude: 51.5, longitude: -0.12 } },
      { ...event, url: "no-coordinate", coordinate: null },
      { ...event, url: "no-latitude", coordinate: { longitude: -0.12 } },
      { ...event, url: "no-longitude", coordinate: { latitude: 51.5 } },
    );
    expect((await getEvents()).map((e) => [e.url, e.place])).toEqual([
      ["placed", { latitude: 51.5, longitude: -0.12 }],
      ["no-coordinate", undefined],
      ["no-latitude", undefined],
      ["no-longitude", undefined],
    ]);
  });

  it("gives only the town and no place when the location is for guests only", async () => {
    calendar({
      url: "secret-venue",
      name: "Meeting",
      start_at: "2030-01-01T18:00:00Z",
      visibility: "public",
      location_visibility: "guests-only",
      geo_address_json: { address: "12 Private Road", city: "Bristol", region: "England", country: "United Kingdom" },
      coordinate: { latitude: 51.45, longitude: -2.59 },
    });
    expect(await getEvents()).toEqual([
      {
        url: "secret-venue",
        name: "Meeting",
        start_at: "2030-01-01T18:00:00Z",
        geo_address_info: { city: "Bristol", region: "England", country: "United Kingdom" },
      },
    ]);
  });

  it("copes with an event that has no name, and an address with no city or country", async () => {
    calendar({
      url: "untitled",
      start_at: "2030-01-01T12:00:00Z",
      visibility: "public",
      geo_address_json: { address: "Venue TBD", city: null, region: "Scotland", country: null },
    });
    expect(await getEvents()).toEqual([
      {
        url: "untitled",
        name: "",
        start_at: "2030-01-01T12:00:00Z",
        geo_address_info: { address: "Venue TBD", region: "Scotland" },
      },
    ]);
  });

  it("lists only public events", async () => {
    calendar(
      { url: "public", name: "A", start_at: "2030-01-01T00:00:00Z", visibility: "public" },
      { url: "members", name: "B", start_at: "2030-01-01T00:00:00Z", visibility: "members-only" },
      { url: "private", name: "C", start_at: "2030-01-01T00:00:00Z", visibility: "private" },
    );
    expect((await getEvents()).map((e) => e.url)).toEqual(["public"]);
  });

  it("drops entries without a url or start time", async () => {
    calendar(
      { url: "ok", name: "Fine", start_at: "2030-01-01T00:00:00Z", visibility: "public" },
      { name: "No url", start_at: "2030-01-01T00:00:00Z", visibility: "public" },
      { url: "no-start", name: "No start", visibility: "public" },
      {},
      null,
    );
    expect((await getEvents()).map((e) => e.url)).toEqual(["ok"]);
  });

  it("returns nothing when Luma sends no entries", async () => {
    server.use(http.get(CALENDAR, () => HttpResponse.json({})));
    expect(await getEvents()).toEqual([]);
  });

  it("returns nothing when Luma rejects the key", async () => {
    server.use(http.get(CALENDAR, () => new HttpResponse(null, { status: 401 })));
    expect(await getEvents()).toEqual([]);
  });

  it("returns nothing when the request fails", async () => {
    server.use(http.get(CALENDAR, () => HttpResponse.error()));
    expect(await getEvents()).toEqual([]);
  });
});

describe("listCalendarEvents", () => {
  beforeEach(() => vi.stubEnv("LUMA_API_KEY", "k"));
  afterEach(() => vi.unstubAllEnvs());

  it("asks for every event newest first, ours and others', and reads the fixture's public ones with their IDs", async () => {
    let request: Request | undefined;
    server.use(
      http.get(CALENDAR, ({ request: r }) => {
        request = r;
        return undefined;
      }),
    );
    const page = await listCalendarEvents();
    const params = new URL(request!.url).searchParams;
    expect(params.get("sort_direction")).toBe("desc");
    expect(params.has("before")).toBe(false);
    expect(params.has("after")).toBe(false);
    expect(params.get("pagination_limit")).toBe("50");
    expect(params.get("pagination_cursor")).toBeNull();
    expect(params.getAll("access")).toEqual(["manage", "view"]);
    expect(page.entries).toHaveLength(9);
    expect(page.entries[0]).toMatchObject({
      id: "evt-fixture-london-protest",
      url: "fixture-london-protest",
      access: "manage",
      place: { latitude: 51.5007, longitude: -0.1263 },
    });
    expect(page.nextCursor).toBeUndefined();
  });

  it("passes the cursor on, takes api_id and access view, and drops entries that aren't public events", async () => {
    let cursor: string | null = null;
    server.use(
      http.get(CALENDAR, ({ request }) => {
        cursor = new URL(request.url).searchParams.get("pagination_cursor");
        return HttpResponse.json({
          entries: [
            {
              api_id: "evt-old",
              url: "x",
              name: "X",
              start_at: "2026-01-01T00:00:00Z",
              visibility: "public",
              access: "view",
            },
            { url: "no-id", name: "Y", start_at: "2026-01-01T00:00:00Z", visibility: "public" },
            { id: "evt-private", url: "p", name: "P", start_at: "2026-01-01T00:00:00Z", visibility: "private" },
            null,
          ],
          has_more: true,
          next_cursor: "c3",
        });
      }),
    );
    const page = await listCalendarEvents("c2");
    expect(cursor).toBe("c2");
    expect(page.entries.map((e) => [e.id, e.access])).toEqual([["evt-old", "view"]]);
    expect(page.nextCursor).toBe("c3");
  });
});

describe("listCalendarContacts", () => {
  const CONTACTS = "https://public-api.luma.com/v1/calendars/contacts/list";
  beforeEach(() => vi.stubEnv("LUMA_API_KEY", "k"));
  afterEach(() => vi.unstubAllEnvs());

  it("asks for the contacts newest first, and reads the fixture's", async () => {
    let request: Request | undefined;
    server.use(
      http.get(CONTACTS, ({ request: r }) => {
        request = r;
        return undefined;
      }),
    );
    const page = await listCalendarContacts();
    const params = new URL(request!.url).searchParams;
    expect(params.get("sort_column")).toBe("created_at");
    expect(params.get("sort_direction")).toBe("desc");
    expect(params.get("pagination_cursor")).toBeNull();
    expect(page.entries).toEqual([
      {
        userId: "usr-fixture-3",
        email: "alex.fixture@example.com",
        name: "Alex Fixture",
        createdAt: "2026-10-01T09:00:00.000Z",
      },
      {
        userId: "usr-fixture-1",
        email: "jane.fixture@example.com",
        name: "Jane Fixture",
        createdAt: "2026-09-20T09:00:00.000Z",
      },
    ]);
    expect(page.nextCursor).toBe("page-2");
    expect((await listCalendarContacts("page-2")).entries).toHaveLength(1);
  });

  it("takes id for a contact without user_id and no name, and drops one without an email or a date", async () => {
    server.use(
      http.get(CONTACTS, () =>
        HttpResponse.json({
          entries: [
            { id: "usr-a", email: "a@example.com", name: null, created_at: "2026-01-01T00:00:00Z" },
            { user_id: "usr-b", created_at: "2026-01-01T00:00:00Z" },
            { user_id: "usr-c", email: "c@example.com" },
            null,
          ],
          has_more: false,
        }),
      ),
    );
    expect((await listCalendarContacts()).entries).toEqual([
      { userId: "usr-a", email: "a@example.com", name: "", createdAt: "2026-01-01T00:00:00Z" },
    ]);
  });
});
