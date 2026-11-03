import type { Page } from "@playwright/test";
import { staffCopy } from "@/lib/content/staff-interface";
import { runSql } from "@/scripts/fresh-database.mjs";
import { addStaffAccount, importLuma, logInAsStaff, newestEmail } from "../steps";
import { BASE, emailFrame, expect, frame, story, test } from "./fixtures";

// The events page: our Luma events, to come and past, a table each, and
// who on staff owns each. The Luma import gives events their owners by the rules, and
// emails them; one whose owner by the rules has no account has none, an
// error, until someone is chosen for it, who's emailed too; an event's
// Google Doc linked; and, for staff who see supporters, each event's hosts.

const copy = staffCopy.events;

/** This flow's own staff address: flows run alongside each other, and share the outbox. */
const staffEmail = () => `events-${test.info().testId.replace(/\W/g, "").slice(-8)}@pauseai.uk`;

async function logIn(page: Page, database: string, permissions: string[] = []) {
  addStaffAccount(database, staffEmail(), permissions);
  return logInAsStaff(page, BASE, staffEmail());
}

test("Event owners", async ({ page, request, flowDatabase }) => {
  story(
    "After the hourly Luma import, every event to come with no owner is given one on staff, by the rules. Joseph has a staff account, and is given every event but the Oxford talk, with an email listing them.",
  );
  // Joseph has an account, so the import gives him every event but Oxford's; Sean, Oxford's by the rules, has none yet.
  addStaffAccount(flowDatabase, "joseph@pauseai.uk");
  await importLuma(request, BASE);
  const josephs = newestEmail((one) => one.To === "joseph@pauseai.uk")!;
  expect(josephs.TextBody).toContain("PauseAI Scotland Meeting");
  expect(josephs.TextBody).not.toContain("AI risk talk");
  await emailFrame(page, josephs, "The email Joseph gets");

  story(
    "The rules give the Oxford talk to Sean, who had no account then, so it has no owner. The events page shows that in red.",
  );
  addStaffAccount(flowDatabase, "sean@pauseai.uk");
  await logIn(page, flowDatabase);
  await page.goto(`${BASE}/staff/events`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy.title);
  await expect(page.getByRole("link", { name: copy.source.link })).toHaveAttribute("href", "/staff/import-data/luma");
  const talk = page.getByRole("row").filter({ hasText: "AI risk talk" });
  await expect(talk.getByRole("cell").nth(5).getByText(copy.noOwner)).toBeVisible();
  await frame(page, "The events to come");
  story("Sean has an account now. Staff edit the talk, choose Sean as its owner and paste in its Google Doc.");

  await talk.getByRole("button", { name: copy.edit }).click();
  const form = page.getByRole("form", { name: copy.editLabel("AI risk talk") });
  await expect(form.getByRole("button", { name: copy.save })).toBeDisabled();
  await form.getByLabel(copy.owner).selectOption("sean@pauseai.uk");
  await form.getByLabel(copy.docField).fill("https://docs.google.com/document/d/oxford-talk-plan/edit");
  await frame(page, "The Oxford talk, being edited");
  story("Once saved, Sean owns the talk and its doc is linked, so neither is in red. The page says Sean was emailed.");

  await form.getByRole("button", { name: copy.save }).click();
  await expect(form).not.toBeVisible();
  await expect(talk.getByRole("cell").nth(5).getByText("sean@pauseai.uk")).toBeVisible();
  await expect(talk.getByRole("link", { name: copy.doc })).toHaveAttribute(
    "href",
    "https://docs.google.com/document/d/oxford-talk-plan/edit",
  );
  await expect(page.getByRole("status")).toContainText(copy.emailed(["sean@pauseai.uk"], "sean@pauseai.uk"));
  await frame(page, "The Oxford talk, saved");
  story("Sean's email says they own the talk, and who chose them.");

  // Both viewports' flows email Sean: this one's names its own address.
  const seans = newestEmail((one) => one.To === "sean@pauseai.uk" && one.TextBody.includes(staffEmail()))!;
  expect(seans.TextBody).toContain("AI risk talk");
  await emailFrame(page, seans, "The email Sean gets");
});

