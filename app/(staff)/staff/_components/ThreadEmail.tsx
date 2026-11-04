import type { ReactNode } from "react";
import { staffCopy } from "@/lib/content/staff-interface";
import { staffTime } from "@/lib/staff-time";
import styles from "./ThreadEmail.module.css";

const copy = staffCopy.letterThread;

/**
 * One message of a letter's thread as an email shows it: who it's from and
 * to, whom it was copied to if anyone, when, and its subject, with `action`, if any, at the right of the
 * subject's line, and for a supporter's letter the campaign it was written from; over its text.
 */
export default function ThreadEmail({
  from,
  to,
  cc,
  at,
  subject,
  action,
  campaign,
  missing = false,
  children,
}: {
  from: ReactNode;
  to: string;
  cc?: string | null;
  at: string | null;
  subject: string;
  action?: ReactNode;
  campaign?: ReactNode;
  /** Its text isn't kept, so its body is a slot with a note in it, not words of the letter. */
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
        {cc && (
          <>
            <dt>{copy.headers.cc}</dt>
            <dd>{cc}</dd>
          </>
        )}
        {at && (
          <>
            <dt>{copy.headers.date}</dt>
            <dd>{staffTime(at)}</dd>
          </>
        )}
        <dt>{copy.headers.subject}</dt>
        <dd className={styles.subject}>
          <strong>{subject}</strong>
          {action && <span className={styles.action}>{action}</span>}
        </dd>
        {campaign && (
          <>
            <dt>{copy.headers.campaign}</dt>
            <dd>{campaign}</dd>
          </>
        )}
      </dl>
      <div className={missing ? `${styles.body} ${styles.missing}` : styles.body}>{children}</div>
    </article>
  );
}
