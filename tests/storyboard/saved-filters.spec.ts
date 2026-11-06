import type { Page } from "@playwright/test";
import { staffCopy } from "@/lib/content/staff-interface";
import { runSql } from "@/scripts/fresh-database.mjs";
import { addFilter, changeFilter, syncPoliticians } from "../steps";
import { BASE, expect, frame, story, test } from "./fixtures";
import { logIn, staffEmail } from "./staff-steps";

// Saved filters on the staff lists: saving what's on, loading it, editing it,
// finding one, and what happens when part of one has gone.

const copy = staffCopy.filters.saved;
const politicians = staffCopy.politicians;

const POLITICIANS = `${BASE}/staff/politicians`;

/** Adds a saved filter, as a colleague made it, and returns its ID. */
function addSaved(database: string, list: string, name: string, params: object, by = "sam.jones@pauseai.uk"): string {
  const [id] = runSql(
    database,
    `INSERT INTO saved_filters (list, name, params, created_by) VALUES ('${list}', '${name}', '${JSON.stringify(params)}', '${by}') RETURNING id`,
  );
  return id;
}

const openList = (page: Page) => page.getByRole("button", { name: copy.chip, exact: true }).click();
const save = (page: Page) => page.getByRole("button", { name: copy.save, exact: true });

test("Saving a filter", { tag: "@phone" }, async ({ page, request, flowDatabase }) => {
  story("Nothing's on the politicians list, so there's nothing to save: the chip is only the way to saved filters.");
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  await page.goto(POLITICIANS);
  await expect(save(page)).toHaveCount(0);
  await frame(page, "Nothing on");

  story("With no saved filters yet, its list says how to start.");
  await openList(page);
  await expect(page.getByText(copy.none)).toBeVisible();
  await frame(page, "None saved");
  await page.keyboard.press("Escape");

  story("Staff choose a party. Save appears as the chip's second half.");
  await addFilter(page, staffCopy.fields.party, "Labour");
  await expect(save(page)).toBeVisible();
  await frame(page, "A filter on, and Save");

  story("Save opens a small form, with a name filled in from the filters, ready to type over.");
  await save(page).click();
  const name = page.getByRole("textbox", { name: copy.name });
  await expect(name).toHaveValue(`${politicians.title}: ${staffCopy.fields.party} Labour`);
  await frame(page, "Naming it");

  story("Saving loads it, and the chip is named for it, with nothing left to save.");
  await name.fill("Labour MPs");
  await page.locator("[popover]:popover-open").getByRole("button", { name: copy.save, exact: true }).click();
  await expect(page).toHaveURL(/saved=\d+/);
  await expect(page.getByRole("button", { name: "Labour MPs" })).toBeVisible();
  await expect(save(page)).toHaveCount(0);
  await frame(page, "Saved and loaded");

  story("Clear filters takes away the filter and unloads it.");
  await page.getByRole("link", { name: staffCopy.resetFilters }).click();
  await expect(page).toHaveURL(POLITICIANS);
  await expect(page.getByRole("button", { name: copy.chip, exact: true })).toBeVisible();
  await frame(page, "Cleared");
});

