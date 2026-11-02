import type { APIRequestContext, Page } from "@playwright/test";
import type { OutboxEmail } from "../fixtures/outbox";
import { copy } from "@/lib/content/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import { runSql } from "@/scripts/fresh-database.mjs";
import { newestEmail, newestEmailTo, WEBHOOK_AUTH } from "../steps";
import { BASE, emailFrame, expect, frame, madeUpAddress, test } from "./fixtures";
import { POLICY_INBOX, sentLetterId } from "./staff-steps";

// Replies to a supporter's letter to their MP, and the letter's history
// after each: who every email was from, to and copied to, and for each
// reply, who it was forwarded to and why, or why not. Each flow sends a
// letter to the test MP from the form, logged in as staff to see its page.

const history = staffCopy.letters.detail;
const MP = { Email: "test-mp@parliament.example", Name: "Testy McTestface MP" };

/** The test MP's words in their reply: made up, but as long and as formal as a real one. */
const MP_REPLY = `Dear Jane,

Thank you for writing to me about the risks from frontier AI, and for sending the open letter and the policy briefing.

I share many of your concerns. I have passed your letter to the Secretary of State for Science, Innovation and Technology, asking what the Government plans to legislate and when, and I will write to you again when I have a reply.

Yours sincerely,

Testy McTestface MP
Member of Parliament for Testshire`;

/** An office's acknowledgement, marked as one only by its subject, as Parliament's Outlook sends them. */
const ACKNOWLEDGEMENT =
  "Thank you for contacting me. Please take this reply as confirmation that your email has been received.";

type Letter = { id: string; address: string; email: OutboxEmail };

/** Writes to the test MP as `sender`, from the form, then logs in as staff; gives the letter's ID, its own address, and the email the MP got. */
async function sendLetter(page: Page, database: string, sender: string): Promise<Letter> {
  const messageId = await sentLetterId(page, database, sender);
  const [row] = runSql(
    database,
    `SELECT e.letter_id || ' ' || s.reply_hash FROM email_sends e JOIN letters_from_supporters s ON s.id = e.letter_id
     WHERE e.message_id = '${messageId}' ORDER BY e.id DESC LIMIT 1`,
  );
  const [id, mailbox] = row.split(" ");
  const address = `${mailbox}@letters.pauseai.uk`;
  const email = newestEmail((one) => one.From.includes(address))!;
  return { id, address, email };
}

/** Postmark's inbound webhook, as it posts an email to the letter's address; gives how many it was forwarded to. */
async function inbound(request: APIRequestContext, letter: Letter, email: Record<string, unknown>): Promise<number> {
  const res = await request.post(`${BASE}/api/postmark/inbound`, {
    headers: { Authorization: WEBHOOK_AUTH },
    data: {
      OriginalRecipient: letter.address,
      MailboxHash: "",
      ToFull: [{ Email: letter.address, Name: "" }],
      CcFull: [],
      Subject: `Re: ${letter.email.Subject}`,
      Date: "Fri, 16 Oct 2026 13:00:00 +0100",
      ...email,
    },
  });
  return ((await res.json()) as { forwarded: number }).forwarded;
}

/** Postmark's bounce webhook, as it posts one: a hard bounce of `address`, or an automatic reply to the letter. */
async function bounce(request: APIRequestContext, body: Record<string, unknown>) {
  const res = await request.post(`${BASE}/api/postmark/bounce`, {
    headers: { Authorization: WEBHOOK_AUTH },
    data: { RecordType: "Bounce", BouncedAt: "2026-10-16T12:00:00Z", ...body },
  });
  expect(await res.json()).toEqual({ recorded: true });
}

/** The newest forward of a reply to the letter that reached the shared inbox; flows run at once, so it's found by the letter's address in its Reply-To. */
function inboxCopy(letter: Letter): OutboxEmail {
  return newestEmail((one) => one.To === POLICY_INBOX && !!one.ReplyTo?.includes(letter.address))!;
}

/** The letter's page, with its history, the newest first. */
async function openLetter(page: Page, letter: Letter) {
  await page.goto(`${BASE}/staff/letters/${letter.id}`);
  const list = page.getByRole("list", { name: history.historyTitle });
  await expect(list).toBeVisible();
  return list.getByRole("listitem");
}

