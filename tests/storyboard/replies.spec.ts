import type { APIRequestContext, Page } from "@playwright/test";
import { copy } from "@/lib/content/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import { TEST_MPS } from "@/lib/test-mps";
import { runSql } from "@/scripts/fresh-database.mjs";
import { fakeTurnstile, fillLetter, lookUpTestMp, newestEmail, newestEmailTo, WEBHOOK_AUTH } from "../steps";
import { editor, newParagraphAboveSignOff } from "./editor-steps";

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
import { BASE, emailFrame, expect, frame, madeUpAddress, test } from "./fixtures";
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
import { bouncy, BOUNCY_ADDRESS, logIn, POLICY_INBOX, sentLetterId } from "./staff-steps";

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

/** The letter's page, with its history, the newest first. */
async function openLetter(page: Page, id: string) {
  await page.goto(`${BASE}/staff/letters/${id}`);
  const list = page.getByRole("list", { name: history.historyTitle });
  await expect(list).toBeVisible();
  return list.getByRole("listitem");
}

/** Writes to the test MP as Jane, at `sender`, from the form, then logs in as staff; gives the letter's ID. */
async function writeLetter(page: Page, database: string, sender: string): Promise<string> {
  return sentLetterId(page, database, sender);
}

test("Write to the test MP: the letter goes from Jane's proxy, her copy to the MP's, and the history says so", async ({
  page,
  flowDatabase,
}) => {
  const sender = madeUpAddress("Jane Smith", 31);
  const id = await writeLetter(page, flowDatabase, sender);
  const copied = sentEmail(flowDatabase, id, "letter-copy");
  expect(copied.Bcc).toBe(sender);
  expect(copied.ReplyTo).toBe(copied.To);
  await emailFrame(
    page,
    copied,
    "Jane's copy: Bcc'd to her, from her proxy to the MP's, which Reply and Reply all reach",
  );
  const entries = await openLetter(page, id);
  await expect(entries.first()).toContainText(staffCopy.letters.status.copy_sent);
  await expect(entries.nth(1)).toContainText(staffCopy.letters.backends.gmail);
  await expect(entries.nth(1)).toContainText(`${history.fields.to}${OFFICE_ADDRESS}`);
  await expect(page.getByRole("article").getByRole("button", { name: /unchanged/ })).toBeVisible();
  await frame(
    page,
    "the letter's page: sent by Gmail from Jane's proxy, then her copy; her letter, as drafted, folded",
  );
});

test("The MP replies and Jane answers: each relayed, the same message, from the other's proxy", async ({
  page,
  request,
  flowDatabase,
}) => {
  const sender = madeUpAddress("Jane Smith", 32);
  const id = await writeLetter(page, flowDatabase, sender);

  deliver(flowDatabase, { from: OFFICE, to: JANES_PROXY, cc: "caseworker@parliament.example", text: MP_REPLY });
  expect(await readInbox(request)).toMatchObject({ replies: 1, relayed: 1, notUnderstood: [] });
  const toJane = sentEmail(flowDatabase, id, "relay");
  expect(toJane.To).toBe(sender);
  expect(toJane.From).toBe(`"Testy McTestface MP (via PauseAI)" <${MPS_PROXY}>`);
  expect(toJane.Cc).toBeUndefined();
  expect(toJane.InReplyTo).toBe(`<${sentIds(flowDatabase, id, "letter-copy")[0]}>`);
  expect(toJane.TextBody).toBe(MP_REPLY.replace(/\r/g, ""));
  await emailFrame(page, toJane, "the MP's reply, relayed to Jane from the MP's proxy, in the thread of her copy");

  deliver(flowDatabase, {
    from: `"Jane Smith" <${sender}>`,
    to: MPS_PROXY,
    subject: "Re: Re: Subject",
    inReplyTo: toJane.MessageId!.slice(1, -1),
    text: "Dear Mr McTestface,\r\n\r\nThank you. I'd be glad to meet at one of your surgeries.\r\n\r\nJane Smith\r\n",
  });
  expect(await readInbox(request)).toMatchObject({ replies: 1, relayed: 1 });
  const toMp = sentEmail(flowDatabase, id, "relay");
  expect(toMp.To).toBe(`"Testy McTestface MP" <${OFFICE_ADDRESS}>`);
  expect(toMp.From).toBe(`"Jane Smith (via PauseAI)" <${JANES_PROXY}>`);
  expect(toMp.InReplyTo).toBe(`<${sentIds(flowDatabase, id, "letter")[0]}>`);
  await emailFrame(page, toMp, "Jane's answer, relayed to the MP from her proxy, naming the letter");

  const entries = await openLetter(page, id);
  await expect(entries.first()).toContainText(staffCopy.letters.status.relayed);
  await expect(entries.nth(1)).toContainText(staffCopy.letters.status.replied);
  await expect(page.getByRole("article")).toHaveCount(3);
  await frame(page, "the letter's page: the letter, the MP's reply and Jane's answer, each relayed");
});

