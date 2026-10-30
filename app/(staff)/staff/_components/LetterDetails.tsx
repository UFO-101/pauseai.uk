import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { staffCopy } from "@/lib/content/staff-interface";
import { gmailThreadUrl } from "@/lib/gmail-connect";
import { gmailSearchUrl, googleGroupUrl } from "@/lib/letter-links";
import type {
  LetterDetails as Details,
  LetterEvent,
  PauseaiLetterDetails,
  SupporterLetterDetails,
} from "@/lib/server/letters";
import { staffTime } from "@/lib/staff-time";
import Tag from "@/components/ui/Tag";
import { Muted } from "@/components/ui/Text";
import Breadcrumb from "./Breadcrumb";
import CampaignName from "./CampaignName";
import { LoggedJson } from "./Logged";
import Grid, { Card } from "./ui/Grid";
import styles from "./Details.module.css";

const copy = staffCopy.letters;

/** A letter's status, in words. */
const statusOf = (status: string) => copy.status[status] ?? status;

/** A letter's page's title: who it's from, a supporter or PauseAI, and to whom. */
export function letterTitle(letter: Details): string {
  return copy.oneTitle(letter.kind === "supporter" ? letter.senderName : copy.fromPauseai, letter.mpName);
}

/** One line of the facts: its label and value. Nothing when there's no value. */
function Fact({ label, children }: { label: string; children: ReactNode }) {
  if (!children) return null;
  return (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

/** Where to read a supporter's letter as it was sent: its copy in the policy@ group. */
function GroupLink({ letter }: { letter: SupporterLetterDetails }) {
  return (
    letter.postmarkId && (
      <p className={styles.source}>
        <a href={googleGroupUrl(letter.postmarkId)} target="_blank" rel="noreferrer">
          {copy.detail.googleGroup}
        </a>
      </p>
    )
  );
}

/**
 * Where to read one of PauseAI's letters in Gmail: in its thread, for
 * `me` if it went from their Gmail; or else by a search for it, by its
 * MP's address and when it went, or was made. Nothing with no address.
 */
export function GmailLink({ letter, me }: { letter: PauseaiLetterDetails; me: string }) {
  if (letter.gmailThreadId && letter.sentFrom === me) {
    return (
      <a href={gmailThreadUrl(me, letter.gmailThreadId)} target="_blank" rel="noreferrer">
        {staffCopy.letterThread.openInGmail}
      </a>
    );
  }
  return (
    letter.mpEmail && (
      <a href={gmailSearchUrl(letter.mpEmail, letter.sentAt ?? letter.createdAt)} target="_blank" rel="noreferrer">
        {copy.detail.gmail}
      </a>
    )
  );
}

/** Who a letter is from, and, for a supporter's, the facts only theirs have: the campaign, the subject, the box. */
function Sender({ letter }: { letter: Details }) {
  if (letter.kind === "pauseai") {
    return (
      <>
        <Fact label={copy.columns.from}>{copy.fromPauseai}</Fact>
        <Fact label={copy.detail.mailing}>
          <Link href={`/staff/mailings/${letter.mailingId}`}>{letter.mailing}</Link>
        </Fact>
        <Fact label={copy.detail.personalised}>{letter.personalised && copy.consent.yes}</Fact>
      </>
    );
  }
  return (
    <>
      <Fact label={copy.columns.from}>
        {letter.supporterId === null ? (
          letter.senderName
        ) : (
          <Link href={`/staff/supporters/${letter.supporterId}`}>{letter.senderName}</Link>
        )}{" "}
        <Muted>{letter.senderEmail}</Muted>
      </Fact>
      <Fact label={copy.columns.campaign}>
        <CampaignName slug={letter.campaign} title={letter.campaignTitle} url={letter.campaignUrl} />{" "}
        {letter.imported && <Tag>{copy.imported}</Tag>}
      </Fact>
      <Fact label={copy.detail.subject}>{letter.subject}</Fact>
      <Fact label={copy.columns.consent}>{letter.contactConsent ? copy.consent.yes : copy.consent.no}</Fact>
    </>
  );
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
    return <Link href={`/staff/politicians/blocked-emails?q=${encodeURIComponent(value)}`}>{value}</Link>;
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
 * Each change of a letter's status, newest first: the status and its time
 * on a line, with a {} button at its right that opens what it recorded as
 * recorded, as the audit log has; under them every field, a line each, in
 * words.
 */
function History({ events }: { events: LetterEvent[] }) {
  if (events.length === 0) return <p className={styles.none}>{copy.detail.noHistory}</p>;
  return (
    <ol className={`${styles.history} ${styles.events}`} aria-label={copy.detail.historyTitle}>
      {events.map((event, i) => (
        <li key={i}>
          <p className={styles.eventHead}>
            <strong>{statusOf(event.status)}</strong>
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

/**
 * A letter's page, a supporter's or PauseAI's: its title, then a card of
 * who it's from and to, what it was and how it stands, with, for a
 * supporter's, its copy in the policy@ group; beside it, what happened to
 * it; then `children`, for PauseAI's its thread, with GmailLink. A supporter's goes back to the letters list,
 * PauseAI's to its mailing.
 */
export default function LetterDetails({ letter, children }: { letter: Details; children?: ReactNode }) {
  const back =
    letter.kind === "supporter"
      ? { href: "/staff/letters", label: staffCopy.nav.letters }
      : { href: `/staff/mailings/${letter.mailingId}`, label: letter.mailing };
  return (
    <>
      <Breadcrumb href={back.href}>{back.label}</Breadcrumb>
      <h1>{letterTitle(letter)}</h1>
      <Grid>
        <Card span={3}>
          <dl className={styles.facts}>
            <Sender letter={letter} />
            <Fact label={copy.columns.to}>
              <Link href={`/staff/politicians/${letter.politicianId}`}>{letter.mpName}</Link>
            </Fact>
            <Fact label={copy.columns.status}>{statusOf(letter.status)}</Fact>
            <Fact label={copy.columns.created}>{staffTime(letter.createdAt)}</Fact>
            <Fact label={copy.detail.sent}>{letter.sentAt && staffTime(letter.sentAt)}</Fact>
            <Fact label={copy.columns.replied}>
              {letter.kind === "supporter" && letter.repliedAt && staffTime(letter.repliedAt)}
            </Fact>
          </dl>
          {letter.kind === "supporter" && <GroupLink letter={letter} />}
        </Card>
        <Card span={3} look="log" title={copy.detail.historyTitle} id="letter-history">
          <History events={letter.events} />
        </Card>
      </Grid>
      {children}
    </>
  );
}
