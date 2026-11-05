import Tag from "@/components/ui/Tag";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import type { SupporterMessageRow } from "@/lib/server/message-pages";
import { staffDate } from "@/lib/staff-time";
import { MessageChannelName, copyStatus } from "./MessageView";
import { ListTable, type ListColumn } from "./ui/ListFrame";
import StaffLink from "./ui/StaffLink";
import details from "./Details.module.css";
import styles from "./Messages.module.css";

const copy = staffCopy.messagePages;

const COLUMNS: ListColumn<SupporterMessageRow>[] = [
  {
    key: "message",
    label: copy.supporterColumns.message,
    cell: (m) => (
      <span className={styles.stack}>
        <StaffLink href={`/staff/messages/${m.messageId}/${m.copyId}`}>{m.title || copy.untitled}</StaffLink>
        <Muted>
          <MessageChannelName channel={m.channel} />
          {m.sentAt && staffDate(m.sentAt)}
        </Muted>
      </span>
    ),
  },
  {
    key: "status",
    label: copy.supporterColumns.status,
    short: true,
    cell: (m) => {
      const { words, tone } = copyStatus(m, m.channel);
      return <Tag tone={tone}>{words}</Tag>;
    },
  },
  {
    key: "replies",
    label: copy.supporterColumns.replies,
    cell: (m) => (
      <ul className={styles.replies}>
        {m.replies.map((reply) => (
          <li key={reply.at}>
            {reply.body} <Muted>{staffDate(reply.at)}</Muted>
          </li>
        ))}
      </ul>
    ),
  },
];

/** The messages a supporter was sent, newest first, with their replies, each leading to its page. */
export default function SupporterMessages({ messages }: { messages: SupporterMessageRow[] }) {
  return (
    <section aria-labelledby="messages">
      <h2 id="messages">{copy.supporterTitle}</h2>
      {messages.length ? (
        <ListTable columns={COLUMNS} rows={messages} rowKey={(m) => m.copyId} />
      ) : (
        <p className={details.none}>{copy.supporterNone}</p>
      )}
    </section>
  );
}
