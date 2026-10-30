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
import { mailingCounts } from "./MailingsOverview";
import Band, { BandFact } from "./ui/Band";
import Counts from "./ui/Counts";
import Grid, { Card } from "./ui/Grid";
import Progress from "./ui/Progress";
import ListFrame, { type ListColumn } from "./ui/ListFrame";
import Strip from "./ui/Strip";
import Menu from "./ui/Menu";
import styles from "./MailingView.module.css";

const copy = staffCopy.mailingPages;

type FormAction = (form: FormData) => void | Promise<void>;

/** A mailing's state, as its tag says it: blue while it's going out, grey once it has or never will. */
const STATE_TONES: Record<MailingState, TagTone | undefined> = {
  draft: undefined,
  scheduled: "blue",
  sending: "blue",
  sent: undefined,
  cancelled: undefined,
};

/** Each merge field's label, and each answer to an ask's, as a part only for them says it. */
function letterLabels(asks: Ask[]): { fields: Record<string, string>; conditions: Record<string, string> } {
  return {
    fields: Object.fromEntries(POLITICIAN_FIELDS.map((f) => [f, staffCopy.mailingEditor.fields[f]])),
    conditions: answerLabels(asks),
  };
}

/**
 * How a recipient's letter went, as a tag: answered its ask, in green; bounced, in red; else grey, as
 * skipped, with why, replied, or its status.
 */
function Outcome({ mailing, recipient }: { mailing: Mailing; recipient: MailingRecipient }) {
  if (mailing.ask && recipient.answer) return <Tag tone="green">{staffCopy.mailings.columns.answered}</Tag>;
  if (recipient.status === "bounced" || recipient.status === "spam_complaint") {
    return <Tag tone="red">{staffCopy.letters.status[recipient.status]}</Tag>;
  }
  if (recipient.skipReason) return <Tag>{copy.skipReasons[recipient.skipReason]}</Tag>;
  if (recipient.repliedAt) return <Tag>{copy.tabs.replied}</Tag>;
  return <Tag>{staffCopy.letters.status[recipient.status] ?? recipient.status}</Tag>;
}

/**
 * A recipient's columns: who, with their seat and party, how it was
 * written for one from Airtable, and their answer to the ask; then how it
 * went, when, and the way to their letter's page, with its reply.
 */
function recipientColumns(mailing: Mailing): ListColumn<MailingRecipient>[] {
  return [
    {
      key: "name",
      label: staffCopy.mailings.recipientColumns.name,
      cell: (r) => (
        <span className={styles.who}>
          <Link href={`/staff/politicians/${r.politicianId}`}>{r.name}</Link>
          <Muted>
            {[r.constituency, r.party, mailing.imported && r.personalised && staffCopy.mailings.personalised]
              .filter(Boolean)
              .join(" · ")}
          </Muted>
          {mailing.ask && r.answer && <span className={styles.answer}>✓ {staffCopy.statuses[r.answer]}</span>}
        </span>
      ),
    },
    {
      key: "status",
      label: staffCopy.mailings.recipientColumns.status,
      short: true,
      cell: (r) => (
        <span className={styles.who}>
          <Outcome mailing={mailing} recipient={r} />
          <Muted>{staffDate(r.repliedAt ?? r.sentAt ?? mailing.updatedAt)}</Muted>
          {!r.skipReason && (
            <Link href={`/staff/mailings/${mailing.id}/letters/${r.letterId}`}>
              {r.repliedAt ? copy.letterAndReply : copy.theLetter}
            </Link>
          )}
        </span>
      ),
    },
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

/**
 * Where a mailing stands, under its band: when one scheduled sends, with
 * Change the time and Unschedule; how far one sending has got, with Stop
 * sending; once sent, how many of everyone it went to have answered its ask.
 * Nothing for one with no ask.
 */
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
    );
  }
  if (written?.state === "sending") {
    return (
      <Grid>
        <Card span={6} as="div">
          <div className={styles.standing}>
            <div className={styles.bar}>
              <Progress value={mailing.sent + mailing.skipped} max={mailing.to} tone="blue" label={copy.sentLabel} big>
                {copy.sendingBar(mailing.sent, mailing.to)}
              </Progress>
            </div>
            <div className={styles.actions}>
              <StopMailing id={written.id} label={copy.stopSending} action={stop} full />
            </div>
          </div>
        </Card>
      </Grid>
    );
  }
  if (!mailing.ask) return null;
  // Out of everyone it went to: someone whose letter bounced may have answered some other way.
  return (
    <Grid>
      <Card span={6} as="div">
        <Progress value={mailing.answered} max={mailing.to} tone="green" label={copy.counts.answered} big>
          {copy.answeredBar(mailing.answered, mailing.to)}
        </Progress>
      </Card>
    </Grid>
  );
}

