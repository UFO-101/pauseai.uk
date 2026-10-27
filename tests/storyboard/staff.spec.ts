import type { APIRequestContext, Page } from "@playwright/test";
import { campaigns, copy } from "@/lib/content/email-your-mp";
import { jobTitles, staffCopy } from "@/lib/content/staff-interface";
import type { ImportJob } from "@/lib/import-runs";
import { staffDate } from "@/lib/staff-time";
import { TEST_MPS } from "@/lib/test-mps";
import { runSql } from "@/scripts/fresh-database.mjs";
import { FIXTURE_NOW } from "../fixture-env.mjs";
import { ROUTES } from "../routes";
import {
  addFilter,
  addStaffAccount,
  askForLoginLink,
  fakeTurnstile,
  fillLetter,
  logInAsStaff,
  loginLinkFor,
  lookUpTestMp,
  newestEmail,
  newestEmailTo,
  openLookup,
  sendLetter,
  syncPoliticians,
  WEBHOOK_AUTH,
} from "../steps";
import { BASE, emailFrame, expect, flowStorageState, frame, test } from "./fixtures";

// The staff interface, each flow on its own database. Staff log in with the
// link emailed to them, taken from the build's outbox (logInAsStaff in
// tests/steps.ts): there's no login bypass.

const STAFF_PAGES = ROUTES.filter((route) => route.startsWith("/staff") && !route.startsWith("/staff/login"));
/** The letter to the PM's ask, by its title in the asks table. */
const PM_LETTER = "Frontier AI letter to the Prime Minister";

/** This flow's own staff address: flows run alongside each other, and share the outbox. Short, as real ones are. */
const staffEmail = () => `staff-${test.info().testId.replace(/\W/g, "").slice(-8)}@pauseai.uk`;

/** Gives this flow's staff member an account, then logs them in with the link emailed to them. */
async function logIn(page: Page, database: string, permissions: string[] = []) {
  addStaffAccount(database, staffEmail(), permissions);
  return logInAsStaff(page, BASE, staffEmail());
}

test("the dev login signs in as a seeded account in one click, in a fixture build", async ({ page, flowDatabase }) => {
  addStaffAccount(flowDatabase, "jo@pauseai.uk", ["supporters"]);
  await page.goto(`${BASE}/staff/login`);
  const dev = page.getByRole("region", { name: staffCopy.devLogin.title });
  await expect(dev.getByRole("button", { name: "admin@pauseai.uk" })).toBeVisible();
  await frame(page, "the login page in a fixture build: the dev login under the card");
  await dev.getByRole("button", { name: "jo@pauseai.uk" }).click();
  await expect(page).toHaveURL(`${BASE}/staff`);
  await expect(page.getByText("jo@pauseai.uk").first()).toBeAttached();
  await frame(page, "signed in as jo, with the supporters permission");
});

test(
  "the sidebar folds to a rail of icons, each named on hover, and stays folded on the next page",
  { tag: "@desktop-only" },
  async ({ page, flowDatabase }) => {
    await logIn(page, flowDatabase, ["supporters", "admin"]);
    await page.goto(`${BASE}/staff/politicians`);
    const nav = page.getByRole("navigation", { name: staffCopy.nav.title });
    await expect(nav.getByRole("link", { name: staffCopy.nav.supporters })).toBeVisible();
    await frame(
      page,
      "the sidebar open: each page's icon beside its name, and a round fold button on its edge at its foot",
    );

    // Folding moves the icons sideways only: each stays at the height it was.
    const heights = () =>
      nav.locator("li svg, form svg").evaluateAll((icons) => icons.map((icon) => icon.getBoundingClientRect().top));
    const open = await heights();
    await nav.getByRole("button", { name: staffCopy.nav.fold }).click();
    await expect(nav.getByRole("button", { name: staffCopy.nav.unfold })).toBeVisible();
    await expect(nav.getByRole("heading", { name: staffCopy.nav.sections.admin })).toBeHidden();
    expect(await heights()).toEqual(open);
    await frame(page, "folded: a rail of icons, each where it was, the sections a rule apart, and the list wider");

    // Tabbed to, as the frame moves the mouse away: a hover shows the same.
    await nav.getByRole("link", { name: staffCopy.nav.home }).focus();
    await page.keyboard.press("Tab");
    await expect(nav.getByRole("link", { name: staffCopy.nav.supporters })).toBeFocused();
    await frame(page, "a page's name beside its icon, tabbed to or hovered over");

    await nav.getByRole("link", { name: staffCopy.nav.supporters }).click();
    await expect(page).toHaveURL(`${BASE}/staff/supporters`);
    await expect(nav.getByRole("button", { name: staffCopy.nav.unfold })).toBeVisible();
    await frame(page, "the next page, still folded");

    await nav.getByRole("button", { name: staffCopy.nav.unfold }).click();
    await expect(nav.getByRole("heading", { name: staffCopy.nav.sections.admin })).toBeVisible();
  },
);

