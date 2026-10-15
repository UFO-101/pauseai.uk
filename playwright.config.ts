import { defineConfig, devices } from "@playwright/test";
import { fixtureEnv, OUTBOX_DIR } from "./tests/fixture-env.mjs";

// Three suites:
//
// - "public-vs-live-desktop" / "public-vs-live-mobile" compare the public pages of
//   the live site against a local build, page by page, at desktop and phone
//   widths (never /staff, which needs a login) — not a stored-baseline
//   snapshot test. LIVE_URL/LOCAL_URL are overridable so it can also compare
//   a preview deploy against local, or two arbitrary hosts. It needs the
//   local build to use live data too, so `npm run test:public-vs-live` sets
//   DATA_FIXTURES=0.
// - "behaviour" drives the local build directly to assert interaction that a
//   pixel diff cannot see: every route loading cleanly, scrolling, URL
//   integrity, the mobile nav. It runs on fixture data (DATA_FIXTURES=1, see
//   lib/outside-fetch.ts) so results don't depend on Luma or Airtable.
// - "fixtures-vs-main-desktop" / "fixtures-vs-main-mobile" screenshot each
//   page and each step of the flows on this branch and on main, both on
//   fixture data, and attach the two and their diff to the report. Only the
//   behaviour checks along the way can fail; a difference never does. Run by
//   `npm run test:fixtures-vs-main`, which also builds and serves main
//   (scripts/serve-main.mjs).
const DATA_FIXTURES = process.env.DATA_FIXTURES ?? "1";
const FIXTURES_VS_MAIN = process.env.FIXTURES_VS_MAIN === "1";

// The build under test gets its own port, not the dev server's 3000, so a
// running `npm run dev` is never mistaken for it. Set here, before the
// workers start, so the tests (which read LOCAL_URL) inherit it.
process.env.LOCAL_URL ??= "http://localhost:3100";
const LOCAL_URL = process.env.LOCAL_URL;
const LOCAL_PORT = new URL(LOCAL_URL).port || "3000";

// The behaviour suite's own database, made fresh each time the server is
// built. scripts/fresh-database.mjs prints its URL, for the build and the
// server to use. Never the real one.
const BEHAVIOUR_DATABASE = "pauseai_behaviour";
// The fixtures-vs-main diff's branch build has its own, so it starts in the
// same state as main's, whatever the behaviour tests have done to theirs.
const FIXTURES_BRANCH_DATABASE = "pauseai_fixtures_branch";
// The public-vs-live diff's local build has its own, with only the test MP in it:
// enough for tests/public-vs-live/email-your-mp.spec.ts, without copying every MP
// from Parliament.
const VISUAL_DATABASE = "pauseai_visual";
// Only so the local test MP has an email, like live's, and shows the form.
// The diff masks the address itself.
const VISUAL_TEST_MP_EMAIL = "test-mp@example.org";

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
      name: "public-vs-live-desktop",
      testDir: "./tests/public-vs-live",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "public-vs-live-mobile",
      testDir: "./tests/public-vs-live",
      // Chromium at an iPhone's size and touch settings, so it can share the
      // one installed browser.
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
    {
      name: "fixtures-vs-main-desktop",
      testDir: "./tests/fixtures-vs-main",
      fullyParallel: false,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "fixtures-vs-main-mobile",
      testDir: "./tests/fixtures-vs-main",
      fullyParallel: false,
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
      // A trace of every test, passing or not, to step through in the report
      // (`npm run test:report`; the trace viewer needs that server).
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, trace: "on" },
    },
  ],
  webServer: [
    {
      command: `export NETLIFY_DB_URL="$(node scripts/fresh-database.mjs ${
        DATA_FIXTURES !== "1"
          ? `${VISUAL_DATABASE} --test-mp ${VISUAL_TEST_MP_EMAIL}`
          : FIXTURES_VS_MAIN
            ? `${FIXTURES_BRANCH_DATABASE} --test-mp test-mp@example.org`
            : BEHAVIOUR_DATABASE
      })" && npm run build && npm run start -- --port ${LOCAL_PORT}`,
      // Fixture data needs the keys set too, or the pages that check for them
      // (trackers, campaigns) show their "not configured" fallback instead.
      // The public-vs-live build gets a Turnstile site key like live's, so both
      // draw the widget, from the same stand-in script (tests/steps.ts).
      env:
        DATA_FIXTURES === "1"
          ? fixtureEnv({ outboxDir: OUTBOX_DIR })
          : { DATA_FIXTURES, NEXT_PUBLIC_TURNSTILE_SITE_KEY: "fixture" },
      url: LOCAL_URL,
      reuseExistingServer: !process.env.CI,
      // CI always builds from cold (reuseExistingServer is off there), and a
      // cold `npm run build` on a runner is slower than on a warm laptop.
      timeout: 300_000,
    },
    // Main's build, beside this branch's, for the fixtures-vs-main diff.
    ...(FIXTURES_VS_MAIN
      ? [
          {
            command: "node scripts/serve-main.mjs --port 3001",
            url: process.env.MAIN_URL ?? "http://localhost:3001",
            reuseExistingServer: true,
            // The first run installs main's dependencies as well as building it.
            timeout: 900_000,
          },
        ]
      : []),
  ],
});
