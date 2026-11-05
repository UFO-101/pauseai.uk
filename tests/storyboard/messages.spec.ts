import type { Page } from "@playwright/test";
import { staffCopy } from "@/lib/content/staff-interface";
import { runSql } from "@/scripts/fresh-database.mjs";
import { addStaffAccount, importLuma, logInAsStaff, newestEmail } from "../steps";
import { BASE, emailFrame, expect, frame, story, test } from "./fixtures";

// Messages to supporters: started from the supporters list's Contact filter,
// by email or text; a text on a WhatsApp approved template, or on new words
// held for approval; who it's to changed from the list; and the pages of those
// sent, with each copy's replies, made in the database as scheduling and
// sending would make them.

const copy = staffCopy.messagePages;
const mailingCopy = staffCopy.mailingPages;
const EMAIL = "contact=email%3Aluma-calendar%3Ayes";
const TEXT = "contact=phone%3Aluma-calendar%3Ayes";
const WORDS =
  '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Hi "}, {"type": "field", "attrs": {"field": "firstName"}}, {"type": "text", "text": ", the march meets at 11:00 at Parliament Square."}]}]}';

/** This flow's own staff address: flows run alongside each other, and share the outbox. */
const staffEmail = () => `msg-${test.info().testId.replace(/\W/g, "").slice(-8)}@pauseai.uk`;

async function logIn(page: Page, database: string) {
  addStaffAccount(database, staffEmail(), ["supporters"]);
  return logInAsStaff(page, BASE, staffEmail());
}

/** Starts a message from the supporters list, with these filters, and opens the writer. */
async function startFromList(page: Page, filters: string) {
  await page.goto(`${BASE}/staff/supporters?${filters}`);
  await page.getByRole("button", { name: /⁂ Message \d+ supporter/ }).click();
  await expect(page).toHaveURL(/\/staff\/messages\/\d+$/);
}

/** Templates WhatsApp has approved, more than show at first. */
function addTemplates(database: string) {
  runSql(
    database,
    `INSERT INTO message_templates (name, body, status, created_by, approved_at)
     SELECT name, '${WORDS}', 'approved', by, '2026-10-01T10:00:00Z'::timestamptz - n * interval '1 day'
     FROM (VALUES ('March day reminder', 'jo@pauseai.uk', 1), ('PauseCon room change', 'sam@pauseai.uk', 2),
       ('Event reminder', 'jo@pauseai.uk', 3), ('Local group meetup', 'jo@pauseai.uk', 4),
       ('Write to your MP', NULL, 5), ('Thank you for coming', 'sam@pauseai.uk', 6)) t (name, by, n)`,
  );
}

/**
 * A message that went, as sending leaves one: to everyone who said yes, the
 * first delivered and read and answered, the next failed, the next skipped as
 * they'd stopped. Returns its ID and the first's copy.
 */
function addSent(database: string, channel: "email" | "text", title: string): { id: string; copy: string } {
  const contact = channel === "email" ? "email:luma-calendar:yes" : "phone:luma-calendar:yes";
  const [id] = runSql(
    database,
    `INSERT INTO mailings (title, subject, audience, channel, topic, filter, body, created_by, sent_from, from_name, due_at, state)
     VALUES ('${title}', '${channel === "email" ? title : ""}', 'supporters', '${channel}', 'luma-calendar',
       '{"list": "supporters", "params": {"contact": "${contact}"}}', '${WORDS}', 'jo@pauseai.uk',
       '${channel === "email" ? "hello@pauseai.uk" : "+447700900000"}', 'PauseAI UK', '2026-10-15T08:18:00Z', 'sent')
     RETURNING id`,
  );
  const [first] = runSql(
    database,
    `WITH people AS (
       SELECT s.id, row_number() OVER (ORDER BY s.id) AS n FROM supporters s),
     c AS (
       INSERT INTO messages_to_supporters (mailing_id, supporter_id, address, status, skip_reason, merge_values, sent_at)
       SELECT ${id}, p.id, 'person' || p.n || '${channel === "email" ? "@example.com" : ""}',
         (ARRAY['delivered', 'failed', 'skipped'])[least(p.n, 3)],
         CASE WHEN p.n >= 3 THEN 'unsubscribed' END,
         json_build_object('name', 'Person ' || p.n, 'place', 'Leeds', 'values', json_build_object('firstName', 'Person'), 'meets', '[]'::json),
         CASE WHEN p.n < 3 THEN '2026-10-15T08:18:00Z'::timestamptz END
       FROM people p WHERE p.n <= 4 RETURNING id, status)
     SELECT min(id) FROM c`,
  );
  runSql(
    database,
    `INSERT INTO message_events (message_id, kind, at) VALUES
       (${first}, 'delivered', '2026-10-15T08:19:00Z'), (${first}, 'read', '2026-10-15T09:00:00Z')`,
  );
  runSql(
    database,
    `INSERT INTO message_replies (message_id, body, at) VALUES (${first}, 'Is it OK to bring my dog?', '2026-10-16T09:30:00Z')`,
  );
  return { id, copy: first };
}

