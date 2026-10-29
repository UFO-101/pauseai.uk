import type { ReactNode } from "react";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import type { LetterThread as Thread } from "@/lib/server/letter-threads";
import { staffTime } from "@/lib/staff-time";
import { MailingLetter } from "./MailingLetter";
import styles from "./LetterThread.module.css";

const copy = staffCopy.letterThread;

/** Someone as an email names them: their name and address, or their address alone. */
const named = (name: string | null, address: string | null) =>
  name && address ? `${name} <${address}>` : (address ?? name ?? "");

/** One message of the thread as an email shows it: who it's from and to, when, and its subject, over its text. */
function Email({
  from,
  to,
  at,
  subject,
  children,
}: {
  from: string;
  to: string;
  at: string | null;
  subject: string;
  children: ReactNode;
}) {
  return (
    <article className={styles.email} aria-label={subject}>
      <dl className={styles.headers}>
        <dt>{copy.headers.from}</dt>
        <dd>{from}</dd>
        <dt>{copy.headers.to}</dt>
        <dd>{to}</dd>
        {at && (
          <>
            <dt>{copy.headers.date}</dt>
            <dd>{staffTime(at)}</dd>
          </>
        )}
        <dt>{copy.headers.subject}</dt>
        <dd>
          <strong>{subject}</strong>
        </dd>
      </dl>
      <div className={styles.body}>{children}</div>
    </article>
  );
}

/**
 * One of PauseAI's letters' thread, below its page's facts and history,
 * `link` at the right of its heading, each message as an email: the letter as it went, from the Gmail it went
 * from, or a note that an imported one's text isn't kept; then each reply
 * and answer, oldest first.
 */
export default function LetterThread({ thread, link }: { thread: Thread; link?: ReactNode }) {
  const politician = named(thread.to.name, thread.to.email);
  const ours = thread.sentFrom ? named(thread.fromName, thread.sentFrom) : staffCopy.letters.fromPauseai;
  return (
    <section aria-labelledby="letter-thread" className={styles.thread}>
      <div className={styles.heading}>
        <h2 id="letter-thread">{copy.title}</h2>
        {link}
      </div>
      <Email from={ours} to={politician} at={thread.sentAt} subject={thread.subject || thread.mailingTitle}>
        {thread.letter ? <MailingLetter doc={thread.letter} /> : <Muted>{copy.noText}</Muted>}
      </Email>
      {thread.messages.map((message) => (
        <Email
          key={message.id}
          from={named(message.fromName, message.fromAddress)}
          to={message.fromUs ? politician : ours}
          at={message.at}
          subject={message.subject}
        >
          {message.text === null ? <Muted>{copy.unreadable}</Muted> : <div className={styles.text}>{message.text}</div>}
        </Email>
      ))}
      {thread.messages.length === 0 && (
        <p>
          <Muted>{copy.noReplies}</Muted>
        </p>
      )}
    </section>
  );
}