test("A reply with HTML and an attachment is relayed unchanged", async ({ page, request, flowDatabase }) => {
  const sender = madeUpAddress("Jane Smith", 33);
  const id = await writeLetter(page, flowDatabase, sender);
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
  await emailFrame(page, relayed, "the reply relayed to Jane: its HTML and its attachment, as the office sent them");
});

test("Automatic replies are relayed both ways; a loop stops at the cap, and staff are told", async ({
  page,
  request,
  flowDatabase,
}) => {
  const sender = madeUpAddress("Jane Smith", 34);
  const id = await writeLetter(page, flowDatabase, sender);
  const acknowledgement =
    "Thank you for contacting me. Please take this reply as confirmation that your email has been received.\r\n";
  deliver(flowDatabase, {
    from: OFFICE,
    to: JANES_PROXY,
    subject: "Automatic reply: Please back a pause",
    text: acknowledgement,
  });
  await readInbox(request);
  await emailFrame(page, sentEmail(flowDatabase, id, "relay"), "the office's acknowledgement, relayed to Jane");
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
  await emailFrame(page, ooo, "Jane's out-of-office, relayed to the MP, still marked as automatic");

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
    (email) => email.To === POLICY_INBOX && email.Subject === staffCopy.lettersInbox.alert.subject(1),
  )!;
  expect(alert.TextBody).toContain(staffCopy.lettersInbox.reasons.over_cap);
  await emailFrame(page, alert, "the email staff get: one message not relayed, over the letter's cap");
  const entries = await openLetter(page, id);
  await expect(entries.first()).toContainText(staffCopy.letters.status.not_relayed);
  await expect(entries.first()).toContainText(history.reasons.over_cap);
  await frame(page, "the letter's history: the last automatic reply not relayed, over the cap");
});

test("A stranger, a forged MP's reply, and spam: none relayed, and the run says which need a look", async ({
  page,
  request,
  flowDatabase,
}) => {
  const sender = madeUpAddress("Jane Smith", 35);
  await writeLetter(page, flowDatabase, sender);
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
    (email) => email.To === POLICY_INBOX && email.Subject === staffCopy.lettersInbox.alert.subject(2),
  )!;
  await emailFrame(page, alert, "the email staff get: two messages that need a look, each with a link to it in Gmail");
  await page.goto(`${BASE}/staff/import-data/gmail`);
  await expect(page.getByText(staffCopy.runs.status.failed, { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: staffCopy.lettersInbox.openInGmail })).toHaveCount(2);
  await frame(page, "the run failed: the stranger and the forgery listed, the spam counted");
});

