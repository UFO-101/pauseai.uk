import Link from "next/link";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Ask } from "@/lib/server/asks";
import { staffDate } from "@/lib/staff-time";
import styles from "./Details.module.css";

/** The ask's title, linked to the letter or the event if we know where it is; another site's in a new tab. */
export function AskTitle({ ask }: { ask: Ask }) {
  if (!ask.url) return ask.title;
  return ask.url.startsWith("/") ? (
    <Link href={ask.url}>{ask.title}</Link>
  ) : (
    <a href={ask.url} target="_blank" rel="noreferrer">
      {ask.title}
    </a>
  );
}

/**
 * An ask as a politician's page leads into it: who asked them to do what,
 * and when, then its title, linked to the letter or the event.
 */
export function AskLead({ ask }: { ask: Ask }) {
  const who = new Intl.ListFormat("en-GB").format(ask.askedBy.map((asker) => staffCopy.asks.askedBy[asker]));
  const asked = [staffCopy.politician.askedThem(who, ask.kind), ask.date && staffDate(ask.date)]
    .filter(Boolean)
    .join(" · ");
  return (
    <>
      <span className={styles.askMeta}>{asked}</span>
      <AskTitle ask={ask} />
    </>
  );
}

/**
 * An ask as it shows among a politician's asks once they've said yes:
 * AskLead, and beside it, in a column of its own, their answer, ticked in
 * green.
 */
export function AskPreview({ ask }: { ask: Ask }) {
  return (
    <div className={styles.asks}>
      <div className={styles.ask} role="group" aria-label={ask.title}>
        <div className={styles.asked}>
          <AskLead ask={ask} />
        </div>
        <div className={`${styles.answer} ${styles.yes}`}>
          <span>{staffCopy.statuses[ask.kind === "letter" ? "signed" : "going"]}</span>
        </div>
      </div>
    </div>
  );
}
