import Link from "next/link";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import { gmailThreadUrl } from "@/lib/gmail-connect";
import type { LetterThread as Thread, ThreadMessage } from "@/lib/server/letter-threads";
import { staffTime } from "@/lib/staff-time";
import { MailingLetter } from "./MailingLetter";
import Grid, { Card } from "./ui/Grid";
import Strip from "./ui/Strip";
import styles from "./LetterThread.module.css";

const copy = staffCopy.letterThread;

/** A later message in the thread: who wrote it and when, its subject, and its text. */
function Message({ message }: { message: ThreadMessage }) {
  return (
    <Card span={6} title={message.fromUs ? copy.ourAnswer : message.fromName || message.fromAddress}>
      <p>
        <Muted>
          {`${message.fromName} <${message.fromAddress}>`} · {staffTime(message.at)}
        </Muted>
      </p>
      <p>
        <strong>{message.subject}</strong>
      </p>
      {message.text === null ? <Muted>{copy.unreadable}</Muted> : <div className={styles.text}>{message.text}</div>}
    </Card>
  );
}

/**
 * One of PauseAI's letters and its thread: to whom, from whom and when it
 * went, and its status; Open in Gmail, for `me` if the letter went from
 * their Gmail; the letter as it went, or a note that an imported one's text
 * isn't kept; then what else happened to it, and each reply and answer in
 * the thread, oldest first.
 */
export default function LetterThread({ thread, me }: { thread: Thread; me: string }) {
  const inGmail = thread.gmailThreadId && thread.sentFrom === me;
  return (
    <>
      <h1>{copy.title(thread.politician.name)}</h1>
      <dl className={styles.facts}>
        <dt>{copy.to}</dt>
        <dd>
          <Link href={`/staff/politicians/${thread.politician.id}`}>{thread.politician.name}</Link>
          {thread.politician.email && <Muted>{` <${thread.politician.email}>`}</Muted>}
        </dd>
        {thread.sentFrom && (
          <>
            <dt>{copy.from}</dt>
            <dd>{`${thread.fromName} <${thread.sentFrom}>`}</dd>
          </>
        )}
        <dt>{copy.sent}</dt>
        <dd>{thread.sentAt ? staffTime(thread.sentAt) : <Muted>{copy.notSent}</Muted>}</dd>
        <dt>{copy.status}</dt>
        <dd>{staffCopy.letters.status[thread.status] ?? thread.status}</dd>
      </dl>
      {inGmail && (
        <p>
          <a href={gmailThreadUrl(me, thread.gmailThreadId!)} target="_blank" rel="noreferrer">
            {copy.openInGmail}
          </a>
        </p>
      )}
      {thread.events.map((event) => (
        <Strip key={`${event.status}-${event.at}`} tone={event.status === "auto_reply" ? "plain" : "amber"}>
          {`${copy.events[event.status]} · ${staffTime(event.at)}`}
        </Strip>
      ))}
      <Grid>
        <Card span={6} title={thread.subject || thread.mailingTitle}>
          {thread.letter ? <MailingLetter doc={thread.letter} /> : <Muted>{copy.noText}</Muted>}
        </Card>
        {thread.messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
      </Grid>
      {thread.messages.length === 0 && <Muted>{copy.noReplies}</Muted>}
    </>
  );
}
