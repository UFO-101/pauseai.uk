// Whether we may email an address about each topic, and why: the answer
// the supporter pages show, the list filters on and the staff home counts.
// The rules are the email_permissions view's
// (netlify/database/migrations/0032_email_permissions.sql), and
// lib/server/email-permissions.ts reads it.

/** What we might email someone about. */
export const EMAIL_TOPICS = ["luma-calendar", "pauseai-updates", "events-and-ways-to-help"] as const;
export type EmailTopic = (typeof EMAIL_TOPICS)[number];

/** Why we may or may not email an address about a topic; the view says what each means. */
export type EmailReason =
  "blocked" | "unsubscribed" | "declined" | "asked" | "joined" | "following" | "not-following" | "removed";

/** Whether we may email `address` about `topic`, why, since when, and which source told us. */
export type EmailPermission = {
  topic: EmailTopic;
  address: string;
  /** Yes, no, or unsure: a yes we can't be sure still holds, as an unsubscribe may not have reached us. */
  send: "yes" | "no" | "unsure";
  reason: EmailReason;
  at: string | null;
  source: string | null;
};
