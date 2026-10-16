import { test, expect, type Page } from "@playwright/test";
import { campaigns } from "@/lib/content/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import { ROUTES } from "../routes";
import { logInAsStaff } from "../steps";
import { BASE, newestEmailTo, OUTBOX_DIR, syncFixtureMps } from "./setup";

// The staff interface, on the behaviour build's own database. Staff log in
// with the link emailed to them, taken from the build's outbox (logInAsStaff
// in tests/steps.ts): there's no login bypass. Screenshots of each screen, against main's, are in
// tests/fixtures-vs-main/.

const STAFF_PAGES = ROUTES.filter((route) => route.startsWith("/staff") && !route.startsWith("/staff/login"));
const [pm] = campaigns;

/** Logs in as `email`, with the link emailed to them (tests/steps.ts). */
const logIn = (page: Page, email?: string) => logInAsStaff(page, BASE, OUTBOX_DIR, email);

test.beforeAll(async ({ request }) => syncFixtureMps(request));

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

test("an address outside pauseai.uk gets no link, though the page doesn't say so", async ({ page }) => {
  expect(await logIn(page, "someone@gmail.com")).toBe(false);
  expect(await logIn(page, "someone@pauseai.uk.evil.example")).toBe(false);
});

test("a login link works once, and only in the browser that asked for it", async ({ page, browser, request }) => {
  await page.goto(`${BASE}/staff/login`);
  await page.getByLabel(staffCopy.login.emailLabel).fill("once@pauseai.uk");
  await page.getByRole("button", { name: staffCopy.login.button }).click();
  await expect(page.getByRole("status")).toHaveText(staffCopy.login.sent);
  const link = newestEmailTo("once@pauseai.uk")!.TextBody.match(
    /https?:\/\/\S+\/staff\/api\/callback\?token=[\w-]+/,
  )![0];

  // Opened by a mail scanner, or in another browser, the link logs nobody in
  // and says why, and isn't used up.
  const scanned = await request.get(link);
  expect(scanned.url()).toBe(`${BASE}/staff/login?elsewhere=1`);
  const other = await browser.newPage();
  await other.goto(link);
  await expect(other).toHaveURL(/\/staff\/login\?elsewhere=1$/);
  await expect(other.getByText(staffCopy.login.elsewhere)).toBeVisible();
  await other.close();

  // Opened in the browser that asked, it logs in straight away.
  await page.goto(link);
  await expect(page).toHaveURL(`${BASE}/staff/politicians`);
  await expect(page.getByText("once@pauseai.uk").first()).toBeVisible();

  // And it only works once.
  await page.context().clearCookies({ name: "staff_session" });
  await page.goto(link);
  await expect(page).toHaveURL(/\/staff\/login\?failed=1$/);
  await expect(page.getByText(staffCopy.login.failed)).toBeVisible();
});

test("staff log in, set a status that shows on /campaigns, and log out", async ({ page, request }) => {
  await logIn(page);
  // Plain /staff opens the politicians list, for now.
  await expect(page).toHaveURL(`${BASE}/staff/politicians`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(staffCopy.politicians.title);
  await expect(page.getByText("staff@pauseai.uk").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Testy McTestface MP" })).toBeVisible();

  const form = page.getByRole("form", { name: `${pm.title}: Polly Placeholder` });
  await form.getByRole("button", { name: staffCopy.politicians.markSigned }).click();
  await expect(form.getByText(new RegExp(`^${staffCopy.statuses.signed}`))).toBeVisible();

  const signed = await (await request.get(`${BASE}/api/signatories`)).json();
  expect(signed).toContainEqual(expect.objectContaining({ name: "Polly Placeholder", house: "commons" }));
  await page.goto(`${BASE}/campaigns`);
  await expect(page.locator("#signatories").getByText("Polly Placeholder")).toBeVisible();

  await page.goto(`${BASE}/staff/audit-log`);
  await expect(page.getByRole("cell", { name: "set status" }).first()).toBeVisible();

  // The import page shows each job's newest run; the history page lists every run, the first sync among them.
  await page.goto(`${BASE}/staff/import-history?job=sync-mps`);
  await expect(page.getByText(staffCopy.runs.status.applied).first()).toBeVisible();
  await page.goto(`${BASE}/staff/import-data`);

  // The fixture ControlAI letter is signed by Polly Placeholder MP, so the bill's column says so.
  await page.getByRole("button", { name: staffCopy.controlAi.importNow }).click();
  await expect(page.getByText(/6 names/)).toBeVisible();
  await page.goto(`${BASE}/staff`);
  await expect(page.getByRole("row").filter({ hasText: "Polly Placeholder" })).toContainText(
    staffCopy.politicians.signedControlAi,
  );

  // The fixture Airtable gives Polly Placeholder an email Parliament doesn't list.
  await page.goto(`${BASE}/staff/import-data`);
  await page.getByRole("button", { name: staffCopy.check.checkNow }).click();
  const blake = page.getByRole("row").filter({ hasText: "Cities of London and Westminster" });
  await expect(blake).toContainText(staffCopy.check.kinds.email);
  await expect(blake).toContainText("polly.placeholder.mp@parliament.uk");

  await page.getByRole("button", { name: staffCopy.nav.logout }).click();
  await expect(page).toHaveURL(`${BASE}/staff/login`);
  await page.goto(`${BASE}/staff`);
  await expect(page).toHaveURL(`${BASE}/staff/login`);
});

test("staff pages are kept out of search and the sitemap", async ({ page, request }) => {
  await page.goto(`${BASE}/staff/login`);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  expect(await (await request.get(`${BASE}/sitemap.xml`)).text()).not.toContain("/staff");
});
