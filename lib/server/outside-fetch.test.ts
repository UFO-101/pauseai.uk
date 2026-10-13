import { afterEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { outsideFetch } from "./outside-fetch";

const CALENDAR = "https://api2.luma.com/calendar/get-items?period=future";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("outsideFetch", () => {
  it("makes a real request, passing init through", async () => {
    let auth: string | null = null;
    server.use(
      http.get("https://api2.luma.com/calendar/get-items", ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json({ live: true });
      }),
    );

    const res = await outsideFetch(CALENDAR, { headers: { authorization: "x" } });

    expect(await res.json()).toEqual({ live: true });
    expect(auth).toBe("x");
  });

  describe("with DATA_FIXTURES=1", () => {
    it("answers from the fixtures without touching the network", async () => {
      vi.stubEnv("DATA_FIXTURES", "1");
      server.use(http.all("*", () => HttpResponse.error()));

      const res = await outsideFetch(CALENDAR);

      const data = await res.json();
      expect(data.entries.length).toBeGreaterThan(0);
    });

    it("returns a 404 for a URL with no fixture", async () => {
      vi.stubEnv("DATA_FIXTURES", "1");

      const res = await outsideFetch("https://example.com/anything");

      expect(res.status).toBe(404);
    });
  });
});
