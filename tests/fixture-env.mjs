// The settings for a build on fixture data (DATA_FIXTURES=1): every outside
// service faked, and the keys set so pages that check for them don't show
// their "not configured" fallback. Shared by playwright.config.ts (this
// branch's build) and scripts/serve-main.mjs (main's build), so both are
// built the same way.
//
// Plain JavaScript, not TypeScript, so the script can import it with Node.
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Where this branch's fixture build writes its emails. */
export const OUTBOX_DIR = join(tmpdir(), "pauseai-behaviour-outbox");
/** Where main's fixture build (scripts/serve-main.mjs) writes its emails. */
export const MAIN_OUTBOX_DIR = join(tmpdir(), "pauseai-fixtures-main-outbox");

/** @param {{ outboxDir: string }} options */
export function fixtureEnv({ outboxDir }) {
  return {
    DATA_FIXTURES: "1",
    LUMA_API_KEY: "fixture",
    AIRTABLE_TOKEN: "fixture",
    // Not one of Cloudflare's test secrets, which are refused outside
    // development. The Turnstile fixture passes every token.
    TURNSTILE_SECRET_KEY: "fixture",
    // Draws the widget, from a stand-in script the tests serve.
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "fixture",
    TEST_MP_EMAIL: "test-mp@example.org",
    CRON_SECRET: "fixture-cron-secret",
    POSTMARK_SERVER_TOKEN: "fixture",
    POSTMARK_WEBHOOK_USER: "postmark",
    POSTMARK_WEBHOOK_PASSWORD: "fixture-webhook-password",
    REPLIES_INBOX: "replies@example.org",
    // Each email sent is also written here (tests/fixtures/outbox.ts).
    OUTBOX_DIR: outboxDir,
  };
}
