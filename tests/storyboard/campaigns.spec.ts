import type { Page } from "@playwright/test";
import { campaigns, copy } from "@/lib/content/email-your-mp";
import { site } from "@/lib/content/site";
import { fakeTurnstile, fillLetter, lookUpTestMp, openLookup, sendLetter, WEBHOOK_AUTH } from "../steps";
import { BASE, emailFrame, expect, madeUpAddress, frame, story, test } from "./fixtures";
import { caretAt, editor, newParagraphAboveSignOff, paste, toolbar } from "./editor-steps";
import { letterIdOf, sentEmail, MPS_PROXY } from "./letters-inbox-steps";
import { wholePage } from "./settle";

// Email your MP, end to end on fixture data. ZZ99ZZ finds the test
// MP, so the whole flow runs as it would for a real one. Emails go to the
// fixture Postmark, and the outbox shows what was sent.

test.beforeEach(async ({ page }) => fakeTurnstile(page));

type AdsWindow = Window & { dataLayer?: Record<string, unknown>[] };

/** The mp_email_sent events GTM has been told about. */
function adsEvents(page: Page) {
  return page.evaluate(() => ((window as AdsWindow).dataLayer ?? []).filter((e) => e.event === "mp_email_sent").length);
}

const PAGE = `${BASE}/campaigns/${campaigns[0].slug}`;

/** Looks up ZZ99ZZ, then checks the address is the write page's. */
async function lookUp(page: Page) {
  await lookUpTestMp(page, BASE);
  await expect(page).toHaveURL(`${PAGE}/write`);
}

async function fillAndPreview(page: Page, email: string) {
  await fillLetter(page, email);
  await expect(page).toHaveURL(`${PAGE}/preview`);
}

test("Jane writes to her MP (ZZ99ZZ)", { tag: "@phone" }, async ({ page, flowDatabase }) => {
  story("Jane fills in her name, address and postcode to find her MP. ZZ9 9ZZ is the test MP's postcode.");
  // Each flow writes as its own sender, so its letter is its own in the outbox.
  const sender = madeUpAddress("Jane Smith", 21);
  await openLookup(page, BASE);
  await frame(page, "The form to find your MP");
  story("Find my MP finds the test MP, and drafts the campaign's letter to them.");
  await lookUp(page);
  await expect(page.getByLabel(copy.form.subjectLabel)).toHaveValue(campaigns[0].subject);
  await frame(page, "The letter, drafted");
  story("She adds her email and checks her letter. It's shown as it will go, signed with her name and address.");
  await fillAndPreview(page, sender);

  // The preview has the letter as it will go: the name ends the letter, the address follows.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy.preview.title);
  await expect(page.locator("article")).toContainText("Dear Mr McTestface");
  await expect(page.locator("article p").nth(-2)).toHaveText("Jane Smith");
  await expect(page.locator("article p").last()).toHaveText(/^1 High Street, Testville\s*ZZ9 9ZZ$/);
  await frame(page, "The preview");
  story("She sends it. The thank-you page shows PauseAI events near her, and one online.");
  await sendLetter(page);

  // The sent page, from its top: nothing of the form or the preview is left.
  await expect(page).toHaveURL(`${PAGE}/sent`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy.sent.title);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(await adsEvents(page)).toBe(1);
  // Then events near the test MP's postcode (Westminster), from the Luma
  // fixture: London's, and the next online one, but not Manchester's.
  const events = page.locator("#events");
  await expect(events.getByRole("heading", { name: "Upcoming events" })).toBeVisible();
  await expect(events.getByText("PauseAI London: Protest at Parliament")).toBeVisible();
  await expect(events.getByText("Introduction to PauseAI UK (online)")).toBeVisible();
  await expect(events.getByText("PauseAI Manchester Social")).toHaveCount(0);
  await frame(page, "The thank-you page");
  story("The MP gets her letter from a proxy address of hers on the letters inbox, with the campaign's attachments.");
  // A reload still thanks them, and doesn't count the letter again.
  await page.reload();
  await expect(page.getByRole("status")).toHaveText(copy.sent.body("Testy McTestface MP"));
  expect(await adsEvents(page)).toBe(0);

  // From Jane's proxy on the letters inbox, to the MP alone; then her copy, from it to the MP's.
  const id = letterIdOf(flowDatabase, sender);
  const letter = sentEmail(flowDatabase, id, "letter");
  expect(letter.From).toMatch(/^"Jane Smith \(via PauseAI\)" <\S+\+jane\.smith@pauseai\.uk>$/);
  expect(letter.To).toBe('"Testy McTestface MP" <test-mp@parliament.example>');
  expect(letter.Cc).toBeUndefined();
  expect(letter.Bcc).toBeUndefined();
  expect(letter.TextBody).toMatch(/Jane Smith\n\n1 High Street, Testville\nZZ9 9ZZ$/);
  expect(letter.Attachments!.map((a) => a.Name)).toEqual(campaigns[0].attachments.map((a) => a.file));
  await emailFrame(page, letter, "The letter the MP gets");
  story("Jane gets a copy, from her proxy address, addressed to her. A reply to it reaches the MP through us.");
  const copied = sentEmail(flowDatabase, id, "letter-copy");
  expect(copied.To).toBe(`"Jane Smith" <${sender}>`);
  expect(copied.ReplyTo).toBe(`"Testy McTestface MP (via PauseAI)" <${MPS_PROXY}>`);
  expect(copied.TextBody).toContain(copy.letterCopy("Testy McTestface MP"));
  await emailFrame(page, copied, "Jane's copy");
});

