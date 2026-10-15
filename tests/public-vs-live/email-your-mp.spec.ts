import { test, type Page } from "@playwright/test";
import { fakeTurnstile, fillLetter, lookUpTestMp, TOOL_PAGE } from "../steps";
import { compareWithLive } from "./compare";

// The Email your MP form, local against live, at each step up to sending:
// ZZ99ZZ finds the test MP on both. It stops at the preview, so it never
// sends a letter from either.
//
// Live needs the tool deployed, the MP sync run once, and TEST_MP_EMAIL set,
// or it shows a 404 or "no email listed" and the diff fails, rightly. The
// local build's database has only the test MP (playwright.config.ts).

const PAGE = TOOL_PAGE;

// Cloudflare's real widget draws whatever its own checks decide, and can fail
// to load; both sides get the same stand-in instead.
test.beforeEach(async ({ page }) => fakeTurnstile(page));

// The test MP's inbox, the footer year, and Cloudflare's widget, which draws
// whatever its own checks decide.
const masks = (page: Page) => [
  page.locator("[data-mp-email]"),
  page.locator("#year"),
  page.locator("[data-turnstile]"),
];

test("visual diff: ZZ99ZZ finds the test MP and drafts the letter", async ({ page }, testInfo) => {
  await compareWithLive(page, testInfo, `${PAGE} after looking up ZZ99ZZ`, {
    prepare: (page, base) => lookUpTestMp(page, base),
    masks,
  });
});

test("visual diff: ZZ99ZZ, filled in, on its preview", async ({ page }, testInfo) => {
  await compareWithLive(page, testInfo, `${PAGE} preview`, {
    prepare: async (page, base) => {
      await lookUpTestMp(page, base);
      // Only goes to the preview: nothing is sent until its send button.
      await fillLetter(page, "jane@example.com");
    },
    masks,
  });
});