test("Loading a saved filter, then editing it", { tag: "@phone" }, async ({ page, request, flowDatabase }) => {
  story("A colleague saved Labour MPs. It's in the list, with what it filters by, who made it and when.");
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  addSaved(flowDatabase, "politicians", "Labour MPs", { party: "Labour", house: "commons" });
  await page.goto(POLITICIANS);
  await openList(page);
  await frame(page, "The list");

  story("Loading it is a link. The chips and the tab are as they were saved.");
  await page.getByRole("link", { name: /Labour MPs/ }).click();
  await expect(page.getByRole("button", { name: "Labour MPs" })).toBeVisible();
  await expect(page.getByRole("button", { name: `${staffCopy.fields.party}: Labour` })).toBeVisible();
  await frame(page, "Loaded, unchanged");

  story("Staff add a filter. The chip says it's edited, and Save comes back, now a menu.");
  await addFilter(page, staffCopy.politician.country, staffCopy.countries.scotland);
  await expect(page.getByRole("button", { name: "Labour MPs" })).toContainText(copy.edited);
  await save(page).click();
  await expect(page.getByRole("button", { name: copy.update })).toBeVisible();
  await frame(page, "Edited, and its three choices");

  story("Undo my changes is a link back to the filter as it's stored.");
  await page.getByRole("link", { name: copy.undo }).click();
  await expect(page.getByRole("button", { name: "Labour MPs" })).not.toContainText(copy.edited);
  await frame(page, "Undone");

  story(
    "Staff add the filter again and update it for everyone. It's no longer edited, and loads with that filter from now on.",
  );
  await addFilter(page, staffCopy.politician.country, staffCopy.countries.scotland);
  await save(page).click();
  await page.getByRole("button", { name: copy.update }).click();
  await expect(page.getByRole("button", { name: "Labour MPs" })).not.toContainText(copy.edited);
  await expect(save(page)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: `${staffCopy.politician.country}: ${staffCopy.countries.scotland}` }),
  ).toBeVisible();
  await frame(page, "Updated for everyone");

  story("Editing again, Save as new opens the same form, and loads the new one, leaving the first as it was.");
  await changeFilter(page, `${staffCopy.politician.country}: ${staffCopy.countries.scotland}`);
  await save(page).click();
  await page.getByRole("button", { name: copy.saveAsNew }).click();
  await page.getByRole("textbox", { name: copy.name }).fill("Labour MPs everywhere");
  await frame(page, "Saving as new");
  await page.locator("[popover]:popover-open").getByRole("button", { name: copy.save, exact: true }).last().click();
  await expect(page.getByRole("button", { name: "Labour MPs everywhere" })).toBeVisible();
  await frame(page, "The new one, loaded");
});

test("Finding a saved filter by name", async ({ page, request, flowDatabase }) => {
  story("There are several saved filters. Typing in the box over the list narrows them by name as it's typed.");
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  addSaved(flowDatabase, "politicians", "Conservatives who replied", { party: "Conservative" });
  addSaved(
    flowDatabase,
    "politicians",
    "Scottish MPs",
    { nation: "scotland", house: "commons" },
    "jo.brown@pauseai.uk",
  );
  addSaved(flowDatabase, "politicians", "Peers", { house: "lords" });
  await page.goto(POLITICIANS);
  await openList(page);
  await expect(page.getByText(copy.count(3))).toBeVisible();
  await frame(page, "All of them");
  await page.getByRole("searchbox", { name: copy.find }).fill("scot");
  await expect(page.getByRole("link", { name: /Scottish MPs/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Peers/ })).toBeHidden();
  await frame(page, "Narrowed by name");
});

test("Renaming and deleting a saved filter", async ({ page, request, flowDatabase }) => {
  story("A row's menu works on a saved filter without loading it.");
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  addSaved(flowDatabase, "politicians", "Peers", { house: "lords" });
  addSaved(flowDatabase, "politicians", "Scottish MPs", { nation: "scotland" });
  await page.goto(POLITICIANS);
  await openList(page);
  await page.getByRole("button", { name: copy.rowMenu("Peers") }).click();
  await expect(page.getByRole("button", { name: copy.deleteForEveryone })).toBeVisible();
  await frame(page, "A row's menu");

  story("Rename opens the name's form, filled in. Saving it changes the name for everyone, and stays on the page.");
  await page.getByRole("button", { name: copy.rename, exact: true }).click();
  await page.getByRole("textbox", { name: copy.name }).fill("Everyone in the Lords");
  await frame(page, "Renaming it");
  await page.locator("[popover]:popover-open").getByRole("button", { name: copy.save, exact: true }).last().click();
  await expect(page).toHaveURL(POLITICIANS);
  await expect(page.getByRole("searchbox", { name: copy.find })).toBeHidden();
  await openList(page);
  await expect(page.getByRole("link", { name: /Everyone in the Lords/ })).toBeVisible();
  await frame(page, "Renamed");

  story("Delete for everyone asks for a second press, as every delete does. It goes from the list.");
  await page.getByRole("button", { name: copy.rowMenu("Everyone in the Lords") }).click();
  await page.getByRole("button", { name: copy.deleteForEveryone }).click();
  await frame(page, "Asking again");
  await page.getByRole("button", { name: staffCopy.deleteIt }).click();
  await expect(page.getByRole("link", { name: /Everyone in the Lords/ })).toHaveCount(0);
  await expect(page.getByRole("searchbox", { name: copy.find })).toBeHidden();
  await openList(page);
  await expect(page.getByText(copy.count(1))).toBeVisible();
  await frame(page, "Deleted");
});

