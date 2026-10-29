import type { Locator, Page } from "@playwright/test";
import { marchSignupCopy as copy } from "@/lib/content/march-signup";
import { BASE, expect, frame, test } from "./fixtures";
import { hydrated, layoutSettled, scrollSettled } from "./settle";

// The march sign-up (app/(march)/): its own header, which drops in past the
// hero; the form, which adds the person to the Luma event; and the cards it
// turns into, in place: the share card.

const header = (page: Page) => page.getByRole("banner");
/** The share card's confirmation, where focus lands after registering. */
const registered = (page: Page) => page.locator("[data-focus-first]", { hasText: copy.share.registered });

type DataLayerWindow = Window & { dataLayer?: ArrayLike<unknown>[] };

/**
 * The events the page has sent to GA through gtag, read off the dataLayer, where
 * CookieConsent's gtag pushes every command.
 */
function marchEvents(page: Page) {
  return page.evaluate(() =>
    ((window as DataLayerWindow).dataLayer ?? [])
      .map((entry) => Array.from(entry))
      .filter(([command]) => command === "event"),
  );
}

async function openSignup(page: Page) {
  await page.goto(`${BASE}/protests/march-against-ai-extinction-nov-26`);
  await hydrated(page);
  await layoutSettled(page, "main");
}

/** A new card's title, scrolled to the top of the window but clear of the header. */
async function expectBelowHeader(page: Page, title: Locator) {
  const bar = (await header(page).boundingBox())!;
  const top = (await title.boundingBox())!.y;
  expect(top).toBeGreaterThanOrEqual(bar.y + bar.height);
  expect(top).toBeLessThan(page.viewportSize()!.height / 2);
}

/** Fills in the form at the foot of the page, reached by the hero's button. */
async function fillIn(page: Page, email: string) {
  await page.getByRole("link", { name: "Register now" }).click();
  await scrollSettled(page);
  await page.getByLabel(copy.form.name).fill("Testy McTestface");
  await page.getByLabel(copy.form.email).fill(email);
}

test("Register: the form becomes the share card", { tag: "@phone" }, async ({ page }, testInfo) => {
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
  const confirmation = registered(page);
  await expect(confirmation).toBeFocused();
  await expect(confirmation).toContainText(`march-${testInfo.testId}@example.org`);
  await expect(page).toHaveURL(`${BASE}/protests/march-against-ai-extinction-nov-26#register`);
  await expect(page.getByRole("link", { name: copy.share.impact.link })).toBeVisible();
  await scrollSettled(page);
  await expectBelowHeader(page, confirmation);
  await frame(page, "the share card, where the form was, saying they're registered");
});

