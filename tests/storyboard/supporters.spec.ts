import type { Page } from "@playwright/test";
import { staffCopy } from "@/lib/content/staff-interface";
import { TEST_MPS } from "@/lib/test-mps";
import { runSql } from "@/scripts/fresh-database.mjs";
import {
  addStaffAccount,
  fakeTurnstile,
  fillLetter,
  importLuma,
  importMembers,
  logInAsStaff,
  lookUpTestMp,
  postLumaWebhook,
  sendLetter,
  syncMps,
} from "../steps";
import { BASE, expect, frame, test } from "./fixtures";

// The supporter pages, behind the supporters permission, on the fixture
// Luma calendar (five guests at every event, three contacts) and the
// letters a flow writes. Each flow on its own database.

const staffEmail = () => `staff-${test.info().testId.replace(/\W/g, "").slice(-8)}@pauseai.uk`;

/** Gives this flow's staff member the supporters permission, then logs them in. */
async function logInWithSupporters(page: Page, database: string) {
  addStaffAccount(database, staffEmail(), ["supporters"]);
  await logInAsStaff(page, BASE, staffEmail());
}

const copy = staffCopy.supporters;

test("without the supporters permission, the list is closed and the home page doesn't offer it", async ({
  page,
  flowDatabase,
}) => {
  addStaffAccount(flowDatabase, staffEmail());
  await logInAsStaff(page, BASE, staffEmail());
  await expect(page.getByRole("link", { name: staffCopy.nav.supporters })).toHaveCount(0);
  await page.goto(`${BASE}/staff/supporters`);
  await expect(page).toHaveURL(`${BASE}/staff`);
  await page.goto(`${BASE}/staff/supporters/1`);
  await expect(page).toHaveURL(`${BASE}/staff`);
});

test("the supporters list after the Luma import, filtered and sorted", async ({ page, request, flowDatabase }) => {
  await importLuma(request, BASE);
  await logInWithSupporters(page, flowDatabase);
  await page.getByRole("link", { name: staffCopy.nav.supporters }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy.title);
  // Five guests and a follower who never registered.
  await expect(page.getByText(copy.count(6, 1, 1))).toBeVisible();
  await expect(page.getByRole("link", { name: "Fay Follower" })).toBeVisible();
  await frame(page, "every supporter the import found, newest activity first");

  await page.getByRole("searchbox", { name: copy.filters.search }).fill("fixture@example");
  await page.getByRole("combobox", { name: copy.filters.events }).selectOption("1");
  await page.getByRole("button", { name: copy.filters.filter }).click();
  await expect(page).toHaveURL(/\/staff\/supporters\?q=fixture%40example&/);
  await expect(page).toHaveURL(/registered=1/);
  await page.getByRole("link", { name: copy.columns.name }).click();
  await expect(page).toHaveURL(/sort=name/);
  await expect(page.getByRole("link", { name: "Fay Follower" })).toHaveCount(0);
  // Four: the fifth guest declined every event.
  await expect(page.getByText(copy.count(4, 1, 1))).toBeVisible();
  const names = await page.locator("tbody").getByRole("link").allTextContents();
  expect(names).toEqual([...names].sort());
  await frame(page, "filtered to those who registered, by name");

  await page.getByRole("combobox", { name: copy.filters.events }).selectOption("");
  await page.getByRole("combobox", { name: copy.filters.source }).selectOption("letter");
  await page.getByRole("button", { name: copy.filters.filter }).click();
  await expect(page.getByText(copy.none)).toBeVisible();
  await frame(page, "nobody from letters yet");

  // A heading sorts the list; clicking it again reverses it.
  await page.getByRole("combobox", { name: copy.filters.source }).selectOption("");
  await page.getByRole("button", { name: copy.filters.filter }).click();
  // Already sorted by name from the field, so the first click reverses it, and the next puts it back.
  await page.getByRole("link", { name: copy.columns.name }).click();
  await expect(page).toHaveURL(/sort=name&dir=desc/);
  expect(await page.locator("tbody").getByRole("link").first().textContent()).toBe("Sam Fixture");
  await frame(page, "sorted by name, reversed, by clicking the heading");
  await page.getByRole("link", { name: copy.columns.name }).click();
  await expect(page).toHaveURL(/sort=name&dir=asc/);
  expect(await page.locator("tbody").getByRole("link").first().textContent()).toBe("Alex Fixture");
});

