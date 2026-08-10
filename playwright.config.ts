import { defineConfig, devices } from "@playwright/test";

// Compares the live site against a local build, page by page — not a
// stored-baseline snapshot test. LIVE_URL/LOCAL_URL are overridable so this
// can also compare a preview deploy against local, or two arbitrary hosts.
export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "html",
  use: {
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: process.env.LOCAL_URL ?? "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
