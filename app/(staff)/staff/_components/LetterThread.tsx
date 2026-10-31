import type { ReactNode } from "react";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import type { LetterThread as Thread } from "@/lib/server/letter-threads";
import type { SupporterLetterDetails } from "@/lib/server/letters";
import { named } from "@/lib/named-address";
import { staffTime } from "@/lib/staff-time";
import { MailingLetter } from "./MailingLetter";
import StaffLink from "./ui/StaffLink";
import styles from "./LetterThread.module.css";

const copy = staffCopy.letterThread;

/** One message of the thread as an email shows it: who it's from and to, when, and its subject, over its text. */
function Email({
  from,
  to,
  at,
  subject,
  children,
}: {
  from: ReactNode;
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

/** The thread's section: its heading, `link` at its right, over its messages. */
function Thread({ link, children }: { link: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby="letter-thread" className={styles.thread}>
      <div className={styles.heading}>
        <h2 id="letter-thread">{copy.title}</h2>
        {link}
      </div>
      {children}
    </section>
  );
}

/**
 * One of PauseAI's letters' thread, beside its page's ask and history,
 * `link` at the right of its heading, each message as an email: the letter as it went, from the Gmail it went
 * from, or a note that an imported one's text isn't kept; then each reply
 * and answer, oldest first.
 */
export default function LetterThread({ thread, link }: { thread: Thread; link?: ReactNode }) {
  const politician = named(thread.to.name, thread.to.email);
  const ours = thread.sentFrom ? named(thread.fromName, thread.sentFrom) : staffCopy.letters.fromPauseai;
  return (
    <Thread link={link}>
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
    </Thread>
  );
}

/**
 * A supporter's letter as an email, in a thread as PauseAI's are, `link`
 * at the right of its heading: from them, leading to their supporter page
 * once they're linked to one, to their MP, when it went, with its subject;
 * in place of its text, which the site doesn't keep, nor the replies, a
 * note that they're in the policy inbox.
 */
export function SupporterLetterThread({ letter, link }: { letter: SupporterLetterDetails; link?: ReactNode }) {
  const sender = named(letter.senderName, letter.senderEmail);
  return (
    <Thread link={link}>
      <Email
        from={
          letter.supporterId === null ? (
            sender
          ) : (
            <StaffLink href={`/staff/supporters/${letter.supporterId}`}>{sender}</StaffLink>
          )
        }
        to={named(letter.mpName, letter.mpEmail)}
        at={letter.sentAt}
        subject={letter.subject || letter.campaignTitle}
      >
        <Muted>{copy.supporterNoText}</Muted>
      </Email>
    </Thread>
  );
}
