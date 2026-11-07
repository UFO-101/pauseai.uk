import StaffLink from "./ui/StaffLink";
import { askHref } from "@/lib/asks";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Ask } from "@/lib/server/asks";
import { staffDate } from "@/lib/staff-time";
import AnswerWord from "./AnswerWord";
import styles from "./Details.module.css";

/** Who asked and what, as a politician's page says it. */
export function askedLine(ask: Pick<Ask, "askedBy" | "kind">): string {
  const who = new Intl.ListFormat("en-GB").format(ask.askedBy.map((asker) => staffCopy.asks.askedBy[asker]));
  return staffCopy.politician.askedThem(who, ask.kind);
}

/** Who asked and what, and when, if we know. */
function askedAndWhen(ask: Pick<Ask, "askedBy" | "kind" | "date">): string {
  return [askedLine(ask), ask.date && staffDate(ask.date)].filter(Boolean).join(" · ");
}

/** The ask's title, leading to its page. */
export function AskTitle({ ask }: { ask: Pick<Ask, "slug" | "title"> }) {
  return <StaffLink href={askHref(ask.slug)}>{ask.title}</StaffLink>;
}

/**
 * An ask as a politician's page leads into it: who asked them to do what,
 * and when, then its title, leading to its page but for a preview, whose ask may not exist yet.
 */
export function AskLead({ ask, linked = true }: { ask: Ask; linked?: boolean }) {
  return (
    <>
      <span className={styles.askMeta}>{askedAndWhen(ask)}</span>
      {linked ? <AskTitle ask={ask} /> : <span>{ask.title}</span>}
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
          <AskLead ask={ask} linked={false} />
        </div>
        <div className={styles.answer}>
          <AnswerWord status={ask.kind === "letter" ? "signed" : "going"} />
          {ask.date && <span className={styles.askMeta}>{staffDate(ask.date)}</span>}
        </div>
      </div>
    </div>
  );
}
