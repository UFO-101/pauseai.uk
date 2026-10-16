import type { Page } from "@playwright/test";
import { campaigns } from "@/lib/content/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import { runSql } from "@/scripts/fresh-database.mjs";
import { ROUTES } from "../routes";
import {
  askForLoginLink,
  fakeTurnstile,
  fillLetter,
  logInAsStaff,
  loginLinkFor,
  lookUpTestMp,
  sendLetter,
  syncMps,
  WEBHOOK_AUTH,
} from "../steps";
import { BASE, expect, flowStorageState, frame, test } from "./fixtures";

// The staff interface, each flow on its own database. Staff log in with the
// link emailed to them, taken from the build's outbox (logInAsStaff in
// tests/steps.ts): there's no login bypass.

const STAFF_PAGES = ROUTES.filter((route) => route.startsWith("/staff") && !route.startsWith("/staff/login"));
const [pm] = campaigns;

/** This flow's own staff address: flows run alongside each other, and share the outbox. Short, as real ones are. */
const staffEmail = () => `staff-${test.info().testId.replace(/\W/g, "").slice(-8)}@pauseai.uk`;

/** Logs in as a staff member, with the link emailed to them. */
const logIn = (page: Page, email = staffEmail()) => logInAsStaff(page, BASE, email);

test("every staff page, without a session, goes to the login page", async ({ request }) => {
  expect(STAFF_PAGES.length).toBeGreaterThan(4);
  for (const route of STAFF_PAGES) {
    const res = await request.get(`${BASE}${route}`, { maxRedirects: 0 });
    expect(res.status(), route).toBe(307);
    expect(res.headers().location, route).toMatch(/\/staff\/login$/);
  }
});

test("staff API routes and Server Actions, without a session, change nothing", async ({ request }) => {
  const logout = await request.post(`${BASE}/staff/api/logout`, { maxRedirects: 0 });
  expect(logout.status()).toBe(401);

  // A Server Action is a POST to the page, naming the action in a header.
  const action = await request.post(`${BASE}/staff/politicians`, {
    headers: { "Next-Action": "0000000000000000000000000000000000000000" },
    multipart: { politicianId: "1", campaign: pm.slug, signed: "1" },
    maxRedirects: 0,
  });
  expect(action.status()).toBe(307);
  expect(action.headers().location).toMatch(/\/staff\/login$/);

  // With a made-up cookie the proxy lets it through, and requireStaff() turns it away.
  const forged = await request.get(`${BASE}/staff`, { headers: { cookie: "staff_session=made-up" }, maxRedirects: 0 });
  expect(forged.status()).toBe(307);
});

test(
  "an address outside pauseai.uk gets no link, though the page doesn't say so",
  { tag: "@phone" },
  async ({ page }) => {
    await page.goto(`${BASE}/staff/login`);
    await frame(page, "the login page");
    expect(await logIn(page, "someone@gmail.com")).toBe(false);
    await frame(page, "check your inbox, for an address that gets nothing");
    expect(await logIn(page, "someone@pauseai.uk.evil.example")).toBe(false);
  },
);

test("a login link works once, and only in the browser that asked for it", async ({
  page,
  browser,
  request,
  flowDatabase,
}) => {
  const email = staffEmail();
  await askForLoginLink(page, BASE, email);
  const link = loginLinkFor(email)!;

  // Opened by a mail scanner, or in another browser, the link logs nobody in
  // and says why, and isn't used up.
  const scanned = await request.get(link);
  expect(scanned.url()).toBe(`${BASE}/staff/login?elsewhere=1`);
  const other = await browser.newContext({ storageState: flowStorageState(flowDatabase) });
  const otherPage = await other.newPage();
  await otherPage.goto(link);
  await expect(otherPage).toHaveURL(/\/staff\/login\?elsewhere=1$/);
  await expect(otherPage.getByText(staffCopy.login.elsewhere)).toBeVisible();
  await frame(otherPage, "the link opened in another browser");
  await other.close();

  // Opened in the browser that asked, it logs in straight away.
  await page.goto(link);
  await expect(page).toHaveURL(`${BASE}/staff/politicians`);
  // Who's logged in is in the header (behind the menu on a phone).
  await expect(page.getByText(email).first()).toBeAttached();

  // And it only works once.
  await page.context().clearCookies({ name: "staff_session" });
  await page.goto(link);
  await expect(page).toHaveURL(/\/staff\/login\?failed=1$/);
  await expect(page.getByText(staffCopy.login.failed)).toBeVisible();
  await frame(page, "the link opened a second time");
});

