import Link from "next/link";
import type { ReactNode } from "react";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import type { MailingSummary } from "@/lib/server/mailings";
import { londonWhen } from "@/lib/staff-time";
import { DeleteDraft, StopMailing } from "./MailingButtons";
import MailingsTable from "./MailingsTable";
import styles from "./MailingsOverview.module.css";

const copy = staffCopy.mailingPages;

type FormAction = (form: FormData) => void | Promise<void>;

/** One mailing not sent yet, a row: its title, linked to it, who wrote it and more, and its button. */
function Row({ mailing, children, action }: { mailing: MailingSummary; children: ReactNode; action: ReactNode }) {
  return (
    <li className={styles.row}>
      <Link href={`/staff/mailings/${mailing.id}`} className={styles.title}>
        {mailing.title || copy.untitled}
      </Link>
      <Muted>{children}</Muted>
      {action}
    </li>
  );
}

/**
 * The list of mailings, in three parts: the drafts, each with Delete
 * draft, then how to start another, from the politicians list; those coming
 * up, soonest first, each with Stop; and a table of those sent.
 */
export default function MailingsOverview({
  drafts,
  comingUp,
  sent,
  deleteDraft,
  stop,
}: {
  drafts: MailingSummary[];
  comingUp: MailingSummary[];
  sent: MailingSummary[];
  deleteDraft: FormAction;
  stop: FormAction;
}) {
  return (
    <>
      <h2>{copy.drafts}</h2>
      {drafts.length === 0 ? (
        <p>
          <Muted>{copy.noDrafts}</Muted>
        </p>
      ) : (
        <ul className={styles.rows}>
          {drafts.map((m) => (
            <Row key={m.id} mailing={m} action={<DeleteDraft id={m.id} action={deleteDraft} />}>
              {copy.draftLine(m.createdBy!, m.to)}
            </Row>
          ))}
        </ul>
      )}
      <p>
        {copy.howToStart} <Link href="/staff/politicians">{copy.toPoliticians}</Link>
      </p>
      <h2>{copy.comingUp}</h2>
      {comingUp.length === 0 ? (
        <p>
          <Muted>{copy.noneComing}</Muted>
        </p>
      ) : (
        <ul className={styles.rows}>
          {comingUp.map((m) => (
            <Row key={m.id} mailing={m} action={<StopMailing id={m.id} label={copy.stop} action={stop} />}>
              {copy.comingLine(m.createdBy!, londonWhen(m.dueAt!), m.to)}
            </Row>
          ))}
        </ul>
      )}
      <h2>{copy.sent}</h2>
      <MailingsTable mailings={sent} />
    </>
  );
}
