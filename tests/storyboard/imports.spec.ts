import { jobTitles, staffCopy } from "@/lib/content/staff-interface";
import type { ImportJob } from "@/lib/import-runs";
import { staffDate } from "@/lib/staff-time";
import { runSql } from "@/scripts/fresh-database.mjs";
import { FIXTURE_NOW, LETTERS_INBOX, NOTIFICATION_INBOX } from "../fixture-env.mjs";
import { FAILING_DIR } from "../checkout.mjs";
import { failService } from "../fixtures/failing-services";
import { logInAsStaff, newestEmail, syncPoliticians } from "../steps";
import { BASE, emailFrame, expect, frame, story, test } from "./fixtures";
import { importEmails, logIn, staffEmail } from "./staff-steps";

// The imports staff run and watch: Luma's, the members', Gmail's, PauseAI's emails, pauseai.info's letters and Go to Parliament's meetings, each import's
// own page of its runs, an import failing, a Gmail Google disconnects, and a
// politician import held for a person to decide. Each flow on its own database.

/** The newest email to the notification inbox with `subject`. */
const notified = (subject: string) =>
  newestEmail((email) => email.To === NOTIFICATION_INBOX && email.Subject === subject);

test("The Luma import", async ({ page, flowDatabase }) => {
  story(
    "Staff run the Luma import by hand. The first run copies every event on our Luma calendar, who registered for each, the hosts and the calendar's contacts, and adds them as supporters.",
  );
  await logIn(page, flowDatabase);
  await page.goto(`${BASE}/staff/import-data/luma`);
  await page.getByRole("button", { name: staffCopy.luma.importNow }).click();
  // The fixture calendar: nine public events and a private one, five guests each over two pages, each event's hosts,
  // one of them no guest, three contacts.
  const first = {
    events: 9,
    eventsSynced: 9,
    eventsLeft: 0,
    guestsChanged: 45,
    people: 6,
    contacts: 3,
    supportersAdded: 7,
    linked: 7,
    requests: 30,
  };
  await expect(page.getByText(staffCopy.luma.result(first))).toBeVisible();
  await page.getByRole("heading", { name: staffCopy.luma.title }).scrollIntoViewIfNeeded();
  await frame(page, "The first run");

  story("Run again within the hour, it finds nothing new.");
  // Within the hour, no event is due again: one page of events, unchanged, and the next pass over the contacts' two pages.
  await page.getByRole("button", { name: staffCopy.luma.importNow }).click();
  const again = {
    ...first,
    events: 0,
    eventsSynced: 0,
    guestsChanged: 0,
    people: 0,
    contacts: 0,
    supportersAdded: 0,
    linked: 0,
    requests: 3,
  };
  await expect(page.getByText(staffCopy.luma.result(again))).toBeVisible();
  await expect(page.getByText(staffCopy.runs.status.unchanged)).toBeVisible();
  await page.getByRole("heading", { name: staffCopy.luma.title }).scrollIntoViewIfNeeded();
  await frame(page, "The second run");
});

test("The members import", async ({ page, flowDatabase }) => {
  story(
    "Staff run the members import, which copies PauseAI members in the UK from the global team's Airtable. Every member is copied but one, who was erased.",
  );
  runSql(flowDatabase, "INSERT INTO members_erased (id) VALUES ('recMemberErased')");
  await logIn(page, flowDatabase);
  await page.goto(`${BASE}/staff/import-data/members`);
  await page.getByRole("button", { name: staffCopy.members.importNow }).click();
  // The fixture's eight members, one of them erased.
  const first = {
    members: 8,
    added: 7,
    changed: 0,
    removed: 0,
    supportersAdded: 7,
    linked: 7,
  };
  await expect(page.getByText(staffCopy.members.result(first))).toBeVisible();
  await page.getByRole("heading", { name: staffCopy.members.title }).scrollIntoViewIfNeeded();
  await frame(page, "The first run");

  story("Run again, it finds nothing new.");
  await page.getByRole("button", { name: staffCopy.members.importNow }).click();
  await expect(
    page.getByText(staffCopy.members.result({ ...first, added: 0, supportersAdded: 0, linked: 0 })),
  ).toBeVisible();
  await expect(page.getByText(staffCopy.runs.status.unchanged)).toBeVisible();
  await page.getByRole("heading", { name: staffCopy.members.title }).scrollIntoViewIfNeeded();
  await frame(page, "The second run");
});

