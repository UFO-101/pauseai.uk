// The steps a person takes through the site, for the storyboard's flows
// (tests/storyboard/): the Email your MP flow, staff login, and reading what
// the build sent. Every step takes the host, so a flow can run against any
// build.
import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { copy } from "@/lib/content/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import { TEST_MPS, type TestMp } from "@/lib/test-mps";
import { FIXTURE_NOW, OUTBOX_DIR } from "./fixture-env.mjs";
import { type OutboxEmail, readOutbox } from "./fixtures/outbox";
import { lumaPersonWebhook, lumaWebhookHeaders } from "./luma-webhooks";

// Redirects to the first campaign.
const TOOL_PAGE = "/campaigns";

/** Basic auth for the Postmark webhooks, as a fixture build is configured. */
export const WEBHOOK_AUTH = `Basic ${Buffer.from("postmark:fixture-webhook-password").toString("base64")}`;

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
  await page.route("https://challenges.cloudflare.com/**", (route) =>
    route.fulfill({ contentType: "text/javascript", body: FAKE_TURNSTILE }),
  );
}

/**
 * Copies the MPs into the flow's database through the nightly sync's own
 * route (the fixture Parliament: two MPs), and refreshes the test MPs.
 */
export async function syncMps(request: APIRequestContext, base: string) {
  const res = await request.post(`${base}/api/cron/sync-mps`, {
    headers: { Authorization: "Bearer fixture-cron-secret" },
  });
  if (!res.ok()) throw new Error(`MP sync on ${base} failed: ${res.status()} ${await res.text()}`);
}

/** Copies the fixture Luma calendar into the flow's database through the hourly import's own route. */
export async function importLuma(request: APIRequestContext, base: string) {
  const res = await request.post(`${base}/api/cron/import-luma`, {
    headers: { Authorization: "Bearer fixture-cron-secret" },
  });
  if (!res.ok()) throw new Error(`Luma import on ${base} failed: ${res.status()} ${await res.text()}`);
}

/**
 * Posts one of Luma's calendar.person webhooks for `email`, signed with the
 * fixture build's secret at its fixed clock, which is what its five-minute
 * window is measured against.
 */
export async function postLumaWebhook(
  request: APIRequestContext,
  base: string,
  type: "calendar.person.unsubscribed" | "calendar.person.subscribed",
  email: string,
  webhookId: string,
) {
  const body = JSON.stringify(lumaPersonWebhook(type, email));
  const res = await request.post(`${base}/api/luma/webhook`, {
    headers: lumaWebhookHeaders(body, new Date(FIXTURE_NOW), webhookId),
    data: body,
  });
  if (!res.ok()) throw new Error(`Luma webhook on ${base} failed: ${res.status()} ${await res.text()}`);
  return (await res.json()) as { recorded: boolean };
}

/** Opens the tool and fills in the name and a postcode, without looking it up yet. */
export async function openLookup(page: Page, base: string, postcode = "ZZ9 9ZZ", path = TOOL_PAGE) {
  const response = await page.goto(`${base}${path}`);
  if (!response?.ok()) throw new Error(`${base}${path} returned ${response?.status()}: is the tool deployed there?`);
  await page.waitForLoadState("load");
  // Filling scrolls the field into view; a font that swaps in afterwards
  // moves the page under it, and the frame with it.
  await page.evaluate(() => document.fonts.ready);
  await page.getByLabel(copy.lookup.nameLabel).fill("Jane Smith");
  await page.getByLabel(copy.lookup.addressLabel).fill("1 High Street, Testville");
  await page.getByLabel(copy.lookup.postcodeLabel).fill(postcode);
}

/**
 * Looks up a test MP, ZZ99ZZ unless told otherwise, and waits for them and
 * their letter. Fails fast, saying why, rather than waiting out the test's
 * timeout for a field or a heading that will never appear.
 */
export async function lookUpTestMp(page: Page, base: string, mp: TestMp = TEST_MPS[0]) {
  await openLookup(page, base, `${mp.postcode.slice(0, -3)} ${mp.postcode.slice(-3)}`);
  await page.getByRole("button", { name: copy.lookup.button }).click();

  const found = page.getByRole("heading", { name: mp.name });
  const refused = page.locator("p[role=alert]");
  await found.or(refused).first().waitFor({ timeout: 10_000 });
  if (await refused.isVisible()) {
    throw new Error(
      `${mp.postcode} on ${base} said: "${await refused.textContent()}". Does its database have the test MP?`,
    );
  }
  if (await page.getByText(copy.lookup.noEmail).isVisible()) {
    throw new Error(`The test MP on ${base} has no email, so there's no form: set TEST_MP_EMAIL there.`);
  }
}

/** Fills in the letter form and goes to its preview. Nothing is sent yet. */
export async function fillLetter(page: Page, email: string) {
  await page.getByLabel(copy.form.emailLabel).fill(email);
  await page.getByRole("button", { name: copy.form.preview }).click();
  await page.getByRole("button", { name: copy.preview.send }).waitFor();
}

/** Sends the letter from its preview, and waits for the "sent" page. */
export async function sendLetter(page: Page, mp: TestMp = TEST_MPS[0]) {
  await page.getByRole("button", { name: copy.preview.send }).click();
  await expect(page.getByRole("status")).toHaveText(copy.sent.body(mp.name));
}

/** The newest email the build under test has sent that `matches`. */
export function newestEmail(matches: (email: OutboxEmail) => boolean): OutboxEmail | undefined {
  return readOutbox(OUTBOX_DIR).filter(matches).at(-1);
}

/** The newest email sent to `to`. */
export function newestEmailTo(to: string): OutboxEmail | undefined {
  return newestEmail((email) => email.To === to);
}

/** The login link in the newest email to `email`, if it got one. */
export function loginLinkFor(email: string): string | undefined {
  return newestEmailTo(email)?.TextBody.match(/https?:\/\/\S+\/staff\/api\/callback\?token=[\w-]+/)?.[0];
}

/** Asks for a login link for `email`, and waits for "check your inbox". */
export async function askForLoginLink(page: Page, base: string, email: string) {
  const login = await page.goto(`${base}/staff/login`);
  if (!login?.ok()) throw new Error(`${base}/staff/login returned ${login?.status()}: is the staff interface there?`);
  await page.getByLabel(staffCopy.login.emailLabel).fill(email);
  await page.getByRole("button", { name: staffCopy.login.button }).click();
  await expect(page.getByRole("status")).toHaveText(staffCopy.login.sent);
}

/**
 * Logs in on `base` as `email`, as staff do: asks for a link, takes it from
 * the build's outbox (tests/fixtures/outbox.ts), and opens it in the same
 * browser. There's no login bypass. For an address that gets no link, stops
 * at "check your inbox" and returns false.
 */
export async function logInAsStaff(page: Page, base: string, email = "staff@pauseai.uk"): Promise<boolean> {
  await askForLoginLink(page, base, email);
  const link = loginLinkFor(email);
  if (!link) return false;
  // In the same browser that asked for it, so it logs in.
  await page.goto(link);
  return true;
}
