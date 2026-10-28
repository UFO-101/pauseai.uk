import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { query } from "@/lib/server/db";
import { describeWithDatabase, useTestDatabase, withDatabaseDown } from "@/tests/database";
import { server } from "@/tests/fixtures/msw";
import { POST } from "./route";

/** Posts a body, JSON unless it's a string already, and reads the answer. */
async function registerForMarch(body: unknown) {
  const sent = typeof body === "string" ? body : JSON.stringify(body);
  const res = await POST(new Request("http://localhost/api/march/register", { method: "POST", body: sent }));
  expect(res.status).toBe(200);
  return res.json();
}

const ADD = "https://public-api.luma.com/v1/events/guests/add";
const person = { name: "Testy McTestface", email: "testy@example.org", phone: "", city: "", postcode: "" };

/** The sign-ups kept, with what Luma said. */
const entries = () =>
  query(
    `SELECT f.form, f.name, f.email, f.phone, f.city, f.postcode, f.contact_consent AS consent, f.utm_source AS "utmSource",
       g.event_id AS "eventId", g.status
     FROM form_entries f LEFT JOIN form_entry_luma g ON g.entry_id = f.id ORDER BY f.id`,
  );

beforeEach(() => {
  vi.stubEnv("LUMA_API_KEY", "key");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describeWithDatabase("POST /api/march/register", () => {
  useTestDatabase();

  it("adds the person to the march's event, giving Luma only their name and email, and keeps the rest", async () => {
    let body: unknown;
    server.use(
      http.post(ADD, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ skipped: [] });
      }),
    );
    const full = {
      ...person,
      phone: "07700 900000",
      city: "Leeds",
      postcode: "ls1 1aa",
      consent: true,
      utmSource: "nl",
    };
    expect(await registerForMarch(full)).toEqual({ ok: true });
    expect(body).toEqual({
      event_id: "evt-hfOj1RR5K1gBNEW",
      guests: [{ email: "testy@example.org", name: "Testy McTestface" }],
    });
    expect(await entries()).toEqual([
      {
        form: "march-2026-11",
        name: "Testy McTestface",
        email: "testy@example.org",
        phone: "07700 900000",
        city: "Leeds",
        postcode: "LS1 1AA",
        consent: true,
        utmSource: "nl",
        eventId: "evt-hfOj1RR5K1gBNEW",
        status: "added",
      },
    ]);
    expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/^\[march\] Kept sign-up \d+: Luma added\.$/));
    // And they're a supporter.
    expect(await query("SELECT matched_value FROM supporter_links WHERE form_entry_id IS NOT NULL")).toEqual([
      { matched_value: "testy@example.org" },
    ]);
  });

  it("adds them to the march itself in production", async () => {
    vi.stubEnv("DEPLOY_CONTEXT", "production");
    let body: unknown;
    server.use(
      http.post(ADD, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ skipped: [] });
      }),
    );
    expect(await registerForMarch(person)).toEqual({ ok: true });
    expect(body).toMatchObject({ event_id: "evt-1HKCXSHaJqGO3Bg" });
    expect(await entries()).toMatchObject([{ eventId: "evt-1HKCXSHaJqGO3Bg", status: "added" }]);
  });

  it("still says it worked when the sign-up can't be kept, as Luma has them", async () => {
    expect(await withDatabaseDown(() => registerForMarch(person))).toEqual({ ok: true });
    expect(console.error).toHaveBeenCalledWith(expect.stringMatching(/^\[march\] Couldn't keep the sign-up: /));
  });

  it("says why it won't take a name or email", async () => {
    expect(await registerForMarch({ ...person, email: "testy" })).toEqual({
      ok: false,
      reason: "invalid",
      errors: { email: "Please enter a valid email address." },
    });
    expect((await registerForMarch(null)).ok).toBe(false);
    expect((await registerForMarch("not JSON")).ok).toBe(false);
    expect(await entries()).toEqual([]);
  });

  it("tells a bot it worked, without adding anyone", async () => {
    let called = false;
    server.use(
      http.post(ADD, () => {
        called = true;
        return HttpResponse.json({ skipped: [] });
      }),
    );
    expect(await registerForMarch({ ...person, website: "https://spam.example.org" })).toEqual({ ok: true });
    expect(called).toBe(false);
    expect(await entries()).toEqual([]);
    expect(console.warn).toHaveBeenCalledWith("[march] Honeypot filled in; ignoring the sign-up.");
  });

  it("takes a blank honeypot as a person", async () => {
    expect(await registerForMarch({ ...person, website: "  " })).toEqual({ ok: true });
  });

  it("fails when Luma skips the guest, and logs it without their email, keeping what they gave", async () => {
    expect(await registerForMarch({ ...person, email: "luma-skips@example.org" })).toEqual({
      ok: false,
      reason: "luma-failed",
    });
    expect(await entries()).toEqual([expect.objectContaining({ email: "luma-skips@example.org", status: "skipped" })]);
    expect(console.error).toHaveBeenCalledWith(
      "[march] Luma skipped the guest (unsubscribed, removed or blocked on the calendar).",
    );
  });

  it("fails when Luma does", async () => {
    expect(await registerForMarch({ ...person, email: "luma-fails@example.org" })).toEqual({
      ok: false,
      reason: "luma-failed",
    });
    expect(console.error).toHaveBeenCalledWith(
      '[march] Couldn\'t add the guest to Luma: Luma responded 500: {"message":"Fixture failure"}',
    );
  });

  it("fails, rather than pretending, when there's no Luma key", async () => {
    vi.stubEnv("LUMA_API_KEY", undefined);
    expect(await registerForMarch(person)).toEqual({ ok: false, reason: "luma-failed" });
    expect(console.error).toHaveBeenCalledWith("[march] Can't add the guest to Luma: LUMA_API_KEY not set.");
    expect(await entries()).toEqual([expect.objectContaining({ status: "not-configured" })]);
  });
});
