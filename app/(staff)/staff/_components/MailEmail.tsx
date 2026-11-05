import type { ReactNode } from "react";
import { staffCopy } from "@/lib/content/staff-interface";
import styles from "./MailEmail.module.css";

const copy = staffCopy.mailingPages;

/**
 * An email on a white card, as a mail app shows one: who it's from and to, if
 * said, and its subject, then its body. A mailing's and a campaign's letter
 * are each one of these.
 */
export default function MailEmail({
  from,
  to,
  subject,
  children,
}: {
  from?: ReactNode;
  to?: ReactNode;
  subject: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.email}>
      <dl className={styles.headers}>
        {from && (
          <>
            <dt>{copy.from}</dt>
            <dd>{from}</dd>
          </>
        )}
        {to && (
          <>
            <dt>{copy.to}</dt>
            <dd>{to}</dd>
          </>
        )}
        <dt>{copy.subject}</dt>
        <dd>
          <strong>{subject}</strong>
        </dd>
      </dl>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