test("Messaging supporters by email", async ({ page, request, flowDatabase }) => {
  story(
    "Staff open the supporters list. Message needs a Contact filter, as that says who said yes and how, so it's dashed.",
  );
  await importLuma(request, BASE);
  await logIn(page, flowDatabase);
  await page.goto(`${BASE}/staff/supporters`);
  await frame(page, "The supporters list, Message dashed");
  story("Pressing it says which filter to add.");
  await page.getByRole("link", { name: /⁂ Message \d+ supporter/ }).click();
  await expect(page.getByText(copy.needsContact)).toBeVisible();
  await frame(page, "It says which filter to add");
  story(
    "With the Contact filter on those who can be emailed, answered yes, the button is live, counting who it finds.",
  );
  await page.goto(`${BASE}/staff/supporters?${EMAIL}`);
  await expect(page.getByRole("button", { name: /⁂ Message \d+ supporter/ })).toBeVisible();
  await frame(page, "The list, ready to message");
  story("It makes a draft to them and opens the writer: by email, from PauseAI UK, with who's left out.");
  await page.getByRole("button", { name: /⁂ Message \d+ supporter/ }).click();
  await expect(page).toHaveURL(/\/staff\/messages\/\d+$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy.newTitle.email);
  await frame(page, "The new email");
  story("They write a subject and a line, and the preview shows it as one supporter will get it.");
  await page.getByLabel(copy.subject).fill("Events near you this month");
  const words = page.getByRole("textbox", { name: copy.emailLabel });
  await words.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("See you at the march.");
  await expect(page.getByRole("status").first()).toHaveText(mailingCopy.savePill.saved);
  const preview = page.getByRole("region", { name: copy.sections.preview });
  await expect(preview.getByText("See you at the march.")).toBeVisible();
  await preview.getByRole("button", { name: copy.sendTest }).scrollIntoViewIfNeeded();
  await frame(page, "The email and its preview", { window: true });
  story("A case button shows those without a first name, who get the fallback, as one with none is on the list.");
  const noName = preview.getByRole("button", { name: copy.hasFirstName });
  await expect(noName).toHaveAttribute("aria-pressed", "true");
  await noName.click();
  await expect(noName).toHaveAttribute("aria-pressed", "false");
  await frame(page, "The preview, for someone with no first name", { window: true });
  await noName.click();
  story("Send test sends them a copy, by Postmark, as that supporter would get it.");
  await preview.getByRole("button", { name: copy.sendTest }).click();
  await expect(preview.getByText(copy.testSent(staffEmail()))).toBeVisible();
  const email = newestEmail((one) => one.To.includes(`<${staffEmail()}>`))!;
  expect(email.Subject).toBe("Events near you this month");
  await emailFrame(page, email, "The test copy");
  story("They pick the 14:00 hour, and see what it'll send and cost, then schedule it.");
  await page.getByLabel(mailingCopy.hour, { exact: false }).selectOption("14");
  await expect(page.getByRole("status").first()).toHaveText(mailingCopy.savePill.saved);
  const send = page.getByRole("region", { name: copy.sections.send });
  await send.scrollIntoViewIfNeeded();
  await frame(page, "What will go, and what it costs", { window: true });
  await send.getByRole("button", { name: /⁂ Schedule/ }).click();
  await expect(page.getByRole("button", { name: mailingCopy.unschedule })).toBeVisible();
  await frame(page, "The email, scheduled");
  story("It's in the list of messages, under Coming up.");
  await page.goto(`${BASE}/staff/messages`);
  await expect(page.getByRole("link", { name: "Events near you this month" })).toBeVisible();
  await frame(page, "The list of messages");
  story("Unschedule makes it a draft again.");
  await page.getByRole("link", { name: "Events near you this month" }).click();
  await page.getByRole("button", { name: mailingCopy.unschedule }).click();
  await expect(page.getByLabel(copy.subject)).toHaveValue("Events near you this month");
  await frame(page, "A draft again");
});