test("Reading Gmail", async ({ page, flowDatabase }) => {
  story(
    "A staff member connects their Gmail from their account page. The Gmail import's page says it hasn't been read yet.",
  );
  await logIn(page, flowDatabase);
  await page.goto(`${BASE}/staff/me`);
  await page.getByRole("link", { name: staffCopy.gmail.connect }).click();
  await expect(page.getByText(staffCopy.gmail.outcomes.connected)).toBeVisible();
  await page.goto(`${BASE}/staff/import-data/gmail`);
  await expect(page.getByText(staffCopy.gmailReading.never)).toBeVisible();
  await frame(page, "The Gmail import's page");

  story("They read it now. It reads their account for replies and bounces, and finds nothing new.");
  await page.getByRole("button", { name: staffCopy.gmailReading.readNow }).click();
  // The fixture mailbox has nothing new in it.
  const read = { account: staffEmail(), replies: 0, autoReplies: 0, bounces: 0 };
  await expect(page.getByText(staffCopy.gmailReading.account(read))).toBeVisible();
  await expect(page.getByText(staffCopy.runs.status.unchanged)).toBeVisible();
  await page.getByRole("heading", { name: staffCopy.gmailReading.title }).scrollIntoViewIfNeeded();
  await frame(page, "Gmail, read");
});

test("Google disconnects a Gmail", async ({ page, request, flowDatabase }) => {
  story(
    "A staff member has connected their Gmail. Then Google stops letting us use it, as it does when someone removes our access or their password changes.",
  );
  await logIn(page, flowDatabase);
  await page.goto(`${BASE}/staff/me`);
  await page.getByRole("link", { name: staffCopy.gmail.connect }).click();
  await expect(page.getByText(staffCopy.gmail.outcomes.connected)).toBeVisible();
  // Theirs alone: the letters inbox, which every flow has connected, isn't.
  runSql(
    flowDatabase,
    `UPDATE staff_accounts SET gmail_token = NULL, gmail_connected_at = NULL, gmail_history_id = NULL, gmail_name = NULL
     WHERE email = '${LETTERS_INBOX}'`,
  );
  failService(flowDatabase, "oauth2.googleapis.com", FAILING_DIR);

  story(
    "The next hourly read of Gmail finds out. The site disconnects the account, and the notification inbox gets an email saying who must connect it again.",
  );
  const res = await request.post(`${BASE}/api/cron/read-gmail`, {
    headers: { Authorization: "Bearer fixture-cron-secret" },
  });
  expect(res.ok()).toBe(true);
  const words = staffCopy.notifications.gmailDisconnected;
  await emailFrame(page, notified(words.subject(staffEmail()))!, "The email to the notification inbox");

  story("The Gmail import's page shows that run failed, and why.");
  await page.goto(`${BASE}/staff/import-data/gmail`);
  await expect(page.getByText(staffCopy.gmailReading.disconnected)).toBeVisible();
  await frame(page, "The Gmail import's page");

  story("Their account page offers to connect their Gmail again.");
  await page.goto(`${BASE}/staff/me`);
  await expect(page.getByRole("link", { name: staffCopy.gmail.connect })).toBeVisible();
  await frame(page, "Their account page");
});

test("The letters inbox connects", async ({ page }) => {
  story(
    "Staff log in as the letters inbox and connect its Gmail. Back from Google, the page says supporters' letters to MPs go from it now, not mailings, and replies are relayed through it.",
  );
  await logInAsStaff(page, BASE, LETTERS_INBOX);
  await page.goto(`${BASE}/staff/me?gmail=connected`);
  await expect(page.getByRole("status")).toHaveText(staffCopy.gmail.outcomes.connectedLettersInbox);
  await frame(page, "The letters inbox's account page");
});