test("a supporter's page: who they are, what they gave, their history, and an opt-out from Luma's webhook", async ({
  page,
  request,
  flowDatabase,
}) => {
  await importLuma(request, BASE);
  // Jane unsubscribed from the calendar's emails, Luma told us, and someone redelivered it.
  expect(
    await postLumaWebhook(request, BASE, "calendar.person.unsubscribed", "jane.fixture@example.com", "msg_1"),
  ).toEqual({
    recorded: true,
  });
  expect(
    await postLumaWebhook(request, BASE, "calendar.person.unsubscribed", "jane.fixture@example.com", "msg_1"),
  ).toEqual({
    recorded: false,
  });
  await logInWithSupporters(page, flowDatabase);
  await page.goto(`${BASE}/staff/supporters`);
  const jane = page.getByRole("row").filter({ hasText: "Jane Fixture" });
  await jane.getByRole("link", { name: "Jane Fixture" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Jane Fixture");
  await expect(page.getByText(copy.badges.registered).first()).toBeVisible();
  await expect(page.getByText("+447700900001", { exact: false })).toBeVisible();
  const reasons = copy.detail.permissions.reasons;
  await expect(page.getByText(reasons["luma-calendar"].unsubscribed("16 Oct 2026"), { exact: false })).toBeVisible();
  const history = page.getByRole("list", { name: copy.detail.activityTitle });
  await expect(history.getByText(copy.detail.kinds["opted-out"], { exact: false }).first()).toBeVisible();
  await frame(page, "Jane's page: opted out of the calendar's emails, with her phone, postcode and registrations");

  // Subscribing again closes the opt-out, and both show in the history.
  expect(
    await postLumaWebhook(request, BASE, "calendar.person.subscribed", "jane.fixture@example.com", "msg_2"),
  ).toEqual({
    recorded: true,
  });
  await page.reload();
  // Following again, since before Luma's webhook: we can't be sure.
  await expect(page.getByText(reasons["luma-calendar"].following("20 Sept 2026"), { exact: false })).toBeVisible();
  await expect(history.getByText(copy.detail.kinds.resubscribed, { exact: false })).toBeVisible();
  await frame(page, "subscribed again: the list says so, and the history keeps both");

  // Looking is logged.
  addStaffAccount(flowDatabase, staffEmail(), ["admin", "supporters"]);
  await page.goto(`${BASE}/staff/audit-log`);
  await expect(page.getByRole("cell", { name: "view supporter" }).first()).toBeVisible();
  await frame(page, "the audit log: each viewing of a supporter");
});

test("a letter writer is a supporter too, linked from the letters page", async ({
  page,
  request,
  flowDatabase,
}, testInfo) => {
  await syncMps(request, BASE);
  const sender = `jane+${testInfo.testId}@example.com`;
  await fakeTurnstile(page);
  await lookUpTestMp(page, BASE, TEST_MPS[0]);
  await fillLetter(page, sender);
  await sendLetter(page, TEST_MPS[0]);

  await logInWithSupporters(page, flowDatabase);
  await page.goto(`${BASE}/staff/letters`);
  await page.getByRole("row").filter({ hasText: sender }).getByRole("link", { name: "Jane Smith" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Jane Smith");
  await expect(page.getByText(copy.badges.letter)).toBeVisible();
  await expect(page.getByText(copy.detail.kinds.letter, { exact: false }).first()).toBeVisible();
  await expect(page.getByText("ZZ9 9ZZ", { exact: false })).toBeVisible();
  await frame(page, "the letter writer's page: the letter, and the postcode they gave");
});

test("a member who also wrote to their MP is one supporter, with how they joined", async ({
  page,
  request,
  flowDatabase,
}) => {
  await syncMps(request, BASE);
  await fakeTurnstile(page);
  await lookUpTestMp(page, BASE, TEST_MPS[0]);
  await fillLetter(page, "lee.letter@example.com");
  await sendLetter(page, TEST_MPS[0]);
  await importMembers(request, BASE);

  await logInWithSupporters(page, flowDatabase);
  await page.goto(`${BASE}/staff/supporters`);
  const lee = page.getByRole("row").filter({ hasText: "lee.letter@example.com" });
  await expect(lee).toContainText(copy.badges.member);
  await expect(lee).toContainText(copy.badges.letter);
  await frame(page, "the list: the members, and Lee, who also wrote to their MP");

  await lee.getByRole("link").first().click();
  await expect(page).toHaveURL(/\/staff\/supporters\/\d+$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(copy.badges.member);
  await expect(page.getByText("29 Nov 2025", { exact: true }).first()).toBeVisible();
  // Joined before "Keep me informed" was a choice: on the updates.
  await expect(
    page.getByText(copy.detail.permissions.reasons["pauseai-updates"].joined("29 Nov 2025"), { exact: false }),
  ).toBeVisible();
  const history = page.getByRole("list", { name: copy.detail.activityTitle });
  await expect(history.getByText(copy.detail.kinds["member-joined"], { exact: false })).toBeVisible();
  await expect(history.getByText(copy.detail.kinds.letter, { exact: false })).toBeVisible();
  await frame(page, "Lee's page: joined before the form asked about updates, then wrote to their MP");
});

test("a member who left Keep me informed unticked is opted out of the updates", async ({
  page,
  request,
  flowDatabase,
}) => {
  await importMembers(request, BASE);
  await logInWithSupporters(page, flowDatabase);
  await page.goto(`${BASE}/staff/supporters`);
  await page.getByRole("combobox", { name: copy.filters.lists }).selectOption("1");
  await page.getByRole("button", { name: copy.filters.filter }).click();
  await expect(page.getByText(copy.count(1, 1, 1))).toBeVisible();
  const owen = page.getByRole("row").filter({ hasText: "Owen Member" });
  await frame(page, "the list filtered to those unsubscribed from anything: Owen");

  await owen.getByRole("link", { name: "Owen Member" }).click();
  await expect(
    page.getByText(copy.detail.permissions.reasons["pauseai-updates"].declined("6 Oct 2026"), { exact: false }),
  ).toBeVisible();
  await expect(page.getByText(copy.detail.permissions.no).first()).toBeVisible();
  await expect(
    page.getByText(`${copy.detail.joinedOn("pauseai.uk")}, ${copy.detail.intents["Act now"]}`),
  ).toBeVisible();
  const history = page.getByRole("list", { name: copy.detail.activityTitle });
  await expect(history.getByText(copy.detail.importReasons["opted-out"], { exact: false })).toBeVisible();
  await frame(page, "Owen's page: opted out of the updates on joining, and why");
});

test("a member who re-joined and ticked Keep me informed has their opt-out lifted", async ({
  page,
  request,
  flowDatabase,
}) => {
  // Rhea left it unticked on an earlier record, which the import opted out.
  runSql(
    flowDatabase,
    `INSERT INTO opt_outs (address, list, source, source_ref, unsubscribed_at)
     VALUES ('rhea.member@example.com', 'pauseai-updates', 'airtable-import', 'recMemberRheaOld', '2026-07-10T00:00:00Z')`,
  );
  await importMembers(request, BASE);
  await logInWithSupporters(page, flowDatabase);
  await page.goto(`${BASE}/staff/supporters`);
  await page.getByRole("link", { name: "Rhea Member" }).click();
  // The opt-out lifted: on the updates, as asked when re-joining. The ? by its name says how we know.
  await expect(
    page.getByText(copy.detail.permissions.reasons["pauseai-updates"].asked("11 Oct 2026"), { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: copy.detail.permissions.why }).first().click();
  await expect(page.getByText(copy.detail.permissions.details["pauseai-updates"])).toBeVisible();
  const history = page.getByRole("list", { name: copy.detail.activityTitle });
  await expect(history.getByText(copy.detail.importReasons.resubscribed, { exact: false })).toBeVisible();
  await expect(history.getByText(copy.detail.importReasons["opted-out"], { exact: false })).toBeVisible();
  await frame(page, "Rhea's page: opted out on joining, then asked for the updates on re-joining");
});

test("erasing a supporter: gone from the list and the next import, with the audit entry", async ({
  page,
  request,
  flowDatabase,
}) => {
  await importLuma(request, BASE);
  await logInWithSupporters(page, flowDatabase);
  await page.goto(`${BASE}/staff/supporters`);
  await page.getByRole("link", { name: "Sam Fixture" }).click();
  const eraseLink = page.getByRole("link", { name: staffCopy.erase.title });
  await eraseLink.scrollIntoViewIfNeeded();
  await frame(page, "the red button at the foot of Sam's page");
  await eraseLink.click();
  await expect(page).toHaveURL(/\/staff\/supporters\/\d+\/erase$/);
  await expect(page.getByRole("button", { name: staffCopy.erase.button })).toBeDisabled();
  await frame(page, "the erase page");

  await page.getByRole("textbox", { name: staffCopy.erase.referenceLabel }).fill("Request of 16 Oct 2026");
  await page.getByRole("checkbox", { name: staffCopy.erase.confirm }).check();
  await page.getByRole("button", { name: staffCopy.erase.button }).click();
  await expect(page).toHaveURL(`${BASE}/staff/supporters?erased=1`);
  await expect(page.getByRole("status")).toHaveText(staffCopy.erase.done);
  await expect(page.getByRole("link", { name: "Sam Fixture" })).toHaveCount(0);
  await expect(page.getByText(copy.count(5, 1, 1))).toBeVisible();
  await frame(page, "the list without Sam, saying the erasure is done");

  // The next import leaves Sam out.
  runSql(flowDatabase, "UPDATE luma_events SET guests_synced_at = NULL");
  await importLuma(request, BASE);
  await page.reload();
  await expect(page.getByRole("link", { name: "Sam Fixture" })).toHaveCount(0);

  addStaffAccount(flowDatabase, staffEmail(), ["admin", "supporters"]);
  await page.goto(`${BASE}/staff/audit-log`);
  await expect(page.getByRole("cell", { name: "erase supporter" })).toBeVisible();
  await expect(page.getByText("Request of 16 Oct 2026")).toBeVisible();
  await frame(page, "the audit log: the erasure, by its reference, with no name or address");
});

test("erasing a member: gone from the list, and the next members import doesn't bring them back", async ({
  page,
  request,
  flowDatabase,
}) => {
  await importMembers(request, BASE);
  await logInWithSupporters(page, flowDatabase);
  await page.goto(`${BASE}/staff/supporters`);
  await page.getByRole("link", { name: "Mara Member" }).click();
  await page.getByRole("link", { name: staffCopy.erase.title }).click();
  await page.getByRole("textbox", { name: staffCopy.erase.referenceLabel }).fill("Request of 16 Oct 2026");
  await page.getByRole("checkbox", { name: staffCopy.erase.confirm }).check();
  await page.getByRole("button", { name: staffCopy.erase.button }).click();
  await expect(page.getByRole("status")).toHaveText(staffCopy.erase.done);
  await expect(page.getByRole("link", { name: "Mara Member" })).toHaveCount(0);

  await importMembers(request, BASE);
  await page.reload();
  await expect(page.getByText(copy.count(7, 1, 1))).toBeVisible();
  await expect(page.getByRole("link", { name: "Mara Member" })).toHaveCount(0);
  await frame(page, "the list after the next members import: still without Mara");
});
