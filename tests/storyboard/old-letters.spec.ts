import type { APIRequestContext, Page } from "@playwright/test";
import { staffCopy } from "@/lib/content/staff-interface";
import { importPath } from "@/lib/import-runs";
import { connectLettersInbox, databaseUrl, runSql } from "@/scripts/fresh-database.mjs";
import { OUTBOX_DIR } from "../checkout.mjs";
import { fixtureEnv } from "../fixture-env.mjs";
import { addStaffAccount, logInAsStaff, newestEmail, syncPoliticians } from "../steps";
import { BASE, emailFrame, expect, frame, story, test } from "./fixtures";
import { importEmails, logIn } from "./staff-steps";

// The letters written before the site could send them, read from the policy
// team's mailboxes, and every other thread with a politician. Each flow on its
// own database, reading the fake mailboxes (tests/fixtures/old-letters-mailbox.ts).

const words = staffCopy.oldLetters;
const oneOff = staffCopy.oneOff;

/** The site has the politicians and letters, Joseph's and policy@'s Gmail are connected. */
async function ready(page: Page, database: string, request: APIRequestContext) {
  await syncPoliticians(request, BASE);
  const key = fixtureEnv({ outboxDir: OUTBOX_DIR }).GMAIL_TOKEN_KEY;
  for (const email of ["joseph@pauseai.uk", "policy@pauseai.uk"])
    connectLettersInbox(databaseUrl(database), email, key);
  await logIn(page, database, ["supporters", "admin"]);
  await importEmails(page);
  await page.goto(`${BASE}${importPath("import-web-form-letters")}`);
  await page.getByRole("button", { name: staffCopy.webForm.importNow }).click();
  await expect(page.getByText(staffCopy.runs.status.ok).first()).toBeVisible();
}

/** Presses Import old letters, and waits for a new run that's finished. */
async function press(page: Page, database: string, dryRun = false) {
  const finished = () =>
    runSql(
      database,
      `SELECT count(*) FROM import_runs WHERE job = 'import-old-letters' AND result->>'finished' = 'true'`,
    )[0];
  const before = finished();
  await page.goto(`${BASE}${importPath("import-old-letters")}`);
  if (dryRun) await page.getByRole("checkbox", { name: words.dryRun }).check();
  await page.getByRole("button", { name: words.importNow }).click();
  await expect.poll(finished).not.toBe(before);
  await page.reload();
}

test("Import old letters", async ({ page, request, flowDatabase }) => {
  story("Staff run the import as a dry run first. It changes nothing, and reports what it would join, by mailing.");
  await ready(page, flowDatabase, request);
  await page.goto(`${BASE}${importPath("import-old-letters")}`);
  await expect(page.getByText(words.never)).toBeVisible();
  await frame(page, "The job's page");
  await press(page, flowDatabase, true);
  expect(runSql(flowDatabase, "SELECT count(*) FROM one_off_messages")).toEqual(["0"]);
  await expect(page.getByRole("heading", { name: words.joined })).toBeVisible();
  await frame(page, "The dry run's result");

  story(
    "Then they press it for real. It joins each letter to its sent email, reads the replies, and keeps the rest as one-off emails.",
  );
  await press(page, flowDatabase);
  await expect(page.getByText("Neil Nobody <neil.nobody@example.com>: Volunteering").first()).toBeVisible();
  await frame(page, "What it did");

  story("Pressing it again skips everything it has kept.");
  const kept = runSql(flowDatabase, "SELECT count(*) FROM one_off_messages");
  await press(page, flowDatabase);
  expect(runSql(flowDatabase, "SELECT count(*) FROM one_off_messages")).toEqual(kept);
  await frame(page, "Pressed again");
});

test("The old letters import fails", async ({ page, flowDatabase }) => {
  story("Joseph's Gmail isn't connected, so the import can't read it. The press shows as a failed run, saying why.");
  await logIn(page, flowDatabase, ["supporters", "admin"]);
  await page.goto(`${BASE}${importPath("import-old-letters")}`);
  await page.getByRole("button", { name: words.importNow }).click();
  await expect(page.getByText("joseph@pauseai.uk's Gmail isn't connected")).toBeVisible();
  await frame(page, "A failed run");
});