test("The letter bounces: staff alerted and Jane told; unblocked, it goes again", async ({
  page,
  request,
  flowDatabase,
}) => {
  const sender = madeUpAddress("Jane Smith", 36);
  const id = await sentLetterId(page, flowDatabase, sender, bouncy);
  deliver(flowDatabase, bounceOf(sentIds(flowDatabase, id, "letter")[0], BOUNCY_ADDRESS));
  expect(await readInbox(request)).toMatchObject({ bounces: 1, notUnderstood: [] });
  const alert = newestEmail(
    (email) => email.To === POLICY_INBOX && email.Subject === staffCopy.alert.subject(bouncy.name),
  )!;
  await emailFrame(page, alert, "the email staff get about it");
  const notice = sentEmail(flowDatabase, id, "supporter-notice");
  expect(notice.TextBody).toBe(copy.notices.bounced(bouncy.name));
  expect(notice.From).toBe(`"PauseAI" <${LETTERS_INBOX}>`);
  await emailFrame(page, notice, "Jane told, in our own words, in her copy's thread: her letter hasn't reached her MP");

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
  await emailFrame(page, resent, "unblocked: the letter goes again, and Jane is told");
  const entries = await openLetter(page, id);
  await expect(entries.first()).toContainText(staffCopy.letters.status.notice);
  await expect(entries.filter({ hasText: new RegExp(`^${staffCopy.letters.status.bounced}`) })).toBeVisible();
  await frame(page, "the letter's history: bounced, Jane told, sent again, Jane told");
});

test("Jane's own address bounces: the MP's next reply is held, and the history says why", async ({
  page,
  request,
  flowDatabase,
}) => {
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
  await frame(page, "Jane's copy bounced, so the MP's reply is kept but held, as her address is blocked");
});

test("Over the daily limit: the letter waits, then goes after a relay that was waiting", async ({
  page,
  request,
  flowDatabase,
}) => {
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
  const sam = madeUpAddress("Sam Smith", 39);
  await fakeTurnstile(page);
  await lookUpTestMp(page, BASE, TEST_MPS[0], "Sam Smith");
  await fillLetter(page, sam);
  await page.getByRole("button", { name: copy.preview.send }).click();
  await expect(page.getByRole("status")).toHaveText(copy.sent.queued(TEST_MPS[0].name));
  await frame(page, "the sent page: the letter will reach the MP within the hour");
  const sams = letterIdOf(flowDatabase, sam);
  let entries = await openLetter(page, sams);
  await expect(entries.first()).toContainText(history.reasons.daily_limit);
  await frame(page, "Sam's letter, queued: the letters inbox reached its daily limit");

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
  await frame(page, "the next hour: Jane's waiting relay went first, then Sam's letter and his copy");
});

test("Jane adds her own words and cuts a sentence: the letter's page shows only what she changed", async ({
  page,
  flowDatabase,
}) => {
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
  await frame(page, "Jane's letter: a sentence cut, and a paragraph of her own");
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
  await frame(page, "the letter's page: only what Jane changed, the campaign's paragraphs she left alone folded");
  await letter
    .getByRole("button", { name: /unchanged/ })
    .first()
    .click();
  await expect(letter).toContainText("national security");
  await frame(page, "a fold clicked: the paragraphs she left alone, unfolded");
  await letter.getByRole("button", { name: words.asSent }).click();
  await expect(letter).not.toContainText("arrange a short meeting");
  await expect(letter.locator("ins")).toHaveCount(0);
  await expect(letter.getByRole("button", { name: words.showChanges })).toBeVisible();
  await frame(page, "Show as sent: the letter as the MP got it, with Show changes to go back");
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

test("An old letter's reply comes through Postmark, and is forwarded as before", async ({
  page,
  request,
  flowDatabase,
}) => {
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
  const address = "jane.smith.482913@letters.pauseai.uk";
  const office = { Email: OFFICE_ADDRESS, Name: "Testy McTestface MP" };
  expect(await inbound(request, address, { FromFull: office, MessageID: "old-reply-1", TextBody: MP_REPLY })).toBe(2);
  const forwarded = newestEmailTo(sender)!;
  expect(forwarded.TextBody).toContain(copy.forwardedReply.toSender(office.Name));
  expect(forwarded.ReplyTo).toBe(`${OFFICE_ADDRESS}, ${address}`);
  await emailFrame(
    page,
    forwarded,
    "the MP's reply, forwarded to Jane, as replies to letters before the letters inbox are",
  );
  await logIn(page, flowDatabase, ["supporters"]);
  const entries = await openLetter(page, id);
  await expect(entries.first()).toContainText(history.handlingReasons.sender);
  await expect(entries.first()).toContainText(`${POLICY_INBOX} · `);
  await frame(page, "its history: forwarded to the shared inbox and to Jane, and why");
});
