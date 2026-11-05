import type { Page } from "@playwright/test";
import { jobTitles, staffCopy } from "@/lib/content/staff-interface";
import { runSql } from "@/scripts/fresh-database.mjs";
import { addFilter, addStaffAccount, changeFilter, logInAsStaff, syncPoliticians } from "../steps";
import { BASE, expect, frame, story, test } from "./fixtures";
import { chooseDay, importEmails, PM_LETTER } from "./staff-steps";

// The politicians from Airtable: every body, their answers to the asks, and
// PauseAI's emails to them, as the nightly sync copies them from the fixture
// Airtable (tests/fixtures/airtable-*.json); the asks page; and the one-off
// imports of pauseai.info's letters and Go to Parliament's meetings.

const copy = staffCopy.politician;

/** This flow's own staff address: flows run alongside each other, and share the outbox. */
const staffEmail = () => `pol-${test.info().testId.replace(/\W/g, "").slice(-8)}@pauseai.uk`;

async function logIn(page: Page, database: string, permissions: string[] = []) {
  addStaffAccount(database, staffEmail(), permissions);
  return logInAsStaff(page, BASE, staffEmail());
}

/** Opens a politician's page from the list of everyone, in office or not. */
async function openPolitician(page: Page, name: string) {
  await page.goto(`${BASE}/staff/politicians?status=any`);
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(name);
}

test("A politician's page", async ({ page, request, flowDatabase }) => {
  story(
    "Staff open Polly Placeholder's page. It shows her markers, the notes kept on her in Airtable, her answers to the asks and the emails PauseAI has sent her.",
  );
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  await importEmails(page);
  await openPolitician(page, "Polly Placeholder");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Polly Placeholder");
  await expect(page.getByText(copy.importantTarget, { exact: true })).toBeVisible();
  await expect(page.getByText("Met at the example fair.")).toBeVisible();
  const asks = page.getByRole("region", { name: copy.statusesTitle });
  // ControlAI's campaign statement and her answer to the conference, both from Airtable.
  await expect(asks.getByText(staffCopy.statuses.declined)).toBeVisible();
  await expect(asks.getByText(copy.fromImport.airtable).first()).toBeVisible();
  // The conference's invitation, personalised.
  await expect(page.getByText(copy.personalised, { exact: false }).first()).toBeVisible();
  await frame(page, "Polly's page");
});

test("A note on a politician", async ({ page, request, flowDatabase }) => {
  story("Staff write a note on Polly's page, at the top of her history.");
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  await openPolitician(page, "Polly Placeholder");
  const history = page.getByRole("region", { name: copy.historyTitle });
  await history.getByRole("button", { name: staffCopy.notes.write }).click();
  await history
    .getByRole("textbox", { name: staffCopy.notes.note })
    .fill("Her office says write to www.example.org/contact");
  await frame(page, "The note, written");
  story(
    "Once added, the note is the newest thing in her history, and the web address in it is a link. Airtable's notes on her stay where they were, beside it.",
  );
  await history.getByRole("button", { name: staffCopy.notes.add }).click();
  const note = history.getByRole("listitem").filter({ hasText: "Her office says" });
  await expect(note.getByRole("link", { name: "www.example.org/contact" })).toHaveAttribute(
    "href",
    "https://www.example.org/contact",
  );
  // Airtable's notes stay beside the history, the sync's to change.
  await expect(page.getByRole("region", { name: copy.notes })).toContainText("Met at the example fair.");
  await frame(page, "The note in Polly's history");
});

