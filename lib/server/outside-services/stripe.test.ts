import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { getThankedDonors, WALL_OF_THANKS_FIELD } from "./stripe";

const SESSIONS = "https://api.stripe.com/v1/checkout/sessions";

/** A completed checkout, as Stripe lists it. */
function session(id: string, created: number, name: string | null, email: string | null, answer?: string | null) {
  return {
    id,
    created,
    customer_details: { name, email },
    custom_fields:
      answer === undefined
        ? []
        : [{ key: WALL_OF_THANKS_FIELD, type: "dropdown", dropdown: answer === null ? null : { value: answer } }],
  };
}

/** Answers the sessions request with one page of these. */
function sessions(...data: unknown[]) {
  server.use(http.get(SESSIONS, () => HttpResponse.json({ data, has_more: false })));
}

describe("getThankedDonors", () => {
  beforeEach(() => vi.stubEnv("STRIPE_WALL_OF_THANKS_KEY", "rk_test"));
  afterEach(() => vi.unstubAllEnvs());

  it("asks for completed checkouts with the key, and lists who said yes, newest first, once each", async () => {
    let request: Request | undefined;
    server.use(
      http.get(SESSIONS, ({ request: r }) => {
        request = r;
        return undefined;
      }),
    );
    const donors = await getThankedDonors();
    const params = new URL(request!.url).searchParams;
    expect(params.get("status")).toBe("complete");
    expect(params.get("limit")).toBe("100");
    expect(request!.headers.get("authorization")).toBe("Bearer rk_test");
    // The fixture: Ada gave twice, under two spellings of one address;
    // someone said no; and one checkout was before the question.
    expect(donors.map((donor) => donor.name)).toEqual([
      "Ada Pemberton",
      "Tom Okafor",
      "Priya Raman",
      "Sam Whitlock",
      "Chen Wei",
      "Morag Fraser",
    ]);
    expect(donors[0].givenAt).toBe("2026-10-16T12:00:00.000Z");
  });

  it("goes by each person's latest answer, so a later no takes them off", async () => {
    sessions(
      session("cs_3", 300, "Jo Bloggs", "jo@example.org", "no"),
      session("cs_2", 200, "Jo Bloggs", "jo@example.org", "yes"),
      session("cs_1", 100, "Jo Bloggs", "jo@example.org", "no"),
    );
    expect(await getThankedDonors()).toEqual([]);
  });

  it("keeps the latest name, whichever order the checkouts come in", async () => {
    sessions(
      session("cs_1", 100, "J Bloggs", "jo@example.org", "yes"),
      session("cs_2", 200, " Jo Bloggs ", "jo@example.org", "yes"),
      session("cs_0", 50, "Joanna", "jo@example.org", "yes"),
    );
    expect(await getThankedDonors()).toEqual([{ name: "Jo Bloggs", givenAt: "1970-01-01T00:03:20.000Z" }]);
  });

  it("leaves out a yes with no name, and a checkout with no answer", async () => {
    sessions(
      session("cs_1", 100, null, "a@example.org", "yes"),
      session("cs_2", 200, "  ", "b@example.org", "yes"),
      session("cs_3", 300, "No Answer", "c@example.org", null),
      session("cs_4", 400, "Before The Question", "d@example.org"),
      { id: "cs_5", created: 500, customer_details: null, custom_fields: [] },
    );
    expect(await getThankedDonors()).toEqual([]);
  });

  it("tells apart checkouts with no email by their own ID", async () => {
    sessions(session("cs_1", 100, "One", null, "yes"), session("cs_2", 200, "Two", null, "yes"));
    expect((await getThankedDonors()).map((donor) => donor.name)).toEqual(["Two", "One"]);
  });

  it("reads every page", async () => {
    const starts: (string | null)[] = [];
    server.use(
      http.get(SESSIONS, ({ request }) => {
        const after = new URL(request.url).searchParams.get("starting_after");
        starts.push(after);
        if (after === null) {
          return HttpResponse.json({ data: [session("cs_2", 200, "Two", "two@example.org", "yes")], has_more: true });
        }
        return HttpResponse.json({ data: [session("cs_1", 100, "One", "one@example.org", "yes")], has_more: false });
      }),
    );
    expect((await getThankedDonors()).map((donor) => donor.name)).toEqual(["Two", "One"]);
    expect(starts).toEqual([null, "cs_2"]);
  });

  it("stops at an empty page that says there's more", async () => {
    server.use(http.get(SESSIONS, () => HttpResponse.json({ data: [], has_more: true })));
    expect(await getThankedDonors()).toEqual([]);
  });

  it("returns nobody without a key, without calling Stripe", async () => {
    vi.stubEnv("STRIPE_WALL_OF_THANKS_KEY", "");
    let called = false;
    server.use(
      http.get(SESSIONS, () => {
        called = true;
        return undefined;
      }),
    );
    expect(await getThankedDonors()).toEqual([]);
    expect(called).toBe(false);
  });

  it("returns nobody when Stripe refuses", async () => {
    server.use(
      http.get(SESSIONS, () => HttpResponse.json({ error: { message: "Permission denied" } }, { status: 403 })),
    );
    expect(await getThankedDonors()).toEqual([]);
  });

  it("returns nobody when Stripe can't be reached", async () => {
    server.use(http.get(SESSIONS, () => HttpResponse.error()));
    expect(await getThankedDonors()).toEqual([]);
  });
});
