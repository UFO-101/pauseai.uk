import { staffCopy } from "@/lib/content/staff-interface";
import { addStaffAccount, askForLoginLink, logInWithLink, loginLinkFor, newestEmailTo } from "../steps";
import { BASE, emailFrame, expect, flowStorageState, frame, story, test } from "./fixtures";
import { STAFF_PAGES, stayOnPage, staffEmail, logIn } from "./staff-steps";

// Logging in to the staff pages, and your own account: the dev login, a
// login link, a first login and an admin's accounts, being logged out, your
// Gmail, and the pages kept out of search. Each flow on its own database.
// Here staff log in with the link emailed to them (logInWithLink in
// tests/steps.ts); the other sections use the dev login (logInAsStaff).

test("The dev login", async ({ page, flowDatabase }) => {
  story(
    "On a development build, the login page has a box under the card for signing in at once as any staff account. It never appears on the real site.",
  );
  addStaffAccount(flowDatabase, "jo@pauseai.uk", ["supporters"]);
  await page.goto(`${BASE}/staff/login`);
  const dev = page.getByRole("region", { name: staffCopy.devLogin.title });
  await expect(dev.getByRole("button", { name: "admin@pauseai.uk" })).toBeVisible();
  await frame(page, "The login page");
  story("Jo, who has the Supporters permission, signs in with one click.");
  await dev.getByRole("button", { name: "jo@pauseai.uk" }).click();
  await expect(page).toHaveURL(`${BASE}/staff`);
  await expect(page.getByText("jo@pauseai.uk").first()).toBeAttached();
  await frame(page, "The dashboard, as Jo");
});

test("Every page asks you to log in", async ({ request }) => {
  story("Logged out, every staff page sends you to the login page, which remembers the page you wanted.");
  expect(STAFF_PAGES.length).toBeGreaterThan(4);
  for (const route of STAFF_PAGES) {
    const res = await request.get(`${BASE}${route}`, { maxRedirects: 0 });
    expect(res.status(), route).toBe(307);
    const back = route === "/staff" ? "" : `?next=${encodeURIComponent(route)}`;
    const location = new URL(res.headers().location, BASE);
    expect(location.pathname + location.search, route).toBe(`/staff/login${back}`);
  }
});

