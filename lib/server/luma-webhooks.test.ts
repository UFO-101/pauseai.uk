import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { query } from "@/lib/server/db";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { LUMA_WEBHOOK_SECRET, lumaPersonWebhook, lumaSignature } from "@/tests/luma-webhooks";
import { recordLumaWebhook, signedByLuma } from "./luma-webhooks";

const NOW = new Date("2026-10-21T12:00:00Z");
const BODY = '{"type":"calendar.person.unsubscribed"}';

beforeEach(() => {
  vi.stubEnv("LUMA_WEBHOOK_SECRET", LUMA_WEBHOOK_SECRET);
  vi.stubEnv("FIXTURE_NOW", NOW.toISOString());
});
afterEach(() => vi.unstubAllEnvs());

const request = (signature: string | null) =>
  new Request("https://pauseai.uk/api/luma/webhook", {
    method: "POST",
    headers: signature === null ? {} : { "webhook-signature": signature },
    body: BODY,
  });

describe("signedByLuma", () => {
  it("accepts a signature over the timestamp and the body, and returns the time it was signed", () => {
    expect(signedByLuma(request(lumaSignature(BODY, NOW)), BODY)).toEqual(NOW);
    // Up to five minutes old, or ahead, for a clock that differs from Luma's.
    const old = new Date(NOW.getTime() - 5 * 60 * 1000);
    expect(signedByLuma(request(lumaSignature(BODY, old)), BODY)).toEqual(old);
    const ahead = new Date(NOW.getTime() + 5 * 60 * 1000);
    expect(signedByLuma(request(lumaSignature(BODY, ahead)), BODY)).toEqual(ahead);
  });

  it("refuses a missing or malformed signature, another secret's, another body's, or a stale one", () => {
    expect(signedByLuma(request(null), BODY)).toBeUndefined();
    expect(signedByLuma(request("v1=abc"), BODY)).toBeUndefined();
    expect(signedByLuma(request("t=soon,v1=abc"), BODY)).toBeUndefined();
    expect(signedByLuma(request(`t=${NOW.getTime() / 1000}`), BODY)).toBeUndefined();
    expect(signedByLuma(request(lumaSignature(BODY, NOW, "other")), BODY)).toBeUndefined();
    expect(signedByLuma(request(lumaSignature("{}", NOW)), BODY)).toBeUndefined();
    const signed = lumaSignature(BODY, NOW);
    expect(signedByLuma(request(signed.replace(/v1=.*/, "v1=0")), BODY)).toBeUndefined();
    const stale = new Date(NOW.getTime() - 5 * 60 * 1000 - 1000);
    expect(signedByLuma(request(lumaSignature(BODY, stale)), BODY)).toBeUndefined();
  });

  it("refuses everything without the secret set", () => {
    vi.stubEnv("LUMA_WEBHOOK_SECRET", "");
    expect(signedByLuma(request(lumaSignature(BODY, NOW)), BODY)).toBeUndefined();
  });
});

describeWithDatabase("recordLumaWebhook", () => {
  useTestDatabase();
  const optOuts = () =>
    query<{ address: string; source_ref: string; unsubscribed_at: Date; resubscribed_at: Date | null }>(
      "SELECT address, source_ref, unsubscribed_at, resubscribed_at FROM opt_outs ORDER BY id",
    );

  it("records an unsubscribe as an opt-out from the calendar, once per webhook", async () => {
    const payload = lumaPersonWebhook("calendar.person.unsubscribed", "Jane@example.com");
    expect(await recordLumaWebhook(payload, "msg_1", NOW)).toBe(true);
    expect(await recordLumaWebhook(payload, "msg_1", NOW)).toBe(false);
    expect(await optOuts()).toEqual([
      { address: "jane@example.com", source_ref: "msg_1", unsubscribed_at: NOW, resubscribed_at: null },
    ]);
  });

  it("closes the opt-out when the address subscribes again, and does nothing for one that isn't opted out", async () => {
    const subscribed = lumaPersonWebhook("calendar.person.subscribed", "jane@example.com");
    expect(await recordLumaWebhook(subscribed, "msg_1", NOW)).toBe(false);
    await recordLumaWebhook(lumaPersonWebhook("calendar.person.unsubscribed", "jane@example.com"), "msg_2", NOW);
    const later = new Date("2026-10-22T12:00:00Z");
    expect(await recordLumaWebhook(subscribed, "msg_3", later)).toBe(true);
    expect((await optOuts())[0].resubscribed_at).toEqual(later);
  });

  it("reads the address from the user when the person has none, and ignores other webhooks or no address", async () => {
    const payload = lumaPersonWebhook("calendar.person.unsubscribed", "jane@example.com");
    delete (payload.data as { email?: string }).email;
    expect(await recordLumaWebhook(payload, "msg_1", NOW)).toBe(true);
    expect(await recordLumaWebhook({ type: "calendar.person.unsubscribed", data: {} }, "msg_2", NOW)).toBe(false);
    expect(await recordLumaWebhook({ type: "guest.registered", data: { email: "x@example.com" } }, "msg_3", NOW)).toBe(
      false,
    );
    expect(await recordLumaWebhook({}, "msg_4", NOW)).toBe(false);
    expect(await optOuts()).toHaveLength(1);
  });
});
