import type { ReactNode } from "react";
import Tag, { type TagTone } from "@/components/ui/Tag";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import { toText } from "@/lib/letter-format";
import { letterFor } from "@/lib/mailing-doc";
import type { WrittenMessage } from "@/lib/server/message-drafts";
import type { MessagePageData, MessageRecipient, MessageSummary } from "@/lib/server/message-pages";
import { filtersPath, pageParam } from "@/lib/staff-search";
import { londonClock, londonWhen, sendsAt, staffDate } from "@/lib/staff-time";
import {
  FIELDS_AS_WORDS,
  FIELD_WORDS,
  hasField,
  MEMBER_CONDITION,
  textStopsAt,
  VOLUNTEER_CONDITION,
  type MessageChannel,
} from "@/lib/supporter-messages";
import ChannelIcon from "./ChannelIcon";
import MailingFiles from "./MailingFiles";
import { MailingLetter } from "./MailingLetter";
import { MailingStanding, MailingWhen } from "./MailingView";
import TextBubble from "./TextBubble";
import Band, { BandFact } from "./ui/Band";
import Counts, { type Count } from "./ui/Counts";
import Grid, { Card } from "./ui/Grid";
import ListFrame, { type ListColumn } from "./ui/ListFrame";
import StaffLink from "./ui/StaffLink";
import Strip from "./ui/Strip";
import view from "./MailingView.module.css";
import styles from "./Messages.module.css";

const copy = staffCopy.messagePages;

type FormAction = (form: FormData) => void | Promise<void>;

/** A message's channel, as an icon and its name. */
export function MessageChannelName({ channel }: { channel: MessageChannel }) {
  return (
    <span className={styles.channel}>
      <ChannelIcon channel={channel === "email" ? "email" : "phone"} />
      {copy.channels[channel]}
    </span>
  );
}

/**
 * How a message went, in the order it happens: what arrived, what didn't,
 * what never went as it was stopped, then what came back; read only for a
 * text, as an email's isn't reported.
 */
export function messageCounts(message: MessageSummary): Count[] {
  return [
    { key: "delivered", n: message.delivered, label: copy.counts.delivered },
    { key: "failed", n: message.failed, label: copy.counts.failed, tone: "red" },
    { key: "stopped", n: message.stopped, label: copy.counts.stopped },
    ...(message.channel === "text" ? [{ key: "read", n: message.read, label: copy.counts.read }] : []),
    { key: "replied", n: message.replied, label: copy.counts.replied },
  ];
}

/** How a copy went, in words and its tone: skipped with why, or its status, or read. */
export function copyStatus(
  copyOf: Pick<MessageRecipient, "status" | "skipReason" | "read">,
  channel: MessageChannel,
): { words: string; tone?: TagTone } {
  const { skipReason, status, read } = copyOf;
  if (skipReason === "unsubscribed") return { words: copy.skipReasons.unsubscribed[channel], tone: "red" };
  if (skipReason) return { words: copy.skipReasons[skipReason as "blocked"], tone: "red" };
  if (read) return { words: copy.statuses.read, tone: "green" };
  return { words: copy.statuses[status], tone: status === "failed" ? "red" : undefined };
}

/** A recipient's columns: who, and where they are; then how it went, when, and the way to their copy's page. */
function recipientColumns(message: MessageSummary): ListColumn<MessageRecipient>[] {
  return [
    {
      key: "who",
      label: copy.columns.who,
      cell: (r) => (
        <span className={styles.stack}>
          {r.supporterId ? (
            <StaffLink href={`/staff/supporters/${r.supporterId}`}>{r.name ?? staffCopy.supporters.noName}</StaffLink>
          ) : (
            copy.erased
          )}
          {r.place && <Muted>{r.place}</Muted>}
        </span>
      ),
    },
    {
      key: "status",
      label: copy.columns.status,
      short: true,
      cell: (r) => {
        const { words, tone } = copyStatus(r, message.channel);
        return (
          <span className={styles.stack}>
            <Tag tone={tone}>{words}</Tag>
            {r.sentAt && <Muted>{staffDate(r.sentAt)}</Muted>}
            {!r.skipReason && r.status !== "cancelled" && (
              <StaffLink href={`/staff/messages/${message.id}/${r.copyId}`}>{copy.messageAndReply}</StaffLink>
            )}
          </span>
        );
      },
    },
  ];
}

