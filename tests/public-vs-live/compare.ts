import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import fs from "node:fs";

// Screenshots a page as currently deployed (LIVE_URL) and as this local build
// serves it (LOCAL_URL), and fails if they differ by more than
// MISMATCH_THRESHOLD. No stored baseline: site content (news, events,
// stories) changes too often for a committed snapshot to stay meaningful.
export const LIVE_URL = process.env.LIVE_URL ?? "https://pauseai.uk";
export const LOCAL_URL = process.env.LOCAL_URL ?? "http://localhost:3000";
const MISMATCH_THRESHOLD = Number(process.env.MISMATCH_THRESHOLD ?? 0.02); // fraction of pixels

// pixelmatch requires both images to be the same size. A live/local size
// difference is itself meaningful (real content grew/shrank), so pages are
// padded with white rather than cropped — the padded area shows as a solid
// diff block instead of silently disappearing from the comparison.
function padToMatch(a: PNG, b: PNG): [PNG, PNG] {
  const width = Math.max(a.width, b.width);
  const height = Math.max(a.height, b.height);
  const pad = (img: PNG) => {
    if (img.width === width && img.height === height) return img;
    const out = new PNG({ width, height });
    out.data.fill(255);
    PNG.bitblt(img, out, 0, 0, img.width, img.height, 0, 0);
    return out;
  };
  return [pad(a), pad(b)];
}

type Comparison = {
  /** Gets the page on `base` into the state to compare. */
  prepare: (page: Page, base: string) => Promise<void>;
  /** Parts of the page that legitimately differ between the two hosts. */
  masks?: (page: Page) => Locator[];
};

async function shoot(page: Page, base: string, { prepare, masks }: Comparison): Promise<Buffer> {
  // Skip analytics — no need to fire a real pageview to production GA on
  // every test run, and it just adds network noise before "idle".
  await page.route("**/googletagmanager.com/**", (r) => r.abort());
  await prepare(page, base);
  // Filling in a form scrolls and focuses: undo both, or the sticky header
  // and focus ring land wherever the last click left them.
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
  });
  return page.screenshot({ fullPage: true, animations: "disabled", mask: masks?.(page) ?? [] });
}

/** Compares the page in one state, local against live, and attaches all three images. */
export async function compareWithLive(page: Page, testInfo: TestInfo, label: string, comparison: Comparison) {
  const localBuffer = await shoot(page, LOCAL_URL, comparison);
  const liveBuffer = await shoot(page, LIVE_URL, comparison);

  await testInfo.attach("local.png", { body: localBuffer, contentType: "image/png" });
  await testInfo.attach("live.png", { body: liveBuffer, contentType: "image/png" });
  fs.writeFileSync(testInfo.outputPath("local.png"), localBuffer);
  fs.writeFileSync(testInfo.outputPath("live.png"), liveBuffer);

  const [liveImg, localImg] = padToMatch(PNG.sync.read(liveBuffer), PNG.sync.read(localBuffer));
  const diff = new PNG({ width: liveImg.width, height: liveImg.height });
  const mismatchedPixels = pixelmatch(liveImg.data, localImg.data, diff.data, liveImg.width, liveImg.height, { threshold: 0.1 });
  const totalPixels = liveImg.width * liveImg.height;
  const mismatchRatio = mismatchedPixels / totalPixels;

  const diffBuffer = PNG.sync.write(diff);
  await testInfo.attach("diff.png", { body: diffBuffer, contentType: "image/png" });
  fs.writeFileSync(testInfo.outputPath("diff.png"), diffBuffer);
  testInfo.annotations.push({
    type: "mismatch",
    description: `${(mismatchRatio * 100).toFixed(2)}% (${mismatchedPixels}/${totalPixels} px)`,
  });

  expect(mismatchRatio, `visual diff vs live for ${label}`).toBeLessThan(MISMATCH_THRESHOLD);
}
