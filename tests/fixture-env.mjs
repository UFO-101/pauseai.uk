// The settings for a build on fixture data (DATA_FIXTURES=1): every outside
// service faked, and the keys set so pages that check for them don't show
// their "not configured" fallback. Shared by playwright.config.ts (this
// branch's build), scripts/serve-main.mjs (main's build), scripts/storyboard.mjs
// and the storyboard's tests, so every side is built and driven the same way.
//
// Plain JavaScript, not TypeScript, so the scripts can import it with Node.
import { tmpdir } from "node:os";
import { join } from "node:path";

/** This branch's build, under test. Not the dev server's port, so a running `npm run dev` is left alone. */
export const LOCAL_URL = process.env.LOCAL_URL ?? "http://localhost:3100";
/** Main's build (scripts/serve-main.mjs), for the storyboard's comparison. */
export const MAIN_URL = process.env.MAIN_URL ?? "http://localhost:3001";

/** Where the build under test writes its emails (tests/fixtures/outbox.ts). */
export const OUTBOX_DIR = process.env.OUTBOX_DIR ?? join(tmpdir(), "pauseai-storyboard-outbox");
/** Where main's fixture build (scripts/serve-main.mjs) writes its emails. */
export const MAIN_OUTBOX_DIR = join(tmpdir(), "pauseai-storyboard-main-outbox");

/** The test MPs' inbox in a fixture build. */
export const TEST_MP_EMAIL = "test-mp@example.org";

/**
 * The moment a fixture build thinks it is: the server (lib/now.ts and the
 * database's now(), tests/storyboard/global-setup.ts) and every page's clock
 * (tests/storyboard/fixtures.ts). After both flyering trackers' races, before
 * the march, and before the Luma fixture's upcoming events.
 */
export const FIXTURE_NOW = "2026-10-16T12:00:00.000Z";

/**
 * The storyboard gives each flow its own database, a copy of the template,
 * and names it in this cookie. A fixture build's lib/server/db.ts queries the
 * database the cookie names, if it has this prefix.
 */
export const FLOW_DATABASE_COOKIE = "storyboard_database";
export const FLOW_DATABASE_PREFIX = "pauseai_sb_";
/** The migrated template, with the test MPs, that each flow's database is copied from. Doesn't match the prefix: a cookie can't name it. */
export const TEMPLATE_DATABASE = "pauseai_storyboard_template";
/** The build's own database, for requests with no cookie. */
export const SERVER_DATABASE = "pauseai_storyboard";

/** @param {{ outboxDir: string }} options */
export function fixtureEnv({ outboxDir }) {
  return {
    DATA_FIXTURES: "1",
    FIXTURE_NOW,
    // Analytics loads only on the live site (lib/analytics.ts). The
    // storyboard turns it on to drive the cookie consent flow, and blocks
    // every request to Google (tests/storyboard/fixtures.ts).
    ANALYTICS: "1",
    LUMA_API_KEY: "fixture",
    AIRTABLE_TOKEN: "fixture",
    // Not one of Cloudflare's test secrets, which are refused outside
    // development. The Turnstile fixture passes every token.
    TURNSTILE_SECRET_KEY: "fixture",
    // Draws the widget, from a stand-in script the tests serve.
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "fixture",
    TEST_MP_EMAIL,
    CRON_SECRET: "fixture-cron-secret",
    POSTMARK_SERVER_TOKEN: "fixture",
    POSTMARK_WEBHOOK_USER: "postmark",
    POSTMARK_WEBHOOK_PASSWORD: "fixture-webhook-password",
    REPLIES_INBOX: "replies@example.org",
    // Each email sent is also written here (tests/fixtures/outbox.ts).
    OUTBOX_DIR: outboxDir,
  };
}
