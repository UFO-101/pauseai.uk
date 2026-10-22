import Link from "next/link";
import type { ReactNode } from "react";
import { staffCopy } from "@/lib/content/staff-interface";
import { campaignBySlug } from "@/lib/email-your-mp";
import type { EmailBlock } from "@/lib/server/email";
import type { LetterSummary } from "@/lib/server/letters";
import type { Politician, PoliticianChange } from "@/lib/server/politicians";
import { staffDate, staffTime } from "@/lib/staff-time";
import styles from "./Details.module.css";
import PoliticianForm from "./PoliticianForm";
import AlertIcon from "./AlertIcon";
import UnblockForm from "./UnblockForm";
import Tag from "@/components/ui/Tag";
import { Muted } from "@/components/ui/Text";

const copy = staffCopy.politician;

/** One line of the box: its label and value. Nothing when there's no value. */
function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

/** One line of the history: when, and what, already in words. */
type Entry = { key: string; at: string; what: ReactNode };

/** A letter: who wrote it, linked to their supporter once they're one, the campaign, and how it ended. */
function Sender({ letter }: { letter: LetterSummary }) {
  return (
    <>
      {letter.supporterId === null ? (
        letter.senderName
      ) : (
        <Link href={`/staff/supporters/${letter.supporterId}`}>{letter.senderName}</Link>
      )}
      <Muted> · {campaignBySlug(letter.campaign)?.title ?? letter.campaign}</Muted>
    </>
  );
}

/** The letters as history: each written, and each answered, as its own line. */
function letterEntries(letters: LetterSummary[]): Entry[] {
  return letters.flatMap((letter) => [
    {
      key: `letter-${letter.id}`,
      at: letter.createdAt,
      what: (
        <>
          {copy.history.letter} <Sender letter={letter} />
          <Muted> · {staffCopy.letters.status[letter.status] ?? letter.status}</Muted>
        </>
      ),
    },
    ...(letter.repliedAt
      ? [
          {
            key: `replied-${letter.id}`,
            at: letter.repliedAt,
            what: (
              <>
                {copy.history["letter-replied"]} <Sender letter={letter} />
              </>
            ),
          },
        ]
      : []),
  ]);
}

/** What an entry of the audit log about them says, beyond its kind: the status, the note, the reason. */
function Detail({ change }: { change: PoliticianChange }) {
  const { details } = change;
  const text = (key: string) => (typeof details[key] === "string" ? (details[key] as string) : "");
  switch (change.action) {
    case "set status": {
      const campaign = campaignBySlug(text("campaign"))?.title ?? text("campaign");
      return (
        <>
          {details.status === null
            ? copy.statusCleared(campaign)
            : copy.statusSet(staffCopy.statuses[text("status")] ?? text("status"), campaign)}
          {text("date") && `, ${text("date")}`}
          {text("note") && <Muted> · {text("note")}</Muted>}
        </>
      );
    }
    case "add politician":
    case "edit politician":
      return (
        <>
          {text("name")}
          {text("email") && <Muted> · {text("email")}</Muted>}
        </>
      );
    case "block address":
      return <>{staffCopy.emails.kinds[text("kind")] ?? text("kind")}</>;
    default:
      return <>{text("note")}</>;
  }
}

/**
 * A politician's page, laid out like a supporter's: their name and tags;
 * one box of what we hold, with where they came from and each campaign's
 * status; if their address is blocked, why, and a way to unblock it; one
 * history of the letters written to them, the replies, and everything the
 * audit log says about them, newest first; and at the foot, the form to
 * edit a signer the policy team added. Airtable's MPs are edited there, and
 * the test MPs not at all.
 */
export default function PoliticianDetails({
  politician,
  action,
  block,
  unblock,
  letters,
  history,
}: {
  politician: Politician;
  action: (form: FormData) => void | Promise<void>;
  block?: EmailBlock;
  unblock: (form: FormData) => void | Promise<void>;
  letters: LetterSummary[];
  history: PoliticianChange[];
}) {
  const editable = politician.airtableId === null && !politician.isTest;
  const entries: Entry[] = [
    ...letterEntries(letters),
    ...history.map((change) => ({
      key: `change-${change.id}`,
      at: change.at,
      what: (
        <>
          {change.action !== "set status" && <>{copy.history[change.action] ?? change.action} </>}
          <Detail change={change} /> <Muted>· {change.actor}</Muted>
        </>
      ),
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const source = politician.isTest
    ? copy.sources.test
    : politician.airtableId
      ? copy.sources.airtable
      : copy.sources.staff;
  return (
    <>
      <h1>
        {politician.name}
        {politician.isTest && <Tag>{staffCopy.politicians.testMp}</Tag>}
      </h1>
      {block && (
        <section className={styles.blocked} aria-labelledby="blocked-title">
          <AlertIcon tone="red" />
          <div className={styles.blockedBody}>
            <h2 id="blocked-title">{copy.blocked.title}</h2>
            <p>{copy.blocked.why(block.address, block.reason, staffTime(block.since))}</p>
            {block.canReset && <p>{copy.blocked.fix}</p>}
            <UnblockForm block={block} action={unblock} />
            <p>
              <Link href="/staff/blocked-emails">{copy.blocked.all}</Link>
            </p>
          </div>
        </section>
      )}

      <dl className={styles.facts}>
        <Fact label={staffCopy.fields.house}>{staffCopy.houses[politician.house]}</Fact>
        <Fact label={staffCopy.fields.constituency}>{politician.constituency}</Fact>
        <Fact label={staffCopy.fields.party}>{politician.party}</Fact>
        <Fact label={staffCopy.fields.email}>{politician.email ?? staffCopy.politicians.noEmail}</Fact>
        <Fact label={copy.source}>{source}</Fact>
        {Object.entries(politician.statuses).map(([slug, status]) => (
          <div key={slug} className={styles.pair}>
            <dt>{campaignBySlug(slug)?.title ?? slug}</dt>
            <dd>
              {staffCopy.statuses[status.status] ?? status.status}
              {status.date && `, ${staffDate(status.date)}`}
              {status.note && <Muted> · {status.note}</Muted>}
              <br />
              <Muted>{copy.setBy(status.updatedBy, staffDate(status.updatedAt))}</Muted>
            </dd>
          </div>
        ))}
      </dl>

      <h2>{copy.historyTitle}</h2>
      {entries.length === 0 ? (
        <p>{copy.noHistory}</p>
      ) : (
        <ol className={styles.history} aria-label={copy.historyTitle}>
          {entries.map((entry) => (
            <li key={entry.key}>
              <span className={styles.when}>{staffTime(entry.at)}</span>
              <span>{entry.what}</span>
            </li>
          ))}
        </ol>
      )}

      <h2>{copy.detailsTitle}</h2>
      {editable ? <PoliticianForm action={action} politician={politician} /> : <p>{copy.fromAirtable}</p>}
    </>
  );
}
