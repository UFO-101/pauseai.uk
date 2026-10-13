import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { getEvents } from "./luma-calendar";

const CALENDAR = "https://api2.luma.com/calendar/get-items";

describe("getEvents", () => {
  it("asks for upcoming events by default, and returns the fixture calendar", async () => {
    let url: URL | undefined;
    server.use(
      http.get(CALENDAR, ({ request }) => {
        url = new URL(request.url);
        return undefined;
      }),
    );
    const events = await getEvents();
    expect(url?.searchParams.get("period")).toBe("future");
    expect(url?.searchParams.get("calendar_api_id")).toBe("cal-Z327EhtiFdHuVie");
    expect(events[0].event.url).toBe("fixture-london-protest");
  });

  it("asks for past events", async () => {
    const events = await getEvents("past");
    expect(events[0].event.url).toBe("fixture-past-london-march");
  });

  it("drops entries without a url or start time", async () => {
    server.use(
      http.get(CALENDAR, () =>
        HttpResponse.json({
          entries: [
            { event: { url: "ok", name: "Fine", start_at: "2030-01-01T00:00:00Z" } },
            { event: { name: "No url", start_at: "2030-01-01T00:00:00Z" } },
            { event: { url: "no-start", name: "No start" } },
            {},
            null,
          ],
        }),
      ),
    );
    expect((await getEvents()).map((e) => e.event.url)).toEqual(["ok"]);
  });

  it("returns nothing when Luma sends no entries", async () => {
    server.use(http.get(CALENDAR, () => HttpResponse.json({})));
    expect(await getEvents()).toEqual([]);
  });

  it("returns nothing when Luma errors", async () => {
    server.use(http.get(CALENDAR, () => new HttpResponse(null, { status: 500 })));
    expect(await getEvents()).toEqual([]);
  });

  it("returns nothing when the request fails", async () => {
    server.use(http.get(CALENDAR, () => HttpResponse.error()));
    expect(await getEvents()).toEqual([]);
  });
});
