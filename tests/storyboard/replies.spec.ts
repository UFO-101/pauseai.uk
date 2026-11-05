import type { APIRequestContext, Page } from "@playwright/test";
import { copy } from "@/lib/content/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import { TEST_MPS } from "@/lib/test-mps";
import { runSql } from "@/scripts/fresh-database.mjs";
import { fakeTurnstile, fillLetter, lookUpTestMp, newestEmail, newestEmailTo, WEBHOOK_AUTH } from "../steps";
import { editor, newParagraphAboveSignOff } from "./editor-steps";
import { scrollSettled } from "./settle";

/** As much of Tiptap's editor as a flow drives directly. */
type EditorHandle = {
  state: {
    doc: {
      descendants: (
        visit: (node: { isTextblock: boolean; textContent: string; nodeSize: number }, pos: number) => void,
      ) => void;
    };
  };
  chain: () => { focus: () => { deleteRange: (range: { from: number; to: number }) => { run: () => boolean } } };
};
import { BASE, emailFrame, expect, frame, madeUpAddress, story, test } from "./fixtures";
import {
  bounceOf,
  deliver,
  LETTERS_INBOX,
  letterIdOf,
  MPS_PROXY,
  OFFICE,
  OFFICE_ADDRESS,
  readInbox,
  runQueue,
  sentEmail,
  sentIds,
  testProxy,
} from "./letters-inbox-steps";
import { bouncy, BOUNCY_ADDRESS, logIn, NOTIFICATION_INBOX, POLICY_INBOX, sentLetterId } from "./staff-steps";

// Letters to MPs through the letters inbox, and every email both ways: the
// letter from the supporter's proxy, her copy, the MP's office's replies
// relayed to her from the MP's proxy, and her answers relayed back; what
// isn't relayed, and why; bounces; the queue. The letter's history after
// each step. Each flow writes to the test MP from the form, logged in as
// staff to see its page; mail arriving at the letters inbox is read by the
// hourly job, run through its own route.

const history = staffCopy.letters.detail;
const JANES_PROXY = testProxy("jane.smith");

/** The test MP's words in their reply: made up, but as long and as formal as a real one. */
const MP_REPLY = `Dear Jane,\r
\r
Thank you for writing to me about the risks from frontier AI, and for sending the open letter.\r
\r
I share many of your concerns. I have passed your letter to the Secretary of State for Science, Innovation and Technology, and I will write to you again when I have a reply.\r
\r
Yours sincerely,\r
\r
Testy McTestface MP\r
`;

/** The letter's page, with its history's entries, the newest first. */
async function openLetter(page: Page, id: string) {
  await page.goto(`${BASE}/staff/letters/${id}`);
  const list = page.getByRole("list", { name: history.historyTitle });
  await expect(list).toBeVisible();
  // Its entries, not a reply's relay, which is a list inside its reply's.
  return list.locator(":scope > li");
}

/** Writes to the test MP as Jane, at `sender`, from the form, then logs in as staff; gives the letter's ID. */
async function writeLetter(page: Page, database: string, sender: string): Promise<string> {
  return sentLetterId(page, database, sender);
}

test("Jane writes to her MP", async ({ page, flowDatabase }) => {
  story(
    "Jane writes to her MP from the campaign page. Her letter goes from the letters inbox, from a proxy address of her own, so the MP's reply comes back to us.",
  );
  const sender = madeUpAddress("Jane Smith", 31);
  const id = await writeLetter(page, flowDatabase, sender);
  story(
    "Jane gets a copy, from her proxy address, addressed to her. If she replies to it, her reply reaches the MP through us too.",
  );
  const copied = sentEmail(flowDatabase, id, "letter-copy");
  expect(copied.To).toBe(`"Jane Smith" <${sender}>`);
  expect(copied.Bcc).toBeUndefined();
  expect(copied.ReplyTo).toBe(`"Testy McTestface MP (via PauseAI)" <${MPS_PROXY}>`);
  await emailFrame(page, copied, "Jane's copy of her letter");
  story(
    "Staff open the letter. Its history says Gmail sent it, with her copy under it. Jane didn't change the campaign's letter, so it's folded.",
  );
  const entries = await openLetter(page, id);
  // Sent, by Gmail, with her copy under it.
  await expect(entries).toHaveCount(1);
  await expect(entries.first()).toContainText(staffCopy.letters.backends.gmail);
  await expect(entries.first()).toContainText(`${history.fields.to}${OFFICE_ADDRESS}`);
  await expect(entries.first()).toContainText(staffCopy.letters.status.copy_sent);
  await expect(page.getByRole("article").getByRole("button", { name: /unchanged/ })).toBeVisible();
  await frame(page, "The letter's page");
});

