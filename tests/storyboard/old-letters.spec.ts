import type { APIRequestContext, Page } from "@playwright/test";
import { exampleOldLettersResult } from "@/app/(staff)/staff/_components/CampaignPages.examples";
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
  await expect(page.getByText(staffCopy.runs.status.problems).first()).toBeVisible();
}

/** Presses Import old letters, and waits for a new run that's finished. */
async function press(page: Page, database: string) {
  const finished = () =>
    runSql(
      database,
      `SELECT count(*) FROM import_runs WHERE job = 'import-old-letters' AND result->>'finished' = 'true'`,
    )[0];
  const before = finished();
  await page.goto(`${BASE}${importPath("import-old-letters")}`);
  await page.getByRole("button", { name: words.importNow }).click();
  await expect.poll(finished).not.toBe(before);
  await page.reload();
}

test("Import old letters", async ({ page, request, flowDatabase }) => {
  story(
    "Staff press the import. It joins each letter to its sent email, reads the replies, and keeps the rest as one-off emails.",
  );
  await ready(page, flowDatabase, request);
  await page.goto(`${BASE}${importPath("import-old-letters")}`);
  await expect(page.getByText(words.never)).toBeVisible();
  await frame(page, "The job's page");
  await press(page, flowDatabase);
  await expect(page.getByRole("heading", { name: words.joined })).toBeVisible();
  await expect(page.getByText("Neil Nobody <neil.nobody@example.com>: Volunteering").first()).toBeVisible();
  await frame(page, "What it did");

  story("Pressing it again skips everything it has kept.");
  const kept = runSql(flowDatabase, "SELECT count(*) FROM one_off_messages");
  await press(page, flowDatabase);
  expect(runSql(flowDatabase, "SELECT count(*) FROM one_off_messages")).toEqual(kept);
  await frame(page, "Pressed again");
});

test("The import fails", async ({ page, flowDatabase }) => {
  story("Joseph's Gmail isn't connected, so the import can't read it. The press shows as a failed run, saying why.");
  await logIn(page, flowDatabase, ["supporters", "admin"]);
  await page.goto(`${BASE}${importPath("import-old-letters")}`);
  await page.getByRole("button", { name: words.importNow }).click();
  await expect(page.getByText("joseph@pauseai.uk's Gmail isn't connected")).toBeVisible();
  await frame(page, "A failed run");
});

test("A second press", async ({ page, flowDatabase }) => {
  story("The import is already running. Its page says so, and pressing again starts nothing.");
  await logIn(page, flowDatabase, ["supporters", "admin"]);
  // The run before it stopped short, with what it reported.
  const stopped = JSON.stringify(exampleOldLettersResult).replaceAll("'", "''");
  const problems = JSON.stringify([
    { what: staffCopy.problems.job.unreadable, error: "18f0a" },
  ]).replaceAll("'", "''");
  runSql(
    flowDatabase,
    `INSERT INTO import_runs (job, started_by, status, result, problems, at) VALUES ('import-old-letters', 'jo@pauseai.uk', 'ok', '${stopped}', '${problems}', '2026-11-01T10:00:00Z')`,
  );
  runSql(flowDatabase, "INSERT INTO job_presses (job, started_by) VALUES ('import-old-letters', 'jo@pauseai.uk')");
  await page.goto(`${BASE}${importPath("import-old-letters")}`);
  await expect(page.getByText("jo@pauseai.uk", { exact: false }).first()).toBeVisible();
  await page.getByRole("button", { name: words.importNow }).click();
  await expect(page.getByText(staffCopy.runs.status.failed)).toHaveCount(0);
  expect(runSql(flowDatabase, "SELECT count(*) FROM import_runs WHERE job = 'import-old-letters'")).toEqual(["1"]);
  await frame(page, "Already running");
  await page.goto(`${BASE}/staff/import-data`);
  await frame(page, "Running, on the list of imports");
});

