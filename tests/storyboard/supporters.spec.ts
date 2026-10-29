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

/** Opens everything we hold of a supporter, folded at the foot of their page, with the erase button at its end. */
async function openEverything(page: Page) {
  await page.locator("summary", { has: page.getByRole("heading", { name: copy.detail.everythingTitle }) }).click();
}

/** Opens a supporter's history, folded at the foot of their page. */
async function openHistory(page: Page) {
  await page.locator("summary", { has: page.getByRole("heading", { name: copy.detail.activityTitle }) }).click();
}

test("Without Supporters: the list is closed", async ({ page, flowDatabase }) => {
  addStaffAccount(flowDatabase, staffEmail());
  await logInAsStaff(page, BASE, staffEmail());
  await expect(page.getByRole("link", { name: staffCopy.nav.supporters })).toHaveCount(0);
  await page.goto(`${BASE}/staff/supporters`);
  await expect(page).toHaveURL(`${BASE}/staff`);
  await page.goto(`${BASE}/staff/supporters/1`);
  await expect(page).toHaveURL(`${BASE}/staff`);
});

test("Filter, reset and sort supporters", async ({ page, request, flowDatabase }) => {
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

test("Supporters not at an event, with Except", async ({ page, request, flowDatabase }) => {
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

test("Filter supporters by their MP", async ({ page, request, flowDatabase }) => {
  await importLuma(request, BASE);
  await syncPoliticians(request, BASE);
  await logInWithSupporters(page, flowDatabase);
  await page.goto(`${BASE}/staff/supporters`);
  await expect(page.getByText(copy.total(6))).toBeVisible();
  const mp = staffCopy.politician.roles.commons;
  const mo = copy.filters.mpChoice("Mo Example", "Manchester Central");
  await page.getByRole("button", { name: staffCopy.filters.add }).click();
  await page.locator("[popover]:popover-open summary", { hasText: new RegExp(`^${mp}$`) }).click();
  // The MPs show once something's typed in the box.
  await page.locator("[popover]:popover-open").getByRole("searchbox", { name: staffCopy.filters.narrow }).fill("manc");
  await expect(page.locator("[popover]:popover-open").getByRole("link", { name: mo, exact: true })).toBeVisible();
  await frame(page, 'the MP filter, narrowed to those with "manc"');
  await page.locator("[popover]:popover-open").getByRole("link", { name: mo, exact: true }).click();
  await expect(page).toHaveURL(/\/staff\/supporters\?mp=\d+$/);
  // Jane's postcode is the one in Manchester Central.
  await expect(page.getByText(copy.total(1))).toBeVisible();
  await expect(page.getByRole("link", { name: "Jane Fixture" })).toBeVisible();
  await expect(page).toHaveTitle(`${staffCopy.filters.pageTitle(copy.title, `${mp} ${mo}`)} - ${staffCopy.metaTitle}`);
  await frame(page, "Mo Example's constituents: Jane, and the page's title names the filter");
});

test("A supporter's page, and an opt-out from Luma", async ({ page, request, flowDatabase }) => {
  await importLuma(request, BASE);
  await syncPoliticians(request, BASE);
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
  // Her postcode is in Manchester Central, whose MP the politicians sync brought.
  await expect(page.getByRole("link", { name: "Mo Example" })).toBeVisible();
  const reasons = copy.detail.permissions.reasons;
  // Her email and her Luma number in one row, the reason they share once.
  await expect(page.getByText(reasons["luma-calendar"].unsubscribed("16 Oct 2026"), { exact: false })).toHaveCount(1);
  await frame(
    page,
    "Jane's page: her MP, opted out of the calendar's emails, with her phone, postcode and registrations",
  );
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
  // A contact again, since before Luma's webhook, her email and number alike: the reason once.
  await expect(page.getByText(reasons["luma-calendar"].following("20 Sept 2026"), { exact: false })).toHaveCount(1);
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

test("Supporters merged by phone number: the old page redirects", async ({ page, request, flowDatabase }) => {
  await importLuma(request, BASE);
  // A newer guest gives Jane's mobile, written as people write it; the next pass over everyone's numbers makes them one.
  const [jane] = runSql(
    flowDatabase,
    "SELECT supporter_id FROM supporter_links WHERE matched_value = 'jane.fixture@example.com' LIMIT 1",
  );
  const [guest, other, email] = runSql(
    flowDatabase,
    `SELECT g.user_id, k.supporter_id, k.matched_value FROM luma_guests g JOIN supporter_links k ON k.luma_user_id = g.user_id
     WHERE k.supporter_id > ${jane} ORDER BY k.supporter_id DESC LIMIT 1`,
  )[0].split("\t");
  runSql(flowDatabase, `UPDATE luma_guests SET phone = '07700 900001' WHERE user_id = '${guest}'`);
  runSql(flowDatabase, "SELECT count(*) FROM merge_supporters_by_phone(); REFRESH MATERIALIZED VIEW supporters_list");
  await logInWithSupporters(page, flowDatabase);
  await page.goto(`${BASE}/staff/supporters/${other}`);
  await expect(page).toHaveURL(`${BASE}/staff/supporters/${jane}`);
  // Both addresses; the name the newest of them gave.
  await expect(page.getByText("jane.fixture@example.com").first()).toBeVisible();
  await expect(page.getByText(email).first()).toBeVisible();
  await frame(page, "the old ID's page gone on to the one kept, Jane's ID, with both addresses and the newer name");
});

test("A letter writer's page, from the letters list", async ({ page, request, flowDatabase }, testInfo) => {
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
  await openEverything(page);
  await expect(page.getByText("ZZ9 9ZZ", { exact: false })).toBeVisible();
  await frame(page, "the letter writer's page: the letter, and the postcode they gave");

  // The letter's status leads to its page, its copy in the policy@ group, and back to her.
  await page.getByRole("link", { name: staffCopy.letters.status.sent }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    staffCopy.letters.oneTitle("Jane Smith", "Testy McTestface MP"),
  );
  await expect(page.getByRole("link", { name: staffCopy.letters.detail.googleGroup })).toHaveAttribute(
    "href",
    /^https:\/\/groups\.google\.com\/a\/pauseai\.uk\/d\/msgid\/policy\/[\w-]+@mtasv\.net$/,
  );
  await frame(page, "her letter's page, with its copy in the policy@ group");
  await page.getByRole("link", { name: "Jane Smith" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Jane Smith");
});

test("A march sign-up's page", async ({ page, flowDatabase }, testInfo) => {
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
  const marta = page.getByRole("row").filter({ hasText: "Marta Marcher" });
  await expect(marta).toContainText(copy.badges.march);
  await frame(page, "the list: Marta, who signed up for the march");

  await marta.getByRole("link").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Marta Marcher");
  // Her number as we compare numbers, a yes for texts on the march's day and, as she agreed, after.
  await expect(page.getByText("+447700900123", { exact: false }).first()).toBeVisible();
  await openEverything(page);
  await expect(page.getByText("LS1 1AA", { exact: true })).toBeVisible();
  // Her email and number in one row, the reason they share once.
  await expect(
    page.getByText(
      copy.detail.permissions.reasons["site-forms"].asked(
        "16 Oct 2026",
        copy.detail.permissions.forms["march-2026-11"],
      ),
      { exact: false },
    ),
  ).toHaveCount(1);
  await openHistory(page);
  const history = page.getByRole("list", { name: copy.detail.activityTitle });
  await expect(history.getByText(copy.detail.cameFrom("nl"), { exact: false })).toBeVisible();
  await frame(page, "Marta's page: her phone, city and postcode, the box she ticked, and the sign-up in her history");
});

test("A member who wrote to their MP is one supporter", async ({ page, request, flowDatabase }) => {
  await syncPoliticians(request, BASE);
  await fakeTurnstile(page);
  await lookUpTestMp(page, BASE, TEST_MPS[0], "Lee Letter");
  await fillLetter(page, "lee.letter@example.com");
  await sendLetter(page, TEST_MPS[0]);
  await importMembers(request, BASE);

  await logInWithSupporters(page, flowDatabase);
  await page.goto(`${BASE}/staff/supporters`);
  // The only member who wrote to their MP.
  const lee = page.getByRole("row").filter({ hasText: copy.badges.member }).filter({ hasText: copy.badges.letter });
  await expect(lee).toContainText(copy.badges.member);
  await expect(lee).toContainText(copy.badges.letter);
  await frame(page, "the list: the members, and Lee, who also wrote to their MP");

  await lee.getByRole("link").first().click();
  await expect(page).toHaveURL(/\/staff\/supporters\/\d+$/);
  // The letter's sender's name, as the newest; how they first came, as a member.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lee Letter");
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

test("Filter supporters by what they're subscribed to", async ({ page, request, flowDatabase }) => {
  await importLuma(request, BASE);
  await importMembers(request, BASE);
  // Jane unsubscribed from the calendar's emails, and Luma told us.
  await postLumaWebhook(request, BASE, "calendar.person.unsubscribed", "jane.fixture@example.com", "msg_1");
  await logInWithSupporters(page, flowDatabase);
  await page.goto(`${BASE}/staff/supporters`);
  await expect(page.getByRole("columnheader", { name: copy.columns.subscriptions })).toBeVisible();
  await frame(page, "the list, with what each supporter gets by topic");

  // A topic first, those we can email about it, then in the chip's second half, those we can't.
  const answers = copy.detail.permissions.answers;
  await addFilter(page, copy.columns.subscriptions, copy.filters.topics["luma-calendar"]);
  await changeFilter(page, answers.email.yes, answers.email.no);
  await expect(page.getByRole("row").filter({ hasText: "Jane Fixture" })).toBeVisible();
  // Owen left Keep me informed unticked, which isn't an unsubscribe.
  await expect(page.getByRole("row").filter({ hasText: "Owen Member" })).toHaveCount(0);
  await frame(page, "Luma by email, can't: Jane, who unsubscribed, as Luma told us");

  // Another topic, from the chip's first half, then its answer.
  await changeFilter(
    page,
    `${copy.columns.subscriptions}: ${copy.filters.topics["luma-calendar"]}`,
    copy.filters.topics["pauseai-updates"],
  );
  await changeFilter(page, answers.email.yes, answers.email.no);
  await expect(page).toHaveURL(/contact=email%3Apauseai-updates%3Ano/);
  await expect(page.getByRole("row").filter({ hasText: "Owen Member" })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Jane Fixture" })).toHaveCount(0);
  await frame(page, "filtered to those who left Keep me informed unticked: Owen");
});

test("A member who didn't tick Keep me informed gets no updates", async ({ page, request, flowDatabase }) => {
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

test("A member who re-joined and ticked it gets updates", async ({ page, request, flowDatabase }) => {
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

test("Erase a supporter: they stay gone after an import", async ({ page, request, flowDatabase }) => {
  await importLuma(request, BASE);
  await logInWithSupporters(page, flowDatabase);
  await page.goto(`${BASE}/staff/supporters`);
  await page.getByRole("link", { name: "Sam Fixture" }).click();
  await openEverything(page);
  const eraseLink = page.getByRole("link", { name: staffCopy.erase.title });
  await eraseLink.scrollIntoViewIfNeeded();
  await frame(page, "the red button at the end of everything we hold of Sam");
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

test("Erase a member: they stay gone after a members import", async ({ page, request, flowDatabase }) => {
  await importMembers(request, BASE);
  await logInWithSupporters(page, flowDatabase);
  await page.goto(`${BASE}/staff/supporters`);
  await page.getByRole("link", { name: "Mara Member" }).click();
  await openEverything(page);
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
