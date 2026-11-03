import { campaigns, copy } from "@/lib/content/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import { addFilter, changeFilter, fakeTurnstile, lookUpTestMp, newestEmail, openLookup } from "../steps";
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

test("Filtering letters", async ({ page, request, flowDatabase }) => {
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

  story("Letters to MPs shows Jane's letter sent and Sam's bounced.");
  await page.reload();
  const janes = page.getByRole("row").filter({ hasText: jane });
  const sams = page.getByRole("row").filter({ hasText: sam });
  await expect(janes.getByRole("link", { name: staffCopy.letters.status.sent, exact: true })).toBeVisible();
  await expect(sams.getByRole("link", { name: staffCopy.letters.status.bounced, exact: true })).toBeVisible();
  await frame(page, "Letters to MPs");
  story("Staff filter by status, to the bounced letters.");

  await addFilter(page, staffCopy.letters.columns.status, staffCopy.letters.status.bounced);
  await expect(page).toHaveURL(/\/staff\/letters\?.*status=bounced/);
  await expect(sams).toBeVisible();
  await expect(janes).toHaveCount(0);
  await frame(page, "Bounced letters");

  story("They add a campaign. Both letters are to the first campaign, so with the other, there are none.");
  // Both letters are to the first campaign, so the other has none.
  await addFilter(page, staffCopy.letters.columns.campaign, campaigns[1].title);
  await expect(page).toHaveURL(new RegExp(`campaign=${campaigns[1].slug}`));
  await expect(page.getByText(staffCopy.letters.none)).toBeVisible();
  await frame(page, "No letters");

  story("The campaign filter can be added again. With either campaign, Sam's letter is back.");
  // The Campaign filter repeats: either campaign finds the bounced letter again.
  await addFilter(page, staffCopy.letters.columns.campaign, campaigns[0].title);
  await expect(page).toHaveURL(new RegExp(`campaign=${campaigns[0].slug}`));
  await expect(sams).toBeVisible();
  await frame(page, "Bounced letters to either campaign");
  story("Clear filters shows both letters again, the newest first.");

  await page.getByRole("link", { name: staffCopy.resetFilters }).click();
  await expect(page).toHaveURL(`${BASE}/staff/letters`);
  await expect(janes).toBeVisible();
  await expect(sams).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(`^${staffCopy.letters.columns.campaign}:`) })).toHaveCount(
    0,
  );
  await frame(page, "Letters to MPs, cleared");

  story("Sam wrote last, so his letter is first. Sorted by who it's from, Jane's is.");
  // Sam wrote last, so is first; by sender, Jane is.
  await expect(page.getByRole("row").nth(1)).toContainText(sam);
  await page.getByRole("columnheader", { name: staffCopy.letters.columns.from }).getByRole("link").click();
  await expect(page).toHaveURL(/sort=from&dir=asc/);
  await expect(page.getByRole("row").nth(1)).toContainText(jane);
  await frame(page, "Letters to MPs, by sender");
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
  const janes = page.getByRole("row").filter({ hasText: jane });
  const sams = page.getByRole("row").filter({ hasText: sam });
  // Both still sent: the status says whether it was delivered, not what came back.
  await expect(janes.getByRole("link", { name: copy.status.sent, exact: true })).toBeVisible();
  await expect(sams.getByRole("link", { name: copy.status.sent, exact: true })).toBeVisible();
  await expect(janes).toContainText(copy.status.auto_reply);
  await expect(sams).not.toContainText(copy.status.auto_reply);
  await frame(page, "Letters to MPs");
  story("So the Status filter offers only whether a letter was delivered.");

  // The Status filter offers only whether a letter was delivered.
  await page.getByRole("button", { name: staffCopy.filters.add }).click();
  const status = page
    .locator("[popover]:popover-open details")
    .filter({ has: page.locator("summary", { hasText: new RegExp(`^${copy.columns.status}$`) }) });
  await status.locator("summary").click();
  await expect(status.getByRole("link", { name: copy.status.sent, exact: true })).toBeVisible();
  await expect(status.getByRole("link", { name: copy.status.auto_reply, exact: true })).toHaveCount(0);
  await frame(page, "The Status filter", { window: true });
  await page.keyboard.press("Escape");
  story("The Replied filter finds letters by what came back. Automatic reply only finds Jane's.");

  await addFilter(page, copy.columns.replied, copy.answered.auto);
  await expect(page).toHaveURL(/answered=auto/);
  await expect(janes).toBeVisible();
  await expect(sams).toHaveCount(0);
  await frame(page, "Letters with only an automatic reply");
  story("Written reply finds Sam's.");

  await changeFilter(page, `${copy.columns.replied}: ${copy.answered.auto}`, copy.answered.yes);
  await expect(page).toHaveURL(/answered=yes/);
  await expect(sams).toBeVisible();
  await expect(janes).toHaveCount(0);
  await frame(page, "Letters with a written reply");
  story("No reply finds none.");

  await changeFilter(page, `${copy.columns.replied}: ${copy.answered.yes}`, copy.answered.no);
  await expect(page.getByText(copy.none)).toBeVisible();
  await frame(page, "Letters with no reply");
});

test("A letter's page", async ({ page, flowDatabase }) => {
  story(
    "Jane writes to her MP. In Letters to MPs, staff click its status to open her letter. She sent it as the campaign drafted it, so its text is folded.",
  );
  const sender = madeUpAddress("Jane Smith", 14);
  await sentLetterId(page, flowDatabase, sender);
  // A letter's status in the list leads to its page.
  await page
    .getByRole("row")
    .filter({ hasText: sender })
    .getByRole("link", { name: staffCopy.letters.status.sent, exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    staffCopy.letters.oneTitle("Jane Smith", TEST_MPS[0].name),
  );
  const letter = page.getByRole("article");
  await expect(letter).toContainText(sender);
  // Sent as the campaign drafted it, so its text is folded away.
  await expect(letter.getByRole("button", { name: /unchanged/ })).toBeVisible();
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
  await page.getByLabel(staffCopy.politician.note).fill("Signed, says their reply");
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
  story("Letters in the menu leads back to Letters to MPs.");
  await page.getByRole("link", { name: staffCopy.nav.letters }).first().click();
  await expect(page).toHaveURL(`${BASE}/staff/letters`);
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