test("An answer to a new ask", async ({ page, request, flowDatabase }) => {
  story(
    "Staff have added an ask of their own, a letter about a giant pause button. Polly has no answer to it yet, so it isn't among her asks.",
  );
  runSql(
    flowDatabase,
    `INSERT INTO asks (slug, title, kind, date, asked_by)
     VALUES ('giant-pause-button-oct-2026', 'Giant pause button', 'letter', '2026-10-29', '{pauseai}')`,
  );
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  await openPolitician(page, "Polly Placeholder");
  const asks = page.getByRole("region", { name: copy.statusesTitle });
  await expect(asks.getByRole("group", { name: "Giant pause button" })).toHaveCount(0);
  await frame(page, "Polly's asks");
  story("Add another answer, under her asks, lists the other asks staff can record an answer to.");
  await asks.getByRole("button", { name: copy.otherAsk }).click();
  const menu = page.getByRole("list", { name: copy.otherAsk });
  await expect(menu.getByRole("button", { name: "Giant pause button" })).toBeVisible();
  await frame(page, "The other asks", { window: true });
  story("Choosing one adds a row for it, like the others, with no answer yet. Staff note how they know her answer.");
  await menu.getByRole("button", { name: "Giant pause button" }).click();
  const row = asks.getByRole("group", { name: "Giant pause button" });
  await expect(row.locator("[class*=answer]")).toHaveText(new RegExp(`^${staffCopy.statuses.noAnswer}`));
  await row.getByLabel(copy.note).fill("Said yes on the phone");
  await frame(page, "The new row, with a note", { window: true });
  story("She signed it. Once saved, the answer and its note show like any other.");
  await row.getByRole("radio", { name: staffCopy.statuses.signed }).click();
  await row.getByRole("button", { name: copy.save }).click();
  await expect(row.locator("[class*=answer]")).toHaveText(new RegExp(`^${staffCopy.statuses.signed}`));
  await expect(row.getByText(/Said yes on the phone/)).toBeVisible();
  await frame(page, "The answer, saved");
});

test("A declined letter, then cleared", async ({ page, request, flowDatabase }) => {
  story("Polly hasn't answered the letter to the Prime Minister, so it has no row among her asks.");
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  await openPolitician(page, "Polly Placeholder");
  const asks = page.getByRole("region", { name: copy.statusesTitle });
  await expect(asks.getByRole("group", { name: PM_LETTER })).toHaveCount(0);
  await frame(page, "Polly's asks");
  story("Her office says no. Staff add the letter from Add another answer, choose Declined and note how they know.");
  await asks.getByRole("button", { name: copy.otherAsk }).click();
  await page.getByRole("list", { name: copy.otherAsk }).getByRole("button", { name: PM_LETTER }).click();
  const row = asks.getByRole("group", { name: PM_LETTER });
  await row.getByRole("radio", { name: staffCopy.statuses.declined }).click();
  await row.getByLabel(copy.note).fill("Their office said no");
  await frame(page, "Declined, with a note", { window: true });
  story("Once saved, the answer shows with its note under it, and goes into her history.");
  await row.getByRole("button", { name: copy.save }).click();
  await expect(row.locator("[class*=answer]")).toHaveText(new RegExp(`^${staffCopy.statuses.declined}`));
  await expect(page.getByRole("region", { name: copy.historyTitle })).toContainText(staffCopy.statuses.declined);
  await frame(page, "The letter, declined");

  story(
    "It was entered by mistake. Staff clear the answer, with a note saying why. The row goes, and her history says the answer was cleared.",
  );
  await row.getByText(copy.edit, { exact: true }).click();
  await row.getByRole("radio", { name: copy.clearAnswer }).click();
  await row.getByLabel(copy.note).fill("Entered by mistake");
  await row.getByRole("button", { name: copy.save }).click();
  await expect(asks.getByRole("group", { name: PM_LETTER })).toHaveCount(0);
  await expect(page.getByRole("region", { name: copy.historyTitle })).toContainText(copy.statusCleared.before);
  await expect(page.getByRole("region", { name: copy.historyTitle })).toContainText("Entered by mistake");
  await frame(page, "The answer, cleared");
});

test("Peers, MSPs and former MPs", async ({ page, request, flowDatabase }) => {
  story(
    "Politicians come from every body, not only the Commons. Lord Seedling is a peer who signed the DeepMind letter.",
  );
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  await openPolitician(page, "Lord Seedling of Example");
  await expect(page.getByText(copy.role(copy.roles.lords, null, true), { exact: true })).toBeVisible();
  await frame(page, "Lord Seedling's page");

  story(
    "Morag Example is an MSP and a personal connection. She was invited to the Edinburgh conference, and is going.",
  );
  await openPolitician(page, "Morag Example");
  await expect(page.getByText(copy.personalConnection, { exact: true })).toBeVisible();
  await expect(page.getByText(`${copy.country}${staffCopy.countries.scotland}`)).toBeVisible();
  await frame(page, "Morag's page");

  story("Gordon Gone has left the Commons. He's kept, as a former MP.");
  await openPolitician(page, "Gordon Gone");
  await expect(page.getByText(copy.role(copy.roles.commons, "Former Seat", false), { exact: true })).toBeVisible();
  await frame(page, "Gordon's page");
});

