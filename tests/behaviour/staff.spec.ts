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
  const action = await request.post(`${BASE}/staff/politicians/1`, {
    headers: { "Next-Action": "0000000000000000000000000000000000000000" },
    multipart: { politicianId: "1", campaign: pm.slug, status: "signed" },
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

test("a login link works once, and only from its button", async ({ page, request }) => {
  await page.goto(`${BASE}/staff/login`);
  await page.getByLabel(staffCopy.login.emailLabel).fill("once@pauseai.uk");
  await page.getByRole("button", { name: staffCopy.login.button }).click();
  await expect(page.getByRole("status")).toHaveText(staffCopy.login.sent);
  const link = newestEmailTo("once@pauseai.uk")!.TextBody.match(/https?:\/\/\S+\/staff\/login\/confirm\?token=[\w-]+/)![0];

  // Opening the link, as a mail scanner would, logs nobody in.
  expect((await request.get(link)).ok()).toBe(true);
  await page.goto(link);
  await page.getByRole("button", { name: staffCopy.login.confirm }).click();
  await expect(page).toHaveURL(`${BASE}/staff`);
  await expect(page.getByText(staffCopy.nav.signedInAs("once@pauseai.uk"))).toBeVisible();

  await page.context().clearCookies();
  await page.goto(link);
  await page.getByRole("button", { name: staffCopy.login.confirm }).click();
  await expect(page).toHaveURL(/\/staff\/login\?failed=1$/);
  await expect(page.getByText(staffCopy.login.failed)).toBeVisible();
});

test("staff log in, set a status that shows on /campaigns, and log out", async ({ page, request }) => {
  await logIn(page);
  await expect(page).toHaveURL(`${BASE}/staff`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(staffCopy.politicians.title);
  await expect(page.getByText(staffCopy.nav.signedInAs("staff@pauseai.uk"))).toBeVisible();
  await expect(page.getByRole("link", { name: "Testy McTestface MP" })).toBeVisible();

  await page.getByRole("link", { name: "Polly Placeholder" }).click();
  const form = page.getByRole("form", { name: pm.title });
  await form.getByRole("combobox", { name: staffCopy.fields.status, exact: true }).selectOption("signed");
  await form.getByRole("button", { name: staffCopy.politician.save }).click();
  await expect(form.getByText(/staff@pauseai\.uk/)).toBeVisible();

  const signed = await (await request.get(`${BASE}/api/signatories`)).json();
  expect(signed).toContainEqual(expect.objectContaining({ name: "Polly Placeholder", house: "commons" }));
  await page.goto(`${BASE}/campaigns`);
  await expect(page.locator("#signatories").getByText("Polly Placeholder")).toBeVisible();

  await page.goto(`${BASE}/staff/changes`);
  await expect(page.getByRole("cell", { name: "set status" }).first()).toBeVisible();

  await page.goto(`${BASE}/staff/import`);
  await expect(page.getByText(staffCopy.syncs.status.applied).first()).toBeVisible();

  // The fixture Airtable gives Polly Placeholder an email Parliament doesn't list.
  await page.goto(`${BASE}/staff/mp-check`);
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
