import { test, type Page } from "@playwright/test";

/**
 * A frame of the storyboard: a caption, and, when the run takes screenshots
 * (STORYBOARD_SHOTS=1, set by scripts/storyboard.mjs), a screenshot of the
 * page as it is now. The gate takes none, so a frame costs it nothing. Put one
 * after each thing a person would see; the checks go between them.
 * tests/storyboard/report/ turns them into the page.
 *
 * A page at the top is pictured whole, so its layout can be checked. Once a
 * person has scrolled, or a step has scrolled them (to a form field, an
 * anchor), only the window is pictured: where they are is the point of the
 * frame, and a full-page picture of a scrolled page puts the sticky header
 * wherever the scroll was.
 */
export async function frame(page: Page, caption: string): Promise<void> {
  const info = test.info();
  const index = info.annotations.filter((a) => a.type === "frame").length + 1;
  info.annotations.push({ type: "frame", description: caption });
  if (process.env.STORYBOARD_SHOTS !== "1") return;

  // The pointer is wherever the last click left it, which, as the page
  // changes under it, is sometimes over a link or a select and sometimes
  // not: a hover style that differs between runs. Out of the way first.
  await page.mouse.move(0, 0).catch(() => {});

  // Images below the fold load first, and the fonts, so the picture is of the
  // finished page; and any smooth scroll (a field scrolled into view, an
  // anchor) has come to rest, so it's of the place it ends up.
  const scrolled = await page
    .evaluate(async () => {
      for (const img of document.querySelectorAll("img[loading=lazy]")) img.setAttribute("loading", "eager");
      await document.fonts.ready;
      await Promise.all(
        [...document.images].map((img) =>
          img.complete
            ? undefined
            : new Promise<void>((done) => img.addEventListener("load", () => done(), { once: true })),
        ),
      );
      const tick = () => new Promise<void>((done) => requestAnimationFrame(() => setTimeout(done, 50)));
      for (let last = -1, tries = 0; tries < 40 && last !== window.scrollY; tries++) {
        last = window.scrollY;
        await tick();
      }
      return window.scrollY > 0;
    })
    .catch(() => {
      // An image that never loads, or a page that navigated away: take the picture anyway.
      return false;
    });
  const body = await page.screenshot({ fullPage: !scrolled, animations: "disabled" });
  await info.attach(`frame ${index}: ${caption}`, { body, contentType: "image/png" });
}
