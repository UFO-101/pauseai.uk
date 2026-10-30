import type { Page } from "@playwright/test";
import { staffCopy } from "@/lib/content/staff-interface";
import { runSql } from "@/scripts/fresh-database.mjs";
import { addStaffAccount, logInAsStaff, newestEmail, syncPoliticians } from "../steps";
import { BASE, emailFrame, expect, frame, test } from "./fixtures";
import { holdNextDocument } from "./staff-steps";

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
 * by name. Returns its ID.
 */
function addMailing(database: string, title: string, state: string, statuses: string[]): string {
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
    `WITH r AS (
       SELECT n.id, (ARRAY[${statuses.map((s) => `'${s}'`).join(", ")}])[row_number() OVER (ORDER BY n.name)] AS status
       FROM notable_people n JOIN politicians p USING (id) WHERE n.email IS NOT NULL AND NOT p.is_test),
     l AS (
       INSERT INTO letters (kind, notable_person_id, status, sent_at, replied_at)
       SELECT 'pauseai', r.id, r.status, CASE WHEN r.status IN ('sent', 'bounced') THEN '2026-10-20T08:00:00Z'::timestamptz END,
         CASE WHEN r.status = 'sent' AND r.id = (SELECT min(id) FROM r) THEN '2026-10-21T10:00:00Z'::timestamptz END
       FROM r WHERE r.status IS NOT NULL RETURNING id)
     INSERT INTO letters_from_pauseai (id, mailing_id) SELECT id, ${id} FROM l`,
  );
  return id;
}

test("Write a new mailing, save it, preview it and send yourself a test", async ({ page, request, flowDatabase }) => {
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  // Your Gmail connected, on your account page, so there's one to send from.
  await page.goto(`${BASE}/staff/me`);
  await page.getByRole("link", { name: staffCopy.gmail.connect }).click();
  await expect(page.getByText(staffCopy.gmail.outcomes.connected)).toBeVisible();
  await page.goto(`${BASE}/staff/mailings`);
  await frame(page, "the mailings, with New mailing at the top right");

  await page.getByRole("link", { name: copy.newTitle }).click();
  await expect(page.getByText(copy.choosingNew)).toBeVisible();
  // It opens at the top, as a page does, though the strip is held there.
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  // Down the list, what's being done stays at the top, and the way on at the foot.
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  await frame(page, "every politician, scrolled down: the strip held at the top, the bar at the foot", {
    window: true,
  });
  await page.getByRole("link", { name: staffCopy.houses["scottish-parliament"] }).click();
  await expect(page).toHaveURL(/house=scottish-parliament/);
  const bar = page.getByRole("region", { name: copy.choosingCount(1) });
  await expect(bar).toBeVisible();
  await frame(
    page,
    "the politicians list, choosing who it's for: what to do at the top, and at the foot how many, with Write to these",
    {
      window: true,
    },
  );

  await bar.getByRole("link", { name: copy.writeToThese(1) }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy.newTitle);
  await expect(page.getByRole("status").first()).toHaveText("");
  await frame(page, "a new mailing to them: who, write, preview, sent from, when and send; nothing saved yet");

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
  await frame(
    page,
    "written under the greeting, saved as a draft, and the preview filled in, to send a test to yourself",
    {
      window: true,
    },
  );

  await preview.getByRole("button", { name: copy.sendTest }).click();
  await expect(preview.getByText(copy.testSent(staffEmail()))).toBeVisible();
  const email = newestEmail((one) => one.To === `"Morag Example" <${staffEmail()}>`)!;
  expect(email.Subject).toBe("Edinburgh: one week to go");
  expect(email.TextBody).toBe("Dear Ms Example,\n\nWe hope to see you there.");
  await emailFrame(page, email, "the test copy, as Morag would get it, sent to yourself");

  // Reopened, it's the draft as it was.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Edinburgh: one week to go");
  await expect(page.getByLabel(copy.fromLegend, { exact: false })).toHaveValue(staffEmail());
});