test("every staff page, without a session, goes to the login page, to come back to once logged in", async ({
  request,
}) => {
  expect(STAFF_PAGES.length).toBeGreaterThan(4);
  for (const route of STAFF_PAGES) {
    const res = await request.get(`${BASE}${route}`, { maxRedirects: 0 });
    expect(res.status(), route).toBe(307);
    const back = route === "/staff" ? "" : `?next=${encodeURIComponent(route)}`;
    const location = new URL(res.headers().location, BASE);
    expect(location.pathname + location.search, route).toBe(`/staff/login${back}`);
  }
});

test("staff API routes and Server Actions, without a session, change nothing", async ({ request }) => {
  const logout = await request.post(`${BASE}/staff/api/logout`, { maxRedirects: 0 });
  expect(logout.status()).toBe(401);

  // A Server Action is a POST to the page, naming the action in a header.
  const action = await request.post(`${BASE}/staff/politicians`, {
    headers: { "Next-Action": "0000000000000000000000000000000000000000" },
    multipart: { politicianId: "1", ask: "frontier-ai-letter", status: "signed" },
    maxRedirects: 0,
  });
  expect(action.status()).toBe(307);
  expect(action.headers().location).toMatch(/\/staff\/login\?next=%2Fstaff%2Fpoliticians$/);

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
    expect(await logInAsStaff(page, BASE, "someone@gmail.com")).toBe(false);
    await frame(page, "check your inbox, for an address that gets nothing");
    expect(await logInAsStaff(page, BASE, "someone@pauseai.uk.evil.example")).toBe(false);
  },
);

test("a login link works once, and only in the browser that asked for it", async ({
  page,
  browser,
  request,
  flowDatabase,
}) => {
  const email = staffEmail();
  addStaffAccount(flowDatabase, email);
  await askForLoginLink(page, BASE, email, true);
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

  // Opened in the browser that asked, it logs in straight away, kept for 30 days as the box was ticked.
  await page.goto(link);
  await expect(page).toHaveURL(`${BASE}/staff`);
  // Who's logged in is in the header (behind the menu on a phone).
  await expect(page.getByText(email).first()).toBeAttached();
  const session = (await page.context().cookies()).find((c) => c.name === "staff_session")!;
  expect(session.expires).toBeGreaterThan(Date.now() / 1000 + 29 * 86_400);

  // And it only works once.
  await page.context().clearCookies({ name: "staff_session" });
  await page.goto(link);
  await expect(page).toHaveURL(/\/staff\/login\?failed=1$/);
  await expect(page.getByText(staffCopy.login.failed)).toBeVisible();
  await frame(page, "the link opened a second time");
});

