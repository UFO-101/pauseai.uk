import type { Page } from "@playwright/test";
import { staffCopy } from "@/lib/content/staff-interface";
import { runSql } from "@/scripts/fresh-database.mjs";
import { addFilter, changeFilter } from "../steps";
import { BASE, expect, frame, story, test } from "./fixtures";
import { logIn } from "./staff-steps";

// The audit log's search, filters and sorting, on a few entries of their own.

const copy = staffCopy.changes;
const filters = staffCopy.filters;

const JO = "jo.example@pauseai.uk";
const SAM = "sam.example@pauseai.uk";

/** Adds entries by Jo, Sam and the sync, some from long ago. */
function addEntries(database: string) {
  runSql(
    database,
    `INSERT INTO audit_log (actor, action, details, at) VALUES
       ('${JO}', 'add note', '{"noteId": 1}', now() - interval '2 days'),
       ('${SAM}', 'edit event', '{"owner": "${JO}"}', now() - interval '3 days'),
       ('${SAM}', 'add note', '{"noteId": 2}', now() - interval '5 days'),
       ('sync', 'sync politicians', '{}', now() - interval '6 days'),
       ('${JO}', 'set status', '{}', now() - interval '60 days')`,
  );
}

/** The cells of who and what, a row a line. */
const whoAndWhat = async (page: Page) => {
  const rows = await page.locator("tbody tr").all();
  return Promise.all(
    rows.map(
      async (row) => `${await row.locator("td").nth(2).innerText()} ${await row.locator("td").nth(3).innerText()}`,
    ),
  );
};

test("Filtering the audit log", { tag: "@phone" }, async ({ page, flowDatabase }) => {
  story("An admin opens the audit log, to see what Jo has been doing. The newest is first.");
  addEntries(flowDatabase);
  await logIn(page, flowDatabase, ["admin", "supporters"]);
  await page.goto(`${BASE}/staff/audit-log`);
  await expect(page.getByRole("table")).toContainText(JO);
  await frame(page, "The audit log");

  story("They filter by who.");
  await addFilter(page, copy.actor, JO);
  await expect(page).toHaveURL(/actor=jo/);
  await expect.poll(() => whoAndWhat(page)).toEqual([`${JO} add note`, `${JO} set status`]);
  await frame(page, "Only Jo's");

  story("Sam's too: the same chip's menu adds another, and the chip says both.");
  const jo = `${copy.actor}: ${JO}`;
  await page.getByRole("button", { name: jo }).click();
  await expect(page.locator("[popover]:popover-open").getByRole("link", { name: JO })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await frame(page, "The chip's menu");
  await page.locator("[popover]:popover-open").getByRole("link", { name: SAM, exact: true }).click();
  const both = `${copy.actor}: ${filters.anyOf([JO, SAM])}`;
  await expect(page.getByRole("button", { name: both })).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(4);
  await frame(page, "Jo's and Sam's, on one chip");

  story("Only the last week's, sorted by what they did.");
  await addFilter(page, copy.at, filters.lastDays(7));
  await page.getByRole("table").getByRole("link", { name: copy.action }).click();
  await expect(page).toHaveURL(/sort=action/);
  await expect.poll(() => whoAndWhat(page)).toEqual([`${JO} add note`, `${SAM} add note`, `${SAM} edit event`]);
  await frame(page, "The last week's, by what");

  story("Leaving out the notes instead, from Except.");
  await page.getByRole("button", { name: filters.except }).click();
  const group = page
    .locator("[popover]:popover-open details")
    .filter({ has: page.locator("summary", { hasText: new RegExp(`^${copy.action}$`) }) });
  await group.locator("summary").click();
  await group.getByRole("link", { name: "add note", exact: true }).click();
  await expect(page.getByRole("button", { name: filters.notChip(copy.action, "add note") })).toBeVisible();
  await expect.poll(() => whoAndWhat(page)).toEqual([`${SAM} edit event`]);
  await frame(page, "Without the notes");

  story("Turning Who round leaves both out, so the list is the sync's.");
  await changeFilter(page, both, filters.exceptAllInstead);
  await expect(page.getByRole("button", { name: filters.notChip(copy.actor, filters.anyOf([JO, SAM])) })).toBeVisible();
  await expect.poll(() => whoAndWhat(page)).toEqual(["sync sync politicians"]);
  await frame(page, "All but Jo's and Sam's");
});

test("Searching the audit log, and saving it", async ({ page, flowDatabase }) => {
  story("The search box looks in who, what and the details. Here it's Jo, as the owner an edit gave an event.");
  addEntries(flowDatabase);
  await logIn(page, flowDatabase, ["admin", "supporters"]);
  await page.goto(`${BASE}/staff/audit-log`);
  await page.getByRole("searchbox", { name: copy.search }).fill("edit event");
  await page.getByRole("button", { name: staffCopy.search, exact: true }).click();
  await expect.poll(() => whoAndWhat(page)).toEqual([`${SAM} edit event`]);
  await frame(page, "What the search found");

  story("It can be saved for the rest of staff, as on the other lists.");
  const saved = filters.saved;
  await page.getByRole("button", { name: saved.save, exact: true }).click();
  await page.getByRole("textbox", { name: saved.name }).fill("Edits to events");
  await frame(page, "Saving it");
  await page.locator("[popover]:popover-open").getByRole("button", { name: saved.save, exact: true }).click();
  await expect(page.getByRole("button", { name: "Edits to events" })).toBeVisible();
  await frame(page, "Saved, and loaded");

  story("The download is what the search found, and no more.");
  const response = await page.request.get(`${BASE}/staff/audit-log/download?format=json&q=edit+event`);
  const rows: { action: string }[] = await response.json();
  expect(rows.map((row) => row.action)).toEqual(["edit event"]);
});

test("The audit log without Supporters", async ({ page, flowDatabase }) => {
  story("An admin who can't see supporters has the filters, but not saved filters, as those can name a supporter.");
  addEntries(flowDatabase);
  runSql(
    flowDatabase,
    `INSERT INTO saved_filters (list, name, params, created_by) VALUES ('audit-log', 'Named after a supporter', '{"q": "jane"}', '${JO}')`,
  );
  await logIn(page, flowDatabase, ["admin"]);
  await page.goto(`${BASE}/staff/audit-log`);
  await expect(page.getByText(copy.withheld)).toBeVisible();
  await expect(page.getByRole("button", { name: filters.saved.chip, exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: filters.add })).toBeVisible();
  await frame(page, "The audit log");
});
