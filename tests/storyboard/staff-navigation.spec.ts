import { jobTitles, staffCopy } from "@/lib/content/staff-interface";
import { runSql } from "@/scripts/fresh-database.mjs";
import { lockTable, syncPoliticians } from "../steps";
import { BASE, expect, frame, story, test } from "./fixtures";
import { PM_LETTER, staffEmail, logIn, holdNextPage, loadingLine } from "./staff-steps";

// Finding your way round the staff pages: the dashboard's tiles, the sidebar
// folded and followed, a list sorted or searched, a politician's page,
// setting a status that shows on the public campaigns, and the new tag. Each flow on its own
// database.

test("Folding the sidebar", { tag: "@desktop-only" }, async ({ page, flowDatabase }) => {
  story("The sidebar lists the staff pages, each with its icon. A round button on its edge folds it.");
  await logIn(page, flowDatabase, ["supporters", "admin"]);
  await page.goto(`${BASE}/staff/politicians`);
  const nav = page.getByRole("navigation", { name: staffCopy.nav.title });
  await expect(nav.getByRole("link", { name: staffCopy.nav.supporters })).toBeVisible();
  await frame(page, "The sidebar");
  story("Folded, it's a strip of icons, each at the height it was, and the page is wider.");

  // Folding moves the icons sideways only: each stays at the height it was.
  const heights = () =>
    nav.locator("li svg, form svg").evaluateAll((icons) => icons.map((icon) => icon.getBoundingClientRect().top));
  const open = await heights();
  await nav.getByRole("button", { name: staffCopy.nav.fold }).click();
  await expect(nav.getByRole("button", { name: staffCopy.nav.unfold })).toBeVisible();
  await expect(nav.getByRole("heading", { name: staffCopy.nav.sections.admin })).toBeHidden();
  expect(await heights()).toEqual(open);
  await frame(page, "The sidebar, folded");
  story("Tabbing to an icon, or hovering over it, shows the page's name beside it.");

  // Hovered, not tabbed to: Chromium now and then took the focus from the link, natively, a second or so after
  // it was given, with nothing else focused, so a focused link's label was in some pictures and not others.
  const supporters = nav.getByRole("link", { name: staffCopy.nav.supporters });
  await supporters.hover();
  await expect
    .poll(() => supporters.locator("[class*=label]").evaluate((l) => l.getBoundingClientRect().width))
    .toBeGreaterThan(1);
  await frame(page, "A page's name", { hover: supporters });
  story("The next page opens with the sidebar still folded.");

  await nav.getByRole("link", { name: staffCopy.nav.supporters }).click();
  await expect(page).toHaveURL(`${BASE}/staff/supporters`);
  await expect(nav.getByRole("button", { name: staffCopy.nav.unfold })).toBeVisible();
  await frame(page, "The next page");
  story("The same button unfolds it.");

  await nav.getByRole("button", { name: staffCopy.nav.unfold }).click();
  await expect(nav.getByRole("heading", { name: staffCopy.nav.sections.admin })).toBeVisible();
});

test("Sorting and searching", async ({ page, flowDatabase }) => {
  story("Staff look at the test politicians, sorted by name, A to Z.");
  // The line along the top slides while it waits; held still, so each frame of it is the same.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await logIn(page, flowDatabase, ["supporters", "admin"]);
  await page.goto(`${BASE}/staff/politicians?flag=test`);
  await frame(page, "The test politicians");
  story(
    "Clicking Name again turns its arrow at once. The rows stay as they were, with a line along the top, until Z to A arrives.",
  );

  // A sort heading: its arrow turns at once; the rows stay as they were.
  let next = await holdNextPage(page, /sort=name&dir=desc/);
  const name = page.getByRole("table").getByRole("link", { name: staffCopy.fields.name });
  await name.click();
  await expect(name).toHaveAttribute("data-pending", "true");
  await expect(name).toContainText("▼");
  await expect.poll(() => loadingLine(page)).toBe(true);
  await frame(page, "Sorting Z to A");
  story("A search shows the same line along the top while it looks.");
  await next.release();
  await expect(page).toHaveURL(/sort=name&dir=desc/);
  await expect.poll(() => loadingLine(page)).toBe(false);

  // A search, sent from its box without leaving the page.
  next = await holdNextPage(page, /q=Testy/);
  await page.getByRole("searchbox").fill("Testy");
  await page.getByRole("button", { name: staffCopy.search }).click();
  await expect.poll(() => loadingLine(page)).toBe(true);
  await frame(page, "Searching");
  story("Then what it found.");
  await next.release();
  await expect(page).toHaveURL(/q=Testy/);
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(2);
  await frame(page, "The search's results");
});

