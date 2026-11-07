import { campaigns, copy } from "@/lib/content/email-your-mp";
import { runSql } from "@/scripts/fresh-database.mjs";
import { staffCopy } from "@/lib/content/staff-interface";
import { fakeTurnstile, lookUpTestMp, newestEmail, openLookup } from "../steps";
import { BASE, emailFrame, expect, madeUpAddress, frame, story, test } from "./fixtures";
import { TEST_MPS } from "@/lib/test-mps";
import { sentEmail } from "./letters-inbox-steps";
import {
  bounceLetter,
  bouncy,
  BOUNCY_ADDRESS,
  logIn,
  NOTIFICATION_INBOX,
  postBounce,
  postReply,
  sentLetterId,
} from "./staff-steps";

// Supporters' letters to MPs: the list filtered, by status and by what came
// back to a letter, and a letter that bounces,
// emailing staff and blocking the address until staff unblock it. Each flow
// on its own database.

test("Letters by count", async ({ page, request, flowDatabase }) => {
  story("Jane and Sam write to their MPs. Sam's MP's address bounces his letter.");
  const jane = madeUpAddress("Jane Smith", 11);
  const sam = madeUpAddress("Sam Smith", 12);
  await sentLetterId(page, flowDatabase, jane);
  await bounceLetter(
    request,
    flowDatabase,
    await sentLetterId(page, flowDatabase, sam, bouncy, "Sam Smith"),
    BOUNCY_ADDRESS,
  );

  story("The campaign's page shows Jane's letter sent and Sam's bounced.");
  await page.reload();
  const janes = page.getByRole("row").filter({ hasText: "Jane Smith" });
  const sams = page.getByRole("row").filter({ hasText: "Sam Smith" });
  await expect(janes).toContainText(staffCopy.letters.status.sent);
  await expect(sams).toContainText(staffCopy.letters.status.bounced);
  await frame(page, "The campaign's letters");
  story("The failed count shows only the letter that bounced, and pressed again, all of them.");
  await page
    .getByRole("link", { name: /failed/ })
    .first()
    .click();
  await expect(page).toHaveURL(/tab=failed/);
  await expect(sams).toBeVisible();
  await expect(janes).toHaveCount(0);
  await frame(page, "The letters that failed");

  await page.getByRole("link", { name: staffCopy.campaigns.showAll }).click();
  await expect(janes).toBeVisible();
  await expect(sams).toBeVisible();
  await expect(page.getByRole("row").nth(1)).toContainText("Sam Smith");
  await frame(page, "All the letters again");
});

test("All emails", async ({ page, flowDatabase }) => {
  story("Jane has written to her MP, who replied, and a mailing from PauseAI has gone to the same MP.");
  await sentLetterId(page, flowDatabase, madeUpAddress("Jane Smith", 13));
  // The page leaves out letters to test MPs, and a flow's letters can only go to one.
  runSql(
    flowDatabase,
    `UPDATE politicians SET is_test = false, test_postcode = NULL;
     UPDATE letters SET replied_at = '2026-10-15T10:00:00Z';
     WITH m AS (
       INSERT INTO mailings (title, airtable_field, audience, channel, state)
       VALUES ('A letter about the march', 'march', 'politicians', 'email', 'sent') RETURNING id
     ), l AS (
       INSERT INTO letters (notable_person_id, status, sent_at, kind)
       SELECT notable_person_id, 'sent', '2026-10-14T10:00:00Z', 'pauseai' FROM letters LIMIT 1 RETURNING id
     )
     INSERT INTO letters_from_pauseai (id, mailing_id) SELECT l.id, m.id FROM l, m`,
  );
  await page.goto(`${BASE}/staff/emails`);
  await expect(page.getByRole("row")).toHaveCount(3);
  await frame(page, "Both emails");

  story("Filtered to those replied to in the last 30 days, the mailing's letter goes, leaving Jane's.");
  await page.goto(`${BASE}/staff/emails?replied=30`);
  await expect(page.getByRole("row")).toHaveCount(2);
  await expect(page.getByRole("row").nth(1)).toContainText("Jane Smith");
  await frame(page, "Those replied to");

  story("The dashboard's supporter emails tile counts only Jane's, and opens only hers.");
  await page.goto(`${BASE}/staff`);
  const tile = page.locator('a[href="/staff/emails?type=campaign&sent=7"]');
  await expect(tile).toContainText(staffCopy.home.dashboard.metrics.lettersSent(1));
  await frame(page, "The supporter emails tile");
});

