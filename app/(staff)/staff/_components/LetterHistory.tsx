import StaffLink from "./ui/StaffLink";
import { Fragment } from "react";
import { staffCopy } from "@/lib/content/staff-interface";
import type { LetterDetails as Details, LetterEvent } from "@/lib/server/letters";
import type { LetterBackend } from "@/lib/staff-search";
import { staffTime } from "@/lib/staff-time";
import Tag from "@/components/ui/Tag";
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
 * words and `tag` beside it, saying what sent it.
 */
export type HistoryEntry = LetterEvent & { label?: string; tag?: string };

const wasSent = (event: LetterEvent) => event.status === "sent";

/**
 * What sent a letter: a supporter's, as the letters list says; PauseAI's,
 * Gmail when its send is recorded, else Airtable, which it was copied from.
 * Nothing for one never sent.
 */
function backendOf(letter: Details): LetterBackend | null {
  if (letter.kind === "supporter") return letter.backend;
  if (!letter.sentAt) return null;
  return letter.events.some(wasSent) ? "gmail" : "airtable";
}

/**
 * A letter's history, newest first: each change recorded, Sent tagged with
 * what sent it. One copied from Airtable, which recorded no send, was sent
 * when Airtable says; and, with nothing recorded, written then too, if
 * earlier.
 */
export function historyOf(letter: Details): HistoryEntry[] {
  const backend = backendOf(letter);
  const tag = backend ? copy.backends[backend] : undefined;
  const events: HistoryEntry[] = letter.events.map((event) => (wasSent(event) && tag ? { ...event, tag } : event));
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
  if (name === "email" && typeof value === "string")
    return <StaffLink href={`/staff/politicians/blocked-emails?q=${encodeURIComponent(value)}`}>{value}</StaffLink>;
  return <>{typeof value === "string" ? value : JSON.stringify(value)}</>;
}

/** The IDs a send or a read of Gmail records, for finding a message, not reading: in the {} bubble, not the list. */
const IDS = ["messageId", "threadId", "gmailMessageId"];

/**
 * What a change recorded, a field to a line, each by its name, one with no
 * name in the copy as recorded: every field but Postmark's kind when the
 * status already says it, and the IDs.
 */
function EventFields({ event }: { event: LetterEvent }) {
  const fields = Object.entries(event.details).filter(
    ([name, value]) => !IDS.includes(name) && !(name === "type" && SAID_BY_STATUS[event.status] === value),
  );
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
 * A letter's history (historyOf), newest first: the status and its time on
 * a line, with its tag, and a {} button at its right that opens what it
 * recorded as recorded, as the audit log has; under them every field, a
 * line each, in words.
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
        </li>
      ))}
    </ol>
  );
}