test("staff log in, set a status that shows on /campaigns, and log out", async ({ page, request, flowDatabase }) => {
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase, ["admin"]);
  // Logging in lands on the home page: the dashboard, with this admin's permission under their address in the sidebar.
  await expect(page).toHaveURL(`${BASE}/staff`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(staffCopy.home.title);
  await expect(page.getByText(staffEmail()).first()).toBeAttached();
  await expect(page.getByRole("heading", { level: 2, name: staffCopy.home.dashboard.sections.mps })).toBeVisible();
  await frame(page, "the staff home, just logged in as an admin");

  // The pages are in the sidebar; on a phone, behind the bar's menu.
  const politicians = page.getByRole("link", { name: staffCopy.nav.politicians });
  if (!(await politicians.first().isVisible())) await page.locator("nav details > summary").click();
  await politicians.filter({ visible: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(staffCopy.politicians.title);
  await expect(page.getByRole("link", { name: "Testy McTestface MP" })).toBeVisible();
  await frame(page, "the politicians list");

  // Signed on their page, in the ask's row of the panel beside their details, with a note.
  await page.getByRole("link", { name: "Polly Placeholder" }).click();
  const card = page.getByRole("group", { name: PM_LETTER });
  await expect(card.getByText(staffCopy.statuses.none)).toBeVisible();
  await frame(page, "Polly Placeholder's page: the asks beside her details");
  await card.getByText(staffCopy.politician.edit, { exact: true }).click();
  await card.getByLabel(staffCopy.politician.note).fill("Told us at the march");
  await frame(page, "Edit opens the form, with a note of how we know");
  await card.getByRole("button", { name: staffCopy.politicians.markSigned }).click();
  await expect(card.locator("[class*=answer]")).toHaveText(new RegExp(`^${staffCopy.statuses.signed}`));
  await expect(card.getByText(/Told us at the march/)).toBeVisible();
  await frame(page, "Polly Placeholder marked as signed");
  await page.getByRole("link", { name: staffCopy.nav.politicians }).first().click();
  const pollyRow = page.getByRole("row").filter({ hasText: "Polly Placeholder" });
  await expect(pollyRow).toContainText(PM_LETTER);
  await expect(pollyRow.getByRole("button")).toHaveCount(0);
  await frame(page, "the list shows it, with no buttons");

  const signed = await (await request.get(`${BASE}/api/signatories`)).json();
  expect(signed).toContainEqual(expect.objectContaining({ name: "Polly Placeholder", house: "commons" }));
  await page.goto(`${BASE}/campaigns`);
  await expect(page.locator("#signatories").getByText("Polly Placeholder")).toBeVisible();
  await frame(page, "/campaigns lists the new signatory");

  await page.goto(`${BASE}/staff/audit-log`);
  await expect(page.getByRole("cell", { name: "set status" }).first()).toBeVisible();
  await frame(page, "the audit log");

  // The import page: a card per job; each opens the job's own page.
  await page.goto(`${BASE}/staff/import-data`);
  await frame(page, "the import page");
  await page.getByRole("link", { name: jobTitles["import-controlai"] }).click();
  await expect(page).toHaveURL(`${BASE}/staff/import-data/controlai`);

  // The fixture ControlAI letter is signed by Polly Placeholder MP, so the bill's column says so.
  await page.getByRole("button", { name: staffCopy.controlAi.importNow }).click();
  await expect(page.getByText(/6 names/)).toBeVisible();
  await frame(page, "ControlAI's letter imported");
  await page.goto(`${BASE}/staff/politicians`);
  await expect(page.getByRole("row").filter({ hasText: "Polly Placeholder" })).toContainText(
    "ControlAI's campaign statement",
  );
  await frame(page, "the politicians list says who signed ControlAI's letter");

  // The fixture Airtable gives Polly Placeholder an email Parliament doesn't list.
  await page.goto(`${BASE}/staff/import-data/mp-check`);
  await page.getByRole("button", { name: staffCopy.check.checkNow }).click();
  const blake = page.getByRole("row").filter({ hasText: "Cities of London and Westminster" });
  await expect(blake).toContainText(staffCopy.check.kinds.email);
  await expect(blake).toContainText("polly.placeholder.mp@parliament.uk");
  await frame(page, "the MP check found a differing email");

  // On a phone the navigation and Log out are behind the bar's menu.
  const logout = page.getByRole("button", { name: staffCopy.nav.logout });
  if (!(await logout.first().isVisible())) {
    await page.locator("nav details > summary").click();
    await frame(page, "the staff menu open");
  }
  await logout.filter({ visible: true }).click();
  await expect(page).toHaveURL(`${BASE}/staff/login`);
  await frame(page, "logged out");
  await page.goto(`${BASE}/staff`);
  await expect(page).toHaveURL(`${BASE}/staff/login`);
});

test("the MPs signed tile leads to the one who signed, then to everyone who signed anything, newest first", async ({
  page,
  request,
  flowDatabase,
}) => {
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase, ["admin"]);
  await page.goto(`${BASE}/staff/politicians`);
  await page.getByRole("link", { name: "Polly Placeholder" }).click();
  const letter = page.getByRole("group", { name: PM_LETTER });
  await letter.getByText(staffCopy.politician.edit, { exact: true }).click();
  await letter.getByLabel(staffCopy.politician.note).fill("They emailed");
  await letter.getByRole("button", { name: staffCopy.politicians.markSigned }).click();
  await expect(letter.locator("[class*=answer]")).toHaveText(new RegExp(`^${staffCopy.statuses.signed}`));

  // One signed this week: the tile is their page.
  await page.goto(`${BASE}/staff`);
  const tile = page.getByRole("link").filter({ hasText: staffCopy.home.dashboard.metrics.mpsSigned(1) });
  await frame(page, "the home: one MP signed this week");
  await tile.click();
  await expect(page.getByRole("heading", { level: 1, name: "Polly Placeholder" })).toBeVisible();
  await frame(page, "the tile leads to her page");

  // ControlAI's letter adds several: the tile is everyone who signed anything, newest first.
  await page.goto(`${BASE}/staff/import-data/controlai`);
  await page.getByRole("button", { name: staffCopy.controlAi.importNow }).click();
  await expect(page.getByText(/6 names/)).toBeVisible();
  await page.goto(`${BASE}/staff`);
  await page
    .getByRole("link")
    .filter({ hasText: staffCopy.home.dashboard.metrics.mpsSigned(2) })
    .click();
  await expect(page).toHaveURL(`${BASE}/staff/politicians?answer=signed&sort=asks`);
  await expect(
    page.getByRole("button", { name: `${staffCopy.politicians.answer}: ${staffCopy.statuses.signed}` }),
  ).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Polly Placeholder" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Testy McTestface MP" })).toHaveCount(0);
  await frame(page, "everyone who signed anything, newest first");
});

