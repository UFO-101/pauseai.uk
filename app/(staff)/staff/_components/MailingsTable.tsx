import Link from "next/link";
import Tag from "@/components/ui/Tag";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import type { MailingSummary } from "@/lib/server/mailings";
import { staffDate } from "@/lib/staff-time";
import ListFrame, { type ListColumn } from "./ui/ListFrame";
import styles from "./MailingsTable.module.css";

const copy = staffCopy.mailings;

/** A count, or a faint dash for none. */
function count(key: "sent" | "skipped" | "bounced" | "replied" | "answered"): ListColumn<MailingSummary> {
  return {
    key,
    label: copy.columns[key],
    short: true,
    className: styles.count,
    text: (m) => m[key],
    cell: (m) => m[key] || <Muted>–</Muted>,
  };
}

/**
 * The mailings' columns: its title, linked to its page, and the ask it
 * makes, linked to the politicians who answered it; who sent it and when;
 * how many it went to, skipped, bounced, got a reply from and had its ask
 * answered by. One copied from Airtable says so where its sender would be.
 */
export const mailingColumns: ListColumn<MailingSummary>[] = [
  {
    key: "title",
    label: copy.columns.title,
    text: (m) => m.title,
    cell: (m) => <Link href={`/staff/mailings/${m.id}`}>{m.title}</Link>,
  },
  {
    key: "ask",
    label: copy.columns.ask,
    text: (m) => m.askTitle,
    cell: (m) => (m.ask ? <Link href={`/staff/politicians?ask=${m.ask}`}>{m.askTitle}</Link> : <Muted>–</Muted>),
  },
  {
    key: "sender",
    label: copy.columns.sender,
    text: (m) => (m.imported ? copy.imported : m.fromName),
    cell: (m) => (m.imported ? <Tag>{copy.imported}</Tag> : (m.fromName ?? <Muted>{copy.notRecorded}</Muted>)),
  },
  {
    key: "sentAt",
    label: copy.columns.sentAt,
    short: true,
    text: (m) => m.sentAt,
    cell: (m) => (m.sentAt ? staffDate(m.sentAt) : <Muted>{copy.notSent}</Muted>),
  },
  count("sent"),
  count("skipped"),
  count("bounced"),
  count("replied"),
  count("answered"),
];

/** Every mailing, in the list frame: how many, their downloads, and a row each. */
export default function MailingsTable({ mailings }: { mailings: MailingSummary[] }) {
  return (
    <ListFrame
      count={copy.total(mailings.length)}
      total={mailings.length}
      page={1}
      pages={1}
      pageSize={mailings.length}
      download={(format) => `/staff/mailings/download?format=${format}`}
      columns={mailingColumns}
      rows={mailings}
      rowKey={(m) => m.id}
      empty={copy.none}
    />
  );
}