test("An old letter's page", async ({ page, request, flowDatabase }) => {
  story("A letter that fits its mailing's text is rebuilt from it, with what it had of its own.");
  await ready(page, flowDatabase, request);
  await press(page, flowDatabase);
  await page.goto(`${BASE}/staff/mailings`);
  await frame(page, "The mailings, with those the import made");

  await page
    .getByRole("link", { name: words.mailingTitles["deepmind-25"] ?? "" })
    .first()
    .click();
  await expect(page.getByRole("heading", { name: staffCopy.mailingPages.emailTitle })).toBeVisible();
  await frame(page, "A mailing's text, each letter's own part a chip");
  await page
    .getByRole("link", { name: staffCopy.mailingPages.letterAndReplies(3) })
    .first()
    .click();
  await expect(page.getByText("You spoke well on the Bill.")).toBeVisible();
  await expect(page.getByText("Thank you, I'll think about it.")).toBeVisible();
  await frame(page, "A letter and the politician's reply");

  story("A letter that was each its own keeps its whole text.");
  await page.goto(`${BASE}/staff/mailings`);
  await page.getByRole("link", { name: words.mailingTitles["russell-speak"] }).first().click();
  await page.getByRole("link", { name: staffCopy.mailingPages.theLetter }).first().click();
  await expect(page.getByText("Would you speak?")).toBeVisible();
  await frame(page, "A letter that keeps its own text");

  story("A letter from August, whose text we can't read, is rebuilt from a reply quoting one like it, and says so.");
  const [polly] = runSql(flowDatabase, "SELECT id FROM notable_people WHERE airtable_id = 'recPlaceholder'");
  const [mailing] = runSql(flowDatabase, "SELECT id FROM mailings WHERE old_letters_key = 'deepmind-august'");
  const [letter] = runSql(
    flowDatabase,
    `WITH made AS (INSERT INTO letters (kind, notable_person_id, status, created_at, sent_at)
       VALUES ('pauseai', ${polly}, 'sent', '2025-08-08 09:00+00', '2025-08-08 09:00+00') RETURNING id)
     INSERT INTO letters_from_pauseai (id, mailing_id, merge_values)
     SELECT id, ${mailing}, '{"values":{"greeting":"Dear Ms Placeholder,","colleagues":"50"},"meets":[]}' FROM made RETURNING id`,
  );
  await page.goto(`${BASE}/staff/mailings/${mailing}`);
  await expect(page.getByText(staffCopy.letterThread.approximate)).toBeVisible();
  await frame(page, "August's mailing, approximate");
  await page.goto(`${BASE}/staff/mailings/${mailing}/letters/${letter}`);
  await expect(page.getByText(staffCopy.letterThread.approximate)).toBeVisible();
  await expect(page.getByText("Please join 50 of your colleagues.")).toBeVisible();
  await frame(page, "A letter from August");
});

test("A form letter's page", async ({ page, request, flowDatabase }) => {
  story(
    "A letter through pauseai.info's old form shows only what its writer changed from the form's text then, and its reply.",
  );
  await ready(page, flowDatabase, request);
  await press(page, flowDatabase);
  await page.goto(`${BASE}/staff/campaigns/pauseai-info-frontier-ai`);
  await frame(page, "Its campaign's page");
  await page
    .getByRole("row")
    .filter({ hasText: "Polly Placeholder" })
    .first()
    .getByRole("link", { name: staffCopy.mailingPages.theLetter })
    .click();
  const letter = page.getByRole("region", { name: staffCopy.letterThread.title });
  await expect(letter).toContainText("my children");
  await expect(letter).toContainText("I have signed.");
  await frame(page, "The letter's changes, and the reply");
});

test("One-off emails", async ({ page, request, flowDatabase }) => {
  story("One-off emails, in the menu, are the threads with politicians that aren't a mailing's or a campaign's.");
  await ready(page, flowDatabase, request);
  await press(page, flowDatabase);
  await page.goto(`${BASE}/staff/one-off`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(oneOff.title);
  await frame(page, "The one-off emails");

  story("A thread is read through, across the mailboxes it was in.");
  await page.getByRole("link", { name: "Coffee next week?" }).click();
  await expect(page.getByText("Thursday works.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Polly Placeholder" }).first()).toBeVisible();
  await frame(page, "A thread");

  story("A politician's page lists theirs.");
  const [polly] = runSql(flowDatabase, "SELECT id FROM notable_people WHERE airtable_id = 'recPlaceholder'");
  await page.goto(`${BASE}/staff/politicians/${polly}`);
  await expect(page.getByRole("link", { name: "Coffee next week?" })).toBeVisible();
  await frame(page, "On the politician's page");

  story("Staff without the supporters permission can't read a thread with someone else in it, or see who.");
  await logIn(page, flowDatabase, []);
  await page.goto(`${BASE}/staff/one-off`);
  await expect(page.getByText("Vera Volunteer")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Coffee next week?" })).toBeVisible();
  await frame(page, "Without the permission");
  const [hidden] = runSql(flowDatabase, "SELECT id FROM one_off_threads WHERE someone_else LIMIT 1");
  await page.goto(`${BASE}/staff/one-off/${hidden}`);
  await expect(page.getByText(oneOff.hidden)).toBeVisible();
  await frame(page, "A thread they can't read");
});

test("Keeping Joseph's threads", async ({ page, flowDatabase }) => {
  story(
    "Threads with politicians are kept from policy@ and Joseph's mailboxes. His own page says so, once it's connected.",
  );
  addStaffAccount(flowDatabase, "joseph@pauseai.uk");
  await logInAsStaff(page, BASE, "joseph@pauseai.uk");
  await page.goto(`${BASE}/staff/me`);
  await page.getByRole("link", { name: staffCopy.gmail.connect }).click();
  await expect(page.getByText(oneOff.kept.before)).toBeVisible();
  await frame(page, "Kept");
});

test("Mail that matches nothing", async ({ page, request, flowDatabase }) => {
  story(
    "Mail in policy@ that isn't about a politician isn't kept, but staff get a list of it, once a day, by sender and subject.",
  );
  await ready(page, flowDatabase, request);
  runSql(flowDatabase, "INSERT INTO unmatched_mail (account, gmail_message_id) VALUES ('policy@pauseai.uk', '0b02')");
  await page.goto(`${BASE}${importPath("read-gmail")}`);
  await page.getByRole("button", { name: staffCopy.gmailReading.readNow }).click();
  await expect.poll(() => newestEmail((email) => email.Subject === oneOff.unmatchedAlert.subject(1))).toBeTruthy();
  const report = newestEmail((email) => email.Subject === oneOff.unmatchedAlert.subject(1))!;
  expect(report.TextBody).toContain("Are you hiring?");
  await emailFrame(page, report, "The email staff get");
});
