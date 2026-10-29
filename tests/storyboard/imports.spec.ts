import { jobTitles, staffCopy } from "@/lib/content/staff-interface";
import type { ImportJob } from "@/lib/import-runs";
import { staffDate } from "@/lib/staff-time";
import { runSql } from "@/scripts/fresh-database.mjs";
import { FIXTURE_NOW } from "../fixture-env.mjs";
import { syncPoliticians } from "../steps";
import { BASE, expect, frame, test } from "./fixtures";
import { staffEmail, logIn } from "./staff-steps";

// The imports staff run and watch: Luma's and the members', each import's
// own page of its runs, and a politician import held for a person to decide.
// Each flow on its own database.

test("Run the Luma import twice", async ({ page, flowDatabase }) => {
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

test("Run the members import twice", async ({ page, flowDatabase }) => {
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

test("An import's page lists its runs", async ({ page, request, flowDatabase }) => {
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

test("A big politician import is held: discard it, then apply it", async ({ page, request, flowDatabase }) => {
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
  // From the top, where the newest run says how it ended; the button left the page scrolled down its list.
  await page.evaluate(() => window.scrollTo(0, 0));
  await frame(page, "discarded: nobody changed");

  await page.getByRole("button", { name: staffCopy.syncs.syncNow }).click();
  await page.getByRole("button", { name: staffCopy.syncs.apply }).click();
  await expect(page.getByRole("button", { name: staffCopy.syncs.apply })).toHaveCount(0);
  await expect(page.getByText(staffCopy.runs.decidedBy(staffEmail())).first()).toBeVisible();
  expect(inAirtable()).toBe(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await frame(page, "held again, then applied: the 21 are marked gone from Airtable, and kept");

  await page.goto(`${BASE}/staff/audit-log`);
  await expect(page.getByRole("cell", { name: "apply held politician sync" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "discard held politician sync" })).toBeVisible();
  await frame(page, "the audit log: who discarded and who applied");
});

test("A politician import that renames someone is held", async ({ page, request, flowDatabase }) => {
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
