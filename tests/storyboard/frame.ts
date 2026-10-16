import { test, type Page } from "@playwright/test";

/**
 * A frame of the storyboard: a caption, and, when the run takes screenshots
 * (STORYBOARD_SHOTS=1, set by scripts/storyboard.mjs), a full-page
 * screenshot of the page as it is now. The gate takes none, so a frame costs
 * it nothing. Put one after each thing a person would see; the checks go
 * between them. tests/storyboard/report/ turns them into the page.
 */
export async function frame(page: Page, caption: string): Promise<void> {
  const info = test.info();
  const index = info.annotations.filter((a) => a.type === "frame").length + 1;
  info.annotations.push({ type: "frame", description: caption });
  if (process.env.STORYBOARD_SHOTS !== "1") return;

  // The whole page is in the picture, so images below the fold load first,
  // and the fonts.
  await page
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
    })
    .catch(() => {
      // An image that never loads, or a page that navigated away: take the picture anyway.
    });
  const body = await page.screenshot({ fullPage: true, animations: "disabled" });
  await info.attach(`frame ${index}: ${caption}`, { body, contentType: "image/png" });
}