test("A saved filter naming something that has gone", async ({ page, request, flowDatabase }) => {
  story(
    "A saved filter names a party no politician belongs to any more. Loading it leaves that out, and says so over the list, which may be longer than it was.",
  );
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  const id = addSaved(flowDatabase, "politicians", "Reform Group and important", {
    party: ["Reform Group"],
    flag: "important",
  });
  await page.goto(`${POLITICIANS}?party=Reform+Group&flag=important&saved=${id}`);
  await expect(page.getByText(copy.gone(`${staffCopy.fields.party}: Reform Group`))).toBeVisible();
  await expect(page.getByRole("button", { name: `${staffCopy.fields.party}: Reform Group` })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Reform Group and important" })).not.toContainText(copy.edited);
  await frame(page, "What has gone, said");

  story("Update takes the missing party out of the saved filter for good, and the notice goes.");
  await page.getByRole("button", { name: copy.goneUpdate }).click();
  await expect(page.getByText(copy.gone(`${staffCopy.fields.party}: Reform Group`))).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Reform Group and important" })).toBeVisible();
  await frame(page, "Updated");
});

test("Who can see saved filters", async ({ page, request, flowDatabase }) => {
  story(
    "Saved filters on Supporters are for those who can open it. Someone with the permission sees one, with the search and Near filter it saved.",
  );
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase, ["supporters"]);
  const id = addSaved(flowDatabase, "supporters", "Near Manchester", { near: "Manchester", within: "25", q: "jane" });
  await page.goto(`${BASE}/staff/supporters?near=Manchester&within=25&q=jane&saved=${id}`);
  await expect(page.getByRole("button", { name: "Near Manchester" })).toBeVisible();
  await frame(page, "With the permission, on Supporters");

  story("The same link on Politicians loads nothing: a saved filter belongs to its own list.");
  await page.goto(`${POLITICIANS}?saved=${id}`);
  await expect(page.getByRole("button", { name: copy.chip, exact: true })).toBeVisible();
  await openList(page);
  await expect(page.getByText(copy.none)).toBeVisible();
  await frame(page, "Not on another list");

  story("Staff without the permission are turned away from Supporters, as ever, link or no link.");
  runSql(flowDatabase, `UPDATE staff_accounts SET permissions = '{}' WHERE email = '${staffEmail()}'`);
  await page.goto(`${BASE}/staff/supporters?saved=${id}`);
  await expect(page).toHaveURL(`${BASE}/staff`);
  await frame(page, "Without the permission");
});

test("A saved filter on Events", async ({ page, flowDatabase }) => {
  story("Events has saved filters too, kept with their tab. Saving what's on the Past tab keeps it there.");
  await logIn(page, flowDatabase);
  await page.goto(`${BASE}/staff/events?when=past&q=talk`);
  await save(page).click();
  await page.getByRole("textbox", { name: copy.name }).fill("Past talks");
  await frame(page, "Saving it");
  await page.locator("[popover]:popover-open").getByRole("button", { name: copy.save, exact: true }).click();
  await expect(page.getByRole("button", { name: "Past talks" })).toBeVisible();
  await expect(page).toHaveURL(/when=past/);
  await frame(page, "Loaded, on its tab");
});

test("Loading a saved filter while choosing who a mailing goes to", async ({ page, request, flowDatabase }) => {
  story("Staff start a new mailing, and the list is choosing who it's for. A saved filter loads as usual.");
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  addSaved(flowDatabase, "politicians", "Labour MPs", { party: "Labour", house: "commons" });
  await page.goto(POLITICIANS);
  await page.getByRole("button", { name: /New mailing/ }).click();
  await expect(page.getByText(staffCopy.mailingPages.choosingNew)).toBeVisible();
  await openList(page);
  await frame(page, "Choosing, with the list open");

  story("Loading it keeps the mailing: the list is still choosing for it, with its boxes to tick.");
  await page.getByRole("link", { name: /Labour MPs/ }).click();
  await expect(page).toHaveURL(/mailing=\d+.*saved=\d+/);
  await expect(page.getByText(staffCopy.mailingPages.choosingNew)).toBeVisible();
  await expect(page.getByRole("button", { name: "Labour MPs" })).toBeVisible();
  await frame(page, "Still choosing, the filter loaded");

  story("On the tab of those ticked, the filters aren't what's chosen, so the bar and the chip are gone.");
  await page.getByRole("link", { name: staffCopy.mailingPages.pickedTab }).first().click();
  await expect(page.getByRole("button", { name: "Labour MPs" })).toHaveCount(0);
  await frame(page, "The ticked tab");
});