test("Filtering politicians", async ({ page, request, flowDatabase }) => {
  story(
    "The politicians list starts with those in office. + Filter offers the rest of the filters, and each applies as soon as it's chosen.",
  );
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  await page.goto(`${BASE}/staff/politicians`);
  const filters = staffCopy.politicians;
  const rows = page.getByRole("row");
  // Those in office, to start; + Filter offers the rest, each applying as soon as it's chosen.
  await expect(rows.filter({ hasText: "Polly Placeholder" })).toBeVisible();
  await expect(rows.filter({ hasText: "Rita Retired" })).toHaveCount(0);
  await page.getByRole("button", { name: staffCopy.filters.add }).click();
  await frame(page, "The filters");
  story("Staff pick those who retired. The filter becomes a chip above the list.");
  await page.keyboard.press("Escape");
  await addFilter(page, filters.status, staffCopy.personStatuses.retired);
  await expect(page).toHaveURL(/status=retired/);
  await expect(rows.filter({ hasText: "Rita Retired" })).toBeVisible();
  await expect(rows.filter({ hasText: "Polly Placeholder" })).toHaveCount(0);
  await frame(page, "The politicians who retired");

  story("They take that filter off, and filter by a marker: personal connections.");
  await changeFilter(page, `${filters.status}: ${staffCopy.personStatuses.retired}`);
  await expect(page).toHaveURL(`${BASE}/staff/politicians`);
  await addFilter(page, filters.flag, filters.flags.connection);
  await expect(page).toHaveURL(/flag=connection/);
  await expect(rows.filter({ hasText: "Morag Example" })).toBeVisible();
  await expect(rows).toHaveCount(2);
  await frame(page, "The personal connections");

  story("Except this instead, in the chip's menu, turns it round: everyone but the personal connections.");
  // A chip's menu turns its choice to one the list leaves out.
  await changeFilter(page, `${filters.flag}: ${filters.flags.connection}`, staffCopy.filters.exceptInstead);
  await expect(page).toHaveURL(/flag=%21connection/);
  await expect(rows.filter({ hasText: "Morag Example" })).toHaveCount(0);
  await expect(rows.filter({ hasText: "Polly Placeholder" })).toBeVisible();
  await frame(page, "Everyone but the personal connections");

  story("Next, an ask: the Edinburgh conference. Its chip has a second half, for the answer.");
  await changeFilter(page, staffCopy.filters.notChip(filters.flag, filters.flags.connection));
  await expect(page).toHaveURL(`${BASE}/staff/politicians`);
  await addFilter(page, filters.ask, "Edinburgh conference");
  await expect(page).toHaveURL(/ask=edinburgh-conference-2026$/);
  await frame(page, "The Edinburgh conference's chip");
  story("Staff choose those with no answer yet. Clear filters then brings back the whole list.");
  // The answer is chosen in the second half of the ask's chip.
  await changeFilter(page, filters.anyAnswer, filters.noAnswer);
  await expect(page).toHaveURL(/ask=edinburgh-conference-2026&answer=none/);
  await expect(rows.filter({ hasText: "Polly Placeholder" })).toHaveCount(0);
  await expect(rows.filter({ hasText: "Ms Dora Dummy" })).toBeVisible();
  await frame(page, "No answer to the conference yet");

  await page.getByRole("link", { name: staffCopy.resetFilters }).click();
  await expect(page).toHaveURL(`${BASE}/staff/politicians`);
  await expect(rows.filter({ hasText: "Polly Placeholder" })).toBeVisible();
});

