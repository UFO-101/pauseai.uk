import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import { gmailThreadUrl } from "@/lib/gmail-connect";
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
      <p>
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
 * the Gmail it went from, with Open in Gmail for `me` if it's theirs; the
 * letter as it went, or a note that an imported one's text isn't kept;
 * then each reply and answer, oldest first.
 */
export default function LetterThread({ thread, me }: { thread: Thread; me: string }) {
  const inGmail = thread.gmailThreadId && thread.sentFrom === me;
  return (
    <section aria-labelledby="letter-thread">
      <h2 id="letter-thread">{copy.title}</h2>
      {thread.sentFrom && (
        <p>
          {/* With no name of its own, it went in the Gmail account's. */}
          <span>{copy.sentFrom(thread.fromName ? `${thread.fromName} <${thread.sentFrom}>` : thread.sentFrom)}</span>
          {inGmail && (
            <>
              {" · "}
              <a href={gmailThreadUrl(me, thread.gmailThreadId!)} target="_blank" rel="noreferrer">
                {copy.openInGmail}
              </a>
            </>
          )}
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
      {thread.messages.length === 0 && <Muted>{copy.noReplies}</Muted>}
    </section>
  );
}
