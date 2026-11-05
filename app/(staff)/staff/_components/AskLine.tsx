import StaffLink from "./ui/StaffLink";
import { askHref } from "@/lib/asks";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Ask } from "@/lib/server/asks";
import { staffDate } from "@/lib/staff-time";
import styles from "./Details.module.css";

/** The ask's title, leading to its page. */
export function AskTitle({ ask }: { ask: Pick<Ask, "slug" | "title"> }) {
  return <StaffLink href={askHref(ask.slug)}>{ask.title}</StaffLink>;
}

/**
 * An ask as a politician's page leads into it: who asked them to do what,
 * and when, then its title, leading to its page.
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
 * green, dated the ask's day if it has one.
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
          {ask.date && <span className={styles.askMeta}>{staffDate(ask.date)}</span>}
        </div>
      </div>
    </div>
  );
}
