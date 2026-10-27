import Link from "next/link";
import type { ReactNode } from "react";
import Table from "@/components/ui/Table";
import Tag from "@/components/ui/Tag";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Mailing } from "@/lib/server/mailings";
import { staffDate, staffTime } from "@/lib/staff-time";
import styles from "./Details.module.css";
import tableStyles from "./MailingsTable.module.css";
import Grid, { Card } from "./ui/Grid";

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

/**
 * A mailing's page: its title, then a card of what it was (the ask it
 * makes, linked to the politicians who answered, who sent it and when, its
 * subject and attachments) beside a card of the email itself; then every
 * recipient, linked to their page, with what happened to their copy, when,
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
          <Table>
            <thead>
              <tr>
                <th>{copy.recipientColumns.name}</th>
                <th>{copy.recipientColumns.status}</th>
                <th>{copy.recipientColumns.sentAt}</th>
                <th>{copy.recipientColumns.replied}</th>
                <th>{copy.recipientColumns.how}</th>
              </tr>
            </thead>
            <tbody>
              {mailing.recipients.map((r) => (
                <tr key={r.letterId}>
                  <td>
                    <Link href={`/staff/politicians/${r.politicianId}`}>{r.name}</Link>
                  </td>
                  <td>{staffCopy.letters.status[r.status] ?? r.status}</td>
                  <td className={tableStyles.when}>{r.sentAt ? staffDate(r.sentAt) : <Muted>–</Muted>}</td>
                  <td className={tableStyles.when}>{r.repliedAt ? staffDate(r.repliedAt) : <Muted>–</Muted>}</td>
                  <td>{r.personalised ? copy.personalised : <Muted>{copy.asWritten}</Muted>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </Grid>
    </>
  );
}
