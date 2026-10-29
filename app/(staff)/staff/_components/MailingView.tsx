import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui/Button";
import Tag, { type TagTone } from "@/components/ui/Tag";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import { answerLabels, POLITICIAN_FIELDS } from "@/lib/mailing-fields";
import type { Ask } from "@/lib/server/asks";
import type { MailingState, WrittenMailing } from "@/lib/server/mailing-drafts";
import type { Mailing, MailingRecipient } from "@/lib/server/mailings";
import { filtersPath, pageParam } from "@/lib/staff-search";
import { londonWhen, staffDate, staffTime } from "@/lib/staff-time";
import { ChangeTimeForm } from "./DueTime";
import { StopMailing } from "./MailingButtons";
import MailingFiles from "./MailingFiles";
import { MailingLetter } from "./MailingLetter";
import { MailingCounts } from "./MailingParts";
import Grid, { Card } from "./ui/Grid";
import ListFrame, { type ListColumn } from "./ui/ListFrame";
import Strip from "./ui/Strip";
import Menu from "./ui/Menu";
import Tabs from "./ui/Tabs";
import styles from "./MailingView.module.css";

const copy = staffCopy.mailingPages;

type FormAction = (form: FormData) => void | Promise<void>;

const STATE_TONES: Record<MailingState, TagTone | undefined> = {
  draft: undefined,
  scheduled: "blue",
  sending: "amber",
  sent: "green",
  cancelled: "red",
};

/** Each merge field's label, and each answer to an ask's, as a part only for them says it. */
function letterLabels(asks: Ask[]): { fields: Record<string, string>; conditions: Record<string, string> } {
  return {
    fields: Object.fromEntries(POLITICIAN_FIELDS.map((f) => [f, staffCopy.mailingEditor.fields[f]])),
    conditions: answerLabels(asks),
  };
}

/**
 * A recipient's columns, as every list's go (docs/style-guide.md): what
 * happened to their letter, leading to its page; who; when it was sent
 * and replied to, beside the status they date; then how it was written
 * and their answer to its ask.
 */
function recipientColumns(mailing: Mailing): ListColumn<MailingRecipient>[] {
  return [
    {
      key: "status",
      label: staffCopy.mailings.recipientColumns.status,
      cell: (r) => (
        <Link href={`/staff/mailings/${mailing.id}/letters/${r.letterId}`}>
          {r.skipReason ? (
            <span className={styles.skipped}>{copy.skipReasons[r.skipReason]}</span>
          ) : (
            (staffCopy.letters.status[r.status] ?? r.status)
          )}
        </Link>
      ),
    },
    {
      key: "name",
      label: staffCopy.mailings.recipientColumns.name,
      cell: (r) => <Link href={`/staff/politicians/${r.politicianId}`}>{r.name}</Link>,
    },
    {
      key: "sentAt",
      label: staffCopy.mailings.recipientColumns.sentAt,
      short: true,
      cell: (r) => (r.sentAt ? staffDate(r.sentAt) : <Muted>–</Muted>),
    },
    {
      key: "repliedAt",
      label: staffCopy.mailings.recipientColumns.replied,
      short: true,
      cell: (r) => (r.repliedAt ? staffDate(r.repliedAt) : <Muted>–</Muted>),
    },
    // Airtable kept how each was written.
    ...(mailing.imported
      ? [
          {
            key: "how",
            label: staffCopy.mailings.recipientColumns.how,
            cell: (r: MailingRecipient) =>
              r.personalised ? staffCopy.mailings.personalised : <Muted>{staffCopy.mailings.asWritten}</Muted>,
          },
        ]
      : []),
    ...(mailing.ask
      ? [
          {
            key: "answer",
            label: mailing.askTitle!,
            cell: (r: MailingRecipient) => (r.answer ? staffCopy.statuses[r.answer] : <Muted>–</Muted>),
          },
        ]
      : []),
  ];
}

/** Change the time: a button with a small form of the day and hour, in London, hung from it. */
function ChangeTime({ mailing, action }: { mailing: WrittenMailing; action: FormAction }) {
  return (
    <Menu id="change-time" trigger={buttonClass({ variant: "ghost", fit: true })} label={copy.changeTime}>
      <ChangeTimeForm id={mailing.id} dueAt={mailing.dueAt!} action={action} className={styles.changeTime} />
    </Menu>
  );
}

