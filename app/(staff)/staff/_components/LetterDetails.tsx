import Link from "next/link";
import type { ReactNode } from "react";
import { staffCopy } from "@/lib/content/staff-interface";
import { gmailSearchUrl, googleGroupUrl } from "@/lib/letter-links";
import type { LetterDetails as Details, LetterEvent } from "@/lib/server/letters";
import { staffTime } from "@/lib/staff-time";
import Tag from "@/components/ui/Tag";
import { Muted } from "@/components/ui/Text";
import Breadcrumb from "./Breadcrumb";
import CampaignName from "./CampaignName";
import { DotParts, LoggedJson } from "./Logged";
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

/** Where to read the letter as it was sent: a supporter's in the policy@ group, PauseAI's by a Gmail search. */
function InGoogle({ letter }: { letter: Details }) {
  if (letter.kind === "supporter") {
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
  const at = letter.sentAt ?? letter.createdAt;
  return (
    letter.mpEmail && (
      <p className={styles.source}>
        <a href={gmailSearchUrl(letter.mpEmail, at)} target="_blank" rel="noreferrer">
          {copy.detail.gmail}
        </a>
      </p>
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
        <CampaignName slug={letter.campaign} /> {letter.imported && <Tag>{copy.imported}</Tag>}
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

/**
 * One field a change recorded, in words: Postmark's kind of bounce; the
 * address, leading to it among the blocked emails; anything else by its
 * name, in bold, then its value, one with no name in the copy as recorded.
 */
function EventField({ name, value }: { name: string; value: unknown }) {
  if (name === "type" && typeof value === "string") return <>{postmarkWords(value)}</>;
  const shown =
    name === "email" && typeof value === "string" ? (
      <Link href={`/staff/politicians/blocked-emails?q=${encodeURIComponent(value)}`}>{value}</Link>
    ) : typeof value === "string" ? (
      value
    ) : (
      JSON.stringify(value)
    );
  return (
    <>
      <strong>{copy.detail.fields[name] ?? name}</strong> {shown}
    </>
  );
}

/** What a change recorded, as the parts of its line: each field, but Postmark's kind when the status already says it. */
function eventParts(event: LetterEvent): ReactNode[] {
  return Object.entries(event.details)
    .filter(([name, value]) => !(name === "type" && SAID_BY_STATUS[event.status] === value))
    .map(([name, value]) => <EventField key={name} name={name} value={value} />);
}

/**
 * Each change of a letter's status, newest first: its time, the status and
 * every field it recorded, in words, and a {} button that opens them as
 * recorded, as the audit log has.
 */
function History({ events }: { events: LetterEvent[] }) {
  if (events.length === 0) return <p className={styles.none}>{copy.detail.noHistory}</p>;
  return (
    <ol className={`${styles.history} ${styles.events}`} aria-label={copy.detail.historyTitle}>
      {events.map((event, i) => (
        <li key={i}>
          <span className={styles.when}>{staffTime(event.at)}</span>
          <span>
            <DotParts>{[statusOf(event.status), ...eventParts(event)]}</DotParts>
          </span>
          <span>
            {Object.keys(event.details).length > 0 && <LoggedJson id={`event-${i}`} details={event.details} />}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * A letter's page, a supporter's or PauseAI's: its title, then a card of
 * who it's from and to, what it was and how it stands, with the way to
 * read it in Google; beside it, what happened to it. A supporter's goes
 * back to the letters list, PauseAI's to its mailing.
 */
export default function LetterDetails({ letter }: { letter: Details }) {
  const back =
    letter.kind === "supporter"
      ? { href: "/staff/letters", label: staffCopy.nav.letters }
      : { href: `/staff/mailings/${letter.mailingId}`, label: letter.mailing };
  return (
    <>
      <Breadcrumb href={back.href}>{back.label}</Breadcrumb>
      <h1>{letterTitle(letter)}</h1>
      <Grid>
        <Card span={4}>
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
          <InGoogle letter={letter} />
        </Card>
        <Card span={2} look="log" title={copy.detail.historyTitle} id="letter-history">
          <History events={letter.events} />
        </Card>
      </Grid>
    </>
  );
}
