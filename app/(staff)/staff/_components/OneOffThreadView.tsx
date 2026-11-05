import { Muted } from "@/components/ui/Text";
import Tag from "@/components/ui/Tag";
import { staffCopy } from "@/lib/content/staff-interface";
import { named } from "@/lib/named-address";
import type { OneOffThread } from "@/lib/server/one-off-emails";
import ThreadEmail from "./ThreadEmail";
import StaffLink from "./ui/StaffLink";
import styles from "./LetterThread.module.css";

const copy = staffCopy.oneOff;

/** A one-off thread's page: its subject and politicians, then each message as an email; for staff who can't read it, that they can't. */
export default function OneOffThreadView({ thread }: { thread: OneOffThread }) {
  return (
    <>
      <h1>{thread.subject === null ? copy.title : thread.subject || copy.noSubject}</h1>
      <p>
        <Tag tone={thread.someoneElse ? "amber" : undefined}>
          {copy.filters[thread.someoneElse ? "someone-else" : "pauseai"]}
        </Tag>{" "}
        {thread.people.map((person, i) => (
          <span key={person.id}>
            {i > 0 && ", "}
            <StaffLink href={`/staff/politicians/${person.id}`}>{person.name}</StaffLink>
          </span>
        ))}
      </p>
      {thread.messages_ === null ? (
        <p>
          <Muted>{copy.hidden}</Muted>
        </p>
      ) : (
        <section aria-label={copy.thread} className={styles.thread}>
          {thread.messages_.map((message) => (
            <ThreadEmail
              key={message.id}
              from={named(message.fromName, message.fromAddress)}
              to={message.to}
              cc={message.cc || null}
              at={message.at}
              subject={message.subject}
            >
              {message.text === null ? (
                <Muted>{copy.unreadable}</Muted>
              ) : (
                <div className={styles.text}>{message.text}</div>
              )}
            </ThreadEmail>
          ))}
        </section>
      )}
    </>
  );
}
