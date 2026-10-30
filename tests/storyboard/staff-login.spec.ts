import { staffCopy } from "@/lib/content/staff-interface";
import { addStaffAccount, askForLoginLink, logInAsStaff, loginLinkFor, newestEmailTo } from "../steps";
import { BASE, emailFrame, expect, flowStorageState, frame, test } from "./fixtures";
import { STAFF_PAGES, holdNextDocument, staffEmail, logIn } from "./staff-steps";

// Logging in to the staff pages, and your own account: the dev login, a
// login link, a first login and an admin's accounts, being logged out, your
// Gmail, and the pages kept out of search. Each flow on its own database;
// staff log in with the link emailed to them (logInAsStaff in tests/steps.ts).

test("Dev login: sign in with one click", async ({ page, flowDatabase }) => {
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

test("Logged out: every staff page asks you to log in", async ({ request }) => {
  expect(STAFF_PAGES.length).toBeGreaterThan(4);
  for (const route of STAFF_PAGES) {
    const res = await request.get(`${BASE}${route}`, { maxRedirects: 0 });
    expect(res.status(), route).toBe(307);
    const back = route === "/staff" ? "" : `?next=${encodeURIComponent(route)}`;
    const location = new URL(res.headers().location, BASE);
    expect(location.pathname + location.search, route).toBe(`/staff/login${back}`);
  }
});

test("Logged out: the staff API changes nothing", async ({ request }) => {
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

test("An address outside pauseai.uk gets no login link", { tag: "@phone" }, async ({ page }) => {
  await page.goto(`${BASE}/staff/login`);
  await frame(page, "the login page");
  expect(await logInAsStaff(page, BASE, "someone@gmail.com")).toBe(false);
  await frame(page, "check your inbox, for an address that gets nothing");
  expect(await logInAsStaff(page, BASE, "someone@pauseai.uk.evil.example")).toBe(false);
});

test("A login link works once, in the browser that asked", async ({ page, browser, request, flowDatabase }) => {
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

test("First login, then an admin manages accounts", async ({ page, flowDatabase }, testInfo) => {
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

test("Connect your Gmail on your account page, then disconnect it", async ({ page, flowDatabase }) => {
  await logIn(page, flowDatabase);
  await page.goto(`${BASE}/staff`);
  // Your address in the navigation leads to your page (on a phone, inside the menu).
  await expect(page.locator('nav a[href="/staff/me"]').first()).toHaveText(staffEmail());
  await page.goto(`${BASE}/staff/me`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(staffCopy.me.title);
  await expect(page.getByRole("link", { name: staffCopy.gmail.connect })).toBeVisible();
  await frame(page, "your page: your Gmail not connected, what connecting means, then where you're logged in");

  // The way to Google held, so the button can be seen waiting for it.
  const google = await holdNextDocument(page, /\/staff\/api\/gmail\/connect/);
  const connect = page.getByRole("link", { name: staffCopy.gmail.connect });
  await connect.click();
  // Its spinner shows once it has taken a moment.
  await expect(connect.locator("[aria-hidden]")).toBeVisible();
  await frame(page, "Connect Gmail pressed: greyed, with a spinner where its words were, while Google's page comes");
  await google.release();
  await expect(page.getByText(staffCopy.gmail.outcomes.connected)).toBeVisible();
  await expect(page.getByRole("button", { name: staffCopy.gmail.disconnect })).toBeVisible();
  await frame(page, "back from Google: connected, with today's sends, and Disconnect");

  await page.getByRole("button", { name: staffCopy.gmail.disconnect }).click();
  await expect(page.getByText(staffCopy.gmail.outcomes.disconnected)).toBeVisible();
  await expect(page.getByText(staffCopy.gmail.outcomes.connected)).toHaveCount(0);
  await expect(page.getByRole("link", { name: staffCopy.gmail.connect })).toBeVisible();
  await frame(page, "disconnected: it says so, and Connect Gmail again");

  // Google sending you back having chosen another account, as the callback does.
  await page.goto(`${BASE}/staff/me?gmail=other-account`);
  await expect(page.getByText(staffCopy.gmail.otherAccount(staffEmail()))).toBeVisible();
  await frame(page, "back from Google with another account: an error, naming the one to choose");
});

test("Staff pages are kept out of search", async ({ page, request }) => {
  await page.goto(`${BASE}/staff/login`);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  expect(await (await request.get(`${BASE}/sitemap.xml`)).text()).not.toContain("/staff");
});
