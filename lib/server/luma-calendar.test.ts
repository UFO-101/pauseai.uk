import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { getEvents } from "./luma-calendar";

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
    expect(events[0].event.url).toBe("fixture-london-protest");
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
    expect(events[0].event.url).toBe("fixture-past-london-march");
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
      { url: "already-a-slug", name: "Call", start_at: "2030-01-02T18:00:00Z", visibility: "public", geo_address_json: null },
    );
    expect(await getEvents()).toEqual([
      {
        event: {
          url: "pauseai-nov26",
          name: "March",
          start_at: "2030-01-01T12:00:00Z",
          geo_address_info: { address: "All Souls' Place", city: "London", region: undefined, country: "United Kingdom" },
        },
      },
      { event: { url: "already-a-slug", name: "Call", start_at: "2030-01-02T18:00:00Z" } },
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
      { event: { url: "untitled", name: "", start_at: "2030-01-01T12:00:00Z", geo_address_info: { address: "Venue TBD", region: "Scotland" } } },
    ]);
  });

  it("lists only public events", async () => {
    calendar(
      { url: "public", name: "A", start_at: "2030-01-01T00:00:00Z", visibility: "public" },
      { url: "members", name: "B", start_at: "2030-01-01T00:00:00Z", visibility: "members-only" },
      { url: "private", name: "C", start_at: "2030-01-01T00:00:00Z", visibility: "private" },
    );
    expect((await getEvents()).map((e) => e.event.url)).toEqual(["public"]);
  });

  it("drops entries without a url or start time", async () => {
    calendar(
      { url: "ok", name: "Fine", start_at: "2030-01-01T00:00:00Z", visibility: "public" },
      { name: "No url", start_at: "2030-01-01T00:00:00Z", visibility: "public" },
      { url: "no-start", name: "No start", visibility: "public" },
      {},
      null,
    );
    expect((await getEvents()).map((e) => e.event.url)).toEqual(["ok"]);
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
