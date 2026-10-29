import type { Page } from "@playwright/test";
import type { OutboxEmail } from "../fixtures/outbox";
import { campaigns, copy } from "@/lib/content/email-your-mp";
import { site } from "@/lib/content/site";
import {
  fakeTurnstile,
  fillLetter,
  lookUpTestMp,
  newestEmail,
  newestEmailTo,
  openLookup,
  sendLetter,
  WEBHOOK_AUTH,
} from "../steps";
import { BASE, emailFrame, expect, frame, test } from "./fixtures";
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

/** The test MP's words in their reply: made up, but as long and as formal as a real one. */
const MP_REPLY = `Dear Jane,

Thank you for writing to me about the risks from frontier AI, and for sending the open letter and the policy briefing.

I share many of your concerns. I have passed your letter to the Secretary of State for Science, Innovation and Technology, asking what the Government plans to legislate and when, and I will write to you again when I have a reply.

I would be glad to meet to talk about this further. My office will be in touch to find a time at one of my constituency surgeries.

Yours sincerely,

Testy McTestface MP
Member of Parliament for Testshire
House of Commons, London SW1A 0AA`;

/** The MP's reply to `letter`, quoting it under their words, as a mail app does. */
function replyQuoting(letter: OutboxEmail): string {
  const from = letter.From.replace(/^"([^"]*)" /, "$1 ");
  const quoted = letter.TextBody.split("\n")
    .map((line) => (line ? `> ${line}` : ">"))
    .join("\n");
  return `${MP_REPLY}\n\nOn ${letter.Date}, ${from} wrote:\n${quoted}`;
}

/** Looks up ZZ99ZZ, then checks the address is the write page's. */
async function lookUp(page: Page) {
  await lookUpTestMp(page, BASE);
  await expect(page).toHaveURL(`${PAGE}/write`);
}

async function fillAndPreview(page: Page, email: string) {
  await fillLetter(page, email);
  await expect(page).toHaveURL(`${PAGE}/preview`);
}

test(
  "Write to your MP (ZZ99ZZ): postcode, letter, preview, send, reply forwarded",
  { tag: "@phone" },
  async ({ page, request }, testInfo) => {
    // Each flow writes as its own sender, so its letter is its own in the outbox.
    const sender = `jane+${testInfo.testId}@example.com`;
    await openLookup(page, BASE);
    await frame(page, "the postcode form, filled in");
    await lookUp(page);
    await expect(page.getByLabel(copy.form.subjectLabel)).toHaveValue(campaigns[0].subject);
    await frame(page, "the test MP found, with the letter drafted");
    await fillAndPreview(page, sender);

    // The preview has the letter as it will go: the name ends the letter, the address follows.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy.preview.title);
    await expect(page.locator("article")).toContainText("Dear Mr McTestface");
    await expect(page.locator("article p").nth(-2)).toHaveText("Jane Smith");
    await expect(page.locator("article p").last()).toHaveText(/^1 High Street, Testville\s*ZZ9 9ZZ$/);
    await frame(page, "the preview");
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
    await frame(page, "sent, with events nearby");
    // A reload still thanks them, and doesn't count the letter again.
    await page.reload();
    await expect(page.getByRole("status")).toHaveText(copy.sent.body("Testy McTestface MP"));
    expect(await adsEvents(page)).toBe(0);

    const letter = newestEmail(
      (email) => email.To.includes("test-mp@example.org") && !!email.ReplyTo?.includes(sender),
    )!;
    // The letter's own address, whatever its shape (lib/server/mp-letters.test.ts checks that), so main gets this far too.
    const address = letter.From.match(/<([^>]+@letters\.pauseai\.uk)>/)![1];
    expect(letter.From).toBe(`"Jane Smith via PauseAI" <${address}>`);
    expect(letter.Bcc).toBe("replies@example.org");
    expect(letter.ReplyTo).toBe(
      `"Jane Smith" <${sender}>, "PauseAI Policy Team" <replies@example.org>, "PauseAI Letters" <${address}>`,
    );
    expect(letter.TextBody).toMatch(/Jane Smith\n\n1 High Street, Testville\nZZ9 9ZZ$/);
    expect(letter.Attachments!.map((a) => a.Name)).toEqual(campaigns[0].attachments.map((a) => a.file));
    await emailFrame(page, letter, "the letter the MP gets");

    // The MP replies only to the letter's address: both we and the sender get a copy.
    const reply = await request.post(`${BASE}/api/postmark/inbound`, {
      headers: { Authorization: WEBHOOK_AUTH },
      data: {
        OriginalRecipient: address,
        // As Postmark sends it: what follows a + in the address, if anything.
        MailboxHash: address.match(/\+([^@]+)@/)?.[1] ?? "",
        FromFull: { Email: "test-mp@example.org", Name: "Testy McTestface MP" },
        ToFull: [{ Email: address, Name: "" }],
        CcFull: [],
        Subject: `Re: ${letter.Subject}`,
        // The fixed clock's time (FIXTURE_NOW) in the MP's time zone: the letter
        // and our forward of the reply are sent then too, so nothing's out of order.
        Date: "Fri, 16 Oct 2026 13:00:00 +0100",
        TextBody: replyQuoting(letter),
      },
    });
    expect(await reply.json()).toEqual({ forwarded: 2 });
    const copied = newestEmailTo(sender)!;
    expect(copied.TextBody).toContain(MP_REPLY);
    expect(copied.TextBody).toContain("Date: Fri, 16 Oct 2026 13:00:00 +0100");
    expect(copied.ReplyTo).toBe("test-mp@example.org");
    await emailFrame(page, copied, "the MP's reply, forwarded to the sender");
    // Our copy is of this flow's reply: the subject carries the letter's, and the body the MP's words.
    const ours = newestEmail(
      (email) => email.To === "replies@example.org" && email.Subject.endsWith(`Re: ${letter.Subject}`),
    )!;
    expect(ours.TextBody).toContain(MP_REPLY);
  },
);

