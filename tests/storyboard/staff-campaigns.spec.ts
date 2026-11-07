import { campaigns } from "@/lib/content/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import { runSql } from "@/scripts/fresh-database.mjs";
import { addFilter, syncPoliticians } from "../steps";
import { BASE, expect, frame, madeUpAddress, story, test } from "./fixtures";
import { chooseDay, importEmails, logIn, sentLetterId } from "./staff-steps";

// Campaigns, each ask's page and form, and the sent emails. Each flow on its
// own database.

const copy = staffCopy.campaigns;

test("Campaigns", async ({ page, flowDatabase }) => {
  story(
    "Jane writes to her MP. Campaigns lists each one under the month of its most recent letter, with the same counts as a mailing.",
  );
  await sentLetterId(page, flowDatabase, madeUpAddress("Jane Smith", 41));
  await page.goto(`${BASE}/staff/letters`);
  await expect(page).toHaveURL(`${BASE}/staff/campaigns`);
  await frame(page, "The list of campaigns");

  story(
    "A campaign's page shows the letter people were given, how many changed its wording, and the letters they sent.",
  );
  await page.getByRole("link", { name: campaigns[0].title, exact: true }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(campaigns[0].title);
  await expect(page.getByRole("region", { name: copy.theLetter })).toContainText(campaigns[0].subject);
  await frame(page, "A campaign's page");

  story("Each count shows only the letters it counts. None has failed.");
  await page
    .getByRole("link", { name: /failed/ })
    .first()
    .click();
  await expect(page).toHaveURL(/tab=failed/);
  await expect(page.getByText(staffCopy.letters.none)).toBeVisible();
  await frame(page, "No letters failed");
});

test("No answer yet", async ({ page, flowDatabase }) => {
  story("Jane writes to her MP about the letter to the Prime Minister. They haven't answered yet.");
  await sentLetterId(page, flowDatabase, madeUpAddress("Jane Smith", 42));
  await page.goto(`${BASE}/staff/asks/${campaigns[0].ask}`);
  await expect(page.getByRole("heading", { name: staffCopy.asks.page.howWeAsked })).toBeVisible();
  await expect(page.getByRole("link", { name: campaigns[0].title, exact: true })).toBeVisible();

  story(
    "No answer's column is the whole of who's been written to and hasn't answered. Pressed, it lists them, longest wait first.",
  );
  await frame(page, "The ask's answers");
  const unanswered = page.getByRole("link", { name: new RegExp(`^${staffCopy.statuses.noAnswer} \\d`) });
  await unanswered.click();
  await expect(page).toHaveURL(/answer=none/);
  await expect(unanswered).toHaveAttribute("aria-current", "true");
  await frame(page, "Those with no answer");
});

test("Asks", async ({ page, request, flowDatabase }) => {
  story("The asks page lists each ask as the mailings page does: who asked, what they answered, and how it stands.");
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase, ["supporters"]);
  await importEmails(page);
  await page.goto(`${BASE}/staff/asks`);
  await frame(page, "The asks");

  story("An ask's page says what they were asked, then what they answered, a column each, then how we asked.");
  await page.getByRole("link", { name: "Edinburgh conference" }).first().click();
  await expect(page.getByText(staffCopy.politician.askedThem("PauseAI", "event"))).toBeVisible();
  await expect(page.getByRole("heading", { name: staffCopy.asks.page.howWeAsked })).toBeVisible();
  await frame(page, "An event's page");

  story("Pressing an answer's column lists those who gave it, with when they were last written to.");
  const going = page.getByRole("link", { name: new RegExp(`^${staffCopy.statuses.going} \\d`) });
  await going.click();
  await expect(page).toHaveURL(/answer=going/);
  await expect(going).toHaveAttribute("aria-current", "true");
  await frame(page, "Those going");

  story("An ask staff made can be edited, on its own page.");
  runSql(
    flowDatabase,
    "INSERT INTO asks (slug, title, kind, asked_by) VALUES ('our-letter', 'Our letter', 'letter', '{pauseai}')",
  );
  await page.goto(`${BASE}/staff/asks/our-letter`);
  await expect(page.getByText(staffCopy.asks.page.noWay)).toBeVisible();
  await frame(page, "A letter's page, with nothing yet");
  await page.getByRole("link", { name: staffCopy.asks.edit }).click();
  await expect(page).toHaveURL(`${BASE}/staff/asks/our-letter/edit`);
  await frame(page, "Its form");
});

