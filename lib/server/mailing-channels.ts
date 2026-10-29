import "server-only";
import { send, type Purpose } from "./email";
import { GMAIL_DAILY_LIMIT, sentToday } from "./gmail-accounts";
import { deliveryProblem, type PostmarkProblem } from "./postmark-webhooks";
import { headerName, notifyDomain, type Attachment } from "./outside-services/postmark";

// How a mailing's messages go out. A channel sends one message, says how
// many more it can send today and what one costs, and turns its provider's
// report on a message into an event. Each has a fake for fixture builds,
// the dev server and tests, which writes each message to the outbox
// (tests/fixtures/outbox.ts); for email, that's sendEmail's own.

/** One message, as a channel sends it. */
export type ChannelMessage = {
  /** The name it's from, and the account it's sent from; and who it's to. Each always has a name. */
  from: { name: string; address: string };
  to: { name: string; address: string };
  subject: string;
  html: string;
  text: string;
  attachments: Attachment[];
  /** The letter it is, for a mailing's. */
  letterId?: number;
};

/** A send, with the Message-ID it went with and its Gmail thread, if it had them; or why not. */
export type ChannelResult =
  | { sent: true; id: string; messageId?: string | null; threadId?: string | null }
  | { sent: false; reason: "blocked" | "failed" };

/** What a provider reported about a message it sent: its ID, and what happened. */
export type ChannelReport = { messageId: string; kind: "delivered" | "failed" | "bounced" | "opted-out" | "replied" };

export type MailingChannel = {
  /** Whether it sends a scheduled mailing. One that doesn't yet still sends test copies. */
  sendsMailings: boolean;
  send(message: ChannelMessage, purpose: Purpose): Promise<ChannelResult>;
  /** How many more it can send from `from` today; null for no limit. */
  remainingToday(from: string): Promise<number | null>;
  /** What one message costs, in pence. */
  cost(message: ChannelMessage): number;
  report(payload: unknown): ChannelReport | undefined;
};

/**
 * Email by Postmark, from our notification domain in the sender's name,
 * with replies to them. It sends test copies; a mailing to politicians is
 * sent from the sender's own Gmail, so this one doesn't send mailings.
 */
export const postmarkEmail: MailingChannel = {
  sendsMailings: false,
  send: (message, purpose) =>
    send(
      {
        From: `"${headerName(message.from.name)}" <noreply@${notifyDomain()}>`,
        ReplyTo: `"${headerName(message.from.name)}" <${message.from.address}>`,
        To: `"${headerName(message.to.name)}" <${message.to.address}>`,
        Subject: message.subject,
        TextBody: message.text,
        HtmlBody: message.html,
        Attachments: message.attachments,
        Tag: purpose,
      },
      purpose,
    ),
  remainingToday: async () => null,
  cost: () => 0,
  report(payload) {
    const problem = deliveryProblem(payload as PostmarkProblem);
    if (!problem?.messageId) return undefined;
    return { messageId: problem.messageId, kind: "bounced" };
  },
};

/**
 * Email by a staff member's connected Gmail, from their own address, as a
 * person writes: one letter at a time, kept in their Sent mail, with
 * replies coming back to them. Its bounces are read from the mailbox
 * (gmail-reading.ts), not reported.
 */
export const gmailEmail: MailingChannel = {
  sendsMailings: true,
  send: (message, purpose) =>
    send(
      {
        From: `"${headerName(message.from.name)}" <${message.from.address}>`,
        To: `"${headerName(message.to.name)}" <${message.to.address}>`,
        Subject: message.subject,
        TextBody: message.text,
        HtmlBody: message.html,
        Attachments: message.attachments,
      },
      purpose,
      message.letterId ?? null,
      { backend: { name: "gmail", account: message.from.address } },
    ),
  remainingToday: async (from) => Math.max(0, GMAIL_DAILY_LIMIT - (await sentToday(from))),
  cost: () => 0,
  report: () => undefined,
};

/** The channel a mailing is sent by. */
export function mailingChannel(channel: "email" | "text" | "whatsapp"): MailingChannel | undefined {
  return channel === "email" ? gmailEmail : undefined;
}