test("Find your MP, then go back: the form is as you left it", async ({ page }) => {
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
  await frame(page, "back at the form, as it was");
});

/** The letter's editor: the text box Tiptap draws, labelled by the form's "Message". */
const editor = (page: Page) => page.getByRole("textbox", { name: copy.form.letterLabel, exact: true });

/** The editor's element: Tiptap puts the editor on it, and so where it has the caret. */
type TiptapElement = HTMLElement & {
  editor: {
    state: { selection: { $to: { parentOffset: number; parent: { textContent: string; content: { size: number } } } } };
  };
};

/**
 * Waits for the editor to have the caret at the start or end of the
 * paragraph that reads `text`. It reads where the caret went a moment after
 * a click or an arrow key, and a key pressed before then lands where the
 * caret was. No person types that fast.
 */
async function caretSettled(page: Page, text: string, at?: "start" | "end") {
  await expect
    .poll(() =>
      editor(page).evaluate(
        (el, { text, at }) => {
          const { $to } = (el as TiptapElement).editor.state.selection;
          const offset = at === undefined || $to.parentOffset === (at === "start" ? 0 : $to.parent.content.size);
          return $to.parent.textContent === text && offset;
        },
        { text, at },
      ),
    )
    .toBe(true);
}

/**
 * Gives the editor focus, and waits out what ProseMirror does then: 20ms
 * later, it puts its own caret back unless it has seen where the browser's
 * went (prosemirror-view's handlers.focus). On a busy machine, a click that
 * focuses the editor can lose its caret to that, and land at the letter's
 * start. A timer due after ProseMirror's runs after it.
 */
async function focusEditor(page: Page) {
  await editor(page).focus();
  await editor(page).evaluate(() => new Promise((done) => setTimeout(done, 25)));
}

/**
 * Puts the caret at the start or end of the letter's paragraph that reads
 * `text`: a click in it, and once the caret is there, Home or End.
 */
async function caretAt(page: Page, text: string, at: "start" | "end") {
  await focusEditor(page);
  await editor(page).getByText(text, { exact: true }).click();
  await caretSettled(page, text);
  await page.keyboard.press(at === "start" ? "Home" : "End");
  await caretSettled(page, text, at);
}

/** Opens a new paragraph above the sign-off, as someone adding to the letter would, with the caret in it. */
async function newParagraphAboveSignOff(page: Page) {
  await caretAt(page, "Thank you for your consideration,", "start");
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowUp");
  await caretSettled(page, "", "start");
}

/** Clicks a toolbar button, then waits for the editor to take focus back, a frame later, as Tiptap gives it. */
async function toolbar(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).click();
  await expect(editor(page)).toBeFocused();
}