test("Register when Luma fails", { tag: "@phone" }, async ({ page }) => {
  await openSignup(page);
  await fillIn(page, "luma-fails@example.org");
  await page.getByRole("button", { name: copy.form.submit, exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(copy.form.failed);
  await expect(page.getByRole("link", { name: copy.form.lumaFallback })).toHaveAttribute(
    "href",
    "https://luma.com/pauseai-nov26",
  );
  await expect(page).toHaveURL(`${BASE}/protests/march-against-ai-extinction-nov-26#register`);
  await frame(page, "the form says it didn't go through, and offers Luma's page");
});

test("Register with a name the server refuses", async ({ page }) => {
  await openSignup(page);
  await fillIn(page, "testy@example");
  await page.getByRole("button", { name: copy.form.submit, exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText(copy.errors.emailInvalid);
  await frame(page, "the form asks for a valid email");
});

test("how many have registered, asked for again on coming back to the page", { tag: "@phone" }, async ({ page }) => {
  await openSignup(page);
  // The fixture event's approved guests, beside the hero's button too.
  const hero = page.locator("section").filter({ has: page.getByRole("heading", { level: 1 }) });
  await expect(hero).toContainText(`1,234 ${copy.form.count}`);
  await expect(hero.getByText(`1,234 ${copy.form.count}`)).toBeInViewport();
  await frame(page, "the hero, with how many have registered beside its button");

  await page.getByRole("link", { name: "Register now" }).click();
  await scrollSettled(page);
  const form = page.locator("form");
  await expect(form).toContainText(`1,234 ${copy.form.count}`);
  await frame(page, "the form, with how many have registered in its corner");

  // Coming back to the page asks the count's endpoint again, at once.
  const asked = page.waitForResponse((res) => res.url().endsWith("/api/march/signups") && res.ok());
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(await (await asked).json()).toEqual({ count: 1234 });
  await expect(form).toContainText(`1,234 ${copy.form.count}`);
  await expect(hero).toContainText(`1,234 ${copy.form.count}`);
});

test("The scroll cue: past the photos, the header follows", async ({ page }) => {
  await openSignup(page);
  await page.getByRole("button", { name: "Scroll down" }).click();
  await expect(page.getByRole("heading", { name: /Why we.re marching/ })).toBeInViewport();
  await scrollSettled(page);
  await expect(header(page)).toBeInViewport();
  await frame(page, "past the hero, the header in");
});

test("Share, then register someone else", { tag: "@phone" }, async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openSignup(page);
  await fillIn(page, "testy@example.org");
  await page.getByRole("button", { name: copy.form.submit, exact: true }).click();
  await expect(registered(page)).toBeFocused();
  // The card glides into place first: pressing Copy mid-glide would scroll the
  // button into view and stop the page wherever the glide had got to.
  await scrollSettled(page);

  await page.getByRole("button", { name: copy.share.copy }).click();
  await expect(page.getByRole("button", { name: copy.share.copied })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(copy.share.message);
  expect(await marchEvents(page)).toEqual([
    ["event", "march_signup", {}],
    ["event", "march_share", { share_method: "copy" }],
  ]);
  await page.getByRole("button", { name: copy.share.copy }).waitFor();
  await scrollSettled(page);
  await frame(page, "the message copied");

  await page.getByRole("button", { name: copy.share.registerAnother }).click();
  await expect(page.getByLabel(copy.form.name)).toBeFocused();
  await expect(page.getByLabel(copy.form.email)).toHaveValue("");
  await scrollSettled(page);
  await frame(page, "the form again, empty, for someone new");
});

test("Press the header's button", { tag: "@desktop-only" }, async ({ page }) => {
  await openSignup(page);
  await page.getByRole("button", { name: "Scroll down" }).click();
  await expect(header(page)).toBeInViewport();
  const button = header(page).getByRole("link", { name: "Register" });
  await button.hover();
  await page.mouse.down();
  await expect
    .poll(() => button.evaluate((el) => [getComputedStyle(el).transform, getComputedStyle(el).boxShadow]))
    .toEqual(["matrix(1, 0, 0, 1, 4, 4)", expect.stringMatching(/ 0px 0px 0px$/)]);
  await page.mouse.up();
});

test("Tap Register: no grey flash", { tag: "@phone-only" }, async ({ page }) => {
  await openSignup(page);
  await fillIn(page, "testy@example.org");
  await page.getByRole("button", { name: copy.form.submit, exact: true }).tap();
  await expect(registered(page)).toBeFocused();
  await scrollSettled(page);
  // A tap leaves the hover where the finger was; one left over an app, as
  // the next tap on the card can, mustn't lift it.
  const apps = page.getByRole("list").filter({ has: page.getByRole("link", { name: "WhatsApp" }) });
  await apps.scrollIntoViewIfNeeded();
  await scrollSettled(page);
  const telegram = (await apps.getByRole("link", { name: "Telegram" }).boundingBox())!;
  await page.mouse.move(telegram.x + telegram.width / 2, telegram.y + telegram.height / 2);
  expect(await page.evaluate(() => matchMedia("(hover: hover)").matches)).toBe(false);
  const styles = await apps.getByRole("link").evaluateAll(async (links) => {
    // Any hover transition run to its end first.
    await Promise.all(links.flatMap((link) => link.getAnimations().map((animation) => animation.finished)));
    return links.map((link) => [link.matches(":hover"), getComputedStyle(link).transform]);
  });
  expect(styles).toContainEqual([true, "none"]);
  expect(styles.map(([, transform]) => transform)).toEqual(styles.map(() => "none"));
  await frame(page, "the share card, no app highlighted");
});

test("Swipe through the photos", { tag: "@phone-only" }, async ({ page }) => {
  await openSignup(page);
  const strip = page.getByRole("region", { name: "Photos from previous marches" });
  await strip.scrollIntoViewIfNeeded();
  await scrollSettled(page);
  await frame(page, "the first photo, its dot filled");

  // A swipe let go short of the next photo still lands it flush with the
  // screen's left edge.
  const track = strip.locator("div").first();
  const swipeTo = async (photo: number, name: RegExp) => {
    await track.evaluate(
      (el, photo) => el.scrollTo({ left: el.clientWidth * (photo - 0.3), behavior: "instant" }),
      photo,
    );
    const img = strip.getByRole("img", { name });
    await expect(img).toBeInViewport({ ratio: 1 });
    await expect.poll(async () => (await img.boundingBox())!.x).toBeCloseTo(0, 0);
  };
  await swipeTo(1, /No-one wins the race/);
  await frame(page, "the second photo, its dot filled");
  await swipeTo(2, /A crowd of marchers/);
  await frame(page, "the third photo, its dot filled");
  await swipeTo(3, /Commit to safety/);
  await frame(page, "the last photo, its dot filled");
});
