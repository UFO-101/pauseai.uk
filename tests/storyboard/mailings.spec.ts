import type { Page } from "@playwright/test";
import { staffCopy } from "@/lib/content/staff-interface";
import { runSql } from "@/scripts/fresh-database.mjs";
import { addStaffAccount, logInAsStaff, newestEmail, syncPoliticians } from "../steps";
import { BASE, emailFrame, expect, frame, test } from "./fixtures";

// Mailings to politicians written on the site: started from the politicians
// list, written and saved as a draft, previewed and sent to yourself as a
// test; who it's to changed from the list, and a draft deleted; and the pages
// of mailings scheduled, sending and sent. Until a channel sends, nothing
// can be scheduled from the page, so those mailings are made in the
// database, as scheduling would make them.

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

test("a new mailing from the politicians list: written, saved as a draft, previewed and sent to yourself", async ({
  page,
  request,
  flowDatabase,
}) => {
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  await page.goto(`${BASE}/staff/politicians?country=scotland`);
  await expect(page.getByRole("link", { name: copy.mailThese(1) })).toBeVisible();
  await frame(page, "the politicians in Scotland, with Mail these beside Download");

  await page.getByRole("link", { name: copy.mailThese(1) }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy.newTitle);
  await expect(page.getByRole("status").first()).toHaveText(copy.saveStates.new);
  await frame(page, "a new mailing to them: who, write, preview, sent from, when and send; nothing saved yet");

  await page.getByLabel(copy.subject).fill("Edinburgh: one week to go");
  // The letter starts with its greeting; the rest is written under it.
  const letter = page.getByRole("textbox", { name: copy.letter });
  await expect(letter).toContainText(`${copy.greeting} ${staffCopy.mailingEditor.fields.salutation},`);
  await letter.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("We hope to see you there.");
  await page.getByLabel(copy.fromLegend, { exact: false }).selectOption(staffEmail());
  await expect(page.getByRole("status").first()).toHaveText(copy.savePill.saved);
  await expect(page).toHaveURL(/\/staff\/mailings\/\d+$/);
  const preview = page.getByRole("region", { name: copy.sections.preview });
  await expect(preview.getByText("We hope to see you there.")).toBeVisible();
  await expect(preview.getByText("Dear Ms Example,")).toBeVisible();
  await frame(page, "written under the greeting, saved as a draft, and the preview filled in");

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

test("Change who: a draft goes to who the list finds instead; then it's deleted", async ({
  page,
  request,
  flowDatabase,
}) => {
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  await startDraft(page, "Lords only");
  await page.getByRole("link", { name: copy.changeWho }).click();
  await expect(page).toHaveURL(/mailing=\d+/);
  await page.getByRole("link", { name: staffCopy.houses.lords }).click();
  await expect(page).toHaveURL(/house=lords/);
  const use = page.getByRole("button", { name: copy.useThese(1) });
  await expect(use).toBeVisible();
  await frame(page, "back on the list, with the draft's filter: the button makes the draft go to these instead");

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

test("a scheduled mailing: when it sends, a new time, then stopped and a draft again", async ({
  page,
  request,
  flowDatabase,
}) => {
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  const id = addMailing(flowDatabase, "Edinburgh reminder", "scheduled", ["scheduled", "scheduled", "scheduled"]);
  runSql(flowDatabase, `UPDATE mailings SET due_at = '2026-10-30T09:00:00Z' WHERE id = ${id}`);
  await page.goto(`${BASE}/staff/mailings`);
  await expect(page.getByRole("button", { name: copy.stop })).toBeVisible();
  await frame(page, "the mailings: one coming up, with Stop, over those sent");

  await page.getByRole("link", { name: "Edinburgh reminder" }).click();
  await expect(page.getByText(copy.sends("Friday 30 October at 09:00"))).toBeVisible();
  await frame(page, "scheduled: when it sends, and to whom");

  await page.getByRole("button", { name: copy.changeTime }).click();
  await page.getByLabel(copy.hour, { exact: false }).selectOption("14");
  await frame(page, "a new time, in London's hours", { window: true });
  await page.getByRole("button", { name: copy.saveTime }).click();
  await expect(page.getByText(copy.sends("Friday 30 October at 14:00"))).toBeVisible();

  await page.getByRole("button", { name: copy.stopScheduled }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Edinburgh reminder");
  await expect(page.getByRole("status").first()).toHaveText(copy.savePill.saved);
  await frame(page, "stopped: a draft again, to change and schedule again");
});

test("a mailing sending, and one sent: its counts, and its recipients that bounced", async ({
  page,
  request,
  flowDatabase,
}) => {
  await syncPoliticians(request, BASE);
  await logIn(page, flowDatabase);
  const sending = addMailing(flowDatabase, "Going out now", "sending", ["sent", "scheduled", "scheduled"]);
  await page.goto(`${BASE}/staff/mailings/${sending}`);
  await expect(page.getByText(copy.sending(1, 3))).toBeVisible();
  await frame(page, "sending: how far it's got, with Stop");

  const sent = addMailing(flowDatabase, "Edinburgh follow-up", "sent", ["sent", "bounced", "skipped", "sent"]);
  await page.goto(`${BASE}/staff/mailings/${sent}`);
  await expect(page.getByText(copy.states.sent, { exact: true })).toBeVisible();
  await frame(page, "sent: its counts, its recipients, and the email beside them");

  await page.getByRole("link", { name: copy.tab(copy.tabs.bounced, 1) }).click();
  await expect(page.getByRole("row")).toHaveCount(2);
  await frame(page, "only the one that bounced");
});
