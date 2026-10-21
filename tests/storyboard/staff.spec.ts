import type { APIRequestContext, Page } from "@playwright/test";
import { campaigns, copy } from "@/lib/content/email-your-mp";
import { jobTitles, staffCopy } from "@/lib/content/staff-interface";
import type { ImportJob } from "@/lib/import-runs";
import { TEST_MPS } from "@/lib/test-mps";
import { runSql } from "@/scripts/fresh-database.mjs";
import { ROUTES } from "../routes";
import {
  askForLoginLink,
  fakeTurnstile,
  fillLetter,
  logInAsStaff,
  loginLinkFor,
  newestEmail,
  lookUpTestMp,
  openLookup,
  newestEmailTo,
  sendLetter,
  syncMps,
  WEBHOOK_AUTH,
} from "../steps";
import { BASE, emailFrame, expect, flowStorageState, frame, test } from "./fixtures";

// The staff interface, each flow on its own database. Staff log in with the
// link emailed to them, taken from the build's outbox (logInAsStaff in
// tests/steps.ts): there's no login bypass.

const STAFF_PAGES = ROUTES.filter((route) => route.startsWith("/staff") && !route.startsWith("/staff/login"));
const [pm] = campaigns;

/** This flow's own staff address: flows run alongside each other, and share the outbox. Short, as real ones are. */
const staffEmail = () => `staff-${test.info().testId.replace(/\W/g, "").slice(-8)}@pauseai.uk`;

/** Logs in as a staff member, with the link emailed to them. */
const logIn = (page: Page, email = staffEmail()) => logInAsStaff(page, BASE, email);

/** Gives this flow's staff member the admin permission, straight into its database, as an admin would on /staff/permissions. */
const makeAdmin = (database: string, email = staffEmail()) =>
  runSql(
    database,
    `INSERT INTO staff_permissions (email, permissions, granted_by) VALUES ('${email}', '{admin}', 'admin@pauseai.uk')`,
  );

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
  await emailFrame(page, newestEmailTo(email)!, "the login link, emailed");

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
  await expect(page).toHaveURL(`${BASE}/staff`);
  // Who's logged in is in the header (behind the menu on a phone).
  await expect(page.getByText(email).first()).toBeAttached();

  // And it only works once.
  await page.context().clearCookies({ name: "staff_session" });
  await page.goto(link);
  await expect(page).toHaveURL(/\/staff\/login\?failed=1$/);
  await expect(page.getByText(staffCopy.login.failed)).toBeVisible();
  await frame(page, "the link opened a second time");
});