test("A text on an approved template", async ({ page, request, flowDatabase }) => {
  story(
    "Staff message those who can be texted. A text has no subject or files: its words are a template WhatsApp has approved.",
  );
  await importLuma(request, BASE);
  addTemplates(flowDatabase);
  await logIn(page, flowDatabase);
  await startFromList(page, TEXT);
  await expect(page.getByRole("group", { name: copy.templatesLabel })).toBeVisible();
  await frame(page, "The new text, its templates to choose from");
  story("There are more than five, so Show all shows the rest, and the search finds by name or words.");
  await page.getByRole("button", { name: copy.showAll(6) }).click();
  await expect(page.getByText("Thank you for coming")).toBeVisible();
  await frame(page, "All the templates");
  await page.getByLabel(copy.searchTemplates).fill("march day");
  await expect(page.getByText("Event reminder")).toHaveCount(0);
  await frame(page, "The templates, searched");
  story(
    "Choosing one collapses the list to it. Its words can't be changed, and the preview shows the text as a bubble with its Stop button.",
  );
  await page.getByRole("radio", { name: /March day reminder/ }).click();
  await expect(page.getByRole("button", { name: copy.changeTemplate })).toBeVisible();
  await expect(page.getByRole("status").first()).toHaveText(mailingCopy.savePill.saved);
  await frame(page, "A template chosen");
  story("They choose the hour. Grey under it says when it would stop sending.");
  await page.getByLabel(mailingCopy.hour, { exact: false }).selectOption("14");
  await expect(page.getByText(/⁂ Will automatically stop sending/)).toBeVisible();
  await expect(page.getByRole("status").first()).toHaveText(mailingCopy.savePill.saved);
  const send = page.getByRole("region", { name: copy.sections.send });
  await send.scrollIntoViewIfNeeded();
  await frame(page, "When, and what it costs", { window: true });
  await send.getByRole("button", { name: /⁂ Schedule/ }).click();
  await expect(page.getByRole("button", { name: mailingCopy.unschedule })).toBeVisible();
  await expect(page.getByText(copy.waitingStrip)).toHaveCount(0);
  await frame(page, "The text, scheduled");
});

test("A text on new words", async ({ page, request, flowDatabase }) => {
  story(
    "No template says it, so staff choose New template, the list's last row. There are fields, but no parts for only some, as WhatsApp's words are the same for everyone.",
  );
  await importLuma(request, BASE);
  addTemplates(flowDatabase);
  await logIn(page, flowDatabase);
  await startFromList(page, TEXT);
  await page.getByRole("radio", { name: new RegExp(copy.newTemplate) }).click();
  const words = page.getByRole("textbox", { name: copy.newTemplate });
  await words.click();
  await page.keyboard.type("The march meets at 11:00 at Parliament Square.");
  await expect(page.getByRole("status").first()).toHaveText(mailingCopy.savePill.saved);
  await page.getByLabel(mailingCopy.hour, { exact: false }).selectOption("14");
  await expect(page.getByRole("status").first()).toHaveText(mailingCopy.savePill.saved);
  await frame(page, "New words, and what they need");
  story("Scheduling sends them for approval. The text holds, and says so on its page.");
  const send = page.getByRole("region", { name: copy.sections.send });
  await send.getByRole("button", { name: /once approved/ }).click();
  await expect(page.getByText(copy.waitingStrip)).toBeVisible();
  await frame(page, "Scheduled, waiting for WhatsApp's approval");
  story("And in the list.");
  const id = new URL(page.url()).pathname.split("/").at(-1);
  await page.goto(`${BASE}/staff/messages`);
  await expect(page.getByText(copy.waiting)).toBeVisible();
  await frame(page, "The list, one waiting");
  story(
    "WhatsApp rejects them. The text is a draft again, with why in plain words, for staff to change and schedule again.",
  );
  runSql(
    flowDatabase,
    `UPDATE message_templates SET status = 'rejected', rejected_at = '2026-10-16T11:00:00Z', rejected_reason = 'The text ends with a merge field.' WHERE status = 'pending'`,
  );
  runSql(flowDatabase, `DELETE FROM messages_to_supporters WHERE mailing_id = ${id}`);
  runSql(flowDatabase, `UPDATE mailings SET state = 'draft' WHERE id = ${id}`);
  await page.goto(`${BASE}/staff/messages/${id}`);
  await expect(page.getByText(/The text ends with a merge field/)).toBeVisible();
  await frame(page, "Rejected, and what to do");
});

