import { expect, type Page } from "@playwright/test";

// What the flows wait for, rather than a fixed time: the page has
// hydrated and its console has gone quiet, a smooth scroll has come to rest,
// the layout has stopped moving. Each polls on a timer, not
// requestAnimationFrame, which can stall in a backgrounded headless context.

/** Polled on a timer, so a backgrounded page still answers. */
const POLL = { polling: 50, timeout: 20_000 };

/**
 * The page has loaded and hydrated: Nav's effect has set --site-header-h on
 * the root (a page without the site header, like the staff login, has
 * nothing to wait for), the fonts are in, and the console has been quiet
 * for a moment, so a hydration warning, which React logs just after mount,
 * has had its chance.
 */
export async function hydrated(page: Page): Promise<void> {
  let lastMessage = Date.now();
  const onMessage = () => (lastMessage = Date.now());
  page.on("console", onMessage);
  try {
    await page.waitForFunction(
      () =>
        document.readyState === "complete" &&
        (getComputedStyle(document.documentElement).getPropertyValue("--site-header-h").trim() !== "" ||
          !document.querySelector('header button[aria-label="Menu"]')),
      undefined,
      POLL,
    );
    await page.evaluate(() => document.fonts.ready);
    lastMessage = Date.now();
    await quiet(page, () => Date.now() - lastMessage >= 250, 3000);
  } finally {
    page.off("console", onMessage);
  }
}

/** Polls `ready` on the test side until it's true, or `timeoutMs` has passed (then carries on). */
async function quiet(page: Page, ready: () => boolean, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!ready() && Date.now() < deadline) await page.waitForTimeout(50);
}

/**
 * The scroll position has come to rest: the same for three polls in a row
 * (100ms), which outlasts any pause in a smooth scroll. Call it after the
 * thing that starts the scroll, so the first poll sees it under way.
 */
export async function scrollSettled(page: Page): Promise<number> {
  await page.waitForFunction(
    () => {
      const w = window as typeof window & { __settle?: { y: number; same: number } };
      const s = (w.__settle ??= { y: -1, same: 0 });
      s.same = Math.abs(window.scrollY - s.y) < 1 ? s.same + 1 : 0;
      s.y = window.scrollY;
      return s.same >= 2;
    },
    undefined,
    POLL,
  );
  await page.evaluate(() => {
    delete (window as typeof window & { __settle?: unknown }).__settle;
  });
  return page.evaluate(() => window.scrollY);
}

/**
 * The layout around `selector` has stopped moving: every image is in, and
 * its position and the page's height are the same for three polls in a row.
 */
export async function layoutSettled(page: Page, selector: string): Promise<void> {
  await page.evaluate(async () => {
    for (const img of document.querySelectorAll("img[loading=lazy]")) img.setAttribute("loading", "eager");
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map((img) =>
        img.complete
          ? undefined
          : new Promise<void>((done) => {
              img.addEventListener("load", () => done(), { once: true });
              img.addEventListener("error", () => done(), { once: true });
            }),
      ),
    );
  });
  await page.waitForFunction(
    (sel) => {
      const w = window as typeof window & { __layout?: { key: string; same: number } };
      const s = (w.__layout ??= { key: "", same: 0 });
      const el = document.querySelector(sel);
      const key = `${el?.getBoundingClientRect().top ?? "none"}:${document.documentElement.scrollHeight}`;
      s.same = key === s.key ? s.same + 1 : 0;
      s.key = key;
      return s.same >= 2;
    },
    selector,
    POLL,
  );
  await page.evaluate(() => {
    delete (window as typeof window & { __layout?: unknown }).__layout;
  });
}

/**
 * Leaves any field and goes back to the top, and stays there, so the next
 * frame is of the whole page. Typing, or ticking a box, scrolls it into
 * view, and where that leaves the window differs by a few pixels between
 * runs; an editor may scroll its caret back into view a frame later. After
 * Back, the browser puts the window where it was as the page loads, which
 * can be after it was sent to the top: so it waits for the load, and the
 * top has to hold for a few frames.
 */
export async function wholePage(page: Page): Promise<void> {
  await page.waitForLoadState("load");
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect
    .poll(() =>
      page.evaluate(async () => {
        window.scrollTo({ top: 0, behavior: "instant" });
        const tick = () => new Promise((done) => requestAnimationFrame(() => setTimeout(done, 50)));
        for (let i = 0; i < 4 && window.scrollY === 0; i++) await tick();
        return window.scrollY;
      }),
    )
    .toBe(0);
}
