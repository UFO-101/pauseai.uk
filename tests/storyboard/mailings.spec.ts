import type { Page } from "@playwright/test";
import { staffCopy } from "@/lib/content/staff-interface";
import { runSql } from "@/scripts/fresh-database.mjs";
import { addStaffAccount, logInAsStaff, newestEmail, syncPoliticians } from "../steps";
import { BASE, emailFrame, expect, frame, story, test } from "./fixtures";
import { stayOnPage } from "./staff-steps";
import { scrollSettled } from "./settle";

// Mailings to politicians written on the site: started from New mailing,
// who it's for chosen on the politicians list, written and saved as a
// draft, previewed and sent to yourself as a test; who it's to changed
// from the list, and a draft deleted; one sent
// from your Gmail, connected from the page, scheduled and sent by the
// hourly job; and the pages of mailings scheduled, sending and sent, made in
// the database as scheduling would make them.

const copy = staffCopy.mailingPages;

/** This flow's own staff address: flows run alongside each other, and share the outbox. */
const staffEmail = () => `mail-${test.info().testId.replace(/\W/g, "").slice(-8)}@pauseai.uk`;

async function logIn(page: Page, database: string) {
  addStaffAccount(database, staffEmail());
  return logInAsStaff(page, BASE, staffEmail());
}

