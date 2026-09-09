import { test, expect, type Page } from "@playwright/test";

// In-page scrolling is deliberately all browser behaviour: `scroll-behavior`
// in globals.css animates it, `scroll-margin-top` keeps the target clear of
// the sticky nav, and fragment links stay plain anchor navigation so they set
// the hash, push one history entry, and move focus themselves.
//
// These tests exist because the previous JS implementation (a delegated click
// handler plus a scroll listener in components/ScrollInit.tsx) also rewrote
// location.hash on every scroll, so copying the URL after scrolling shared
// "/#staff" rather than the page.

const BASE = process.env.LOCAL_URL ?? "http://localhost:3000";

/**
 * Load a page and wait for it to hydrate before interacting. A click
 * dispatched before hydration can land on a node React is about to replace
 * and quietly do nothing, which showed up as an intermittently dead link.
 *
 * Nav's effect sets --site-header-h on the root element, so the variable
 * having a value is a reliable signal that client effects have run.
 */
async function gotoSettled(page: Page, path = "/") {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => getComputedStyle(document.documentElement).getPropertyValue("--site-header-h").trim() !== "",
    undefined,
    // Polled on a timer rather than the default requestAnimationFrame, which
    // can stall in a backgrounded headless context.
    { polling: 200, timeout: 20_000 },
  );
  // Let the hero marquee's first images land, so nothing below them shifts
  // out from under a click.
  await page.waitForTimeout(1000);
}

/** Distance from the top of the viewport to the top of #id. */
async function targetOffset(page: Page, id: string): Promise<number> {
  return page.evaluate((elId) => {
    const el = document.getElementById(elId);
    if (!el) throw new Error(`#${elId} not found`);
    return el.getBoundingClientRect().top;
  }, id);
}

async function headerHeight(page: Page): Promise<number> {
  return page.evaluate(() => (document.querySelector(".site-header") as HTMLElement).offsetHeight);
}

/** Scroll-margin should land the target below the sticky nav, not under it. */
async function expectClearOfNav(page: Page, id: string) {
  const [top, header] = await Promise.all([targetOffset(page, id), headerHeight(page)]);
  expect(top, `#${id} sits under the ${header}px sticky nav`).toBeGreaterThanOrEqual(header - 5);
  expect(top, `#${id} landed too far down the viewport`).toBeLessThan(120);
}

test.describe("in-page scrolling", () => {
  test("scrolling does not rewrite the URL", async ({ page }) => {
    await gotoSettled(page);
    const before = page.url();

    for (const y of [600, 1800, 3200, 5000]) {
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(600);

    expect(page.url()).toBe(before);
  });

  test("an anchor link sets the hash and lands clear of the nav", async ({ page }) => {
    await gotoSettled(page);
    await page.click('a.btn.ghost[href="#events"]');
    await page.waitForTimeout(1200);

    expect(new URL(page.url()).hash).toBe("#events");
    await expectClearOfNav(page, "events");
  });

  test("the back button undoes an anchor click", async ({ page }) => {
    await gotoSettled(page);
    await page.click('a.btn.ghost[href="#events"]');
    await page.waitForTimeout(1000);

    await page.goBack();
    await page.waitForTimeout(1000);

    expect(new URL(page.url()).hash).toBe("");
  });

  test("an anchor link moves the keyboard tab position to the target", async ({ page }) => {
    // The old preventDefault + scrollIntoView moved the viewport but left the
    // tab position in the hero, so a keyboard user who followed the link then
    // tabbed straight back into the nav. Native fragment navigation sets the
    // sequential focus navigation starting point to the target: the target
    // itself is not focusable, so this shows up on the next Tab, not in
    // document.activeElement.
    await gotoSettled(page);
    await page.click('a.btn.ghost[href="#events"]');
    await page.waitForTimeout(1200);

    await page.keyboard.press("Tab");

    const focusIsAfterTarget = await page.evaluate(() => {
      const target = document.getElementById("events");
      const active = document.activeElement;
      if (!target || !active) return false;
      // Either inside the target, or somewhere later in the document — both
      // mean the tab position followed the link rather than staying above it.
      return (
        target.contains(active) ||
        !!(target.compareDocumentPosition(active) & Node.DOCUMENT_POSITION_FOLLOWING)
      );
    });
    expect(focusIsAfterTarget).toBe(true);
  });

  test("a deep link scrolls to its target", async ({ page }) => {
    await gotoSettled(page, "/people#share-your-story");
    await page.waitForTimeout(1500);

    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await expectClearOfNav(page, "share-your-story");
  });

  test("a cross-page hash link lands on its target", async ({ page }) => {
    await gotoSettled(page);
    await page.click('a[href="/people#share-your-story"]');
    // Polling the URL rather than page.waitForURL: this is a client-side
    // router navigation, so there is no document navigation for waitForURL's
    // default "load" wait to resolve against.
    await expect
      .poll(() => page.url(), { timeout: 15_000 })
      .toMatch(/\/people#share-your-story$/);
    await page.waitForTimeout(1000);
    await expectClearOfNav(page, "share-your-story");
  });

  test("the footer cookie settings link does not jump to the top", async ({ page }) => {
    // It is an href="#", which used to be swallowed by ScrollInit's delegated
    // handler. CookieConsent calls preventDefault itself, so removing that
    // handler must not reintroduce a jump.
    await gotoSettled(page);
    await page.evaluate(() => window.scrollTo(0, 2000));
    await page.waitForTimeout(300);

    await page.click("a.js-cookie-settings");
    await page.waitForTimeout(600);

    await expect(page.locator(".cookie-banner")).toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(1500);
  });
});

test.describe("reduced motion", () => {
  test("smooth scrolling is turned off", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await gotoSettled(page);

    const behavior = await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    );
    expect(behavior).toBe("auto");
  });
});
