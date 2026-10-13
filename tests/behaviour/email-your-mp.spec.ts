import { test, expect, type Page } from "@playwright/test";
import { campaigns, copy } from "@/lib/content/email-your-mp";
import { BASE, syncFixtureMps } from "./setup";

// Email your MP, version 2, end to end on fixture data. ZZ99ZZ finds the test
// MP, so the whole flow runs as it would for a real one.

test.beforeAll(async ({ request }) => syncFixtureMps(request));

type AdsWindow = Window & { dataLayer?: Record<string, unknown>[] };

/** The mp_email_sent events GTM has been told about. */
function adsEvents(page: Page) {
  return page.evaluate(() => ((window as AdsWindow).dataLayer ?? []).filter((e) => e.event === "mp_email_sent").length);
}

// Cloudflare's real widget mustn't load in a test. This stands in for its
// script: it draws nothing and hands over a token at once, which the
// Turnstile fixture on the server then accepts.
const FAKE_TURNSTILE = `
  window.turnstile = {
    render: (el, options) => { setTimeout(() => options.callback("fixture-token")); return "fake"; },
    remove: () => {},
  };
  window.onTurnstileLoad();
`;

test.beforeEach(async ({ page }) => {
  await page.route("https://challenges.cloudflare.com/**", (route) =>
    route.fulfill({ contentType: "text/javascript", body: FAKE_TURNSTILE }),
  );
});

async function lookUpTestMp(page: Page, path = "/email-your-mp-v2") {
  await page.goto(`${BASE}${path}`);
  await page.getByLabel(copy.lookup.nameLabel).fill("Jane Smith");
  await page.getByLabel(copy.lookup.postcodeLabel).fill("ZZ9 9ZZ");
  await page.getByRole("button", { name: copy.lookup.button }).click();
  await expect(page.getByRole("heading", { name: "Testy McTestface MP" })).toBeVisible();
}

test("the ZZ99ZZ flow: postcode, form, sent, and one Ads event", async ({ page }) => {
  await lookUpTestMp(page);
  await expect(page.getByLabel(copy.form.subjectLabel)).toHaveValue(campaigns[0].subject);
  await page.getByLabel(copy.form.emailLabel).fill("jane@example.com");
  await page.getByRole("button", { name: copy.form.send }).click();
  await page.getByRole("button", { name: copy.form.confirmSend }).click();

  await expect(page.getByRole("status")).toHaveText(copy.form.sent("Testy McTestface MP"));
  expect(await adsEvents(page)).toBe(1);
});

test("no Ads event when the server refuses the letter", async ({ page }) => {
  await lookUpTestMp(page);
  await page.getByLabel(copy.form.emailLabel).fill("not-an-email");
  await page.getByRole("button", { name: copy.form.send }).click();
  await page.getByRole("button", { name: copy.form.confirmSend }).click();

  await expect(page.getByText(copy.errors.invalidEmail)).toBeVisible();
  expect(await adsEvents(page)).toBe(0);
});

test("each campaign has its own page, and an unknown one is a 404", async ({ page, request }) => {
  for (const campaign of campaigns) {
    await page.goto(`${BASE}/email-your-mp-v2/${campaign.slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(campaign.title);
  }
  expect((await request.get(`${BASE}/email-your-mp-v2/no-such-campaign`)).status()).toBe(404);
});

test("version 2 is unlisted and kept out of search", async ({ page, request }) => {
  await page.goto(`${BASE}/email-your-mp-v2`);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  expect(await (await request.get(`${BASE}/sitemap.xml`)).text()).not.toContain("email-your-mp-v2");
  await page.goto(`${BASE}/`);
  await expect(page.locator('a[href*="email-your-mp-v2"]')).toHaveCount(0);
});
