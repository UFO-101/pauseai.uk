import { expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { query } from "@/lib/server/db";
import { server } from "@/tests/fixtures/msw";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { linkSupporters } from "./supporters";
import { lookUpPlaces } from "./supporter-places";

/** An event, in `city` at a point, with `tags`. */
async function event(id: string, city: string | null, tags: string[] = []) {
  await query(
    `INSERT INTO luma_events (id, name, url, start_at, access, city, latitude, longitude, tags)
     VALUES ($1, $1, $1, '2026-10-01T18:00:00Z', 'manage', $2, 53.4, -2.2, $3)`,
    [id, city, tags],
  );
}

/** A Luma user registered for `events`, in order, a day apart, giving `postcode` with the first. */
async function guest(id: string, events: string[], postcode: string | null = null, status = "approved") {
  await query("INSERT INTO luma_people (user_id, email, name) VALUES ($1, $2, $1)", [id, `${id}@example.com`]);
  for (const [i, eventId] of events.entries()) {
    await query(
      `INSERT INTO luma_guests (id, event_id, user_id, approval_status, registered_at, postcode)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [`gst-${id}-${eventId}`, eventId, id, status, `2026-09-${10 + i}T10:00:00Z`, i === 0 ? postcode : null],
    );
  }
}

/** A member who gave a city and maybe a postcode. */
async function member(id: string, city: string, postcode: string | null = null) {
  await query(
    `INSERT INTO members (id, email, name, city, postcode, joined_at, created_at, keep_informed, share_permission, source_modified_at)
     VALUES ($1, $2, $1, $3, $4, '2026-09-01', '2026-09-01', true, true, '2026-09-01')`,
    [id, `${id}@example.com`, city, postcode],
  );
}

const places = () =>
  query<{ email: string; place: string; basis: string; given: string; country: string | null }>(
    `SELECT l.matched_value AS email, p.place, p.basis, p.given, p.country FROM supporter_place p
     JOIN supporter_links l ON l.supporter_id = p.supporter_id ORDER BY 1`,
  );

describeWithDatabase("lookUpPlaces and supporter_place", () => {
  useTestDatabase();

  it("looks up postcodes and towns once, and places each supporter by postcode, city, then a local event", async () => {
    await event("evt-manchester", "Manchester", ["Manchester"]);
    await event("evt-march", "London", ["Big events"]);
    await event("evt-online", null, ["Online"]);
    await guest("by-postcode", ["evt-manchester"], "m1 1ae");
    await guest("by-event", ["evt-manchester", "evt-march", "evt-online"]);
    await guest("by-march", ["evt-march"]);
    await guest("declined", ["evt-manchester"], null, "declined");
    await member("by-city", "Cardiff", "ZZ99ZZ");
    await linkSupporters();

    expect(await lookUpPlaces()).toEqual({ postcodes: 2, towns: 3, failed: false });
    expect(await query("SELECT postcode, place FROM postcode_places ORDER BY 1")).toEqual([
      { postcode: "M11AE", place: "Manchester" },
      { postcode: "ZZ99ZZ", place: null },
    ]);
    expect((await query("SELECT name FROM named_places ORDER BY 1")).map((r) => r.name)).toEqual([
      "cardiff",
      "london",
      "manchester",
    ]);
    expect(await places()).toEqual([
      { email: "by-city@example.com", place: "Cardiff", basis: "city", given: "Cardiff", country: "wales" },
      {
        email: "by-event@example.com",
        place: "Manchester",
        basis: "event",
        given: "evt-manchester",
        country: "england",
      },
      { email: "by-postcode@example.com", place: "Manchester", basis: "postcode", given: "m1 1ae", country: "england" },
    ]);
    // Nothing new to look up.
    expect(await lookUpPlaces()).toEqual({ postcodes: 0, towns: 0, failed: false });
  });

  it("stops when postcodes.io fails, keeping what it stored", async () => {
    await member("one", "Leeds", "M1 1AE");
    await linkSupporters();
    server.use(http.get("https://api.postcodes.io/places", () => new HttpResponse(null, { status: 500 })));
    expect(await lookUpPlaces()).toEqual({ postcodes: 1, towns: 0, failed: true });
    expect(await query("SELECT count(*)::int AS n FROM named_places")).toEqual([{ n: 0 }]);
  });
});