/** A result of the import, in SQL, with `extra` over a routine run's. */
const lettersResult = (extra: object) =>
  JSON.stringify({
    ...exampleOldLettersResult,
    finished: false,
    listed: 0,
    read: 38,
    left: 6120,
    joined: { "deepmind-25": 35 },
    added: {},
    notJoined: {},
    replies: 2,
    autoReplies: 1,
    oneOffs: 1,
    formTexts: 0,
    unreadable: [],
    unmatched: [],
    ...extra,
  }).replaceAll("'", "''");

/** `count` runs of the job on its schedule, five minutes apart, the newest `from` before now. */
const runsOf = (
  database: string,
  job: string,
  count: number,
  from: string,
  result: string,
  status = "ok",
  problems: object[] = [],
) =>
  runSql(
    database,
    `INSERT INTO import_runs (job, started_by, status, result, problems, at)
     SELECT '${job}', 'nightly', '${status}', '${result}', '${JSON.stringify(problems).replaceAll("'", "''")}', now() - interval '${from}' - n * interval '5 minutes' FROM generate_series(0, ${count - 1}) n`,
  );

const GMAIL_REFUSAL = "Gmail answered 403 for /messages/0a02: User-rate limit exceeded";

test("The import running by itself", async ({ page, flowDatabase }) => {
  story(
    "Every 5 minutes the import reads a little more. Its page says how far it has got, its recent runs a row each, the older ones folded, and anything worth reading shown whole.",
  );
  await logIn(page, flowDatabase, ["supporters", "admin"]);
  runSql(
    flowDatabase,
    `INSERT INTO old_letters_mail (account, gmail_message_id, gmail_thread_id, source, outcome, mailing_key)
     SELECT 'joseph@pauseai.uk', 'm' || n, 't' || n, 'sent', CASE WHEN n <= 300 THEN 'joined' WHEN n <= 340 THEN 'reply' WHEN n <= 360 THEN 'one_off' END, CASE WHEN n <= 200 THEN 'deepmind-25' WHEN n <= 300 THEN 'csrb' END
     FROM generate_series(1, 1000) n`,
  );
  runsOf(flowDatabase, "import-old-letters", 1, "0 minutes", lettersResult({ read: 40, left: 640 }));
  runsOf(flowDatabase, "import-old-letters", 8, "5 minutes", lettersResult({}));
  runsOf(
    flowDatabase,
    "import-old-letters",
    1,
    "45 minutes",
    lettersResult({
      read: 12,
      stoppedBy: "gmail",
      stoppedWhy: GMAIL_REFUSAL,
    }),
    "ok",
    [{ what: words.stoppedByGmail, error: GMAIL_REFUSAL }],
  );
  runsOf(flowDatabase, "import-old-letters", 3, "50 minutes", lettersResult({}));
  runsOf(flowDatabase, "import-old-letters", 1, "65 minutes", lettersResult({ unreadable: ["18f0a"] }), "ok", [
    { what: staffCopy.problems.job.unreadable, error: "18f0a" },
  ]);
  runsOf(flowDatabase, "import-old-letters", 30, "70 minutes", lettersResult({}));
  await page.goto(`${BASE}${importPath("import-old-letters")}`);
  await expect(page.getByRole("progressbar")).toBeVisible();
  await frame(page, "How far it has got, and its recent runs");

  story("The totals open to say what it has joined, by mailing.");
  await page
    .getByText(words.progress.totals({ joined: "300", replies: "40", autoReplies: "0", oneOffs: "20" }))
    .click();
  await expect(page.getByText(`${words.mailingTitles["deepmind-25"]}: 200`)).toBeVisible();
  await frame(page, "What it has joined, by mailing");

  story("Older runs are folded into a line, which opens into more of the day's table.");
  await page
    .locator("summary", { hasText: /no problems/ })
    .first()
    .click();
  await frame(page, "An older stretch, opened");

  story("It's listed with the imports that run every 5 minutes.");
  await page.goto(`${BASE}/staff/import-data`);
  await frame(page, "On the list of imports");
});

