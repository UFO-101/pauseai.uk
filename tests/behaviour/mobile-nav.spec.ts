import { test, expect, devices, type Browser, type Page } from "@playwright/test";

// The burger menu is the only navigation below 1024px, so a regression here
// strands every phone visitor on whatever page they landed on. It is also the
// most imperative code in the app — components/Nav.tsx wires it with
// querySelector and addEventListener inside an effect, outside React's state
// model — so the DOM contract it depends on is asserted here explicitly:
//
//   .burger[aria-expanded]  drives the burger's own open/closed styling
//   nav.open                is what actually shows the menu (globals.css)
//   body.mobile-nav-open    locks background scrolling behind the menu
//   --site-header-h         positions the menu panel below the header
const BASE = process.env.LOCAL_URL ?? "http://localhost:3000";

async function openMobilePage(browser: Browser, path = "/donate") {
  // A real mobile context, not just a narrow viewport: the dropdown code
  // branches on matchMedia("(hover: none)"), which needs touch emulation.
  const context = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await context.newPage();
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
  return { context, page };
}

const burger = (page: Page) => page.locator(".burger");
const nav = (page: Page) => page.locator("header.site-header nav");
const bodyHasLock = (page: Page) =>
  page.evaluate(() => document.body.classList.contains("mobile-nav-open"));

test.describe("mobile nav", () => {
  test("starts closed", async ({ browser }) => {
    const { context, page } = await openMobilePage(browser);

    await expect(burger(page)).toBeVisible();
    await expect(nav(page)).toBeHidden();
    await expect(burger(page)).toHaveAttribute("aria-expanded", "false");
    expect(await bodyHasLock(page)).toBe(false);

    await context.close();
  });

  test("the burger opens the menu and locks background scrolling", async ({ browser }) => {
    const { context, page } = await openMobilePage(browser);

    await burger(page).click();

    await expect(nav(page)).toBeVisible();
    await expect(burger(page)).toHaveAttribute("aria-expanded", "true");
    expect(await bodyHasLock(page)).toBe(true);
    // The lock has to actually stop the page moving, not just add a class.
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe("hidden");

    await context.close();
  });

  test("the burger closes the menu again", async ({ browser }) => {
    const { context, page } = await openMobilePage(browser);

    await burger(page).click();
    await expect(nav(page)).toBeVisible();

    await burger(page).click();

    await expect(nav(page)).toBeHidden();
    await expect(burger(page)).toHaveAttribute("aria-expanded", "false");
    expect(await bodyHasLock(page)).toBe(false);

    await context.close();
  });

  test("the menu panel sits below the header, not under it", async ({ browser }) => {
    const { context, page } = await openMobilePage(browser);

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

    await context.close();
  });

  test("tapping a link closes the menu and navigates", async ({ browser }) => {
    const { context, page } = await openMobilePage(browser);

    await burger(page).click();
    await expect(nav(page)).toBeVisible();

    await nav(page).getByRole("link", { name: "Blog", exact: true }).click();

    await expect.poll(() => page.url(), { timeout: 15_000 }).toMatch(/\/blog\/?$/);
    await expect(nav(page)).toBeHidden();
    await expect(burger(page)).toHaveAttribute("aria-expanded", "false");

    await context.close();
  });

  test("background scrolling is released after navigating with the menu open", async ({ browser }) => {
    // The effect's cleanup drops body.mobile-nav-open on unmount. If that
    // regresses, the page you land on cannot be scrolled at all.
    const { context, page } = await openMobilePage(browser);

    await burger(page).click();
    await expect(nav(page)).toBeVisible();
    await nav(page).getByRole("link", { name: "Blog", exact: true }).click();
    await expect.poll(() => page.url(), { timeout: 15_000 }).toMatch(/\/blog\/?$/);

    expect(await bodyHasLock(page)).toBe(false);
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe("hidden");

    await page.evaluate(() => window.scrollTo(0, 400));
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    await context.close();
  });

  test("a dropdown trigger opens its submenu instead of navigating", async ({ browser }) => {
    const { context, page } = await openMobilePage(browser);
    const urlBefore = page.url();

    await burger(page).click();
    const about = nav(page).locator(".nav-item.has-dropdown").first();
    await about.locator(".dropdown-trigger").click();

    await expect(about).toHaveClass(/is-open/);
    await expect(about.locator(".dropdown-trigger")).toHaveAttribute("aria-expanded", "true");
    await expect(about.getByRole("menuitem", { name: "Track record" })).toBeVisible();
    expect(page.url()).toBe(urlBefore);

    await context.close();
  });

  test("opening a second dropdown closes the first", async ({ browser }) => {
    const { context, page } = await openMobilePage(browser);

    await burger(page).click();
    const items = nav(page).locator(".nav-item.has-dropdown");
    const about = items.first();
    const chapters = items.nth(1);

    await about.locator(".dropdown-trigger").click();
    await expect(about).toHaveClass(/is-open/);

    await chapters.locator(".dropdown-trigger").click();

    await expect(chapters).toHaveClass(/is-open/);
    await expect(about).not.toHaveClass(/is-open/);
    await expect(about.locator(".dropdown-trigger")).toHaveAttribute("aria-expanded", "false");

    await context.close();
  });

  test("a second tap on an open dropdown closes it", async ({ browser }) => {
    const { context, page } = await openMobilePage(browser);

    await burger(page).click();
    const about = nav(page).locator(".nav-item.has-dropdown").first();

    await about.locator(".dropdown-trigger").click();
    await expect(about).toHaveClass(/is-open/);

    await about.locator(".dropdown-trigger").click();
    await expect(about).not.toHaveClass(/is-open/);

    await context.close();
  });
});