test("The MP replies and the sender writes back: each forwarded, and the letter's history after each", async ({
  page,
  request,
  flowDatabase,
}) => {
  const sender = madeUpAddress("Jane Smith", 24);
  const letter = await sendLetter(page, flowDatabase, sender);
  let entries = await openLetter(page, letter);
  // Sent: from the letter's own address, to the MP, the sender copied in.
  await expect(entries.first()).toContainText(`${history.fields.from}${letter.address}`);
  await expect(entries.first()).toContainText(`${history.fields.to}${MP.Email}`);
  await expect(entries.first()).toContainText(`${history.fields.cc}${sender}`);
  await frame(page, "sent: the history says it went from the letter's own address, to the MP, with Jane on Cc");

  // The MP replies only to the letter's address: the shared inbox and Jane each get a copy.
  expect(await inbound(request, letter, { FromFull: MP, MessageID: "reply-1", TextBody: MP_REPLY })).toBe(2);
  const forwarded = newestEmailTo(sender)!;
  expect(forwarded.TextBody).toContain(MP_REPLY);
  expect(forwarded.TextBody).toContain(copy.forwardedReply.toSender(MP.Name));
  expect(forwarded.Subject).toBe(`Re: ${letter.email.Subject}`);
  // Answering it reaches the MP and the letter's address, so a follow-up is kept with the letter.
  expect(forwarded.ReplyTo).toBe(`${MP.Email}, ${letter.address}`);
  await emailFrame(page, forwarded, "the MP's reply, forwarded to Jane");
  const inboxReply = inboxCopy(letter);
  expect(inboxReply.TextBody).toContain(copy.forwardedReply.toInbox(MP.Name, "Jane Smith"));
  expect(inboxReply.TextBody).toContain(MP_REPLY);
  await emailFrame(page, inboxReply, "the MP's reply, forwarded to the shared inbox");
  entries = await openLetter(page, letter);
  await expect(entries.first()).toContainText(`${history.fields.to}${letter.address}`);
  await expect(entries.first()).toContainText(`${POLICY_INBOX} · `);
  await expect(entries.first()).toContainText(history.handlingReasons.policy_inbox);
  await expect(entries.first()).toContainText(history.handlingReasons.sender);
  await frame(page, "replied: to the letter's address only, so forwarded to the shared inbox and to Jane, and why");

  // Jane answers our copy, which reaches the MP and the letter's address: only the shared inbox gets it.
  expect(
    await inbound(request, letter, {
      FromFull: { Email: sender, Name: "Jane Smith" },
      ToFull: [
        { Email: MP.Email, Name: "" },
        { Email: letter.address, Name: "" },
      ],
      MessageID: "follow-up-1",
      TextBody: "Dear Mr McTestface,\n\nThank you. I'd be glad to meet at one of your surgeries.\n\nJane Smith",
    }),
  ).toBe(1);
  // Nothing goes back to Jane: her newest email is still the MP's reply.
  expect(newestEmailTo(sender)!.TextBody).toContain(MP_REPLY);
  const kept = inboxCopy(letter);
  expect(kept.TextBody).toContain("glad to meet");
  expect(kept.TextBody).toContain(copy.forwardedReply.followUp("Jane Smith", MP.Name));
  expect(kept.ReplyTo).toBe(`${sender}, ${letter.address}`);
  await emailFrame(page, kept, "Jane's answer, copied to the shared inbox");
  entries = await openLetter(page, letter);
  await expect(entries.first()).toContainText(`${history.handling.forwarded}${POLICY_INBOX}`);
  await expect(entries.first()).toContainText(`${history.handling.not_forwarded}${sender}`);
  await expect(entries.first()).toContainText(history.handlingReasons.own_follow_up);
  await frame(
    page,
    "Jane's answer: to the MP and the letter's address; forwarded to the shared inbox, not back to her",
  );
});

