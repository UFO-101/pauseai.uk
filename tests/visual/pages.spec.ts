import { test, expect, type Page } from "@playwright/test";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import fs from "node:fs";

// Compares each page as currently deployed (LIVE_URL) against this local
// build (LOCAL_URL, started by playwright.config.ts's webServer) — no
// stored baseline to keep up to date, since site content (news, events,
// stories) changes too often for a committed snapshot to stay meaningful.
const LIVE_URL = process.env.LIVE_URL ?? "https://pauseai.uk";
const LOCAL_URL = process.env.LOCAL_URL ?? "http://localhost:3000";
const MISMATCH_THRESHOLD = Number(process.env.MISMATCH_THRESHOLD ?? 0.02); // fraction of pixels

// One entry per app/**/page.tsx route. The dynamic /stories/[slug] route is
// represented by a single example slug — it's the same template for every
// story, so one instance is enough to catch template regressions.
const ROUTES = [
  "/",
  "/campaigns/",
  "/donate/",
  "/future-of-workforce-inquiry/",
  "/glasgow/",
  "/global-ai-sentiment-2026/",
  "/governance/",
  "/leicester/",
  "/london/",
  "/manchester/",
  "/oxford/",
  "/privacy/",
  "/protest/",
  "/stories/",
  "/stories/harry-turnbull/",
  "/theory-of-change/",
  "/track-record/",
  "/west-of-england/",
  "/what-is-pauseai-uk/",
];

// Footer's "© <year>" changes automatically on Jan 1 regardless of any code
// change — always masked so that alone never fails a comparison.
function maskLocators(page: Page, route: string) {
  const masks = [page.locator("#year")];
  if (route === "/") {
    // Hero photo order is randomly shuffled per server render, and the
    // upcoming-events list comes from a live external API (Luma) — neither
    // is stable across two independent page loads, let alone across hosts.
    masks.push(page.locator(".hero-marquee"), page.locator("#events"));
  }
  return masks;
}

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

for (const route of ROUTES) {
  test(`visual diff: ${route}`, async ({ page }, testInfo) => {
    // Skip analytics — no need to fire a real pageview to production GA
    // on every test run, and it just adds network noise before "idle".
    await page.route("**/googletagmanager.com/**", (r) => r.abort());

    await page.goto(new URL(route, LOCAL_URL).toString());
    // "networkidle" never fires on pages with an embedded iframe
    // (/campaigns/'s MP-email form) or ongoing lazy image loads (the hero
    // marquee) — "load" plus a fixed settle covers the marquee's own
    // documented 2.4s CSS safety-net fade-in (see HeroMarqueeEffects.tsx).
    await page.waitForLoadState("load");
    await page.waitForTimeout(2600);
    const localBuffer = await page.screenshot({
      fullPage: true,
      animations: "disabled",
      mask: maskLocators(page, route),
    });

    await page.goto(new URL(route, LIVE_URL).toString());
    // "networkidle" never fires on pages with an embedded iframe
    // (/campaigns/'s MP-email form) or ongoing lazy image loads (the hero
    // marquee) — "load" plus a fixed settle covers the marquee's own
    // documented 2.4s CSS safety-net fade-in (see HeroMarqueeEffects.tsx).
    await page.waitForLoadState("load");
    await page.waitForTimeout(2600);
    const liveBuffer = await page.screenshot({
      fullPage: true,
      animations: "disabled",
      mask: maskLocators(page, route),
    });

    await testInfo.attach("local.png", { body: localBuffer, contentType: "image/png" });
    await testInfo.attach("live.png", { body: liveBuffer, contentType: "image/png" });
    fs.writeFileSync(testInfo.outputPath("local.png"), localBuffer);
    fs.writeFileSync(testInfo.outputPath("live.png"), liveBuffer);

    const [liveImg, localImg] = padToMatch(PNG.sync.read(liveBuffer), PNG.sync.read(localBuffer));
    const diff = new PNG({ width: liveImg.width, height: liveImg.height });
    const mismatchedPixels = pixelmatch(
      liveImg.data,
      localImg.data,
      diff.data,
      liveImg.width,
      liveImg.height,
      { threshold: 0.1 },
    );
    const totalPixels = liveImg.width * liveImg.height;
    const mismatchRatio = mismatchedPixels / totalPixels;

    const diffBuffer = PNG.sync.write(diff);
    await testInfo.attach("diff.png", { body: diffBuffer, contentType: "image/png" });
    fs.writeFileSync(testInfo.outputPath("diff.png"), diffBuffer);
    testInfo.annotations.push({
      type: "mismatch",
      description: `${(mismatchRatio * 100).toFixed(2)}% (${mismatchedPixels}/${totalPixels} px)`,
    });

    expect(mismatchRatio, `visual diff vs live for ${route}`).toBeLessThan(MISMATCH_THRESHOLD);
  });
}