/** Pastes `html` into the editor, as a browser does from another app's clipboard. */
async function paste(page: Page, html: string, text: string) {
  await editor(page).evaluate(
    (el, { html, text }) => {
      const data = new DataTransfer();
      data.setData("text/html", html);
      data.setData("text/plain", text);
      el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
    },
    { html, text },
  );
}

test("Format the letter and paste into it: the preview is what the MP gets", async ({ page }, testInfo) => {
  const sender = `jane+${testInfo.testId}@example.com`;
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
  await frame(page, "a bold line and a bullet list, typed with the toolbar");
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
  await frame(page, "pasted from another app: its link kept, the rest as plain paragraphs");

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
  await frame(page, "the preview, formatted as written");
  await sendLetter(page);

  const sent = newestEmail((email) => email.To.includes("test-mp@example.org") && !!email.ReplyTo?.includes(sender))!;
  expect(sent.HtmlBody).toContain("<strong>Please reply.</strong>");
  expect(sent.HtmlBody).toMatch(/<ul>\s*<li><p>First reason<\/p><\/li>\s*<li><p>Second reason<\/p><\/li>\s*<\/ul>/);
  expect(sent.HtmlBody).toContain('See <a href="https://example.com/">this report</a> and red words.');
  expect(sent.HtmlBody).not.toMatch(/<h1|<ol|style=/);
  // The pasted link is gone: the only one is the drafted letter's address, which the HTML links.
  expect(sent.HtmlBody?.match(/<a [^>]*>/g)).toEqual([`<a href="mailto:${site.policyEmail}">`]);
  await emailFrame(page, sent, "the letter as the MP gets it, formatted");
  // All of it above the sign-off, which is as it was drafted.
  expect(sent.TextBody).toMatch(
    /Please reply\.\n\n- First reason\n- Second reason\n\nPasted heading\n\nSee this report \(https:\/\/example\.com\/\) and red words\.\n\n- Numbered one\n\nThank you for your consideration,\n\nJane Smith\n\n1 High Street, Testville\nZZ9 9ZZ$/,
  );
});

test("Your letter is kept through Edit, Back and reload, until a new postcode", async ({ page }) => {
  await lookUp(page);
  const letter = editor(page);
  await newParagraphAboveSignOff(page);
  await page.keyboard.type("My own words.");
  await page.getByLabel(copy.form.subjectLabel).fill("My own subject");
  await wholePage(page);
  await frame(page, "the letter, in their own words");
  await fillAndPreview(page, "jane@example.com");
  await expect(page.locator("article")).toContainText("My own words.");

  await page.getByRole("link", { name: copy.preview.edit }).click();
  await expect(page).toHaveURL(`${PAGE}/write`);
  await expect(letter).toContainText("My own words.");
  await expect(page.getByLabel(copy.form.subjectLabel)).toHaveValue("My own subject");
  await frame(page, "back from the preview with Edit, as written");

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
  await frame(page, "after the back button and a reload, still as written");

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
  await frame(page, "a new lookup by someone else, a new letter signed by them");
});

test("The server refuses the letter: no Ads event, and you can edit it", async ({ page }) => {
  await lookUp(page);
  // A blank letter: only the server checks for that.
  await page.getByRole("textbox", { name: copy.form.letterLabel, exact: true }).fill("");
  await fillAndPreview(page, "jane@example.com");
  await page.getByRole("button", { name: copy.preview.send }).click();

  await expect(page.getByText(copy.errors.missingFields)).toBeVisible();
  expect(await adsEvents(page)).toBe(0);
  await frame(page, "the server refused a blank letter");

  await page.getByRole("link", { name: copy.preview.edit }).click();
  await expect(page).toHaveURL(`${PAGE}/write`);
  await expect(page.getByLabel(copy.form.emailLabel)).toHaveValue("jane@example.com");
  await frame(page, "back to editing, as it was");
});

test("Open a later step directly: it links back to the start", async ({ page }) => {
  for (const step of ["write", "preview", "sent"]) {
    await page.goto(`${PAGE}/${step}`);
    await frame(page, `/${step} with nothing to show`);
    await page.getByRole("link", { name: copy.preview.backToForm }).click();
    await expect(page).toHaveURL(`${PAGE}#email-your-mp`);
  }
});

