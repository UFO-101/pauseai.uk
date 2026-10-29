import { campaigns, copy } from "@/lib/content/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import { addFilter, fakeTurnstile, lookUpTestMp, newestEmail, openLookup } from "../steps";
import { BASE, emailFrame, expect, frame, test } from "./fixtures";
import { logIn, STAFF_INBOX, bouncy, BOUNCY_ADDRESS, postBounce, sentLetterId } from "./staff-steps";

// Supporters' letters to MPs: the list filtered, and a letter that bounces,
// emailing staff and blocking the address until staff unblock it. Each flow
// on its own database.

test("Filter letters by status and campaign, then reset", async ({ page, request, flowDatabase }, testInfo) => {
  const jane = `jane+${testInfo.testId}@example.com`;
  const sam = `sam+${testInfo.testId}@example.com`;
  await sentLetterId(page, flowDatabase, jane);
  await postBounce(request, await sentLetterId(page, flowDatabase, sam, bouncy));

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

  await page.getByRole("link", { name: staffCopy.resetFilters }).click();
  await expect(page).toHaveURL(`${BASE}/staff/letters`);
  await expect(janes).toBeVisible();
  await expect(sams).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(`^${staffCopy.letters.columns.campaign}:`) })).toHaveCount(
    0,
  );
  await frame(page, "reset: both letters again");
});

test("A letter bounces: staff are emailed, the address is blocked", async ({
  page,
  request,
  flowDatabase,
}, testInfo) => {
  const sender = `jane+${testInfo.testId}@example.com`;
  const messageId = await sentLetterId(page, flowDatabase, sender, bouncy);
  const sent = newestEmail((email) => email.ReplyTo?.includes(sender) ?? false);
  expect(sent?.To).toBe(`"Bouncy McTestface MP" <${BOUNCY_ADDRESS}>`);
  await postBounce(request, messageId);

  const alert = newestEmail(
    (email) => email.To === STAFF_INBOX && email.Subject === staffCopy.alert.subject(bouncy.name),
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
  await expect(page.getByText(sender)).toBeVisible();
  await expect(page.getByText(staffCopy.letters.status.bounced).first()).toBeVisible();
  await frame(page, "the letter's page: from and to whom, bounced, and what happened to it");
  await page.getByRole("list", { name: staffCopy.letters.detail.historyTitle }).getByRole("button").first().click();
  await expect(page.locator("pre:popover-open")).toContainText('"reason"');
  await frame(page, "the bounce's {}: what Postmark said, as JSON, in a bubble by the button", { window: true });
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
  // The MP's card is under the form: brought into view, so the frame shows it.
  await page.getByRole("heading", { name: bouncy.name }).scrollIntoViewIfNeeded();
  await frame(page, "the form says the MP can't be reached");

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
  await frame(page, "Politicians' blocked emails lists their address");

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
