// Steps through the site that more than one Playwright suite takes, on any
// host: the Email your MP flow, and staff login through the fixture Google.
import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { copy } from "@/lib/content/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import { readOutbox } from "./fixtures/outbox";

// Redirects to the first campaign.
export const TOOL_PAGE = "/campaigns-v2";

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

/** Serves the stand-in Turnstile script to this page, on every host. */
export async function fakeTurnstile(page: Page) {
  await page.route("https://challenges.cloudflare.com/**", (route) => route.fulfill({ contentType: "text/javascript", body: FAKE_TURNSTILE }));
}

/**
 * Copies the MPs into a fixture build's database through the nightly sync's
 * own route (the fixture Parliament: two MPs), and adds the test MP.
 */
export async function syncMps(request: APIRequestContext, base: string) {
  const res = await request.post(`${base}/api/cron/sync-mps`, { headers: { Authorization: "Bearer fixture-cron-secret" } });
  if (!res.ok()) throw new Error(`MP sync on ${base} failed: ${res.status()} ${await res.text()}`);
}

/**
 * Looks up ZZ99ZZ and waits for the test MP and their letter. Fails fast,
 * saying why, rather than waiting out the test's timeout for a field or a
 * heading that will never appear.
 */
export async function lookUpTestMp(page: Page, base: string, path = TOOL_PAGE) {
  const response = await page.goto(`${base}${path}`);
  if (!response?.ok()) throw new Error(`${base}${path} returned ${response?.status()}: is the tool deployed there?`);
  await page.waitForLoadState("load");
  await page.getByLabel(copy.lookup.nameLabel).fill("Jane Smith");
  await page.getByLabel(copy.lookup.postcodeLabel).fill("ZZ9 9ZZ");
  await page.getByRole("button", { name: copy.lookup.button }).click();

  const found = page.getByRole("heading", { name: "Testy McTestface MP" });
  const refused = page.locator("p[role=alert]");
  await found.or(refused).first().waitFor({ timeout: 10_000 });
  if (await refused.isVisible()) {
    throw new Error(`ZZ99ZZ on ${base} said: "${await refused.textContent()}". Does its database have the test MP?`);
  }
  if (await page.getByText(copy.lookup.noEmail).isVisible()) {
    throw new Error(`The test MP on ${base} has no email, so there's no form: set TEST_MP_EMAIL there.`);
  }
}

/** Fills in the letter form and opens the confirm box. Nothing is sent yet. */
export async function fillLetter(page: Page, email: string) {
  await page.getByLabel(copy.form.emailLabel).fill(email);
  await page.getByRole("textbox", { name: copy.form.addressLabel }).fill("1 High Street\nTestville");
  await page.getByRole("button", { name: copy.form.send }).click();
  await page.getByRole("button", { name: copy.form.confirmSend }).waitFor();
}

/** Sends the letter from the confirm box, and waits for "check your inbox". */
export async function sendLetter(page: Page) {
  await page.getByRole("button", { name: copy.form.confirmSend }).click();
  await expect(page.getByRole("status")).toHaveText(copy.form.checkInbox);
}

type OutboxEmail = { To: string; TextBody: string };

/** The confirmation link in the newest email to `to`, in a fixture build's outbox. */
export function confirmationLink(outboxDir: string, to: string): string {
  const email = (readOutbox(outboxDir) as OutboxEmail[]).filter((e) => e.To === to).at(-1);
  const link = email?.TextBody.match(/https?:\/\/\S+\/confirm#[\w-]+/)?.[0];
  if (!link) throw new Error(`No confirmation email to ${to} in ${outboxDir}`);
  return link;
}

/**
 * Logs in on `base` as `code`'s account through the fixture Google
 * (tests/fixtures/outside-services.ts). Playwright can't intercept a request
 * that follows a redirect, so this takes the login route's redirect to
 * Google and sends the browser straight back, as Google would once the
 * account is chosen. The login route still makes the state and its cookie.
 */
export async function logInAsStaff(page: Page, base: string, code = "fixture-staff") {
  await page.route("https://accounts.google.com/**", (route) => route.abort());
  await page.route(`${base}/staff/api/login`, async (route) => {
    const response = await route.fetch({ maxRedirects: 0 });
    const google = new URL(response.headers().location);
    const back = new URL(google.searchParams.get("redirect_uri")!);
    back.searchParams.set("code", code);
    back.searchParams.set("state", google.searchParams.get("state")!);
    await route.fulfill({ response, headers: { ...response.headers(), location: back.toString() } });
  });
  const login = await page.goto(`${base}/staff/login`);
  if (!login?.ok()) throw new Error(`${base}/staff/login returned ${login?.status()}: is the staff interface there?`);
  await page.getByRole("link", { name: staffCopy.login.button }).click();
}
