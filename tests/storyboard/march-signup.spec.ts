import type { Locator, Page } from "@playwright/test";
import { marchSignupCopy as copy } from "@/lib/content/march-signup";
import { BASE, expect, madeUpAddress, frame, story, test } from "./fixtures";
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

/**
 * The form's top at the top of the window, under the header. Typing in a field
 * scrolls it into view, which leaves the window a few pixels apart between runs;
 * and the page's scroll-padding is the header's height only once the header has
 * measured itself, so the form is placed by the header's own height, as the
 * scroll-padding puts it (styles/base.css), not by scrollIntoView.
 */
async function formAtTop(page: Page): Promise<void> {
  const form = page.locator("form");
  // Placed again until it stays: the page can still shift a few pixels once it's placed.
  await expect(async () => {
    const clearance = await form.evaluate((el) => {
      const below = document.querySelector("header")!.offsetHeight + 13;
      window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - below, behavior: "instant" });
      return below;
    });
    await scrollSettled(page);
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 100)));
    expect(await form.evaluate((el) => Math.round(el.getBoundingClientRect().top))).toBe(clearance);
  }).toPass();
}

/**
 * The form's message, mid-window. A click leaves the window wherever
 * scrolling the button into view put it, which varies between runs.
 */
async function messageMidWindow(page: Page): Promise<void> {
  const alert = page.locator("form").getByRole("alert");
  await alert.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
  await scrollSettled(page);
  await expect(alert).toBeInViewport();
}

test("Registering for the march", { tag: "@phone" }, async ({ page }) => {
  story(
    "Someone opens the march page. Over the photos at the top there's no header, and the site's own menu isn't on this page at all.",
  );
  await openSignup(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/March AgainstAI Extinction/);
  // Over the hero the header is out of sight; the site's own nav isn't there at all.
  await expect(header(page)).not.toBeInViewport();
  await expect(page.locator("header")).toHaveCount(1);
  await expect(page.locator("nav")).toHaveCount(0);
  await expect(page.getByRole("contentinfo")).toBeVisible();
  await frame(page, "The march page");
  story(
    "They press Register now, which takes them to the form at the foot of the page, and fill it in. The page's header has dropped in at the top.",
  );

  await fillIn(page, madeUpAddress("Testy McTestface", 43, "example.org"));
  await formAtTop(page);
  await expect(header(page)).toBeInViewport();
  await expect(page.locator("form").getByText(copy.form.head, { exact: true })).toBeInViewport();
  await frame(page, "The form, filled in");
  story("They press Register. The form turns into the share card, which says they're registered, with their email.");

  await page.getByRole("button", { name: copy.form.submit, exact: true }).click();
  const confirmation = registered(page);
  await expect(confirmation).toBeFocused();
  await expect(confirmation).toContainText(madeUpAddress("Testy McTestface", 43, "example.org"));
  await expect(page).toHaveURL(`${BASE}/protests/march-against-ai-extinction-nov-26#register`);
  await expect(page.getByRole("link", { name: copy.share.impact.link })).toBeVisible();
  await scrollSettled(page);
  await expectBelowHeader(page, confirmation);
  await frame(page, "The share card");
});

