import "server-only";
import { send, type Purpose } from "./email";
import { deliveryProblem, type PostmarkProblem } from "./postmark-webhooks";
import { headerName, notifyDomain, type Attachment } from "./outside-services/postmark";

// How a mailing's messages go out. A channel sends one message, says how
// many more it can send today and what one costs, and turns its provider's
// report on a message into an event. Each has a fake for fixture builds,
// the dev server and tests, which writes each message to the outbox
// (tests/fixtures/outbox.ts); for email, that's sendEmail's own.

/** One message, as a channel sends it. */
export type ChannelMessage = {
  /** The name it's from, and the account it's sent from. */
  from: { name: string; address: string };
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments: Attachment[];
};

export type ChannelResult = { sent: true; id: string } | { sent: false; reason: "blocked" | "failed" };

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
        ReplyTo: message.from.address,
        To: message.to,
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

/** The channel a mailing is sent by. */
export function mailingChannel(channel: "email" | "text" | "whatsapp"): MailingChannel | undefined {
  return channel === "email" ? postmarkEmail : undefined;
}
