import { campaigns, copy } from "@/lib/content/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import { addFilter, changeFilter, fakeTurnstile, lookUpTestMp, newestEmail, openLookup } from "../steps";
import { BASE, emailFrame, expect, madeUpAddress, frame, test } from "./fixtures";
import { TEST_MPS } from "@/lib/test-mps";
import { sentEmail } from "./letters-inbox-steps";
import {
  bounceLetter,
  bouncy,
  BOUNCY_ADDRESS,
  logIn,
  POLICY_INBOX,
  postBounce,
  postReply,
  sentLetterId,
} from "./staff-steps";

// Supporters' letters to MPs: the list filtered, by status and by what came
// back to a letter, and a letter that bounces,
// emailing staff and blocking the address until staff unblock it. Each flow
// on its own database.

test("Filter letters by status and campaigns, reset, then sort by sender", async ({ page, request, flowDatabase }) => {
  const jane = madeUpAddress("Jane Smith", 11);
  const sam = madeUpAddress("Sam Smith", 12);
  await sentLetterId(page, flowDatabase, jane);
  await bounceLetter(
    request,
    flowDatabase,
    await sentLetterId(page, flowDatabase, sam, bouncy, "Sam Smith"),
    BOUNCY_ADDRESS,
  );

  await page.reload();
  const janes = page.getByRole("row").filter({ hasText: jane });
  const sams = page.getByRole("row").filter({ hasText: sam });
  await expect(janes.getByRole("link", { name: staffCopy.letters.status.sent, exact: true })).toBeVisible();
  await expect(sams.getByRole("link", { name: staffCopy.letters.status.bounced, exact: true })).toBeVisible();
  await frame(page, "the letters list: one sent, one bounced");

  await addFilter(page, staffCopy.letters.columns.status, staffCopy.letters.status.bounced);
  await expect(page).toHaveURL(/\/staff\/letters\?.*status=bounced/);
  await expect(sams).toBeVisible();
  await expect(janes).toHaveCount(0);
  await frame(page, "filtered to the bounced letter");

  // Both letters are to the first campaign, so the other has none.
  await addFilter(page, staffCopy.letters.columns.campaign, campaigns[1].title);
  await expect(page).toHaveURL(new RegExp(`campaign=${campaigns[1].slug}`));
  await expect(page.getByText(staffCopy.letters.none)).toBeVisible();
  await frame(page, "filtered to the other campaign: no letters");

  // The Campaign filter repeats: either campaign finds the bounced letter again.
  await addFilter(page, staffCopy.letters.columns.campaign, campaigns[0].title);
  await expect(page).toHaveURL(new RegExp(`campaign=${campaigns[0].slug}`));
  await expect(sams).toBeVisible();
  await frame(page, "either campaign: the bounced letter again");

  await page.getByRole("link", { name: staffCopy.resetFilters }).click();
  await expect(page).toHaveURL(`${BASE}/staff/letters`);
  await expect(janes).toBeVisible();
  await expect(sams).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(`^${staffCopy.letters.columns.campaign}:`) })).toHaveCount(
    0,
  );
  await frame(page, "reset: both letters again, newest written first");

  // Sam wrote last, so is first; by sender, Jane is.
  await expect(page.getByRole("row").nth(1)).toContainText(sam);
  await page.getByRole("columnheader", { name: staffCopy.letters.columns.from }).getByRole("link").click();
  await expect(page).toHaveURL(/sort=from&dir=asc/);
  await expect(page.getByRole("row").nth(1)).toContainText(jane);
  await frame(page, "sorted by sender, A to Z");
});

