import { test, type Page } from "@playwright/test";
import { copy } from "@/lib/content/email-your-mp";
import { compareWithLive } from "./compare";

// The Email your MP form, local against live, at each step up to sending:
// ZZ99ZZ finds the test MP on both. It stops at the confirm box, so it never
// sends a letter or a confirmation email from either.
//
// Live needs the tool deployed, the MP sync run once, and TEST_MP_EMAIL set,
// or it shows a 404 or "no email listed" and the diff fails, rightly. The
// local build's database has only the test MP (playwright.config.ts).

const PAGE = "/email-your-mp-v2";

async function lookUpTestMp(page: Page, base: string) {
  await page.goto(`${base}${PAGE}`);
  await page.waitForLoadState("load");
  await page.getByLabel(copy.lookup.nameLabel).fill("Jane Smith");
  await page.getByLabel(copy.lookup.postcodeLabel).fill("ZZ9 9ZZ");
  await page.getByRole("button", { name: copy.lookup.button }).click();
  await page.getByRole("heading", { name: "Testy McTestface MP" }).waitFor();
}

// The test MP's inbox, the footer year, and Cloudflare's widget, which draws
// whatever its own checks decide.
const masks = (page: Page) => [page.locator("[data-mp-email]"), page.locator("#year"), page.locator("[data-turnstile]")];

test("visual diff: ZZ99ZZ finds the test MP and drafts the letter", async ({ page }, testInfo) => {
  await compareWithLive(page, testInfo, `${PAGE} after looking up ZZ99ZZ`, { prepare: lookUpTestMp, masks });
});

test("visual diff: ZZ99ZZ, filled in and asking to confirm", async ({ page }, testInfo) => {
  await compareWithLive(page, testInfo, `${PAGE} asking to confirm`, {
    prepare: async (page, base) => {
      await lookUpTestMp(page, base);
      await page.getByLabel(copy.form.emailLabel).fill("jane@example.com");
      await page.getByRole("textbox", { name: copy.form.addressLabel }).fill("1 High Street\nTestville");
      // Only opens the confirm box: nothing is sent until "confirm and send".
      await page.getByRole("button", { name: copy.form.send }).click();
      await page.getByRole("button", { name: copy.form.confirmSend }).waitFor();
    },
    masks,
  });
});