test("An ask's pages", async ({ page, flowDatabase }) => {
  story(
    "A hundred and fifty politicians have signed. Their column shows the first few, and leads to them all, a hundred to a page.",
  );
  runSql(
    flowDatabase,
    `INSERT INTO asks (slug, title, kind, asked_by) VALUES ('our-letter', 'Our letter', 'letter', '{pauseai}');
     WITH people AS (
       INSERT INTO notable_people (kind, airtable_id, name)
       SELECT 'politician', 'recMany' || n, 'Signer ' || lpad(n::text, 3, '0') FROM generate_series(1, 162) n RETURNING id, name
     ), seats AS (
       INSERT INTO politicians (id, house, constituency, party, country)
       SELECT id, 'commons', 'Exampleton ' || right(name, 3), 'Example Party', 'england' FROM people
     )
     INSERT INTO ask_statuses (notable_person_id, ask, ask_kind, status, updated_by)
     SELECT id, 'our-letter', 'letter', CASE WHEN right(name, 3)::int <= 150 THEN 'signed' ELSE 'declined' END, 'jo@pauseai.uk' FROM people`,
  );
  await logIn(page, flowDatabase, ["supporters"]);
  await page.goto(`${BASE}/staff/asks/our-letter`);
  await frame(page, "The column of those who signed");
  await page.getByRole("link", { name: staffCopy.asks.page.allOf(150) }).click();
  await expect(page.getByText(staffCopy.campaigns.politicians(150))).toBeVisible();
  await frame(page, "The first page");

  story("Next shows the rest, and the answer chosen stays chosen.");
  await page.getByRole("link", { name: staffCopy.paging.next }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByRole("link", { name: `${staffCopy.statuses.signed} 150` })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await frame(page, "The second page");

  story("The other answer's column top chooses that answer instead.");
  await page.getByRole("link", { name: `${staffCopy.statuses.declined} 12` }).click();
  await expect(page.getByText(staffCopy.campaigns.politicians(12))).toBeVisible();
  await frame(page, "Those who declined");

  story("Under the answers, a link leads to everyone who answered, on the politicians list.");
  await page.getByRole("link", { name: staffCopy.asks.page.everyone }).click();
  await expect(page).toHaveURL(/\/staff\/politicians\?ask=our-letter/);
  await frame(page, "Those who answered, on the politicians list");
});

test("Sent emails", async ({ page, flowDatabase }) => {
  story("Sent emails lists every email the site has sent: what it was, who it was to and from, and how it went.");
  await sentLetterId(page, flowDatabase, madeUpAddress("Jane Smith", 42));
  await logIn(page, flowDatabase, ["admin", "supporters"]);
  await page.goto(`${BASE}/staff/sent-emails`);
  await expect(page.getByRole("link", { name: "Jane Smith" }).first()).toBeVisible();
  await frame(page, "The sent emails");

  story("Staff can search by address or subject, and filter by kind.");
  await addFilter(page, staffCopy.sentEmails.filters.purpose, staffCopy.sentEmails.purposes.letter);
  await expect(page).toHaveURL(/purpose=letter/);
  await frame(page, "Only letters");

  story("Only admins can open it.");
  await logIn(page, flowDatabase, ["supporters"]);
  await page.goto(`${BASE}/staff/sent-emails`);
  await expect(page).toHaveURL(`${BASE}/staff`);
});

test("A new ask", async ({ page, flowDatabase }) => {
  story("Staff add an ask from the asks page: an event, a winter reception.");
  await logIn(page, flowDatabase);
  const asks = staffCopy.asks;
  await page.goto(`${BASE}/staff/asks`);
  await frame(page, "The asks");
  await page.getByRole("link", { name: asks.newTitle }).click();
  await page.getByRole("radio", { name: asks.kinds.event }).click();
  await page.getByLabel(asks.byKind.event.title).fill("Winter reception");
  await chooseDay(page, asks.byKind.event.date, "2026-12-09");
  await frame(page, "The new ask, filled in");
  await page.getByRole("button", { name: asks.save }).click();
  await expect(page.getByText(asks.notices.added)).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Winter reception" })).toBeVisible();
  await frame(page, "The ask, added");

  story("They edit it to add the event's web address. Its title links there.");
  await page.getByRole("link", { name: "Winter reception" }).click();
  await page.getByRole("link", { name: asks.edit }).click();
  await expect(page.getByText("winter-reception-dec-2026", { exact: true })).toBeVisible();
  await page.getByLabel(asks.byKind.event.url).fill("https://luma.com/winter");
  await page.getByRole("button", { name: asks.save }).click();
  // Back on the list, saying so: the link alone can be there before the list is what's shown.
  await expect(page.getByText(asks.notices.saved)).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(asks.title);
  await expect(page.getByRole("link", { name: "Winter reception" })).toHaveAttribute(
    "href",
    "/staff/asks/winter-reception-dec-2026",
  );
  await frame(page, "The ask, changed");
  story("Then they delete it. Delete asks to be pressed a second time.");
  await page.getByRole("link", { name: "Winter reception" }).click();
  await page.getByRole("link", { name: asks.edit }).click();
  await page.getByRole("button", { name: asks.delete }).click();
  await expect(page.getByRole("button", { name: staffCopy.deleteIt })).toBeFocused();
  await frame(page, "Delete, pressed once", { window: true });
  await page.getByRole("button", { name: staffCopy.deleteIt }).click();
  await expect(page.getByText(asks.notices.deleted)).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Winter reception" })).toHaveCount(0);
  await frame(page, "The ask, deleted");
});