test("The import finishes", async ({ page, flowDatabase }) => {
  story("The last run reads what's left, and says what it couldn't join. After that the schedule does nothing more.");
  await logIn(page, flowDatabase, ["supporters", "admin"]);
  runSql(
    flowDatabase,
    `INSERT INTO old_letters_mail (account, gmail_message_id, gmail_thread_id, source, outcome)
     SELECT 'joseph@pauseai.uk', 'm' || n, 't' || n, 'sent', 'joined' FROM generate_series(1, 500) n`,
  );
  runsOf(flowDatabase, "import-old-letters", 4, "5 minutes", lettersResult({}));
  runsOf(
    flowDatabase,
    "import-old-letters",
    1,
    "0 minutes",
    lettersResult({ finished: true, left: 0, notJoined: exampleOldLettersResult.notJoined }),
  );
  await page.goto(`${BASE}${importPath("import-old-letters")}`);
  await frame(page, "All read");
});

test("An old letter's page", async ({ page, request, flowDatabase }) => {
  story("A letter that matches its mailing's text is rebuilt from that text, plus its own parts.");
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

  story("A letter written individually keeps its whole text.");
  await page.goto(`${BASE}/staff/mailings`);
  await page.getByRole("link", { name: words.mailingTitles["russell-speak"] }).first().click();
  await page.getByRole("link", { name: staffCopy.mailingPages.theLetter }).first().click();
  await expect(page.getByText("Would you speak?")).toBeVisible();
  await frame(page, "A letter that keeps its own text");

  story(
    "We can't read August's letters, so one is built from the send before and the person's earlier letter, and says so.",
  );
  const [polly] = runSql(flowDatabase, "SELECT id FROM notable_people WHERE airtable_id = 'recPlaceholder'");
  const [mailing] = runSql(flowDatabase, "SELECT id FROM mailings WHERE old_letters_key = 'deepmind-august'");
  const paragraph = (...content: object[]) => ({ type: "paragraph", content });
  const field = (name: string) => ({ type: "field", attrs: { field: name } });
  const august = {
    type: "doc",
    content: [
      paragraph(field("greeting")),
      paragraph({ type: "text", text: "Please join " }, field("colleagues"), {
        type: "text",
        text: " of your colleagues.",
      }),
      paragraph(field("own")),
    ],
  };
  runSql(
    flowDatabase,
    `UPDATE mailings SET imported_text = '${JSON.stringify(august)}', imported_text_approximate = true, from_name = 'Joseph'
     WHERE id = ${mailing}`,
  );
  const [letter] = runSql(
    flowDatabase,
    `WITH made AS (INSERT INTO letters (kind, notable_person_id, status, created_at, sent_at)
       VALUES ('pauseai', ${polly}, 'sent', '2025-08-08 09:00+00', '2025-08-08 09:00+00') RETURNING id)
     INSERT INTO letters_from_pauseai (id, mailing_id, merge_values)
     SELECT id, ${mailing}, '{"values":{"greeting":"Dear Ms Placeholder,","colleagues":"50","own":"You spoke well on the Bill."},"meets":[]}' FROM made RETURNING id`,
  );
  await page.goto(`${BASE}/staff/mailings/${mailing}`);
  await expect(page.getByText(staffCopy.letterThread.approximate)).toBeVisible();
  await frame(page, "August's mailing, approximate");
  await page.goto(`${BASE}/staff/mailings/${mailing}/letters/${letter}`);
  await expect(page.getByText(staffCopy.letterThread.approximate)).toBeVisible();
  await expect(page.getByText("Please join 50 of your colleagues.")).toBeVisible();
  await expect(page.getByText("You spoke well on the Bill.")).toBeVisible();
  await expect(page.getByText("Joseph", { exact: true }).first()).toBeVisible();
  await frame(page, "A letter from August");
});

test("A form letter's page", async ({ page, request, flowDatabase }) => {
  story("A letter from pauseai.info's old form shows only what its writer changed, and its reply.");
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
  story("One-off emails are threads with politicians that aren't part of a mailing or campaign.");
  await ready(page, flowDatabase, request);
  await press(page, flowDatabase);
  await page.goto(`${BASE}/staff/one-off`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(oneOff.title);
  await frame(page, "The one-off emails");

  story("A thread shows every message, from whichever mailbox kept it.");
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
