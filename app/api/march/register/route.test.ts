import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
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

beforeEach(() => {
  vi.stubEnv("LUMA_API_KEY", "key");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/march/register", () => {
  it("adds the person to the march's event, giving Luma only their name and email", async () => {
    let body: unknown;
    server.use(
      http.post(ADD, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ skipped: [] });
      }),
    );
    expect(await registerForMarch({ ...person, tags: { source: "in", campaign: "other" } })).toEqual({ ok: true });
    expect(body).toEqual({
      event_id: "evt-hfOj1RR5K1gBNEW",
      guests: [{ email: "testy@example.org", name: "Testy McTestface" }],
    });
  });

  it("says why it won't take a name or email", async () => {
    expect(await registerForMarch({ ...person, email: "testy" })).toEqual({
      ok: false,
      reason: "invalid",
      errors: { email: "Please enter a valid email address." },
    });
    expect((await registerForMarch(null)).ok).toBe(false);
    expect((await registerForMarch("not JSON")).ok).toBe(false);
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
    expect(console.warn).toHaveBeenCalledWith("[march] Honeypot filled in; ignoring the sign-up.");
  });

  it("takes a blank honeypot as a person", async () => {
    expect(await registerForMarch({ ...person, website: "  " })).toEqual({ ok: true });
  });

  it("fails when Luma skips the guest, and logs it without their email", async () => {
    expect(await registerForMarch({ ...person, email: "luma-skips@example.org" })).toEqual({
      ok: false,
      reason: "luma-failed",
    });
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
  });
});
