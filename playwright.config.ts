import { defineConfig, devices } from "@playwright/test";

// Two suites:
//
// - "visual" compares the live site against a local build, page by page — not
//   a stored-baseline snapshot test. LIVE_URL/LOCAL_URL are overridable so it
//   can also compare a preview deploy against local, or two arbitrary hosts.
// - "behaviour" drives the local build directly to assert interaction that a
//   pixel diff cannot see: scrolling, URL integrity, the mobile nav.
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
    command: "npm run build && npm run start",
    url: process.env.LOCAL_URL ?? "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    // CI always builds from cold (reuseExistingServer is off there), and a
    // cold `npm run build` on a runner is slower than on a warm laptop.
    timeout: 300_000,
  },
});
