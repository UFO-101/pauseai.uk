import type { APIRequestContext, Page } from "@playwright/test";
import { staffCopy } from "@/lib/content/staff-interface";
import { importPath } from "@/lib/import-runs";
import { connectLettersInbox, databaseUrl, runSql } from "@/scripts/fresh-database.mjs";
import { OUTBOX_DIR } from "../checkout.mjs";
import { fixtureEnv } from "../fixture-env.mjs";
import { syncPoliticians } from "../steps";
import { BASE, expect, frame, story, test } from "./fixtures";
import { logIn } from "./staff-steps";

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
  await page.goto(`${BASE}${importPath("import-web-form-letters")}`);
  await page.getByRole("button", { name: staffCopy.webForm.importNow }).click();
  await expect(page.getByText(staffCopy.runs.status.ok).first()).toBeVisible();
}

/** Presses Import old letters, and waits for its result. */
async function press(page: Page, dryRun = false) {
  await page.goto(`${BASE}${importPath("import-old-letters")}`);
  if (dryRun) await page.getByRole("checkbox", { name: words.dryRun }).check();
  await page.getByRole("button", { name: words.importNow }).click();
  await expect(page.getByText(dryRun ? /would have read/ : /all done/).first()).toBeVisible();
}

test("Import old letters", async ({ page, request, flowDatabase }) => {
  story("Staff run the import as a dry run first. It changes nothing, and reports what it would join, by mailing.");
  await ready(page, flowDatabase, request);
  await page.goto(`${BASE}${importPath("import-old-letters")}`);
  await expect(page.getByText(words.never)).toBeVisible();
  await frame(page, "The job's page");
  await press(page, true);
  expect(runSql(flowDatabase, "SELECT count(*) FROM one_off_messages")).toEqual(["0"]);
  await expect(page.getByRole("heading", { name: words.joined })).toBeVisible();
  await frame(page, "The dry run's result");

  story(
    "Then they press it for real. It joins each letter to its sent email, reads the replies, and keeps the rest as one-off emails.",
  );
  await press(page);
  await expect(page.getByText("Neil Nobody <neil.nobody@example.com>: Volunteering")).toBeVisible();
  await frame(page, "What it did");

  story("Pressing it again skips everything it has kept.");
  const kept = runSql(flowDatabase, "SELECT count(*) FROM one_off_messages");
  await press(page);
  expect(runSql(flowDatabase, "SELECT count(*) FROM one_off_messages")).toEqual(kept);
  await frame(page, "Pressed again");
});

test("An old letter's page", async ({ page, request, flowDatabase }) => {
  story("A letter that fits its mailing's text is rebuilt from it, with what it had of its own.");
  await ready(page, flowDatabase, request);
  await press(page);
  await page.goto(`${BASE}/staff/mailings`);
  await frame(page, "The mailings, with those the import made");

  await page
    .getByRole("link", { name: words.mailingTitles["deepmind-25"] ?? "" })
    .first()
    .click();
  await expect(page.getByRole("heading", { name: staffCopy.mailingPages.emailTitle })).toBeVisible();
  await frame(page, "A mailing's text, each letter's own part a chip");
  await page
    .getByRole("link", { name: staffCopy.mailingPages.letterAndReplies(1) })
    .first()
    .click();
  await expect(page.getByText("You spoke well on the Bill.")).toBeVisible();
  await expect(page.getByText("Thank you, I'll think about it.")).toBeVisible();
  await frame(page, "A letter and the politician's reply");

  story("One the site can't read the text of, from August, is rebuilt from others like it, and says so.");
  await page.goto(`${BASE}/staff/mailings`);
  await page.getByRole("link", { name: words.mailingTitles["russell-speak"] }).click();
  await page.getByRole("link", { name: staffCopy.mailingPages.theLetter }).first().click();
  await expect(page.getByText("Would you speak?")).toBeVisible();
  await frame(page, "A letter that keeps its own text");
});

test("A form letter's page", async ({ page, request, flowDatabase }) => {
  story(
    "A letter through pauseai.info's old form shows only what its writer changed from the form's text then, and its reply.",
  );
  await ready(page, flowDatabase, request);
  await press(page);
  await page.goto(`${BASE}/staff/campaigns/pauseai-info-frontier-ai`);
  await frame(page, "Its campaign's page");
  await page
    .getByRole("row")
    .filter({ hasText: "Polly Placeholder" })
    .first()
    .getByRole("link", { name: staffCopy.mailingPages.theLetter })
    .click();
  await expect(page.getByText("I wrote this bit myself", { exact: false })).toBeVisible();
  await expect(page.getByText("I have signed.", { exact: false })).toBeVisible();
  await frame(page, "The letter's changes, and the reply");
});

test("One-off emails", async ({ page, request, flowDatabase }) => {
  story("The mailings list ends with the threads with politicians that aren't a mailing's or a campaign's.");
  await ready(page, flowDatabase, request);
  await press(page);
  await page.goto(`${BASE}/staff/mailings`);
  await page.getByRole("link", { name: oneOff.title }).click();
  await expect(page).toHaveURL(`${BASE}/staff/mailings/one-off`);
  await frame(page, "The one-off emails");

  story("They can be filtered to those only with PauseAI, or with someone else in them.");
  await page.getByRole("link", { name: oneOff.filters["someone-else"] }).click();
  await expect(page.getByRole("link", { name: "Fwd: My MP's answer" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Coffee next week?" })).toHaveCount(0);
  await frame(page, "With someone else in them");

  story("A thread is read through, across the mailboxes it was in.");
  await page.getByRole("link", { name: oneOff.all }).click();
  await page.getByRole("link", { name: "Coffee next week?" }).click();
  await expect(page.getByText("Thursday works.")).toBeVisible();
  await frame(page, "A thread");

  story("A politician's page lists theirs.");
  const [polly] = runSql(flowDatabase, "SELECT id FROM notable_people WHERE airtable_id = 'recPlaceholder'");
  await page.goto(`${BASE}/staff/politicians/${polly}`);
  await expect(page.getByRole("link", { name: "Coffee next week?" })).toBeVisible();
  await frame(page, "On the politician's page");

  story("Staff without the supporters permission can't read a thread with someone else in it, or see who.");
  await logIn(page, flowDatabase, []);
  await page.goto(`${BASE}/staff/mailings/one-off`);
  await expect(page.getByText("Vera Volunteer")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Coffee next week?" })).toBeVisible();
  await frame(page, "Without the permission");
  const [hidden] = runSql(flowDatabase, "SELECT id FROM one_off_threads WHERE someone_else LIMIT 1");
  await page.goto(`${BASE}/staff/mailings/one-off/${hidden}`);
  await expect(page.getByText(oneOff.hidden)).toBeVisible();
  await frame(page, "A thread they can't read");
});

test("Keeping your threads", async ({ page, flowDatabase }) => {
  story("Your own page says whether threads with politicians are kept from your Gmail, and turns it off, or on.");
  await logIn(page, flowDatabase, []);
  await page.goto(`${BASE}/staff/me`);
  await page.getByRole("link", { name: staffCopy.gmail.connect }).click();
  await expect(page.getByText(staffCopy.gmail.outcomes.connected)).toBeVisible();
  await expect(page.getByText(oneOff.keepOff)).toBeVisible();
  await frame(page, "Not kept");
  await page.getByRole("button", { name: oneOff.startKeeping }).click();
  await expect(page.getByText(oneOff.keepOn)).toBeVisible();
  await frame(page, "Kept");
  await page.getByRole("button", { name: oneOff.stopKeeping }).click();
  await expect(page.getByText(oneOff.keepOff)).toBeVisible();
});
