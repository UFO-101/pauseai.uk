import type { Page } from "@playwright/test";
import { BASE, expect, frame, story, test } from "./fixtures";
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
  test("The menu, closed", async ({ page }) => {
    story("On a phone, the site's links are behind the Menu button. When a page opens, the menu is closed.");
    await openPage(page);

    await expect(burger(page)).toBeVisible();
    await expect(nav(page)).toBeHidden();
    await expect(burger(page)).toHaveAttribute("aria-expanded", "false");
    expect(await bodyHasLock(page)).toBe(false);
    await frame(page, "The menu, closed");
  });

  test("Opening the menu", async ({ page }) => {
    story("Tapping Menu opens the menu. The page behind it can't be scrolled while it's open.");
    await openPage(page);

    await burger(page).click();

    await expect(nav(page)).toBeVisible();
    await expect(burger(page)).toHaveAttribute("aria-expanded", "true");
    expect(await bodyHasLock(page)).toBe(true);
    await frame(page, "The menu, open");
  });

  test("Closing the menu", async ({ page }) => {
    story("Tapping Menu again closes it, and the page scrolls again.");
    await openPage(page);

    await burger(page).click();
    await expect(nav(page)).toBeVisible();

    await burger(page).click();

    await expect(nav(page)).toBeHidden();
    await expect(burger(page)).toHaveAttribute("aria-expanded", "false");
    expect(await bodyHasLock(page)).toBe(false);
  });

  test("Where the menu opens", async ({ page }) => {
    story("The open menu starts right at the foot of the header, with no gap and no overlap.");
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

  test("Following a link", async ({ page }) => {
    story("Tapping Blog in the menu opens the blog, with the menu closed.");
    await openPage(page);

    await burger(page).click();
    await expect(nav(page)).toBeVisible();

    await nav(page).getByRole("link", { name: "Blog", exact: true }).click();

    await expect.poll(() => page.url(), { timeout: 15_000 }).toMatch(/\/blog\/?$/);
    await expect(nav(page)).toBeHidden();
    await expect(burger(page)).toHaveAttribute("aria-expanded", "false");
    await frame(page, "The blog");
  });

  test("Scrolling after following a link", async ({ page }) => {
    story("The page a link in the menu opens can be scrolled. The menu doesn't leave it stuck.");
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

  test("Opening a submenu", async ({ page }) => {
    story("Tapping About in the menu opens its list of pages, such as Track record, without leaving the page.");
    await openPage(page);
    const urlBefore = page.url();

    await burger(page).click();
    await trigger(page, 0).click();

    await expect(trigger(page, 0)).toHaveAttribute("aria-expanded", "true");
    await expect(item(page, 0).getByRole("menuitem", { name: "Track record" })).toBeVisible();
    expect(page.url()).toBe(urlBefore);
    await frame(page, "About, open");
  });

  test("Opening another submenu", async ({ page }) => {
    story("With About open, tapping Local groups opens that list and closes About.");
    await openPage(page);

    await burger(page).click();
    await trigger(page, 0).click();
    await expect(trigger(page, 0)).toHaveAttribute("aria-expanded", "true");

    await trigger(page, 1).click();

    await expect(trigger(page, 1)).toHaveAttribute("aria-expanded", "true");
    await expect(item(page, 1).getByRole("menuitem").first()).toBeVisible();
    await expect(trigger(page, 0)).toHaveAttribute("aria-expanded", "false");
    await expect(item(page, 0).getByRole("menuitem").first()).toBeHidden();
    await frame(page, "Local groups, open");
  });

  test("Closing a submenu", async ({ page }) => {
    story("Tapping About again closes its list.");
    await openPage(page);

    await burger(page).click();
    await trigger(page, 0).click();
    await expect(trigger(page, 0)).toHaveAttribute("aria-expanded", "true");

    await trigger(page, 0).click();
    await expect(trigger(page, 0)).toHaveAttribute("aria-expanded", "false");
    await expect(item(page, 0).getByRole("menuitem").first()).toBeHidden();
  });
});