test("staff log in, set a status that shows on /campaigns, and log out", async ({ page, request }) => {
  await syncMps(request, BASE);
  await logIn(page);
  // Plain /staff opens the politicians list, for now.
  await expect(page).toHaveURL(`${BASE}/staff/politicians`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(staffCopy.politicians.title);
  await expect(page.getByText(staffEmail()).first()).toBeAttached();
  await expect(page.getByRole("link", { name: "Testy McTestface MP" })).toBeVisible();
  await frame(page, "the politicians list, just logged in");

  const form = page.getByRole("form", { name: `${pm.title}: Polly Placeholder` });
  await form.getByRole("button", { name: staffCopy.politicians.markSigned }).click();
  await expect(form.getByText(new RegExp(`^${staffCopy.statuses.signed}`))).toBeVisible();
  await frame(page, "Polly Placeholder marked as signed");

  const signed = await (await request.get(`${BASE}/api/signatories`)).json();
  expect(signed).toContainEqual(expect.objectContaining({ name: "Polly Placeholder", house: "commons" }));
  await page.goto(`${BASE}/campaigns`);
  await expect(page.locator("#signatories").getByText("Polly Placeholder")).toBeVisible();
  await frame(page, "/campaigns lists the new signatory");

  await page.goto(`${BASE}/staff/audit-log`);
  await expect(page.getByRole("cell", { name: "set status" }).first()).toBeVisible();
  await frame(page, "the audit log");

  // The import page shows each job's newest run; the history page lists every run, the first sync among them.
  await page.goto(`${BASE}/staff/import-history?job=sync-mps`);
  await expect(page.getByText(staffCopy.runs.status.applied).first()).toBeVisible();
  await frame(page, "the import history, filtered to the MP sync");
  await page.goto(`${BASE}/staff/import-data`);
  await frame(page, "the import page");

  // The fixture ControlAI letter is signed by Polly Placeholder MP, so the bill's column says so.
  await page.getByRole("button", { name: staffCopy.controlAi.importNow }).click();
  await expect(page.getByText(/6 names/)).toBeVisible();
  await frame(page, "ControlAI's letter imported");
  await page.goto(`${BASE}/staff`);
  await expect(page.getByRole("row").filter({ hasText: "Polly Placeholder" })).toContainText(
    staffCopy.politicians.signedControlAi,
  );
  await frame(page, "the politicians list says who signed ControlAI's letter");

  // The fixture Airtable gives Polly Placeholder an email Parliament doesn't list.
  await page.goto(`${BASE}/staff/import-data`);
  await page.getByRole("button", { name: staffCopy.check.checkNow }).click();
  const blake = page.getByRole("row").filter({ hasText: "Cities of London and Westminster" });
  await expect(blake).toContainText(staffCopy.check.kinds.email);
  await expect(blake).toContainText("polly.placeholder.mp@parliament.uk");
  await frame(page, "the MP check found a differing email");

  // On a phone the header's links and Log out are behind its menu.
  const logout = page.getByRole("button", { name: staffCopy.nav.logout });
  if (!(await logout.first().isVisible())) {
    await page.locator("header details > summary").click();
    await frame(page, "the staff menu open");
  }
  await logout.filter({ visible: true }).click();
  await expect(page).toHaveURL(`${BASE}/staff/login`);
  await frame(page, "logged out");
  await page.goto(`${BASE}/staff`);
  await expect(page).toHaveURL(`${BASE}/staff/login`);
});

test("a politician's own page", async ({ page, request }) => {
  await syncMps(request, BASE);
  await logIn(page);
  await page.getByRole("link", { name: "Testy McTestface MP" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Testy McTestface MP");
  await expect(page.getByRole("heading", { name: staffCopy.politician.detailsTitle })).toBeVisible();
  await frame(page, "the test MP's page");
});

test("a letter someone sends is listed, and can be filtered by status", async ({ page }) => {
  await fakeTurnstile(page);
  await lookUpTestMp(page, BASE);
  await fillLetter(page, "jane@example.com");
  await sendLetter(page);

  await logIn(page);
  await page.goto(`${BASE}/staff/letters`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(staffCopy.letters.title);
  const row = page.getByRole("row").filter({ hasText: "Testy McTestface MP" });
  await expect(row).toContainText(staffCopy.letters.status.sent);
  await frame(page, "the letters list, with the one just sent");

  await page.getByLabel(staffCopy.letters.columns.status).selectOption("sent");
  await page.getByRole("button", { name: staffCopy.letters.filter }).click();
  await expect(page).toHaveURL(`${BASE}/staff/letters?status=sent`);
  await expect(row).toBeVisible();
  await frame(page, "filtered to sent letters");
});

test("a letter that bounces shows as bounced, with why, on the letters list", async ({ page, request }, testInfo) => {
  const sender = `jane+${testInfo.testId}@example.com`;
  await fakeTurnstile(page);
  await lookUpTestMp(page, BASE);
  await fillLetter(page, sender);
  await sendLetter(page);

  await logIn(page);
  await page.goto(`${BASE}/staff/letters`);
  const row = page.getByRole("row").filter({ hasText: sender });
  await expect(row).toContainText(staffCopy.letters.status.sent);
  // The letter's Postmark MessageID, from its "sent" event, as staff see it.
  const messageId = (await row.locator("code").first().textContent())!.match(/"messageId":"([\w-]+)"/)![1];

  // Postmark's bounce webhook, as it posts one for that message.
  const bounce = await request.post(`${BASE}/api/postmark/bounce`, {
    headers: { Authorization: WEBHOOK_AUTH },
    data: {
      RecordType: "Bounce",
      MessageID: messageId,
      Type: "HardBounce",
      TypeCode: 1,
      Name: "Hard bounce",
      Description: "The server was unable to deliver your message (ex: unknown user, mailbox not found).",
      Email: "test-mp@example.org",
      BouncedAt: "2026-10-16T12:00:00Z",
    },
  });
  expect(await bounce.json()).toEqual({ recorded: true });

  await page.reload();
  await expect(row.locator("td").nth(5)).toHaveText(staffCopy.letters.status.bounced);
  await expect(row).toContainText("HardBounce");
  await frame(page, "the letter, bounced, with Postmark's reason in its history");

  await page.getByLabel(staffCopy.letters.columns.status).selectOption("bounced");
  await page.getByRole("button", { name: staffCopy.letters.filter }).click();
  await expect(page).toHaveURL(`${BASE}/staff/letters?status=bounced`);
  await expect(row).toBeVisible();
  await frame(page, "filtered to bounced letters");
});

test("an MP import that would change too many is held, then discarded, and then applied", async ({
  page,
  request,
  flowDatabase,
}) => {
  await syncMps(request, BASE);
  // Twenty-one MPs Airtable no longer lists: the next import would remove
  // them all, more than it may without a person checking.
  runSql(
    flowDatabase,
    `INSERT INTO politicians (airtable_id, house, name, constituency)
     SELECT 'recGone' || n, 'commons', 'Gone McTestface ' || n || ' MP', 'Gone ' || n FROM generate_series(1, 21) n`,
  );
  const sitting = () =>
    Number(runSql(flowDatabase, "SELECT count(*) FROM politicians WHERE name LIKE 'Gone %' AND sitting")[0]);

  await logIn(page);
  await page.goto(`${BASE}/staff/import-data`);
  await page.getByRole("button", { name: staffCopy.syncs.syncNow }).click();
  await expect(page.getByRole("button", { name: staffCopy.syncs.apply })).toBeVisible();
  await expect(page.getByText(`${staffCopy.syncs.removed} 21`).first()).toBeVisible();
  await expect(page.getByText("Gone 1: Gone McTestface 1 MP")).toBeAttached();
  expect(sitting()).toBe(21);
  await frame(page, "the import held: 21 MPs would go");

  await page.getByRole("button", { name: staffCopy.syncs.discard }).click();
  await expect(page.getByRole("button", { name: staffCopy.syncs.apply })).toHaveCount(0);
  await expect(page.getByText(staffCopy.runs.status.discarded).first()).toBeVisible();
  expect(sitting()).toBe(21);
  await frame(page, "discarded: nobody changed");

  await page.getByRole("button", { name: staffCopy.syncs.syncNow }).click();
  await page.getByRole("button", { name: staffCopy.syncs.apply }).click();
  await expect(page.getByRole("button", { name: staffCopy.syncs.apply })).toHaveCount(0);
  await expect(page.getByText(staffCopy.runs.decidedBy(staffEmail())).first()).toBeVisible();
  expect(sitting()).toBe(0);
  await frame(page, "held again, then applied: the 21 are no longer sitting");

  await page.goto(`${BASE}/staff/audit-log`);
  await expect(page.getByRole("cell", { name: "apply held MP sync" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "discard held MP sync" })).toBeVisible();
  await frame(page, "the audit log: who discarded and who applied");
});

test("staff pages are kept out of search and the sitemap", async ({ page, request }) => {
  await page.goto(`${BASE}/staff/login`);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  expect(await (await request.get(`${BASE}/sitemap.xml`)).text()).not.toContain("/staff");
});
