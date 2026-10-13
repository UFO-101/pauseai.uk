import { test, expect, type Page } from "@playwright/test";
import { campaigns } from "@/lib/content/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import { ROUTES } from "../routes";
import { BASE, syncFixtureMps } from "./setup";

// The staff interface, on the behaviour build's own database. Staff log in
// through the fixture Google: the browser's trip to Google is answered here,
// and the server's requests to Google by the fixtures. There's no login
// bypass: our login route makes the state and its cookie as usual.

const STAFF_PAGES = ROUTES.filter((route) => route.startsWith("/staff") && route !== "/staff/login");
const [pm] = campaigns;

/**
 * Logs in as `code`'s account (tests/fixtures/outside-services.ts). Playwright
 * can't intercept a request that follows a redirect, so this takes our login
 * route's redirect to Google and sends the browser straight back, as Google
 * would once the account is chosen.
 */
async function logIn(page: Page, code = "fixture-staff") {
  await page.route("https://accounts.google.com/**", (route) => route.abort());
  await page.route(`${BASE}/staff/api/login`, async (route) => {
    const response = await route.fetch({ maxRedirects: 0 });
    const google = new URL(response.headers().location);
    const back = new URL(google.searchParams.get("redirect_uri")!);
    back.searchParams.set("code", code);
    back.searchParams.set("state", google.searchParams.get("state")!);
    await route.fulfill({ response, headers: { ...response.headers(), location: back.toString() } });
  });
  await page.goto(`${BASE}/staff/login`);
  await page.getByRole("link", { name: staffCopy.login.button }).click();
}

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

test("an account outside pauseai.uk can't log in", async ({ page }) => {
  await logIn(page, "fixture-outsider");
  await expect(page).toHaveURL(/\/staff\/login\?failed=1$/);
  await expect(page.getByText(staffCopy.login.failed)).toBeVisible();
});

test("staff log in, set a status that shows on /campaigns, add a signer, and log out", async ({ page, request }) => {
  await logIn(page);
  await expect(page).toHaveURL(`${BASE}/staff`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(staffCopy.politicians.title);
  await expect(page.getByText(staffCopy.nav.signedInAs("staff@pauseai.uk"))).toBeVisible();
  await expect(page.getByRole("link", { name: "Testy McTestface MP" })).toBeVisible();

  await page.getByRole("link", { name: "Rachel Blake" }).click();
  const form = page.getByRole("form", { name: pm.title });
  await form.getByRole("combobox", { name: staffCopy.fields.status, exact: true }).selectOption("signed");
  await form.getByRole("button", { name: staffCopy.politician.save }).click();
  await expect(form.getByText(/staff@pauseai\.uk/)).toBeVisible();

  const signed = await (await request.get(`${BASE}/api/signatories`)).json();
  expect(signed).toContainEqual(expect.objectContaining({ name: "Rachel Blake", house: "commons" }));
  await page.goto(`${BASE}/campaigns`);
  await expect(page.locator("#signatories").getByText("Rachel Blake")).toBeVisible();

  await page.goto(`${BASE}/staff/politicians/new`);
  await page.getByRole("textbox", { name: staffCopy.fields.name, exact: true }).fill("Lord Fixture");
  await page.getByRole("button", { name: staffCopy.add.button }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lord Fixture");

  await page.goto(`${BASE}/staff/changes`);
  await expect(page.getByRole("cell", { name: "add politician" }).first()).toBeVisible();

  await page.goto(`${BASE}/staff/mp-sync`);
  await expect(page.getByText(staffCopy.syncs.status.applied).first()).toBeVisible();

  await page.getByRole("button", { name: staffCopy.nav.logout }).click();
  await expect(page).toHaveURL(`${BASE}/staff/login`);
  await page.goto(`${BASE}/staff`);
  await expect(page).toHaveURL(`${BASE}/staff/login`);
});

// Not a pass or fail: a full-page screenshot of each staff screen, at desktop
// and phone widths, attached to the Playwright report for a person to look
// over. The public pages are diffed against live (tests/public-vs-live/); the
// staff interface can't be, as it needs a login.
test("screenshots of each staff screen, for the report", async ({ page }, testInfo) => {
  const shoot = async (name: string) => {
    for (const [width, height, size] of [[1280, 800, "desktop"], [390, 844, "mobile"]] as const) {
      await page.setViewportSize({ width, height });
      await testInfo.attach(`${name} (${size}).png`, { body: await page.screenshot({ fullPage: true, animations: "disabled" }), contentType: "image/png" });
    }
    await page.setViewportSize({ width: 1280, height: 800 });
  };

  await page.goto(`${BASE}/staff/login`);
  await shoot("login");

  await logIn(page);
  await expect(page).toHaveURL(`${BASE}/staff`);
  await shoot("politicians");

  await page.getByRole("link", { name: "Testy McTestface MP" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Testy McTestface MP");
  await shoot("politician");

  for (const [path, name] of [
    ["/staff/politicians/new", "add signer"],
    ["/staff/letters", "letters"],
    ["/staff/mp-sync", "MP syncs"],
    ["/staff/import", "import"],
    ["/staff/changes", "changes"],
  ] as const) {
    await page.goto(`${BASE}${path}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await shoot(name);
  }
  expect(testInfo.attachments.filter((a) => a.name.endsWith(".png"))).toHaveLength(16);
});

test("staff pages are kept out of search and the sitemap", async ({ page, request }) => {
  await page.goto(`${BASE}/staff/login`);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  expect(await (await request.get(`${BASE}/sitemap.xml`)).text()).not.toContain("/staff");
});