test("The MP replies, and Jane answers", async ({ page, request, flowDatabase }) => {
  const sender = madeUpAddress("Jane Smith", 32);
  const id = await writeLetter(page, flowDatabase, sender);
  story(
    "The MP's office replies to Jane's proxy address. Within the hour the letters inbox is read, and the reply is relayed to Jane exactly as the office wrote it, from the MP's proxy address, in the thread of her copy.",
  );

  deliver(flowDatabase, { from: OFFICE, to: JANES_PROXY, cc: "caseworker@parliament.example", text: MP_REPLY });
  expect(await readInbox(request)).toMatchObject({ replies: 1, relayed: 1, notUnderstood: [] });
  const toJane = sentEmail(flowDatabase, id, "relay");
  expect(toJane.To).toBe(`"Jane Smith" <${sender}>`);
  expect(toJane.From).toBe(`"Testy McTestface MP (via PauseAI)" <${MPS_PROXY}>`);
  expect(toJane.Cc).toBeUndefined();
  expect(toJane.InReplyTo).toBe(`<${sentIds(flowDatabase, id, "letter-copy")[0]}>`);
  expect(toJane.TextBody).toBe(MP_REPLY.replace(/\r/g, ""));
  await emailFrame(page, toJane, "The MP's reply, as Jane gets it");
  story("Jane answers. Her answer is relayed to the MP the same way, as a reply to her letter.");

  deliver(flowDatabase, {
    from: `"Jane Smith" <${sender}>`,
    to: MPS_PROXY,
    subject: "Re: Re: Request to co-sign letter on frontier AI risks",
    inReplyTo: toJane.MessageId!.slice(1, -1),
    text: "Dear Mr McTestface,\r\n\r\nThank you. I'd be glad to meet at one of your surgeries.\r\n\r\nJane Smith\r\n",
  });
  expect(await readInbox(request)).toMatchObject({ replies: 1, relayed: 1 });
  const toMp = sentEmail(flowDatabase, id, "relay");
  expect(toMp.To).toBe(`"Testy McTestface MP" <${OFFICE_ADDRESS}>`);
  expect(toMp.From).toBe(`"Jane Smith (via PauseAI)" <${JANES_PROXY}>`);
  expect(toMp.InReplyTo).toBe(`<${sentIds(flowDatabase, id, "letter")[0]}>`);
  await emailFrame(page, toMp, "Jane's answer, as the office gets it");
  story(
    "The letter's page shows the letter, the reply and her answer. The reply shows the caseworker the office copied in, though Jane's copy didn't.",
  );

  const entries = await openLetter(page, id);
  await expect(entries.first()).toContainText(staffCopy.letters.status.relayed);
  await expect(entries.nth(1)).toContainText(staffCopy.letters.status.replied);
  await expect(page.getByRole("article")).toHaveCount(3);
  await expect(page.getByRole("article").nth(1)).toContainText("caseworker@parliament.example");
  await frame(page, "The letter's page");
});

test("A reply with an attachment", async ({ page, request, flowDatabase }) => {
  const sender = madeUpAddress("Jane Smith", 33);
  const id = await writeLetter(page, flowDatabase, sender);
  story(
    "The MP's office replies with a formatted email and a briefing attached as a PDF. Jane gets it exactly as they sent it.",
  );
  const pdf = Buffer.from("%PDF-1.4\n% A briefing\n").toString("base64");
  deliver(
    flowDatabase,
    [
      `Authentication-Results: mx.google.com; dkim=pass header.i=@parliament.example; dmarc=pass header.from=parliament.example`,
      `From: ${OFFICE}`,
      `To: ${JANES_PROXY}`,
      "Subject: Re: Please back a pause on frontier AI",
      "Date: Fri, 16 Oct 2026 13:00:00 +0100",
      "Message-ID: <html-reply@parliament.example>",
      "MIME-Version: 1.0",
      'Content-Type: multipart/mixed; boundary="mixed"',
      "",
      "--mixed",
      'Content-Type: multipart/alternative; boundary="alt"',
      "",
      "--alt",
      "Content-Type: text/plain; charset=utf-8",
      "",
      "Dear Jane, thank you. My briefing on AI is attached.",
      "--alt",
      "Content-Type: text/html; charset=utf-8",
      "",
      "<p>Dear Jane,</p><p>Thank you. <strong>My briefing on AI</strong> is attached.</p>",
      "--alt--",
      "--mixed",
      'Content-Type: application/pdf; name="briefing.pdf"',
      'Content-Disposition: attachment; filename="briefing.pdf"',
      "Content-Transfer-Encoding: base64",
      "",
      pdf,
      "--mixed--",
      "",
    ].join("\r\n"),
  );
  await readInbox(request);
  const relayed = sentEmail(flowDatabase, id, "relay");
  expect(relayed.HtmlBody).toContain("<strong>My briefing on AI</strong>");
  expect(relayed.Attachments).toEqual([{ Name: "briefing.pdf", ContentType: "application/pdf", Content: pdf }]);
  await emailFrame(page, relayed, "The reply, as Jane gets it");
});

