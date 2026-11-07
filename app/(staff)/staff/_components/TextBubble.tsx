import type { ReactNode } from "react";
import { staffCopy } from "@/lib/content/staff-interface";
import styles from "./Messages.module.css";

const copy = staffCopy.messagePages;

/**
 * A bubble in a text conversation: theirs at the left in white, ours at the
 * right in green, each with who and when. `fromUs` names it as ours though it's
 * at the left: the message itself, as it reached them.
 */
export function ChatBubble({
  who,
  when,
  ours = false,
  fromUs = ours,
  children,
}: {
  who: string;
  when: string;
  ours?: boolean;
  fromUs?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={ours ? `${styles.bubble} ${styles.ours}` : styles.bubble}>
      <span className={fromUs ? `${styles.name} ${styles.ourName}` : styles.name}>{who}</span>
      {children}
      <span className={styles.time}>{when}</span>
    </div>
  );
}

/** The wall a text conversation's bubbles sit on. */
export function ChatWall({ children }: { children: ReactNode }) {
  return <div className={styles.wall}>{children}</div>;
}

/**
 * A text as a messaging app shows it: the words in a bubble from us, on the
 * left as it is on their phone, with the time, and the Stop button under it.
 */
export default function TextBubble({ from, text, time }: { from: string; text: string; time: string }) {
  return (
    <ChatWall>
      <div className={styles.bubble}>
        <span className={`${styles.name} ${styles.ourName}`}>{from}</span>
        {text}
        <span className={styles.time}>{time}</span>
      </div>
      <div className={styles.stop}>{copy.stopButton}</div>
    </ChatWall>
  );
}