test("An import's runs", async ({ page, request, flowDatabase }) => {
  story(
    "Staff run the MP check twice. Its page lists both runs, under the day's heading, and none of the other imports' runs.",
  );
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  // The check, twice: its page lists both runs, under the day's heading, and none of the MP import's.
  await page.goto(`${BASE}/staff/import-data/mp-check`);
  const check = page.getByRole("button", { name: staffCopy.check.checkNow });
  await check.click();
  await expect(page.getByRole("row").filter({ hasText: "Cities of London and Westminster" })).toBeVisible();
  await check.click();
  await expect(page.getByRole("row").filter({ hasText: "Cities of London and Westminster" })).toHaveCount(2);
  // One day's heading over both: the fixture clock's day.
  const day = page.getByRole("heading", { level: 2, name: staffDate(FIXTURE_NOW) });
  await expect(day).toHaveCount(1);
  // Where the second run leaves the window depends on when its result arrives, so the frame starts at the day.
  await day.evaluate((heading) => heading.scrollIntoView({ block: "start" }));
  await frame(page, "The MP check's page");

  story(
    "The import page has a card for each import, showing its newest run. The check is done, and ControlAI's letter hasn't been read yet.",
  );
  // The import page: each job's newest run on its card; the MP import's, from the start of the flow.
  await page.getByRole("navigation", { name: staffCopy.import.pageTitle }).getByRole("link").click();
  await expect(page).toHaveURL(`${BASE}/staff/import-data`);
  const card = (job: ImportJob) =>
    page.locator("section").filter({ has: page.getByRole("link", { name: jobTitles[job] }) });
  await expect(card("check-mps").getByText(staffCopy.runs.status.ok)).toBeVisible();
  await expect(card("import-controlai").getByText(staffCopy.controlAi.never)).toBeVisible();
  await frame(page, "The import page");
});

test("An import fails", async ({ page, request, flowDatabase }) => {
  story(
    "Luma is down. The hourly Luma import fails, and the notification inbox gets an email with the error and a link to the import's runs.",
  );
  failService(flowDatabase, "public-api.luma.com", FAILING_DIR);
  const luma = () =>
    request.post(`${BASE}/api/cron/import-luma`, { headers: { Authorization: "Bearer fixture-cron-secret" } });
  expect((await luma()).ok()).toBe(false);
  const words = staffCopy.notifications.importFailed;
  const email = notified(words.subject(jobTitles["import-luma"]))!;
  await emailFrame(page, email, "The email to the notification inbox");

  story("An hour later it fails again. No second email: there's one until the import has worked.");
  expect((await luma()).ok()).toBe(false);
  expect(notified(words.subject(jobTitles["import-luma"]))!.MessageId).toBe(email.MessageId);
  await logIn(page, flowDatabase);
  await page.goto(`${BASE}/staff/import-data/luma`);
  await expect(page.getByText(staffCopy.runs.status.failed, { exact: true })).toHaveCount(2);
  await frame(page, "The Luma import's runs");
});

