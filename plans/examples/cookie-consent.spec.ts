// Example only: the Playwright style from plans/test-coverage.md (phase 3).
// Under that plan, most of these tests move to Vitest Browser Mode. Only the
// ones that span pages (e.g. "declined, then navigate") stay in Playwright.
// It needs the site built with DATA_FIXTURES=1 (phase 1).
//
// Would live at tests/behaviour/cookie-consent.spec.ts.

import { test, expect, type Page } from "@playwright/test";

const CONSENT_KEY = "pauseai-cookie-consent";

// Analytics must never really fire from tests. Blocking it also lets us
// assert whether the page *tried* to load it, which is the point of consent.
async function trackAnalyticsRequests(page: Page) {
  const requested: string[] = [];
  await page.route("**/googletagmanager.com/**", (route) => {
    requested.push(route.request().url());
    return route.abort();
  });
  return requested;
}

const banner = (page: Page) => page.getByRole("dialog", { name: "Cookie consent" });

async function openBanner(page: Page) {
  await page.getByRole("link", { name: "Cookie settings" }).click();
  await expect(banner(page)).toBeVisible();
}

test.describe("cookie consent", () => {
  test("loads analytics by default, with no banner", async ({ page }) => {
    const requested = await trackAnalyticsRequests(page);
    await page.goto("/privacy");

    await expect(banner(page)).toHaveCount(0);
    await expect.poll(() => requested.length).toBeGreaterThan(0);
  });

  test("the footer link opens the banner", async ({ page }) => {
    await trackAnalyticsRequests(page);
    await page.goto("/privacy");
    await openBanner(page);

    await expect(banner(page).getByRole("button", { name: "Accept" })).toBeVisible();
    await expect(banner(page).getByRole("button", { name: "Decline" })).toBeVisible();
    await expect(banner(page).getByRole("link", { name: "privacy policy" })).toHaveAttribute("href", "/privacy");
  });

  test("declining is remembered and stops analytics on the next page", async ({ page }) => {
    const requested = await trackAnalyticsRequests(page);
    await page.goto("/privacy");
    await openBanner(page);
    await banner(page).getByRole("button", { name: "Decline" }).click();

    await expect(banner(page)).toHaveCount(0);
    expect(await page.evaluate((k) => localStorage.getItem(k), CONSENT_KEY)).toBe("declined");

    requested.length = 0;
    await page.goto("/");
    await page.waitForLoadState("load");
    expect(requested).toEqual([]);
  });

  test("declining clears existing GA cookies", async ({ page, context }) => {
    await trackAnalyticsRequests(page);
    await page.goto("/privacy");
    const { hostname } = new URL(page.url());
    await context.addCookies([
      { name: "_ga", value: "GA1.1.123", domain: hostname, path: "/" },
      { name: "_gid", value: "GA1.1.456", domain: hostname, path: "/" },
    ]);

    await openBanner(page);
    await banner(page).getByRole("button", { name: "Decline" }).click();

    const names = (await context.cookies()).map((c) => c.name);
    expect(names).not.toContain("_ga");
    expect(names).not.toContain("_gid");
  });

  test("accepting after declining turns analytics back on", async ({ page }) => {
    await page.addInitScript((k) => localStorage.setItem(k, "declined"), CONSENT_KEY);
    const requested = await trackAnalyticsRequests(page);
    await page.goto("/privacy");
    expect(requested).toEqual([]);

    await openBanner(page);
    await banner(page).getByRole("button", { name: "Accept" }).click();

    await expect(banner(page)).toHaveCount(0);
    await expect.poll(() => requested.length).toBeGreaterThan(0);
    expect(await page.evaluate((k) => localStorage.getItem(k), CONSENT_KEY)).toBe("accepted");
  });

  test("still works when storage is blocked", async ({ page }) => {
    // Covers the try/catch branches in readConsent/writeConsent. No ignore
    // comments allowed, so the branch gets a real test.
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("blocked", "SecurityError");
        },
      });
    });
    await trackAnalyticsRequests(page);
    await page.goto("/privacy");
    await openBanner(page);
    await banner(page).getByRole("button", { name: "Decline" }).click();

    await expect(banner(page)).toHaveCount(0);
  });

  test("pages that opt out of analytics never load it", async ({ page }) => {
    // NoAnalytics sets data-no-analytics on <body>; the tools and trackers
    // render it.
    const requested = await trackAnalyticsRequests(page);
    await page.goto("/tools/collateral");
    await page.waitForLoadState("load");

    expect(requested).toEqual([]);
  });
});
