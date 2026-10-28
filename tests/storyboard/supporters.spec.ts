import type { Page } from "@playwright/test";
import { marchSignupCopy } from "@/lib/content/march-signup";
import { staffCopy } from "@/lib/content/staff-interface";
import { staffDate } from "@/lib/staff-time";
import { TEST_MPS } from "@/lib/test-mps";
import { runSql } from "@/scripts/fresh-database.mjs";
import {
  addFilter,
  addStaffAccount,
  changeFilter,
  fakeTurnstile,
  fillLetter,
  importLuma,
  importMembers,
  logInAsStaff,
  lookUpTestMp,
  postLumaWebhook,
  sendLetter,
  syncPoliticians,
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

/** Opens a supporter's history, folded at the foot of their page. */
async function openHistory(page: Page) {
  await page.locator("summary", { hasText: copy.detail.showHistory(0).replace(/0$/, "") }).click();
}

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

test("the supporters list after the Luma import, filtered, reset and sorted", async ({
  page,
  request,
  flowDatabase,
}) => {
  await importLuma(request, BASE);
  await logInWithSupporters(page, flowDatabase);
  await page.getByRole("link", { name: staffCopy.nav.supporters }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy.title);
  // Five guests and a contact who never registered.
  await expect(page.getByText(copy.total(6))).toBeVisible();
  await expect(page.getByRole("link", { name: "Fay Follower" })).toBeVisible();
  await frame(page, "every supporter the import found, newest activity first");

  // The search waits for its button; a filter applies as soon as it's chosen, keeping the search.
  await page.getByRole("searchbox", { name: copy.filters.search }).fill("fixture@example");
  await page.getByRole("button", { name: staffCopy.search }).click();
  await expect(page).toHaveURL(/\/staff\/supporters\?q=fixture%40example$/);
  // Every one of them has an address at fixture@example.
  await expect(page.getByText(copy.total(6))).toBeVisible();
  await frame(page, "searched for fixture@example: all six");
  await addFilter(page, copy.columns.badges, copy.badges.registered);
  await expect(page).toHaveURL(/\/staff\/supporters\?q=fixture%40example&activity=registered$/);
  await page.getByRole("link", { name: copy.columns.name }).click();
  await expect(page).toHaveURL(/sort=name/);
  await expect(page.getByRole("link", { name: "Fay Follower" })).toHaveCount(0);
  // Four: the fifth guest declined every event.
  await expect(page.getByText(copy.total(4))).toBeVisible();
  const names = await page.locator("tbody").getByRole("link").allTextContents();
  expect(names).toEqual([...names].sort());
  await frame(page, "filtered to those who registered, by name");

  await changeFilter(page, `${copy.columns.badges}: ${copy.badges.registered}`, copy.badges.letter);
  await expect(page.getByText(copy.none)).toBeVisible();
  await frame(page, "nobody from letters yet");

  // Reset clears every filter, and the sort.
  await page.getByRole("link", { name: staffCopy.resetFilters }).click();
  await expect(page).toHaveURL(`${BASE}/staff/supporters`);
  await expect(page.getByText(copy.total(6))).toBeVisible();
  await expect(page.getByRole("searchbox", { name: copy.filters.search })).toHaveValue("");
  await expect(page.getByRole("button", { name: `${copy.columns.badges}: ${copy.badges.letter}` })).toHaveCount(0);
  await frame(page, "reset: every supporter again, newest activity first");

  // A heading sorts the list; clicking it again reverses it.
  await page.getByRole("link", { name: copy.columns.name }).click();
  await expect(page).toHaveURL(/sort=name&dir=asc/);
  expect(await page.locator("tbody").getByRole("link").first().textContent()).toBe("Alex Fixture");
  await page.getByRole("link", { name: copy.columns.name }).click();
  await expect(page).toHaveURL(/sort=name&dir=desc/);
  expect(await page.locator("tbody").getByRole("link").first().textContent()).toBe("Sam Fixture");
  await frame(page, "sorted by name, reversed, by clicking the heading twice");
});

test("the supporters not at an event, by Except: the guest who declined it, and the contact who never registered", async ({
  page,
  request,
  flowDatabase,
}) => {
  await importLuma(request, BASE);
  await logInWithSupporters(page, flowDatabase);
  await page.goto(`${BASE}/staff/supporters`);
  await expect(page.getByText(copy.total(6))).toBeVisible();
  const march = copy.filters.eventChoice("PauseAI London March", staffDate("2026-02-14T12:00:00Z"));
  await page.getByRole("button", { name: staffCopy.filters.except }).click();
  await expect(page.locator("[popover]:popover-open").getByText(staffCopy.filters.exceptHeading)).toBeVisible();
  await frame(page, "Except open: the filters that repeat, to choose one to leave out");
  await page.locator("[popover]:popover-open summary", { hasText: new RegExp(`^${copy.filters.event}$`) }).click();
  // Its events show once something's typed in its box.
  await page.locator("[popover]:popover-open").getByRole("searchbox", { name: staffCopy.filters.narrow }).fill("march");
  await expect(page.locator("[popover]:popover-open").getByRole("link", { name: march, exact: true })).toBeVisible();
  await frame(page, 'Except\'s events, narrowed to those with "march"');
  await page.locator("[popover]:popover-open").getByRole("link", { name: march, exact: true }).click();
  await expect(page).toHaveURL(/\/staff\/supporters\?event=%21/);
  // Four guests were approved for it; Dee declined, and Fay follows the calendar but never registered.
  await expect(page.getByText(copy.total(2))).toBeVisible();
  expect(await page.locator("tbody").getByRole("link").allTextContents()).toEqual(
    expect.arrayContaining(["Dee Clined", "Fay Follower"]),
  );
  await frame(page, "not at the London March: Dee, who declined, and Fay, who never registered");
  await page.getByRole("button", { name: staffCopy.filters.notChip(copy.filters.event, march) }).click();
  await expect(
    page.locator("[popover]:popover-open").getByRole("link", { name: staffCopy.filters.onlyInstead }),
  ).toBeVisible();
  await frame(page, "its chip's menu: the event, Only this instead, and Remove");
  await page.locator("[popover]:popover-open").getByRole("link", { name: staffCopy.filters.onlyInstead }).click();
  await expect(page.getByText(copy.total(4))).toBeVisible();
  await expect(page.getByRole("columnheader", { name: copy.columns.registrations })).toBeVisible();
  await expect(page.locator("tbody").getByText(copy.detail.registered).first()).toBeVisible();
  await frame(
    page,
    "only those at the London March: the four approved, each one's registration in a column of its own",
  );
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
  await expect(page.getByText(copy.detail.firstVia(copy.sources.luma))).toBeVisible();
  await expect(page.getByText("+447700900001", { exact: false }).first()).toBeVisible();
  const reasons = copy.detail.permissions.reasons;
  // Her email's answer, and her Luma number's with it.
  await expect(page.getByText(reasons["luma-calendar"].unsubscribed("16 Oct 2026"), { exact: false })).toHaveCount(2);
  await frame(page, "Jane's page: opted out of the calendar's emails, with her phone, postcode and registrations");
  await openHistory(page);
  const history = page.getByRole("list", { name: copy.detail.activityTitle });
  await expect(history.getByText(copy.detail.kinds["opted-out"], { exact: false }).first()).toBeVisible();
  await frame(page, "her history, opened under the events and letters");

  // Subscribing again closes the opt-out, and both show in the history.
  expect(
    await postLumaWebhook(request, BASE, "calendar.person.subscribed", "jane.fixture@example.com", "msg_2"),
  ).toEqual({
    recorded: true,
  });
  await page.reload();
  // A contact again, since before Luma's webhook: we can't be sure.
  await expect(page.getByText(reasons["luma-calendar"].following("20 Sept 2026"), { exact: false })).toHaveCount(2);
  await openHistory(page);
  await expect(history.getByText(copy.detail.kinds.resubscribed, { exact: false })).toBeVisible();
  await frame(page, "subscribed again: the list says so, and the history keeps both");

  // Downloading them, as cards for WhatsApp, is logged; looking isn't.
  const cards = await page.request.get(`${BASE}/staff/supporters/download?format=vcf`);
  expect(await cards.text()).toMatch(/^FN:PauseAI \w{4} - Jane Fixture$/m);
  addStaffAccount(flowDatabase, staffEmail(), ["admin", "supporters"]);
  await page.goto(`${BASE}/staff/audit-log`);
  await expect(page.getByRole("cell", { name: "download supporters" }).first()).toBeVisible();
  await expect(page.getByRole("cell", { name: "view supporter" })).toHaveCount(0);
  await frame(page, "the audit log: the download of supporters, and no viewing");
});

test("a letter writer is a supporter too, linked from the letters page", async ({
  page,
  request,
  flowDatabase,
}, testInfo) => {
  await syncPoliticians(request, BASE);
  const sender = `jane+${testInfo.testId}@example.com`;
  await fakeTurnstile(page);
  await lookUpTestMp(page, BASE, TEST_MPS[0]);
  await fillLetter(page, sender);
  await sendLetter(page, TEST_MPS[0]);

  await logInWithSupporters(page, flowDatabase);
  await page.goto(`${BASE}/staff/letters`);
  await page.getByRole("row").filter({ hasText: sender }).getByRole("link", { name: "Jane Smith" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Jane Smith");
  await expect(page.getByRole("link", { name: `1 ${copy.detail.lettersCounted(1)}` })).toBeVisible();
  await expect(
    page.getByRole("region", { name: copy.detail.lettersTitle }).getByRole("link", { name: "Testy McTestface MP" }),
  ).toBeVisible();
  await expect(page.getByText("ZZ9 9ZZ", { exact: false })).toBeVisible();
  await frame(page, "the letter writer's page: the letter, and the postcode they gave");

  // The letter's status leads to their letters, and back.
  await page.getByRole("link", { name: staffCopy.letters.status.sent }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(staffCopy.letters.fromTitle("Jane Smith"));
  await expect(page.getByRole("row").filter({ hasText: sender })).toBeVisible();
  await frame(page, "their letters");
  await page.getByRole("navigation", { name: "Jane Smith" }).getByRole("link").click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Jane Smith");
});

test("a march sign-up is a supporter, with what they gave and the link they came by", async ({
  page,
  flowDatabase,
}, testInfo) => {
  const email = `march-${testInfo.testId}@example.org`;
  const form = marchSignupCopy.form;
  await page.goto(`${BASE}/protests/march-against-ai-extinction-nov-26?utm_source=nl#register`);
  await page.getByLabel(form.name).fill("Marta Marcher");
  await page.getByLabel(form.email).fill(email);
  await page.getByRole("textbox", { name: new RegExp(`^${form.phone}`) }).fill("07700 900123");
  await page.getByRole("textbox", { name: new RegExp(`^${form.city}`) }).fill("Leeds");
  await page.getByRole("textbox", { name: new RegExp(`^${form.postcode}`) }).fill("ls1 1aa");
  await page.getByLabel(form.consent).check();
  await page.getByRole("button", { name: form.submit, exact: true }).click();
  await expect(page.getByRole("heading", { name: marchSignupCopy.share.title })).toBeVisible();

  await logInWithSupporters(page, flowDatabase);
  await page.goto(`${BASE}/staff/supporters`);
  const marta = page.getByRole("row").filter({ hasText: email });
  await expect(marta).toContainText(copy.badges.march);
  await frame(page, "the list: Marta, who signed up for the march");

  await marta.getByRole("link").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Marta Marcher");
  // Her number as we compare numbers, a yes for texts on the march's day and, as she agreed, after.
  await expect(page.getByText("+447700900123", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("LS1 1AA", { exact: false })).toBeVisible();
  await expect(
    page.getByText(
      copy.detail.permissions.reasons["site-forms"].asked(
        "16 Oct 2026",
        copy.detail.permissions.forms["march-2026-11"],
      ),
      { exact: false },
    ),
  ).toHaveCount(2);
  await openHistory(page);
  const history = page.getByRole("list", { name: copy.detail.activityTitle });
  await expect(history.getByText(copy.detail.cameFrom("nl"), { exact: false })).toBeVisible();
  await frame(page, "Marta's page: her phone, city and postcode, the box she ticked, and the sign-up in her history");
});

test("a member who also wrote to their MP is one supporter, with how they joined", async ({
  page,
  request,
  flowDatabase,
}) => {
  await syncPoliticians(request, BASE);
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
  // The letter's sender's name, as the newest; how they first came, as a member.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Jane Smith");
  await expect(page.getByText(copy.detail.firstVia(copy.sources.member))).toBeVisible();
  await expect(page.getByText("29 Nov 2025", { exact: false }).first()).toBeVisible();
  // Joined before "Keep me informed" was a choice: on the updates.
  await expect(
    page.getByText(copy.detail.permissions.reasons["pauseai-updates"].joined("29 Nov 2025"), { exact: false }),
  ).toBeVisible();
  await openHistory(page);
  const history = page.getByRole("list", { name: copy.detail.activityTitle });
  await expect(history.getByText(copy.detail.kinds["member-joined"], { exact: false })).toBeVisible();
  await expect(history.getByText(copy.detail.kinds.letter, { exact: false })).toBeVisible();
  await frame(page, "Lee's page: joined before the form asked about updates, then wrote to their MP");
});

test("the list says what each supporter gets, and filters by it", async ({ page, request, flowDatabase }) => {
  await importLuma(request, BASE);
  await importMembers(request, BASE);
  // Jane unsubscribed from the calendar's emails, and Luma told us.
  await postLumaWebhook(request, BASE, "calendar.person.unsubscribed", "jane.fixture@example.com", "msg_1");
  await logInWithSupporters(page, flowDatabase);
  await page.goto(`${BASE}/staff/supporters`);
  await expect(page.getByRole("columnheader", { name: copy.columns.subscriptions })).toBeVisible();
  await frame(page, "the list, with what each supporter gets by topic");

  // A topic first, then in the chip's second half, one of its reasons.
  await addFilter(page, copy.columns.subscriptions, copy.filters.topics["luma-calendar"]);
  await changeFilter(page, copy.filters.anyAnswer, copy.detail.permissions.answers.email.no);
  await expect(page.getByText(copy.total(1))).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Jane Fixture" })).toBeVisible();
  // Owen left Keep me informed unticked, which isn't an unsubscribe.
  await expect(page.getByRole("row").filter({ hasText: "Owen Member" })).toHaveCount(0);
  await frame(page, "filtered to those who unsubscribed: Jane, whom Luma told us of");

  // Another topic, from the chip's first half, then its reason.
  await changeFilter(
    page,
    `${copy.columns.subscriptions}: ${copy.filters.topics["luma-calendar"]}`,
    copy.filters.topics["pauseai-updates"],
  );
  await changeFilter(page, copy.filters.anyAnswer, copy.detail.permissions.answers.email.no);
  await expect(page).toHaveURL(/contact=email%3Apauseai-updates%3Adeclined/);
  await expect(page.getByRole("row").filter({ hasText: "Owen Member" })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Jane Fixture" })).toHaveCount(0);
  await frame(page, "filtered to those who left Keep me informed unticked: Owen");
});

test("a member who left Keep me informed unticked won't get the updates", async ({ page, request, flowDatabase }) => {
  await importMembers(request, BASE);
  await logInWithSupporters(page, flowDatabase);
  await page.goto(`${BASE}/staff/supporters`);
  await page.getByRole("link", { name: "Owen Member" }).click();
  await expect(
    page.getByText(copy.detail.permissions.reasons["pauseai-updates"].declined("6 Oct 2026"), { exact: false }),
  ).toBeVisible();
  await expect(page.getByText(copy.detail.permissions.answers.email.no).first()).toBeVisible();
  await openHistory(page);
  await expect(
    page.getByText(`${copy.detail.joinedOn("pauseai.uk")}, ${copy.detail.intents["Act now"]}`),
  ).toBeVisible();
  await frame(page, "Owen's page: declined the updates on joining");
});

test("a member who re-joined and ticked Keep me informed is on the updates", async ({
  page,
  request,
  flowDatabase,
}) => {
  // Rhea left it unticked on an earlier record; the newest decides.
  await importMembers(request, BASE);
  await logInWithSupporters(page, flowDatabase);
  await page.goto(`${BASE}/staff/supporters`);
  await page.getByRole("link", { name: "Rhea Member" }).click();
  // On the updates, as asked when re-joining. The ? by its name says how we know.
  await expect(
    page.getByText(copy.detail.permissions.reasons["pauseai-updates"].asked("11 Oct 2026"), { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: copy.detail.permissions.why }).first().click();
  await expect(page.getByText(copy.detail.permissions.details.email["pauseai-updates"].about)).toBeVisible();
  await frame(page, "Rhea's page: asked for the updates on re-joining");
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
  await expect(page.getByText(copy.total(5))).toBeVisible();
  await frame(page, "the list without Sam, saying the erasure is done");

  // The next import leaves Sam out.
  runSql(flowDatabase, "UPDATE luma_events SET guests_synced_at = NULL");
  await importLuma(request, BASE);
  await page.reload();
  await expect(page.getByRole("link", { name: "Sam Fixture" })).toHaveCount(0);

  addStaffAccount(flowDatabase, staffEmail(), ["admin", "supporters"]);
  await page.goto(`${BASE}/staff/audit-log`);
  await expect(page.getByRole("cell", { name: "erase supporter" })).toBeVisible();
  // In the entry's details; its JSON, behind its button, has it too.
  await expect(page.getByText("Request of 16 Oct 2026").filter({ visible: true })).toBeVisible();
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
  await expect(page.getByText(copy.total(7))).toBeVisible();
  await expect(page.getByRole("link", { name: "Mara Member" })).toHaveCount(0);
  await frame(page, "the list after the next members import: still without Mara");
});