test("Following a sidebar link", async ({ page, flowDatabase }) => {
  story(
    "Staff click Asks in the sidebar (on a phone, in the menu). The page is slow to come, so Asks is marked at once, and a line along the top shows it's on its way.",
  );
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
  await frame(page, "Asks, on its way");
  story("Then the Asks page arrives.");
  await release();
  await expect(page.getByRole("heading", { level: 1, name: staffCopy.asks.title })).toBeVisible();
  await frame(page, "The Asks page");
});

test("The dashboard's tabs and numbers", async ({ page, flowDatabase }) => {
  story("The dashboard shows the last week. A tab shows the last 30 days instead.");
  await logIn(page, flowDatabase, ["supporters", "admin"]);
  await page.goto(`${BASE}/staff`);
  await frame(page, "The dashboard");
  const tabs = page.getByRole("navigation", { name: staffCopy.home.dashboard.windows });
  await tabs.getByRole("link", { name: staffCopy.home.dashboard.window(30) }).click();
  await expect(tabs.getByRole("link", { name: staffCopy.home.dashboard.window(30) })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await frame(page, "The last 30 days");
  story("The events held tile leads to the past events.");
  await page.locator('a[href="/staff/events?when=past"]').click();
  await expect(page).toHaveURL(`${BASE}/staff/events?when=past`);
  await frame(page, "Past events");
  story("The letters tile leads to the letters in the sent emails.");
  await page.goto(`${BASE}/staff`);
  await page.locator('a[href="/staff/sent-emails?purpose=letter&link=campaign"]').click();
  await expect(page).toHaveURL(/\/staff\/sent-emails\?purpose=letter&link=campaign$/);
  await frame(page, "Letters in the sent emails");
});

test("The MPs signed tile", async ({ page, request, flowDatabase }) => {
  story(
    "An admin records that Polly Placeholder signed the Frontier AI letter to the Prime Minister. The dashboard's MPs signed tile counts her.",
  );
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase, ["admin"]);
  await page.goto(`${BASE}/staff/politicians`);
  await page.getByRole("link", { name: "Polly Placeholder" }).click();
  await page.getByRole("button", { name: staffCopy.politician.otherAsk }).click();
  await page
    .getByRole("list", { name: staffCopy.politician.otherAsk })
    .getByRole("button", { name: PM_LETTER })
    .click();
  const letter = page.getByRole("group", { name: PM_LETTER });
  await letter.getByRole("radio", { name: staffCopy.statuses.signed }).click();
  await letter.getByLabel(staffCopy.politician.note).fill("They emailed");
  await letter.getByRole("button", { name: staffCopy.politician.save }).click();
  await expect(letter.locator("[class*=answer]")).toHaveText(new RegExp(`^${staffCopy.statuses.signed}`));

  // One signed this week: the tile is their page.
  await page.goto(`${BASE}/staff`);
  const tile = page.getByRole("link").filter({ hasText: staffCopy.home.dashboard.metrics.mpsSigned(1) });
  await frame(page, "The dashboard");
  story("With one MP signed, the tile leads to her page.");
  await tile.click();
  await expect(page.getByRole("heading", { level: 1, name: "Polly Placeholder" })).toBeVisible();
  await frame(page, "Polly Placeholder's page");
  story(
    "Importing ControlAI's letter records another signature. Now the tile leads to the politicians list of everyone who signed anything, the latest recorded first.",
  );

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
  await frame(page, "Everyone who signed");
});

test("A test MP's page", async ({ page, request, flowDatabase }) => {
  story("Staff open the test MP's page. It's marked as a test MP, says what they are, and has no history yet.");
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  await page.goto(`${BASE}/staff/politicians?flag=test`);
  await page.getByRole("link", { name: "Testy McTestface MP" }).click();
  // Their name, tagged as a test MP, and what they are; nothing in their history yet.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Testy McTestface MP");
  await expect(page.getByText(staffCopy.politicians.flags.test, { exact: true })).toBeVisible();
  await expect(
    page.getByText(staffCopy.politician.role(staffCopy.politician.roles.commons, "Testshire", true)),
  ).toBeVisible();
  await expect(page.getByText(staffCopy.politician.sources.test)).toBeVisible();
  await expect(page.getByText(staffCopy.politician.noHistory)).toBeVisible();
  await frame(page, "The test MP's page");
  story(
    "The link above their name goes back to the politicians list. Clicking Constituency twice sorts the list by constituency, Z to A.",
  );

  // The way back, above the name; then the list sorted by a heading, and reversed.
  await page.getByRole("navigation", { name: staffCopy.nav.politicians }).getByRole("link").click();
  await expect(page).toHaveURL(`${BASE}/staff/politicians`);
  await page.getByRole("link", { name: staffCopy.fields.constituency }).click();
  await expect(page).toHaveURL(/sort=constituency&dir=asc/);
  await page.getByRole("link", { name: staffCopy.fields.constituency }).click();
  await expect(page).toHaveURL(/sort=constituency&dir=desc/);
  await frame(page, "The politicians, by constituency");
});

