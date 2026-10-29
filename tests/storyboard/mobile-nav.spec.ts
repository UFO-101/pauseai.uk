import type { Page } from "@playwright/test";
import { BASE, expect, frame, test } from "./fixtures";
import { hydrated } from "./settle";

// The burger menu is the only navigation below 1024px, so a regression here
// strands every phone visitor on whatever page they landed on. What the
// stylesheet (components/layout/Nav.module.css) depends on is asserted here
// explicitly:
//
//   the burger's aria-expanded  drives its own open/closed styling
//   the nav's open class        shows the menu, and locks background
//                               scrolling behind it (body:has())
//   --site-header-h             positions the menu panel below the header
//
// Phone only (@phone-only): the phone project's touch emulation is what the
// dropdown code branches on (matchMedia("(hover: none)")).

async function openPage(page: Page, path = "/donate") {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await hydrated(page);
}

const burger = (page: Page) => page.getByRole("button", { name: "Menu" });
// By element: closed, the menu is out of the accessibility tree.
const nav = (page: Page) => page.locator("header nav");
// A dropdown's trigger, by its place in the nav, and the item around it.
const trigger = (page: Page, i: number) => nav(page).locator("[aria-haspopup]").nth(i);
const item = (page: Page, i: number) => trigger(page, i).locator("..");
const bodyHasLock = (page: Page) => page.evaluate(() => getComputedStyle(document.body).overflow === "hidden");

test.describe("mobile nav", { tag: "@phone-only" }, () => {
  test("Starts closed", async ({ page }) => {
    await openPage(page);

    await expect(burger(page)).toBeVisible();
    await expect(nav(page)).toBeHidden();
    await expect(burger(page)).toHaveAttribute("aria-expanded", "false");
    expect(await bodyHasLock(page)).toBe(false);
    await frame(page, "the menu closed");
  });

  test("Open the menu: the page behind can't scroll", async ({ page }) => {
    await openPage(page);

    await burger(page).click();

    await expect(nav(page)).toBeVisible();
    await expect(burger(page)).toHaveAttribute("aria-expanded", "true");
    expect(await bodyHasLock(page)).toBe(true);
    await frame(page, "the menu open");
  });

  test("Close the menu", async ({ page }) => {
    await openPage(page);

    await burger(page).click();
    await expect(nav(page)).toBeVisible();

    await burger(page).click();

    await expect(nav(page)).toBeHidden();
    await expect(burger(page)).toHaveAttribute("aria-expanded", "false");
    expect(await bodyHasLock(page)).toBe(false);
  });

  test("The menu sits below the header", async ({ page }) => {
    await openPage(page);

    await burger(page).click();
    await expect(nav(page)).toBeVisible();

    const { headerBottom, navTop } = await page.evaluate(() => {
      const header = document.querySelector("header") as HTMLElement;
      const panel = document.querySelector("header nav") as HTMLElement;
      return {
        headerBottom: header.getBoundingClientRect().bottom,
        navTop: panel.getBoundingClientRect().top,
      };
    });
    expect(Math.abs(navTop - headerBottom)).toBeLessThan(2);
  });

  test("Tap a link: the menu closes and the page opens", async ({ page }) => {
    await openPage(page);

    await burger(page).click();
    await expect(nav(page)).toBeVisible();

    await nav(page).getByRole("link", { name: "Blog", exact: true }).click();

    await expect.poll(() => page.url(), { timeout: 15_000 }).toMatch(/\/blog\/?$/);
    await expect(nav(page)).toBeHidden();
    await expect(burger(page)).toHaveAttribute("aria-expanded", "false");
    await frame(page, "after tapping Blog in the menu");
  });

  test("After following a link, the page scrolls again", async ({ page }) => {
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

  test("Tap a dropdown: its submenu opens", async ({ page }) => {
    await openPage(page);
    const urlBefore = page.url();

    await burger(page).click();
    await trigger(page, 0).click();

    await expect(trigger(page, 0)).toHaveAttribute("aria-expanded", "true");
    await expect(item(page, 0).getByRole("menuitem", { name: "Track record" })).toBeVisible();
    expect(page.url()).toBe(urlBefore);
    await frame(page, "the About dropdown open");
  });

  test("Open a second dropdown: the first closes", async ({ page }) => {
    await openPage(page);

    await burger(page).click();
    await trigger(page, 0).click();
    await expect(trigger(page, 0)).toHaveAttribute("aria-expanded", "true");

    await trigger(page, 1).click();

    await expect(trigger(page, 1)).toHaveAttribute("aria-expanded", "true");
    await expect(item(page, 1).getByRole("menuitem").first()).toBeVisible();
    await expect(trigger(page, 0)).toHaveAttribute("aria-expanded", "false");
    await expect(item(page, 0).getByRole("menuitem").first()).toBeHidden();
    await frame(page, "the Local groups dropdown open, About closed");
  });

  test("Tap an open dropdown: it closes", async ({ page }) => {
    await openPage(page);

    await burger(page).click();
    await trigger(page, 0).click();
    await expect(trigger(page, 0)).toHaveAttribute("aria-expanded", "true");

    await trigger(page, 0).click();
    await expect(trigger(page, 0)).toHaveAttribute("aria-expanded", "false");
    await expect(item(page, 0).getByRole("menuitem").first()).toBeHidden();
  });
});
