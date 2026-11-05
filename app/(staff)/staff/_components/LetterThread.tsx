import type { ReactNode } from "react";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import type { LetterThread as Thread } from "@/lib/server/letter-threads";
import type { SupporterLetterDetails } from "@/lib/server/letters";
import { named } from "@/lib/named-address";
import LetterChanges, { FoldedAutoReply } from "./LetterChanges";
import ThreadEmail from "./ThreadEmail";
import { MailingLetter } from "./MailingLetter";
import StaffLink from "./ui/StaffLink";
import Strip from "./ui/Strip";
import styles from "./LetterThread.module.css";

const copy = staffCopy.letterThread;

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
      <ThreadEmail
        from={ours}
        to={politician}
        at={thread.sentAt}
        subject={thread.subject || thread.mailingTitle}
        missing={!kept}
      >
        {thread.letter ? (
          <>
            {thread.approximate && (
              <div className={styles.approximate}>
                <Strip tone="amber">{copy.approximate}</Strip>
              </div>
            )}
            <MailingLetter doc={thread.letter} />
          </>
        ) : (
          <NoText note={copy.noText} link={link} />
        )}
      </ThreadEmail>
      {thread.messages.map((message) => (
        <ThreadEmail
          key={message.id}
          from={named(message.fromName, message.fromAddress)}
          to={message.fromUs ? politician : ours}
          cc={message.cc}
          at={message.at}
          subject={message.subject}
        >
          {message.text === null ? <Muted>{copy.unreadable}</Muted> : <div className={styles.text}>{message.text}</div>}
        </ThreadEmail>
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
 * message both ways, oldest first, an automatic reply folded
 * (FoldedAutoReply). For another, whose text the site doesn't have, a
 * note saying so, with `link` in its place.
 */
export function SupporterLetterThread({ letter, link }: { letter: SupporterLetterDetails; link?: ReactNode }) {
  const sender = named(letter.senderName, letter.senderEmail);
  const mp = named(letter.mpName, letter.mpEmail);
  const { sent } = letter;
  const from =
    letter.supporterId === null ? (
      sender
    ) : (
      <StaffLink href={`/staff/supporters/${letter.supporterId}`}>{sender}</StaffLink>
    );
  const email = { from, to: mp, at: letter.sentAt, subject: letter.subject || letter.campaignTitle };
  return (
    <Thread link={sent && link}>
      {sent ? (
        <LetterChanges {...email} sent={sent.text} draft={sent.draft} />
      ) : (
        <ThreadEmail {...email} missing>
          <NoText note={copy.supporterNoText} link={link} />
        </ThreadEmail>
      )}
      {sent?.messages.map((message) => {
        const email = {
          from: named(message.fromName, message.fromAddress),
          to: message.fromSupporter ? mp : sender,
          cc: message.cc,
          at: message.at,
          subject: message.subject,
        };
        // An automatic reply folded to its first paragraph.
        return message.auto && message.text !== null ? (
          <FoldedAutoReply key={message.id} {...email} text={message.text} />
        ) : (
          <ThreadEmail key={message.id} {...email}>
            {message.text === null ? (
              <Muted>{copy.unreadable}</Muted>
            ) : (
              <div className={styles.text}>{message.text}</div>
            )}
          </ThreadEmail>
        );
      })}
    </Thread>
  );
}