test("Change who a draft goes to, then delete it", async ({ page, request, flowDatabase }) => {
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  await startDraft(page, "Lords only");
  // The list held, so the button can be seen waiting for it.
  const list = await holdNextDocument(page, /\/staff\/politicians/);
  const changeWho = page.getByRole("link", { name: copy.changeWho });
  await changeWho.click();
  await expect(changeWho.locator("[aria-hidden]")).toBeVisible();
  await frame(page, "Change who pressed: the draft saved, the button greyed with a spinner while the list comes", {
    window: true,
  });
  await list.release();
  await expect(page).toHaveURL(/mailing=\d+/);
  await expect(page.getByText(copy.choosingDraft("Lords only"))).toBeVisible();
  await page.getByRole("link", { name: staffCopy.houses.lords }).click();
  await expect(page).toHaveURL(/house=lords/);
  const use = page.getByRole("button", { name: copy.useThese(1) });
  await expect(use).toBeVisible();
  await frame(
    page,
    "back on the list, choosing for the draft, named at the top: the bar's button makes it go to these instead",
    {
      window: true,
    },
  );

  await use.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lords only");
  await expect(page.getByRole("list", { name: copy.whoLabel })).toContainText(staffCopy.houses.lords);
  await frame(page, "the draft, now to the Lords");

  await page.getByRole("button", { name: copy.deleteDraft }).click();
  await expect(page.getByRole("button", { name: copy.deleteIt })).toBeFocused();
  await frame(page, "Delete draft turns red, asking to be pressed again", { window: true });
  await page.getByRole("button", { name: copy.deleteIt }).click();
  await expect(page).toHaveURL(`${BASE}/staff/mailings`);
  await expect(page.getByText(copy.noDrafts)).toBeVisible();
  await frame(page, "the mailings, with no drafts left");
});

test("Reschedule a mailing, then unschedule it", async ({ page, request, flowDatabase }) => {
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  const id = addMailing(flowDatabase, "Edinburgh reminder", "scheduled", ["scheduled", "scheduled", "scheduled"]);
  runSql(flowDatabase, `UPDATE mailings SET due_at = '2026-10-30T09:00:00Z' WHERE id = ${id}`);
  await page.goto(`${BASE}/staff/mailings`);
  await expect(page.getByRole("button", { name: copy.unschedule })).toBeVisible();
  await frame(page, "the mailings: one coming up, with Unschedule, over those sent");

  await page.getByRole("link", { name: "Edinburgh reminder" }).click();
  await expect(page.getByText(copy.sends("Friday 30 October at 09:18"))).toBeVisible();
  await frame(page, "scheduled: when it sends, and to whom");

  await page.getByRole("button", { name: copy.changeTime }).click();
  await page.getByRole("button", { name: copy.day }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await frame(page, "the day's calendar: the weeks running on into November, where it starts marked", { window: true });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /^Monday 2 November 2026/ })
    .click();
  await page.getByLabel(copy.hour, { exact: false }).selectOption("14");
  await frame(page, "a new day and time, in London's hours, each saying when it sends", { window: true });
  await page.getByRole("button", { name: copy.saveTime }).click();
  await expect(page.getByText(copy.sends("Monday 2 November at 14:18"))).toBeVisible();

  await page.getByRole("button", { name: copy.unschedule }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Edinburgh reminder");
  await expect(page.getByRole("status").first()).toHaveText(copy.savePill.saved);
  await frame(page, "unscheduled: a draft again, to change and schedule again");
});

