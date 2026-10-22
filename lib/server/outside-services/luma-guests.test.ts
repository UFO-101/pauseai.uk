import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { getRaceCounts, getSourceCounts, listEventGuests } from "./luma-guests";

const TAGS = ["stratford", "brixton"] as const;
const GUESTS = "https://public-api.luma.com/v1/events/guests/list";

// The page shows its "check the Luma access settings" note whenever this is null.
describe("getSourceCounts", () => {
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
          ? HttpResponse.json({
              entries: [{ api_id: "g1", guest: { utm_source: "brixton" } }, null],
              has_more: true,
              next_cursor: "c2",
            })
          : requests.length === 2
            ? HttpResponse.json({ entries: [{ utm_source: "stratford" }], has_more: false })
            : HttpResponse.json({});
      }),
    );

    expect(await getSourceCounts("evt-x", TAGS)).toEqual({ counts: { stratford: 1, brixton: 1 }, other: 0, total: 2 });
    expect(requests).toHaveLength(2);
    expect(requests[0].headers.get("x-luma-api-key")).toBe("k");
    const first = new URL(requests[0].url).searchParams;
    expect(first.get("event_id")).toBe("evt-x");
    expect(first.get("pagination_limit")).toBe("50");
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

describe("listEventGuests", () => {
  beforeEach(() => vi.stubEnv("LUMA_API_KEY", "k"));
  afterEach(() => vi.unstubAllEnvs());

  it("reads each guest as the import keeps them, from the fixture", async () => {
    const page = await listEventGuests("evt-1");
    expect(page.nextCursor).toBe("page-2");
    expect(page.entries[0]).toEqual({
      id: "gst-1-evt-1",
      userId: "usr-fixture-1",
      email: "Jane.Fixture@example.com",
      name: "Jane Fixture",
      approvalStatus: "approved",
      registeredAt: "2026-09-26T12:00:00.000Z",
      phone: "+447700900001",
      postcode: "M1 1AE",
      utmSource: "brixton",
    });
    // Nobody's phone, and an answer to another question.
    expect(page.entries[2]).toMatchObject({ phone: null, postcode: null, utmSource: "brixton" });
    expect((await listEventGuests("evt-1", "page-2")).entries.map((g) => g.id)).toEqual(["gst-4-evt-1", "gst-5-evt-1"]);
  });

  it("takes the older field names, a wrapped guest, an empty answer, and skips a guest with no ID, user or email", async () => {
    server.use(
      http.get(GUESTS, () =>
        HttpResponse.json({
          entries: [
            {
              api_id: "gst-a",
              guest: {
                api_id: "gst-a",
                user_api_id: "usr-a",
                email: "a@example.com",
                name: null,
                approval_status: "invited",
                phone_number: "",
                utm_source: "",
                registration_answers: [
                  { answer: "no label" },
                  { label: "Postcode", answer: " " },
                  { label: "Your postcode", value: "SW1A 1AA" },
                ],
              },
            },
            {
              id: "gst-b",
              user_id: "usr-b",
              user_email: "b@example.com",
              registration_answers: [{ label: "Postcode", answer: 3 }],
            },
            { id: "gst-c", user_id: "usr-c" },
            { id: "gst-d", user_email: "d@example.com" },
            { user_id: "usr-e", user_email: "e@example.com" },
          ],
          has_more: false,
        }),
      ),
    );
    expect((await listEventGuests("evt-x")).entries).toEqual([
      {
        id: "gst-a",
        userId: "usr-a",
        email: "a@example.com",
        name: "",
        approvalStatus: "invited",
        registeredAt: null,
        phone: null,
        postcode: "SW1A 1AA",
        utmSource: null,
      },
      {
        id: "gst-b",
        userId: "usr-b",
        email: "b@example.com",
        name: "",
        approvalStatus: "",
        registeredAt: null,
        phone: null,
        postcode: null,
        utmSource: null,
      },
    ]);
  });
});
