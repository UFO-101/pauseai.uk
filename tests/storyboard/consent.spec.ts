import type { Page } from "@playwright/test";
import { ANALYTICS_URL, BASE, expect, frame, story, test } from "./fixtures";

// Cookie consent across pages. The banner itself, and what each button does on
// the page, are tested in components/layout/layout.browser.test.tsx. This file
// covers what a component test can't: that the choice is remembered from one
// page to the next, on a real build and a real host.

const CONSENT_KEY = "pauseai-cookie-consent";
const GA_DISABLED = "ga-disable-G-DLLRWZCYD7";

// The fixtures block analytics for every flow; this records whether the page
// tried to load it, which is what consent is about.
async function analyticsRequests(page: Page) {
  const requested: string[] = [];
  await page.route(ANALYTICS_URL, (route) => {
    requested.push(route.request().url());
    return route.abort();
  });
  return requested;
}

const banner = (page: Page) => page.getByRole("dialog", { name: "Cookie consent" });

async function choose(page: Page, choice: "Accept" | "Decline") {
  await page.getByRole("link", { name: "Cookie settings" }).click();
  await frame(page, "The cookie banner");
  await banner(page).getByRole("button", { name: choice }).click();
  await expect(banner(page)).toHaveCount(0);
}

test("Declining cookies", { tag: "@phone" }, async ({ page }) => {
  story("Someone opens the privacy page. They haven't chosen yet, so analytics load.");
  const requested = await analyticsRequests(page);
  await page.goto(`${BASE}/privacy`);
  await expect.poll(() => requested.length).toBeGreaterThan(0);
  await frame(page, "The privacy page");
  story("They open Cookie settings at the foot of the page, and decline.");
  await choose(page, "Decline");
  await frame(page, "The privacy page, after declining");
  story(
    "Analytics stay off as they move around the site. On the next page they load, the banner doesn't come back and analytics don't load.",
  );

  // Moving within the site: analytics stays switched off.
  await page.locator('a[href^="/governance"]').first().dispatchEvent("click");
  await expect(page).toHaveURL(/\/governance\/?$/);
  expect(await page.evaluate((key) => (window as unknown as Record<string, unknown>)[key], GA_DISABLED)).toBe(true);

  // A fresh page load never fetches it.
  requested.length = 0;
  await page.goto(`${BASE}/what-is-pauseai-uk`, { waitUntil: "load" });
  expect(requested).toEqual([]);
  expect(await page.evaluate((key) => localStorage.getItem(key), CONSENT_KEY)).toBe("declined");
  await frame(page, "The next page");
});

test("Declining clears the analytics cookies", async ({ page, context }) => {
  story("Someone who already has Google Analytics cookies declines. By the next page, those cookies are gone.");
  await analyticsRequests(page);
  await page.goto(`${BASE}/privacy`);
  const { hostname } = new URL(page.url());
  await context.addCookies([
    { name: "_ga", value: "GA1.1.123", domain: hostname, path: "/" },
    { name: "_ga_DLLRWZCYD7", value: "GS1.1.456", domain: hostname, path: "/" },
    { name: "_gid", value: "GA1.1.789", domain: hostname, path: "/" },
  ]);
  await choose(page, "Decline");

  await page.goto(`${BASE}/what-is-pauseai-uk`, { waitUntil: "load" });
  const names = (await context.cookies()).map((c) => c.name);
  expect(names.filter((n) => n.startsWith("_ga") || n === "_gid")).toEqual([]);
});

test("Accepting after declining", async ({ page }) => {
  story(
    "Someone declined cookies on an earlier visit. Analytics stay off when they come back, until they open Cookie settings and accept.",
  );
  await page.addInitScript((key) => {
    // Only the first visit has declined; after that the page's own choice stands.
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem(key, "declined");
      sessionStorage.setItem("seeded", "1");
    }
  }, CONSENT_KEY);
  const requested = await analyticsRequests(page);
  await page.goto(`${BASE}/privacy`, { waitUntil: "load" });
  expect(requested).toEqual([]);
  await choose(page, "Accept");
  await expect.poll(() => requested.length).toBeGreaterThan(0);
  await frame(page, "The privacy page, after accepting");
  story("Analytics load straight away, and on the next page too.");

  requested.length = 0;
  await page.goto(`${BASE}/what-is-pauseai-uk`);
  await expect.poll(() => requested.length).toBeGreaterThan(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), CONSENT_KEY)).toBe("accepted");
});

test("No analytics on the tools", async ({ page }) => {
  story("Someone accepts cookies, then opens the tools pages. The tools load no analytics all the same.");
  const requested = await analyticsRequests(page);
  await page.goto(`${BASE}/privacy`);
  await choose(page, "Accept");
  requested.length = 0;

  for (const path of ["/tools", "/tools/qr", "/tools/collateral"]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "load" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  await frame(page, "The collateral maker");
  expect(requested).toEqual([]);
});