test("Automatic replies", async ({ page, request, flowDatabase }) => {
  const sender = madeUpAddress("Jane Smith", 34);
  const id = await writeLetter(page, flowDatabase, sender);
  story("The MP's office acknowledges Jane's letter automatically. That's relayed to her like any reply.");
  const acknowledgement =
    "Thank you for contacting me. Please take this reply as confirmation that your email has been received.\r\n";
  deliver(flowDatabase, {
    from: OFFICE,
    to: JANES_PROXY,
    subject: "Automatic reply: Please back a pause",
    text: [
      acknowledgement,
      "I receive a very large volume of correspondence, and priority is given to constituents.\r\n",
      "If your matter is urgent, please call my constituency office.\r\n",
    ].join("\r\n"),
  });
  await readInbox(request);
  await emailFrame(page, sentEmail(flowDatabase, id, "relay"), "The acknowledgement, as Jane gets it");
  story(
    "Jane is away, and her out-of-office answers it. That's relayed to the MP still marked as automatic, so the office's system knows not to answer it.",
  );
  deliver(flowDatabase, {
    from: sender,
    to: MPS_PROXY,
    subject: "Out of office",
    headers: ["Auto-Submitted: auto-replied"],
    text: "I'm away until Monday.\r\n",
  });
  await readInbox(request);
  const ooo = sentEmail(flowDatabase, id, "relay");
  expect(ooo.AutoSubmitted).toBe("auto-replied");
  await emailFrame(page, ooo, "Jane's out-of-office, as the office gets it");
  story(
    "For this test, the office's system is made to misbehave and answer anyway, again and again, as a buggy one might. A letter relays at most five emails an hour, so the last is kept in the letters inbox, and staff get an email about it.",
  );

  // Two responders answering each other: the letter's relays stop at its cap, five in an hour.
  for (let i = 0; i < 4; i++) {
    deliver(flowDatabase, {
      from: OFFICE,
      to: JANES_PROXY,
      subject: "Automatic reply: Out of office",
      text: acknowledgement,
    });
  }
  const line = await readInbox(request);
  expect(line).toMatchObject({ relayed: 3, notUnderstood: [expect.objectContaining({ reason: "over_cap" })] });
  const alert = newestEmail(
    (email) =>
      email.To === NOTIFICATION_INBOX && email.Subject === staffCopy.lettersInbox.alert.subject(1, LETTERS_INBOX),
  )!;
  expect(alert.TextBody).toContain(staffCopy.lettersInbox.reasons.over_cap);
  await emailFrame(page, alert, "The email staff get");
  story("The letter's history says the last one wasn't relayed, and why.");
  const entries = await openLetter(page, id);
  await expect(entries.first()).toContainText(staffCopy.letters.status.not_relayed);
  await expect(entries.first()).toContainText(history.reasons.over_cap);
  await frame(page, "The letter's history");
  story(
    "In the letter and its replies, each automatic reply of more than a paragraph is folded to its first, as the rest is rarely worth reading.",
  );
  const folded = page.getByRole("article", { name: "Automatic reply: Please back a pause" });
  const changes = staffCopy.letterChanges;
  await folded.getByRole("button", { name: changes.more(2) }).scrollIntoViewIfNeeded();
  await expect(folded).not.toContainText("constituency office");
  await frame(page, "The acknowledgement, folded");
  story("Show as sent unfolds it.");
  await folded.getByRole("button", { name: changes.asSent }).click();
  await expect(folded).toContainText("constituency office");
  await frame(page, "The acknowledgement, as sent");
});

