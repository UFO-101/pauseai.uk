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

/** The reasons each topic can give, in the order the supporters list's filter offers them. Blocked is every topic's. */
export const EMAIL_TOPIC_REASONS = {
  "luma-calendar": ["following", "unsubscribed", "not-following"],
  "pauseai-updates": ["asked", "joined", "declined", "unsubscribed", "removed"],
  "events-and-ways-to-help": ["asked", "declined"],
} as const satisfies Record<EmailTopic, readonly EmailReason[]>;

/** A reason one topic gave, or blocked, whatever the topic. */
export type EmailState = { topic?: EmailTopic; reason: EmailReason };

/** A state from its form value: "blocked", or "<topic>:<reason>" for a reason the topic can give. */
export function emailState(value: string): EmailState | undefined {
  if (value === "blocked") return { reason: "blocked" };
  const [topic, reason] = value.split(":");
  if (!Object.hasOwn(EMAIL_TOPIC_REASONS, topic)) return undefined;
  const reasons: readonly string[] = EMAIL_TOPIC_REASONS[topic as EmailTopic];
  return reasons.includes(reason) ? { topic: topic as EmailTopic, reason: reason as EmailReason } : undefined;
}

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
