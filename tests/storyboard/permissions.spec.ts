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
import { BASE, expect, flowStorageState, flowTag, frame, test } from "./fixtures";

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

test("No permissions: no page shows a supporter's name or email", async ({ page, request, flowDatabase }) => {
  await syncPoliticians(request, BASE);
  await importLuma(request, BASE);
  await importMembers(request, BASE);
  const sender = `jane+${flowTag()}@example.com`;
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
  await frame(page, "the staff home with no permissions: no Supporters section");
  const testyId = politicianId(flowDatabase, testy.name);
  const letterId = runSql(flowDatabase, "SELECT id FROM letters")[0];
  const supporterId = runSql(flowDatabase, "SELECT id FROM supporters ORDER BY id")[0];
  // One of PauseAI's letters, which the politicians sync copied, at its page under its mailing.
  const [pauseaiLetter] = runSql(
    flowDatabase,
    "SELECT '/staff/mailings/' || mailing_id || '/letters/' || id FROM letters_from_pauseai ORDER BY id LIMIT 1",
  );
  // The route list's examples of letters and asks are the fixture database's.
  const routes = [
    ...ROUTES.filter(
      (route) =>
        route.startsWith("/staff") &&
        !route.startsWith("/staff/login") &&
        !route.includes("/letters/1") &&
        !/^\/staff\/(asks\/|mailings\/\d+\/letters)/.test(route),
    ),
    "/staff/asks/frontier-ai-letter",
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

  await page.goto(`${BASE}/staff/politicians/${testyId}`);
  await expect(page.getByText(staffCopy.politician.history.unsignedLetter, { exact: false })).toBeVisible();
  await frame(page, "an MP's page with no permissions: the letter, without who wrote it");
});

test("Without Supporters: letters and supporters' blocked emails are closed", async ({
  page,
  request,
  flowDatabase,
}) => {
  await syncPoliticians(request, BASE);
  const bouncy = TEST_MPS.find((mp) => mp.postcode === "ZZ99ZH")!;
  await fakeTurnstile(page);
  await lookUpTestMp(page, BASE, bouncy);
  await fillLetter(page, `jane+${flowTag()}@example.com`);
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
  for (const closed of ["/staff/letters", "/staff/supporters/blocked-emails"]) {
    await page.goto(`${BASE}${closed}`);
    await expect(page).toHaveURL(`${BASE}/staff`);
  }
  await page.goto(`${BASE}/staff/politicians/blocked-emails`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(staffCopy.emails.titles.mps);
  const blocked = page.getByRole("table").first().getByRole("row").filter({ hasText: "no-such-mailbox@pauseai.uk" });
  await expect(blocked.getByText(`${staffCopy.emails.letterTo} ${bouncy.name}`)).toBeVisible();
  await expect(page.locator('a[href^="/staff/letters"]')).toHaveCount(0);
  await frame(page, "Politicians' blocked emails without supporters: the letter named, not linked");

  // With supporters, the same page links to the letter.
  addStaffAccount(flowDatabase, staffEmail(), ["supporters"]);
  await page.reload();
  await blocked.getByRole("link", { name: `${staffCopy.emails.letterTo} ${bouncy.name}` }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    staffCopy.letters.oneTitle("Jane Smith", bouncy.name),
  );
  await frame(page, "with supporters, the letter it names opens");
});

test("Unblock a supporter's bounced address", async ({ page, request, flowDatabase }) => {
  await syncPoliticians(request, BASE);
  await importLuma(request, BASE);
  await postBounce(request, "jane.fixture@example.com");
  await logIn(page, flowDatabase, ["supporters"]);

  await page.goto(`${BASE}/staff/politicians/blocked-emails`);
  await expect(page.getByText(staffCopy.emails.noBlocks)).toBeVisible();
  await frame(page, "Politicians' blocked emails: nothing, as no MP's address bounced");

  await page.goto(`${BASE}/staff/supporters/blocked-emails`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(staffCopy.emails.titles.supporters);
  const row = page.getByRole("table").first().getByRole("row").filter({ hasText: "jane.fixture@example.com" });
  await expect(row).toContainText(staffCopy.emails.kinds.hard);
  await frame(page, "Supporters' blocked emails: Jane's address, bounced");

  await row.getByLabel(staffCopy.emails.note).fill("She gave us a new one");
  await row.getByRole("button", { name: staffCopy.emails.unblock }).click();
  await expect(page.getByText(staffCopy.emails.noBlocks)).toBeVisible();
  await frame(page, "unblocked");
});

/** Logs `email` in in a browser of its own, on the flow's database, and returns its page. */
async function otherBrowser(browser: Browser, database: string, email: string): Promise<Page> {
  const context = await browser.newContext({ storageState: flowStorageState(database) });
  const page = await context.newPage();
  await logInAsStaff(page, BASE, email);
  return page;
}

test("Logged in on two browsers: log out of both", async ({ page, browser, flowDatabase }) => {
  const other = await otherBrowser(browser, flowDatabase, staffEmail());
  await logIn(page, flowDatabase);
  // Your address in the sidebar leads to your own page (on a phone, inside the bar's menu).
  const link = page.locator('nav a[href="/staff/me"]').filter({ visible: true });
  if ((await link.count()) === 0) await page.locator("summary").click();
  await expect(link).toBeVisible();
  await frame(page, "the home: your address under Your account leads to where you're logged in");

  await link.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(staffCopy.me.title);
  await expect(page.getByRole("row")).toHaveCount(3);
  await expect(page.getByRole("row").filter({ hasText: staffCopy.sessions.thisBrowser })).toHaveCount(1);
  await frame(page, "your sessions: this browser's and the other one");

  await page.getByRole("button", { name: staffCopy.sessions.logOutEverywhere }).click();
  await expect(page).toHaveURL(`${BASE}/staff/login`);
  await other.goto(`${BASE}/staff`);
  await expect(other).toHaveURL(`${BASE}/staff/login`);
  await frame(other, "the other browser, logged out too");
  await other.context().close();
});

test("An admin logs a colleague out everywhere", async ({ page, browser, flowDatabase }, testInfo) => {
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
  await frame(page, "the accounts page: added by login, last login and seen, and sessions open");

  await row.getByRole("button", { name: staffCopy.accounts.endSessions }).click();
  await expect(row.getByRole("button", { name: staffCopy.accounts.endSessions })).toHaveCount(0);
  await expect(row.getByRole("cell").nth(5)).toHaveText("0");
  await frame(page, "the colleague logged out everywhere");
  await theirs.goto(`${BASE}/staff`);
  await expect(theirs).toHaveURL(`${BASE}/staff/login`);

  await page.goto(`${BASE}/staff/audit-log`);
  await expect(page.getByRole("cell", { name: "end staff sessions" })).toBeVisible();
  await frame(page, "the audit log: who ended whose sessions");
  await theirs.context().close();
});