test("Changing who a message goes to", async ({ page, request, flowDatabase }) => {
  story(
    "On a draft, Change who opens the supporters list choosing for it: the dark strip at the top naming the draft, and the dark bar at the foot.",
  );
  await importLuma(request, BASE);
  await logIn(page, flowDatabase);
  await startFromList(page, EMAIL);
  await page.getByLabel(copy.subject).fill("Change me");
  await expect(page.getByRole("status").first()).toHaveText(mailingCopy.savePill.saved);
  const draft = page.url();
  await page.getByRole("link", { name: mailingCopy.changeWho }).click();
  await expect(page.getByText(copy.choosing("Change me"))).toBeVisible();
  const bar = page.getByRole("region", { name: copy.choosingLabel });
  await expect(bar).toBeVisible();
  await expect(page.getByRole("button", { name: /⁂ Message \d+ supporter/ })).toHaveCount(0);
  await frame(page, "The list, choosing for the draft", { window: true });
  story("There are no ticks: they narrow the filters, here to one search, and the bar counts who that finds.");
  const url = new URL(page.url());
  url.searchParams.set("q", "fixture");
  await page.goto(url.toString());
  await expect(bar.getByRole("button", { name: /⁂ Use these/ })).toBeVisible();
  await frame(page, "Narrowed", { window: true });
  story("Take off the Contact filter and the bar says it's needed, as the message's channel and topic are fixed.");
  const without = new URL(page.url());
  without.searchParams.delete("contact");
  await page.goto(without.toString());
  await expect(page.getByText(copy.keepContact)).toBeVisible();
  await frame(page, "Without its Contact filter", { window: true });
  story("Back with the filter, the orange button keeps them for the draft.");
  await page.goto(url.toString());
  await bar.getByRole("button", { name: /⁂ Use these/ }).click();
  await expect(page).toHaveURL(draft);
  await expect(page.getByRole("list", { name: copy.facts.who })).toContainText("fixture");
  await frame(page, "The draft, to those found");
  story("Cancel at the top goes back and changes nothing.");
  await page.getByRole("link", { name: mailingCopy.changeWho }).click();
  await page.getByRole("link", { name: copy.choosingCancel }).click();
  await expect(page).toHaveURL(draft);
});

test("An email sent, and replying", async ({ page, request, flowDatabase }) => {
  story(
    "An email has gone. The list says how it went, and its page has the counts, the email and everyone it went to.",
  );
  await importLuma(request, BASE);
  const sent = addSent(flowDatabase, "email", "Thank you for marching");
  await logIn(page, flowDatabase);
  await page.goto(`${BASE}/staff/messages`);
  await frame(page, "The list, one sent");
  await page.getByRole("link", { name: "Thank you for marching" }).first().click();
  await expect(page.getByRole("heading", { name: copy.recipientsTitle })).toBeVisible();
  await frame(page, "The email's page");
  story("A count shows those it counts.");
  await page.getByRole("link", { name: new RegExp(copy.counts.stopped) }).click();
  await expect(page.getByRole("heading", { name: copy.tabs.stopped })).toBeVisible();
  await frame(page, "Those who stopped");
  story(
    "Each recipient leads to their copy: the email and their reply as the thread, with a box to answer from the site.",
  );
  await page.goto(`${BASE}/staff/messages/${sent.id}/${sent.copy}`);
  await expect(page.getByText("Is it OK to bring my dog?")).toBeVisible();
  await frame(page, "Message and reply");
  await page.getByLabel(copy.reply).fill("Yes, dogs are welcome.");
  await page.getByRole("button", { name: copy.sendReply.email }).click();
  await expect(page.getByText("Yes, dogs are welcome.")).toBeVisible();
  await frame(page, "The reply sent");
  story("The supporter's page lists the message, with their reply.");
  const [supporter] = runSql(flowDatabase, `SELECT supporter_id FROM messages_to_supporters WHERE id = ${sent.copy}`);
  await page.goto(`${BASE}/staff/supporters/${supporter}`);
  await expect(page.getByRole("heading", { name: copy.supporterTitle })).toBeVisible();
  await page.getByRole("heading", { name: copy.supporterTitle }).scrollIntoViewIfNeeded();
  await frame(page, "On the supporter's page", { window: true });
});

test("A text sent, and the conversation", async ({ page, request, flowDatabase }) => {
  story("A text has gone. Its page shows the bubble where an email's shows the email, and how many read it.");
  await importLuma(request, BASE);
  const sent = addSent(flowDatabase, "text", "March day: where to meet");
  await logIn(page, flowDatabase);
  await page.goto(`${BASE}/staff/messages/${sent.id}`);
  await expect(page.getByText(copy.textTitle)).toBeVisible();
  await frame(page, "The text's page");
  story(
    "Someone replied. Their copy shows the conversation, and a reply is free for 24 hours after their last message.",
  );
  await page.goto(`${BASE}/staff/messages/${sent.id}/${sent.copy}`);
  await expect(page.getByText(/⁂ Free to reply until/)).toBeVisible();
  await frame(page, "The conversation");
  await page.getByLabel(copy.reply).fill("Yes, dogs are welcome.");
  await page.getByRole("button", { name: copy.sendReply.text }).click();
  await expect(page.getByText("Yes, dogs are welcome.")).toBeVisible();
  await frame(page, "The reply sent");
});