test("Replies to letters", async ({ page, request, flowDatabase }) => {
  story(
    "Jane and Sam write to their MP. The office answers Jane's letter with only an automatic reply, and writes back to Sam.",
  );
  const copy = staffCopy.letters;
  const jane = madeUpAddress("Jane Smith", 15);
  const sam = madeUpAddress("Sam Smith", 16);
  const janesLetter = await sentLetterId(page, flowDatabase, jane);
  const samsLetter = await sentLetterId(page, flowDatabase, sam, undefined, "Sam Smith");
  await postReply(request, flowDatabase, janesLetter, true);
  await postReply(request, flowDatabase, samsLetter);

  story(
    "Both letters are still sent, as a letter's status says only whether it was delivered. The Replied column shows Jane's automatic reply.",
  );
  await page.reload();
  const janes = page.getByRole("row").filter({ hasText: "Jane Smith" });
  const sams = page.getByRole("row").filter({ hasText: "Sam Smith" });
  // Both still sent: the status says whether it was delivered, not what came back.
  await expect(janes).toContainText(copy.status.sent);
  await expect(sams).toContainText(staffCopy.mailingPages.tabs.replied);
  await expect(janes).toContainText(copy.status.auto_reply);
  await expect(sams).not.toContainText(copy.status.auto_reply);
  await frame(page, "The campaign's letters");
  story("The replied count shows Sam's, as an automatic reply doesn't count.");
  await page
    .getByRole("link", { name: /replied/ })
    .first()
    .click();
  await expect(page).toHaveURL(/tab=replied/);
  await expect(sams).toBeVisible();
  await expect(janes).toHaveCount(0);
  await frame(page, "The letters with a reply");
});

test("A letter's page", async ({ page, flowDatabase }) => {
  story(
    "Jane writes to her MP. On the campaign's page, staff open her letter. She sent it as the campaign drafted it, so its text is folded.",
  );
  const sender = madeUpAddress("Jane Smith", 14);
  await sentLetterId(page, flowDatabase, sender);
  // Its row leads to its page.
  await page
    .getByRole("row")
    .filter({ hasText: "Jane Smith" })
    .getByRole("link", { name: staffCopy.mailingPages.theLetter })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    staffCopy.letters.oneTitle("Jane Smith", TEST_MPS[0].name),
  );
  const letter = page.getByRole("article");
  await expect(letter).toContainText(sender);
  // Sent as the campaign drafted it, so its text is folded away.
  await expect(letter.getByText(/unchanged/)).toBeVisible();
  await frame(page, "Jane's letter");
  story("Copy Gmail search copies a search for the letter, and says where to paste it.");

  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: staffCopy.findInGmail.copy }).click();
  await expect(page.getByRole("status")).toContainText(staffCopy.findInGmail.next.stressed);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/^rfc822msgid:\S+@pauseai\.uk$/);
  await frame(page, "Copy Gmail search, copied", { window: true });
  story(
    "The MP has signed the campaign's ask. From the letter's page, staff mark the MP as Signed, with a note of how they know.",
  );

  const ask = page.getByRole("region", { name: staffCopy.mailings.fields.ask });
  await expect(ask.getByRole("link", { name: campaigns[0].title })).toBeVisible();
  await ask.getByRole("button", { name: staffCopy.politician.edit }).click();
  await page.getByRole("radio", { name: staffCopy.statuses.signed }).click();
  const note = page.getByLabel(staffCopy.politician.note);
  await note.fill("Signed, says their reply");
  // The bubble scrolls the page as it opens, and the clicks and typing scroll their fields into view, in an
  // order that differs between runs: the frame is of the bubble, its note in the middle of the window.
  await note.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
  await frame(page, "Editing the MP's answer", { window: true });
  story("Saved, the letter's tag says the MP answered.");
  await page.getByRole("button", { name: staffCopy.politician.save }).click();
  const answered = page.getByText(staffCopy.mailings.columns.answered, { exact: true });
  await expect(answered).toBeVisible();
  // The edit form closing shortens the page, and where that leaves the window differs between runs:
  // the frame is of the tag, in the middle of the window.
  await answered.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
  await frame(page, "The letter, answered");
});

test("A letter bounces", async ({ page, request, flowDatabase }) => {
  story(
    "Jane writes to an MP whose address bounces her letter. The address is blocked, and staff get an email with a link to the blocked emails.",
  );
  const sender = madeUpAddress("Jane Smith", 13);
  const letterId = await sentLetterId(page, flowDatabase, sender, bouncy);
  expect(sentEmail(flowDatabase, letterId, "letter").To).toBe(`"Bouncy McTestface MP" <${BOUNCY_ADDRESS}>`);
  await bounceLetter(request, flowDatabase, letterId, BOUNCY_ADDRESS);

  const alert = newestEmail(
    (email) => email.To === NOTIFICATION_INBOX && email.Subject === staffCopy.alert.subject(bouncy.name),
  );
  expect(alert?.TextBody).toContain(`${BASE}/staff/politicians/blocked-emails`);
  await emailFrame(page, alert!, "The email staff get");
  story("Politicians' blocked emails lists the address, with the letter that found it out.");

  await page.goto(`${BASE}/staff/politicians/blocked-emails`);
  // The blocked addresses, above the recent problems.
  const blocked = page.getByRole("table").first().getByRole("row").filter({ hasText: BOUNCY_ADDRESS });
  await expect(blocked.getByRole("link", { name: bouncy.name, exact: true })).toBeVisible();
  await expect(blocked).toContainText(staffCopy.emails.kinds.hard);
  await frame(page, "Politicians' blocked emails");
  story("The letter leads to its own page, which says it bounced, and links to Jane as a supporter.");

  // The letter, by whom it was to, leads to its own page.
  await blocked.getByRole("link", { name: `${staffCopy.emails.letterTo} ${bouncy.name}` }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    staffCopy.letters.oneTitle("Jane Smith", bouncy.name),
  );
  // Who wrote it, leading to them as a supporter; their address is in its history too.
  await expect(page.getByRole("link", { name: `Jane Smith <${sender}>` })).toBeVisible();
  await expect(page.getByText(staffCopy.letters.status.bounced).first()).toBeVisible();
  await frame(page, "Jane's letter, bounced");
  story("The button beside the bounce in the letter's history shows what the bounce said.");
  await page
    .getByRole("list", { name: staffCopy.letters.detail.historyTitle })
    .getByRole("listitem")
    .filter({ hasText: new RegExp(`^${staffCopy.letters.status.bounced}`) })
    // The bounce's own, not that of the notice to Jane under it.
    .getByRole("button")
    .first()
    .click();
  await expect(page.locator(":popover-open")).toContainText('"reason"');
  await frame(page, "What the bounce said", { window: true });
  await page.keyboard.press("Escape");
  story("The way back leads to the letter's campaign.");
  await page.getByRole("link", { name: campaigns[0].title, exact: true }).first().click();
  await expect(page).toHaveURL(`${BASE}/staff/campaigns/${campaigns[0].slug}`);
});