test("An MP signs", async ({ page, request, flowDatabase }) => {
  story("An admin logs in, and lands on the dashboard.");
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase, ["admin"]);
  // Logging in lands on the home page: the dashboard, with this admin's permission under their address in the sidebar.
  await expect(page).toHaveURL(`${BASE}/staff`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(staffCopy.home.title);
  await expect(page.getByText(staffEmail()).first()).toBeAttached();
  await expect(
    page.getByRole("main").getByRole("heading", { level: 2, name: staffCopy.nav.sections.politicians }),
  ).toBeVisible();
  await frame(page, "The dashboard");
  story("They open Politicians from the sidebar (on a phone, from the menu). The test politicians are left out.");

  // The pages are in the sidebar; on a phone, behind the bar's menu.
  const politicians = page.getByRole("link", { name: staffCopy.nav.politicians });
  if (!(await politicians.first().isVisible())) await page.locator("nav details > summary").click();
  await politicians.filter({ visible: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(staffCopy.politicians.title);
  // The test politicians are left out until the Marked filter asks for them.
  await expect(page.getByRole("link", { name: "Polly Placeholder" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Testy McTestface MP" })).toHaveCount(0);
  await frame(page, "The politicians list");
  story("Polly Placeholder's page shows the asks she has answered beside her details.");

  // Signed on their page, in the ask's row of the panel beside their details, with a note.
  await page.getByRole("link", { name: "Polly Placeholder" }).click();
  // Her page, not the list still showing while it loads: no card for the letter is true of both.
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Polly Placeholder");
  const card = page.getByRole("group", { name: PM_LETTER });
  await expect(card).toHaveCount(0);
  await frame(page, "Polly Placeholder's page");
  story("Add another answer opens a form for the Frontier AI letter. They choose Signed, with a note of how we know.");
  await page.getByRole("button", { name: staffCopy.politician.otherAsk }).click();
  await page
    .getByRole("list", { name: staffCopy.politician.otherAsk })
    .getByRole("button", { name: PM_LETTER })
    .click();
  await card.getByRole("radio", { name: staffCopy.statuses.signed }).click();
  await card.getByLabel(staffCopy.politician.note).fill("Told us at the march");
  await frame(page, "The answer's form");
  story("Saved, her page shows she signed, with the note.");
  await card.getByRole("button", { name: staffCopy.politician.save }).click();
  await expect(card.locator("[class*=answer]")).toHaveText(new RegExp(`^${staffCopy.statuses.signed}`));
  await expect(card.getByText(/Told us at the march/)).toBeVisible();
  await frame(page, "Polly Placeholder, signed");
  story("The politicians list shows it too.");
  await page.getByRole("link", { name: staffCopy.nav.politicians }).first().click();
  const pollyRow = page.getByRole("row").filter({ hasText: "Polly Placeholder" });
  await expect(pollyRow).toContainText(PM_LETTER);
  await expect(pollyRow.getByRole("button")).toHaveCount(0);
  await frame(page, "The politicians list, with her signature");
  story("The campaign page lists her among the signatories.");

  const signed = await (await request.get(`${BASE}/api/signatories`)).json();
  expect(signed).toContainEqual(expect.objectContaining({ name: "Polly Placeholder", house: "commons" }));
  await page.goto(`${BASE}/campaigns`);
  await expect(page.locator("#signatories").getByText("Polly Placeholder")).toBeVisible();
  await frame(page, "/campaigns");
  story("The audit log records the change. Its {} button shows what was logged.");

  await page.goto(`${BASE}/staff/audit-log`);
  await expect(page.getByRole("cell", { name: "set status" }).first()).toBeVisible();
  await frame(page, "The audit log");
  await page.getByRole("button", { name: staffCopy.changes.json }).first().click();
  await expect(page.locator(":popover-open")).toBeVisible();
  await frame(page, "What was logged", { window: true });
  await page.keyboard.press("Escape");

  // The import page: a card per job; each opens the job's own page.
  story("The Import data page has a card for each import.");
  await page.goto(`${BASE}/staff/import-data`);
  await frame(page, "The Import data page");
  story("ControlAI's import reads the signatures on their letter, which Polly Placeholder has signed.");
  await page.getByRole("link", { name: jobTitles["import-controlai"] }).click();
  await expect(page).toHaveURL(`${BASE}/staff/import-data/controlai`);

  // The fixture ControlAI letter is signed by Polly Placeholder MP, so the bill's column says so.
  await page.getByRole("button", { name: staffCopy.controlAi.importNow }).click();
  await expect(page.getByText(/6 names/)).toBeVisible();
  await frame(page, "ControlAI's letter, imported");
  story("The politicians list says she signed ControlAI's campaign statement.");
  await page.goto(`${BASE}/staff/politicians`);
  await expect(page.getByRole("row").filter({ hasText: "Polly Placeholder" })).toContainText(
    "ControlAI's campaign statement",
  );
  await frame(page, "The politicians list, with ControlAI's letter");
  story("The MP check finds Polly Placeholder has an email in Airtable that Parliament doesn't list.");

  // The fixture Airtable gives Polly Placeholder an email Parliament doesn't list.
  await page.goto(`${BASE}/staff/import-data/mp-check`);
  await page.getByRole("button", { name: staffCopy.check.checkNow }).click();
  const blake = page.getByRole("row").filter({ hasText: "Cities of London and Westminster" });
  await expect(blake).toContainText(staffCopy.check.kinds.email);
  await expect(blake).toContainText("polly.placeholder.mp@parliament.uk");
  await frame(page, "The MP check");
  story("They log out (on a phone, from the menu), and the staff pages ask them to log in again.");

  // On a phone the navigation and Log out are behind the bar's menu.
  const logout = page.getByRole("button", { name: staffCopy.nav.logout });
  if (!(await logout.first().isVisible())) {
    await page.locator("nav details > summary").click();
    await frame(page, "The staff menu");
  }
  await logout.filter({ visible: true }).click();
  await expect(page).toHaveURL(`${BASE}/staff/login`);
  await frame(page, "The login page");
  await page.goto(`${BASE}/staff`);
  await expect(page).toHaveURL(`${BASE}/staff/login`);
});

test("The new tag", { tag: "@desktop-only" }, async ({ page, flowDatabase }) => {
  story("A page someone first saw in the last 3 days is marked new.");
  await logIn(page, flowDatabase, ["admin", "supporters"]);
  const email = runSql(flowDatabase, "SELECT email FROM staff_sessions ORDER BY created_at DESC LIMIT 1")[0];
  runSql(
    flowDatabase,
    `UPDATE staff_nav_seen SET first_seen_at = now() WHERE email = '${email}' AND page IN ('campaigns', 'sentEmails')`,
  );
  await page.goto(`${BASE}/staff`);
  const nav = page.getByRole("navigation", { name: staffCopy.nav.title }).first();
  await expect(
    nav.getByRole("link", { name: `${staffCopy.nav.campaigns} ${staffCopy.nav.newTag}` }).first(),
  ).toBeVisible();
  await frame(page, "New in the menu");

  story("With the menu folded to a rail of icons, a dot says the same.");
  await nav.getByRole("button", { name: staffCopy.nav.fold }).click();
  await expect(nav.getByRole("button", { name: staffCopy.nav.unfold })).toBeVisible();
  await frame(page, "New on the rail");
  await nav.getByRole("button", { name: staffCopy.nav.unfold }).click();

  story("Three days later, it's gone.");
  runSql(flowDatabase, `UPDATE staff_nav_seen SET first_seen_at = now() - interval '4 days' WHERE email = '${email}'`);
  await page.reload();
  await expect(nav.getByRole("link", { name: staffCopy.nav.campaigns }).first()).not.toContainText(
    staffCopy.nav.newTag,
  );
  await frame(page, "No longer new");
});

test("The new tag on a phone", { tag: "@phone-only" }, async ({ page, flowDatabase }) => {
  story("On a phone, the menu that drops down marks the same pages.");
  await logIn(page, flowDatabase, ["admin", "supporters"]);
  const email = runSql(flowDatabase, "SELECT email FROM staff_sessions ORDER BY created_at DESC LIMIT 1")[0];
  runSql(
    flowDatabase,
    `UPDATE staff_nav_seen SET first_seen_at = now() WHERE email = '${email}' AND page = 'campaigns'`,
  );
  await page.goto(`${BASE}/staff`);
  await page.getByRole("group").locator("summary").click();
  await expect(page.getByRole("group").getByRole("link", { name: staffCopy.nav.campaigns })).toContainText(
    staffCopy.nav.newTag,
  );
  await frame(page, "New in the phone's menu", { window: true });
});
