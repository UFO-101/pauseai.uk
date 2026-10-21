import type { Page } from "@playwright/test";
import { marchSignupCopy as copy } from "@/lib/content/march-signup";
import { BASE, expect, frame, test } from "./fixtures";
import { hydrated, layoutSettled, scrollSettled } from "./settle";

// The march sign-up at /march (app/(march)/): its own header, which drops in
// past the hero; the form, which adds the person to the Luma event (the
// fixture takes every guest but luma-fails@ and luma-skips@); and the share
// step after it.

const header = (page: Page) => page.getByRole("banner");

async function openSignup(page: Page) {
  await page.goto(`${BASE}/march`);
  await hydrated(page);
  await layoutSettled(page, "main");
}

/** Fills in the form at the foot of the page, reached by the hero's button. */
async function fillIn(page: Page, email: string) {
  await page.getByRole("link", { name: "Register now" }).click();
  await scrollSettled(page);
  await page.getByLabel(copy.form.firstName).fill("Testy");
  await page.getByLabel(copy.form.lastName).fill("McTestface");
  await page.getByLabel(copy.form.email).fill(email);
}

test("registering, then on to the share step", { tag: "@phone" }, async ({ page }, testInfo) => {
  await openSignup(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/March AgainstAI Extinction/);
  // Over the hero the header is out of sight; the site's own nav isn't there at all.
  await expect(header(page)).not.toBeInViewport();
  await expect(page.locator("header")).toHaveCount(1);
  await expect(page.locator("nav")).toHaveCount(0);
  await expect(page.getByRole("contentinfo")).toBeVisible();
  await frame(page, "the sign-up page, with the site's footer and no nav");

  await fillIn(page, `march-${testInfo.testId}@example.org`);
  await expect(header(page)).toBeInViewport();
  await expect(page.getByRole("heading", { name: "Register for the march" })).toBeInViewport();
  await frame(page, "the form, filled in, under the header that dropped in");

  await page.getByRole("button", { name: copy.form.submit, exact: true }).click();
  await expect(page).toHaveURL(`${BASE}/march/share`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Now bringpeople with you/);
  await expect(header(page)).toBeInViewport();
  await scrollSettled(page);
  await frame(page, "the share step");
});

test("a registration Luma doesn't take", { tag: "@phone" }, async ({ page }) => {
  await openSignup(page);
  await fillIn(page, "luma-fails@example.org");
  await page.getByRole("button", { name: copy.form.submit, exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(copy.form.failed);
  await expect(page.getByRole("link", { name: copy.form.lumaFallback })).toHaveAttribute(
    "href",
    "https://luma.com/pauseai-nov26",
  );
  await expect(page).toHaveURL(`${BASE}/march#register`);
  await frame(page, "the form says it didn't go through, and offers Luma's page");
});

test("a name the server won't take", async ({ page }) => {
  await openSignup(page);
  await fillIn(page, "testy@example");
  await page.getByRole("button", { name: copy.form.submit, exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText(copy.errors.emailInvalid);
  await frame(page, "the form asks for a valid email");
});

test("the scroll cue glides past the hero, and the header comes with it", async ({ page }) => {
  await openSignup(page);
  await page.getByRole("button", { name: "Scroll down" }).click();
  await expect(page.getByRole("heading", { name: /Why we.re marching/ })).toBeInViewport();
  await scrollSettled(page);
  await expect(header(page)).toBeInViewport();
  await frame(page, "past the hero, the header in");
});

test("sharing, then calling it a day", { tag: "@phone" }, async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(`${BASE}/march/share`);
  await hydrated(page);
  await frame(page, "the share step, before anything's shared");

  await page.getByRole("button", { name: copy.share.copy }).click();
  await expect(page.getByRole("status")).toContainText(copy.share.nudgeTitle);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(copy.share.message);
  await page.getByRole("button", { name: copy.share.copy }).waitFor();
  await frame(page, "copied, and asked where else");

  await page.getByRole("button", { name: copy.share.finish }).click();
  const thanks = page.getByRole("heading", { name: "Thank you for registering" });
  await expect(thanks).toBeFocused();
  await scrollSettled(page);
  await frame(page, "the thank-you card");

  await page.reload();
  await hydrated(page);
  await expect(thanks).toBeVisible();
  await expect(page.getByRole("button", { name: copy.share.finish })).toHaveCount(0);
});
