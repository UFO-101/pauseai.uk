import type { Page } from "@playwright/test";
import { staffCopy } from "@/lib/content/staff-interface";
import { TEST_MPS } from "@/lib/test-mps";
import { runSql } from "@/scripts/fresh-database.mjs";
import {
  addStaffAccount,
  fakeTurnstile,
  fillLetter,
  importLuma,
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
  await page.getByRole("combobox", { name: copy.filters.sort }).selectOption("name");
  await page.getByRole("button", { name: copy.filters.filter }).click();
  await expect(page).toHaveURL(/\/staff\/supporters\?q=fixture%40example&/);
  await expect(page).toHaveURL(/registered=1/);
  await expect(page).toHaveURL(/sort=name/);
  await expect(page.getByRole("link", { name: "Fay Follower" })).toHaveCount(0);
  // Four: the fifth guest declined every event.
  await expect(page.getByText(copy.count(4, 1, 1))).toBeVisible();
  const names = await page.getByRole("table").getByRole("link").allTextContents();
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
  await page.getByRole("link", { name: copy.columns.name }).click();
  await expect(page).toHaveURL(/sort=name&dir=asc/);
  await page.getByRole("link", { name: copy.columns.name }).click();
  await expect(page).toHaveURL(/sort=name&dir=desc/);
  const first = await page.getByRole("table").getByRole("link").first().textContent();
  expect(first).toBe("Sam Fixture");
  await frame(page, "sorted by name, reversed, by clicking the heading twice");
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
  await expect(jane).toContainText(copy.lists["luma-calendar"]);
  await jane.getByRole("link", { name: "Jane Fixture" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Jane Fixture");
  await expect(page.getByText(copy.badges.registered).first()).toBeVisible();
  await expect(page.getByText("+447700900001", { exact: false })).toBeVisible();
  await expect(page.getByText(copy.detail.optedOut("16 Oct 2026"), { exact: false })).toBeVisible();
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
  await expect(page.getByText(/^subscribed/)).toBeVisible();
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
