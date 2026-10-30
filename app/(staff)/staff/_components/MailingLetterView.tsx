import type { ReactNode } from "react";
import Tag from "@/components/ui/Tag";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Ask } from "@/lib/server/asks";
import type { PauseaiLetterDetails } from "@/lib/server/letters";
import type { Politician } from "@/lib/server/politicians";
import AskRow from "./AskRow";
import Breadcrumb from "./Breadcrumb";
import { LetterHistory, letterTitle } from "./LetterDetails";
import Grid, { Card, Column, spanClass } from "./ui/Grid";
import styles from "./MailingLetterView.module.css";

type SetStatus = (form: FormData) => void | Promise<void>;

/** A letter's status as its tag says it: answered its mailing's ask, in green; bounced, in red; else grey. */
function StatusTag({ letter, answered }: { letter: PauseaiLetterDetails; answered: boolean }) {
  if (answered) return <Tag tone="green">{staffCopy.mailings.columns.answered}</Tag>;
  const bounced = letter.status === "bounced" || letter.status === "spam_complaint";
  return <Tag tone={bounced ? "red" : undefined}>{staffCopy.letters.status[letter.status] ?? letter.status}</Tag>;
}

/**
 * One of a mailing's letters: its title and how it stands, under it the
 * politician's seat and party; then `children`, the letter and its replies
 * (LetterThread), beside the mailing's ask, as a politician's page shows it,
 * to set their answer from what they said; and what happened to it. The
 * thread already says who it's from and to and when, so nothing repeats it.
 */
export default function MailingLetterView({
  letter,
  politician,
  asks,
  setStatus,
  children,
}: {
  letter: PauseaiLetterDetails;
  politician: Politician;
  /** Every ask, to find the mailing's. */
  asks: Ask[];
  setStatus: SetStatus;
  children: ReactNode;
}) {
  const ask = asks.find((one) => one.slug === letter.mailingAsk);
  const about = [politician.constituency, politician.party, letter.personalised && staffCopy.mailings.personalised];
  return (
    <>
      <Breadcrumb href={`/staff/mailings/${letter.mailingId}`}>{letter.mailing}</Breadcrumb>
      <div className={styles.heading}>
        <h1>{letterTitle(letter)}</h1>
        <StatusTag letter={letter} answered={Boolean(ask && politician.statuses[ask.slug])} />
      </div>
      <p className={styles.about}>
        <Muted>{about.filter(Boolean).join(" · ")}</Muted>
      </p>
      <Grid>
        <div className={spanClass(4)}>{children}</div>
        <Column span={2}>
          {ask && (
            <Card look="aside" title={staffCopy.politician.statusesTitle} id="asks-title">
              <AskRow politician={politician} ask={ask} setStatus={setStatus} />
            </Card>
          )}
          <Card look="log" title={staffCopy.letters.detail.historyTitle} id="letter-history">
            <LetterHistory events={letter.events} />
          </Card>
        </Column>
      </Grid>
    </>
  );
}