test("Unblocking an MP's address", async ({ page, request, flowDatabase }) => {
  story(
    "An email to an MP's address bounces, and the address is blocked. On the campaign page, a supporter in that constituency is told. They can still write, and the letter will go once the address works.",
  );
  await postBounce(request);
  await fakeTurnstile(page);
  await openLookup(page, BASE, "ZZ9 9ZH");
  await page.getByRole("button", { name: copy.lookup.button }).click();
  await expect(page.getByRole("heading", { name: bouncy.name })).toBeVisible();
  const unreachable = page.getByText(copy.lookup.unreachable);
  await expect(unreachable).toBeVisible();
  // The letter can still be written: it waits until the address works.
  await expect(page.getByLabel(copy.form.emailLabel)).toBeVisible();
  // The MP's card is under the form: its heading put in the middle of the window, so the frame
  // shows it, wherever the window was. Brought into view only if needed, it stays put when it's in
  // view already, which it is or isn't by where the click left the window.
  await page
    .getByRole("heading", { name: bouncy.name })
    .evaluate((heading) => heading.scrollIntoView({ block: "center", behavior: "instant" }));
  await frame(page, "The campaign page, for that MP");
  story("An admin's dashboard says the MP's email is bouncing, with a button to the MP's page.");

  await logIn(page, flowDatabase, ["admin"]);
  // The home page says the MP's email bounced, first thing, with a button to their page.
  await expect(page.getByText(staffCopy.home.dashboard.actions.blockedMp(bouncy.name))).toBeVisible();
  await frame(page, "The dashboard");
  story("The politicians list marks the MP's email as blocked.");
  await page.getByRole("link", { name: staffCopy.home.dashboard.actions.openMp }).click();
  await expect(page.getByRole("heading", { level: 1, name: bouncy.name })).toBeVisible();

  await page.goto(`${BASE}/staff/politicians?flag=test`);
  const bouncysRow = page.getByRole("row").filter({ hasText: bouncy.name });
  await expect(bouncysRow).toContainText(staffCopy.politicians.emailBlocked);
  await frame(page, "The politicians list");

  story("Politicians' blocked emails lists the address, and leads to the MP.");
  // Politicians' blocked emails lists them, and is the way to them.
  await page.goto(`${BASE}/staff/politicians/blocked-emails`);
  await expect(page.getByRole("row").filter({ hasText: bouncy.name })).toBeVisible();
  await frame(page, "Politicians' blocked emails");
  story("The MP's page says letters to them aren't being sent, why, and what to check.");

  await page.getByRole("link", { name: bouncy.name }).click();
  await expect(page.getByRole("heading", { level: 1, name: bouncy.name })).toBeVisible();
  await expect(page.getByRole("region", { name: staffCopy.politician.blocked.title })).toBeVisible();
  await frame(page, "The MP's page");
  story("Staff check with the MP's office, then unblock the address, with a note.");

  await page.getByLabel(staffCopy.emails.note).fill("Checked with their office");
  await page.getByRole("button", { name: staffCopy.emails.unblock }).click();
  await expect(page.getByLabel(staffCopy.emails.note)).not.toBeVisible();
  await frame(page, "The MP's page, unblocked");

  story("The audit log has the unblocking, with the note.");
  await page.goto(`${BASE}/staff/audit-log`);
  // In the entry's details; its JSON, behind its button, has it too.
  await expect(page.getByText("Checked with their office").filter({ visible: true })).toBeVisible();
  await frame(page, "The audit log");
  story("A supporter in that constituency opens the campaign page again.");

  await lookUpTestMp(page, BASE, bouncy);
  await expect(page.getByLabel(copy.form.emailLabel)).toBeVisible();
  await frame(page, "The campaign page, for that MP, again");
});