test("Automatic replies: one to the letter's address, forwarded; one to the bounce address, only noted", async ({
  page,
  request,
  flowDatabase,
}) => {
  const sender = madeUpAddress("Jane Smith", 25);
  const letter = await sendLetter(page, flowDatabase, sender);

  // The office's acknowledgement, to the letter's address, known as one by its subject alone.
  expect(
    await inbound(request, letter, {
      FromFull: MP,
      MessageID: "ack-1",
      Subject: `Automatic reply: ${letter.email.Subject}`,
      TextBody: ACKNOWLEDGEMENT,
    }),
  ).toBe(2);
  await emailFrame(page, newestEmailTo(sender)!, "the office's acknowledgement, forwarded to Jane");
  const inboxAcknowledgement = inboxCopy(letter);
  expect(inboxAcknowledgement.TextBody).toContain(ACKNOWLEDGEMENT);
  await emailFrame(page, inboxAcknowledgement, "the office's acknowledgement, forwarded to the shared inbox");
  let entries = await openLetter(page, letter);
  await expect(entries.first()).toContainText(staffCopy.letters.status.auto_reply);
  await expect(entries.first()).toContainText(history.handlingReasons.sender);
  await frame(page, "an auto-reply to the letter's address: forwarded to the shared inbox and to Jane, like any reply");

  // An out-of-office sent to the bounce address, which Postmark reports as a bounce of the letter.
  const [messageId] = runSql(
    flowDatabase,
    `SELECT message_id FROM email_sends WHERE letter_id = ${letter.id} AND purpose = 'letter' AND outcome = 'sent'`,
  );
  await bounce(request, { ID: 7, Type: "AutoResponder", MessageID: messageId, Email: MP.Email, Inactive: false });
  entries = await openLetter(page, letter);
  await expect(entries.first()).toContainText(`${history.handling.nowhere}${history.handlingReasons.bounce_address}`);
  await frame(page, "an auto-reply to the bounce address: noted, not forwarded");
});

test("A reply-all that copies the sender, then a reply after the sender's address bounced", async ({
  page,
  request,
  flowDatabase,
}) => {
  const sender = madeUpAddress("Jane Smith", 26);
  const letter = await sendLetter(page, flowDatabase, sender);

  // Reply-all: Jane is on its Cc, so she has it already.
  expect(
    await inbound(request, letter, {
      FromFull: MP,
      MessageID: "reply-all-1",
      CcFull: [{ Email: sender, Name: "Jane Smith" }],
      TextBody: MP_REPLY,
    }),
  ).toBe(1);
  const replyAll = inboxCopy(letter);
  expect(replyAll.TextBody).toContain(`Cc: Jane Smith <${sender}>`);
  expect(replyAll.TextBody).toContain(copy.forwardedReply.senderCopied("Jane Smith"));
  await emailFrame(page, replyAll, "the reply-all, forwarded to the shared inbox only, saying Jane was copied in");
  let entries = await openLetter(page, letter);
  await expect(entries.first()).toContainText(`${history.fields.cc}${sender}`);
  await expect(entries.first()).toContainText(`${history.handling.not_forwarded}${sender}`);
  await expect(entries.first()).toContainText(history.handlingReasons.copied);
  await frame(page, "a reply-all with Jane on Cc: forwarded to the shared inbox only, as she has it already");

  // Jane's address bounces, so it's blocked; the MP's next reply can't be forwarded to her.
  await bounce(request, { Type: "HardBounce", Email: sender, Inactive: true, CanActivate: true });
  expect(await inbound(request, letter, { FromFull: MP, MessageID: "reply-2", TextBody: MP_REPLY })).toBe(1);
  const secondReply = inboxCopy(letter);
  expect(secondReply.TextBody).toContain(copy.forwardedReply.senderBlocked("Jane Smith"));
  await emailFrame(page, secondReply, "the MP's second reply, at the shared inbox, saying Jane's copy couldn't go");
  entries = await openLetter(page, letter);
  await expect(entries.first()).toContainText(`${history.handling.failed}${sender}`);
  await expect(entries.first()).toContainText(history.handlingReasons.blocked);
  await frame(page, "after Jane's address bounced: forwarded to the shared inbox; to her it failed, as it's blocked");
});

test("A sender whose address bounced writes to their MP: the letter goes without their copy", async ({
  page,
  request,
  flowDatabase,
}) => {
  const sender = madeUpAddress("Jane Smith", 27);
  await bounce(request, { Type: "HardBounce", Email: sender, Inactive: true, CanActivate: true });
  const letter = await sendLetter(page, flowDatabase, sender);
  expect(letter.email.Cc).toBeUndefined();
  await emailFrame(page, letter.email, "the letter the MP gets, with no Cc");
  const entries = await openLetter(page, letter);
  await expect(entries.first()).toContainText(`${history.fields.to}${MP.Email}`);
  await expect(entries.first()).not.toContainText(history.fields.cc);
  await frame(page, "sent: to the MP, with no Cc, as Jane's address is blocked");
});
