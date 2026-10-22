// Whether we may email an address about each topic, and why: the one
// answer the supporter pages show and any mailing checks. The facts are
// gathered per address by lib/server/email-permissions.ts; the rules are
// here, so they can be tested without a database.
import { KEEP_INFORMED_FREE_FROM } from "./members";

/** What we might email someone about. */
export const EMAIL_TOPICS = ["luma-calendar", "pauseai-updates", "events-and-ways-to-help"] as const;
export type EmailTopic = (typeof EMAIL_TOPICS)[number];

/**
 * Why we may or may not email an address about a topic:
 *
 * - blocked: an email to it bounced hard or was marked as spam, so nothing
 *   goes to it, whatever the topic;
 * - unsubscribed: it told us no, through the source's own unsubscribe;
 * - declined: it left the box unticked: "Keep me informed" on joining, or
 *   the consent box on a letter;
 * - asked: it ticked the box freely: "Keep me informed" on joining, or the
 *   consent box on a letter;
 * - joined: it joined PauseAI before "Keep me informed" was a free choice,
 *   when everyone who joined was on the updates;
 * - following: it follows the Luma calendar;
 * - not-following: it never followed the calendar, though it may have
 *   registered for an event;
 * - not-asked: no source asked it about the topic.
 */
export type EmailReason =
  "blocked" | "unsubscribed" | "declined" | "asked" | "joined" | "following" | "not-following" | "not-asked";

/** Whether we may email `address` about `topic`, why, since when, and which source told us. */
export type EmailPermission = {
  topic: EmailTopic;
  address: string;
  send: boolean;
  reason: EmailReason;
  at: string | null;
  source: string | null;
};

/** What we hold about one address that decides what we may send it. */
export type EmailFacts = {
  address: string;
  /** When the address was blocked, and why, if it is. */
  blocked: { at: string; kind: string } | null;
  /** Opt-outs in force, from any source. */
  optOuts: { list: string; source: string; at: string }[];
  /** When it started following the Luma calendar, if it does. */
  followingSince: string | null;
  /** Its newest member record that we still hold as a member. */
  member: { createdAt: string; keepInformed: boolean } | null;
  /** Its newest letter, and whether it ticked the consent box. */
  letter: { at: string; consent: boolean } | null;
};

const yes = (reason: EmailReason, at: string | null, source: string | null) => ({ send: true, reason, at, source });
const no = (reason: EmailReason, at: string | null, source: string | null) => ({ send: false, reason, at, source });

/** Whether we may email an address about one topic. A block overrides everything; an opt-out in force comes next. */
function decide(topic: EmailTopic, facts: EmailFacts): Omit<EmailPermission, "topic" | "address"> {
  if (facts.blocked) return no("blocked", facts.blocked.at, facts.blocked.kind);
  const optOut = facts.optOuts.find((o) => o.list === topic);
  if (optOut) return no(optOut.source === "airtable-import" ? "declined" : "unsubscribed", optOut.at, optOut.source);
  switch (topic) {
    case "luma-calendar":
      return facts.followingSince ? yes("following", facts.followingSince, "luma") : no("not-following", null, null);
    case "pauseai-updates": {
      const { member } = facts;
      if (!member) return no("not-asked", null, null);
      if (new Date(member.createdAt) < new Date(KEEP_INFORMED_FREE_FROM))
        return yes("joined", member.createdAt, "member");
      return member.keepInformed
        ? yes("asked", member.createdAt, "member")
        : no("declined", member.createdAt, "member");
    }
    case "events-and-ways-to-help": {
      const { letter } = facts;
      if (!letter) return no("not-asked", null, null);
      return letter.consent ? yes("asked", letter.at, "letter") : no("declined", letter.at, "letter");
    }
  }
}

/** Every topic's answer for one address. */
export function emailPermissions(facts: EmailFacts): EmailPermission[] {
  return EMAIL_TOPICS.map((topic) => ({ topic, address: facts.address, ...decide(topic, facts) }));
}