/** Where a mailing stands: when it sends, with Change the time and Stop; how far it's got; or when it went. */
function Standing({
  mailing,
  written,
  stop,
  reschedule,
}: {
  mailing: Mailing;
  written?: WrittenMailing;
  stop: FormAction;
  reschedule: FormAction;
}) {
  if (written?.state === "scheduled") {
    return (
      <>
        <Strip
          action={
            <div className={styles.actions}>
              <ChangeTime mailing={written} action={reschedule} />
              <StopMailing id={written.id} label={copy.unschedule} action={stop} full />
            </div>
          }
        >
          <strong>{copy.sends(londonWhen(written.dueAt!))}</strong>
          <span>{copy.scheduledLine(mailing.to, written.fromName || written.sentFrom!)}</span>
        </Strip>
      </>
    );
  }
  if (written?.state === "sending") {
    return (
      <Strip
        action={
          <div className={styles.actions}>
            <StopMailing id={written.id} label={copy.stopSending} action={stop} full />
          </div>
        }
      >
        <strong>{copy.sending(mailing.sent, mailing.to)}</strong>
        <progress className={styles.progress} max={mailing.to} value={mailing.sent} aria-label={copy.sentLabel} />
      </Strip>
    );
  }
  return (
    <p>
      {written
        ? copy.sentLine(staffTime(mailing.sentAt ?? written.dueAt!), written.fromName || written.sentFrom!)
        : mailing.sentAt
          ? copy.importedLine(staffTime(mailing.sentAt))
          : staffCopy.mailings.notSent}
      {mailing.ask && (
        <>
          {" · "}
          <Link href={`/staff/politicians?ask=${mailing.ask}`}>{mailing.askTitle}</Link>
        </>
      )}
    </p>
  );
}

/**
 * A mailing's page, once scheduled: its title and state; when it sends,
 * with Change the time and Unschedule, or how far it's got, with Stop
 * sending, or when and from whom it went; a coloured count each of sent,
 * replied, bounced, skipped and answered its ask; then its recipients, in
 * tabs for all, replied, bounced and skipped, beside who it was for and the
 * email. One imported from Airtable, with no `written`, has only what
 * Airtable kept: who got it and how it was written, but no text or filter.
 */
export default function MailingView({
  mailing,
  written,
  who,
  asks,
  stop,
  reschedule,
}: {
  mailing: Mailing;
  written?: WrittenMailing;
  /** Who it was for, as pills (FilterPills). */
  who?: ReactNode;
  asks: Ask[];
  stop: FormAction;
  reschedule: FormAction;
}) {
  const path = `/staff/mailings/${mailing.id}`;
  const counts = { all: mailing.to, replied: mailing.replied, bounced: mailing.bounced, skipped: mailing.skipped };
  const tabs = (Object.keys(counts) as (keyof typeof counts)[]).map((key) => ({
    key,
    label: copy.tab(copy.tabs[key], counts[key]),
    href: filtersPath(path, { tab: key === "all" ? "" : key }),
  }));
  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <h1>{mailing.title}</h1>
        {written ? (
          <Tag tone={STATE_TONES[written.state]}>{copy.states[written.state]}</Tag>
        ) : (
          <Tag>{staffCopy.mailings.imported}</Tag>
        )}
      </div>
      <Standing mailing={mailing} written={written} stop={stop} reschedule={reschedule} />
      {written?.state !== "scheduled" && <MailingCounts mailing={mailing} />}
      <Grid>
        <Card span={4} as="div">
          <Tabs label={copy.tabsLabel} tabs={tabs} current={mailing.tab} />
          <ListFrame
            count={staffCopy.mailings.recipientsCount(mailing.recipientsTotal)}
            total={mailing.recipientsTotal}
            page={mailing.page}
            pages={mailing.pages}
            pageSize={mailing.pageSize}
            href={(n) => filtersPath(path, { tab: mailing.tab === "all" ? "" : mailing.tab, ...pageParam(n) })}
            columns={recipientColumns(mailing)}
            rows={mailing.recipients}
            rowKey={(r) => r.letterId}
            empty={staffCopy.mailings.noRecipients}
          />
        </Card>
        {written ? (
          <Card span={2} look="aside" title={copy.whoTitle(written.state === "sent")} id="who-title">
            {who}
            <h3 className={styles.subheading}>{copy.emailTitle}</h3>
            <div className={styles.email}>
              <dl className={styles.headers}>
                <dt>{copy.from}</dt>
                <dd>{written.fromName ? `${written.fromName} <${written.sentFrom}>` : written.sentFrom}</dd>
                <dt>{copy.to}</dt>
                <dd>
                  <Muted>{copy.toEach}</Muted>
                </dd>
                <dt>{copy.subject}</dt>
                <dd>
                  <strong>{written.subject}</strong>
                </dd>
              </dl>
              <div className={styles.body}>
                <MailingLetter doc={written.body} {...letterLabels(asks)} />
                {written.attachments.length > 0 && (
                  <MailingFiles files={written.attachments} base={`/staff/mailings/${written.id}/files`} />
                )}
              </div>
            </div>
          </Card>
        ) : (
          <Card span={2} look="aside" title={copy.emailTitle} id="email-title">
            <p>{staffCopy.mailings.noText}</p>
          </Card>
        )}
      </Grid>
    </div>
  );
}
