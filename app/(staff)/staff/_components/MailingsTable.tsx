import Link from "next/link";
import Table from "@/components/ui/Table";
import Tag from "@/components/ui/Tag";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import type { MailingSummary } from "@/lib/server/mailings";
import { staffDate } from "@/lib/staff-time";
import styles from "./MailingsTable.module.css";

const copy = staffCopy.mailings;

/** A count, or a faint dash for none. */
function Count({ n }: { n: number }) {
  return <td className={styles.count}>{n || <Muted>–</Muted>}</td>;
}

/**
 * Every mailing, a row each: its title, linked to its page, and the ask it
 * makes, linked to the politicians who answered it; who sent it and when;
 * how many it went to, skipped, bounced and got a reply from. One copied
 * from Airtable says so where its sender would be.
 */
export default function MailingsTable({ mailings }: { mailings: MailingSummary[] }) {
  if (mailings.length === 0) return <p>{copy.none}</p>;
  return (
    <Table>
      <thead>
        <tr>
          <th>{copy.columns.title}</th>
          <th>{copy.columns.ask}</th>
          <th>{copy.columns.sender}</th>
          <th>{copy.columns.sentAt}</th>
          <th>{copy.columns.sent}</th>
          <th>{copy.columns.skipped}</th>
          <th>{copy.columns.bounced}</th>
          <th>{copy.columns.replied}</th>
        </tr>
      </thead>
      <tbody>
        {mailings.map((m) => (
          <tr key={m.id}>
            <td>
              <Link href={`/staff/mailings/${m.id}`}>{m.title}</Link>
            </td>
            <td>{m.ask ? <Link href={`/staff/politicians?ask=${m.ask}`}>{m.askTitle}</Link> : <Muted>–</Muted>}</td>
            <td>{m.imported ? <Tag>{copy.imported}</Tag> : <Muted>{copy.notRecorded}</Muted>}</td>
            <td className={styles.when}>{m.sentAt ? staffDate(m.sentAt) : <Muted>{copy.notSent}</Muted>}</td>
            <Count n={m.sent} />
            <Count n={m.skipped} />
            <Count n={m.bounced} />
            <Count n={m.replied} />
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