test("the Luma import copies the calendar's events, guests and contacts, and finds nothing new the second time", async ({
  page,
  flowDatabase,
}) => {
  await logIn(page, flowDatabase);
  await page.goto(`${BASE}/staff/import-data/luma`);
  await page.getByRole("button", { name: staffCopy.luma.importNow }).click();
  // The fixture calendar: nine public events and a private one, five guests each over two pages, three contacts.
  const first = {
    events: 9,
    eventsSynced: 9,
    eventsLeft: 0,
    guestsChanged: 45,
    people: 5,
    contacts: 3,
    supportersAdded: 6,
    linked: 6,
    requests: 21,
  };
  await expect(page.getByText(staffCopy.luma.result(first))).toBeVisible();
  await page.getByRole("heading", { name: staffCopy.luma.title }).scrollIntoViewIfNeeded();
  await frame(page, "the Luma import's first run: every event, guest and contact copied");

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
  await frame(page, "run again: nothing new");
});

test("the members import copies the UK members, skips one erased, and finds nothing new the second time", async ({
  page,
  flowDatabase,
}) => {
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
  await frame(page, "the members import's first run: every member copied but the erased one");

  await page.getByRole("button", { name: staffCopy.members.importNow }).click();
  await expect(
    page.getByText(staffCopy.members.result({ ...first, added: 0, supportersAdded: 0, linked: 0 })),
  ).toBeVisible();
  await expect(page.getByText(staffCopy.runs.status.unchanged)).toBeVisible();
  await page.getByRole("heading", { name: staffCopy.members.title }).scrollIntoViewIfNeeded();
  await frame(page, "run again: nothing new");
});

