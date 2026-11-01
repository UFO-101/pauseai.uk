import StaffLink from "./ui/StaffLink";
import type { ReactNode } from "react";
import Tag from "@/components/ui/Tag";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Ask } from "@/lib/server/asks";
import type { LetterDetails } from "@/lib/server/letters";
import type { Politician } from "@/lib/server/politicians";
import AskRow, { AskRows } from "./AskRow";
import Breadcrumb from "./Breadcrumb";
import CampaignName from "./CampaignName";
import { historyOf, LetterHistory, letterTitle, statusOf } from "./LetterHistory";
import Grid, { Card, Column, spanClass } from "./ui/Grid";
import styles from "./LetterView.module.css";

type SetStatus = (form: FormData) => void | Promise<void>;

/** A letter's status as its tag says it: answered the ask it makes, in green; bounced, in red; else grey. */
function StatusTag({ status, answered }: { status: string; answered: boolean }) {
  if (answered) return <Tag tone="green">{staffCopy.mailings.columns.answered}</Tag>;
  const bounced = status === "bounced" || status === "spam_complaint";
  return <Tag tone={bounced ? "red" : undefined}>{statusOf(status)}</Tag>;
}

/**
 * The card of what a letter asks: the ask, if it makes one, in the box a
 * politician's page shows it in, to set their answer from what they said;
 * for a supporter's, under it, the campaign it's based on, leading to it,
 * or the campaign alone when it makes no ask. Nothing for one of PauseAI's
 * that makes none.
 */
function AskCard({
  letter,
  politician,
  ask,
  setStatus,
}: {
  letter: LetterDetails;
  politician: Politician;
  ask: Ask | undefined;
  setStatus: SetStatus;
}) {
  if (!ask && letter.kind === "pauseai") return null;
  const campaign = letter.kind === "supporter" && (
    <CampaignName slug={letter.campaign} title={letter.campaignTitle} url={letter.campaignUrl} />
  );
  return (
    <Card look="aside" title={ask ? staffCopy.mailings.fields.ask : staffCopy.letters.columns.campaign} id="ask-title">
      {ask ? (
        <>
          <AskRows>
            <AskRow politician={politician} ask={ask} setStatus={setStatus} />
          </AskRows>
          {campaign && (
            <p className={styles.campaign}>
              {staffCopy.letters.detail.basedOn} {campaign}
            </p>
          )}
        </>
      ) : (
        <p className={styles.campaignAlone}>{campaign}</p>
      )}
    </Card>
  );
}

/**
 * A letter's page, a supporter's or one of a mailing's: its title and how
 * it stands, tagged when it's to a test politician; under it the
 * politician, leading to their page, with their seat and party; then
 * `children`, the letter as an email and its replies (LetterThread), beside
 * what it asks (AskCard), as wide as a politician's page has it, and what
 * happened to it. The thread says who it's from and to and when, so nothing
 * repeats it. A supporter's goes back to the letters list, PauseAI's to its
 * mailing.
 */
export default function LetterView({
  letter,
  politician,
  asks,
  setStatus,
  children,
}: {
  letter: LetterDetails;
  politician: Politician;
  /** Every ask, to find the letter's. */
  asks: Ask[];
  setStatus: SetStatus;
  children: ReactNode;
}) {
  const slug = letter.kind === "supporter" ? letter.campaignAsk : letter.mailingAsk;
  const ask = asks.find((one) => one.slug === slug);
  const back =
    letter.kind === "supporter"
      ? { href: "/staff/letters", label: staffCopy.nav.letters }
      : { href: `/staff/mailings/${letter.mailingId}`, label: letter.mailing };
  const personalised = letter.kind === "pauseai" && letter.personalised && staffCopy.mailings.personalised;
  const about = [politician.constituency, politician.party, personalised];
  return (
    <>
      <Breadcrumb href={back.href}>{back.label}</Breadcrumb>
      <div className={styles.heading}>
        <h1>{letterTitle(letter)}</h1>
        <StatusTag status={letter.status} answered={Boolean(ask && politician.statuses[ask.slug])} />
        {politician.isTest && <Tag>{staffCopy.politicians.flags.test}</Tag>}
      </div>
      <p className={styles.about}>
        <StaffLink href={`/staff/politicians/${letter.politicianId}`}>{letter.mpName}</StaffLink>
        <Muted>{about.filter(Boolean).map((part) => ` · ${part}`)}</Muted>
      </p>
      <Grid>
        <div className={spanClass(3)}>{children}</div>
        <Column span={3}>
          <AskCard letter={letter} politician={politician} ask={ask} setStatus={setStatus} />
          <Card look="log" title={staffCopy.letters.detail.historyTitle} id="letter-history">
            <LetterHistory events={historyOf(letter)} />
          </Card>
        </Column>
      </Grid>
    </>
  );
}
