import { campaigns } from "@/lib/content/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import { runSql } from "@/scripts/fresh-database.mjs";
import { addFilter, syncPoliticians } from "../steps";
import { BASE, expect, frame, madeUpAddress, story, test } from "./fixtures";
import { importEmails, logIn, sentLetterId } from "./staff-steps";

// Campaigns, each ask's page, the sent emails and the new tag. Each flow on its
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

  story("A campaign's page has its letter, with how many changed its wording, beside its letters.");
  await page.getByRole("link", { name: campaigns[0].title }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(campaigns[0].title);
  await expect(page.getByRole("region", { name: copy.theLetter })).toContainText(campaigns[0].subject);
  await frame(page, "A campaign's page");

  story("Each count shows those letters. None has failed.");
  await page
    .getByRole("link", { name: /failed/ })
    .first()
    .click();
  await expect(page).toHaveURL(/tab=failed/);
  await expect(page.getByText(staffCopy.letters.none)).toBeVisible();
  await frame(page, "No letters failed");
});

test("Asks", async ({ page, request, flowDatabase }) => {
  story("Asks is a table of questions, with who was written to, who answered and how they were asked.");
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase, ["supporters"]);
  await importEmails(page);
  await page.goto(`${BASE}/staff/asks`);
  await frame(page, "The asks");

  story("An ask's page says what they were asked, and joins how we asked with what they answered.");
  await page.getByRole("link", { name: "Edinburgh conference" }).first().click();
  await expect(page.getByText(staffCopy.politician.askedThem("PauseAI", "event"))).toBeVisible();
  await expect(page.getByRole("heading", { name: staffCopy.asks.page.howWeAsked })).toBeVisible();
  await frame(page, "An event's page");

  story("Each answer's pill shows those who gave it.");
  const going = page.getByRole("link", { name: new RegExp(`^${staffCopy.statuses.going} \\d`) });
  await going.click();
  await expect(going).toHaveAttribute("aria-current", "true");
  await frame(page, "Those going");

  story("No answer shows those written to who haven't answered, whoever was written to longest ago first.");
  const unanswered = page.getByRole("link", { name: new RegExp(`^${staffCopy.statuses.noAnswer} \\d`) });
  await unanswered.click();
  await expect(unanswered).toHaveAttribute("aria-current", "true");
  await frame(page, "Those with no answer");

  story("One staff made can be edited, on a page of its own.");
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

test("Sent emails", async ({ page, flowDatabase }) => {
  story(
    "An admin sees every email the site has sent, with no heading, as the menu names it: what, to and from whom, and how it went.",
  );
  await sentLetterId(page, flowDatabase, madeUpAddress("Jane Smith", 42));
  await logIn(page, flowDatabase, ["admin", "supporters"]);
  await page.goto(`${BASE}/staff/sent-emails`);
  await expect(page.getByRole("link", { name: "Jane Smith" }).first()).toBeVisible();
  await frame(page, "The sent emails");

  story("It searches by address or subject, and filters by what it was.");
  await addFilter(page, staffCopy.sentEmails.filters.purpose, staffCopy.sentEmails.purposes.letter);
  await expect(page).toHaveURL(/purpose=letter/);
  await frame(page, "Only letters");

  story("Only admins can open it.");
  await logIn(page, flowDatabase, ["supporters"]);
  await page.goto(`${BASE}/staff/sent-emails`);
  await expect(page).toHaveURL(`${BASE}/staff`);
});

test("The new tag", { tag: "@desktop-only" }, async ({ page, flowDatabase }) => {
  story("A page someone first saw in the last 3 days is marked new; everything they'd seen before isn't.");
  await logIn(page, flowDatabase, ["admin", "supporters"]);
  const email = runSql(flowDatabase, "SELECT email FROM staff_sessions ORDER BY created_at DESC LIMIT 1")[0];
  runSql(
    flowDatabase,
    `UPDATE staff_nav_seen SET first_seen_at = now() WHERE email = '${email}' AND page IN ('campaigns', 'sentEmails')`,
  );
  await page.goto(`${BASE}/staff`);
  const nav = page.getByRole("navigation", { name: staffCopy.nav.title }).first();
  await expect(
    nav.getByRole("link", { name: `${staffCopy.nav.campaigns} ${staffCopy.nav.newTag}` }).first(),
  ).toBeVisible();
  await frame(page, "New in the menu");

  story("With the menu folded to a rail of icons, a dot says the same.");
  await nav.getByRole("button", { name: staffCopy.nav.fold }).click();
  await expect(nav.getByRole("button", { name: staffCopy.nav.unfold })).toBeVisible();
  await frame(page, "New on the rail");
  await nav.getByRole("button", { name: staffCopy.nav.unfold }).click();

  story("Three days later, it's gone.");
  runSql(flowDatabase, `UPDATE staff_nav_seen SET first_seen_at = now() - interval '4 days' WHERE email = '${email}'`);
  await page.reload();
  await expect(nav.getByRole("link", { name: staffCopy.nav.campaigns }).first()).not.toContainText(
    staffCopy.nav.newTag,
  );
  await frame(page, "No longer new");
});

test("The new tag on a phone", { tag: "@phone-only" }, async ({ page, flowDatabase }) => {
  story("On a phone, the menu that drops down marks the same pages.");
  await logIn(page, flowDatabase, ["admin", "supporters"]);
  const email = runSql(flowDatabase, "SELECT email FROM staff_sessions ORDER BY created_at DESC LIMIT 1")[0];
  runSql(
    flowDatabase,
    `UPDATE staff_nav_seen SET first_seen_at = now() WHERE email = '${email}' AND page = 'campaigns'`,
  );
  await page.goto(`${BASE}/staff`);
  await page.getByRole("group").locator("summary").click();
  await expect(page.getByRole("group").getByRole("link", { name: staffCopy.nav.campaigns })).toContainText(
    staffCopy.nav.newTag,
  );
  await frame(page, "New in the phone's menu", { window: true });
});
