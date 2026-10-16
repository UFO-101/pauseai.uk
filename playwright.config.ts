import { defineConfig, devices } from "@playwright/test";
import { fixtureEnv, LOCAL_URL, OUTBOX_DIR, SERVER_DATABASE, TEST_MP_EMAIL } from "./tests/fixture-env.mjs";

// The storyboard (tests/storyboard/, docs/testing.md): one suite that drives
// the site's flows end to end on fixture data. Two ways to run it:
//
// - `npm run test:storyboard`, the gate, here and in CI: the desktop project
//   runs every flow, the phone project only those tagged @phone, and no
//   screenshots are taken.
// - `npm run storyboard` (scripts/storyboard.mjs), the review: both projects
//   run every flow with screenshots (STORYBOARD_SHOTS=1), against main as
//   well, and the reporter (tests/storyboard/report/) makes the page.
const SHOTS = process.env.STORYBOARD_SHOTS === "1";

// Set here, before the workers start, so the tests inherit it.
process.env.LOCAL_URL = LOCAL_URL;
const LOCAL_PORT = new URL(LOCAL_URL).port || "3000";

export default defineConfig({
  testDir: "./tests/storyboard",
  // Only the sections: report/*.test.ts are Vitest's.
  testMatch: /\.spec\.ts$/,
  // Every flow stands alone, on its own database, so they can run in any
  // order and alongside each other.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // A flaky flow is fixed, not retried (docs/testing.md).
  retries: 0,
  // The terminal, Playwright's own report (traces), and the storyboard's.
  reporter: [["list"], ["html", { open: "never" }], ["./tests/storyboard/report/reporter.ts"]],
  globalSetup: "./tests/storyboard/global-setup.ts",
  globalTeardown: "./tests/storyboard/global-teardown.ts",
  // The homepage takes a while to load and hydrate in this harness, so the
  // 30s default leaves no headroom for the checks after it.
  timeout: 60_000,
  use: {
    // For `npm run test:report`, to step through a failed flow.
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
      grepInvert: /@phone-only/,
    },
    {
      name: "phone",
      // Chromium at an iPhone's size and touch settings, so it can share the
      // one installed browser.
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
      grep: SHOTS ? undefined : /@phone/,
      grepInvert: /@desktop-only/,
    },
  ],
  webServer: {
    // A fresh database of its own, with the test MPs, for requests that carry
    // no flow's cookie (tests/storyboard/fixtures.ts). Never the real one.
    // `next build` directly, as scripts/serve-main.mjs builds main: `npm run
    // build` runs the unit tests and the linters first, which CI's other job
    // and the pre-commit hook already do.
    command: `export NETLIFY_DB_URL="$(node scripts/fresh-database.mjs ${SERVER_DATABASE} --test-mp ${TEST_MP_EMAIL})" && npx next build && npx next start --port ${LOCAL_PORT}`,
    env: fixtureEnv({ outboxDir: OUTBOX_DIR }),
    url: LOCAL_URL,
    reuseExistingServer: !process.env.CI,
    // CI always builds from cold (reuseExistingServer is off there), and a
    // cold `next build` on a runner is slower than on a warm laptop.
    timeout: 300_000,
  },
});
