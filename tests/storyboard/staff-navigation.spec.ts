import { jobTitles, staffCopy } from "@/lib/content/staff-interface";
import { lockTable, syncPoliticians } from "../steps";
import { BASE, expect, frame, test } from "./fixtures";
import { PM_LETTER, staffEmail, logIn, holdNextPage, loadingLine } from "./staff-steps";

// Finding your way round the staff pages: the dashboard's tiles, the sidebar
// folded and followed, a list sorted or searched, a politician's page, and
// setting a status that shows on the public campaigns. Each flow on its own
// database.

test("Fold the sidebar to icons", { tag: "@desktop-only" }, async ({ page, flowDatabase }) => {
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
});

test("Sort or search: the choice shows at once", async ({ page, flowDatabase }) => {
  // The line along the top slides while it waits; held still, so each frame of it is the same.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await logIn(page, flowDatabase, ["supporters", "admin"]);
  await page.goto(`${BASE}/staff/politicians?flag=test`);
  await frame(page, "the test politicians, by name, A to Z");

  // A sort heading: its arrow turns at once; the rows stay as they were.
  let next = await holdNextPage(page, /sort=name&dir=desc/);
  const name = page.getByRole("table").getByRole("link", { name: staffCopy.fields.name });
  await name.click();
  await expect(name).toHaveAttribute("data-pending", "true");
  await expect(name).toContainText("▼");
  await expect.poll(() => loadingLine(page)).toBe(true);
  await frame(page, "Name clicked again: its arrow turned at once, a line along the top while Z to A loads");
  await next.release();
  await expect(page).toHaveURL(/sort=name&dir=desc/);
  await expect.poll(() => loadingLine(page)).toBe(false);

  // A search, sent from its box without leaving the page.
  next = await holdNextPage(page, /q=Testy/);
  await page.getByRole("searchbox").fill("Testy");
  await page.getByRole("button", { name: staffCopy.search }).click();
  await expect.poll(() => loadingLine(page)).toBe(true);
  await frame(page, "a search sent: the list as it was, a line along the top while it looks");
  await next.release();
  await expect(page).toHaveURL(/q=Testy/);
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(2);
  await frame(page, "what the search found");
});

test("Click a sidebar link: it's marked at once", async ({ page, flowDatabase }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await logIn(page, flowDatabase, ["supporters", "admin"]);
  await page.goto(`${BASE}/staff/politicians`);
  // In the sidebar; on a phone, behind the bar's menu.
  const asks = page
    .getByRole("navigation", { name: staffCopy.nav.title })
    .getByRole("link", { name: staffCopy.nav.asks });
  if (!(await asks.first().isVisible())) await page.locator("nav details > summary").click();

  // The Asks page waits on its table, as on a slow database.
  const release = await lockTable(flowDatabase, "asks");
  await asks.filter({ visible: true }).click();
  await expect(asks.filter({ visible: true })).toHaveAttribute("data-pending", "true");
  await expect(page.getByRole("heading", { level: 1, name: staffCopy.politicians.title })).toBeVisible();
  await expect.poll(() => loadingLine(page)).toBe(true);
  await frame(page, "Asks clicked: marked in the sidebar at once, the politicians still there, a line along the top");
  await release();
  await expect(page.getByRole("heading", { level: 1, name: staffCopy.asks.title })).toBeVisible();
  await frame(page, "the Asks page arrived");
});

test("The MPs signed tile: who signed, then everyone", async ({ page, request, flowDatabase }) => {
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

  // ControlAI's letter adds several: the tile is everyone who signed anything, the latest recorded first.
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
  await frame(page, "everyone who signed anything, the latest recorded first: the import just recorded the peer's");
});

test("Open a politician's page and sort the list", async ({ page, request, flowDatabase }) => {
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  await page.goto(`${BASE}/staff/politicians?flag=test`);
  await page.getByRole("link", { name: "Testy McTestface MP" }).click();
  // Their name, tagged as a test MP, and what they are; the box of what we hold; nothing in their history
  // yet.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    `Testy McTestface MP${staffCopy.politicians.flags.test}`,
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

test("Log in, set an MP's status, see it on /campaigns, log out", async ({ page, request, flowDatabase }) => {
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
  // The test politicians are left out until the Marked filter asks for them.
  await expect(page.getByRole("link", { name: "Polly Placeholder" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Testy McTestface MP" })).toHaveCount(0);
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
  await page.getByRole("button", { name: staffCopy.changes.json }).first().click();
  await expect(page.locator("pre:popover-open")).toBeVisible();
  await frame(page, "an entry's {}: what it logged, as JSON, in a bubble by the button", { window: true });
  await page.keyboard.press("Escape");

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
