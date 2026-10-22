// Whether we may email an address about each topic, and why: the one
// answer the supporter pages show and any mailing checks. The facts are
// gathered per address by lib/server/email-permissions.ts; the rules are
// here, so they can be tested without a database.
import { KEEP_INFORMED_FREE_FROM } from "./members";

/**
 * From when Luma tells us of each unsubscribe from the calendar's emails
 * (its webhook). Someone following since before may have left unheard.
 */
export const LUMA_WEBHOOK_FROM = "2026-10-22T00:00:00Z";

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
 * - not-following: it never followed the calendar, though it registered
 *   for an event;
 * - removed: it was a member, but isn't shared with us any more.
 *
 * A topic the address has never had anything to do with (no Luma account,
 * never a member, no letter) has no answer: we'd never email it about that.
 */
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

/** What we hold about one address that decides what we may send it. */
export type EmailFacts = {
  address: string;
  /** When the address was blocked, and why, if it is. */
  blocked: { at: string; kind: string } | null;
  /** Opt-outs in force, from any source. */
  optOuts: { list: string; source: string; at: string }[];
  /** Whether it's a Luma account's address. */
  luma: boolean;
  /** When it started following the Luma calendar, if it does. */
  followingSince: string | null;
  /** Its newest member record, and whether it's no longer read from the membership dataset. */
  member: { createdAt: string; keepInformed: boolean; removed: boolean } | null;
  /** Its newest letter, and whether it ticked the consent box. */
  letter: { at: string; consent: boolean } | null;
};

/** An answer of one kind, with why, since when, and from which source. */
const answer = (send: EmailPermission["send"]) => (reason: EmailReason, at: string | null, source: string | null) => ({
  send,
  reason,
  at,
  source,
});
const yes = answer("yes");
const no = answer("no");
const unsure = answer("unsure");

/** Whether we may email an address about one topic. A block overrides everything; an opt-out in force comes next. */
function decide(topic: EmailTopic, facts: EmailFacts): Omit<EmailPermission, "topic" | "address"> {
  if (facts.blocked) return no("blocked", facts.blocked.at, facts.blocked.kind);
  const optOut = facts.optOuts.find((o) => o.list === topic);
  if (optOut) return no(optOut.source === "airtable-import" ? "declined" : "unsubscribed", optOut.at, optOut.source);
  switch (topic) {
    case "luma-calendar":
      if (!facts.followingSince) return no("not-following", null, null);
      return new Date(facts.followingSince) < new Date(LUMA_WEBHOOK_FROM)
        ? unsure("following", facts.followingSince, "luma")
        : yes("following", facts.followingSince, "luma");
    case "pauseai-updates": {
      // Only asked once it applies (applies()): a member record, or an opt-out, which comes first. Every
      // yes is unsure: the updates are sent from CiviCRM, whose unsubscribes we don't read.
      const member = facts.member!;
      if (member.removed) return no("removed", member.createdAt, "member");
      if (new Date(member.createdAt) < new Date(KEEP_INFORMED_FREE_FROM))
        return unsure("joined", member.createdAt, "member");
      return member.keepInformed
        ? unsure("asked", member.createdAt, "member")
        : no("declined", member.createdAt, "member");
    }
    case "events-and-ways-to-help": {
      const letter = facts.letter!;
      return letter.consent ? yes("asked", letter.at, "letter") : no("declined", letter.at, "letter");
    }
  }
}

/** Whether the address has had anything to do with a topic's source, or an opt-out from it. */
function applies(topic: EmailTopic, facts: EmailFacts): boolean {
  if (facts.optOuts.some((o) => o.list === topic)) return true;
  switch (topic) {
    case "luma-calendar":
      return facts.luma;
    case "pauseai-updates":
      return facts.member !== null;
    case "events-and-ways-to-help":
      return facts.letter !== null;
  }
}

/** The answer for each topic the address has had anything to do with. */
export function emailPermissions(facts: EmailFacts): EmailPermission[] {
  return EMAIL_TOPICS.filter((topic) => applies(topic, facts)).map((topic) => ({
    topic,
    address: facts.address,
    ...decide(topic, facts),
  }));
}