test("staff log in, set a status that shows on /campaigns, and log out", async ({ page, request, flowDatabase }) => {
  await syncMps(request, BASE);
  makeAdmin(flowDatabase);
  await logIn(page);
  // Logging in lands on the home page: the groups of pages, and this admin's permission named.
  await expect(page).toHaveURL(`${BASE}/staff`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(staffCopy.home.title);
  await expect(page.getByText(staffEmail()).first()).toBeAttached();
  await expect(page.getByText(staffCopy.home.permissions(staffCopy.permissions.names.admin))).toBeVisible();
  await frame(page, "the staff home, just logged in as an admin");

  await page.getByRole("link", { name: staffCopy.nav.politicians }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(staffCopy.politicians.title);
  await expect(page.getByRole("link", { name: "Testy McTestface MP" })).toBeVisible();
  await frame(page, "the politicians list");

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

  await page.goto(`${BASE}/staff/import-data`);
  await frame(page, "the import page");

  // The fixture ControlAI letter is signed by Polly Placeholder MP, so the bill's column says so.
  await page.getByRole("button", { name: staffCopy.controlAi.importNow }).click();
  await expect(page.getByText(/6 names/)).toBeVisible();
  await frame(page, "ControlAI's letter imported");
  await page.goto(`${BASE}/staff/politicians`);
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

test("the Luma import copies the calendar's events, guests and contacts, and finds nothing new the second time", async ({
  page,
}) => {
  await logIn(page);
  await page.goto(`${BASE}/staff/import-data`);
  await page.getByRole("button", { name: staffCopy.luma.importNow }).click();
  // The fixture calendar: nine public events and a private one, five guests each over two pages, three contacts.
  const first = { events: 9, eventsSynced: 9, eventsLeft: 0, guestsChanged: 45, people: 5, contacts: 3, requests: 21 };
  await expect(page.getByText(staffCopy.luma.result(first))).toBeVisible();
  await page.getByRole("heading", { name: staffCopy.luma.title }).scrollIntoViewIfNeeded();
  await frame(page, "the Luma import's first run: every event, guest and contact copied");

  // Within the hour, nothing is due again: one page of events and one of contacts, both unchanged.
  await page.getByRole("button", { name: staffCopy.luma.importNow }).click();
  const again = { events: 0, eventsSynced: 0, eventsLeft: 0, guestsChanged: 0, people: 0, contacts: 0, requests: 2 };
  await expect(page.getByText(staffCopy.luma.result(again))).toBeVisible();
  await expect(page.getByText(staffCopy.runs.status.unchanged)).toBeVisible();
  await page.getByRole("heading", { name: staffCopy.luma.title }).scrollIntoViewIfNeeded();
  await frame(page, "run again: nothing new");
});

test("a politician's own page", async ({ page, request }) => {
  await syncMps(request, BASE);
  await logIn(page);
  await page.goto(`${BASE}/staff/politicians`);
  await page.getByRole("link", { name: "Testy McTestface MP" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Testy McTestface MP");
  await expect(page.getByRole("heading", { name: staffCopy.politician.detailsTitle })).toBeVisible();
  await frame(page, "the test MP's page");
});

test("the import history lists every run, and filters to one job", async ({ page, request }) => {
  await syncMps(request, BASE);
  await logIn(page);
  await page.goto(`${BASE}/staff/import-data`);
  await page.getByRole("button", { name: staffCopy.check.checkNow }).click();
  await expect(page.getByRole("row").filter({ hasText: "Cities of London and Westminster" })).toBeVisible();

  // Each run in the history starts with its job's title, unlike the filter's options.
  const runs = (job: ImportJob) => page.getByText(`${jobTitles[job]} ·`);
  await page.goto(`${BASE}/staff/import-history`);
  await expect(runs("sync-mps")).toBeVisible();
  await expect(runs("check-mps")).toBeVisible();
  await frame(page, "the import history: the MP import, then the check");

  await page.getByLabel(staffCopy.history.job).selectOption("sync-mps");
  await page.getByRole("button", { name: staffCopy.history.filter, exact: true }).click();
  await expect(page).toHaveURL(`${BASE}/staff/import-history?job=sync-mps`);
  await expect(runs("sync-mps")).toBeVisible();
  await expect(runs("check-mps")).toHaveCount(0);
  await frame(page, "filtered to the MP import");
});

/** The shared inbox in a fixture build (tests/fixture-env.mjs), where staff alerts go. */
const STAFF_INBOX = "replies@example.org";
/** Bouncy McTestface MP, whose address doesn't exist. */
const bouncy = TEST_MPS.find((mp) => mp.postcode === "ZZ99ZH")!;
const BOUNCY_ADDRESS = "no-such-mailbox@pauseai.uk";

/** Postmark's bounce webhook, as it posts one for a hard bounce of `messageId`, or of an email we can't place. */
async function postBounce(request: APIRequestContext, messageId?: string) {
  const bounce = await request.post(`${BASE}/api/postmark/bounce`, {
    headers: { Authorization: WEBHOOK_AUTH },
    data: {
      RecordType: "Bounce",
      MessageID: messageId,
      Type: "HardBounce",
      TypeCode: 1,
      Name: "Hard bounce",
      Description: "The server was unable to deliver your message (ex: unknown user, mailbox not found).",
      Email: BOUNCY_ADDRESS,
      BouncedAt: "2026-10-16T12:00:00Z",
      Inactive: true,
      CanActivate: true,
    },
  });
  expect(await bounce.json()).toEqual({ recorded: true });
}

/** Writes to `mp` as `sender`, then, logged in, reads the letter's Postmark MessageID from the letters list. */
async function sentLetterId(page: Page, sender: string, mp = TEST_MPS[0]): Promise<string> {
  await fakeTurnstile(page);
  await lookUpTestMp(page, BASE, mp);
  await fillLetter(page, sender);
  await sendLetter(page, mp);
  await page.goto(`${BASE}/staff/letters`);
  if (page.url().endsWith("/staff/login")) await logIn(page);
  await page.goto(`${BASE}/staff/letters`);
  const row = page.getByRole("row").filter({ hasText: sender });
  await expect(row).toContainText(staffCopy.letters.status.sent);
  return (await row.locator("code").first().textContent())!.match(/"messageId":"([\w-]+)"/)![1];
}

test("letters are listed, sent and bounced, and can be filtered by status", async ({ page, request }, testInfo) => {
  const jane = `jane+${testInfo.testId}@example.com`;
  const sam = `sam+${testInfo.testId}@example.com`;
  await sentLetterId(page, jane);
  await postBounce(request, await sentLetterId(page, sam, bouncy));

  await page.reload();
  const janes = page.getByRole("row").filter({ hasText: jane });
  const sams = page.getByRole("row").filter({ hasText: sam });
  await expect(janes.locator("td").nth(5)).toHaveText(staffCopy.letters.status.sent);
  await expect(sams.locator("td").nth(5)).toHaveText(staffCopy.letters.status.bounced);
  await expect(sams).toContainText("HardBounce");
  await frame(page, "the letters list: one sent, one bounced, with Postmark's reason in its history");

  await page.getByLabel(staffCopy.letters.columns.status).selectOption("bounced");
  await page.getByRole("button", { name: staffCopy.letters.filter }).click();
  await expect(page).toHaveURL(`${BASE}/staff/letters?status=bounced`);
  await expect(sams).toBeVisible();
  await expect(janes).toHaveCount(0);
  await frame(page, "filtered to the bounced letter");
});

test("a letter that bounces: staff are emailed, and the address is blocked", async ({ page, request }, testInfo) => {
  const sender = `jane+${testInfo.testId}@example.com`;
  const messageId = await sentLetterId(page, sender, bouncy);
  const sent = newestEmail((email) => email.ReplyTo?.includes(sender) ?? false);
  expect(sent?.To).toBe(`"Bouncy McTestface MP" <${BOUNCY_ADDRESS}>`);
  await postBounce(request, messageId);

  const alert = newestEmail(
    (email) => email.To === STAFF_INBOX && email.Subject === staffCopy.alert.subject(bouncy.name),
  );
  expect(alert?.TextBody).toContain(`${BASE}/staff/blocked-emails`);
  await emailFrame(page, alert!, "the email staff get about it");

  await page.goto(`${BASE}/staff/blocked-emails`);
  // The blocked addresses, above the recent problems.
  const blocked = page.getByRole("table").first().getByRole("row").filter({ hasText: BOUNCY_ADDRESS });
  await expect(blocked.getByRole("link", { name: bouncy.name })).toBeVisible();
  await expect(blocked).toContainText(staffCopy.emails.kinds.hard);
  await frame(page, "the address, blocked, with the letter that found it out");
});

test("an MP whose address bounced can't be written to until staff unblock it", async ({
  page,
  request,
  flowDatabase,
}) => {
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

  makeAdmin(flowDatabase);
  await logIn(page);
  await page.goto(`${BASE}/staff/politicians`);
  const bouncysRow = page.getByRole("row").filter({ hasText: bouncy.name });
  await expect(bouncysRow).toContainText(staffCopy.politicians.emailBlocked);
  await frame(page, "the politicians list marks their address as blocked");

  await page.getByLabel(staffCopy.fields.email).selectOption("blocked");
  await page.getByRole("button", { name: staffCopy.politicians.searchButton }).click();
  await expect(page).toHaveURL(/[?&]email=blocked/);
  await expect(page.getByRole("link", { name: "Testy McTestface MP" })).toHaveCount(0);
  await expect(page.getByRole("row").filter({ hasText: bouncy.name })).toContainText(
    staffCopy.politicians.emailBlocked,
  );
  await frame(page, "the politicians whose address is blocked");

  await page.getByRole("link", { name: bouncy.name }).click();
  await expect(page.getByRole("heading", { level: 1, name: bouncy.name })).toBeVisible();
  await frame(page, "their page says why, with a way to unblock it");

  await page.getByLabel(staffCopy.emails.note).fill("Checked with their office");
  await page.getByRole("button", { name: staffCopy.emails.unblock }).click();
  await expect(page.getByLabel(staffCopy.emails.note)).not.toBeVisible();
  await frame(page, "unblocked");

  await page.goto(`${BASE}/staff/audit-log`);
  await expect(page.getByText("Checked with their office")).toBeVisible();
  await frame(page, "the audit log: blocked by Postmark, unblocked by staff");

  await lookUpTestMp(page, BASE, bouncy);
  await expect(page.getByLabel(copy.form.emailLabel)).toBeVisible();
  await frame(page, "the form writes to them again");
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

  makeAdmin(flowDatabase);
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

test("an admin grants a permission, which the staff member then has; without it, the admin pages are closed", async ({
  page,
  flowDatabase,
}, testInfo) => {
  const colleague = `colleague-${testInfo.testId.replace(/\W/g, "").slice(-8)}@pauseai.uk`;
  // Without a permission: the ordinary groups, whom to ask, and the admin pages send you home.
  await logIn(page);
  await expect(page.getByText(staffCopy.home.none, { exact: false })).toBeVisible();
  await expect(page.getByText(staffCopy.home.ask("admin@pauseai.uk"), { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: staffCopy.nav.permissions })).toHaveCount(0);
  await frame(page, "the staff home for someone with no permissions");
  await page.goto(`${BASE}/staff/permissions`);
  await expect(page).toHaveURL(`${BASE}/staff`);
  await page.goto(`${BASE}/staff/audit-log`);
  await expect(page).toHaveURL(`${BASE}/staff`);

  // As an admin: the permissions page, where a colleague is given the supporters permission.
  makeAdmin(flowDatabase);
  await page.goto(`${BASE}/staff/permissions`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(staffCopy.permissions.title);
  await frame(page, "the permissions page: the built-in admin and this admin");
  const add = page.getByRole("form", { name: staffCopy.permissions.addTitle });
  await add.getByRole("textbox", { name: staffCopy.permissions.emailLabel }).fill(colleague);
  await add.getByRole("checkbox", { name: staffCopy.permissions.names.supporters }).check();
  await add.getByRole("button", { name: staffCopy.permissions.save }).click();
  const row = page.getByRole("row").filter({ hasText: colleague });
  await expect(row.getByRole("checkbox", { name: staffCopy.permissions.names.supporters })).toBeChecked();
  await expect(row).toContainText(staffEmail());
  await frame(page, "the colleague added, with the supporters permission");

  // Revoked again: their row goes.
  await row.getByRole("checkbox", { name: staffCopy.permissions.names.supporters }).uncheck();
  await row.getByRole("button", { name: staffCopy.permissions.save }).click();
  await expect(page.getByRole("row").filter({ hasText: colleague })).toHaveCount(0);
  await frame(page, "revoked: the colleague's row gone");

  await page.goto(`${BASE}/staff/audit-log`);
  await expect(page.getByRole("cell", { name: "set staff permissions" }).first()).toBeVisible();
  await frame(page, "the audit log: the grant and the revocation");
});

test("staff pages are kept out of search and the sitemap", async ({ page, request }) => {
  await page.goto(`${BASE}/staff/login`);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  expect(await (await request.get(`${BASE}/sitemap.xml`)).text()).not.toContain("/staff");
});