test("a politician's own page", async ({ page, request, flowDatabase }) => {
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  await page.goto(`${BASE}/staff/politicians`);
  await page.getByRole("link", { name: "Testy McTestface MP" }).click();
  // Their name, tagged as a test MP, and what they are; the box of what we hold; nothing in their history
  // yet.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    `Testy McTestface MP${staffCopy.politicians.testMp}`,
  );
  await expect(
    page.getByText(staffCopy.politician.role(staffCopy.politician.roles.commons, "Testshire", true)),
  ).toBeVisible();
  await expect(page.getByText(staffCopy.politician.sources.test)).toBeVisible();
  await expect(page.getByText(staffCopy.politician.noHistory)).toBeVisible();
  await frame(page, "the test MP's page");

  // The way back, above the name; then the list sorted by a heading, and reversed.
  await page.getByRole("navigation", { name: staffCopy.nav.politicians }).getByRole("link").click();
  await expect(page).toHaveURL(`${BASE}/staff/politicians`);
  await page.getByRole("link", { name: staffCopy.fields.constituency }).click();
  await expect(page).toHaveURL(/sort=constituency&dir=asc/);
  await page.getByRole("link", { name: staffCopy.fields.constituency }).click();
  await expect(page).toHaveURL(/sort=constituency&dir=desc/);
  await frame(page, "the politicians sorted by constituency, reversed");
});