test("A letter's automatic reply in the Replied column, and the letters filtered by what came back", async ({
  page,
  request,
  flowDatabase,
}) => {
  const copy = staffCopy.letters;
  const jane = madeUpAddress("Jane Smith", 15);
  const sam = madeUpAddress("Sam Smith", 16);
  const janesLetter = await sentLetterId(page, flowDatabase, jane);
  const samsLetter = await sentLetterId(page, flowDatabase, sam, undefined, "Sam Smith");
  await postReply(request, flowDatabase, janesLetter, true);
  await postReply(request, flowDatabase, samsLetter);

  await page.reload();
  const janes = page.getByRole("row").filter({ hasText: jane });
  const sams = page.getByRole("row").filter({ hasText: sam });
  // Both still sent: the status says whether it was delivered, not what came back.
  await expect(janes.getByRole("link", { name: copy.status.sent, exact: true })).toBeVisible();
  await expect(sams.getByRole("link", { name: copy.status.sent, exact: true })).toBeVisible();
  await expect(janes).toContainText(copy.status.auto_reply);
  await expect(sams).not.toContainText(copy.status.auto_reply);
  await frame(page, "the letters list: Jane's letter got only an automatic reply, greyed; Sam's a written one");

  // The Status filter offers only whether a letter was delivered.
  await page.getByRole("button", { name: staffCopy.filters.add }).click();
  const status = page
    .locator("[popover]:popover-open details")
    .filter({ has: page.locator("summary", { hasText: new RegExp(`^${copy.columns.status}$`) }) });
  await status.locator("summary").click();
  await expect(status.getByRole("link", { name: copy.status.sent, exact: true })).toBeVisible();
  await expect(status.getByRole("link", { name: copy.status.auto_reply, exact: true })).toHaveCount(0);
  await frame(page, "the Status filter: only whether it was delivered", { window: true });
  await page.keyboard.press("Escape");

  await addFilter(page, copy.columns.replied, copy.answered.auto);
  await expect(page).toHaveURL(/answered=auto/);
  await expect(janes).toBeVisible();
  await expect(sams).toHaveCount(0);
  await frame(page, "filtered to only an automatic reply: Jane's letter");

  await changeFilter(page, `${copy.columns.replied}: ${copy.answered.auto}`, copy.answered.yes);
  await expect(page).toHaveURL(/answered=yes/);
  await expect(sams).toBeVisible();
  await expect(janes).toHaveCount(0);
  await frame(page, "a written reply: Sam's letter");

  await changeFilter(page, `${copy.columns.replied}: ${copy.answered.yes}`, copy.answered.no);
  await expect(page.getByText(copy.none)).toBeVisible();
  await frame(page, "no reply: no letters");
});

test("A supporter's letter: the letter as an email, Copy Gmail search, and the MP's answer set from it", async ({
  page,
  flowDatabase,
}) => {
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
  await expect(letter).toContainText(staffCopy.letterChanges.unchanged);
  await frame(page, "the letter's page: sent, the letter as an email, beside its campaign's ask and its history");

  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: staffCopy.findInGmail.copy }).click();
  await expect(page.getByRole("status")).toContainText(staffCopy.findInGmail.next.stressed);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/^rfc822msgid:\S+@pauseai\.uk$/);
  await frame(page, "Copy Gmail search: copied, and where to paste it", { window: true });

  const ask = page.getByRole("region", { name: staffCopy.mailings.fields.ask });
  await expect(ask.getByRole("link", { name: campaigns[0].title })).toBeVisible();
  await ask.getByRole("button", { name: staffCopy.politician.edit }).click();
  await page.getByRole("radio", { name: staffCopy.statuses.signed }).click();
  await page.getByLabel(staffCopy.politician.note).fill("Signed, says their reply");
  await frame(page, "Edit: Signed chosen, with a note of how we know", { window: true });
  await page.getByRole("button", { name: staffCopy.politician.save }).click();
  const answered = page.getByText(staffCopy.mailings.columns.answered, { exact: true });
  await expect(answered).toBeVisible();
  // The edit form closing shortens the page, and where that leaves the window differs between runs:
  // the frame is of the tag, in the middle of the window.
  await answered.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
  await frame(page, "the MP marked as having signed: the letter's tag says answered, in green");
});

