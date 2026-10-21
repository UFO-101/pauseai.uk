import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { now } from "@/lib/now";
import { recordOptOut, recordResubscribe } from "./opt-outs";

// What Luma tells us about the calendar's people: someone opted out of its
// emails (an unsubscribe, a block or a spam report; Luma doesn't say which),
// or subscribed to it. Luma signs each request with the webhook's secret,
// LUMA_WEBHOOK_SECRET, and sends it again, three more times over seven
// minutes, unless it's answered 2xx.

/** How old a signed timestamp may be, in seconds, before the request is refused. */
const MAX_AGE_SECONDS = 5 * 60;

/**
 * Whether a request was signed by Luma within the last five minutes: its
 * Webhook-Signature is "t=<unix seconds>,v1=<hex>", the HMAC-SHA256 of
 * "<t>.<raw body>" with the secret. Without the secret set, none was.
 * Returns the signed timestamp, as a Date, for the record of when.
 */
export function signedByLuma(request: Request, body: string): Date | undefined {
  const secret = process.env.LUMA_WEBHOOK_SECRET;
  if (!secret) return undefined;
  const parts = new Map(
    (request.headers.get("webhook-signature") ?? "").split(",").map((part) => {
      const [key, ...value] = part.trim().split("=");
      return [key, value.join("=")] as const;
    }),
  );
  const timestamp = parts.get("t") ?? "";
  if (!/^\d+$/.test(timestamp)) return undefined;
  if (Math.abs(Number(timestamp) - now().getTime() / 1000) > MAX_AGE_SECONDS) return undefined;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex"));
  const given = Buffer.from(parts.get("v1") ?? "");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return undefined;
  return new Date(Number(timestamp) * 1000);
}

/** Luma's webhook payload, as far as we read it. */
export type LumaWebhook = {
  type?: string;
  data?: { email?: string; user?: { email?: string } };
};

/**
 * Records what a webhook said: an opt-out from the calendar's emails, or the
 * end of one when the address subscribes again. Returns whether it kept
 * anything: not for a redelivery, a subscription with no opt-out to close,
 * or any other kind of webhook.
 */
export async function recordLumaWebhook(payload: LumaWebhook, webhookId: string, at: Date): Promise<boolean> {
  const address = payload.data?.email ?? payload.data?.user?.email;
  if (!address) return false;
  if (payload.type === "calendar.person.unsubscribed") {
    return recordOptOut({
      address,
      list: "luma-calendar",
      source: "luma-webhook",
      sourceRef: webhookId,
      unsubscribedAt: at,
    });
  }
  if (payload.type === "calendar.person.subscribed") return recordResubscribe(address, "luma-calendar", at);
  return false;
}
