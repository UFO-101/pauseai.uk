import type { APIRequestContext, Browser, Page } from "@playwright/test";
import { staffCopy } from "@/lib/content/staff-interface";
import { IMPORT_JOBS, importPath } from "@/lib/import-runs";
import { TEST_MPS } from "@/lib/test-mps";
import { runSql } from "@/scripts/fresh-database.mjs";
import { ROUTES } from "../routes";
import {
  addStaffAccount,
  fakeTurnstile,
  fillLetter,
  importLuma,
  importMembers,
  logInAsStaff,
  lookUpTestMp,
  sendLetter,
  syncPoliticians,
  WEBHOOK_AUTH,
} from "../steps";
import { importEmails } from "./staff-steps";
import { BASE, expect, flowStorageState, madeUpAddress, frame, story, test } from "./fixtures";

// Who sees what: supporter data only with `supporters`, wherever it would
// show; and the sessions an account has, which an admin, or its owner, can
// end. Each flow on its own database.

const staffEmail = () => `staff-${test.info().testId.replace(/\W/g, "").slice(-8)}@pauseai.uk`;
const testy = TEST_MPS[0];

/** Gives this flow's staff member an account with `permissions`, then logs them in. */
async function logIn(page: Page, database: string, permissions: string[] = []) {
  addStaffAccount(database, staffEmail(), permissions);
  await logInAsStaff(page, BASE, staffEmail());
}

/** A letter to the test MP from `sender`, sent through the campaign page. */
async function writeLetter(page: Page, sender: string) {
  await fakeTurnstile(page);
  await lookUpTestMp(page, BASE, testy);
  await fillLetter(page, sender);
  await sendLetter(page, testy);
}

/** Postmark's bounce webhook for an email to `address` that we can't place, as a forwarded reply's might be. */
async function postBounce(request: APIRequestContext, address: string) {
  const bounce = await request.post(`${BASE}/api/postmark/bounce`, {
    headers: { Authorization: WEBHOOK_AUTH },
    data: {
      RecordType: "Bounce",
      Type: "HardBounce",
      TypeCode: 1,
      Name: "Hard bounce",
      Description: "The server was unable to deliver your message (ex: unknown user, mailbox not found).",
      Email: address,
      BouncedAt: "2026-10-16T12:00:00Z",
      Inactive: true,
      CanActivate: true,
    },
  });
  expect(await bounce.json()).toEqual({ recorded: true });
}

/** The ID of the politician named `name` in the flow's database. */
const politicianId = (database: string, name: string) =>
  runSql(database, `SELECT id FROM notable_people WHERE name = '${name}'`)[0];

test("No permissions", async ({ page, request, flowDatabase }) => {
  story(
    "Supporters have registered for events, joined as members and written to their MP, and one supporter's address has bounced. A staff member with no permissions logs in.",
  );
  await syncPoliticians(request, BASE);
  await importLuma(request, BASE);
  await importMembers(request, BASE);
  const sender = madeUpAddress("Jane Smith", 31);
  await writeLetter(page, sender);
  await postBounce(request, sender);
  // Everyone the flow's database knows of, by name and by every address.
  const secrets = runSql(
    flowDatabase,
    "SELECT name FROM supporter_identity WHERE name <> '' UNION SELECT email FROM supporter_identity",
  );
  expect(secrets).toContain(sender);
  expect(secrets).toContain("Jane Fixture");

  await logIn(page, flowDatabase);
  await importEmails(page);
  await page.goto(`${BASE}/staff`);
  await frame(page, "The dashboard");
  story("No staff page they can open shows any supporter's name or email address.");
  const testyId = politicianId(flowDatabase, testy.name);
  const letterId = runSql(flowDatabase, "SELECT id FROM letters")[0];
  const supporterId = runSql(flowDatabase, "SELECT id FROM supporters ORDER BY id")[0];
  // One of PauseAI's letters, which Import emails copied, at its page under its mailing.
  const [pauseaiLetter] = runSql(
    flowDatabase,
    "SELECT '/staff/mailings/' || mailing_id || '/letters/' || id FROM letters_from_pauseai ORDER BY id LIMIT 1",
  );
  // A one-off email Jane sent her MP, and mail matching nothing: their names and addresses stay hidden too.
  const [thread] = runSql(
    flowDatabase,
    `INSERT INTO one_off_threads (subject, someone_else, latest_at) VALUES ('${sender}', true, now()) RETURNING id`,
  );
  runSql(
    flowDatabase,
    `INSERT INTO one_off_thread_people (thread_id, notable_person_id) VALUES (${thread}, ${testyId});
     INSERT INTO one_off_messages (thread_id, account, gmail_message_id, gmail_thread_id, from_address, from_name, addresses, subject, at, from_us, blob_key, size)
     VALUES (${thread}, 'policy@pauseai.uk', 'leak-1', 't', '${sender}', 'Jane Smith', ARRAY['${sender}'], '${sender}', now(), false, 'fixture/one-off-volunteer.eml.gz', 1);
     INSERT INTO import_runs (job, started_by, status, result) VALUES ('import-old-letters', 'x', 'ok',
       '{"dryRun": false, "finished": true, "read": 1, "left": 0, "replies": 0, "autoReplies": 0, "oneOffs": 0, "formTexts": 0, "postmarkTexts": 0, "joined": {}, "added": {}, "notJoined": {}, "unreadable": [], "unmatched": [{"from": "${sender}", "subject": "x"}]}');`,
  );
  // The route list's examples of letters and asks are the fixture database's.
  const routes = [
    ...ROUTES.filter(
      (route) =>
        route.startsWith("/staff") &&
        !route.startsWith("/staff/login") &&
        !route.includes("/letters/1") &&
        !/^\/staff\/(asks\/|mailings\/\d+\/letters|one-off\/\d)/.test(route),
    ),
    "/staff/asks/frontier-ai-letter",
    "/staff/asks/frontier-ai-letter/edit",
    `/staff/one-off/${thread}`,
    pauseaiLetter,
    ...IMPORT_JOBS.map(importPath),
    `/staff/politicians/${testyId}`,
    `/staff/letters/${letterId}`,
    `/staff/letters/supporter/${supporterId}`,
    `/staff/supporters/${supporterId}`,
    `/staff/supporters/${supporterId}/erase`,
  ];
  for (const route of routes) {
    // The page as HTML, and as the RSC payload a client-side navigation fetches.
    for (const headers of [{}, { RSC: "1" }] as Record<string, string>[]) {
      const res = await page.request.get(`${BASE}${route}`, { headers });
      expect(res.status(), route).toBe(200);
      const body = await res.text();
      for (const secret of secrets) expect(body, `${route} ${JSON.stringify(headers)}`).not.toContain(secret);
    }
  }

  story("The MP's page lists the letter written to them, without who wrote it.");
  await page.goto(`${BASE}/staff/politicians/${testyId}`);
  await expect(page.getByText(staffCopy.politician.history.unsignedLetter, { exact: false })).toBeVisible();
  await frame(page, "The MP's page");
});