test("The house tabs", async ({ page, request, flowDatabase }) => {
  story(
    "Staff look at every politician, in office or not, then pick a house from the tabs. The filters they chose stay.",
  );
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  await page.goto(`${BASE}/staff/politicians?status=any`);
  const houses = page.getByRole("navigation", { name: staffCopy.fields.house });
  const rows = page.getByRole("row");
  await expect(houses.getByRole("link", { name: staffCopy.politicians.allHouses })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await frame(page, "Every house");

  story("In the Commons tab every row is an MP, so there's no column for the house.");
  await houses.getByRole("link", { name: staffCopy.houses.commons }).click();
  await expect(page).toHaveURL(/house=commons&status=any/);
  await expect(rows.filter({ hasText: "Gordon Gone" })).toBeVisible();
  await expect(rows.filter({ hasText: "Morag Example" })).toHaveCount(0);
  // Every row is in the Commons, so there's no column saying so.
  await expect(page.getByRole("columnheader", { name: staffCopy.fields.house })).toHaveCount(0);
  await frame(page, "The Commons");

  await houses.getByRole("link", { name: staffCopy.houses["scottish-parliament"] }).click();
  await expect(rows.filter({ hasText: "Morag Example" })).toBeVisible();
  await expect(rows).toHaveCount(2);
  await frame(page, "The Scottish Parliament");
});

test("Pages of politicians, and Download", async ({ page, flowDatabase }) => {
  story("With 250 MPs, the list says how many there are and which are shown, a hundred to a page.");
  // 250 made-up MPs, the test MPs left out: three pages.
  runSql(
    flowDatabase,
    `WITH n AS (
       INSERT INTO notable_people (kind, name, salutation, status)
       SELECT 'politician', 'Example Member ' || lpad(i::text, 3, '0'), '', 'in_office' FROM generate_series(1, 250) i
       RETURNING id
     ) INSERT INTO politicians (id, house, constituency, party)
       SELECT id, 'commons', 'Exampleton ' || id, (ARRAY['Labour', 'Conservative', 'Green'])[1 + id % 3] FROM n`,
  );
  await logIn(page, flowDatabase);
  await page.goto(`${BASE}/staff/politicians?status=any`);
  const copy = staffCopy.politicians;
  await expect(page.getByText(copy.total(250))).toBeVisible();
  await frame(page, "The politicians list");
  story("Download gets every one of them, not only this page, as a spreadsheet, JSON or vCards for WhatsApp.");
  await page.getByRole("button", { name: staffCopy.lists.download }).click();
  const csv = page.getByRole("link", { name: staffCopy.lists.formats.csv });
  await expect(csv).toHaveAttribute("href", "/staff/politicians/download?status=any&format=csv");
  await frame(page, "Download's menu");
  // Every page of them, a line each under the headings.
  const file = await page.request.get(`${BASE}/staff/politicians/download?status=any&format=csv`);
  expect((await file.text()).trim().split("\r\n")).toHaveLength(251);
  story("At the foot of the list are the links to the other pages.");
  await page.keyboard.press("Escape");
  const pages = page.getByRole("navigation", { name: staffCopy.paging.label });
  await pages.scrollIntoViewIfNeeded();
  await frame(page, "The first page's foot");

  await pages.getByRole("link", { name: staffCopy.paging.next }).click();
  await expect(page).toHaveURL(/status=any&page=2/);
  await expect(page.getByText(staffCopy.paging.range(101, 200, 250))).toBeVisible();
  await frame(page, "The second page");

  story("The last page has no Next. Picking another house starts again from the first page.");
  // On to the last: by its number, or on a phone, where the numbers give way to "Page 2 of 3", by Next.
  const last = page.getByRole("navigation", { name: staffCopy.paging.label }).getByRole("link", {
    name: staffCopy.paging.page(3),
  });
  await ((await last.isVisible()) ? last : pages.getByRole("link", { name: staffCopy.paging.next })).click();
  await expect(page).toHaveURL(/status=any&page=3/);
  await expect(page.getByText(staffCopy.paging.range(201, 250, 250))).toBeVisible();
  await frame(page, "The last page");

  // Another house starts from the first page.
  await page
    .getByRole("navigation", { name: staffCopy.fields.house })
    .getByRole("link", { name: staffCopy.houses.lords })
    .click();
  await expect(page).toHaveURL(`${BASE}/staff/politicians?house=lords&status=any`);
});

test("Searching politicians", async ({ page, request, flowDatabase }) => {
  story('A search can mix words from a name and a constituency. "Pol Westminster" finds Polly.');
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  await page.goto(`${BASE}/staff/politicians`);
  const copy = staffCopy.politicians;
  const rows = page.getByRole("row");
  const search = async (text: string) => {
    await page.getByRole("searchbox").fill(text);
    await page.getByRole("button", { name: staffCopy.search }).click();
    await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent(text).replace(/%20/g, "\\+")}`));
  };
  await search("Pol Westminster");
  await expect(rows.filter({ hasText: "Polly Placeholder" })).toBeVisible();
  await expect(rows).toHaveCount(2);
  await frame(page, "The search for Polly");

  story(
    "No one in office is an Independent. The page says two politicians who left office match, and one click shows them.",
  );
  await search("Independent");
  await expect(page.getByText(copy.none)).toBeVisible();
  await page.getByRole("link", { name: copy.outOfOffice(2) }).click();
  await expect(page).toHaveURL(/q=Independent&status=any/);
  await expect(rows.filter({ hasText: "Rita Retired" })).toBeVisible();
  await expect(rows.filter({ hasText: "Gordon Gone" })).toBeVisible();
  await frame(page, "Independents not in office");

  await page.goto(`${BASE}/staff/politicians`);
  story("A misspelt name matches no one exactly, so the closest names are offered.");
  await search("Dorra Dumy");
  await expect(page.getByText(copy.closest)).toBeVisible();
  await expect(rows.filter({ hasText: "Ms Dora Dummy" })).toBeVisible();
  await frame(page, "Close matches");

  await page.goto(`${BASE}/staff/politicians?house=lords`);
  story("No one in the Lords is called Morag. One politician in another house is, and one click shows her.");
  await search("Morag");
  await expect(page.getByText(copy.none)).toBeVisible();
  await page.getByRole("link", { name: copy.otherHouses(1) }).click();
  await expect(page).toHaveURL(/q=Morag$/);
  await expect(rows.filter({ hasText: "Morag Example" })).toBeVisible();
  await frame(page, "Morag, from another house");

  await page.goto(`${BASE}/staff/politicians`);
  story("Test politicians are left out of a search, but the page says one matches, and one click shows them.");
  await search("Testy McTestface");
  await page.getByRole("link", { name: copy.tests(1) }).click();
  await expect(page).toHaveURL(/q=Testy\+McTestface&flag=test$/);
  await expect(rows.filter({ hasText: "Testy McTestface MP" })).toBeVisible();
  await frame(page, "The test MP");
});

test("Deleting a politician", async ({ page, request, flowDatabase }) => {
  story("Rita Retired is gone from Airtable, so staff can delete her. Anyone still in Airtable has no Delete button.");
  await syncPoliticians(request, BASE);
  runSql(flowDatabase, "UPDATE notable_people SET airtable_removed_at = now() WHERE name = 'Rita Retired'");
  await logIn(page, flowDatabase);
  // Anyone still in Airtable can't be.
  await openPolitician(page, "Polly Placeholder");
  await expect(page.getByRole("button", { name: copy.delete.button, exact: true })).toHaveCount(0);

  await openPolitician(page, "Rita Retired");
  await page.getByRole("button", { name: copy.delete.button, exact: true }).scrollIntoViewIfNeeded();
  await frame(page, "The foot of Rita's page");

  story("Delete asks to be pressed a second time.");
  await page.getByRole("button", { name: copy.delete.button, exact: true }).click();
  await expect(page.getByRole("button", { name: staffCopy.deleteIt })).toBeFocused();
  await frame(page, "Delete, pressed once", { window: true });
  story("Pressed again, she's deleted, and gone from the list of everyone.");

  await page.getByRole("button", { name: staffCopy.deleteIt }).click();
  await expect(page).toHaveURL(`${BASE}/staff/politicians`);
  await page.goto(`${BASE}/staff/politicians?status=any`);
  await expect(page.getByRole("link", { name: "Rita Retired" })).toHaveCount(0);
  await frame(page, "The politicians list, without Rita");
});

test("Mailings", async ({ page, request, flowDatabase }) => {
  story(
    "The mailings page lists every mailing PauseAI has sent politicians, by month, newest first. These were copied from Airtable.",
  );
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  const mailings = staffCopy.mailings;
  await importEmails(page);
  await page.goto(`${BASE}/staff/mailings`);
  const invitation = "Edinburgh Conference Nov 26 Invitation";
  await expect(page.getByRole("listitem").filter({ hasText: invitation })).toContainText(mailings.imported);
  await frame(page, "The mailings");

  story(
    "The Edinburgh conference invitation has no text, as Airtable kept none. Its page lists who it went to. A politician's history links back to it too.",
  );
  // Its title, not its box of counts, whose name says the title too.
  await page.getByRole("link", { name: invitation, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(invitation);
  await expect(page.getByText(mailings.noText)).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Polly Placeholder" })).toContainText(mailings.personalised);
  await frame(page, "The invitation's page");

  await page.getByRole("link", { name: "Polly Placeholder" }).click();
  await page.getByRole("list", { name: copy.historyTitle }).getByRole("link", { name: invitation }).click();
  await expect(page).toHaveURL(/\/staff\/mailings\/\d+$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(invitation);
});

test("From a mailing to its ask", async ({ page, request, flowDatabase }) => {
  story("A mailing names its ask. Following it from the invitation opens the Edinburgh conference's own page.");
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  await page.goto(`${BASE}/staff/mailings`);
  await page
    .getByRole("listitem")
    .filter({ hasText: "Edinburgh Conference Nov 26 Invitation" })
    .getByRole("link", { name: "Edinburgh conference", exact: true })
    .click();
  await expect(page).toHaveURL(`${BASE}/staff/asks/edinburgh-conference-2026`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Edinburgh conference");
  await frame(page, "The conference's page");
  story("On the asks page, each answer's count is a link to the politicians who gave it. One is going.");
  await page.goto(`${BASE}/staff/asks`);
  await page.getByRole("link", { name: staffCopy.asks.count(staffCopy.statuses.going, 1) }).click();
  await expect(page).toHaveURL(/ask=edinburgh-conference-2026&answer=going/);
  await expect(page.getByRole("row").filter({ hasText: "Morag Example" })).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(2);
  await frame(page, "The politicians going");
});

test("Who has been mailed", async ({ page, request, flowDatabase }) => {
  story("Staff filter the politicians list by who was mailed about the Edinburgh conference.");
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  await importEmails(page);
  await page.goto(`${BASE}/staff/politicians?mailed=edinburgh-conference-2026`);
  await expect(page.getByRole("row").filter({ hasText: "Polly Placeholder" })).toBeVisible();
  await frame(page, "Mailed about the conference");
  story("With Except, the list is those not mailed yet: the ones to mail next.");
  await page.goto(`${BASE}/staff/politicians?mailed=!edinburgh-conference-2026`);
  await expect(page.getByRole("row").filter({ hasText: "Polly Placeholder" })).toHaveCount(0);
  await frame(page, "Not mailed about the conference");
});

test("A new ask", async ({ page, flowDatabase }) => {
  story("Staff add an ask from the asks page: an event, a winter reception.");
  await logIn(page, flowDatabase);
  const asks = staffCopy.asks;
  await page.goto(`${BASE}/staff/asks`);
  await frame(page, "The asks");
  await page.getByRole("link", { name: asks.newTitle }).click();
  await page.getByRole("radio", { name: asks.kinds.event }).click();
  await page.getByLabel(asks.byKind.event.title).fill("Winter reception");
  await chooseDay(page, asks.byKind.event.date, "2026-12-09");
  await frame(page, "The new ask, filled in");
  await page.getByRole("button", { name: asks.save }).click();
  await expect(page.getByText(asks.notices.added)).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Winter reception" })).toBeVisible();
  await frame(page, "The ask, added");

  story("They edit it to add the event's web address. Its title links there.");
  await page.getByRole("row").filter({ hasText: "Winter reception" }).getByRole("link", { name: asks.edit }).click();
  await expect(page.getByText("winter-reception-dec-2026", { exact: true })).toBeVisible();
  await page.getByLabel(asks.byKind.event.url).fill("https://luma.com/winter");
  await page.getByRole("button", { name: asks.save }).click();
  // Back on the list, saying so: the link alone can be there before the list is what's shown.
  await expect(page.getByText(asks.notices.saved)).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(asks.title);
  await expect(page.getByRole("link", { name: "Winter reception" })).toHaveAttribute(
    "href",
    "/staff/asks/winter-reception-dec-2026",
  );
  await frame(page, "The ask, changed");
  story("Then they delete it. Delete asks to be pressed a second time.");
  await page.getByRole("row").filter({ hasText: "Winter reception" }).getByRole("link", { name: asks.edit }).click();
  await page.getByRole("button", { name: asks.delete }).click();
  await expect(page.getByRole("button", { name: staffCopy.deleteIt })).toBeFocused();
  await frame(page, "Delete, pressed once", { window: true });
  await page.getByRole("button", { name: staffCopy.deleteIt }).click();
  await expect(page.getByText(asks.notices.deleted)).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Winter reception" })).toHaveCount(0);
  await frame(page, "The ask, deleted");
});

test("PauseAI's emails to politicians", async ({ page, request, flowDatabase }) => {
  story(
    "Staff press Import emails now, which copies PauseAI's emails to politicians from Airtable. Its page shows five copied, and one left out, as it belongs to no mailing we know.",
  );
  await syncPoliticians(request, BASE);
  // With no permissions: PauseAI's letters are the politicians section's.
  await logIn(page, flowDatabase);
  await importEmails(page);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(jobTitles["sync-emails"]);
  await expect(page.getByText("recEmailNewBox", { exact: false }).first()).toBeVisible();
  await frame(page, "The emails import's page");
  story("Pressing it again finds nothing new.");
  await page.getByRole("button", { name: staffCopy.pauseaiEmails.importNow }).click();
  await expect(page.getByText(staffCopy.runs.status.incomplete)).toHaveCount(2);
  expect(runSql(flowDatabase, "SELECT count(*) FROM letters_from_pauseai")).toEqual(["5"]);

  story("Each email is in its politician's history, and has its own page under its mailing.");
  // Each is in its MP's history, leading to its own page under its mailing, and from there to a Gmail search for it,
  // in a mailbox Airtable didn't say.
  await page.goto(`${BASE}/staff/politicians`);
  await page.getByRole("link", { name: "Polly Placeholder" }).click();
  const history = page.getByRole("list", { name: staffCopy.politician.historyTitle });
  await history.getByRole("link", { name: staffCopy.letters.status.sent }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    staffCopy.letters.oneTitle(staffCopy.letters.fromPauseai, "Polly Placeholder"),
  );
  await expect(page).toHaveURL(/\/staff\/mailings\/\d+\/letters\/\d+$/);
  await frame(page, "PauseAI's email to Polly");
  story(
    "Copy Gmail search copies a search for it by Polly's address and when it went. Airtable didn't say which mailbox sent it, so the page says to look in one that did.",
  );
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: staffCopy.findInGmail.copy }).click();
  await expect(page.getByRole("status")).toContainText(staffCopy.findInGmail.whereUnknown);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/^to:polly\S+ after:\d+ before:\d+$/);
  await frame(page, "The search, copied");
});

test("pauseai.info's letters and Go to Parliament's meetings", async ({ page, request, flowDatabase }) => {
  story(
    "Staff import the letters supporters sent through pauseai.info's old write to MP form. Three are imported, and the page says why the rest weren't.",
  );
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase, ["supporters"]);
  await page.goto(`${BASE}/staff/import-data/web-form-letters`);
  await page.getByRole("button", { name: staffCopy.webForm.importNow }).click();
  await expect(
    page.getByText(staffCopy.webForm.result({ read: 9, imported: 3, skipped: 3, alreadyHere: 1, noPolitician: 2 }), {
      exact: false,
    }),
  ).toBeVisible();
  await frame(page, "The old form's letters, imported");

  story("Each old campaign has its letters, on its own page.");
  await page.goto(`${BASE}/staff/campaigns`);
  await page.getByRole("link", { name: "DeepMind letter, from pauseai.info" }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("DeepMind letter, from pauseai.info");
  await frame(page, "An old campaign's page");
  story("Each sender is now a supporter, from the old form.");
  await page.getByRole("link", { name: "Dee Deepmind" }).first().click();
  await expect(page.getByText(staffCopy.supporters.sources["web-form"]).first()).toBeVisible();
  await frame(page, "Dee Deepmind's page");

  story(
    "Then they import the MPs' answers about meeting constituents at Go to Parliament. The asks page counts them: one MP is sending staff instead.",
  );
  await page.goto(`${BASE}/staff/import-data/go-to-parliament`);
  await page.getByRole("button", { name: staffCopy.goToParliament.importNow }).click();
  await expect(
    page.getByText(staffCopy.goToParliament.result({ guests: 5, mps: 4, added: 3, changed: 0, notFound: 1 }), {
      exact: false,
    }),
  ).toBeVisible();
  await page.goto(`${BASE}/staff/asks`);
  await expect(
    page.getByRole("link", { name: staffCopy.asks.count(staffCopy.statuses.meeting_staff, 1) }),
  ).toBeVisible();
  await frame(page, "The asks page");
});
