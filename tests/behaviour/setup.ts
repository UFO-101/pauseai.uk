import type { APIRequestContext } from "@playwright/test";
import { readOutbox } from "../fixtures/outbox";

// Helpers shared by the behaviour tests that need data in the database.
export const BASE = process.env.LOCAL_URL ?? "http://localhost:3000";

/**
 * Copies the fixture MPs from Parliament into the behaviour database, and
 * adds the test MP, through the nightly sync's own route.
 */
export async function syncFixtureMps(request: APIRequestContext) {
  const res = await request.post(`${BASE}/api/cron/sync-mps`, { headers: { Authorization: "Bearer fixture-cron-secret" } });
  if (!res.ok()) throw new Error(`MP sync failed: ${res.status()} ${await res.text()}`);
}

// Where the behaviour build writes each email it sends (tests/fixtures/outbox.ts).
import { OUTBOX_DIR } from "../fixture-env.mjs";
export { OUTBOX_DIR };

type OutboxEmail = { From: string; To: string; ReplyTo?: string; Subject: string; TextBody: string; Attachments?: { Name: string; Content: string }[] };

/** The newest email sent to `to`. */
export function newestEmailTo(to: string): OutboxEmail | undefined {
  return (readOutbox(OUTBOX_DIR) as OutboxEmail[]).filter((email) => email.To === to).at(-1);
}

/** Basic auth for the Postmark webhooks, as the behaviour build is configured. */
export const WEBHOOK_AUTH = `Basic ${Buffer.from("postmark:fixture-webhook-password").toString("base64")}`;
