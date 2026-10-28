// Whether we may contact an address or a phone number about each topic,
// and why: the answer the supporter pages show, the list filters on and the
// staff home counts. The rules are contact_permission()'s
// (netlify/database/migrations/0049_contact_permissions.sql), and
// lib/server/contact-permissions.ts reads them.

/** How we'd reach someone. */
export const CHANNELS = ["email", "phone"] as const;
export type Channel = (typeof CHANNELS)[number];

/** What we might contact someone about. */
export const TOPICS = ["luma-calendar", "pauseai-updates", "site-forms", "volunteering", "march-day"] as const;
export type Topic = (typeof TOPICS)[number];

/** Why we may or may not contact someone about a topic; the migration says what each means. */
export type Reason =
  | "blocked"
  | "unsubscribed"
  | "declined"
  | "asked"
  | "joined"
  | "following"
  | "not-following"
  | "removed"
  | "volunteered"
  | "gave-number"
  | "ended";

/**
 * Each channel's topics, and the reasons each can give, in the order the
 * supporters list's filter offers them. Blocked is every email topic's.
 */
export const TOPIC_REASONS = {
  email: {
    "luma-calendar": ["following", "unsubscribed", "not-following"],
    "pauseai-updates": ["asked", "joined", "declined", "unsubscribed", "removed"],
    "site-forms": ["asked", "declined"],
  },
  phone: {
    "luma-calendar": ["following", "unsubscribed", "not-following"],
    volunteering: ["volunteered", "gave-number", "removed"],
    "site-forms": ["asked", "declined"],
    "march-day": ["gave-number", "ended"],
  },
} as const satisfies Record<Channel, Partial<Record<Topic, readonly Reason[]>>>;

/** A channel's topics, in TOPIC_REASONS's order. */
export function topicsOf(channel: Channel): Topic[] {
  return Object.keys(TOPIC_REASONS[channel]) as Topic[];
}

/** A reason one topic gave by one channel, or an email address blocked, whatever the topic. */
export type ContactState = { channel: Channel; topic?: Topic; reason: Reason };

/**
 * A state from its form value: "<channel>:<topic>:<reason>" for a reason
 * the channel's topic can give, or "email:blocked".
 */
export function contactState(value: string): ContactState | undefined {
  if (value === "email:blocked") return { channel: "email", reason: "blocked" };
  const [channel, topic, reason] = value.split(":");
  if (!Object.hasOwn(TOPIC_REASONS, channel)) return undefined;
  const topics: Partial<Record<string, readonly string[]>> = TOPIC_REASONS[channel as Channel];
  if (!Object.hasOwn(topics, topic)) return undefined;
  return topics[topic]!.includes(reason)
    ? { channel: channel as Channel, topic: topic as Topic, reason: reason as Reason }
    : undefined;
}

/** A state's form value, which contactState reads back. */
export function stateValue(state: ContactState): string {
  return [state.channel, state.topic, state.reason].filter(Boolean).join(":");
}

/** Whether we may contact `address` by `channel` about `topic`, why, since when, and which source told us. */
export type ContactPermission = {
  topic: Topic;
  channel: Channel;
  /** An email address, or a phone number as phone_number() writes it. */
  address: string;
  /** Yes, no, or unsure: a yes we can't be sure still holds, as an unsubscribe may not have reached us. */
  send: "yes" | "no" | "unsure";
  reason: Reason;
  at: string | null;
  source: string | null;
};
