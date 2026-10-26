import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { query } from "@/lib/server/db";
import { describeWithDatabase, useTestDatabase, withDatabaseDown } from "@/tests/database";
import { LUMA_WEBHOOK_SECRET, lumaPersonWebhook, lumaWebhookHeaders } from "@/tests/luma-webhooks";
import { POST } from "./route";

const NOW = new Date("2026-10-21T12:00:00Z");

beforeEach(() => {
  vi.stubEnv("LUMA_WEBHOOK_SECRET", LUMA_WEBHOOK_SECRET);
  vi.stubEnv("FIXTURE_NOW", NOW.toISOString());
});
afterEach(() => vi.unstubAllEnvs());

/** A webhook as Luma posts it: signed over the body at `at`, with its ID. */
function post(payload: unknown, headers: Partial<Record<string, string | null>> = {}) {
  const body = typeof payload === "string" ? payload : JSON.stringify(payload);
  const all: Record<string, string> = { ...lumaWebhookHeaders(body, NOW) };
  for (const [name, value] of Object.entries(headers)) {
    if (value === null) delete all[name];
    else all[name] = value!;
  }
  return POST(new Request("https://pauseai.uk/api/luma/webhook", { method: "POST", headers: all, body }));
}

describeWithDatabase("POST /api/luma/webhook", () => {
  useTestDatabase();

  it("records an unsubscribe, and the address subscribing again, saying so in the log", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const res = await post(lumaPersonWebhook("calendar.person.unsubscribed", "jane@example.com"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ recorded: true });
    expect(console.info).toHaveBeenLastCalledWith("Luma webhook msg_1, calendar.person.unsubscribed: recorded");
    expect(await query("SELECT address, resubscribed_at FROM opt_outs")).toEqual([
      { address: "jane@example.com", resubscribed_at: null },
    ]);
    // Luma sends a webhook again unless it's answered 2xx; the same one changes nothing.
    expect(await (await post(lumaPersonWebhook("calendar.person.unsubscribed", "jane@example.com"))).json()).toEqual({
      recorded: false,
    });
    expect(console.info).toHaveBeenLastCalledWith(
      "Luma webhook msg_1, calendar.person.unsubscribed: nothing to record",
    );
    const back = await post(lumaPersonWebhook("calendar.person.subscribed", "jane@example.com"), {
      "webhook-id": "msg_2",
    });
    expect(await back.json()).toEqual({ recorded: true });
    expect(await query("SELECT resubscribed_at FROM opt_outs")).toEqual([{ resubscribed_at: NOW }]);
  });

  it("refuses a request that isn't signed by Luma, or has no ID, or isn't JSON", async () => {
    const payload = lumaPersonWebhook("calendar.person.unsubscribed", "jane@example.com");
    expect((await post(payload, { "webhook-signature": null })).status).toBe(401);
    expect((await post(payload, { "webhook-signature": "t=1,v1=0" })).status).toBe(401);
    expect((await post(payload, { "webhook-id": null })).status).toBe(400);
    expect((await post("not json")).status).toBe(400);
    expect(await query("SELECT 1 FROM opt_outs")).toEqual([]);
  });

  it("answers 500 when it can't record it, so Luma tries again", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await withDatabaseDown(() =>
      post(lumaPersonWebhook("calendar.person.unsubscribed", "jane@example.com")),
    );
    expect(res.status).toBe(500);
    expect(console.error).toHaveBeenCalled();
  });
});