/** The email as a mail app shows it, or the text as a bubble, with its fields as words. */
function MessageWords({ written }: { written: WrittenMessage }) {
  if (written.channel === "text") {
    return (
      <Card span={3} look="aside" title={copy.textTitle} id="words-title">
        <TextBubble
          from={written.fromName!}
          text={toText(letterFor(written.body, FIELDS_AS_WORDS))}
          time={londonClock(sendsAt(written.dueAt!))}
        />
      </Card>
    );
  }
  const conditions = {
    [hasField("localGroup")]: copy.conditions.localGroup.label,
    [hasField("mp")]: copy.conditions.mp.label,
    [VOLUNTEER_CONDITION]: copy.conditions.volunteer.label,
    [MEMBER_CONDITION]: copy.conditions.member.label,
  };
  return (
    <Card span={3} look="aside" title={copy.emailTitle} id="words-title">
      <div className={view.email}>
        <dl className={view.headers}>
          <dt>{copy.headers.from}</dt>
          <dd>{written.fromName ? `${written.fromName} <${written.sentFrom}>` : written.sentFrom}</dd>
          <dt>{copy.headers.to}</dt>
          <dd>
            <Muted>{staffCopy.mailingPages.toEach}</Muted>
          </dd>
          <dt>{copy.subject}</dt>
          <dd>
            <strong>{written.subject}</strong>
          </dd>
        </dl>
        <div className={view.body}>
          <MailingLetter doc={written.body} fields={FIELD_WORDS} conditions={conditions} />
          {written.attachments.length > 0 && (
            <MailingFiles files={written.attachments} base={`/staff/messages/${written.id}/files`} />
          )}
        </div>
      </div>
    </Card>
  );
}

/**
 * A message's page, once scheduled: a band of its title, when it went and
 * who sent it, who from, and who it was for, with its counts, each leading to
 * those recipients; where it stands, and while WhatsApp hasn't approved its
 * words, that; then the email or text beside its recipients.
 */
export default function MessageView({
  data,
  who,
  stop,
  reschedule,
}: {
  data: Extract<MessagePageData, { kind: "written" }>;
  /** Who it was for, as pills (MessageWho). */
  who: ReactNode;
  stop: FormAction;
  reschedule: FormAction;
}) {
  const { written, summary, tab } = data;
  const path = `/staff/messages/${written.id}`;
  const scheduled = written.state === "scheduled";
  const counts = messageCounts(summary).map((count) => {
    const current = count.key === tab;
    return {
      ...count,
      href: filtersPath(path, { tab: current ? "" : count.key }),
      current,
      title: current ? staffCopy.mailingPages.showEveryone : undefined,
    };
  });
  const when = scheduled ? londonWhen(written.dueAt!, "short") : "";
  return (
    <div className={view.page}>
      <Band
        title={written.title || copy.untitled}
        tag={
          written.state === "sending" ? undefined : (
            <Tag tone={scheduled ? "blue" : undefined}>{staffCopy.mailingPages.states[written.state]}</Tag>
          )
        }
        aside={!scheduled && <Counts counts={counts} />}
      >
        <MailingWhen mailing={summary} written={written} />
        <BandFact label={copy.facts.from} detail={`${written.fromName}, ${copy.byBackend[written.channel]}`}>
          {written.sentFrom}
        </BandFact>
        <BandFact label={copy.facts.who} detail={copy.supportersCount(summary.to)}>
          {who}
        </BandFact>
      </Band>
      {summary.waiting && <Strip tone="amber">{copy.waitingStrip}</Strip>}
      <MailingStanding
        mailing={summary}
        written={written}
        stop={stop}
        reschedule={reschedule}
        sends={summary.waiting ? copy.sendsOnceApproved(when) : undefined}
        line={copy.scheduledLine(summary.to, written.channel, written.fromName || written.sentFrom!)}
        note={
          written.channel === "text" &&
          scheduled && <Muted>{copy.stopsOn(londonWhen(textStopsAt(written.dueAt!), "short"))}</Muted>
        }
      />
      <Grid>
        <MessageWords written={written} />
        <Card span={3} as="div">
          <div className={view.recipientsHead}>
            <h2>{tab === "all" ? copy.recipientsTitle : copy.tabs[tab]}</h2>
            {tab !== "all" && <StaffLink href={path}>{staffCopy.mailingPages.showEveryone}</StaffLink>}
          </div>
          <ListFrame
            count={copy.recipientsCount(data.recipientsTotal)}
            total={data.recipientsTotal}
            page={data.page}
            pages={data.pages}
            pageSize={data.pageSize}
            href={(n) => filtersPath(path, { tab: tab === "all" ? "" : tab, ...pageParam(n) })}
            columns={recipientColumns(summary)}
            rows={data.recipients}
            rowKey={(r) => r.copyId}
            empty={copy.noRecipients}
          />
        </Card>
      </Grid>
    </div>
  );
}
