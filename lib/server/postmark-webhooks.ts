import "server-only";
import { timingSafeEqual } from "node:crypto";
import { copy } from "@/lib/content/email-your-mp";
import { query } from "./db";
import { sendEmail, type Attachment } from "./postmark";

// What Postmark tells us: bounces and spam complaints about letters, and
// replies to them. Postmark doesn't sign webhooks, so each webhook URL
// carries a username and password (basic auth, over HTTPS), and requests
// without them are refused.

/** Whether a webhook request carries our basic auth credentials. Without them set, none does. */
export function isPostmark(request: Request): boolean {
  const user = process.env.POSTMARK_WEBHOOK_USER;
  const password = process.env.POSTMARK_WEBHOOK_PASSWORD;
  if (!user || !password) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

type DeliveryProblem = { RecordType?: string; MessageID?: string; Type?: string; Description?: string; Email?: string };

const STATUSES: Record<string, string> = { Bounce: "bounced", SpamComplaint: "spam_complaint" };

/** Marks a letter bounced or complained about. Returns whether it was one of ours. */
export async function recordDeliveryProblem(payload: DeliveryProblem): Promise<boolean> {
  const status = STATUSES[payload.RecordType ?? ""];
  if (!status || !payload.MessageID) return false;
  const [letter] = await query<{ id: number }>("UPDATE letters SET status = $2 WHERE postmark_message_id = $1 RETURNING id::int AS id", [payload.MessageID, status]);
  if (!letter) return false;
  await query("INSERT INTO letter_events (letter_id, status, details) VALUES ($1, $2, $3)", [
    letter.id,
    status,
    JSON.stringify({ type: payload.Type, description: payload.Description, email: payload.Email }),
  ]);
  return true;
}

type Address = { Email?: string; Name?: string };

export type InboundEmail = {
  MailboxHash?: string;
  FromFull?: Address;
  ToFull?: Address[];
  CcFull?: Address[];
  Subject?: string;
  Date?: string;
  TextBody?: string;
  Attachments?: Attachment[];
};

/**
 * Forwards an MP's reply to a letter: to the shared inbox, and to the sender
 * unless they already have it (their address is in its To or Cc). Nothing
 * about the reply is stored. Returns who it went to.
 */
export async function forwardReply(email: InboundEmail): Promise<string[]> {
  const domain = process.env.MP_MAIL_DOMAIN ?? "mp.pauseai.uk";
  const from = email.FromFull?.Email ?? "";
  // Our own mail coming back round, such as a forwarded copy: never forward it again.
  if (!email.MailboxHash || from.toLowerCase().endsWith(`@${domain}`)) return [];

  const [letter] = await query<{ senderName: string; senderEmail: string; mpName: string }>(
    `SELECT l.sender_name AS "senderName", l.sender_email AS "senderEmail", p.name AS "mpName"
     FROM letters l JOIN politicians p ON p.id = l.politician_id WHERE l.reply_hash = $1`,
    [email.MailboxHash],
  );
  if (!letter) return [];

  const copied = [...(email.ToFull ?? []), ...(email.CcFull ?? [])].map((a) => a.Email?.toLowerCase());
  const recipients = [process.env.REPLIES_INBOX, copied.includes(letter.senderEmail.toLowerCase()) ? undefined : letter.senderEmail].filter(
    (to): to is string => Boolean(to),
  );

  const original = [`From: ${email.FromFull?.Name ?? ""} <${from}>`, `Date: ${email.Date ?? ""}`, `Subject: ${email.Subject ?? ""}`].join("\n");
  for (const to of recipients) {
    await sendEmail({
      From: `PauseAI UK <replies@${domain}>`,
      To: to,
      ReplyTo: from,
      Subject: copy.forwardedReply.subject(email.Subject ?? ""),
      TextBody: `${copy.forwardedReply.note(letter.mpName, letter.senderName)}\n\n${original}\n\n${email.TextBody ?? ""}`,
      Attachments: email.Attachments?.map(({ Name, Content, ContentType }) => ({ Name, Content, ContentType })),
      Tag: "forwarded-reply",
    });
  }
  return recipients;
}