test("A letter bounces: staff are emailed, the address is blocked", async ({ page, request, flowDatabase }) => {
  const sender = madeUpAddress("Jane Smith", 13);
  const letterId = await sentLetterId(page, flowDatabase, sender, bouncy);
  expect(sentEmail(flowDatabase, letterId, "letter").To).toBe(`"Bouncy McTestface MP" <${BOUNCY_ADDRESS}>`);
  await bounceLetter(request, flowDatabase, letterId, BOUNCY_ADDRESS);

  const alert = newestEmail(
    (email) => email.To === POLICY_INBOX && email.Subject === staffCopy.alert.subject(bouncy.name),
  );
  expect(alert?.TextBody).toContain(`${BASE}/staff/politicians/blocked-emails`);
  await emailFrame(page, alert!, "the email staff get about it");

  await page.goto(`${BASE}/staff/politicians/blocked-emails`);
  // The blocked addresses, above the recent problems.
  const blocked = page.getByRole("table").first().getByRole("row").filter({ hasText: BOUNCY_ADDRESS });
  await expect(blocked.getByRole("link", { name: bouncy.name, exact: true })).toBeVisible();
  await expect(blocked).toContainText(staffCopy.emails.kinds.hard);
  await frame(page, "the address, blocked, with the letter that found it out");

  // The letter, by whom it was to, leads to its own page.
  await blocked.getByRole("link", { name: `${staffCopy.emails.letterTo} ${bouncy.name}` }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    staffCopy.letters.oneTitle("Jane Smith", bouncy.name),
  );
  // Who wrote it, leading to them as a supporter; their address is in its history too.
  await expect(page.getByRole("link", { name: `Jane Smith <${sender}>` })).toBeVisible();
  await expect(page.getByText(staffCopy.letters.status.bounced).first()).toBeVisible();
  await frame(page, "the letter's page: bounced, in red, the letter as an email, and what happened to it");
  await page
    .getByRole("list", { name: staffCopy.letters.detail.historyTitle })
    .getByRole("listitem")
    .filter({ hasText: new RegExp(`^${staffCopy.letters.status.bounced}`) })
    .getByRole("button")
    .click();
  await expect(page.locator(":popover-open")).toContainText('"reason"');
  await frame(page, "the bounce's {}: what the bounce said, as JSON, in a bubble by the button", { window: true });
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: staffCopy.nav.letters }).first().click();
  await expect(page).toHaveURL(`${BASE}/staff/letters`);
});

test("Unblock an MP's bounced address", async ({ page, request, flowDatabase }) => {
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
  await frame(page, "the MP's address isn't working: the letter can be written, and will go once it does");

  await logIn(page, flowDatabase, ["admin"]);
  // The home page says the MP's email bounced, first thing, with a button to their page.
  await expect(page.getByText(staffCopy.home.dashboard.actions.blockedMp(bouncy.name))).toBeVisible();
  await frame(page, "the home: the bounced address needs a person");
  await page.getByRole("link", { name: staffCopy.home.dashboard.actions.openMp }).click();
  await expect(page.getByRole("heading", { level: 1, name: bouncy.name })).toBeVisible();

  await page.goto(`${BASE}/staff/politicians?flag=test`);
  const bouncysRow = page.getByRole("row").filter({ hasText: bouncy.name });
  await expect(bouncysRow).toContainText(staffCopy.politicians.emailBlocked);
  await frame(page, "the politicians list marks their address as blocked");

  // Politicians' blocked emails lists them, and is the way to them.
  await page.goto(`${BASE}/staff/politicians/blocked-emails`);
  await expect(page.getByRole("row").filter({ hasText: bouncy.name })).toBeVisible();
  await frame(
    page,
    "Politicians' blocked emails lists their address, from a bounce Postmark couldn't tie to an email we sent",
  );

  await page.getByRole("link", { name: bouncy.name }).click();
  await expect(page.getByRole("heading", { level: 1, name: bouncy.name })).toBeVisible();
  await expect(page.getByRole("region", { name: staffCopy.politician.blocked.title })).toBeVisible();
  await frame(page, "their page says letters aren't being sent, why, and what to check");

  await page.getByLabel(staffCopy.emails.note).fill("Checked with their office");
  await page.getByRole("button", { name: staffCopy.emails.unblock }).click();
  await expect(page.getByLabel(staffCopy.emails.note)).not.toBeVisible();
  await frame(page, "unblocked");

  await page.goto(`${BASE}/staff/audit-log`);
  // In the entry's details; its JSON, behind its button, has it too.
  await expect(page.getByText("Checked with their office").filter({ visible: true })).toBeVisible();
  await frame(page, "the audit log: blocked by Postmark, unblocked by staff");

  await lookUpTestMp(page, BASE, bouncy);
  await expect(page.getByLabel(copy.form.emailLabel)).toBeVisible();
  await frame(page, "the form writes to them again");
});
