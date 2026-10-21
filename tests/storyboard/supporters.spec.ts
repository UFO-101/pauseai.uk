import type { Page } from "@playwright/test";
import { staffCopy } from "@/lib/content/staff-interface";
import { TEST_MPS } from "@/lib/test-mps";
import { runSql } from "@/scripts/fresh-database.mjs";
import {
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
  runSql(
    database,
    `INSERT INTO staff_permissions (email, permissions, granted_by) VALUES ('${staffEmail()}', '{supporters}', 'admin@pauseai.uk')`,
  );
  await logInAsStaff(page, BASE, staffEmail());
}

const copy = staffCopy.supporters;

test("without the supporters permission, the list is closed and the home page doesn't offer it", async ({ page }) => {
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
  await page.getByRole("checkbox", { name: copy.filters.registered }).check();
  await page.getByRole("combobox", { name: copy.filters.sort }).selectOption("name");
  await page.getByRole("button", { name: copy.filters.filter }).click();
  await expect(page).toHaveURL(/\/staff\/supporters\?q=fixture%40example&/);
  await expect(page).toHaveURL(/registered=on/);
  await expect(page).toHaveURL(/sort=name/);
  await expect(page.getByRole("link", { name: "Fay Follower" })).toHaveCount(0);
  // Four: the fifth guest declined every event.
  await expect(page.getByText(copy.count(4, 1, 1))).toBeVisible();
  const names = await page.getByRole("table").getByRole("link").allTextContents();
  expect(names).toEqual([...names].sort());
  await frame(page, "filtered to those who registered, by name");

  await page.getByRole("checkbox", { name: copy.filters.registered }).uncheck();
  await page.getByRole("combobox", { name: copy.filters.source }).selectOption("letter");
  await page.getByRole("button", { name: copy.filters.filter }).click();
  await expect(page.getByText(copy.none)).toBeVisible();
  await frame(page, "nobody from letters yet");
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
  await expect(page.getByText(copy.badges.registered(9))).toBeVisible();
  await expect(page.getByRole("cell", { name: "+447700900001" }).first()).toBeVisible();
  await expect(page.getByText(copy.detail.optedOut("2026-10-16 12:00", "luma-webhook"))).toBeVisible();
  const history = page.getByRole("list", { name: copy.detail.activityTitle });
  await expect(history.getByText(copy.detail.kinds["opted-out"])).toBeVisible();
  await frame(page, "Jane's page: opted out of the calendar's emails, with her phone, postcode and registrations");

  // Subscribing again closes the opt-out, and both show in the history.
  expect(
    await postLumaWebhook(request, BASE, "calendar.person.subscribed", "jane.fixture@example.com", "msg_2"),
  ).toEqual({
    recorded: true,
  });
  await page.reload();
  const lists = page.getByRole("list", { name: copy.detail.optOutsTitle });
  await expect(lists.getByText(copy.detail.notOptedOut, { exact: true })).toBeVisible();
  await expect(history.getByText(copy.detail.kinds.resubscribed)).toBeVisible();
  await frame(page, "subscribed again: the list says so, and the history keeps both");

  // Looking is logged.
  runSql(
    flowDatabase,
    `INSERT INTO staff_permissions (email, permissions, granted_by) VALUES ('${staffEmail()}', '{admin}', 'x')
     ON CONFLICT (email) DO UPDATE SET permissions = '{admin,supporters}'`,
  );
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
  await expect(page.getByText(copy.detail.kinds.letter)).toBeVisible();
  await expect(page.getByRole("cell", { name: "ZZ9 9ZZ" })).toBeVisible();
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
  const erase = page.getByRole("region", { name: staffCopy.erase.title });
  await erase.scrollIntoViewIfNeeded();
  await frame(page, "the erase form at the foot of Sam's page");

  await erase.getByRole("textbox", { name: staffCopy.erase.referenceLabel }).fill("Request of 16 Oct 2026");
  await erase.getByRole("checkbox", { name: staffCopy.erase.confirm }).check();
  await erase.getByRole("button", { name: staffCopy.erase.button }).click();
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

  runSql(
    flowDatabase,
    `UPDATE staff_permissions SET permissions = '{admin,supporters}' WHERE email = '${staffEmail()}'`,
  );
  await page.goto(`${BASE}/staff/audit-log`);
  await expect(page.getByRole("cell", { name: "erase supporter" })).toBeVisible();
  await expect(page.getByText("Request of 16 Oct 2026")).toBeVisible();
  await frame(page, "the audit log: the erasure, by its reference, with no name or address");
});