test("Going back to the form", async ({ page }) => {
  story("Jane finds her MP, then goes back. The form is as she filled it in.");
  await lookUp(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy.write.title);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  await page.goBack();
  await expect(page).toHaveURL(PAGE);
  await expect(page.getByLabel(copy.lookup.nameLabel)).toHaveValue("Jane Smith");
  await expect(page.getByLabel(copy.lookup.addressLabel)).toHaveValue("1 High Street, Testville");
  await expect(page.getByLabel(copy.lookup.postcodeLabel)).toHaveValue("ZZ9 9ZZ");
  // Going back puts the window about where it was, a little differently each run.
  await wholePage(page);
  await frame(page, "The form, as she left it");
});

test("Formatting the letter", async ({ page, flowDatabase }) => {
  story("Jane adds a line in bold and a bulleted list, from the toolbar.");
  const sender = madeUpAddress("Jane Smith", 22);
  await lookUp(page);
  const letter = editor(page);
  await expect(letter).toContainText("Dear Mr McTestface");

  // A new paragraph above the sign-off, made bold from the toolbar as it's typed.
  await newParagraphAboveSignOff(page);
  await toolbar(page, "Bold");
  await expect(page.getByRole("button", { name: "Bold" })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.type("Please reply.");
  await toolbar(page, "Bold");
  await page.keyboard.press("Enter");
  await toolbar(page, "Bullet point");
  await page.keyboard.type("First reason");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Second reason");
  await expect(letter.locator("strong", { hasText: "Please reply." })).toBeVisible();
  await expect(letter.locator("ul li")).toHaveText(["First reason", "Second reason"]);
  await wholePage(page);
  await frame(page, "A bold line and a list");
  story(
    "She pastes from another app. The link stays. A heading, a colour and a numbered list don't: their words become plain paragraphs, and the list bullets.",
  );
  await caretAt(page, "Second reason", "end");

  // Out of the list, then a paste of a link and of what a letter may not
  // have: a heading, a colour and a numbered list. The link stays; of the
  // rest the words stay, the list as bullets.
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await paste(
    page,
    '<h1>Pasted heading</h1><p>See <a href="https://example.com/">this report</a> and <span style="color:red">red words</span>.</p><ol><li>Numbered one</li></ol>',
    "Pasted heading\n\nSee this report and red words.\n\nNumbered one",
  );
  await expect(letter).toContainText("Pasted heading");
  await expect(letter).toContainText("See this report and red words.");
  await expect(letter.locator("h1, ol, span[style]")).toHaveCount(0);
  await expect(letter.locator('a[href="https://example.com/"]')).toHaveText("this report");
  await expect(letter.locator("ul").last().locator("li")).toHaveText(["Numbered one"]);
  await wholePage(page);
  await frame(page, "The pasted text");
  story("The preview shows the letter formatted as she wrote it.");

  await fillAndPreview(page, sender);
  const preview = page.locator("article");
  await expect(preview.locator("strong", { hasText: "Please reply." })).toBeVisible();
  // The letter's lists, not the attachments'.
  await expect(preview.locator("ul:not([aria-label]) li")).toHaveText([
    "First reason",
    "Second reason",
    "Numbered one",
  ]);
  await expect(preview).toContainText("See this report and red words.");
  await expect(preview.locator('a[href="https://example.com/"]')).toHaveText("this report");
  await frame(page, "The preview");
  story("She sends it, and the MP gets it formatted the same way.");
  await sendLetter(page);

  const sent = sentEmail(flowDatabase, letterIdOf(flowDatabase, sender), "letter");
  expect(sent.HtmlBody).toContain("<strong>Please reply.</strong>");
  expect(sent.HtmlBody).toMatch(/<ul>\s*<li><p>First reason<\/p><\/li>\s*<li><p>Second reason<\/p><\/li>\s*<\/ul>/);
  expect(sent.HtmlBody).toContain('See <a href="https://example.com/">this report</a> and red words.');
  expect(sent.HtmlBody).not.toMatch(/<h1|<ol|style=/);
  // The drafted letter's address, which the HTML links, and the pasted link, kept.
  expect(sent.HtmlBody?.match(/<a [^>]*>/g)).toEqual([
    `<a href="mailto:${site.policyEmail}">`,
    '<a href="https://example.com/">',
  ]);
  await emailFrame(page, sent, "The letter the MP gets");
  // All of it above the sign-off, which is as it was drafted.
  expect(sent.TextBody).toMatch(
    /Please reply\.\n\n- First reason\n- Second reason\n\nPasted heading\n\nSee this report \(https:\/\/example\.com\/\) and red words\.\n\n- Numbered one\n\nThank you for your consideration,\n\nJane Smith\n\n1 High Street, Testville\nZZ9 9ZZ$/,
  );
});

test("The letter is kept", async ({ page }) => {
  story("Jane writes some words of her own, and her own subject.");
  await lookUp(page);
  const letter = editor(page);
  await newParagraphAboveSignOff(page);
  await page.keyboard.type("My own words.");
  await page.getByLabel(copy.form.subjectLabel).fill("My own subject");
  await wholePage(page);
  await frame(page, "Jane's letter");
  story("She checks it, then Edit brings her back to it, as she wrote it.");
  await fillAndPreview(page, "jane@example.com");
  await expect(page.locator("article")).toContainText("My own words.");

  await page.getByRole("link", { name: copy.preview.edit }).click();
  await expect(page).toHaveURL(`${PAGE}/write`);
  await expect(letter).toContainText("My own words.");
  await expect(page.getByLabel(copy.form.subjectLabel)).toHaveValue("My own subject");
  await frame(page, "Back from the preview");
  story("Going back from the preview, and reloading the page, keep it too.");

  await page.getByRole("button", { name: copy.form.preview }).click();
  await expect(page).toHaveURL(`${PAGE}/preview`);
  await page.goBack();
  await expect(page).toHaveURL(`${PAGE}/write`);
  await expect(letter).toContainText("My own words.");
  await page.reload();
  await expect(letter).toContainText("My own words.");
  // The browser puts the window back about where it was, a few pixels either way.
  await wholePage(page);
  await expect(page.getByLabel(copy.form.emailLabel)).toHaveValue("jane@example.com");
  await frame(page, "After going back and a reload");
  story("Sam Jones finds the MP on the same browser, and gets a fresh letter, signed with Sam's name.");

  // Someone else finding the MP on the same browser starts a fresh letter, signed with their name.
  await openLookup(page, BASE);
  await page.getByLabel(copy.lookup.nameLabel).fill("Sam Jones");
  await page.getByRole("button", { name: copy.lookup.button }).click();
  await expect(page).toHaveURL(`${PAGE}/write`);
  await expect(letter).toContainText("Dear Mr McTestface");
  await expect(letter.getByText("Sam Jones", { exact: true })).toBeVisible();
  await expect(letter).not.toContainText("Jane Smith");
  await expect(letter).not.toContainText("My own words.");
  await expect(page.getByLabel(copy.form.subjectLabel)).toHaveValue(campaigns[0].subject);
  await expect(page.getByLabel(copy.form.emailLabel)).toHaveValue("");
  await frame(page, "Sam's letter");
});

test("A letter refused", async ({ page }) => {
  story("Jane clears the letter and tries to send it. It's refused, and she's told every field is needed.");
  await lookUp(page);
  // A blank letter: only the server checks for that.
  await page.getByRole("textbox", { name: copy.form.letterLabel, exact: true }).fill("");
  await fillAndPreview(page, "jane@example.com");
  await page.getByRole("button", { name: copy.preview.send }).click();

  await expect(page.getByText(copy.errors.missingFields)).toBeVisible();
  expect(await adsEvents(page)).toBe(0);
  await frame(page, "The letter refused");
  story("Edit takes her back to the form, with what she filled in.");

  await page.getByRole("link", { name: copy.preview.edit }).click();
  await expect(page).toHaveURL(`${PAGE}/write`);
  await expect(page.getByLabel(copy.form.emailLabel)).toHaveValue("jane@example.com");
  await frame(page, "Back to the letter");
});

test("A later step, opened from a link", async ({ page }) => {
  story(
    "Opened from a link, with no letter in this browser, the write, preview and sent pages have nothing to show. Each links back to the campaign.",
  );
  for (const step of ["write", "preview", "sent"]) {
    await page.goto(`${PAGE}/${step}`);
    await frame(page, `/${step}, with nothing to show`);
    await page.getByRole("link", { name: copy.preview.backToForm }).click();
    await expect(page).toHaveURL(`${PAGE}#email-your-mp`);
  }
});

test("Bounces and replies only from Postmark", async ({ request }) => {
  story(
    "Postmark tells the site of bounces and replies. Anyone else is turned away, and a bounce for an email that isn't a letter changes nothing.",
  );
  const wrong = `Basic ${Buffer.from("postmark:guess").toString("base64")}`;
  for (const path of ["/api/postmark/bounce", "/api/postmark/inbound"]) {
    expect((await request.post(`${BASE}${path}`, { data: {} })).status(), path).toBe(401);
    expect((await request.post(`${BASE}${path}`, { headers: { Authorization: wrong }, data: {} })).status(), path).toBe(
      401,
    );
  }
  const bounce = await request.post(`${BASE}/api/postmark/bounce`, {
    headers: { Authorization: WEBHOOK_AUTH },
    data: { RecordType: "Bounce", MessageID: "not-a-letter", Type: "HardBounce" },
  });
  expect(await bounce.json()).toEqual({ recorded: false });
});

test("An MP who has signed (ZZ99ZS)", async ({ page }) => {
  story(
    "Jane's MP has already signed the letter to the PM. Find my MP takes her to the bill's campaign instead, which says why, with her details filled in.",
  );
  await openLookup(page, BASE, "ZZ9 9ZS");
  await expect(page.locator("summary", { hasText: "ZZ9 9ZZ" })).toBeVisible();
  await page.getByRole("button", { name: copy.lookup.button }).click();

  await expect(page).toHaveURL(`${BASE}/campaigns/${campaigns[1].slug}`);
  await expect(page.getByText(campaigns[0].movedOn!)).toBeVisible();
  await expect(page.getByLabel(copy.lookup.nameLabel)).toHaveValue("Jane Smith");
  await expect(page.getByLabel(copy.lookup.addressLabel)).toHaveValue("1 High Street, Testville");
  await expect(page.getByLabel(copy.lookup.postcodeLabel)).toHaveValue("ZZ9 9ZS");
  await frame(page, "The bill's campaign");
  story("Find my MP there drafts the bill's letter to Signy McTestface MP.");
  await page.getByRole("button", { name: copy.lookup.button }).click();

  await expect(page).toHaveURL(`${BASE}/campaigns/${campaigns[1].slug}/write`);
  await expect(page.getByRole("heading", { name: "Signy McTestface MP" })).toBeVisible();
  await expect(page.getByLabel(copy.form.subjectLabel)).toHaveValue(campaigns[1].subject);
  await frame(page, "The bill's letter");
});

test("An MP who backs the bill (ZZ99ZB)", async ({ page }) => {
  story(
    "Jane's MP signed ControlAI's letter in support of the bill. The page says so, and the drafted letter thanks them for it.",
  );
  await openLookup(page, BASE, "ZZ9 9ZB", `/campaigns/${campaigns[1].slug}`);
  await page.getByRole("button", { name: copy.lookup.button }).click();

  await expect(page).toHaveURL(`${BASE}/campaigns/${campaigns[1].slug}/write`);
  await expect(page.getByRole("heading", { name: "Backy McTestface MP" })).toBeVisible();
  await expect(page.getByRole("link", { name: copy.sobelBill.signedNote.link })).toBeVisible();
  await expect(page.getByText(copy.sobelBill.letterThanks)).toBeVisible();
  await frame(page, "The bill's letter, with thanks");
});

test("An MP with no email (ZZ99ZN)", async ({ page }) => {
  story("There's no email address for Jane's MP, so there's no letter to write, and the page says so.");
  await openLookup(page, BASE, "ZZ9 9ZN");
  await page.getByRole("button", { name: copy.lookup.button }).click();

  await expect(page.getByRole("heading", { name: "Nomail McTestface MP" })).toBeVisible();
  await expect(page.getByText(copy.lookup.noEmail)).toBeVisible();
  await expect(page).toHaveURL(`${BASE}/campaigns/${campaigns[0].slug}`);
  // The click scrolled the button into view, and where that leaves the window varies.
  await wholePage(page);
  await frame(page, "No email found");
});

test("Each campaign, and /campaigns", async ({ page, request }) => {
  story(
    "Each campaign has a page, with the form to find your MP. /campaigns opens the first, and a campaign that doesn't exist is not found.",
  );
  for (const campaign of campaigns) {
    await page.goto(`${BASE}/campaigns/${campaign.slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByLabel(copy.lookup.postcodeLabel)).toBeVisible();
    // A letter's signatories load after the page: the frame is of them, not of their loading.
    await expect(page.getByText("Loading signatories…")).toHaveCount(0);
    await frame(page, `/campaigns/${campaign.slug}`);
  }
  await page.goto(`${BASE}/campaigns`);
  await expect(page).toHaveURL(`${BASE}/campaigns/${campaigns[0].slug}`);
  expect((await request.get(`${BASE}/campaigns/no-such-campaign`)).status()).toBe(404);
});

test("The Campaigns menu", { tag: "@desktop-only" }, async ({ page }) => {
  story("The Campaigns menu in the header lists both campaigns.");
  await page.goto(`${BASE}/campaigns/${campaigns[0].slug}`);
  const trigger = page.getByRole("link", { name: "Campaigns", exact: true });
  const menu = trigger.locator("..");
  // Opened by focus, not hover: a frame moves the pointer away first, which
  // would close a hovered menu.
  await trigger.focus();
  const bill = menu.getByRole("menuitem", { name: "Support the Artificial Superintelligence Bill" });
  await expect(menu.getByRole("menuitem", { name: "Regulate AI developers now" })).toBeVisible();
  await expect(bill).toBeVisible();
  await frame(page, "The Campaigns menu");
  story("Choosing the bill's campaign opens its page, and the menu closes.");
  await bill.click();
  await expect(page).toHaveURL(`${BASE}/campaigns/${campaigns[1].slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Support the Artificial Superintelligence Bill");
  // Shut behind the choice, though the pointer is still over it.
  await expect(bill).toBeHidden();
  await frame(page, "The bill's campaign");
});

test("Search, and old /campaigns-v2 links", async ({ page, request }) => {
  story(
    "Search engines may list the campaign pages, but not the pages for writing a letter. Old links to /campaigns-v2 go to the campaign pages.",
  );
  const sitemap = await (await request.get(`${BASE}/sitemap.xml`)).text();
  for (const campaign of campaigns) {
    expect(sitemap).toContain(`/campaigns/${campaign.slug}<`);
    await page.goto(`${BASE}/campaigns/${campaign.slug}`);
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  }
  expect(sitemap).not.toContain("campaigns-v2");
  expect(sitemap).not.toMatch(/\/(write|preview|sent)</);
  // The old page's iframe from pauseai.info has gone.
  await expect(page.locator("iframe")).toHaveCount(0);

  await page.goto(`${BASE}/campaigns-v2`);
  await expect(page).toHaveURL(`${BASE}/campaigns/${campaigns[0].slug}`);
  await page.goto(`${BASE}/campaigns-v2/${campaigns[1].slug}`);
  await expect(page).toHaveURL(`${BASE}/campaigns/${campaigns[1].slug}`);
  await frame(page, "The bill's campaign, from an old link");
});