test("Emails that aren't relayed", async ({ page, request, flowDatabase }) => {
  const sender = madeUpAddress("Jane Smith", 35);
  await writeLetter(page, flowDatabase, sender);
  story(
    "Three emails arrive at proxy addresses: one to Jane from a stranger, one that says it's from the MP's office but fails Gmail's checks, and spam. None of them is relayed.",
  );
  story(
    "Staff get one email about the first two, with a link to each in Gmail, so someone can decide what to do. Spam stays in Gmail's spam folder.",
  );
  deliver(flowDatabase, { from: '"A Stranger" <stranger@example.com>', to: JANES_PROXY, subject: "Hello Jane" });
  deliver(flowDatabase, {
    from: OFFICE,
    to: JANES_PROXY,
    subject: "Re: Please back a pause",
    auth: "spf=fail smtp.mailfrom=elsewhere.example; dmarc=fail (p=REJECT) header.from=parliament.example",
  });
  deliver(flowDatabase, { from: "offers@example.net", to: testProxy("guessed.name"), subject: "You've won" }, true);
  const line = await readInbox(request);
  expect(line).toMatchObject({ relayed: 0, spam: 1 });
  expect((line.notUnderstood as { reason: string }[]).map((m) => m.reason)).toEqual(["stranger", "not_verified"]);
  expect(sentIds(flowDatabase, letterIdOf(flowDatabase, sender), "relay")).toEqual([]);
  const alert = newestEmail(
    (email) =>
      email.To === NOTIFICATION_INBOX && email.Subject === staffCopy.lettersInbox.alert.subject(2, LETTERS_INBOX),
  )!;
  await emailFrame(page, alert, "The email staff get");
  story("On the Gmail import's page, that run had problems, and lists the two emails.");
  await page.goto(`${BASE}/staff/import-data/gmail`);
  await expect(page.getByText(staffCopy.runs.status.problems, { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: staffCopy.lettersInbox.openInGmail })).toHaveCount(2);
  await frame(page, "The Gmail import's runs");
  story("The dashboard says so too, until a run reads the letters inbox without any.");
  await page.goto(`${BASE}/staff`);
  await expect(page.getByText(staffCopy.lettersInbox.alert.subject(2, LETTERS_INBOX))).toBeVisible();
  await frame(page, "The dashboard");
});

test("Jane's letter bounces", async ({ page, request, flowDatabase }) => {
  story("Jane writes to an MP whose address bounces her letter. The address is blocked, and staff get an email.");
  const sender = madeUpAddress("Jane Smith", 36);
  const id = await sentLetterId(page, flowDatabase, sender, bouncy);
  deliver(flowDatabase, bounceOf(sentIds(flowDatabase, id, "letter")[0], BOUNCY_ADDRESS));
  expect(await readInbox(request)).toMatchObject({ bounces: 1, notUnderstood: [] });
  const alert = newestEmail(
    (email) => email.To === NOTIFICATION_INBOX && email.Subject === staffCopy.alert.subject(bouncy.name),
  )!;
  await emailFrame(page, alert, "The email staff get");
  story("Jane is told, in the thread of her copy, that her letter hasn't reached her MP.");
  const notice = sentEmail(flowDatabase, id, "supporter-notice");
  expect(notice.TextBody).toBe(copy.notices.bounced(bouncy.name));
  expect(notice.From).toBe(`"PauseAI" <${LETTERS_INBOX}>`);
  await emailFrame(page, notice, "The email Jane gets");
  story(
    "Staff check the address with the MP's office, then unblock it on the blocked emails page, with a note. The letter goes again, and Jane is told.",
  );

  await page.goto(`${BASE}/staff/politicians/blocked-emails`);
  await page.getByRole("link", { name: bouncy.name, exact: true }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: bouncy.name })).toBeVisible();
  await page.getByLabel(staffCopy.emails.note).fill("Their office gave us the right address");
  await page.getByRole("button", { name: staffCopy.emails.unblock }).click();
  await expect(page.getByLabel(staffCopy.emails.note)).not.toBeVisible();
  // It went again, and Jane is told.
  expect(sentIds(flowDatabase, id, "letter")).toHaveLength(2);
  const resent = sentEmail(flowDatabase, id, "supporter-notice");
  expect(resent.TextBody).toBe(copy.notices.resent(bouncy.name));
  await emailFrame(page, resent, "The second email Jane gets");
  story("The letter's history shows each step.");
  const entries = await openLetter(page, id);
  await expect(entries.first()).toContainText(staffCopy.letters.status.notice);
  await expect(entries.filter({ hasText: new RegExp(`^${staffCopy.letters.status.bounced}`) })).toBeVisible();
  await frame(page, "The letter's history");
});

