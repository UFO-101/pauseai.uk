import { test, expect } from "@playwright/test";

// app/OnboardingFormEmbed.tsx resizes its iframe from postMessage events, and
// guards them with a single line:
//
//   if (event.origin !== EMBED_ORIGIN) return;
//
// Without it, any page or script able to get a message into this window could
// drive the height of the signup embed. It is one line, it looks redundant next
// to the height check below it, and it is exactly the sort of thing removed
// during a tidy-up. This test makes that removal fail.
//
// Only the reject path is asserted: a message posted from the page itself
// carries the page's own origin, never https://pauseai.info, so there is no way
// to forge an accepted message from here. The accept path is exercised by the
// real embed every time the page loads.

const BASE = process.env.LOCAL_URL ?? "http://localhost:3000";
const FORGED_HEIGHT = 12345;

test("the onboarding embed ignores messages from other origins", async ({ page }) => {
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