test("Registration fails", { tag: "@phone" }, async ({ page }) => {
  story(
    "Someone registers, but their registration doesn't reach the march's event on Luma. The form says so, and links to the Luma event page to register there instead.",
  );
  await openSignup(page);
  await fillIn(page, "luma-fails@example.org");
  await page.getByRole("button", { name: copy.form.submit, exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(copy.form.failed);
  await expect(page.getByRole("link", { name: copy.form.lumaFallback })).toHaveAttribute(
    "href",
    "https://luma.com/pauseai-nov26",
  );
  await expect(page).toHaveURL(`${BASE}/protests/march-against-ai-extinction-nov-26#register`);
  await messageMidWindow(page);
  await frame(page, "The form's message");
});

test("An invalid email address", async ({ page }) => {
  story("Someone registers with an email address that can't be right. The form asks for a valid one.");
  await openSignup(page);
  await fillIn(page, "testy@example");
  await page.getByRole("button", { name: copy.form.submit, exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText(copy.errors.emailInvalid);
  await messageMidWindow(page);
  await frame(page, "The form's message");
});

test("How many have registered", { tag: "@phone" }, async ({ page }) => {
  story("The march page says how many people have registered so far, beside the Register now button.");
  await openSignup(page);
  // The fixture event's approved guests, beside the hero's button too.
  const hero = page.locator("section").filter({ has: page.getByRole("heading", { level: 1 }) });
  await expect(hero).toContainText(`1,234 ${copy.form.count}`);
  await expect(hero.getByText(`1,234 ${copy.form.count}`)).toBeInViewport();
  await frame(page, "The count beside the button");
  story("The form shows the same count in its corner.");

  await page.getByRole("link", { name: "Register now" }).click();
  await scrollSettled(page);
  const form = page.locator("form");
  await expect(form).toContainText(`1,234 ${copy.form.count}`);
  await frame(page, "The count on the form");
  story("When someone comes back to the page from another tab, it gets the latest count at once.");

  // Coming back to the page asks the count's endpoint again, at once.
  const asked = page.waitForResponse((res) => res.url().endsWith("/api/march/signups") && res.ok());
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(await (await asked).json()).toEqual({ count: 1234 });
  await expect(form).toContainText(`1,234 ${copy.form.count}`);
  await expect(hero).toContainText(`1,234 ${copy.form.count}`);
});

test("The scroll-down button", async ({ page }) => {
  story(
    "Someone presses the button to scroll down past the photos. The page moves to why we're marching, and the header drops in.",
  );
  await openSignup(page);
  await page.getByRole("button", { name: "Scroll down" }).click();
  await expect(page.getByRole("heading", { name: /Why we.re marching/ })).toBeInViewport();
  await scrollSettled(page);
  await expect(header(page)).toBeInViewport();
  await frame(page, "Past the photos, with the header");
});

test("Sharing, and registering someone new", { tag: "@phone" }, async ({ page, context }) => {
  story(
    "After registering, someone copies the share card's message to send to friends. The button says it's copied, and we count the registration and the share in our analytics.",
  );
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
  await frame(page, "The message, copied");
  story("Then they press Register someone new. The form comes back empty, ready for the next person.");

  await page.getByRole("button", { name: copy.share.registerAnother }).click();
  await expect(page.getByLabel(copy.form.name)).toBeFocused();
  await expect(page.getByLabel(copy.form.email)).toHaveValue("");
  await scrollSettled(page);
  await frame(page, "The form, empty");
});

test("The header's Register button", { tag: "@desktop-only" }, async ({ page }) => {
  story("Pressing the Register button in the header pushes it down into its shadow, like a real button.");
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

test("Tapping on a phone", { tag: "@phone-only" }, async ({ page }) => {
  story(
    "On a phone, someone taps Register and the share card appears. Where their finger rests next, over one of the apps to share to, doesn't lift that app as a mouse would.",
  );
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
  await frame(page, "The share card, no app lifted");
});

test("Swiping through the photos", { tag: "@phone-only" }, async ({ page }) => {
  story("On a phone, the photos from past marches are a strip to swipe through. Dots show which photo is showing.");
  await openSignup(page);
  const strip = page.getByRole("region", { name: "Photos from previous marches" });
  await strip.scrollIntoViewIfNeeded();
  await scrollSettled(page);
  await frame(page, "The first photo");
  story(
    "Each swipe, even one let go short, lands the next photo square with the edge of the screen, and fills its dot.",
  );

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
  await frame(page, "The second photo");
  await swipeTo(2, /A crowd of marchers/);
  await frame(page, "The third photo");
  await swipeTo(3, /Commit to safety/);
  await frame(page, "The last photo");
});