test("Jane's address bounces", async ({ page, request, flowDatabase }) => {
  story(
    "Jane's copy of her letter bounces, so her address is blocked. When the MP replies, the reply is kept but not sent to her, in case staff unblock her address, and the letter's history says why.",
  );
  const sender = madeUpAddress("Jane Smith", 37);
  const id = await writeLetter(page, flowDatabase, sender);
  deliver(flowDatabase, bounceOf(sentIds(flowDatabase, id, "letter-copy")[0], sender));
  await readInbox(request);
  deliver(flowDatabase, { from: OFFICE, to: JANES_PROXY, text: MP_REPLY });
  expect(await readInbox(request)).toMatchObject({ replies: 1, relayed: 1 });
  expect(sentIds(flowDatabase, id, "relay")).toEqual([]);
  const entries = await openLetter(page, id);
  await expect(entries.first()).toContainText(staffCopy.letters.status.relay_held);
  await expect(entries.first()).toContainText(history.reasons.blocked);
  await expect(page.getByText(staffCopy.letters.status.copy_bounced)).toBeVisible();
  await frame(page, "The letter's history");

  story(
    "Within the hour, the notification inbox gets the day's report of supporters' addresses that bounced, with each one's domain and what its server said, to see whether the form should check addresses harder.",
  );
  await runQueue(request);
  const bounces = staffCopy.notifications.supporterBounces;
  const report = newestEmail((email) => email.To === NOTIFICATION_INBOX && email.Subject === bounces.subject(1))!;
  await emailFrame(page, report, "The report to the notification inbox");

  story(
    "A day on, the reply is still held, as nobody has unblocked her address. The MP's office is told, once, from Jane's proxy, in the thread of their reply, as a bounce would have told them.",
  );
  runSql(flowDatabase, `UPDATE letter_relays SET created_at = now() - interval '25 hours' WHERE letter_id = ${id}`);
  await runQueue(request);
  const notice = sentEmail(flowDatabase, id, "office-notice");
  expect(notice.To).toBe(`"Testy McTestface MP" <${OFFICE_ADDRESS}>`);
  expect(notice.TextBody).toBe(copy.notices.office("Jane Smith"));
  await emailFrame(page, notice, "The email the MP's office gets");

  story("The letter's history says the office was told.");
  const later = await openLetter(page, id);
  await expect(later.first()).toContainText(staffCopy.letters.status.office_told);
  await frame(page, "The letter's history, the office told");
});

