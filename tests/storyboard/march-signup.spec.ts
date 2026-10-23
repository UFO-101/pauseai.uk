import type { Locator, Page } from "@playwright/test";
import { marchSignupCopy as copy } from "@/lib/content/march-signup";
import { BASE, expect, frame, test } from "./fixtures";
import { hydrated, layoutSettled, scrollSettled } from "./settle";

// The march sign-up, the march's page (app/(march)/): its own header, which drops in
// past the hero; the form, which adds the person to the Luma event (the
// fixture takes every guest but luma-fails@ and luma-skips@); and the cards
// it turns into, in place: the share card, then the thank-you.

const header = (page: Page) => page.getByRole("banner");

type GtagWindow = Window & { gtag?: (...args: unknown[]) => void; gtagCalls?: unknown[][] };

/**
 * Stands in for GA's gtag, which fixture builds don't load, keeping the calls
 * the page makes to it, for marchEvents to read.
 */
function recordGtag(page: Page) {
  return page.addInitScript(() => {
    const w = window as GtagWindow;
    w.gtagCalls = [];
    w.gtag = (...args) => w.gtagCalls!.push(args);
  });
}

/** The events the page has sent to GA through gtag. */
function marchEvents(page: Page) {
  return page.evaluate(() => ((window as GtagWindow).gtagCalls ?? []).filter(([command]) => command === "event"));
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

test("registering, and the form turns into the share card", { tag: "@phone" }, async ({ page }, testInfo) => {
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
  const title = page.getByRole("heading", { name: copy.share.title });
  await expect(title).toBeFocused();
  await expect(page).toHaveURL(`${BASE}/protests/march-against-ai-extinction-nov-26#register`);
  await expect(page.getByRole("link", { name: copy.share.impact.link })).toBeVisible();
  await scrollSettled(page);
  await expectBelowHeader(page, title);
  await frame(page, "the share card, where the form was");
});

test("arriving by a tagged link, registering sends its tag", async ({ page }, testInfo) => {
  await page.goto(`${BASE}/march?utm_source=in`);
  await hydrated(page);
  await layoutSettled(page, "main");
  await fillIn(page, `tagged-${testInfo.testId}@example.org`);
  const sent = page.waitForRequest("**/api/march/register");
  await page.getByRole("button", { name: copy.form.submit, exact: true }).click();
  expect((await sent).postDataJSON().tags).toEqual({ source: "in" });
  await expect(page.getByRole("heading", { name: copy.share.title })).toBeFocused();
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
  await expect(page).toHaveURL(`${BASE}/protests/march-against-ai-extinction-nov-26#register`);
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

test("sharing, then calling it a day, then registering someone new", { tag: "@phone" }, async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await recordGtag(page);
  await openSignup(page);
  await fillIn(page, "testy@example.org");
  await page.getByRole("button", { name: copy.form.submit, exact: true }).click();
  await expect(page.getByRole("heading", { name: copy.share.title })).toBeFocused();

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

  await page.getByRole("button", { name: copy.share.finish }).click();
  await expect(page.getByRole("heading", { name: "Thank you for registering" })).toBeFocused();
  await scrollSettled(page);
  await expectBelowHeader(page, page.getByRole("heading", { name: "Thank you for registering" }));
  await frame(page, "the thank-you card");

  await page.getByRole("button", { name: copy.thanks.registerAnother }).click();
  await expect(page.getByLabel(copy.form.name)).toBeFocused();
  await expect(page.getByLabel(copy.form.email)).toHaveValue("");
  await scrollSettled(page);
  await frame(page, "the form again, empty, for someone new");
});

test("pressing the header's button pushes it into its shadow", { tag: "@desktop-only" }, async ({ page }) => {
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

test("tapping Register leaves no app highlighted under the finger", { tag: "@phone-only" }, async ({ page }) => {
  await openSignup(page);
  await fillIn(page, "testy@example.org");
  await page.getByRole("button", { name: copy.form.submit, exact: true }).tap();
  await expect(page.getByRole("heading", { name: copy.share.title })).toBeFocused();
  await scrollSettled(page);
  // A tap leaves the hover where the finger was, which is now over the app
  // row: the button's place in the form is Telegram's in the share card.
  const apps = page.getByRole("list").filter({ has: page.getByRole("link", { name: "WhatsApp" }) });
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

test("swiping through the photos, a dot for each", { tag: "@phone-only" }, async ({ page }) => {
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