test("A mailing sending, and one sent with bounces", async ({ page, request, flowDatabase }) => {
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  const sending = addMailing(flowDatabase, "Going out now", "sending", ["sent", "scheduled", "scheduled"]);
  await page.goto(`${BASE}/staff/mailings/${sending}`);
  await expect(page.getByText(copy.sending(1, 3))).toBeVisible();
  await frame(page, "sending: how far it's got, with Stop");

  const sent = addMailing(flowDatabase, "Edinburgh follow-up", "sent", ["sent", "bounced", "skipped", "sent"]);
  await page.goto(`${BASE}/staff/mailings/${sent}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Edinburgh follow-up");
  await expect(page.getByRole("list").filter({ hasText: copy.counts.answered })).toBeVisible();
  await frame(page, "sent: its counts, its recipients, and the email beside them");

  await page.getByRole("link", { name: copy.tab(copy.tabs.bounced, 1) }).click();
  await expect(page.getByRole("row")).toHaveCount(2);
  await frame(page, "only the one that bounced");

  // Its outcome leads to the letter's own page, under the mailing, back to which it goes.
  await page.getByRole("table").getByRole("link", { name: staffCopy.letters.status.bounced }).click();
  await expect(page).toHaveURL(new RegExp(`/staff/mailings/${sent}/letters/\\d+$`));
  await expect(page.getByRole("navigation").getByRole("link", { name: "Edinburgh follow-up" })).toBeVisible();
  await frame(page, "the letter that bounced: to whom and how it stands, with no history, as Airtable kept none");
});

test("Send a mailing from a connected Gmail: schedule it, and the hourly job sends it", async ({
  page,
  request,
  flowDatabase,
}) => {
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  // With no Gmail connected, a mailing can't be sent, and Sent from says where to connect one.
  await page.goto(`${BASE}/staff/politicians?nation=scotland`);
  await page.getByRole("link", { name: copy.mailThese(1) }).click();
  const from = page.getByRole("region", { name: copy.sections.from });
  await expect(from.getByText(copy.noSenders)).toBeVisible();
  await frame(page, "Sent from, with no Gmail connected: where to connect one");

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
  await frame(page, "Sent from your connected Gmail, its name filled in, and how many it has sent of today's 1,800", {
    window: true,
  });

  // A name of its own, in place of the Gmail's, shown in the preview's From line.
  await page.getByLabel(copy.fromNameLabel, { exact: false }).fill("Sam Example, PauseAI UK");
  await expect
    .poll(() => runSql(flowDatabase, "SELECT from_name FROM mailings WHERE title = 'See you in Edinburgh'"))
    .toEqual(["Sam Example, PauseAI UK"]);
  await expect(page.getByRole("status").first()).toHaveText(copy.savePill.saved);
  const preview = page.getByRole("region", { name: copy.sections.preview });
  await expect(preview.getByText(`Sam Example, PauseAI UK <${staffEmail()}>`)).toBeVisible();
  await from.scrollIntoViewIfNeeded();
  await frame(page, "Sent from a name of its own, in place of the Gmail's", { window: true });

  await page.getByLabel(copy.hour, { exact: false }).selectOption("14");
  await page.getByRole("button", { name: copy.schedule(1) }).click();
  await expect(page.getByText(copy.sends("Friday 16 October at 14:18"))).toBeVisible();
  await frame(page, "scheduled for 14:18, from your Gmail");

  // Its time come, the hourly job starts it and sends it.
  const [id] = runSql(flowDatabase, "SELECT id FROM mailings WHERE title = 'See you in Edinburgh'");
  runSql(flowDatabase, `UPDATE mailings SET due_at = '2026-10-16T11:00:00Z' WHERE id = ${id}`);
  const sent = await request.post(`${BASE}/api/cron/send-mailings`, {
    headers: { Authorization: "Bearer fixture-cron-secret" },
  });
  expect(await sent.json()).toMatchObject({ started: [Number(id)], sent: 1, left: 0 });
  const letter = newestEmail((one) => one.To === '"Morag Example" <morag.example.msp@parliament.example>')!;
  expect(letter.From).toBe(`"Sam Example, PauseAI UK" <${staffEmail()}>`);
  await emailFrame(page, letter, "the letter as Morag got it, from your Gmail");

  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("See you in Edinburgh");
  await expect(page.getByText(copy.sends("Friday 16 October at 14:18"))).not.toBeVisible();
  await frame(page, "sent: its counts and its one recipient");

  await page
    .getByRole("row", { name: /Morag Example/ })
    .getByRole("link", { name: staffCopy.letters.status.sent })
    .click();
  await expect(page.getByRole("link", { name: staffCopy.letterThread.openInGmail })).toBeVisible();
  await frame(page, "the letter as it went, with Open in Gmail for you who sent it, and no replies yet");

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
  await frame(page, "her reply, under the letter, without the letter it quotes");
});
