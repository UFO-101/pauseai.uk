import type { ReactNode } from "react";
import CopyLinkButton from "@/components/ui/CopyLinkButton";
import { EntryItem } from "./TimelineList";
import styles from "./TimelineEntry.module.css";

/** One dated entry on the timeline, with a link-copy button beside its title. */
export function TimelineEntry({
  id,
  month,
  year,
  title,
  children,
}: {
  /** The entry's anchor, so it can be linked to as /track-record/#<id>. */
  id: string;
  month: string;
  year: string;
  title: string;
  /** The entry's text and photos. */
  children: ReactNode;
}) {
  return (
    <EntryItem className={styles.entry} id={id}>
      <aside className={styles.date}>
        <span className={styles.month}>{month}</span>
        <span className={styles.year}>{year}</span>
      </aside>
      <div className={styles.body}>
        <div className={styles.heading}>
          <h3 className={styles.title}>{title}</h3>
          <CopyLinkButton href={`/track-record/#${id}`} title="Copy link to this entry" small />
        </div>
        {children}
      </div>
    </EntryItem>
  );
}

/** An entry's paragraphs. */
export function EntryText({ children }: { children: ReactNode }) {
  return <div className={styles.text}>{children}</div>;
}

/** A list in an entry's text, each item marked with a short orange rule. */
export function EntryList({ children }: { children: ReactNode }) {
  return <ul className={styles.list}>{children}</ul>;
}