/** When it went, or goes, and who sent it, as the band's first fact says it. */
function When({ mailing, written }: { mailing: Mailing; written?: WrittenMailing }) {
  const by = written?.createdBy && copy.by(written.createdBy);
  if (written?.state === "scheduled") {
    return (
      <BandFact label={copy.states.scheduled} detail={by}>
        {londonWhen(written.dueAt!)}
      </BandFact>
    );
  }
  if (written?.state === "sending") {
    return (
      <BandFact label={copy.started} detail={by}>
        {staffTime(written.dueAt!)}
      </BandFact>
    );
  }
  return (
    <BandFact label={staffCopy.mailings.fields.sentAt} detail={by}>
      {mailing.sentAt ? staffTime(mailing.sentAt) : staffCopy.mailings.notSent}
    </BandFact>
  );
}

/**
 * A mailing's page, once scheduled: a band of its title, when it went and
 * who sent it, who from, its ask and who it was for, with its counts, each
 * leading to those recipients; where it stands (Standing); then the email,
 * beside its recipients, of all of them or those a count chose. One
 * imported from Airtable, with no `written`, has only what Airtable kept:
 * who got it and how it was written, but no text or filter.
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
  const tabHref = (key: string) => filtersPath(path, { tab: key === "sent" ? "" : key });
  const counts = mailingCounts(mailing).map((count) => ({
    ...count,
    href: count.n === null ? undefined : tabHref(count.key),
    current: count.key === mailing.tab,
  }));
  const state = written?.state;
  // A mailing with a bar under its band says how it stands there, not in a tag.
  const barred = state === "sending" || (state !== "scheduled" && mailing.ask);
  return (
    <div className={styles.page}>
      <Band
        title={mailing.title}
        tag={
          barred ? undefined : written ? (
            <Tag tone={STATE_TONES[written.state]}>{copy.states[written.state]}</Tag>
          ) : (
            <Tag>{staffCopy.mailings.imported}</Tag>
          )
        }
        aside={state !== "scheduled" && <Counts counts={counts} />}
      >
        <When mailing={mailing} written={written} />
        <BandFact label={copy.from} detail={written?.fromName}>
          {written ? written.sentFrom : staffCopy.mailings.imported}
        </BandFact>
        <BandFact label={staffCopy.mailings.fields.ask}>
          {mailing.ask && <Link href={`/staff/politicians?ask=${mailing.ask}`}>{mailing.askTitle}</Link>}
        </BandFact>
        <BandFact label={copy.whoLabel} detail={who && staffCopy.mailings.recipientsCount(mailing.to)}>
          {who ?? staffCopy.mailings.recipientsCount(mailing.to)}
        </BandFact>
      </Band>
      <Standing mailing={mailing} written={written} stop={stop} reschedule={reschedule} />
      <Grid>
        {written ? (
          <Card span={3} title={copy.emailTitle} id="email-title">
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
          <Card span={3} look="aside" title={copy.emailTitle} id="email-title">
            <p>{staffCopy.mailings.noText}</p>
          </Card>
        )}
        <Card span={3} as="div">
          <div className={styles.recipientsHead}>
            <h2>{mailing.tab === "all" ? staffCopy.mailings.recipientsTitle : copy.tabs[mailing.tab]}</h2>
            {mailing.tab !== "all" && <Link href={path}>{copy.showEveryone}</Link>}
          </div>
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
      </Grid>
    </div>
  );
}