test("A held politician import", async ({ page, request, flowDatabase }) => {
  story(
    "21 MPs are no longer in Airtable. An import that would mark that many gone changes too much to go ahead alone, so it's held for a person to check.",
  );
  await syncPoliticians(request, BASE);
  // Twenty-one MPs Airtable no longer lists: the next import would mark them
  // all gone from it, more than it may without a person checking.
  runSql(
    flowDatabase,
    `WITH people AS (
       INSERT INTO notable_people (kind, airtable_id, name)
       SELECT 'politician', 'recGone' || n, 'Gone McTestface ' || n || ' MP' FROM generate_series(1, 21) n RETURNING id, name
     )
     INSERT INTO politicians (id, house, constituency) SELECT id, 'commons', replace(replace(name, ' MP', ''), 'McTestface ', '') FROM people`,
  );
  const inAirtable = () =>
    Number(
      runSql(
        flowDatabase,
        "SELECT count(*) FROM notable_people WHERE name LIKE 'Gone %' AND airtable_removed_at IS NULL",
      )[0],
    );

  // The nightly import, which holds it.
  await syncPoliticians(request, BASE);
  story("The notification inbox gets an email about it, once.");
  await emailFrame(
    page,
    notified(staffCopy.notifications.syncHeld.subject(21))!,
    "The email to the notification inbox",
  );

  story("The import's page shows the run held, with what it would change.");
  await logIn(page, flowDatabase, ["admin"]);
  await page.goto(`${BASE}/staff/import-data/politicians`);
  await expect(page.getByRole("button", { name: staffCopy.syncs.apply })).toBeVisible();
  await expect(page.getByText(`${staffCopy.syncs.removed} 21`).first()).toBeVisible();
  await expect(page.getByText("Gone 1: Gone McTestface 1 MP")).toBeAttached();
  expect(inAirtable()).toBe(21);
  await frame(page, "The import, held");

  story("The staff dashboard says so first, with a button back to the decision.");
  // The home page says so, first thing, with a button back to the decision.
  await page.goto(`${BASE}/staff`);
  await expect(page.getByText(staffCopy.home.dashboard.actions.heldSync(21))).toBeVisible();
  await frame(page, "The dashboard");
  await page.getByRole("link", { name: staffCopy.home.dashboard.actions.decide }).click();
  await expect(page).toHaveURL(`${BASE}/staff/import-data/politicians`);

  story("An admin discards it. Nothing changes: all 21 are still in Airtable here.");
  await page.getByRole("button", { name: staffCopy.syncs.discard }).click();
  await expect(page.getByRole("button", { name: staffCopy.syncs.apply })).toHaveCount(0);
  await expect(page.getByText(staffCopy.runs.status.discarded).first()).toBeVisible();
  expect(inAirtable()).toBe(21);
  // From the top, where the newest run says how it ended; the button left the page scrolled down its list.
  await page.evaluate(() => window.scrollTo(0, 0));
  await frame(page, "The import, discarded");

  story(
    "They run the import again, and it's held again. This time they apply it. The 21 are marked gone from Airtable, and kept, and the run says who decided.",
  );
  await page.getByRole("button", { name: staffCopy.syncs.syncNow }).click();
  await page.getByRole("button", { name: staffCopy.syncs.apply }).click();
  await expect(page.getByRole("button", { name: staffCopy.syncs.apply })).toHaveCount(0);
  await expect(page.getByText(staffCopy.runs.decidedBy(staffEmail())).first()).toBeVisible();
  expect(inAirtable()).toBe(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await frame(page, "The import, applied");

  story("The audit log records who discarded it and who applied it.");
  await page.goto(`${BASE}/staff/audit-log`);
  await expect(page.getByRole("cell", { name: "apply held politician sync" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "discard held politician sync" })).toBeVisible();
  await frame(page, "The audit log");
});

test("A held rename", async ({ page, request, flowDatabase }) => {
  story(
    "A record here named Penny Previous is now Polly Placeholder in Airtable. That may be Airtable reusing the record for someone new, so the import is held, showing the old name and the new.",
  );
  await syncPoliticians(request, BASE);
  // Polly's record had another name here: Airtable now names someone else in it.
  runSql(flowDatabase, "UPDATE notable_people SET name = 'Penny Previous' WHERE airtable_id = 'recPlaceholder'");
  await logIn(page, flowDatabase, ["admin"]);
  await page.goto(`${BASE}/staff/import-data/politicians`);
  await page.getByRole("button", { name: staffCopy.syncs.syncNow }).click();
  await expect(page.getByRole("button", { name: staffCopy.syncs.apply })).toBeVisible();
  await expect(page.getByText("Penny Previous → Polly Placeholder")).toBeVisible();
  await frame(page, "The import, held");
});

test("PauseAI's emails to politicians", async ({ page, request, flowDatabase }) => {
  story(
    "Staff press Import emails now, which copies PauseAI's emails to politicians from Airtable. Its page shows five copied, and one left out, as it belongs to no mailing we know.",
  );
  await syncPoliticians(request, BASE);
  // With no permissions: PauseAI's letters are the politicians section's.
  await logIn(page, flowDatabase);
  await importEmails(page);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(jobTitles["sync-emails"]);
  await expect(page.getByText("recEmailNewBox", { exact: false }).first()).toBeVisible();
  await frame(page, "The emails import's page");
  story("Pressing it again finds nothing new.");
  await page.getByRole("button", { name: staffCopy.pauseaiEmails.importNow }).click();
  await expect(page.getByText(staffCopy.runs.status.incomplete)).toHaveCount(2);
  expect(runSql(flowDatabase, "SELECT count(*) FROM letters_from_pauseai")).toEqual(["5"]);

  story("Each email is in its politician's history, and has its own page under its mailing.");
  // Each is in its MP's history, leading to its own page under its mailing, and from there to a Gmail search for it,
  // in a mailbox Airtable didn't say.
  await page.goto(`${BASE}/staff/politicians`);
  await page.getByRole("link", { name: "Polly Placeholder" }).click();
  const history = page.getByRole("list", { name: staffCopy.politician.historyTitle });
  await history.getByRole("link", { name: staffCopy.mailingPages.theLetter }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    staffCopy.letters.oneTitle(staffCopy.letters.fromPauseai, "Polly Placeholder"),
  );
  await expect(page).toHaveURL(/\/staff\/mailings\/\d+\/letters\/\d+$/);
  await frame(page, "PauseAI's email to Polly");
  story(
    "Copy Gmail search copies a search for it by Polly's address and when it went. Airtable didn't say which mailbox sent it, so the page says to look in one that did.",
  );
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: staffCopy.findInGmail.copy }).click();
  await expect(page.getByRole("status")).toContainText(staffCopy.findInGmail.whereUnknown);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/^to:polly\S+ after:\d+ before:\d+$/);
  await frame(page, "The search, copied");
});

