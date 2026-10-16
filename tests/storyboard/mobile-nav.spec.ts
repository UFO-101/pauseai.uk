import type { Page } from "@playwright/test";
import { BASE, expect, frame, test } from "./fixtures";

// The burger menu is the only navigation below 1024px, so a regression here
// strands every phone visitor on whatever page they landed on. The classes
// and attributes the stylesheet depends on are asserted here explicitly:
//
//   .burger[aria-expanded]  drives the burger's own open/closed styling
//   nav.open                shows the menu, and locks background scrolling
//                           behind it (body:has(), in globals.css)
//   --site-header-h         positions the menu panel below the header
//
// Phone only (@phone-only): the phone project's touch emulation is what the
// dropdown code branches on (matchMedia("(hover: none)")).

async function openPage(page: Page, path = "/donate") {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  // Nav's effect sets --site-header-h, so this doubles as a hydration signal.
  // Polled on a timer rather than the default requestAnimationFrame, which
  // can stall in a backgrounded headless context and time out on a page that
  // has in fact hydrated.
  await page.waitForFunction(
    () => getComputedStyle(document.documentElement).getPropertyValue("--site-header-h").trim() !== "",
    undefined,
    { polling: 200, timeout: 20_000 },
  );
}

const burger = (page: Page) => page.locator(".burger");
const nav = (page: Page) => page.locator("header.site-header nav");
const bodyHasLock = (page: Page) => page.evaluate(() => getComputedStyle(document.body).overflow === "hidden");

test.describe("mobile nav", { tag: "@phone-only" }, () => {
  test("starts closed", async ({ page }) => {
    await openPage(page);

    await expect(burger(page)).toBeVisible();
    await expect(nav(page)).toBeHidden();
    await expect(burger(page)).toHaveAttribute("aria-expanded", "false");
    expect(await bodyHasLock(page)).toBe(false);
    await frame(page, "the menu closed");
  });

  test("the burger opens the menu and locks background scrolling", async ({ page }) => {
    await openPage(page);

    await burger(page).click();

    await expect(nav(page)).toBeVisible();
    await expect(burger(page)).toHaveAttribute("aria-expanded", "true");
    expect(await bodyHasLock(page)).toBe(true);
    await frame(page, "the menu open");
  });

  test("the burger closes the menu again", async ({ page }) => {
    await openPage(page);

    await burger(page).click();
    await expect(nav(page)).toBeVisible();

    await burger(page).click();

    await expect(nav(page)).toBeHidden();
    await expect(burger(page)).toHaveAttribute("aria-expanded", "false");
    expect(await bodyHasLock(page)).toBe(false);
  });

  test("the menu panel sits below the header, not under it", async ({ page }) => {
    await openPage(page);

    await burger(page).click();
    await expect(nav(page)).toBeVisible();

    const { headerBottom, navTop } = await page.evaluate(() => {
      const header = document.querySelector(".site-header") as HTMLElement;
      const panel = document.querySelector("header.site-header nav") as HTMLElement;
      return {
        headerBottom: header.getBoundingClientRect().bottom,
        navTop: panel.getBoundingClientRect().top,
      };
    });
    expect(Math.abs(navTop - headerBottom)).toBeLessThan(2);
  });

  test("tapping a link closes the menu and navigates", async ({ page }) => {
    await openPage(page);

    await burger(page).click();
    await expect(nav(page)).toBeVisible();

    await nav(page).getByRole("link", { name: "Blog", exact: true }).click();

    await expect.poll(() => page.url(), { timeout: 15_000 }).toMatch(/\/blog\/?$/);
    await expect(nav(page)).toBeHidden();
    await expect(burger(page)).toHaveAttribute("aria-expanded", "false");
    await frame(page, "after tapping Blog in the menu");
  });

  test("background scrolling is released after navigating with the menu open", async ({ page }) => {
    // The header stays mounted across pages, and the new page starts with the
    // menu closed. If that regresses, the page you land on cannot be scrolled.
    await openPage(page);

    await burger(page).click();
    await expect(nav(page)).toBeVisible();
    await nav(page).getByRole("link", { name: "Blog", exact: true }).click();
    await expect.poll(() => page.url(), { timeout: 15_000 }).toMatch(/\/blog\/?$/);

    expect(await bodyHasLock(page)).toBe(false);

    await page.evaluate(() => window.scrollTo(0, 400));
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });

  test("a dropdown trigger opens its submenu instead of navigating", async ({ page }) => {
    await openPage(page);
    const urlBefore = page.url();

    await burger(page).click();
    const about = nav(page).locator(".nav-item.has-dropdown").first();
    await about.locator(".dropdown-trigger").click();

    await expect(about).toHaveClass(/is-open/);
    await expect(about.locator(".dropdown-trigger")).toHaveAttribute("aria-expanded", "true");
    await expect(about.getByRole("menuitem", { name: "Track record" })).toBeVisible();
    expect(page.url()).toBe(urlBefore);
    await frame(page, "the About dropdown open");
  });

  test("opening a second dropdown closes the first", async ({ page }) => {
    await openPage(page);

    await burger(page).click();
    const items = nav(page).locator(".nav-item.has-dropdown");
    const about = items.first();
    const localGroups = items.nth(1);

    await about.locator(".dropdown-trigger").click();
    await expect(about).toHaveClass(/is-open/);

    await localGroups.locator(".dropdown-trigger").click();

    await expect(localGroups).toHaveClass(/is-open/);
    await expect(about).not.toHaveClass(/is-open/);
    await expect(about.locator(".dropdown-trigger")).toHaveAttribute("aria-expanded", "false");
    await frame(page, "the Local groups dropdown open, About closed");
  });

  test("a second tap on an open dropdown closes it", async ({ page }) => {
    await openPage(page);

    await burger(page).click();
    const about = nav(page).locator(".nav-item.has-dropdown").first();

    await about.locator(".dropdown-trigger").click();
    await expect(about).toHaveClass(/is-open/);

    await about.locator(".dropdown-trigger").click();
    await expect(about).not.toHaveClass(/is-open/);
  });
});
