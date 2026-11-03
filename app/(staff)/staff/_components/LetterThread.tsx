import type { ReactNode } from "react";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import type { LetterThread as Thread } from "@/lib/server/letter-threads";
import type { SupporterLetterDetails } from "@/lib/server/letters";
import { named } from "@/lib/named-address";
import { staffTime } from "@/lib/staff-time";
import LetterChanges from "./LetterChanges";
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
  missing = false,
  children,
}: {
  from: ReactNode;
  to: string;
  at: string | null;
  subject: string;
  /** Its text isn't kept, so its body is a slot with a note in it (NoText), not words of the letter. */
  missing?: boolean;
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
      <div className={missing ? `${styles.body} ${styles.missing}` : styles.body}>{children}</div>
    </article>
  );
}

/** In place of a letter's text that isn't kept: a short note saying why, and `link`, the way to it in Gmail. */
function NoText({ note, link }: { note: string; link: ReactNode }) {
  return (
    <div className={styles.noText}>
      <p>{note}</p>
      {link}
    </div>
  );
}

/** The thread's section: its heading, `link`, if any, at its right, over its messages. */
function Thread({ link, children }: { link?: ReactNode; children: ReactNode }) {
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
 * each message as an email: the letter as it went, from the Gmail it went
 * from, with `link`, the way to it in Gmail, at the right of the heading;
 * or, for an imported one, whose text isn't kept, a note saying so with
 * `link` beside it, in its place. Then each reply and answer, oldest first.
 */
export default function LetterThread({ thread, link }: { thread: Thread; link?: ReactNode }) {
  const politician = named(thread.to.name, thread.to.email);
  const ours = thread.sentFrom ? named(thread.fromName, thread.sentFrom) : staffCopy.letters.fromPauseai;
  const kept = thread.letter !== null;
  return (
    <Thread link={kept && link}>
      <Email
        from={ours}
        to={politician}
        at={thread.sentAt}
        subject={thread.subject || thread.mailingTitle}
        missing={!kept}
      >
        {thread.letter ? <MailingLetter doc={thread.letter} /> : <NoText note={copy.noText} link={link} />}
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
 * A supporter's letter as an email, in a thread as PauseAI's are: from
 * them, leading to their supporter page once they're linked to one, to
 * their MP, when it went, with its subject. One from the letters inbox
 * shows its text against the draft it was written from (LetterChanges),
 * with `link`, the way to it there, at the right of the heading, then each
 * message both ways, oldest first. For another, whose text the site
 * doesn't keep, a note saying so, with `link` in its place.
 */
export function SupporterLetterThread({ letter, link }: { letter: SupporterLetterDetails; link?: ReactNode }) {
  const sender = named(letter.senderName, letter.senderEmail);
  const mp = named(letter.mpName, letter.mpEmail);
  const { sent } = letter;
  return (
    <Thread link={sent && link}>
      <Email
        from={
          letter.supporterId === null ? (
            sender
          ) : (
            <StaffLink href={`/staff/supporters/${letter.supporterId}`}>{sender}</StaffLink>
          )
        }
        to={mp}
        at={letter.sentAt}
        subject={letter.subject || letter.campaignTitle}
        missing={!sent}
      >
        {sent ? (
          <LetterChanges sent={sent.text} draft={sent.draft} />
        ) : (
          <NoText note={copy.supporterNoText} link={link} />
        )}
      </Email>
      {sent?.messages.map((message) => (
        <Email
          key={message.id}
          from={named(message.fromName, message.fromAddress)}
          to={message.fromSupporter ? mp : sender}
          at={message.at}
          subject={message.subject}
        >
          {message.text === null ? <Muted>{copy.unreadable}</Muted> : <div className={styles.text}>{message.text}</div>}
        </Email>
      ))}
    </Thread>
  );
}