test("One-off imports", async ({ page, request, flowDatabase }) => {
  story(
    "Staff import the letters supporters sent through pauseai.info's old write to MP form. Three are imported, and the page says why the rest weren't.",
  );
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase, ["supporters"]);
  await page.goto(`${BASE}/staff/import-data/web-form-letters`);
  await page.getByRole("button", { name: staffCopy.webForm.importNow }).click();
  await expect(
    page.getByText(staffCopy.webForm.result({ read: 9, imported: 3, skipped: 3, alreadyHere: 1, noPolitician: 2 }), {
      exact: false,
    }),
  ).toBeVisible();
  await frame(page, "The old form's letters, imported");

  story("Each old campaign has its letters, on its own page.");
  await page.goto(`${BASE}/staff/campaigns`);
  await page.getByRole("link", { name: "Call DeepMind to honour AI Safety Summit pledges" }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Call DeepMind to honour AI Safety Summit pledges");
  await frame(page, "An old campaign's page");
  story("Each sender is now a supporter, from the old form.");
  await page.getByRole("link", { name: "Dee Deepmind" }).first().click();
  await expect(page.getByText(staffCopy.supporters.sources["web-form"]).first()).toBeVisible();
  await frame(page, "Dee Deepmind's page");

  story(
    "Then they import the MPs' answers about meeting constituents at Go to Parliament. The asks page counts them: one MP is sending staff instead.",
  );
  await page.goto(`${BASE}/staff/import-data/go-to-parliament`);
  await page.getByRole("button", { name: staffCopy.goToParliament.importNow }).click();
  await expect(
    page.getByText(staffCopy.goToParliament.result({ guests: 5, mps: 4, added: 3, changed: 0, notFound: 1 }), {
      exact: false,
    }),
  ).toBeVisible();
  await page.goto(`${BASE}/staff/asks`);
  await expect(
    page.getByRole("link", { name: staffCopy.asks.count(staffCopy.statuses.meeting_staff, 1) }),
  ).toBeVisible();
  await frame(page, "The asks page");
});