test("The daily limit", async ({ page, request, flowDatabase }) => {
  story(
    "The letters inbox sends at most 1,950 emails a day. Today it's nearly there. The MP replies to Jane, and the reply is relayed with the last of the day. A second reply has to wait.",
  );
  const jane = madeUpAddress("Jane Smith", 38);
  const janes = await writeLetter(page, flowDatabase, jane);
  // A day's sends from the letters inbox, all but one: room for a relay, but not a letter and its copy.
  runSql(
    flowDatabase,
    `INSERT INTO email_sends (purpose, address, outcome, message_id, backend, sender)
     SELECT 'relay', 'someone@example.com', 'sent', 'filler-' || n, 'gmail', '${LETTERS_INBOX}' FROM generate_series(1, 1947) n`,
  );
  deliver(flowDatabase, { from: OFFICE, to: JANES_PROXY, text: MP_REPLY });
  await readInbox(request);
  // Its relay took the last of the day: it went. The next waits.
  deliver(flowDatabase, {
    from: OFFICE,
    to: JANES_PROXY,
    subject: "Re: A further note",
    text: "Dear Jane,\r\n\r\nOne more thing.\r\n",
  });
  await readInbox(request);
  expect(sentIds(flowDatabase, janes, "relay")).toHaveLength(1);

  expect(
    runSql(
      flowDatabase,
      `SELECT count(*) FROM email_sends WHERE sender = '${LETTERS_INBOX}' AND outcome = 'sent' AND at > now() - interval '1 day'`,
    ),
  ).toEqual(["1950"]);
  story("Sam writes to the same MP. His letter can't go yet, so the page he sees says it will go within the hour.");
  const sam = madeUpAddress("Sam Smith", 39);
  await fakeTurnstile(page);
  await lookUpTestMp(page, BASE, TEST_MPS[0], "Sam Smith");
  await fillLetter(page, sam);
  await page.getByRole("button", { name: copy.preview.send }).click();
  await expect(page.getByRole("status")).toHaveText(copy.sent.queued(TEST_MPS[0].name));
  await frame(page, "The page Sam sees");
  story("On his letter's page, staff see it's waiting, and why.");
  const sams = letterIdOf(flowDatabase, sam);
  let entries = await openLetter(page, sams);
  await expect(entries.first()).toContainText(history.reasons.daily_limit);
  await frame(page, "Sam's letter, waiting");
  story(
    "Three hours on, Sam's letter is still waiting, so the notification inbox gets an email: how many letters are waiting, and why.",
  );
  runSql(flowDatabase, `UPDATE letters SET created_at = now() - interval '3 hours 10 minutes' WHERE id = ${sams}`);
  await runQueue(request);
  const waiting = staffCopy.notifications.lettersWaiting;
  const notice = newestEmail((email) => email.To === NOTIFICATION_INBOX && email.Subject === waiting.subject(1, 3))!;
  await emailFrame(page, notice, "The email to the notification inbox");
  story(
    "The next day, the hourly job sends what's waiting: the MP's second reply to Jane first, then Sam's letter and his copy.",
  );

  // A day on, the next hour's run: the waiting relay first, then the letter and its copy.
  runSql(flowDatabase, "DELETE FROM email_sends WHERE message_id LIKE 'filler-%'");
  expect(await runQueue(request)).toEqual({ sent: 2, left: 0 });
  const order = runSql(
    flowDatabase,
    `SELECT purpose || ' ' || letter_id FROM email_sends WHERE purpose IN ('relay', 'letter') AND outcome = 'sent' ORDER BY id DESC LIMIT 2`,
  );
  expect(order).toEqual([`letter ${sams}`, `relay ${janes}`]);
  entries = await openLetter(page, sams);
  await expect(entries.first()).toContainText(staffCopy.letters.status.copy_sent);
  await frame(page, "Sam's letter, sent");
});

test("Jane changes the letter", async ({ page, flowDatabase }) => {
  story("Jane cuts the sentence asking for a meeting, and adds a paragraph of her own.");
  const sender = madeUpAddress("Jane Smith", 40);
  await fakeTurnstile(page);
  await lookUpTestMp(page, BASE);
  // The sentence asking for a meeting, cut; a paragraph of her own, added.
  const meeting = "I would also like you to arrange a short meeting with me to discuss this important matter.";
  await editor(page).evaluate((element, text) => {
    // Through the editor's own command, as a click into a wrapped line on a phone lands its caret unreliably.
    const tiptap = (element as HTMLElement & { editor: EditorHandle }).editor;
    let range = { from: 0, to: 0 };
    tiptap.state.doc.descendants((node, pos) => {
      if (node.isTextblock && node.textContent === text) range = { from: pos, to: pos + node.nodeSize };
    });
    tiptap.chain().focus().deleteRange(range).run();
  }, meeting);
  await expect(editor(page)).not.toContainText(meeting);
  await newParagraphAboveSignOff(page);
  await page.keyboard.type("My children ask me about AI every week, and I don't know what to tell them.");
  // Typing scrolls the window to keep the caret in view, not to the same place each time; the frame is of the
  // page as a whole, so from its top.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await scrollSettled(page);
  await frame(page, "Jane's letter");
  story(
    "She sends it. On the letter's page, staff see only what she changed. The paragraphs she left alone are folded.",
  );
  await fillLetter(page, sender);
  await page.getByRole("button", { name: copy.preview.send }).click();
  await expect(page.getByRole("status")).toHaveText(copy.sent.body(TEST_MPS[0].name));
  await logIn(page, flowDatabase, ["supporters"]);
  await openLetter(page, letterIdOf(flowDatabase, sender));

  const words = staffCopy.letterChanges;
  const letter = page.getByRole("article").first();
  await expect(letter.locator("ins").first()).toContainText("My children ask me about AI");
  await expect(letter.locator("del").first()).toContainText("arrange a short meeting");
  // The campaign's paragraphs she left alone, folded.
  await expect(letter).not.toContainText("national security");
  await frame(page, "The letter's page");
  story("Clicking a fold opens it.");
  await letter
    .getByRole("button", { name: /unchanged/ })
    .first()
    .click();
  await expect(letter).toContainText("national security");
  await frame(page, "A fold opened");
  story("Show as sent shows the letter as the MP got it.");
  await letter.getByRole("button", { name: words.asSent }).click();
  await expect(letter).not.toContainText("arrange a short meeting");
  await expect(letter.locator("ins")).toHaveCount(0);
  await expect(letter.getByRole("button", { name: words.showChanges })).toBeVisible();
  await frame(page, "The letter as sent");
});

