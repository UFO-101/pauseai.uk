import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Select, TextInput } from "@/components/ui/Controls";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import Tag, { type TagTone } from "@/components/ui/Tag";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import { POLITICIAN_FIELDS } from "@/lib/mailing-fields";
import type { Ask } from "@/lib/server/asks";
import type { MailingState, WrittenMailing } from "@/lib/server/mailing-drafts";
import type { Mailing, MailingRecipient } from "@/lib/server/mailings";
import { filtersPath, pageParam } from "@/lib/staff-search";
import { londonDayHour, londonWhen, staffDate, staffTime } from "@/lib/staff-time";
import { StopMailing } from "./MailingButtons";
import { MailingLetter } from "./MailingLetter";
import { MailingCounts } from "./MailingParts";
import Grid, { Card } from "./ui/Grid";
import ListFrame, { type ListColumn } from "./ui/ListFrame";
import Strip from "./ui/Strip";
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
  const conditions: Record<string, string> = {};
  for (const ask of asks) {
    for (const [status, words] of Object.entries(staffCopy.statuses)) {
      conditions[`${ask.slug}:${status}`] = staffCopy.mailingEditor.answered(words, ask.title);
    }
  }
  return {
    fields: Object.fromEntries(POLITICIAN_FIELDS.map((f) => [f, staffCopy.mailingEditor.fields[f]])),
    conditions,
  };
}

/** A recipient's columns: who, what happened to their letter, when, whether they replied, and their answer to its ask. */
function recipientColumns(mailing: Mailing): ListColumn<MailingRecipient>[] {
  return [
    {
      key: "name",
      label: staffCopy.mailings.recipientColumns.name,
      cell: (r) => <Link href={`/staff/politicians/${r.politicianId}`}>{r.name}</Link>,
    },
    {
      key: "status",
      label: staffCopy.mailings.recipientColumns.status,
      cell: (r) =>
        r.skipReason ? (
          <span className={styles.skipped}>{copy.skipReasons[r.skipReason]}</span>
        ) : (
          (staffCopy.letters.status[r.status] ?? r.status)
        ),
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

/** Change the time: a button that opens a small form of the day and hour, in London. */
function ChangeTime({ mailing, action }: { mailing: WrittenMailing; action: FormAction }) {
  const { day, hour } = londonDayHour(mailing.dueAt!);
  return (
    <>
      <Button variant="ghost" size="small" fit popoverTarget="change-time">
        {copy.changeTime}
      </Button>
      <form id="change-time" popover="auto" action={action} className={styles.popover}>
        <input type="hidden" name="id" value={mailing.id} />
        <Field label={copy.day}>
          <TextInput type="date" name="day" defaultValue={day} required />
        </Field>
        <Field label={copy.hour}>
          <Select name="hour" defaultValue={hour}>
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {`${String(h).padStart(2, "0")}:00`}
              </option>
            ))}
          </Select>
        </Field>
        <SubmitButton variant="primary" size="small" fit>
          {copy.saveTime}
        </SubmitButton>
      </form>
    </>
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
  written: WrittenMailing;
  stop: FormAction;
  reschedule: FormAction;
}) {
  if (written.state === "scheduled") {
    return (
      <>
        <Strip
          action={
            <div className={styles.actions}>
              <ChangeTime mailing={written} action={reschedule} />
              <StopMailing id={written.id} label={copy.stopScheduled} action={stop} />
            </div>
          }
        >
          <strong>{copy.sends(londonWhen(written.dueAt!))}</strong>
          <br />
          {copy.scheduledLine(mailing.to, written.fromName!)}
        </Strip>
        <p>
          <Muted>{copy.stopNote}</Muted>
        </p>
      </>
    );
  }
  if (written.state === "sending") {
    return (
      <Strip action={<StopMailing id={written.id} label={copy.stopSending} action={stop} />}>
        <strong>{copy.sending(mailing.sent, mailing.to)}</strong>
        <progress className={styles.progress} max={mailing.to} value={mailing.sent} aria-label={copy.sentLabel} />
      </Strip>
    );
  }
  return (
    <p>
      {copy.sentLine(staffTime(mailing.sentAt ?? written.dueAt!), written.fromName!)}
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
 * A mailing written here, once scheduled: its title and state; when it
 * sends, with Change the time and Stop, or how far it's got, with Stop, or
 * when and from whom it went; a coloured count each of sent, replied,
 * bounced, skipped and answered its ask; then its recipients, in tabs for
 * all, replied, bounced and skipped, beside the email and who it was for.
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
  written: WrittenMailing;
  /** Who it was for, as pills (FilterPills). */
  who: ReactNode;
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
    <>
      <div className={styles.heading}>
        <h1>{mailing.title}</h1>
        <Tag tone={STATE_TONES[written.state]}>{copy.states[written.state]}</Tag>
      </div>
      <Standing mailing={mailing} written={written} stop={stop} reschedule={reschedule} />
      {written.state !== "scheduled" && <MailingCounts mailing={mailing} />}
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
        <Card span={2} look="aside" title={copy.emailTitle} id="email-title">
          <p>
            <Muted>{[written.subject, ...written.attachments.map((file) => file.filename)].join(" · ")}</Muted>
          </p>
          <MailingLetter doc={written.body} {...letterLabels(asks)} />
          <h3 className={styles.subheading}>{copy.whoTitle}</h3>
          {who}
        </Card>
      </Grid>
    </>
  );
}