test("Blocked emails without Supporters", async ({ page, request, flowDatabase }) => {
  story(
    "Jane writes to an MP whose address bounces her letter. Staff without the Supporters permission can't open Letters to MPs or Supporters' blocked emails.",
  );
  await syncPoliticians(request, BASE);
  const bouncy = TEST_MPS.find((mp) => mp.postcode === "ZZ99ZH")!;
  await fakeTurnstile(page);
  await lookUpTestMp(page, BASE, bouncy);
  await fillLetter(page, madeUpAddress("Jane Smith", 32));
  await sendLetter(page, bouncy);
  const messageId = runSql(flowDatabase, "SELECT message_id FROM email_sends WHERE purpose = 'letter'")[0];
  const bounce = await request.post(`${BASE}/api/postmark/bounce`, {
    headers: { Authorization: WEBHOOK_AUTH },
    data: {
      RecordType: "Bounce",
      MessageID: messageId,
      Type: "HardBounce",
      TypeCode: 1,
      Name: "Hard bounce",
      Description: "The server was unable to deliver your message (ex: unknown user, mailbox not found).",
      Email: "no-such-mailbox@pauseai.uk",
      BouncedAt: "2026-10-16T12:00:00Z",
      Inactive: true,
      CanActivate: true,
    },
  });
  expect(await bounce.json()).toEqual({ recorded: true });

  await logIn(page, flowDatabase);
  for (const closed of ["/staff/campaigns", "/staff/supporters/blocked-emails"]) {
    await page.goto(`${BASE}${closed}`);
    await expect(page).toHaveURL(`${BASE}/staff`);
  }
  story("Politicians' blocked emails names the letter that bounced, but doesn't link to it.");
  await page.goto(`${BASE}/staff/politicians/blocked-emails`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(staffCopy.emails.titles.mps);
  const blocked = page.getByRole("table").first().getByRole("row").filter({ hasText: "no-such-mailbox@pauseai.uk" });
  await expect(blocked.getByText(`${staffCopy.emails.letterTo} ${bouncy.name}`)).toBeVisible();
  await expect(page.locator('a[href^="/staff/letters"]')).toHaveCount(0);
  await frame(page, "Politicians' blocked emails");

  story("Given the Supporters permission, they can follow it to the letter.");
  // With supporters, the same page links to the letter.
  addStaffAccount(flowDatabase, staffEmail(), ["supporters"]);
  await page.reload();
  await blocked.getByRole("link", { name: `${staffCopy.emails.letterTo} ${bouncy.name}` }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    staffCopy.letters.oneTitle("Jane Smith", bouncy.name),
  );
  await frame(page, "Jane's letter");
});

test("Unblocking a supporter's address", async ({ page, request, flowDatabase }) => {
  story(
    "An email to Jane Fixture bounces, so her address is blocked. It's a supporter's, so Politicians' blocked emails has nothing.",
  );
  await syncPoliticians(request, BASE);
  await importLuma(request, BASE);
  await postBounce(request, "jane.fixture@example.com");
  await logIn(page, flowDatabase, ["supporters"]);

  await page.goto(`${BASE}/staff/politicians/blocked-emails`);
  await expect(page.getByText(staffCopy.emails.noBlocks)).toBeVisible();
  await frame(page, "Politicians' blocked emails");

  story("Supporters' blocked emails lists her address.");
  await page.goto(`${BASE}/staff/supporters/blocked-emails`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(staffCopy.emails.titles.supporters);
  const row = page.getByRole("table").first().getByRole("row").filter({ hasText: "jane.fixture@example.com" });
  await expect(row).toContainText(staffCopy.emails.kinds.hard);
  await frame(page, "Supporters' blocked emails");

  story("Staff unblock it, with a note.");
  await row.getByLabel(staffCopy.emails.note).fill("She gave us a new one");
  await row.getByRole("button", { name: staffCopy.emails.unblock }).click();
  await expect(page.getByText(staffCopy.emails.noBlocks)).toBeVisible();
  await frame(page, "Supporters' blocked emails, empty");
});

/** Logs `email` in in a browser of its own, on the flow's database, and returns its page. */
async function otherBrowser(browser: Browser, database: string, email: string): Promise<Page> {
  const context = await browser.newContext({ storageState: flowStorageState(database) });
  const page = await context.newPage();
  await logInAsStaff(page, BASE, email);
  return page;
}

test("Logging out everywhere", async ({ page, browser, flowDatabase }) => {
  story("A staff member is logged in on two browsers. Their address, under Your account, leads to their own page.");
  const other = await otherBrowser(browser, flowDatabase, staffEmail());
  await logIn(page, flowDatabase);
  // Your address in the sidebar leads to your own page (on a phone, inside the bar's menu).
  const link = page.locator('nav a[href="/staff/me"]').filter({ visible: true });
  if ((await link.count()) === 0) await page.locator("summary").click();
  await expect(link).toBeVisible();
  await frame(page, "The dashboard");

  story("Their page lists where they're logged in, and marks this browser.");
  await link.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(staffCopy.me.title);
  await expect(page.getByRole("row")).toHaveCount(3);
  await expect(page.getByRole("row").filter({ hasText: staffCopy.sessions.thisBrowser })).toHaveCount(1);
  await frame(page, "Where you're logged in");

  story("Log out of all of them logs the other browser out too.");
  await page.getByRole("button", { name: staffCopy.sessions.logOutEverywhere }).click();
  await expect(page).toHaveURL(`${BASE}/staff/login`);
  await other.goto(`${BASE}/staff`);
  await expect(other).toHaveURL(`${BASE}/staff/login`);
  await frame(other, "The other browser");
  await other.context().close();
});

test("Logging a colleague out", async ({ page, browser, flowDatabase }, testInfo) => {
  story(
    "An admin opens the accounts page. It shows how each account was added, when it last logged in, and its sessions. Their own row warns that ending its sessions logs them out.",
  );
  const colleague = `colleague-${testInfo.testId.replace(/\W/g, "").slice(-8)}@pauseai.uk`;
  const theirs = await otherBrowser(browser, flowDatabase, colleague);
  await logIn(page, flowDatabase, ["admin"]);
  await page.goto(`${BASE}/staff/accounts`);
  const row = page.getByRole("row").filter({ hasText: colleague });
  await expect(row).toContainText(staffCopy.accounts.addedByLogin);
  // The seeded admin has never logged in; this admin's own row warns that ending its sessions ends theirs.
  const seeded = page
    .getByRole("row")
    .filter({ has: page.getByRole("cell", { name: "admin@pauseai.uk", exact: true }) });
  await expect(seeded).toContainText(staffCopy.accounts.never);
  await expect(page.getByRole("row").filter({ hasText: staffEmail() })).toContainText(staffCopy.accounts.endMySessions);
  await frame(page, "The accounts page");

  story("They end all of a colleague's sessions, and the colleague is logged out.");
  await row.getByRole("button", { name: staffCopy.accounts.endSessions }).click();
  await expect(row.getByRole("button", { name: staffCopy.accounts.endSessions })).toHaveCount(0);
  await expect(row.getByRole("cell").nth(5)).toHaveText("0");
  await frame(page, "The accounts page, the colleague logged out");
  story("The audit log says who ended whose sessions.");
  await theirs.goto(`${BASE}/staff`);
  await expect(theirs).toHaveURL(`${BASE}/staff/login`);

  await page.goto(`${BASE}/staff/audit-log`);
  await expect(page.getByRole("cell", { name: "end staff sessions" })).toBeVisible();
  await frame(page, "The audit log");
  await theirs.context().close();
});