/** Postmark's inbound webhook, as it posts an email to an old letter's own address; gives how many it was forwarded to. */
async function inbound(request: APIRequestContext, address: string, email: Record<string, unknown>): Promise<number> {
  const res = await request.post(`${BASE}/api/postmark/inbound`, {
    headers: { Authorization: WEBHOOK_AUTH },
    data: {
      OriginalRecipient: address,
      MailboxHash: "",
      ToFull: [{ Email: address, Name: "" }],
      CcFull: [],
      Subject: "Re: Please back a pause",
      Date: "Fri, 16 Oct 2026 13:00:00 +0100",
      ...email,
    },
  });
  return ((await res.json()) as { forwarded: number }).forwarded;
}

test("A reply to an older letter", async ({ page, request, flowDatabase }) => {
  story(
    "Letters written before the letters inbox each went from an address of their own on letters.pauseai.uk. Replies to them still come in, and are forwarded to the writer and to the shared inbox.",
  );
  const sender = madeUpAddress("Jane Smith", 41);
  // A letter sent before the letters inbox, from its own address on letters.pauseai.uk by Postmark.
  const [id] = runSql(
    flowDatabase,
    `WITH l AS (INSERT INTO letters (kind, notable_person_id, status, created_at, sent_at)
                SELECT 'supporter', id, 'sent', now() - interval '20 days', now() - interval '20 days'
                FROM politicians WHERE test_postcode = 'ZZ99ZZ' RETURNING id),
          f AS (INSERT INTO form_entries (form, name, email, address, postcode, contact_consent, created_at)
                VALUES ('email-your-mp', 'Jane Smith', '${sender}', '1 High Street', 'ZZ9 9ZZ', false, now() - interval '20 days')
                RETURNING id)
     INSERT INTO letters_from_supporters (id, entry_id, campaign, subject, postmark_mailbox)
     SELECT l.id, f.id, 'regulate-letter-pm', 'Please back a pause', 'jane.smith.482913' FROM l, f RETURNING id`,
  );
  // Sent by Postmark, as every letter before the letters inbox was.
  runSql(
    flowDatabase,
    `INSERT INTO email_sends (at, purpose, letter_id, address, outcome, message_id, backend)
     VALUES (now() - interval '20 days', 'letter', ${id}, 'test-mp@parliament.example', 'sent', 'old-letter-1', 'postmark')`,
  );
  const address = "jane.smith.482913@letters.pauseai.uk";
  const office = { Email: OFFICE_ADDRESS, Name: "Testy McTestface MP" };
  expect(await inbound(request, address, { FromFull: office, MessageID: "old-reply-1", TextBody: MP_REPLY })).toBe(2);
  const forwarded = newestEmailTo(sender)!;
  expect(forwarded.TextBody).toContain(copy.forwardedReply.toSender(office.Name));
  expect(forwarded.ReplyTo).toBe(`${OFFICE_ADDRESS}, ${address}`);
  await emailFrame(page, forwarded, "The reply, as Jane gets it");
  story(
    "The letter's history says where the reply went, and why, and that Postmark sent the letter and brought the reply.",
  );
  await logIn(page, flowDatabase, ["supporters"]);
  const entries = await openLetter(page, id);
  await expect(entries.first()).toContainText(history.handlingReasons.sender);
  await expect(entries.first()).toContainText(`${POLICY_INBOX} · `);
  await expect(entries.first().getByText(staffCopy.letters.backends.postmark, { exact: true })).toBeVisible();
  await expect(entries.last().getByText(staffCopy.letters.backends.postmark, { exact: true })).toBeVisible();
  await frame(page, "The letter's history");
});
