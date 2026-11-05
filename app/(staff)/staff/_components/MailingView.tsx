import StaffLink from "./ui/StaffLink";
import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui/Button";
import Tag, { type TagTone } from "@/components/ui/Tag";
import { Muted } from "@/components/ui/Text";
import { askHref } from "@/lib/asks";
import { checkMailingDoc } from "@/lib/mailing-doc";
import { staffCopy } from "@/lib/content/staff-interface";
import { answerLabels, POLITICIAN_FIELDS } from "@/lib/mailing-fields";
import type { Ask } from "@/lib/server/asks";
import type { MailingState, WrittenMailing } from "@/lib/server/mailing-drafts";
import type { Mailing, MailingRecipient } from "@/lib/server/mailings";
import { filtersPath, pageParam } from "@/lib/staff-search";
import { londonWhen, staffDate, staffTime } from "@/lib/staff-time";
import { ChangeTimeForm } from "./DueTime";
import { StopMailing } from "./MailingButtons";
import MailEmail from "./MailEmail";
import MailingFiles from "./MailingFiles";
import { MailingLetter } from "./MailingLetter";
import { mailingCounts } from "./MailingsOverview";
import Band, { BandFact } from "./ui/Band";
import Counts from "./ui/Counts";
import Grid, { Card } from "./ui/Grid";
import Progress from "./ui/Progress";
import Strip from "./ui/Strip";
import ListFrame, { type ListColumn } from "./ui/ListFrame";
import Bubble from "./ui/Bubble";
import AnswerWord from "./AnswerWord";
import styles from "./MailingView.module.css";
import TestTag from "./TestTag";

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
 * How a recipient's letter went, as a tag: failed, in red, skipped with
 * why, refused, or bounced, or a spam complaint, though they answered its
 * ask some other way; answered its ask, in green; else grey, as replied,
 * or its status.
 */
function Outcome({ mailing, recipient }: { mailing: Mailing; recipient: MailingRecipient }) {
  if (recipient.skipReason) return <Tag tone="red">{copy.skipReasons[recipient.skipReason]}</Tag>;
  if (["not_sent", "bounced", "spam_complaint"].includes(recipient.status)) {
    return <Tag tone="red">{staffCopy.letters.status[recipient.status]}</Tag>;
  }
  if (mailing.ask && recipient.answer) return <Tag tone="green">{staffCopy.mailings.columns.answered}</Tag>;
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
          <span>
            <StaffLink href={`/staff/politicians/${r.politicianId}`}>{r.name}</StaffLink>
            <TestTag isTest={r.isTest} />
          </span>
          <Muted>
            {[r.constituency, r.party, mailing.imported && r.personalised && staffCopy.mailings.personalised]
              .filter(Boolean)
              .join(" · ")}
          </Muted>
          {mailing.ask && r.answer && (
            <span className={styles.answer}>
              <AnswerWord status={r.answer} />
            </span>
          )}
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
            <StaffLink href={`/staff/mailings/${mailing.id}/letters/${r.letterId}`}>
              {r.repliedAt ? copy.letterAndReplies(Math.max(r.replies, 1)) : copy.theLetter}
            </StaffLink>
          )}
        </span>
      ),
    },
  ];
}

/** Change the time: a button with a small form of the day and hour, in London, in a bubble under it. */
function ChangeTime({ mailing, action }: { mailing: WrittenMailing; action: FormAction }) {
  return (
    <Bubble id="change-time" trigger={buttonClass({ variant: "ghost", fit: true })} label={copy.changeTime}>
      <ChangeTimeForm id={mailing.id} dueAt={mailing.dueAt!} action={action} className={styles.changeTime} />
    </Bubble>
  );
}

/**
 * Where a mailing stands, under its band, each in the same white card:
 * when one scheduled sends, large and blue, as it's going out, with Change
 * the time and Unschedule; how far one sending has got, with Stop
 * sending; once sent, how many of everyone it went to have answered its ask.
 * Nothing for one with no ask.
 */
