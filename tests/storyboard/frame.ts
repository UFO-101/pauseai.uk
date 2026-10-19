import { test, type Locator, type Page } from "@playwright/test";
import { emailView } from "../fixtures/email-view";
import type { OutboxEmail } from "../fixtures/outbox";

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
 *
 * `of` pictures one element, exactly (the component gallery's variants), with
 * the page at the top so the sticky header is never over it. `window`
 * pictures only the window, for a page too long to picture whole (the
 * gallery itself).
 */
export async function frame(
  page: Page,
  caption: string,
  { of, window: windowOnly = false }: { of?: Locator; window?: boolean } = {},
): Promise<void> {
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
      // A select laid out before its font arrived keeps its text where the
      // fallback font put it, a pixel off, until it's laid out again.
      for (const select of document.querySelectorAll("select")) {
        const display = select.style.display;
        select.style.display = "none";
        void select.offsetHeight;
        select.style.display = display;
      }
      await Promise.all(
        [...document.images].map((img) =>
          img.complete
            ? undefined
            : new Promise<void>((done) => img.addEventListener("load", () => done(), { once: true })),
        ),
      );
      // Loaded isn't decoded: an image painted before it is can be drawn a
      // shade differently, a few pixels off between runs.
      await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
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
  if (of) {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    const box = (await of.boundingBox())!;
    const body = await page.screenshot({
      fullPage: true,
      animations: "disabled",
      clip: { x: box.x, y: box.y, width: box.width, height: box.height },
    });
    await info.attach(`frame ${index}: ${caption}`, { body, contentType: "image/png" });
    return;
  }
  const body = await page.screenshot({ fullPage: !scrolled && !windowOnly, animations: "disabled" });
  await info.attach(`frame ${index}: ${caption}`, { body, contentType: "image/png" });
}

/**
 * A frame of an email the build sent (from the outbox, tests/steps.ts), as a
 * plain mail app shows it (tests/fixtures/email-view.ts): its headers, its
 * body and its attachments. In a page of its own, at the flow's viewport,
 * closed afterwards, so the flow's page is left where it was.
 */
export async function emailFrame(page: Page, email: OutboxEmail, caption: string): Promise<void> {
  const mail = await page.context().newPage();
  try {
    await mail.setContent(emailView(email));
    await frame(mail, caption);
  } finally {
    await mail.close();
  }
}