test("Logged out, nothing changes", async ({ request }) => {
  story("Logged out, nothing on the staff pages can be changed, and a forged login doesn't get in.");
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

test("An address outside pauseai.uk", { tag: "@phone" }, async ({ page }) => {
  story("Someone asks for a login link for an address outside pauseai.uk.");
  await page.goto(`${BASE}/staff/login`);
  await frame(page, "The login page");
  expect(await logInWithLink(page, BASE, "someone@gmail.com")).toBe(false);
  await frame(page, "Check your email");
  story(
    "The page says to check their email, but no link is sent. An address that only looks like pauseai.uk gets none either.",
  );
  expect(await logInWithLink(page, BASE, "someone@pauseai.uk.evil.example")).toBe(false);
});

test("A login link", async ({ page, browser, request, flowDatabase }) => {
  story("Staff ask for a login link, ticking Keep me signed in. It's emailed to them.");
  const email = staffEmail();
  addStaffAccount(flowDatabase, email);
  await askForLoginLink(page, BASE, email, true);
  const link = loginLinkFor(email)!;
  await emailFrame(page, newestEmailTo(email)!, "The email with the login link");
  story(
    "Opened in another browser, or by a mail scanner, the link logs nobody in, and the page says why. The link still works.",
  );

  // Opened by a mail scanner, or in another browser, the link logs nobody in
  // and says why, and isn't used up.
  const scanned = await request.get(link);
  expect(scanned.url()).toBe(`${BASE}/staff/login?elsewhere=1`);
  const other = await browser.newContext({ storageState: flowStorageState(flowDatabase) });
  const otherPage = await other.newPage();
  await otherPage.goto(link);
  await expect(otherPage).toHaveURL(/\/staff\/login\?elsewhere=1$/);
  await expect(otherPage.getByText(staffCopy.login.elsewhere)).toBeVisible();
  await frame(otherPage, "The link, in another browser");
  story(
    "In the browser that asked for it, the link logs them in, for 30 days as they ticked the box. Opened again, it has been used, and logs nobody in.",
  );
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
  await frame(page, "The link, opened again");
});

test("Staff accounts", async ({ page, flowDatabase }, testInfo) => {
  story(
    "Someone logs in for the first time. An account is made for them, with no permissions, so they see the dashboard and the pages any account opens, but not the admin's.",
  );
  const colleague = `colleague-${testInfo.testId.replace(/\W/g, "").slice(-8)}@pauseai.uk`;
  // Logged in for the first time, with no account: one is made, with no permissions, so the dashboard and the pages any account opens.
  await logInWithLink(page, BASE, staffEmail());
  await expect(page.getByRole("heading", { level: 2, name: staffCopy.home.dashboard.sections.mps })).toBeVisible();
  // The sidebar (hidden behind the bar's menu on a phone, so read from the DOM) offers the ordinary pages and not the admin's.
  await expect(page.locator('nav a[href="/staff/politicians"]').first()).toBeAttached();
  await expect(page.locator('nav a[href="/staff/accounts"]')).toHaveCount(0);
  await frame(page, "The dashboard, after a first login");
  story("The dashboard can show the last 30 days instead.");
  // The dashboard over a longer window, from the links under the day.
  await page.getByRole("link", { name: staffCopy.home.dashboard.window(30) }).click();
  await expect(page).toHaveURL(`${BASE}/staff?days=30`);
  await expect(page.getByText(staffCopy.home.dashboard.change.same(30)).first()).toBeVisible();
  await frame(page, "The dashboard, over 30 days");
  story("Without the Admin permission, the staff accounts page sends them back to the dashboard.");
  await page.goto(`${BASE}/staff/accounts`);
  await expect(page).toHaveURL(`${BASE}/staff`);

  // As an admin: the accounts page, where a colleague is added, given a permission, and removed.
  story("Given the Admin permission, they can open the staff accounts page.");
  addStaffAccount(flowDatabase, staffEmail(), ["admin"]);
  await page.goto(`${BASE}/staff/accounts`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(staffCopy.accounts.title);
  await frame(page, "The staff accounts page");
  story("Add staff asks for a colleague's address.");
  // Added from Add staff, at the top right, at once: an account with no permissions.
  await page.getByRole("button", { name: staffCopy.accounts.addStaff }).click();
  await page.getByRole("textbox", { name: staffCopy.accounts.addTitle }).fill(colleague);
  await frame(page, "Add staff");
  story("Added, the colleague has an account with no permissions.");
  await page.getByRole("button", { name: staffCopy.accounts.add, exact: true }).click();
  const row = page.getByRole("row").filter({ hasText: colleague });
  await expect(row).toContainText(staffEmail());
  await frame(page, "The colleague, added");
  story("Edit shows a box for each permission. They tick Supporters, and save.");

  // Edit opens a box for each; Save saves those ticked: still there after a reload.
  await row.getByRole("button", { name: staffCopy.accounts.edit }).click();
  const permissions = page.getByRole("form", { name: staffCopy.accounts.editLabel(colleague) });
  await permissions.getByRole("checkbox", { name: staffCopy.accounts.names.supporters }).check();
  await frame(page, "The colleague's permissions");
  story("After a reload, the colleague has the Supporters permission.");
  await permissions.getByRole("button", { name: staffCopy.accounts.save }).click();
  await expect(permissions).not.toBeVisible();
  await page.reload();
  await expect(row.getByRole("cell").nth(1)).toContainText(staffCopy.accounts.names.supporters);
  await frame(page, "The colleague, with Supporters");
  story("Remove asks to be confirmed.");

  await row.getByRole("button", { name: staffCopy.accounts.remove }).click();
  await frame(page, "Remove, pressed once");
  story(
    "Confirmed, the colleague is gone. A note says they can still log in with basic permissions, unless their Gmail is disabled too.",
  );
  await row.getByRole("button", { name: staffCopy.deleteItShort }).click();
  await expect(page.getByRole("row").filter({ hasText: colleague })).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText(staffCopy.accounts.removeNote);
  await frame(page, "The colleague, removed");
  story("The audit log shows the account the first login made, then the colleague added and removed.");

  await page.goto(`${BASE}/staff/audit-log`);
  await expect(page.getByRole("cell", { name: "add staff account" }).first()).toBeVisible();
  await expect(page.getByRole("cell", { name: "remove staff account" })).toBeVisible();
  // The first login's account, added by the login itself.
  await expect(
    page.getByRole("row").filter({ hasText: "add staff account" }).filter({ hasText: staffEmail() }).first(),
  ).toBeVisible();
  await frame(page, "The audit log");
});

test("Connecting your Gmail", async ({ page, flowDatabase }) => {
  story(
    "Staff open their own page from their address in the sidebar. It says their Gmail isn't connected, what connecting it means, and where they're logged in.",
  );
  await logIn(page, flowDatabase);
  await page.goto(`${BASE}/staff`);
  // Your address in the navigation leads to your page (on a phone, inside the menu).
  await expect(page.locator('nav a[href="/staff/me"]').first()).toHaveText(staffEmail());
  await page.goto(`${BASE}/staff/me`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(staffCopy.me.title);
  await expect(page.getByRole("link", { name: staffCopy.gmail.connect })).toBeVisible();
  await frame(page, "Your account");
  story("Connect Gmail greys, with a spinner, while Google's page comes.");

  // Google's page kept from coming, so the button can be seen waiting for it.
  const google = await stayOnPage(page, /\/staff\/api\/gmail\/connect/);
  const connect = page.getByRole("link", { name: staffCopy.gmail.connect });
  await connect.click();
  // Its spinner shows once it has taken a moment.
  await expect(connect.locator("[aria-hidden]")).toBeVisible();
  await frame(page, "Connect Gmail, waiting");
  story(
    "Back from Google, their Gmail is connected. The page says how many emails it has sent today, with Disconnect Gmail.",
  );
  await page.goto(await google.asked());
  await expect(page.getByText(staffCopy.gmail.outcomes.connected)).toBeVisible();
  await expect(page.getByRole("button", { name: staffCopy.gmail.disconnect })).toBeVisible();
  await frame(page, "Gmail connected");
  story("Disconnect Gmail disconnects it, and the page says so.");

  await page.getByRole("button", { name: staffCopy.gmail.disconnect }).click();
  await expect(page.getByText(staffCopy.gmail.outcomes.disconnected)).toBeVisible();
  await expect(page.getByText(staffCopy.gmail.outcomes.connected)).toHaveCount(0);
  await expect(page.getByRole("link", { name: staffCopy.gmail.connect })).toBeVisible();
  await frame(page, "Gmail disconnected");
  story("If they choose a Google account other than their staff address, the page says which to choose.");

  // Google sending you back having chosen another account, as the callback does.
  await page.goto(`${BASE}/staff/me?gmail=other-account`);
  await expect(page.getByText(staffCopy.gmail.otherAccount(staffEmail()))).toBeVisible();
  await frame(page, "The wrong Google account");
});

test("Kept out of search", async ({ page, request }) => {
  story("Search engines are told not to list the staff pages, and the sitemap leaves them out.");
  await page.goto(`${BASE}/staff/login`);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  expect(await (await request.get(`${BASE}/sitemap.xml`)).text()).not.toContain("/staff");
});
