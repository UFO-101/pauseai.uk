import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { getThankedDonors, WALL_OF_THANKS_FIELD } from "./stripe";

const SESSIONS = "https://api.stripe.com/v1/checkout/sessions";
const PAYMENTS = "https://api.stripe.com/v1/payment_intents";

/** A completed checkout, as Stripe lists it. */
function session(
  id: string,
  created: number,
  name: string | null,
  email: string | null,
  answer?: string | null,
  customer: string | null = null,
) {
  return {
    id,
    created,
    customer,
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

/** Answers the payments request with one page of these. */
function payments(...data: unknown[]) {
  server.use(http.get(PAYMENTS, () => HttpResponse.json({ data, has_more: false })));
}

/** A payment, for an invoice (a monthly gift) unless `reference` says otherwise. */
function payment(created: number, customer: string | null, reference: string | null = "in_1", status = "succeeded") {
  return { id: `pi_${created}`, created, status, customer, payment_details: { order_reference: reference } };
}

describe("getThankedDonors", () => {
  beforeEach(() => vi.stubEnv("STRIPE_WALL_OF_THANKS_KEY", "rk_test"));
  afterEach(() => vi.unstubAllEnvs());

  it("asks for completed checkouts and payments with the key, and lists who said yes, newest gift first, once each", async () => {
    const requests: Request[] = [];
    server.events.on("request:start", ({ request }) => void requests.push(request));
    const donors = await getThankedDonors();
    server.events.removeAllListeners();
    const [checkouts, paid] = requests.map((request) => new URL(request.url));
    expect(checkouts.pathname).toBe("/v1/checkout/sessions");
    expect(checkouts.searchParams.get("status")).toBe("complete");
    expect(checkouts.searchParams.get("limit")).toBe("100");
    expect(paid.pathname).toBe("/v1/payment_intents");
    expect(paid.searchParams.get("limit")).toBe("100");
    expect(requests.map((request) => request.headers.get("authorization"))).toEqual([
      "Bearer rk_test",
      "Bearer rk_test",
    ]);
    // The fixture: Morag gives monthly and paid in October, after Ada's
    // second checkout; Ada gave twice, under two spellings of one address;
    // Chen's latest monthly payment failed, so his September one counts;
    // Sam's bus ticket isn't a gift; someone said no; and one checkout was
    // before the question.
    expect(donors.map((donor) => donor.name)).toEqual([
      "Morag Fraser",
      "Ada Pemberton",
      "Tom Okafor",
      "Priya Raman",
      "Chen Wei",
      "Sam Whitlock",
    ]);
    expect(donors.map((donor) => donor.givenAt.slice(0, 10))).toEqual([
      "2026-10-20",
      "2026-10-16",
      "2026-10-13",
      "2026-10-01",
      "2026-09-26",
      "2026-09-16",
    ]);
  });

  it("dates a monthly donor by their latest payment, through any of their checkouts", async () => {
    sessions(
      session("cs_2", 200, "Jo Bloggs", "jo@example.org", "yes", "cus_new"),
      session("cs_1", 100, "Jo Bloggs", "jo@example.org", "yes", "cus_old"),
      session("cs_3", 300, "One Off", "one@example.org", "yes"),
    );
    payments(payment(400, "cus_old"), payment(350, "cus_old"), payment(250, "cus_new"));
    expect(await getThankedDonors()).toEqual([
      { name: "Jo Bloggs", givenAt: new Date(400_000).toISOString() },
      { name: "One Off", givenAt: new Date(300_000).toISOString() },
    ]);
  });

  it("counts only successful payments for invoices, by a customer", async () => {
    sessions(session("cs_1", 100, "Jo Bloggs", "jo@example.org", "yes", "cus_1"));
    payments(
      payment(200, "cus_1", "cs_1"),
      payment(300, "cus_1", null),
      payment(400, "cus_1", "in_1", "requires_payment_method"),
      payment(500, null),
      { id: "pi_600", created: 600, status: "succeeded", customer: "cus_1" },
      { id: "pi_700", created: 700, status: "succeeded", customer: "cus_1", payment_details: null },
    );
    expect(await getThankedDonors()).toEqual([{ name: "Jo Bloggs", givenAt: new Date(100_000).toISOString() }]);
  });

  it("doesn't let payments name someone who said no", async () => {
    sessions(session("cs_1", 100, "Jo Bloggs", "jo@example.org", "no", "cus_1"));
    payments(payment(200, "cus_1"));
    expect(await getThankedDonors()).toEqual([]);
  });

  it("dates by the checkouts when Stripe refuses the payments", async () => {
    sessions(session("cs_1", 100, "Jo Bloggs", "jo@example.org", "yes", "cus_1"));
    server.use(http.get(PAYMENTS, () => HttpResponse.json({}, { status: 403 })));
    expect(await getThankedDonors()).toEqual([{ name: "Jo Bloggs", givenAt: new Date(100_000).toISOString() }]);
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
