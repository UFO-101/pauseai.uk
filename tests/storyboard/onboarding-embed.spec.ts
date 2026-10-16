import { BASE, expect, frame, test } from "./fixtures";

// The onboarding form embed on the home page
// (app/(site)/_components/OnboardingFormEmbed.tsx): the two things about it
// that only a real build in a real browser can show.

test("the onboarding form appears even when hydration is slow", async ({ page }) => {
  // The embed is covered with a skeleton until it posts its height. It only
  // posts when its height changes: a burst while it loads, then nothing. The
  // iframe is in the server-rendered HTML, so it can finish that burst before
  // hydration has added our message listener, and then every message is
  // missed and the skeleton never goes away. Seen on `next dev`, and on
  // production whenever hydration is slower than the embed's load.
  //
  // This delays our JS bundles so hydration loses that race on purpose. The
  // embed is the storyboard's stand-in (tests/storyboard/fixtures.ts), which
  // posts its height once on load, as the real one does.
  //
  // Checking that the fallback never appears matters as much as checking that
  // the skeleton goes: the load timeout also gives up on the skeleton, and
  // that alone would pass the first check without the form ever reporting
  // its height.
  const HYDRATION_DELAY_MS = 6000;
  await page.route(/\/_next\/static\/chunks\/.*\.js/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, HYDRATION_DELAY_MS));
    await route.continue();
  });

  await page.goto(BASE, { waitUntil: "domcontentloaded" });

  await expect(page.locator(".onboarding-embed-skeleton")).toHaveCount(0, {
    timeout: HYDRATION_DELAY_MS + 15_000,
  });
  await expect(page.locator(".onboarding-embed-fallback")).toHaveCount(0);
  await frame(page, "the home page, hydrated late, with the form showing");
});

test("the onboarding embed ignores messages from other origins", async ({ page }) => {
  // The embed resizes its iframe from postMessage events, and guards them
  // with a single line:
  //
  //   if (event.origin !== EMBED_ORIGIN) return;
  //
  // Without it, any page or script able to get a message into this window
  // could drive the height of the signup embed. It is one line, it looks
  // redundant next to the height check below it, and it is exactly the sort
  // of thing removed during a tidy-up. This test makes that removal fail.
  //
  // Only the reject path is asserted: a message posted from the page itself
  // carries the page's own origin, never https://pauseai.info, so there is no
  // way to forge an accepted message from here. The accept path is exercised
  // by the real embed every time the page loads.
  const FORGED_HEIGHT = 12345;
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => getComputedStyle(document.documentElement).getPropertyValue("--site-header-h").trim() !== "",
    undefined,
    { polling: 200, timeout: 20_000 },
  );

  const embed = page.locator('iframe[title="Get involved!"]');
  await expect(embed).toHaveCount(1);

  await page.evaluate((height) => {
    window.postMessage({ height }, "*");
  }, FORGED_HEIGHT);
  await page.waitForTimeout(1000);

  // Asserting the forged value was not adopted, rather than that the height is
  // unchanged: the real embed legitimately reports its own height as it
  // settles, so "unchanged" would be flaky.
  expect(await embed.getAttribute("height")).not.toBe(String(FORGED_HEIGHT));

  // And again with the message shape the embed actually sends, in case the
  // handler ever starts discriminating on shape rather than origin.
  await page.evaluate((height) => {
    window.postMessage({ height, type: "resize" }, "*");
  }, FORGED_HEIGHT + 1);
  await page.waitForTimeout(1000);

  expect(await embed.getAttribute("height")).not.toBe(String(FORGED_HEIGHT + 1));
});
