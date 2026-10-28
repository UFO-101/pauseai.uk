import Link from "next/link";
import type { ReactNode } from "react";
import Tag from "@/components/ui/Tag";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Mailing, MailingRecipient } from "@/lib/server/mailings";
import { pagePath } from "@/lib/staff-search";
import { staffDate, staffTime } from "@/lib/staff-time";
import styles from "./Details.module.css";
import tableStyles from "./MailingsTable.module.css";
import Grid, { Card } from "./ui/Grid";
import ListFrame, { type ListColumn } from "./ui/ListFrame";

const copy = staffCopy.mailings;

/** One line of the box: its label and value. */
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

/** A mailing's recipients' columns: who, what happened to their copy, when, whether they replied, and how it was written. */
const recipientColumns: ListColumn<MailingRecipient>[] = [
  {
    key: "name",
    label: copy.recipientColumns.name,
    cell: (r) => <Link href={`/staff/politicians/${r.politicianId}`}>{r.name}</Link>,
  },
  { key: "status", label: copy.recipientColumns.status, cell: (r) => staffCopy.letters.status[r.status] ?? r.status },
  {
    key: "sentAt",
    label: copy.recipientColumns.sentAt,
    short: true,
    className: tableStyles.when,
    cell: (r) => (r.sentAt ? staffDate(r.sentAt) : <Muted>–</Muted>),
  },
  {
    key: "repliedAt",
    label: copy.recipientColumns.replied,
    short: true,
    className: tableStyles.when,
    cell: (r) => (r.repliedAt ? staffDate(r.repliedAt) : <Muted>–</Muted>),
  },
  {
    key: "how",
    label: copy.recipientColumns.how,
    cell: (r) => (r.personalised ? copy.personalised : <Muted>{copy.asWritten}</Muted>),
  },
];

/**
 * A mailing's page: its title, then a card of what it was (the ask it
 * makes, linked to the politicians who answered, who sent it and when, its
 * subject and attachments) beside a card of the email itself; then its
 * recipients, a hundred a page, each linked to their page, with what happened to their copy, when,
 * whether they replied, and how it was written. One copied from Airtable
 * has no text, sender or attachments, and says so.
 */
export default function MailingDetails({ mailing }: { mailing: Mailing }) {
  const notRecorded = <Muted>{copy.notRecorded}</Muted>;
  return (
    <>
      <h1>{mailing.title}</h1>
      <p>
        <Muted>{copy.counts(mailing.sent, mailing.replied)}</Muted>
      </p>
      <Grid>
        <Card span={3} as="div">
          <dl className={styles.facts}>
            <Fact label={copy.fields.ask}>
              {mailing.ask ? (
                <Link href={`/staff/politicians?ask=${mailing.ask}`}>{mailing.askTitle}</Link>
              ) : (
                <Muted>{copy.noAsk}</Muted>
              )}
            </Fact>
            <Fact label={copy.fields.sender}>{notRecorded}</Fact>
            <Fact label={copy.fields.sentAt}>
              {mailing.sentAt ? staffTime(mailing.sentAt) : <Muted>{copy.notSent}</Muted>}
            </Fact>
            <Fact label={copy.fields.subject}>{notRecorded}</Fact>
            <Fact label={copy.fields.attachments}>{notRecorded}</Fact>
            {mailing.imported && (
              <Fact label={copy.fields.source}>
                <Tag>{copy.imported}</Tag>
              </Fact>
            )}
          </dl>
        </Card>
        <Card span={3} look="aside" title={copy.textTitle} id="text-title">
          <p>{copy.noText}</p>
        </Card>
        <Card span={6} look="log" title={copy.recipientsTitle} id="recipients-title">
          <ListFrame
            count={copy.recipientsCount(mailing.recipientsTotal)}
            total={mailing.recipientsTotal}
            page={mailing.page}
            pages={mailing.pages}
            pageSize={mailing.pageSize}
            href={(n) => pagePath(`/staff/mailings/${mailing.id}`, n)}
            columns={recipientColumns}
            rows={mailing.recipients}
            rowKey={(r) => r.letterId}
            empty={copy.noRecipients}
          />
        </Card>
      </Grid>
    </>
  );
}