test("Postmark webhooks refuse calls without our credentials", async ({ request }) => {
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

test("An MP who has signed (ZZ99ZS): sent on to the bill's letter", async ({ page }) => {
  await openLookup(page, BASE, "ZZ9 9ZS");
  await expect(page.locator("summary", { hasText: "ZZ9 9ZZ" })).toBeVisible();
  await page.getByRole("button", { name: copy.lookup.button }).click();

  await expect(page).toHaveURL(`${BASE}/campaigns/${campaigns[1].slug}`);
  await expect(page.getByText(campaigns[0].movedOn!)).toBeVisible();
  await expect(page.getByLabel(copy.lookup.nameLabel)).toHaveValue("Jane Smith");
  await expect(page.getByLabel(copy.lookup.addressLabel)).toHaveValue("1 High Street, Testville");
  await expect(page.getByLabel(copy.lookup.postcodeLabel)).toHaveValue("ZZ9 9ZS");
  await frame(page, "moved on to the bill's page");
  await page.getByRole("button", { name: copy.lookup.button }).click();

  await expect(page).toHaveURL(`${BASE}/campaigns/${campaigns[1].slug}/write`);
  await expect(page.getByRole("heading", { name: "Signy McTestface MP" })).toBeVisible();
  await expect(page.getByLabel(copy.form.subjectLabel)).toHaveValue(campaigns[1].subject);
  await frame(page, "the bill's letter to Signy McTestface MP");
});

test("An MP who backs the bill (ZZ99ZB): the letter thanks them", async ({ page }) => {
  await openLookup(page, BASE, "ZZ9 9ZB", `/campaigns/${campaigns[1].slug}`);
  await page.getByRole("button", { name: copy.lookup.button }).click();

  await expect(page).toHaveURL(`${BASE}/campaigns/${campaigns[1].slug}/write`);
  await expect(page.getByRole("heading", { name: "Backy McTestface MP" })).toBeVisible();
  await expect(page.getByRole("link", { name: copy.sobelBill.signedNote.link })).toBeVisible();
  await expect(page.getByText(copy.sobelBill.letterThanks)).toBeVisible();
  await frame(page, "the bill's letter thanks Backy McTestface MP");
});

test("An MP with no email (ZZ99ZN): no letter to write", async ({ page }) => {
  await openLookup(page, BASE, "ZZ9 9ZN");
  await page.getByRole("button", { name: copy.lookup.button }).click();

  await expect(page.getByRole("heading", { name: "Nomail McTestface MP" })).toBeVisible();
  await expect(page.getByText(copy.lookup.noEmail)).toBeVisible();
  await expect(page).toHaveURL(`${BASE}/campaigns/${campaigns[0].slug}`);
  // The click scrolled the button into view, and where that leaves the window varies.
  await wholePage(page);
  await frame(page, "an MP with no email");
});

test("Each campaign's page; /campaigns opens the first; an unknown one is a 404", async ({ page, request }) => {
  for (const campaign of campaigns) {
    await page.goto(`${BASE}/campaigns/${campaign.slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByLabel(copy.lookup.postcodeLabel)).toBeVisible();
    await frame(page, `/campaigns/${campaign.slug}`);
  }
  await page.goto(`${BASE}/campaigns`);
  await expect(page).toHaveURL(`${BASE}/campaigns/${campaigns[0].slug}`);
  expect((await request.get(`${BASE}/campaigns/no-such-campaign`)).status()).toBe(404);
});

test("The Campaigns menu links every campaign", { tag: "@desktop-only" }, async ({ page }) => {
  await page.goto(`${BASE}/campaigns/${campaigns[0].slug}`);
  const trigger = page.getByRole("link", { name: "Campaigns", exact: true });
  const menu = trigger.locator("..");
  // Opened by focus, not hover: a frame moves the pointer away first, which
  // would close a hovered menu.
  await trigger.focus();
  const bill = menu.getByRole("menuitem", { name: "Support the Artificial Superintelligence Bill" });
  await expect(menu.getByRole("menuitem", { name: "Regulate AI developers now" })).toBeVisible();
  await expect(bill).toBeVisible();
  await frame(page, "the Campaigns menu, with both campaigns");
  await bill.click();
  await expect(page).toHaveURL(`${BASE}/campaigns/${campaigns[1].slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Support the Artificial Superintelligence Bill");
  // Shut behind the choice, though the pointer is still over it.
  await expect(bill).toBeHidden();
  await frame(page, "the bill's page, from the menu");
});

test("Campaign pages are in search; old /campaigns-v2 links redirect", async ({ page, request }) => {
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
  await frame(page, "/campaigns-v2/support-sobel-bill, redirected");
});
