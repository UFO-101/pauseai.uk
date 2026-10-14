import { test, expect, type Page } from "@playwright/test";
import { campaigns, copy } from "@/lib/content/email-your-mp";
import { fakeTurnstile } from "../steps";
import { BASE, newestEmailTo, syncFixtureMps, WEBHOOK_AUTH } from "./setup";

// Email your MP, version 2, end to end on fixture data. ZZ99ZZ finds the test
// MP, so the whole flow runs as it would for a real one. Emails go to the
// fixture Postmark, and the outbox shows what was sent.

test.beforeAll(async ({ request }) => syncFixtureMps(request));

test.beforeEach(async ({ page }) => fakeTurnstile(page));

type AdsWindow = Window & { dataLayer?: Record<string, unknown>[] };

/** The mp_email_sent events GTM has been told about. */
function adsEvents(page: Page) {
  return page.evaluate(() => ((window as AdsWindow).dataLayer ?? []).filter((e) => e.event === "mp_email_sent").length);
}

async function lookUpTestMp(page: Page, path = "/campaigns-v2") {
  await page.goto(`${BASE}${path}`);
  await page.getByLabel(copy.lookup.nameLabel).fill("Jane Smith");
  await page.getByLabel(copy.lookup.postcodeLabel).fill("ZZ9 9ZZ");
  await page.getByRole("button", { name: copy.lookup.button }).click();
  await expect(page.getByRole("heading", { name: "Testy McTestface MP" })).toBeVisible();
}

async function fillAndSend(page: Page, email: string) {
  await page.getByLabel(copy.form.emailLabel).fill(email);
  await page.getByRole("textbox", { name: copy.form.addressLabel }).fill("1 High Street\nTestville");
  await page.getByRole("button", { name: copy.form.send }).click();
  await page.getByRole("button", { name: copy.form.confirmSend }).click();
}

test("the ZZ99ZZ flow: postcode, form, confirmation link, sent, and a reply forwarded", async ({ page, request }) => {
  // A fresh address each run, so the daily cap and older emails don't get in the way.
  const sender = `jane+${Date.now()}@example.com`;
  await lookUpTestMp(page);
  await expect(page.getByLabel(copy.form.subjectLabel)).toHaveValue(campaigns[0].subject);
  await fillAndSend(page, sender);

  await expect(page.getByRole("status")).toHaveText(copy.form.checkInbox);
  expect(await adsEvents(page)).toBe(1);

  const confirmation = newestEmailTo(sender)!;
  expect(confirmation.Subject).toBe(copy.confirmationEmail.subject);
  const link = confirmation.TextBody.match(/https?:\/\/\S+\/campaigns-v2\/confirm#[\w-]+/)![0];
  await page.goto(link);
  await expect(page.getByRole("status")).toHaveText(copy.confirm.sent("Testy McTestface MP"));

  const letter = newestEmailTo("test-mp@example.org")!;
  const address = letter.From.match(/<(reply\+(\w+)@mp\.pauseai\.uk)>/)!;
  expect(letter.From).toBe(`"Jane Smith via PauseAI" <${address[1]}>`);
  expect(letter.ReplyTo).toBe(`${sender}, ${address[1]}`);
  expect(letter.TextBody).toMatch(/Jane Smith\n1 High Street\nTestville\nZZ9 9ZZ$/);
  expect(letter.Attachments!.map((a) => a.Name)).toEqual(campaigns[0].attachments.map((a) => a.file));

  // The link works once. (Away first: the same URL again is only a jump to its #fragment.)
  await page.goto("about:blank");
  await page.goto(link);
  await expect(page.getByRole("status")).toHaveText(copy.confirm.invalid);

  // The MP replies only to the letter's address: both we and the sender get a copy.
  const reply = await request.post(`${BASE}/api/postmark/inbound`, {
    headers: { Authorization: WEBHOOK_AUTH },
    data: {
      MailboxHash: address[2],
      FromFull: { Email: "test-mp@example.org", Name: "Testy McTestface MP" },
      ToFull: [{ Email: address[1], Name: "", MailboxHash: address[2] }],
      CcFull: [],
      Subject: `Re: ${letter.Subject}`,
      TextBody: "Thank you for writing.",
    },
  });
  expect(await reply.json()).toEqual({ forwarded: 2 });
  for (const to of ["replies@example.org", sender]) {
    const copied = newestEmailTo(to)!;
    expect(copied.TextBody).toContain("Thank you for writing.");
    expect(copied.ReplyTo).toBe("test-mp@example.org");
  }
});

test("no Ads event when the server refuses the letter", async ({ page }) => {
  await lookUpTestMp(page);
  await fillAndSend(page, "not-an-email");

  await expect(page.getByText(copy.errors.invalidEmail)).toBeVisible();
  expect(await adsEvents(page)).toBe(0);
});

test("the Postmark webhooks refuse requests without our credentials", async ({ request }) => {
  const wrong = `Basic ${Buffer.from("postmark:guess").toString("base64")}`;
  for (const path of ["/api/postmark/bounce", "/api/postmark/inbound"]) {
    expect((await request.post(`${BASE}${path}`, { data: {} })).status(), path).toBe(401);
    expect((await request.post(`${BASE}${path}`, { headers: { Authorization: wrong }, data: {} })).status(), path).toBe(401);
  }
  const bounce = await request.post(`${BASE}/api/postmark/bounce`, {
    headers: { Authorization: WEBHOOK_AUTH },
    data: { RecordType: "Bounce", MessageID: "not-a-letter", Type: "HardBounce" },
  });
  expect(await bounce.json()).toEqual({ recorded: false });
});

test("each campaign has its own page, plain /campaigns-v2 opens the first, and an unknown one is a 404", async ({ page, request }) => {
  for (const campaign of campaigns) {
    await page.goto(`${BASE}/campaigns-v2/${campaign.slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(campaign.title);
  }
  await page.goto(`${BASE}/campaigns-v2`);
  await expect(page).toHaveURL(`${BASE}/campaigns-v2/${campaigns[0].slug}`);
  expect((await request.get(`${BASE}/campaigns-v2/no-such-campaign`)).status()).toBe(404);
});

test("version 2 is unlisted and kept out of search", async ({ page, request }) => {
  await page.goto(`${BASE}/campaigns-v2`);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  expect(await (await request.get(`${BASE}/sitemap.xml`)).text()).not.toContain("campaigns-v2");
  await page.goto(`${BASE}/`);
  await expect(page.locator('a[href*="campaigns-v2"]')).toHaveCount(0);
});
