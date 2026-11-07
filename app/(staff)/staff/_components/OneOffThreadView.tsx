import { Fragment } from "react";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import { mailboxes, named } from "@/lib/email-parsing/addresses";
import type { OneOffThread } from "@/lib/server/one-off-emails";
import { MessageText } from "./LetterThread";
import ThreadEmail from "./ThreadEmail";
import StaffLink from "./ui/StaffLink";
import Withheld from "./ui/Withheld";
import styles from "./LetterThread.module.css";

const copy = staffCopy.oneOff;

type Politicians = Record<string, number>;

/** Someone on an email, the name linked to their page if they're a politician. */
function Mailbox({ name, address, politicians }: { name: string; address: string; politicians: Politicians }) {
  const politician = politicians[address];
  if (politician === undefined) return named(name, address);
  return (
    <>
      <StaffLink href={`/staff/politicians/${politician}`}>{name || address}</StaffLink>
      {name && ` <${address}>`}
    </>
  );
}

/** Everyone on a To or Cc line. */
function Mailboxes({ line, politicians }: { line: string; politicians: Politicians }) {
  return mailboxes(line).map((mailbox, i) => (
    <Fragment key={i}>
      {i > 0 && ", "}
      <Mailbox {...mailbox} politicians={politicians} />
    </Fragment>
  ));
}

/** A one-off thread's page: its subject, then each message as an email; for staff who can't read it, that they can't. */
export default function OneOffThreadView({ thread }: { thread: OneOffThread }) {
  return (
    <>
      <h1>{thread.subject === null ? copy.title : thread.subject || copy.noSubject}</h1>
      {thread.messages_ === null ? (
        <p>
          <Withheld>{copy.hidden}</Withheld>
        </p>
      ) : (
        <section aria-label={copy.thread} className={styles.thread}>
          {thread.messages_.map((message) => (
            <ThreadEmail
              key={message.id}
              from={<Mailbox name={message.fromName} address={message.fromAddress} politicians={message.politicians} />}
              to={<Mailboxes line={message.to} politicians={message.politicians} />}
              cc={message.cc ? <Mailboxes line={message.cc} politicians={message.politicians} /> : null}
              at={message.at}
              subject={message.subject}
            >
              {message.text === null ? (
                <Muted>{copy.unreadable}</Muted>
              ) : (
                <MessageText text={message.text} quoted={message.quoted} auto={message.auto} />
              )}
            </ThreadEmail>
          ))}
        </section>
      )}
    </>
  );
}
