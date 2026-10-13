import { defineConfig, devices } from "@playwright/test";

// Two suites:
//
// - "visual" / "visual-mobile" compare the live site against a local build,
//   page by page, at desktop and phone widths — not a stored-baseline
//   snapshot test. LIVE_URL/LOCAL_URL are overridable so it can also compare
//   a preview deploy against local, or two arbitrary hosts. It needs the
//   local build to use live data too, so `npm run test:visual` sets
//   DATA_FIXTURES=0.
// - "behaviour" drives the local build directly to assert interaction that a
//   pixel diff cannot see: every route loading cleanly, scrolling, URL
//   integrity, the mobile nav. It runs on fixture data (DATA_FIXTURES=1, see
//   lib/outside-fetch.ts) so results don't depend on Luma or Airtable.
const DATA_FIXTURES = process.env.DATA_FIXTURES ?? "1";

// The behaviour suite's own database, made fresh each time the server is
// built. scripts/fresh-database.mjs prints its URL, for the build and the
// server to use. Never the real one.
const BEHAVIOUR_DATABASE = "pauseai_behaviour";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "html",
  use: {
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "visual",
      testDir: "./tests/visual",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "visual-mobile",
      testDir: "./tests/visual",
      // Chromium at an iPhone's size and touch settings, so it can share the
      // one installed browser.
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
    {
      name: "behaviour",
      testDir: "./tests/behaviour",
      // The homepage takes ~20s to load and hydrate in this harness, so the
      // 30s default leaves no headroom for the assertions after it.
      timeout: 60_000,
      // One worker per file rather than per test. The homepage is heavy
      // enough — a hero marquee of ~80 images, plus the request-time Luma
      // fetch — that several workers loading it at once starve the server
      // and time tests out on a site that is working perfectly well.
      fullyParallel: false,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command:
      DATA_FIXTURES === "1"
        ? `export NETLIFY_DB_URL="$(node scripts/fresh-database.mjs ${BEHAVIOUR_DATABASE})" && npm run build && npm run start`
        : "npm run build && npm run start",
    // Fixture data needs the keys set too, or the pages that check for them
    // (trackers, campaigns) show their "not configured" fallback instead.
    env:
      DATA_FIXTURES === "1"
        ? {
            DATA_FIXTURES,
            LUMA_API_KEY: "fixture",
            AIRTABLE_TOKEN: "fixture",
            AIRTABLE_WRITE_API_KEY: "fixture",
            // Not one of Cloudflare's test secrets, which are refused outside
            // development. The Turnstile fixture passes every token.
            TURNSTILE_SECRET_KEY: "fixture",
            // Draws the widget, from a stand-in script (tests/behaviour/email-your-mp.spec.ts).
            NEXT_PUBLIC_TURNSTILE_SITE_KEY: "fixture",
            TEST_MP_EMAIL: "test-mp@example.org",
            // The fixture Google's ID tokens are for this client.
            GOOGLE_CLIENT_ID: "fixture-client-id",
            GOOGLE_CLIENT_SECRET: "fixture",
            CRON_SECRET: "fixture-cron-secret",
          }
        : { DATA_FIXTURES },
    url: process.env.LOCAL_URL ?? "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    // CI always builds from cold (reuseExistingServer is off there), and a
    // cold `npm run build` on a runner is slower than on a warm laptop.
    timeout: 300_000,
  },
});