export function MailingStanding({
  mailing,
  written,
  stop,
  reschedule,
  sends,
  line,
  note,
}: {
  mailing: Pick<Mailing, "ask" | "to" | "sent" | "failed" | "answered">;
  written?: WrittenMailing;
  stop: FormAction;
  reschedule: FormAction;
  /** When one scheduled sends, and how many from whom, when a message says them its own way. */
  sends?: string;
  line?: string;
  /** Quietly under those, such as when a text stops sending. */
  note?: ReactNode;
}) {
  if (written?.state === "scheduled") {
    return (
      <Grid>
        <Card span={6} as="div">
          <div className={styles.standing}>
            <div className={styles.due}>
              <strong>{sends ?? copy.sends(londonWhen(written.dueAt!, "short"))}</strong>
              <span>{line ?? copy.scheduledLine(mailing.to, written.fromName || written.sentFrom!)}</span>
              {note}
            </div>
            <div className={styles.actions}>
              <ChangeTime mailing={written} action={reschedule} />
              <StopMailing id={written.id} label={copy.unschedule} action={stop} full />
            </div>
          </div>
        </Card>
      </Grid>
    );
  }
  if (written?.state === "sending") {
    return (
      <Grid>
        <Card span={6} as="div">
          <div className={styles.standing}>
            <div className={styles.bar}>
              <Progress value={mailing.sent + mailing.failed} max={mailing.to} tone="blue" label={copy.sentLabel} big>
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
export function MailingWhen({
  mailing,
  written,
}: {
  mailing: Pick<Mailing, "sentAt">;
  written?: Pick<WrittenMailing, "createdBy" | "state" | "dueAt">;
}) {
  const by = written?.createdBy && copy.by(written.createdBy);
  if (written?.state === "scheduled") {
    return (
      <BandFact label={copy.states.scheduled} detail={by}>
        {londonWhen(written.dueAt!, "short")}
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
      {mailing.sentAt ? staffDate(mailing.sentAt) : staffCopy.mailings.notSent}
    </BandFact>
  );
}

/**
 * The text of a mailing from before the site could send: the template the
 * import rebuilt, with its fields as chips, and said so if it's only
 * approximate; or that there's none.
 */
function ImportedText({ mailing }: { mailing: Mailing }) {
  const doc = checkMailingDoc(mailing.importedText);
  if (!doc) return <p>{staffCopy.mailings.noText}</p>;
  return (
    <MailEmail
      from={mailing.sentFrom ?? mailing.fromName ?? staffCopy.mailings.notRecorded}
      subject={mailing.importedSubject}
    >
      {mailing.importedTextApproximate && <Strip tone="amber">{staffCopy.letterThread.approximate}</Strip>}
      <MailingLetter doc={doc} fields={staffCopy.mailings.importedFields} conditions={{}} />
    </MailEmail>
  );
}

/**
 * A mailing's page, once scheduled: a band of its title, who from, who it was
 * for, its ask, and when it went and who sent it, with its counts, each
 * leading to those recipients; where it stands (MailingStanding); then the email,
 * white on an aside, as a mail app shows it, beside its recipients, of all of them or those a count chose. One
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
  // Each count shows those it counts; pressed again, it shows everyone.
  const counts = mailingCounts(mailing).map((count) => {
    const current = count.key === mailing.tab;
    return {
      ...count,
      href: filtersPath(path, { tab: current ? "" : count.key }),
      current,
      title: current ? copy.showEveryone : undefined,
    };
  });
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
        <BandFact label={copy.from} detail={written?.fromName}>
          {written
            ? written.sentFrom
            : (mailing.sentFrom ??
              mailing.fromName ??
              (mailing.oldLetters ? staffCopy.mailings.notRecorded : staffCopy.mailings.imported))}
        </BandFact>
        <BandFact label={copy.to} detail={who && staffCopy.campaigns.politicians(mailing.to)}>
          {who ?? staffCopy.campaigns.politicians(mailing.to)}
        </BandFact>
        <BandFact label={mailing.askKind ? staffCopy.asks.askTo[mailing.askKind] : staffCopy.mailings.fields.ask}>
          {mailing.ask && <StaffLink href={askHref(mailing.ask)}>{mailing.askTitle}</StaffLink>}
        </BandFact>
        <MailingWhen mailing={mailing} written={written} />
      </Band>
      <MailingStanding mailing={mailing} written={written} stop={stop} reschedule={reschedule} />
      <Grid>
        {written ? (
          <Card span={3} look="aside" title={copy.emailTitle} id="email-title">
            <MailEmail
              from={written.fromName ? `${written.fromName} <${written.sentFrom}>` : written.sentFrom}
              to={<Muted>{copy.toEach}</Muted>}
              subject={written.subject}
            >
              <MailingLetter doc={written.body} {...letterLabels(asks)} />
              {written.attachments.length > 0 && (
                <MailingFiles files={written.attachments} base={`/staff/mailings/${written.id}/files`} />
              )}
            </MailEmail>
          </Card>
        ) : (
          <Card span={3} look="aside" title={copy.emailTitle} id="email-title">
            <ImportedText mailing={mailing} />
          </Card>
        )}
        <Card span={3} as="div">
          <div className={styles.recipientsHead}>
            <h2>{mailing.tab === "all" ? staffCopy.mailings.recipientsTitle : copy.tabs[mailing.tab]}</h2>
            {mailing.tab !== "all" && <StaffLink href={path}>{copy.showEveryone}</StaffLink>}
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
