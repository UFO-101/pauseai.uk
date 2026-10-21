import { createHmac } from "node:crypto";

// Builds requests to the Luma webhook route, signed as Luma signs them
// (lib/server/luma-webhooks.ts), for its tests and the storyboard.

/** The secret a fixture build and the tests are configured with. */
export const LUMA_WEBHOOK_SECRET = "fixture-luma-webhook-secret";

/** Luma's Webhook-Signature header for `body`, sent at `at`. */
export function lumaSignature(body: string, at: Date, secret = LUMA_WEBHOOK_SECRET): string {
  const timestamp = Math.floor(at.getTime() / 1000);
  return `t=${timestamp},v1=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`;
}

/** The headers Luma sends with a webhook: its ID, and the signature over `body`. */
export function lumaWebhookHeaders(body: string, at: Date, webhookId = "msg_1"): Record<string, string> {
  return {
    "content-type": "application/json",
    "webhook-id": webhookId,
    "webhook-timestamp": String(Math.floor(at.getTime() / 1000)),
    "webhook-signature": lumaSignature(body, at),
  };
}

/** A calendar.person.unsubscribed or .subscribed payload for `email`. */
export function lumaPersonWebhook(type: "calendar.person.unsubscribed" | "calendar.person.subscribed", email: string) {
  return {
    type,
    data: {
      id: "usr-1",
      created_at: "2026-10-01T10:00:00.000Z",
      event_approved_count: 1,
      event_checked_in_count: 0,
      revenue_usd_cents: 0,
      tags: [],
      membership: null,
      email,
      user: { id: "usr-1", name: "Jane", avatar_url: "", email, first_name: "Jane", last_name: null },
    },
  };
}
