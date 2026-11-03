// What flows about the letters inbox share: mail arriving there, as a file
// the build's fake Gmail picks up (tests/fixtures/letters-inbox.ts); the
// hourly jobs that read it and work through the queue, run through their
// own routes; and the emails the build sent, found by the Message-ID each
// went with.
import { expect, type APIRequestContext } from "@playwright/test";
import { runSql } from "@/scripts/fresh-database.mjs";
import { LETTERS_INBOX_DIR } from "../checkout.mjs";
import { deliverToLettersInbox } from "../fixtures/letters-inbox";
import { LETTERS_INBOX, testMail, testProxy, type TestMail } from "../fixtures/test-mail";
import type { OutboxEmail } from "../fixtures/outbox";
import { newestEmail } from "../steps";
import { BASE } from "./fixtures";

export { LETTERS_INBOX, testProxy };

/** The test MP, as their office's mail is from. */
export const OFFICE = '"Testy McTestface MP" <test-mp@parliament.example>';
export const OFFICE_ADDRESS = "test-mp@parliament.example";

/** The test MP's proxy, which a supporter's copy is to and their answers go to. */
export const MPS_PROXY = testProxy("testy.mctestface.mp");

/** Puts a message in the letters inbox of the flow on `database`, in Spam if `spam`. */
export function deliver(database: string, mail: TestMail | string, spam = false): void {
  deliverToLettersInbox(typeof mail === "string" ? mail : testMail(mail), {
    scope: database,
    spam,
    dir: LETTERS_INBOX_DIR,
  });
}

/** Runs the hourly read of Gmail, as its scheduled function does; gives the letters inbox's line of the run. */
export async function readInbox(request: APIRequestContext) {
  const res = await request.post(`${BASE}/api/cron/read-gmail`, {
    headers: { Authorization: "Bearer fixture-cron-secret" },
  });
  expect(res.ok()).toBe(true);
  const { accounts } = (await res.json()) as { accounts: { account: string }[] };
  return accounts.find((a) => a.account === LETTERS_INBOX) as Record<string, unknown>;
}

/** Runs the hourly sending, as its scheduled function does: the letters inbox's queue, then the mailings. */
export async function runQueue(request: APIRequestContext) {
  const res = await request.post(`${BASE}/api/cron/send-mailings`, {
    headers: { Authorization: "Bearer fixture-cron-secret" },
  });
  expect(res.ok()).toBe(true);
  return ((await res.json()) as { queue: { sent: number; left: number } }).queue;
}

/** The ID of the newest letter `sender` wrote, on the flow's `database`. */
export function letterIdOf(database: string, sender: string): string {
  const [id] = runSql(
    database,
    `SELECT s.id FROM letters_from_supporters s JOIN form_entries f ON f.id = s.entry_id
     WHERE f.email = '${sender}' ORDER BY s.id DESC LIMIT 1`,
  );
  return id;
}

/** The Message-IDs, oldest first, of what the letters inbox sent about a letter, of `purpose`. */
export function sentIds(database: string, letterId: string, purpose: string): string[] {
  return runSql(
    database,
    `SELECT rfc_message_id FROM email_sends WHERE letter_id = ${letterId} AND purpose = '${purpose}'
       AND outcome = 'sent' ORDER BY id`,
  );
}

/** The newest email about a letter, of `purpose`, as the build sent it. */
export function sentEmail(database: string, letterId: string, purpose: string): OutboxEmail {
  const id = sentIds(database, letterId, purpose).at(-1);
  expect(id, `a sent ${purpose}`).toBeTruthy();
  return newestEmail((email) => email.MessageId === `<${id}>`)!;
}

/** A bounce of the email with Message-ID `messageId` to `address`, as Gmail's mail server sends one. */
export function bounceOf(messageId: string, address: string): string {
  return [
    "From: Mail Delivery Subsystem <mailer-daemon@googlemail.com>",
    `To: ${LETTERS_INBOX}`,
    "Subject: Delivery Status Notification (Failure)",
    "Date: Fri, 16 Oct 2026 13:05:00 +0100",
    `Message-ID: <bounce-${messageId}>`,
    `In-Reply-To: <${messageId}>`,
    `X-Failed-Recipients: ${address}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    `Your message wasn't delivered to ${address} because the address couldn't be found.`,
  ].join("\r\n");
}
