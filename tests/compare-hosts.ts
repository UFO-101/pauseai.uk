import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import fs from "node:fs";

// Screenshots one state of the site on two hosts, and diffs them. Used by:
//
// - tests/public-vs-live/: this build against the live site, failing on a
//   difference over MISMATCH_THRESHOLD;
// - tests/fixtures-vs-main/: this branch against main, both on fixture data,
//   never failing on a difference, only reporting it.
//
// No stored baseline: the other host is the reference.

const MISMATCH_THRESHOLD = Number(process.env.MISMATCH_THRESHOLD ?? 0.02); // fraction of pixels

export type Host = { name: string; url: string };

export type Comparison = {
  /**
   * Gets the page on `base` into the state to compare. Behaviour checks in
   * here fail the test on the first host; on the second (reference) host they
   * fail it only when `failOnDiff` is set.
   */
  prepare: (page: Page, base: string) => Promise<void>;
  /** Parts of the page that legitimately differ between the two hosts. */
  masks?: (page: Page) => Locator[];
};

// pixelmatch requires both images to be the same size. A size difference is
// itself meaningful (real content grew/shrank), so pages are padded with
// white rather than cropped — the padded area shows as a solid diff block
// instead of silently disappearing from the comparison.
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

async function shoot(page: Page, base: string, { prepare, masks }: Comparison): Promise<Buffer> {
  // Skip analytics — no need to fire a real pageview on every test run, and
  // it just adds network noise before "idle".
  await page.route("**/googletagmanager.com/**", (r) => r.abort());
  await prepare(page, base);
  // Filling in a form scrolls and focuses: undo both, or the sticky header
  // and focus ring land wherever the last click left them.
  // "instant", because the site scrolls smoothly, and a screenshot taken
  // mid-scroll puts the sticky header somewhere else.
  // Scrolled again on every check, in case something (a late re-render, a
  // focus) moves it after the first; under a pixel counts, since an emulated
  // phone can stop at a fraction of one.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.waitForFunction(
    () => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      return window.scrollY < 1;
    },
    undefined,
    { polling: 100, timeout: 5000 },
  );
  return page.screenshot({ fullPage: true, animations: "disabled", mask: masks?.(page) ?? [] });
}

async function attach(testInfo: TestInfo, name: string, body: Buffer) {
  await testInfo.attach(name, { body, contentType: "image/png" });
  fs.writeFileSync(testInfo.outputPath(name), body);
}

/**
 * Compares the page in one state on `subject` against `reference`, and
 * attaches both images and their diff. With `failOnDiff`, fails when they
 * differ by more than MISMATCH_THRESHOLD; without, notes the difference and
 * passes, and a `reference` that can't reach the state (main without a page
 * this branch adds, say) is noted rather than failed.
 */
export async function compareHosts(
  page: Page,
  testInfo: TestInfo,
  label: string,
  comparison: Comparison,
  { subject, reference, failOnDiff }: { subject: Host; reference: Host; failOnDiff: boolean },
) {
  const subjectBuffer = await shoot(page, subject.url, comparison);
  await attach(testInfo, `${subject.name}.png`, subjectBuffer);

  let referenceBuffer: Buffer;
  try {
    referenceBuffer = await shoot(page, reference.url, comparison);
  } catch (error) {
    if (failOnDiff) throw error;
    testInfo.annotations.push({ type: "no comparison", description: `${reference.name} couldn't get here: ${String(error).split("\n")[0]}` });
    return;
  }
  await attach(testInfo, `${reference.name}.png`, referenceBuffer);

  const [referenceImg, subjectImg] = padToMatch(PNG.sync.read(referenceBuffer), PNG.sync.read(subjectBuffer));
  const diff = new PNG({ width: referenceImg.width, height: referenceImg.height });
  const mismatchedPixels = pixelmatch(referenceImg.data, subjectImg.data, diff.data, referenceImg.width, referenceImg.height, { threshold: 0.1 });
  const totalPixels = referenceImg.width * referenceImg.height;
  const mismatchRatio = mismatchedPixels / totalPixels;
  await attach(testInfo, "diff.png", PNG.sync.write(diff));
  testInfo.annotations.push({
    type: mismatchedPixels ? "mismatch" : "identical",
    description: `${(mismatchRatio * 100).toFixed(2)}% (${mismatchedPixels}/${totalPixels} px) differ from ${reference.name}`,
  });

  if (failOnDiff) expect(mismatchRatio, `visual diff vs ${reference.name} for ${label}`).toBeLessThan(MISMATCH_THRESHOLD);
}
