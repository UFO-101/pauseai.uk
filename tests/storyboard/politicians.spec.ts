import type { Page } from "@playwright/test";
import { jobTitles, staffCopy } from "@/lib/content/staff-interface";
import { runSql } from "@/scripts/fresh-database.mjs";
import { addFilter, addStaffAccount, changeFilter, logInAsStaff, syncPoliticians } from "../steps";
import { BASE, expect, frame, test } from "./fixtures";

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

test("a politician from Airtable: their markers, notes, answers and PauseAI's emails", async ({
  page,
  request,
  flowDatabase,
}) => {
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  await openPolitician(page, "Polly Placeholder");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Polly Placeholder${copy.importantTarget}`);
  await expect(page.getByText("Met at the example fair.")).toBeVisible();
  const asks = page.getByRole("region", { name: copy.statusesTitle });
  // ControlAI's campaign statement and her answer to the conference, both from Airtable.
  await expect(asks.getByText(staffCopy.statuses.declined)).toBeVisible();
  await expect(asks.getByText(copy.fromImport.airtable).first()).toBeVisible();
  // The conference's invitation, personalised.
  await expect(page.getByText(copy.personalised, { exact: false }).first()).toBeVisible();
  await frame(page, "Polly's page: important, with notes, her answers from Airtable and PauseAI's invitation");
});

test("a peer with only their title, an MSP, and an MP who left office", async ({ page, request, flowDatabase }) => {
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  await openPolitician(page, "Lord Seedling of Example");
  await expect(page.getByText(copy.role(copy.roles.lords, null, true), { exact: true })).toBeVisible();
  await frame(page, "a peer: a member of the Lords, who signed the DeepMind letter");

  await openPolitician(page, "Morag Example");
  await expect(page.getByText(copy.personalConnection, { exact: true })).toBeVisible();
  await expect(page.getByText(`${copy.country}${staffCopy.countries.scotland}`)).toBeVisible();
  await frame(page, "an MSP, a personal connection, going to the conference and sent its invitation");

  await openPolitician(page, "Gordon Gone");
  await expect(page.getByText(copy.role(copy.roles.commons, "Former Seat", false), { exact: true })).toBeVisible();
  await frame(page, "an MP who left office: formerly MP, kept");
});

test("the politicians list, filtered by status, marker and an answer to an ask, then reset", async ({
  page,
  request,
  flowDatabase,
}) => {
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  await page.goto(`${BASE}/staff/politicians`);
  const filters = staffCopy.politicians;
  const rows = page.getByRole("row");
  // Those in office, to start; + Filter offers the rest, each applying as soon as it's chosen.
  await expect(rows.filter({ hasText: "Polly Placeholder" })).toBeVisible();
  await expect(rows.filter({ hasText: "Rita Retired" })).toHaveCount(0);
  await page.getByRole("button", { name: staffCopy.filters.add }).click();
  await frame(page, "+ Filter open: every filter's choices");
  await page.keyboard.press("Escape");
  await addFilter(page, filters.status, staffCopy.personStatuses.retired);
  await expect(page).toHaveURL(/status=retired/);
  await expect(rows.filter({ hasText: "Rita Retired" })).toBeVisible();
  await expect(rows.filter({ hasText: "Polly Placeholder" })).toHaveCount(0);
  await frame(page, "only those who retired, the filter a chip");

  await changeFilter(page, `${filters.status}: ${staffCopy.personStatuses.retired}`);
  await expect(page).toHaveURL(`${BASE}/staff/politicians`);
  await addFilter(page, filters.flag, filters.flags.connection);
  await expect(page).toHaveURL(/flag=connection/);
  await expect(rows.filter({ hasText: "Morag Example" })).toBeVisible();
  await expect(rows).toHaveCount(2);
  await frame(page, "only personal connections");

  // A chip's menu turns its choice to one the list leaves out.
  await changeFilter(page, `${filters.flag}: ${filters.flags.connection}`, staffCopy.filters.exceptInstead);
  await expect(page).toHaveURL(/flag=%21connection/);
  await expect(rows.filter({ hasText: "Morag Example" })).toHaveCount(0);
  await expect(rows.filter({ hasText: "Polly Placeholder" })).toBeVisible();
  await frame(page, "all but personal connections, by the chip's Except this instead");

  await changeFilter(page, staffCopy.filters.notChip(filters.flag, filters.flags.connection));
  await expect(page).toHaveURL(`${BASE}/staff/politicians`);
  await addFilter(page, filters.ask, "Edinburgh conference");
  await expect(page).toHaveURL(/ask=edinburgh-conference-2026$/);
  await frame(page, "the ask's chip, its second half for an answer");
  // The answer is chosen in the second half of the ask's chip.
  await changeFilter(page, filters.anyAnswer, filters.noAnswer);
  await expect(page).toHaveURL(/ask=edinburgh-conference-2026&answer=none/);
  await expect(rows.filter({ hasText: "Polly Placeholder" })).toHaveCount(0);
  await expect(rows.filter({ hasText: "Ms Dora Dummy" })).toBeVisible();
  await frame(page, "those who haven't answered the conference's invitation");

  await page.getByRole("link", { name: staffCopy.resetFilters }).click();
  await expect(page).toHaveURL(`${BASE}/staff/politicians`);
  await expect(rows.filter({ hasText: "Polly Placeholder" })).toBeVisible();
});

test("the politicians list's houses are tabs, each keeping the other filters", async ({
  page,
  request,
  flowDatabase,
}) => {
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  await page.goto(`${BASE}/staff/politicians?status=any`);
  const houses = page.getByRole("navigation", { name: staffCopy.fields.house });
  const rows = page.getByRole("row");
  await expect(houses.getByRole("link", { name: staffCopy.politicians.allHouses })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await frame(page, "every house, in office or not");

  await houses.getByRole("link", { name: staffCopy.houses.commons }).click();
  await expect(page).toHaveURL(/house=commons&status=any/);
  await expect(rows.filter({ hasText: "Gordon Gone" })).toBeVisible();
  await expect(rows.filter({ hasText: "Morag Example" })).toHaveCount(0);
  // Every row is in the Commons, so there's no column saying so.
  await expect(page.getByRole("columnheader", { name: staffCopy.fields.house })).toHaveCount(0);
  await frame(page, "only the Commons, with no house column");

  await houses.getByRole("link", { name: staffCopy.houses["scottish-parliament"] }).click();
  await expect(rows.filter({ hasText: "Morag Example" })).toBeVisible();
  await expect(rows).toHaveCount(2);
  await frame(page, "only the Scottish Parliament");
});

test("the politicians list pages through many, a count and downloads over it", async ({ page, flowDatabase }) => {
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
  await frame(page, "every politician: how many, which these are, and Download");
  await page.getByRole("button", { name: staffCopy.lists.download }).click();
  const csv = page.getByRole("link", { name: staffCopy.lists.formats.csv });
  await expect(csv).toHaveAttribute("href", "/staff/politicians/download?status=any&format=csv");
  await frame(page, "Download's menu: a spreadsheet, JSON, or vCards for WhatsApp");
  // Every page of them, a line each under the headings.
  const file = await page.request.get(`${BASE}/staff/politicians/download?status=any&format=csv`);
  expect((await file.text()).trim().split("\r\n")).toHaveLength(251);
  await page.keyboard.press("Escape");
  const pages = page.getByRole("navigation", { name: staffCopy.paging.label });
  await pages.scrollIntoViewIfNeeded();
  await frame(page, "the first hundred, and the way to the other pages");

  await pages.getByRole("link", { name: staffCopy.paging.next }).click();
  await expect(page).toHaveURL(/status=any&page=2/);
  await expect(page.getByText(staffCopy.paging.range(101, 200, 250))).toBeVisible();
  await frame(page, "the second page");

  // On to the last: by its number, or on a phone, where the numbers give way to "Page 2 of 3", by Next.
  const last = page.getByRole("navigation", { name: staffCopy.paging.label }).getByRole("link", {
    name: staffCopy.paging.page(3),
  });
  await ((await last.isVisible()) ? last : pages.getByRole("link", { name: staffCopy.paging.next })).click();
  await expect(page).toHaveURL(/status=any&page=3/);
  await expect(page.getByText(staffCopy.paging.range(201, 250, 250))).toBeVisible();
  await frame(page, "the last page: no Next");

  // Another house starts from the first page.
  await page
    .getByRole("navigation", { name: staffCopy.fields.house })
    .getByRole("link", { name: staffCopy.houses.lords })
    .click();
  await expect(page).toHaveURL(`${BASE}/staff/politicians?house=lords&status=any`);
});

test("searching the politicians: each word anywhere, those not in office or test politicians, and the nearest to a typo", async ({
  page,
  request,
  flowDatabase,
}) => {
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
  await frame(page, "two words, part of her name and her constituency, find Polly");

  await search("Independent");
  await expect(page.getByText(copy.none)).toBeVisible();
  await page.getByRole("link", { name: copy.outOfOffice(2) }).click();
  await expect(page).toHaveURL(/q=Independent&status=any/);
  await expect(rows.filter({ hasText: "Rita Retired" })).toBeVisible();
  await expect(rows.filter({ hasText: "Gordon Gone" })).toBeVisible();
  await frame(page, "no one in office is Independent, but two who left are: one click finds them");

  await page.goto(`${BASE}/staff/politicians`);
  await search("Dorra Dumy");
  await expect(page.getByText(copy.closest)).toBeVisible();
  await expect(rows.filter({ hasText: "Ms Dora Dummy" })).toBeVisible();
  await frame(page, "a typo finds no one, so the nearest names are offered");

  await page.goto(`${BASE}/staff/politicians?house=lords`);
  await search("Morag");
  await expect(page.getByText(copy.none)).toBeVisible();
  await page.getByRole("link", { name: copy.otherHouses(1) }).click();
  await expect(page).toHaveURL(/q=Morag$/);
  await expect(rows.filter({ hasText: "Morag Example" })).toBeVisible();
  await frame(page, "no one in the Lords is Morag, but one in another house is: one click finds her");

  await page.goto(`${BASE}/staff/politicians`);
  await search("Testy McTestface");
  await page.getByRole("link", { name: copy.tests(1) }).click();
  await expect(page).toHaveURL(/q=Testy\+McTestface&flag=test$/);
  await expect(rows.filter({ hasText: "Testy McTestface MP" })).toBeVisible();
  await frame(page, "a test politician is left out of a search, but one click finds them");
});

test("a politician whose record has gone from Airtable, and who's had no letters, is deleted", async ({
  page,
  request,
  flowDatabase,
}) => {
  await syncPoliticians(request, BASE);
  runSql(flowDatabase, "UPDATE notable_people SET airtable_removed_at = now() WHERE name = 'Rita Retired'");
  await logIn(page, flowDatabase);
  // Anyone still in Airtable can't be.
  await openPolitician(page, "Polly Placeholder");
  await expect(page.getByRole("button", { name: copy.delete.button, exact: true })).toHaveCount(0);

  await openPolitician(page, "Rita Retired");
  await page.getByRole("button", { name: copy.delete.button, exact: true }).scrollIntoViewIfNeeded();
  await frame(page, "Rita, gone from Airtable: the button to delete her, at the foot");

  await page.getByRole("button", { name: copy.delete.button, exact: true }).click();
  await expect(page.getByText(copy.delete.sure("Rita Retired"))).toBeVisible();
  await frame(page, "asked to be sure");

  await page.getByRole("button", { name: copy.delete.confirm }).click();
  await expect(page).toHaveURL(`${BASE}/staff/politicians`);
  await page.goto(`${BASE}/staff/politicians?status=any`);
  await expect(page.getByRole("link", { name: "Rita Retired" })).toHaveCount(0);
  await frame(page, "the list of everyone, without her");
});

test("PauseAI's mailings: the list, one mailing's recipients, and back to it from a politician's history", async ({
  page,
  request,
  flowDatabase,
}) => {
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  const mailings = staffCopy.mailings;
  await page.goto(`${BASE}/staff/mailings`);
  const invitation = "Edinburgh Conference Nov 26 Invitation";
  await expect(page.getByRole("row").filter({ hasText: invitation })).toContainText(mailings.imported);
  await frame(page, "every mailing, newest first, each copied from Airtable");

  await page.getByRole("link", { name: invitation }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(invitation);
  await expect(page.getByText(mailings.noText)).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Polly Placeholder" })).toContainText(mailings.personalised);
  await frame(page, "the invitation: no text, as Airtable kept none, and its two recipients");

  await page.getByRole("link", { name: "Polly Placeholder" }).click();
  await page.getByRole("list", { name: copy.historyTitle }).getByRole("link", { name: invitation }).click();
  await expect(page).toHaveURL(/\/staff\/mailings\/\d+$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(invitation);
});

test("the asks page counts each answer, and an answer leads to who gave it", async ({
  page,
  request,
  flowDatabase,
}) => {
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  await page.goto(`${BASE}/staff/asks`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(staffCopy.asks.title);
  await frame(page, "every ask: the letters signed, the conference answered, Go to Parliament not yet");
  await page.getByRole("link", { name: staffCopy.asks.count(staffCopy.statuses.going, 1) }).click();
  await expect(page).toHaveURL(/ask=edinburgh-conference-2026&answer=going/);
  await expect(page.getByRole("row").filter({ hasText: "Morag Example" })).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(2);
  await frame(page, "the politicians going to the conference");
});

test("the politicians mailed about an ask, and those not yet", async ({ page, request, flowDatabase }) => {
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  await page.goto(`${BASE}/staff/politicians?mailed=edinburgh-conference-2026`);
  await expect(page.getByRole("row").filter({ hasText: "Polly Placeholder" })).toBeVisible();
  await frame(page, "those mailed about the conference");
  await page.goto(`${BASE}/staff/politicians?mailed=!edinburgh-conference-2026`);
  await expect(page.getByRole("row").filter({ hasText: "Polly Placeholder" })).toHaveCount(0);
  await frame(page, "and with Except, those not yet: the ones to mail next");
});

test("an ask added, changed, then deleted", async ({ page, flowDatabase }) => {
  await logIn(page, flowDatabase);
  const asks = staffCopy.asks;
  await page.goto(`${BASE}/staff/asks`);
  await page.getByRole("link", { name: asks.add }).click();
  await page.getByLabel(asks.fields.title).fill("Winter reception");
  await page.getByLabel(asks.fields.kind).selectOption("event");
  await page.getByLabel(asks.fields.date).fill("2026-12-09");
  await frame(page, "a new ask: its title, kind and date, and PauseAI asking");
  await page.getByRole("button", { name: asks.save }).click();
  await expect(page.getByText(asks.notices.added)).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Winter reception" })).toBeVisible();
  await frame(page, "added, among the asks, with Edit");

  await page.getByRole("row").filter({ hasText: "Winter reception" }).getByRole("link", { name: asks.edit }).click();
  await expect(page.getByText(asks.slugHint("winter-reception-dec-2026"))).toBeVisible();
  await page.getByLabel(asks.fields.url).fill("https://luma.com/winter");
  await page.getByRole("button", { name: asks.save }).click();
  await expect(page.getByRole("link", { name: "Winter reception" })).toHaveAttribute("href", "https://luma.com/winter");
  await page.getByRole("row").filter({ hasText: "Winter reception" }).getByRole("link", { name: asks.edit }).click();
  await page.getByRole("button", { name: asks.delete }).click();
  await expect(page.getByRole("button", { name: staffCopy.mailingPages.deleteIt })).toBeFocused();
  await frame(page, "Delete, pressed once, asking to be pressed again", { window: true });
  await page.getByRole("button", { name: staffCopy.mailingPages.deleteIt }).click();
  await expect(page.getByText(asks.notices.deleted)).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Winter reception" })).toHaveCount(0);
  await frame(page, "deleted");
});

test("PauseAI's emails: copied once, with one held back for a mailing nobody has added", async ({
  page,
  request,
  flowDatabase,
}) => {
  await syncPoliticians(request, BASE);
  // With no permissions: PauseAI's letters are the politicians section's.
  await logIn(page, flowDatabase);
  // The nightly sync copied them; the button finds nothing new.
  await page.goto(`${BASE}/staff/import-data/emails`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(jobTitles["sync-emails"]);
  await expect(page.getByText("recEmailNewBox", { exact: false }).first()).toBeVisible();
  await frame(
    page,
    "the Emails sync's page: five copied, summer 2025's by its dates, one held back with no mailing we know",
  );
  await page.getByRole("button", { name: staffCopy.pauseaiEmails.importNow }).click();
  await expect(page.getByText(staffCopy.runs.status.incomplete).first()).toBeVisible();
  expect(runSql(flowDatabase, "SELECT count(*) FROM letters_from_pauseai")).toEqual(["5"]);

  // Each is in its MP's history, leading to its own page under its mailing, and from there to a Gmail search for it.
  await page.goto(`${BASE}/staff/politicians`);
  await page.getByRole("link", { name: "Polly Placeholder" }).click();
  const history = page.getByRole("list", { name: staffCopy.politician.historyTitle });
  await history.getByRole("link", { name: staffCopy.letters.status.sent }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    staffCopy.letters.oneTitle(staffCopy.letters.fromPauseai, "Polly Placeholder"),
  );
  await expect(page).toHaveURL(/\/staff\/mailings\/\d+\/letters\/\d+$/);
  await expect(page.getByRole("link", { name: staffCopy.letters.detail.gmail })).toHaveAttribute(
    "href",
    /^https:\/\/mail\.google\.com\/mail\/#search\/to%3Apolly/,
  );
  await frame(page, "one of PauseAI's emails to Polly: its mailing, and a Gmail search for it");
});

test("the one-off imports: pauseai.info's letters and their senders, and Go to Parliament's meetings", async ({
  page,
  request,
  flowDatabase,
}) => {
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase, ["supporters"]);
  await page.goto(`${BASE}/staff/import-data/web-form-letters`);
  await page.getByRole("button", { name: staffCopy.webForm.importNow }).click();
  await expect(
    page.getByText(staffCopy.webForm.result({ read: 9, imported: 3, skipped: 3, alreadyHere: 1, noPolitician: 2 }), {
      exact: false,
    }),
  ).toBeVisible();
  await frame(page, "the web form letters: three imported, the rest skipped and why");

  // On the letters page, marked as from the old form; the sender a supporter from it.
  await page.goto(`${BASE}/staff/letters`);
  await expect(page.getByText(staffCopy.letters.imported)).toHaveCount(3);
  await frame(page, "the letters page: the old form's letters marked");
  await page.getByRole("link", { name: "Dee Deepmind" }).first().click();
  await expect(page.getByText(staffCopy.supporters.sources["web-form"]).first()).toBeVisible();
  await frame(page, "a supporter who wrote through the old form");

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
  await frame(page, "the asks page: Go to Parliament's meetings counted");
});
