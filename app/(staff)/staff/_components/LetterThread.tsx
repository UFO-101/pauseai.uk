import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import type { LetterThread as Thread, ThreadMessage } from "@/lib/server/letter-threads";
import { staffTime } from "@/lib/staff-time";
import { MailingLetter } from "./MailingLetter";
import Grid, { Card } from "./ui/Grid";
import styles from "./LetterThread.module.css";

const copy = staffCopy.letterThread;

/** A later message in the thread: who wrote it and when, its subject, and its text. */
function Message({ message }: { message: ThreadMessage }) {
  return (
    <Card span={6} title={message.fromUs ? copy.ourAnswer : message.fromName || message.fromAddress}>
      <p className={styles.from}>
        <strong>{message.subject}</strong>
        <br />
        <Muted>
          {`${message.fromName} <${message.fromAddress}>`} · {staffTime(message.at)}
        </Muted>
      </p>
      {message.text === null ? <Muted>{copy.unreadable}</Muted> : <div className={styles.text}>{message.text}</div>}
    </Card>
  );
}

/**
 * One of PauseAI's letters' thread, below its page's facts and history:
 * the Gmail it went from; the letter as it went, or a note that an imported one's text isn't kept;
 * then each reply and answer, oldest first.
 */
export default function LetterThread({ thread }: { thread: Thread }) {
  return (
    <section aria-labelledby="letter-thread">
      <h2 id="letter-thread">{copy.title}</h2>
      {thread.sentFrom && (
        <p>
          {/* With no name of its own, it went in the Gmail account's. */}
          <span>{copy.sentFrom(thread.fromName ? `${thread.fromName} <${thread.sentFrom}>` : thread.sentFrom)}</span>
        </p>
      )}
      <Grid>
        <Card span={6} title={thread.subject || thread.mailingTitle}>
          {thread.letter ? <MailingLetter doc={thread.letter} /> : <Muted>{copy.noText}</Muted>}
        </Card>
        {thread.messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
      </Grid>
      {thread.messages.length === 0 && (
        <p>
          <Muted>{copy.noReplies}</Muted>
        </p>
      )}
    </section>
  );
}