test("an import's own page lists every run it has made, and the import page shows the newest", async ({
  page,
  request,
  flowDatabase,
}) => {
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
  await frame(page, "the MP check's page: both its runs");

  // The import page: each job's newest run on its card; the MP import's, from the start of the flow.
  await page.getByRole("navigation", { name: staffCopy.import.pageTitle }).getByRole("link").click();
  await expect(page).toHaveURL(`${BASE}/staff/import-data`);
  const card = (job: ImportJob) =>
    page.locator("section").filter({ has: page.getByRole("link", { name: jobTitles[job] }) });
  await expect(card("check-mps").getByText(staffCopy.runs.status.ok)).toBeVisible();
  await expect(card("import-controlai").getByText(staffCopy.controlAi.never)).toBeVisible();
  await frame(page, "the import page: the check done, ControlAI's letter never read");
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
async function sentLetterId(page: Page, database: string, sender: string, mp = TEST_MPS[0]): Promise<string> {
  await fakeTurnstile(page);
  await lookUpTestMp(page, BASE, mp);
  await fillLetter(page, sender);
  await sendLetter(page, mp);
  await page.goto(`${BASE}/staff/letters`);
  if (new URL(page.url()).pathname === "/staff/login") await logIn(page, database, ["supporters"]);
  await page.goto(`${BASE}/staff/letters`);
  const row = page.getByRole("row").filter({ hasText: sender });
  await expect(row).toContainText(staffCopy.letters.status.sent);
  return (await row.locator("code").first().textContent())!.match(/"messageId":"([\w-]+)"/)![1];
}

test("letters are listed, sent and bounced, and can be filtered by status and campaign, and reset", async ({
  page,
  request,
  flowDatabase,
}, testInfo) => {
  const jane = `jane+${testInfo.testId}@example.com`;
  const sam = `sam+${testInfo.testId}@example.com`;
  await sentLetterId(page, flowDatabase, jane);
  await postBounce(request, await sentLetterId(page, flowDatabase, sam, bouncy));

  await page.reload();
  const janes = page.getByRole("row").filter({ hasText: jane });
  const sams = page.getByRole("row").filter({ hasText: sam });
  await expect(janes.locator("td").nth(5)).toHaveText(staffCopy.letters.status.sent);
  await expect(sams.locator("td").nth(5)).toHaveText(staffCopy.letters.status.bounced);
  await expect(sams).toContainText("HardBounce");
  await frame(page, "the letters list: one sent, one bounced, with Postmark's reason in its history");

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

test("a letter that bounces: staff are emailed, and the address is blocked", async ({
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

  // The letter, by whom it was to, leads to its own page: its row from the letters list.
  await blocked.getByRole("link", { name: `${staffCopy.emails.letterTo} ${bouncy.name}` }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(staffCopy.letters.oneTitle(bouncy.name));
  await expect(page.getByRole("row").filter({ hasText: sender })).toContainText(staffCopy.letters.status.bounced);
  await frame(page, "the letter's page");
  await page.getByRole("link", { name: staffCopy.nav.letters }).first().click();
  await expect(page).toHaveURL(`${BASE}/staff/letters`);
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

  await logIn(page, flowDatabase, ["admin"]);
  // The home page says the MP's email bounced, first thing, with a button to their page.
  await expect(page.getByText(staffCopy.home.dashboard.actions.blockedMp(bouncy.name))).toBeVisible();
  await frame(page, "the home: the bounced address needs a person");
  await page.getByRole("link", { name: staffCopy.home.dashboard.actions.openMp }).click();
  await expect(page.getByRole("heading", { level: 1, name: bouncy.name })).toBeVisible();

  await page.goto(`${BASE}/staff/politicians`);
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

test("a politician import that would change too many is held, then discarded, and then applied", async ({
  page,
  request,
  flowDatabase,
}) => {
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

  await logIn(page, flowDatabase, ["admin"]);
  await page.goto(`${BASE}/staff/import-data/politicians`);
  await page.getByRole("button", { name: staffCopy.syncs.syncNow }).click();
  await expect(page.getByRole("button", { name: staffCopy.syncs.apply })).toBeVisible();
  await expect(page.getByText(`${staffCopy.syncs.removed} 21`).first()).toBeVisible();
  await expect(page.getByText("Gone 1: Gone McTestface 1 MP")).toBeAttached();
  expect(inAirtable()).toBe(21);
  await frame(page, "the import held: 21 politicians would be gone from Airtable");

  // The home page says so, first thing, with a button back to the decision.
  await page.goto(`${BASE}/staff`);
  await expect(page.getByText(staffCopy.home.dashboard.actions.heldSync(21))).toBeVisible();
  await frame(page, "the home: the held import needs a person");
  await page.getByRole("link", { name: staffCopy.home.dashboard.actions.decide }).click();
  await expect(page).toHaveURL(`${BASE}/staff/import-data/politicians`);

  await page.getByRole("button", { name: staffCopy.syncs.discard }).click();
  await expect(page.getByRole("button", { name: staffCopy.syncs.apply })).toHaveCount(0);
  await expect(page.getByText(staffCopy.runs.status.discarded).first()).toBeVisible();
  expect(inAirtable()).toBe(21);
  await frame(page, "discarded: nobody changed");

  await page.getByRole("button", { name: staffCopy.syncs.syncNow }).click();
  await page.getByRole("button", { name: staffCopy.syncs.apply }).click();
  await expect(page.getByRole("button", { name: staffCopy.syncs.apply })).toHaveCount(0);
  await expect(page.getByText(staffCopy.runs.decidedBy(staffEmail())).first()).toBeVisible();
  expect(inAirtable()).toBe(0);
  await frame(page, "held again, then applied: the 21 are marked gone from Airtable, and kept");

  await page.goto(`${BASE}/staff/audit-log`);
  await expect(page.getByRole("cell", { name: "apply held politician sync" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "discard held politician sync" })).toBeVisible();
  await frame(page, "the audit log: who discarded and who applied");
});

test("a politician import that renames anyone is held, in case Airtable reused the record", async ({
  page,
  request,
  flowDatabase,
}) => {
  await syncPoliticians(request, BASE);
  // Polly's record had another name here: Airtable now names someone else in it.
  runSql(flowDatabase, "UPDATE notable_people SET name = 'Penny Previous' WHERE airtable_id = 'recPlaceholder'");
  await logIn(page, flowDatabase, ["admin"]);
  await page.goto(`${BASE}/staff/import-data/politicians`);
  await page.getByRole("button", { name: staffCopy.syncs.syncNow }).click();
  await expect(page.getByRole("button", { name: staffCopy.syncs.apply })).toBeVisible();
  await expect(page.getByText("Penny Previous → Polly Placeholder")).toBeVisible();
  await frame(page, "held: one record renamed, shown from and to");
});

test("a first login makes an account with no permissions; an admin adds, changes and removes accounts", async ({
  page,
  flowDatabase,
}, testInfo) => {
  const colleague = `colleague-${testInfo.testId.replace(/\W/g, "").slice(-8)}@pauseai.uk`;
  // Logged in for the first time, with no account: one is made, with no permissions, so the dashboard and the pages any account opens.
  await logInAsStaff(page, BASE, staffEmail());
  await expect(page.getByRole("heading", { level: 2, name: staffCopy.home.dashboard.sections.mps })).toBeVisible();
  // The sidebar (hidden behind the bar's menu on a phone, so read from the DOM) offers the ordinary pages and not the admin's.
  await expect(page.locator('nav a[href="/staff/politicians"]').first()).toBeAttached();
  await expect(page.locator('nav a[href="/staff/accounts"]')).toHaveCount(0);
  await frame(page, "the staff home after a first login: an account with no permissions");
  // The dashboard over a longer window, from the links under the day.
  await page.getByRole("link", { name: staffCopy.home.dashboard.window(30) }).click();
  await expect(page).toHaveURL(`${BASE}/staff?days=30`);
  await expect(page.getByText(staffCopy.home.dashboard.change.same(30)).first()).toBeVisible();
  await frame(page, "the home over the last 30 days");
  await page.goto(`${BASE}/staff/accounts`);
  await expect(page).toHaveURL(`${BASE}/staff`);

  // As an admin: the accounts page, where a colleague is added, given a permission, and removed.
  addStaffAccount(flowDatabase, staffEmail(), ["admin"]);
  await page.goto(`${BASE}/staff/accounts`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(staffCopy.accounts.title);
  await frame(page, "the accounts page: the seeded admin and this admin");
  // Added under the last row, at once: an account with no permissions.
  await page.getByRole("textbox", { name: staffCopy.accounts.addTitle }).fill(colleague);
  await page.getByRole("button", { name: staffCopy.accounts.add }).click();
  const row = page.getByRole("row").filter({ hasText: colleague });
  await expect(row).toContainText(staffEmail());
  await expect(page.getByRole("textbox", { name: staffCopy.accounts.addTitle })).toHaveValue("");
  await frame(page, "the colleague added, with no permissions");

  // A box ticked is saved at once: still ticked after a reload.
  const supporters = row.getByRole("checkbox", { name: staffCopy.accounts.names.supporters });
  await supporters.check();
  await expect(supporters).toBeEnabled();
  await page.reload();
  await expect(supporters).toBeChecked();
  await frame(page, "given the supporters permission");

  await row.getByRole("button", { name: staffCopy.accounts.remove }).click();
  await expect(page.getByRole("row").filter({ hasText: colleague })).toHaveCount(0);
  await frame(page, "removed");

  await page.goto(`${BASE}/staff/audit-log`);
  await expect(page.getByRole("cell", { name: "add staff account" }).first()).toBeVisible();
  await expect(page.getByRole("cell", { name: "remove staff account" })).toBeVisible();
  // The first login's account, added by the login itself.
  await expect(
    page.getByRole("row").filter({ hasText: "add staff account" }).filter({ hasText: staffEmail() }).first(),
  ).toBeVisible();
  await frame(page, "the audit log: added on first login, then added, changed and removed");
});

test("staff pages are kept out of search and the sitemap", async ({ page, request }) => {
  await page.goto(`${BASE}/staff/login`);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  expect(await (await request.get(`${BASE}/sitemap.xml`)).text()).not.toContain("/staff");
});
