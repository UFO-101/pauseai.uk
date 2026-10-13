import { test, expect } from "@playwright/test";

// app/(site)/_components/OnboardingFormEmbed.tsx covers the form with a skeleton until the embed
// posts its height. The embed only posts when its height changes: a burst while
// it loads, then nothing. The iframe is in the server-rendered HTML, so it can
// finish that burst before hydration has added our message listener, and then
// every message is missed and the skeleton never goes away. Seen on `next dev`,
// and on production whenever hydration is slower than the embed's load.
//
// This delays our JS bundles so hydration loses that race on purpose. The real
// embed is left alone.
//
// Checking that the fallback never appears matters as much as checking that the
// skeleton goes: the load timeout also gives up on the skeleton, and that alone
// would pass the first check without the form ever reporting its height.

const BASE = process.env.LOCAL_URL ?? "http://localhost:3000";
const HYDRATION_DELAY_MS = 6000;

test("the onboarding form appears even when hydration is slow", async ({ page }) => {
  await page.route(/\/_next\/static\/chunks\/.*\.js/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, HYDRATION_DELAY_MS));
    await route.continue();
  });

  await page.goto(BASE, { waitUntil: "domcontentloaded" });

  await expect(page.locator(".onboarding-embed-skeleton")).toHaveCount(0, {
    timeout: HYDRATION_DELAY_MS + 15_000,
  });
  await expect(page.locator(".onboarding-embed-fallback")).toHaveCount(0);
});
