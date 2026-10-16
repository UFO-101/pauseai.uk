import type { Page } from "@playwright/test";
import { BASE, expect, frame, test } from "./fixtures";

// Cookie consent across pages. The banner itself, and what each button does on
// the page, are tested in components/layout/layout.browser.test.tsx. This file
// covers what a component test can't: that the choice is remembered from one
// page to the next, on a real build and a real host.

const CONSENT_KEY = "pauseai-cookie-consent";
const GA_DISABLED = "ga-disable-G-DLLRWZCYD7";

// Analytics must never really fire from tests. Blocking it also records
// whether the page tried to load it, which is what consent is about.
async function analyticsRequests(page: Page) {
  const requested: string[] = [];
  await page.route("**/www.googletagmanager.com/**", (route) => {
    requested.push(route.request().url());
    return route.abort();
  });
  return requested;
}

const banner = (page: Page) => page.getByRole("dialog", { name: "Cookie consent" });

async function choose(page: Page, choice: "Accept" | "Decline") {
  await page.getByRole("link", { name: "Cookie settings" }).click();
  await frame(page, "the cookie banner");
  await banner(page).getByRole("button", { name: choice }).click();
  await expect(banner(page)).toHaveCount(0);
}

test(
  "declining is remembered on the next page, and a later visit loads no analytics",
  { tag: "@phone" },
  async ({ page }) => {
    const requested = await analyticsRequests(page);
    await page.goto(`${BASE}/privacy`);
    await expect.poll(() => requested.length).toBeGreaterThan(0);
    await frame(page, "the privacy page, before any choice");
    await choose(page, "Decline");
    await frame(page, "declined");

    // Moving within the site: analytics stays switched off.
    await page.locator('a[href^="/governance"]').first().dispatchEvent("click");
    await expect(page).toHaveURL(/\/governance\/?$/);
    expect(await page.evaluate((key) => (window as unknown as Record<string, unknown>)[key], GA_DISABLED)).toBe(true);

    // A fresh page load never fetches it.
    requested.length = 0;
    await page.goto(`${BASE}/what-is-pauseai-uk`, { waitUntil: "load" });
    expect(requested).toEqual([]);
    expect(await page.evaluate((key) => localStorage.getItem(key), CONSENT_KEY)).toBe("declined");
    await frame(page, "the next page: no banner, no analytics");
  },
);

test("declining removes the analytics cookies for good", async ({ page, context }) => {
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

test("accepting after declining turns analytics back on, on later pages too", async ({ page }) => {
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
  await frame(page, "accepted");

  requested.length = 0;
  await page.goto(`${BASE}/what-is-pauseai-uk`);
  await expect.poll(() => requested.length).toBeGreaterThan(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), CONSENT_KEY)).toBe("accepted");
});

test("the tools never load analytics, whatever was chosen", async ({ page }) => {
  const requested = await analyticsRequests(page);
  await page.goto(`${BASE}/privacy`);
  await choose(page, "Accept");
  requested.length = 0;

  for (const path of ["/tools", "/tools/qr", "/tools/collateral"]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "load" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  await frame(page, "a tool, with analytics accepted: none loaded");
  expect(requested).toEqual([]);
});
