import { afterEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { getRaceCounts, getSourceCounts } from "./luma-guests";

const TAGS = ["stratford", "brixton"] as const;

// The page shows its "check the Luma access settings" note whenever this is null.
describe("getSourceCounts", () => {
  const GUESTS = "https://public-api.luma.com/v1/event/get-guests";

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null without an API key, without calling Luma", async () => {
    vi.stubEnv("LUMA_API_KEY", "");
    let called = false;
    server.use(
      http.get(GUESTS, () => {
        called = true;
        return HttpResponse.json({});
      }),
    );
    expect(await getSourceCounts("evt-x", TAGS)).toBeNull();
    expect(called).toBe(false);
  });

  it("returns null when Luma rejects the key", async () => {
    vi.stubEnv("LUMA_API_KEY", "revoked");
    server.use(http.get(GUESTS, () => new HttpResponse(null, { status: 401 })));
    expect(await getSourceCounts("evt-x", TAGS)).toBeNull();
  });

  it("returns null when the request throws", async () => {
    vi.stubEnv("LUMA_API_KEY", "k");
    server.use(http.get(GUESTS, () => HttpResponse.error()));
    expect(await getSourceCounts("evt-x", TAGS)).toBeNull();
  });

  it("pages through the guest list with the key, accepting both entry shapes", async () => {
    vi.stubEnv("LUMA_API_KEY", "k");
    const requests: Request[] = [];
    server.use(
      http.get(GUESTS, ({ request }) => {
        requests.push(request);
        return requests.length === 1
          ? HttpResponse.json({ entries: [{ api_id: "g1", guest: { utm_source: "brixton" } }], has_more: true, next_cursor: "c2" })
          : requests.length === 2
            ? HttpResponse.json({ entries: [{ utm_source: "stratford" }], has_more: false })
            : HttpResponse.json({});
      }),
    );

    expect(await getSourceCounts("evt-x", TAGS)).toEqual({ counts: { stratford: 1, brixton: 1 }, other: 0, total: 2 });
    expect(requests).toHaveLength(2);
    expect(requests[0].headers.get("x-luma-api-key")).toBe("k");
    const first = new URL(requests[0].url).searchParams;
    expect(first.get("event_api_id")).toBe("evt-x");
    expect(first.get("pagination_cursor")).toBeNull();
    expect(new URL(requests[1].url).searchParams.get("pagination_cursor")).toBe("c2");
  });

  it("treats a response with no entries as nobody registered", async () => {
    vi.stubEnv("LUMA_API_KEY", "k");
    server.use(http.get(GUESTS, () => HttpResponse.json({ has_more: false })));
    expect(await getSourceCounts("evt-x", TAGS)).toEqual({ counts: { stratford: 0, brixton: 0 }, other: 0, total: 0 });
  });

  it("reads the shared fixture by default", async () => {
    vi.stubEnv("LUMA_API_KEY", "k");
    expect(await getSourceCounts("evt-x", TAGS)).toEqual({ counts: { stratford: 1, brixton: 2 }, other: 1, total: 4 });
  });
});

describe("getRaceCounts", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("counts the race window and everything after it", async () => {
    vi.stubEnv("LUMA_API_KEY", "k");
    const open = new Date("2026-10-10T12:00:00Z");
    const close = new Date("2026-10-10T12:45:00Z");
    // Fixture guests registered at 12:00, 12:30, 13:00 (one declined) on 10 October.
    const [during, after] = await getRaceCounts("evt-x", TAGS, open, close);
    expect(during).toEqual({ counts: { stratford: 0, brixton: 1 }, other: 0, total: 1 });
    expect(after).toEqual({ counts: { stratford: 0, brixton: 0 }, other: 1, total: 1 });
  });

  it("returns nulls without an API key", async () => {
    vi.stubEnv("LUMA_API_KEY", "");
    expect(await getRaceCounts("evt-x", TAGS, new Date(0), new Date(1))).toEqual([null, null]);
  });
});
