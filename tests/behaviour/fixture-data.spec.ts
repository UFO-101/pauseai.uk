import { test, expect } from "@playwright/test";

// The behaviour suite runs on DATA_FIXTURES=1 (playwright.config.ts). This
// proves the pages really render tests/fixtures, not the live APIs, so the
// other tests are checking a known state.
const BASE = process.env.LOCAL_URL ?? "http://localhost:3100";

test.skip(process.env.DATA_FIXTURES === "0", "running against live data");

test("events come from the Luma fixture", async ({ page }) => {
  await page.goto(`${BASE}/events`);
  await expect(page.getByText("PauseAI London: Protest at Parliament")).toBeVisible();
});

test("a local group page shows its fixture events", async ({ page }) => {
  await page.goto(`${BASE}/manchester`);
  await expect(page.getByText("PauseAI Manchester Social")).toBeVisible();
});

test("the trackers count the fixture guest list", async ({ page }) => {
  await page.goto(`${BASE}/trackers/2026-10-10-flyering`);
  await expect(page.getByText(/check the Luma access settings/i)).toHaveCount(0);
});