test("Past events", async ({ page, request, flowDatabase }) => {
  story(
    "The Past tab lists events that have happened, latest first. What they lacked, an owner or a doc, is only said, not in red.",
  );
  await importLuma(request, BASE);
  await logIn(page, flowDatabase);
  await page.goto(`${BASE}/staff/events`);
  await page.getByRole("link", { name: copy.tabs.past }).click();
  await expect(page).toHaveURL(`${BASE}/staff/events?when=past`);
  const names = page.locator("tbody tr td:nth-child(2) a");
  await expect(names).toHaveText(["PauseAI London March", "Glasgow street stall"]);
  await frame(page, "Past events");

  story("Staff sort them by how many went, most first, then search for Glasgow. They stay on the Past tab.");
  await page.locator("thead th").filter({ hasText: copy.columns.going }).getByRole("link").click();
  await expect(page).toHaveURL(`${BASE}/staff/events?when=past&sort=going&dir=desc`);
  await frame(page, "Past events, by how many went");

  await page.getByRole("searchbox", { name: copy.filters.search }).fill("Glasgow");
  await page.getByRole("searchbox", { name: copy.filters.search }).press("Enter");
  await expect(names).toHaveText(["Glasgow street stall"]);
  await expect(page).toHaveURL(/when=past/);
  await frame(page, "Past events in Glasgow");
});

test("Event hosts", async ({ page, request, flowDatabase }) => {
  story(
    "Staff who see supporters see each event's hosts too, before its owner. The protest at Parliament has three, one with no name on Luma.",
  );
  await importLuma(request, BASE);
  await logIn(page, flowDatabase, ["supporters"]);
  await page.goto(`${BASE}/staff/events`);
  const protest = page.getByRole("row").filter({ hasText: "Protest at Parliament" });
  const hosts = protest.getByRole("cell").nth(5);
  await expect(hosts).toHaveText(`Jane Fixture, Sam Fixture, ${copy.noHostName}`);
  await expect(page.getByRole("row").filter({ hasText: "Leicester" }).getByRole("cell").nth(5)).toHaveText(
    "Alex Fixture",
  );
  await frame(page, "The events, with their hosts");

  story("Searching for a host's name finds the event they host.");
  const search = page.getByRole("searchbox", { name: copy.filters.search });
  await search.fill("Sam Fixture");
  await search.press("Enter");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(protest).toBeVisible();
  await frame(page, "The search for Sam Fixture");

  story(
    "Each host's name links to their supporter page. Jane's lists the protest she hosts, a row apart from her registration for it, and counts each event once.",
  );
  await hosts.getByRole("link", { name: "Jane Fixture" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Jane Fixture" })).toBeVisible();
  const events = page.getByRole("region", { name: staffCopy.supporters.detail.eventsTitle, exact: false });
  await expect(events.getByRole("row").filter({ hasText: staffCopy.supporters.detail.host })).toHaveCount(1);
  // The events she registered for, not declined, or hosts, each once.
  const [count] = runSql(
    flowDatabase,
    `SELECT count(DISTINCT event_id) FROM (
       SELECT g.event_id FROM luma_guests g WHERE g.user_id = 'usr-fixture-1' AND g.removed_at IS NULL AND g.approval_status <> 'declined'
       UNION SELECT h.event_id FROM luma_event_hosts h WHERE h.user_id = 'usr-fixture-1') e`,
  );
  const n = Number(count);
  await expect(page.locator("[class*=counts]").first()).toContainText(
    `${n} ${staffCopy.supporters.detail.eventsCounted(n)}`,
  );
  await frame(page, "Jane Fixture's page");
});