/** Starts a mailing to every politician in office, and writes enough of it to be kept. */
async function startDraft(page: Page, subject: string) {
  await page.goto(`${BASE}/staff/politicians`);
  await page.getByRole("link", { name: /Mail these/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy.newTitle);
  await page.getByLabel(copy.subject).fill(subject);
  await expect(page.getByRole("status").first()).toHaveText(copy.savePill.saved);
  await expect(page).toHaveURL(/\/staff\/mailings\/\d+$/);
}

/**
 * A mailing written here, in `state`, from Jo, to every politician with
 * an address, as scheduling makes one: a PauseAI letter each, in `statuses`
 * by name, or with `everyone`, to those with no address too. A status
 * "skipped" is skipped as the address was blocked; "skipped:left-office"
 * says why. Returns its ID.
 */
function addMailing(database: string, title: string, state: string, statuses: string[], everyone = false): string {
  const letter =
    '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Dear "}, {"type": "field", "attrs": {"field": "salutation"}}, {"type": "text", "text": ", will you come?"}]}]}';
  const [id] = runSql(
    database,
    `INSERT INTO mailings (title, subject, audience, channel, filter, body, created_by, sent_from, from_name, due_at, state, ask)
     VALUES ('${title}', '${title}', 'politicians', 'email', '{"list": "politicians", "params": {}}', '${letter}',
       'jo@pauseai.uk', 'jo@pauseai.uk', 'Jo Example', '2026-10-20T08:00:00Z', '${state}', 'edinburgh-conference-2026')
     RETURNING id`,
  );
  runSql(
    database,
    `WITH given AS (
       SELECT n.id, (ARRAY[${statuses.map((s) => `'${s}'`).join(", ")}])[row_number() OVER (ORDER BY n.name)] AS given
       FROM notable_people n JOIN politicians p USING (id) WHERE ${everyone ? "true" : "n.email IS NOT NULL"} AND NOT p.is_test),
     r AS (SELECT id, split_part(given, ':', 1) AS status, nullif(split_part(given, ':', 2), '') AS reason FROM given),
     l AS (
       INSERT INTO letters (kind, notable_person_id, status, sent_at, replied_at)
       SELECT 'pauseai', r.id, r.status, CASE WHEN r.status IN ('sent', 'bounced') THEN '2026-10-20T08:00:00Z'::timestamptz END,
         CASE WHEN r.status = 'sent' AND r.id = (SELECT min(id) FROM r) THEN '2026-10-21T10:00:00Z'::timestamptz END
       FROM r WHERE r.status IS NOT NULL RETURNING id, notable_person_id, status)
     INSERT INTO letters_from_pauseai (id, mailing_id, skip_reason)
     SELECT l.id, ${id}, CASE WHEN l.status = 'skipped' THEN coalesce(r.reason, 'blocked') END
     FROM l JOIN r ON r.id = l.notable_person_id`,
  );
  return id;
}

test("A new mailing", async ({ page, request, flowDatabase }) => {
  story("Staff connect their Gmail on their account page, so there's one to send from, then open the mailings page.");
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  // Your Gmail connected, on your account page, so there's one to send from.
  await page.goto(`${BASE}/staff/me`);
  await page.getByRole("link", { name: staffCopy.gmail.connect }).click();
  await expect(page.getByText(staffCopy.gmail.outcomes.connected)).toBeVisible();
  await page.goto(`${BASE}/staff/mailings`);
  await frame(page, "The mailings page");
  story(
    "New mailing opens the politicians list, to choose who it's for. Down the list, what they're doing stays at the top of the window, and the way on at the foot.",
  );

  await page.getByRole("link", { name: copy.newTitle }).click();
  await expect(page.getByText(copy.choosingNew)).toBeVisible();
  // It opens at the top, as a page does, though the strip is held there.
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  // Down the list, what's being done stays at the top, and the way on at the foot.
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  await frame(page, "Every politician, scrolled down", {
    window: true,
  });
  story("They choose the Scottish Parliament. The bar at the foot says how many that is, with Write to this one.");
  await page.getByRole("link", { name: staffCopy.houses["scottish-parliament"] }).click();
  await expect(page).toHaveURL(/house=scottish-parliament/);
  const bar = page.getByRole("region", { name: copy.choosingCount(1) });
  await expect(bar).toBeVisible();
  await frame(page, "The politicians list, filtered", {
    window: true,
  });
  story("Write to this one opens a new mailing to them. Nothing is saved yet.");

  await bar.getByRole("link", { name: copy.writeToThese(1) }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy.newTitle);
  await expect(page.getByRole("status").first()).toHaveText("");
  await frame(page, "The new mailing");
  story(
    "They write a subject, and a line under the greeting. The mailing is saved as a draft, and the preview shows the email as Morag Example will get it.",
  );

  await page.getByLabel(copy.subject).fill("Edinburgh: one week to go");
  // The letter starts with its greeting; the rest is written under it.
  const letter = page.getByRole("textbox", { name: copy.letter });
  await expect(letter).toContainText(`${copy.greeting} ${staffCopy.mailingEditor.fields.salutation},`);
  await letter.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("We hope to see you there.");
  await expect(page.getByRole("status").first()).toHaveText(copy.savePill.saved);
  await expect(page).toHaveURL(/\/staff\/mailings\/\d+$/);
  const preview = page.getByRole("region", { name: copy.sections.preview });
  await expect(preview.getByText("We hope to see you there.")).toBeVisible();
  await expect(preview.getByText("Dear Ms Example,")).toBeVisible();
  await preview.getByRole("button", { name: copy.sendTest }).scrollIntoViewIfNeeded();
  await frame(page, "The draft and its preview", {
    window: true,
  });
  story("Send test sends them a copy, as Morag would get it.");

  await preview.getByRole("button", { name: copy.sendTest }).click();
  await expect(preview.getByText(copy.testSent(staffEmail()))).toBeVisible();
  const email = newestEmail((one) => one.To === `"Morag Example" <${staffEmail()}>`)!;
  expect(email.Subject).toBe("Edinburgh: one week to go");
  expect(email.TextBody).toBe("Dear Ms Example,\n\nWe hope to see you there.");
  await emailFrame(page, email, "The test copy");
  story("Reloaded, the draft is as they left it, to go from their Gmail.");

  // Reopened, it's the draft as it was.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Edinburgh: one week to go");
  await expect(page.getByLabel(copy.fromLegend, { exact: false })).toHaveValue(staffEmail());
});

test("Changing and deleting a draft", async ({ page, request, flowDatabase }) => {
  story(
    "Staff start a draft to every politician in office, then press Change who. The draft is saved, and the button waits while the politicians list comes.",
  );
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  await startDraft(page, "Lords only");
  // The list kept from coming, so the button can be seen waiting for it.
  const list = await stayOnPage(page, /\/staff\/politicians/);
  const changeWho = page.getByRole("link", { name: copy.changeWho });
  await changeWho.click();
  await expect(changeWho.locator("[aria-hidden]")).toBeVisible();
  await frame(page, "Change who, waiting", {
    window: true,
  });
  story(
    "The list names the draft at the top. They choose the Lords, and the bar's button uses them for the draft instead.",
  );
  await page.goto(await list.asked());
  await expect(page).toHaveURL(/mailing=\d+/);
  await expect(page.getByText(copy.choosingDraft("Lords only"))).toBeVisible();
  await page.getByRole("link", { name: staffCopy.houses.lords }).click();
  await expect(page).toHaveURL(/house=lords/);
  const use = page.getByRole("button", { name: copy.useThese(1) });
  await expect(use).toBeVisible();
  await frame(page, "The politicians list, for the draft", {
    window: true,
  });
  story("The draft now goes to the Lords.");

  await use.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lords only");
  await expect(page.getByRole("list", { name: copy.whoLabel })).toContainText(staffCopy.houses.lords);
  await frame(page, "The draft");
  story("Delete draft asks to be pressed again.");

  await page.getByRole("button", { name: copy.deleteDraft }).click();
  await expect(page.getByRole("button", { name: staffCopy.deleteIt })).toBeFocused();
  await frame(page, "Delete draft, pressed once", { window: true });
  story("Pressed again, the draft is deleted, and gone from the mailings page.");
  await page.getByRole("button", { name: staffCopy.deleteIt }).click();
  await expect(page).toHaveURL(`${BASE}/staff/mailings`);
  await expect(page.getByRole("link", { name: "Lords only" })).toHaveCount(0);
  await frame(page, "The mailings page");
});

test("Rescheduling a mailing", async ({ page, request, flowDatabase }) => {
  story("A mailing is scheduled for 30 October. The mailings page shows it coming up, with when it goes.");
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  const id = addMailing(flowDatabase, "Edinburgh reminder", "scheduled", ["scheduled", "scheduled", "scheduled"]);
  runSql(flowDatabase, `UPDATE mailings SET due_at = '2026-10-30T09:00:00Z' WHERE id = ${id}`);
  await page.goto(`${BASE}/staff/mailings`);
  await expect(page.getByRole("listitem").filter({ hasText: "Edinburgh reminder" })).toContainText(
    copy.states.scheduled,
  );
  await frame(page, "The mailings page");
  story("Its page says when it sends, and to whom.");

  await page.getByRole("link", { name: "Edinburgh reminder" }).click();
  await expect(page.getByText(copy.sends("Fri 30 Oct at 09:18"))).toBeVisible();
  await frame(page, "The scheduled mailing");
  story("Change the time opens a calendar to choose another day.");

  await page.getByRole("button", { name: copy.changeTime }).click();
  // Opening its box scrolls the window to show it whole (Bubble.tsx). Clicking Day before that has come to rest
  // races it, and where the window ends up says whether the calendar has room below the field or opens above it.
  await scrollSettled(page);
  await page.getByRole("button", { name: copy.day }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await frame(page, "The calendar", { window: true });
  story("They choose Monday 2 November, and the 14:00 hour, in London's time.");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /^Monday 2 November 2026/ })
    .click();
  await page.getByLabel(copy.hour, { exact: false }).selectOption("14");
  await frame(page, "A new day and hour", { window: true });
  story("Change it saves the new time. Then Unschedule makes the mailing a draft again, to change and schedule later.");
  await page.getByRole("button", { name: copy.saveTime }).click();
  await expect(page.getByText(copy.sends("Mon 2 Nov at 14:18"))).toBeVisible();

  await page.getByRole("button", { name: copy.unschedule }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Edinburgh reminder");
  await expect(page.getByRole("status").first()).toHaveText(copy.savePill.saved);
  // The draft comes back wherever the click on Unschedule left the window, which isn't the same each time;
  // the frame is of the page as a whole, so from its top.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  // The bar with the title at the top of the window goes once the title is back in view, which
  // the page learns a frame or two after the scroll (MailingWriter's IntersectionObserver).
  await expect(page.locator("[data-shown]")).toHaveCount(0);
  await frame(page, "The draft");
});

test("Sending and sent", async ({ page, request, flowDatabase }) => {
  story("A mailing is part-way through sending. Its page shows how far it's got, with Stop sending.");
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  const sending = addMailing(flowDatabase, "Going out now", "sending", ["sent", "scheduled", "scheduled"]);
  await page.goto(`${BASE}/staff/mailings/${sending}`);
  await expect(page.getByText(copy.sendingBar(1, 3))).toBeVisible();
  await frame(page, "A mailing sending");
  story("Another mailing has been sent. Of its four letters, two failed: one bounced, and one was skipped.");

  const sent = addMailing(flowDatabase, "Edinburgh follow-up", "sent", ["sent", "bounced", "skipped", "sent"]);
  await page.goto(`${BASE}/staff/mailings/${sent}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Edinburgh follow-up");
  await expect(page.getByRole("link", { name: `2 ${copy.counts.failed}` })).toBeVisible();
  await frame(page, "The sent mailing");
  story("The failed count shows only those two, and pressed again goes back to everyone.");

  await page.getByRole("link", { name: `2 ${copy.counts.failed}` }).click();
  await expect(page.getByRole("row")).toHaveCount(3);
  await frame(page, "The two that failed");
  story("Each recipient links to their letter's page, under the mailing's.");

  // Each recipient leads to their letter's own page, under the mailing, back to which it goes.
  await page.getByRole("table").getByRole("link", { name: copy.theLetter }).click();
  await expect(page).toHaveURL(new RegExp(`/staff/mailings/${sent}/letters/\\d+$`));
  await expect(page.getByRole("navigation").getByRole("link", { name: "Edinburgh follow-up" })).toBeVisible();
  await frame(page, "A failed letter's page");
});

test("A stopped mailing", async ({ page, request, flowDatabase }) => {
  story(
    "A mailing was stopped part-way through. On the mailings page, its counts show one sent, four failed and one stopped.",
  );
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  addMailing(
    flowDatabase,
    "Briefing on the bill",
    "cancelled",
    // By name: Gordon, who left office; Lord Seedling, with no address; Mo; Morag; Dora; Polly.
    ["skipped:left-office", "skipped:no-email", "sent", "skipped", "not_sent", "cancelled"],
    true,
  );
  await page.goto(`${BASE}/staff/mailings`);
  const row = page.getByRole("listitem").filter({ hasText: "Briefing on the bill" });
  await expect(row).toContainText(copy.counts.stopped);
  await row.scrollIntoViewIfNeeded();
  await frame(page, "The stopped mailing, on the mailings page", { window: true });
  story(
    "On its page, the failed count shows why each of the four failed: one politician left office, one has no address, one address is blocked, and Gmail refused one.",
  );

  await row.getByRole("link", { name: "Briefing on the bill", exact: true }).click();
  await page.getByRole("link", { name: `4 ${copy.counts.failed}` }).click();
  await expect(page.getByRole("row")).toHaveCount(5);
  await frame(page, "The four that failed");
  story("The stopped count shows the one never sent, as the mailing was stopped first.");

  await page.getByRole("link", { name: `1 ${copy.counts.stopped}` }).click();
  await expect(page.getByRole("row")).toHaveCount(2);
  await frame(page, "The one never sent");
  story("Pressed again, the count is no longer chosen, and everyone shows.");

  // Pressed again, the count shows everyone.
  await page.getByRole("link", { name: `1 ${copy.counts.stopped}` }).click();
  await expect(page).toHaveURL(/\/staff\/mailings\/\d+$/);
  await expect(page.getByRole("row")).toHaveCount(7);
  await frame(page, "Everyone");
  story("The sent count shows the one letter that went.");

  await page.getByRole("link", { name: `1 ${copy.counts.sent}` }).click();
  await expect(page.getByRole("row")).toHaveCount(2);
  await frame(page, "The one sent");
});

test("Sending from your Gmail", async ({ page, request, flowDatabase }) => {
  story(
    "Staff start a mailing to a politician in Scotland. No Gmail is connected, so Sent from says nothing can be sent, with a link to add theirs.",
  );
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  // With no Gmail connected, a mailing can't be sent, and Sent from says where to connect one.
  await page.goto(`${BASE}/staff/politicians?nation=scotland`);
  await page.getByRole("link", { name: copy.mailThese(1) }).click();
  const from = page.getByRole("region", { name: copy.sections.from });
  await expect(from.getByText(copy.noSenders)).toBeVisible();
  await frame(page, "Sent from, with no Gmail");
  story(
    "They connect their Gmail on their account page, and start the mailing again. It's sent from their Gmail, under its name, and says how many of today's 1,800 emails it has sent.",
  );

  // Connected on your account page, it's the one a new mailing is sent from.
  await from.getByRole("link", { name: copy.connectOne }).click();
  await page.getByRole("link", { name: staffCopy.gmail.connect }).click();
  await expect(page.getByText(staffCopy.gmail.outcomes.connected)).toBeVisible();
  await page.goto(`${BASE}/staff/politicians?nation=scotland`);
  await page.getByRole("link", { name: copy.mailThese(1) }).click();
  await page.getByLabel(copy.subject).fill("See you in Edinburgh");
  await page.getByRole("textbox", { name: copy.letter }).click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("We hope to see you there.");
  await expect(page.getByRole("status").first()).toHaveText(copy.savePill.saved);
  await expect(page).toHaveURL(/\/staff\/mailings\/\d+$/);
  await expect(page.getByLabel(copy.fromLegend, { exact: false })).toHaveValue(staffEmail());
  await expect(from.getByText(staffCopy.gmail.sentToday(0, "1,800"))).toBeVisible();
  // Yours connected, there's no link to connect it, and the name is the Gmail's, filled in.
  await expect(from.getByRole("link", { name: copy.connectOne })).toHaveCount(0);
  await expect(page.getByLabel(copy.fromNameLabel, { exact: false })).not.toHaveValue("");
  await from.scrollIntoViewIfNeeded();
  await frame(page, "Sent from their Gmail", {
    window: true,
  });
  story("They give it a name of its own in place of the Gmail's. The preview's From line shows it.");

  // A name of its own, in place of the Gmail's, shown in the preview's From line.
  await page.getByLabel(copy.fromNameLabel, { exact: false }).fill("Sam Example, PauseAI UK");
  await expect
    .poll(() => runSql(flowDatabase, "SELECT from_name FROM mailings WHERE title = 'See you in Edinburgh'"))
    .toEqual(["Sam Example, PauseAI UK"]);
  await expect(page.getByRole("status").first()).toHaveText(copy.savePill.saved);
  const preview = page.getByRole("region", { name: copy.sections.preview });
  await expect(preview.getByText(`Sam Example, PauseAI UK <${staffEmail()}>`)).toBeVisible();
  await from.scrollIntoViewIfNeeded();
  await frame(page, "Sent from, with a name of its own", { window: true });
  story("They schedule it for the 14:00 hour. It will send at 14:18.");

  await page.getByLabel(copy.hour, { exact: false }).selectOption("14");
  await page.getByRole("button", { name: copy.schedule(1) }).click();
  await expect(page.getByText(copy.sends("Fri 16 Oct at 14:18"))).toBeVisible();
  await frame(page, "The scheduled mailing");
  story("When its time comes, the hourly job sends it from their Gmail.");

  // Its time come, the hourly job starts it and sends it.
  const [id] = runSql(flowDatabase, "SELECT id FROM mailings WHERE title = 'See you in Edinburgh'");
  runSql(flowDatabase, `UPDATE mailings SET due_at = '2026-10-16T11:00:00Z' WHERE id = ${id}`);
  const sent = await request.post(`${BASE}/api/cron/send-mailings`, {
    headers: { Authorization: "Bearer fixture-cron-secret" },
  });
  expect(await sent.json()).toMatchObject({ started: [Number(id)], sent: 1, left: 0 });
  const letter = newestEmail((one) => one.To === '"Morag Example" <morag.example.msp@parliament.example>')!;
  expect(letter.From).toBe(`"Sam Example, PauseAI UK" <${staffEmail()}>`);
  await emailFrame(page, letter, "The email Morag gets");
  story("The mailing's page shows it sent, to its one recipient.");

  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("See you in Edinburgh");
  await expect(page.getByText(copy.sends("Fri 16 Oct at 14:18"))).not.toBeVisible();
  await frame(page, "The sent mailing");
  story("Morag's letter's page shows it as it went, with no replies yet.");

  await page
    .getByRole("row", { name: /Morag Example/ })
    .getByRole("link", { name: copy.theLetter })
    .click();
  // Her letter's page, not the mailing's still showing while it loads.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    staffCopy.letters.oneTitle(staffCopy.letters.fromPauseai, "Morag Example"),
  );
  await frame(page, "Morag's letter");
  story(
    "Copy Gmail search copies a search that finds the letter in Gmail, and says to paste it in an inbox that can see their mail.",
  );

  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  // Copy Gmail search copies the search for it by its Message-ID, and says to paste it where your mail is.
  await page.getByRole("button", { name: staffCopy.findInGmail.copy }).click();
  await expect(page.getByRole("status")).toContainText(staffCopy.findInGmail.where(staffEmail()));
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/^rfc822msgid:\S+$/);
  await frame(page, "The search copied");
  story(
    "Morag replies. Within the hour their Gmail is read, and her reply shows under the letter, without the letter she quotes.",
  );

  // Morag answers, and the hourly read of your Gmail keeps her reply (tests/fixtures/letter-replies/).
  const letterId = page.url().split("/").at(-1);
  runSql(
    flowDatabase,
    `INSERT INTO letter_replies (letter_id, account, gmail_message_id, gmail_thread_id, from_address, from_name, subject, at,
       from_us, blob_key, size)
     VALUES (${letterId}, '${staffEmail()}', 'reply-1', 'thread-1', 'morag.example.msp@parliament.example', 'Morag Example',
       'Re: See you in Edinburgh', '2026-10-16T15:00:00Z', false, 'fixture/morag-edinburgh.eml.gz', 512)`,
  );
  await page.reload();
  await expect(page.getByText("I look", { exact: false })).toBeVisible();
  // Without the letter she quotes, which is above it already.
  await expect(page.getByText("We'd love to see you", { exact: false })).toHaveCount(0);
  await frame(page, "Morag's reply");
});
