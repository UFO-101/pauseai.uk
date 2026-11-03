import StaffLink from "./ui/StaffLink";
import { Fragment } from "react";
import { staffCopy } from "@/lib/content/staff-interface";
import type { LetterDetails as Details, LetterEvent, LetterForward, ReplyHandling } from "@/lib/server/letters";
import { staffTime } from "@/lib/staff-time";
import Tag from "@/components/ui/Tag";
import { Muted } from "@/components/ui/Text";
import { LoggedJson } from "./Logged";
import styles from "./Details.module.css";

const copy = staffCopy.letters;

/** A letter's status, in words. */
export const statusOf = (status: string) => copy.status[status] ?? status;

/** A letter's page's title: who it's from, a supporter or PauseAI, and to whom. */
export function letterTitle(letter: Details): string {
  return copy.oneTitle(letter.kind === "supporter" ? letter.senderName : copy.fromPauseai, letter.mpName);
}

/**
 * A line of a letter's history: a change of its status as recorded, or one
 * its dates give where nothing was, with `label` in place of the status's
 * words and `tag` beside it, saying what sent it; and for a reply, what was
 * done with it.
 */
export type HistoryEntry = LetterEvent & { label?: string; tag?: string; handling?: ReplyHandling[] };

const wasSent = (event: LetterEvent) => event.status === "sent";
const isReply = (event: LetterEvent) => event.status === "replied" || event.status === "auto_reply";
const time = (at: string) => Date.parse(at);

/**
 * What was done with each reply: as its event recorded it, or for one
 * recorded before that was, the forwards logged from when it came until
 * the next reply did.
 */
function withHandling(events: HistoryEntry[], forwards: LetterForward[]): HistoryEntry[] {
  const replies = events.filter(isReply);
  return events.map((event) => {
    if (!isReply(event)) return event;
    if (Array.isArray(event.details.handling)) return { ...event, handling: event.details.handling as ReplyHandling[] };
    const next = Math.min(...replies.map((r) => time(r.at)).filter((at) => at > time(event.at)));
    const handling = forwards
      .filter((f) => time(f.at) >= time(event.at) && time(f.at) < next)
      .map((f): ReplyHandling =>
        f.outcome === "sent"
          ? { outcome: "forwarded", to: f.address, at: f.at }
          : { outcome: "failed", to: f.address, reason: f.outcome === "refused" ? "blocked" : "refused" },
      );
    return handling.length ? { ...event, handling } : event;
  });
}

/**
 * A letter's history, newest first: each change recorded, Sent tagged with
 * what sent it, and each reply with what was done with it. One that went with no send recorded, as one copied from
 * Airtable, was sent when the letter says; and, with nothing recorded,
 * written then too, if earlier.
 */
