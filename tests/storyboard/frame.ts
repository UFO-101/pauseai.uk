import { test, type Locator, type Page } from "@playwright/test";
import sharp from "sharp";
import { emailView } from "../fixtures/email-view";
import type { OutboxEmail } from "../fixtures/outbox";
import { LOCAL_URL } from "../fixture-env.mjs";

/**
 * A frame of the storyboard: a caption, saying what the picture shows, and, when the run takes screenshots
 * (STORYBOARD_SHOTS=1, set by scripts/storyboard.mjs), a screenshot of the
 * page as it is now. The gate takes none, so a frame costs it nothing. Put one
 * after each thing a person would see; the checks go between them.
 * tests/storyboard/report/ turns them into the page.
 *
 * A page at the top is pictured whole, so its layout can be checked. Once a
 * person has scrolled, or a step has scrolled them (to a form field, an
 * anchor), only the window is pictured: where they are is the point of the
 * frame, and a full-page picture of a scrolled page puts the sticky header
 * wherever the scroll was. So too while a menu or a dialog is open: it's
 * placed against the window, and a full-page picture, which Chromium takes
 * by resizing the window, sometimes caught it placed against a passing size.
 *
 * `of` pictures one element, exactly (the component gallery's variants), with
 * the page at the top so the sticky header is never over it. `window`
 * pictures only the window, for a page too long to picture whole (the
 * gallery itself). `hover` puts the pointer over an element, and keeps it
 * there for the picture, in place of moving it out of the way.
 */
export async function frame(
  page: Page,
  caption: string,
  { of, window: windowOnly = false, hover }: { of?: Locator; window?: boolean; hover?: Locator } = {},
): Promise<void> {
  const info = test.info();
  const index = info.annotations.filter((a) => a.type === "frame").length + 1;
  info.annotations.push({ type: "frame", description: caption });
  if (process.env.STORYBOARD_SHOTS !== "1") return;

  // The pointer is wherever the last click left it, which, as the page
  // changes under it, is sometimes over a link or a select and sometimes
  // not: a hover style that differs between runs. Out of the way first.
  await (hover ? hover.hover() : page.mouse.move(0, 0).catch(() => {}));

  // Images below the fold load first, and the fonts, so the picture is of the
  // finished page; and any smooth scroll (a field scrolled into view, an
  // anchor) has come to rest, so it's of the place it ends up.
  const inWindow = await page
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
      // At rest means the same place for three ticks in a row (settle.ts,
      // scrollSettled): an anchor's smooth scroll starts a tick or two after
      // the click on a slow machine, and one tick of no movement caught the
      // picture before it had begun.
      const tick = () => new Promise<void>((done) => requestAnimationFrame(() => setTimeout(done, 50)));
      for (let last = -1, same = 0, tries = 0; tries < 40 && same < 3; tries++) {
        same = window.scrollY === last ? same + 1 : 1;
        last = window.scrollY;
        await tick();
      }
      return window.scrollY > 0 || document.querySelector(":popover-open, dialog:modal") !== null;
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
      ...SHOT,
      clip: { x: box.x, y: box.y, width: box.width, height: box.height },
    });
    await info.attach(`frame ${index}: ${caption}`, { body, contentType: "image/png" });
    return;
  }
  const body = inWindow || windowOnly ? await page.screenshot(SHOT) : await wholePage(page);
  await info.attach(`frame ${index}: ${caption}`, { body, contentType: "image/png" });
}

/**
 * A line of the flow's story, told around its frames: what the person does
 * next, and why, as anyone who has used the site would say it. The review
 * page shows it above the next frame; a line after the last frame ends the
 * flow. The captions say only what's on the screen, and the flow's title
 * only names it, so the story is where the flow is explained.
 */
export function story(text: string): void {
  test.info().annotations.push({ type: "story", description: text });
}

/**
 * Every picture is a pixel to a CSS pixel, on a phone's high-density screen
 * too: the layout is what a frame is for, and a phone's at its own density
 * is nine times the pixels to take, store and compare.
 */
const SHOT = { animations: "disabled", scale: "css" } as const;

/** The tallest piece of a page, in CSS pixels, that Chromium pictures in one go. */
const SLICE = 4000;

/**
 * The time a slice is given on top of the test's own. A slice takes a
 * second or two, and longer while the machine is busy, so a page of dozens
 * (the gallery's staff group, 35 on a desktop) would otherwise use up the
 * test's minute on pictures alone.
 */
const SLICE_TIME = 5000;

/**
 * The whole page. Chromium leaves some tiles of a very tall page unpainted
 * when it pictures it in one go (the gallery's pages group, 120,000px tall
 * on a phone, lost a different few 512px squares each run), so a page taller
 * than SLICE is pictured a slice at a time and the slices put together,
 * the test given SLICE_TIME more for each.
 */
async function wholePage(page: Page): Promise<Buffer> {
  const { width, height } = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
  }));
  if (height <= SLICE) return page.screenshot({ fullPage: true, ...SHOT });
  const info = test.info();
  info.setTimeout(info.timeout + Math.ceil(height / SLICE) * SLICE_TIME);
  const slices: { top: number; body: Buffer }[] = [];
  for (let top = 0; top < height; top += SLICE) {
    const clip = { x: 0, y: top, width, height: Math.min(SLICE, height - top) };
    slices.push({ top, body: await page.screenshot({ fullPage: true, ...SHOT, clip }) });
  }
  return sharp({
    create: { width, height, channels: 4, background: "#00000000" },
    limitInputPixels: false,
  })
    .composite(slices.map(({ top, body }) => ({ input: body, left: 0, top })))
    .png()
    .toBuffer();
}

/** The site's address in a pictured email: a domain reserved for examples (RFC 2606), so it can't pass for a working link. */
const SHOWN_ORIGIN = "https://pauseai.example.org";

/**
 * A frame of an email the build sent (from the outbox, tests/steps.ts), as a
 * plain mail app shows it (tests/fixtures/email-view.ts): its headers, its
 * body and its attachments. In a page of its own, at the flow's viewport,
 * closed afterwards, so the flow's page is left where it was.
 *
 * A link in an email has the address of the server that sent it, and main's
 * build and this branch's run on different ports, so the same email was
 * pictured differently on each side. It's pictured with SHOWN_ORIGIN in
 * place of the sending server's address.
 */
export async function emailFrame(page: Page, email: OutboxEmail, caption: string): Promise<void> {
  const shown = (text: string) => text.replaceAll(new URL(LOCAL_URL).origin, SHOWN_ORIGIN);
  const mail = await page.context().newPage();
  try {
    await mail.setContent(
      emailView({ ...email, TextBody: shown(email.TextBody), HtmlBody: email.HtmlBody && shown(email.HtmlBody) }),
    );
    await frame(mail, caption);
  } finally {
    await mail.close();
  }
}