export function historyOf(letter: Details): HistoryEntry[] {
  const tag = letter.backend ? copy.backends[letter.backend] : undefined;
  const events = withHandling(
    letter.events.map((event) => (wasSent(event) && tag ? { ...event, tag } : event)),
    letter.kind === "supporter" ? letter.forwards : [],
  );
  if (!letter.sentAt || letter.events.some(wasSent)) return events;
  const sent: HistoryEntry = { at: letter.sentAt, status: "sent", details: {}, tag };
  const written: HistoryEntry[] =
    events.length === 0 && Date.parse(letter.createdAt) < Date.parse(letter.sentAt)
      ? [{ at: letter.createdAt, status: "created", label: copy.columns.created, details: {} }]
      : [];
  return [...events, sent, ...written].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

/** The kind of bounce or complaint Postmark gave that each status already says, so the history leaves it out. */
const SAID_BY_STATUS: Record<string, string> = { bounced: "HardBounce", spam_complaint: "SpamComplaint" };

/** One of Postmark's kinds, in words: "SoftBounce" is "Soft bounce". */
function postmarkWords(type: string): string {
  const words = type.replace(/(?<=[a-z])(?=[A-Z])/g, " ").toLowerCase();
  return words[0].toUpperCase() + words.slice(1);
}

/** One field a change recorded, its value in words: Postmark's kind of bounce; the address, leading to it among the blocked emails; the rest as recorded. */
function EventValue({ name, value }: { name: string; value: unknown }) {
  if (name === "type" && typeof value === "string") return <>{postmarkWords(value)}</>;
  if (name === "reason" && typeof value === "string" && copy.detail.reasons[value])
    return <>{copy.detail.reasons[value]}</>;
  if (name === "notice" && typeof value === "string" && copy.detail.notices[value])
    return <>{copy.detail.notices[value]}</>;
  if (name === "uncertain") return <>{copy.detail.uncertainLetter}</>;
  if (name === "email" && typeof value === "string")
    return <StaffLink href={`/staff/politicians/blocked-emails?q=${encodeURIComponent(value)}`}>{value}</StaffLink>;
  return <>{typeof value === "string" ? value : JSON.stringify(value)}</>;
}

/**
 * The IDs a send, a bounce or a read of Gmail records, for finding a message, not
 * reading, in the {} bubble, not the list; and what was done with a reply,
 * which has a list of its own (Handling).
 */
const IDS = ["messageId", "threadId", "gmailMessageId", "bounceId", "handling"];

/** Who an email was from and to, in an email's order, first: the database keeps a record's fields in an order of its own. */
const ADDRESSES = ["from", "name", "to", "cc", "bcc", "replyTo"];
const place = (name: string) => (ADDRESSES.includes(name) ? ADDRESSES.indexOf(name) : ADDRESSES.length);

/**
 * What a change recorded, a field to a line, each by its name, one with no
 * name in the copy as recorded: every field but Postmark's kind when the
 * status already says it, and the IDs; who it was from and to first.
 */
function EventFields({ event }: { event: LetterEvent }) {
  const fields = Object.entries(event.details)
    .filter(([name, value]) => !IDS.includes(name) && !(name === "type" && SAID_BY_STATUS[event.status] === value))
    .sort(([a], [b]) => place(a) - place(b));
  if (fields.length === 0) return null;
  return (
    <dl className={styles.eventFields}>
      {fields.map(([name, value]) => (
        <Fragment key={name}>
          <dt>{copy.detail.fields[name] ?? name}</dt>
          <dd>
            <EventValue name={name} value={value} />
          </dd>
        </Fragment>
      ))}
    </dl>
  );
}

/**
 * What was done with a reply, a line each: forwarded to whom and when, not
 * forwarded, or a forward that failed; why, when known, under it.
 */
function Handling({ handling }: { handling: ReplyHandling[] }) {
  const words = copy.detail.handling;
  return (
    <dl className={styles.eventFields}>
      {handling.map((h, i) => (
        <Fragment key={i}>
          <dt>{h.outcome === "not_forwarded" && !h.to ? words.nowhere : words[h.outcome]}</dt>
          <dd>
            {[h.to, h.at && staffTime(h.at)].filter(Boolean).join(" · ")}
            {h.to && h.reason && <br />}
            {h.reason && <Muted>{copy.detail.handlingReasons[h.reason]}</Muted>}
          </dd>
        </Fragment>
      ))}
    </dl>
  );
}

/**
 * A letter's history (historyOf), newest first: the status and its time on
 * a line, with its tag, and a {} button at its right that opens what it
 * recorded as recorded, as the audit log has; under them every field, a
 * line each, in words, and for a reply, what was done with it.
 */
export function LetterHistory({ events }: { events: HistoryEntry[] }) {
  if (events.length === 0) return <p className={styles.none}>{copy.detail.noHistory}</p>;
  return (
    <ol className={`${styles.history} ${styles.events}`} aria-label={copy.detail.historyTitle}>
      {events.map((event, i) => (
        <li key={i}>
          <p className={styles.eventHead}>
            <strong>{event.label ?? statusOf(event.status)}</strong>
            {event.tag && <Tag>{event.tag}</Tag>}
            <span className={styles.eventWhen}>{staffTime(event.at)}</span>
          </p>
          <span>
            {Object.keys(event.details).length > 0 && <LoggedJson id={`event-${i}`} details={event.details} />}
          </span>
          <EventFields event={event} />
          {event.handling && <Handling handling={event.handling} />}
        </li>
      ))}
    </ol>
  );
}
