import Link from "next/link";
import type { ReactNode } from "react";
import { staffCopy } from "@/lib/content/staff-interface";
import { campaignBySlug, campaignPath } from "@/lib/email-your-mp";
import { importPath } from "@/lib/import-runs";
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

/** A campaign by its name, linked to its public page; one no longer run, by its slug, plain. */
function CampaignName({ slug }: { slug: string }) {
  const campaign = campaignBySlug(slug);
  return campaign ? <Link href={campaignPath(campaign)}>{campaign.title}</Link> : <>{slug}</>;
}

/**
 * A letter: who wrote it, linked to their supporter once they're one, for
 * staff who may see supporters; then the campaign.
 */
function Sender({ letter, show }: { letter: LetterSummary; show: boolean }) {
  return (
    <>
      {show &&
        (letter.supporterId === null ? (
          <> {letter.senderName}</>
        ) : (
          <>
            {" "}
            <Link href={`/staff/supporters/${letter.supporterId}`}>{letter.senderName}</Link>
          </>
        ))}
      <Muted>
        {" · "}
        <CampaignName slug={letter.campaign} />
      </Muted>
    </>
  );
}

/** The letters as history: each written, and each answered, as its own line; who wrote only if `showSenders`. */
function letterEntries(letters: LetterSummary[], showSenders: boolean): Entry[] {
  const words = showSenders ? copy.history : copy.historyUnnamed;
  return letters.flatMap((letter) => [
    {
      key: `letter-${letter.id}`,
      at: letter.createdAt,
      what: (
        <>
          {words.letter}
          <Sender letter={letter} show={showSenders} />
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
                {words["letter-replied"]}
                <Sender letter={letter} show={showSenders} />
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
      const words =
        details.status === null
          ? copy.statusCleared
          : copy.statusSet(staffCopy.statuses[text("status")] ?? text("status"));
      return (
        <>
          {words.before}
          <CampaignName slug={text("campaign")} />
          {words.after}
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
 * A politician's page, laid out like a supporter's: their name and tags,
 * and under it what they are;
 * one box of what we hold, with where they came from and each campaign's
 * status; if their address is blocked, why, and a way to unblock it; one
 * history of the letters written to them, the replies, and everything the
 * audit log says about them, newest first; and at the foot, the form to
 * edit a signer the policy team added. Airtable's MPs are edited there, their
 * source linking to their record, and the test MPs not at all.
 */
export default function PoliticianDetails({
  politician,
  action,
  block,
  unblock,
  letters,
  showSenders,
  history,
  airtableTable,
}: {
  politician: Politician;
  action: (form: FormData) => void | Promise<void>;
  block?: EmailBlock;
  unblock: (form: FormData) => void | Promise<void>;
  letters: LetterSummary[];
  /** Whether to say who wrote each letter: only to staff who may see supporters. */
  showSenders: boolean;
  history: PoliticianChange[];
  /** Airtable's table of MPs, which the server knows; an MP's record there is under it. */
  airtableTable: string;
}) {
  const editable = politician.airtableId === null && !politician.isTest;
  const entries: Entry[] = [
    ...letterEntries(letters, showSenders),
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
      <header className={styles.heading}>
        <h1>
          {politician.name}
          {politician.isTest && <Tag>{staffCopy.politicians.testMp}</Tag>}
        </h1>
        <p>{copy.role(copy.roles[politician.house], politician.constituency, politician.sitting)}</p>
      </header>
      {block && (
        <section className={styles.blocked} aria-labelledby="blocked-title">
          <AlertIcon tone="red" />
          <div className={styles.blockedBody}>
            <h2 id="blocked-title">{copy.blocked.title}</h2>
            <p>{copy.blocked.why(block.address, block.reason, staffTime(block.since))}</p>
            {block.canReset && (
              <p>
                {copy.blocked.fix.before}
                <Link href={importPath("sync-mps")}>{copy.blocked.fix.link}</Link>
                {copy.blocked.fix.after}
              </p>
            )}
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
        <Fact label={copy.source}>
          {politician.airtableId ? (
            <>
              <a href={`${airtableTable}/${politician.airtableId}`} target="_blank" rel="noreferrer">
                {source}
              </a>
              {copy.editInAirtable}
            </>
          ) : (
            source
          )}
        </Fact>
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

      {editable && (
        <>
          <h2>{copy.detailsTitle}</h2>
          <PoliticianForm action={action} politician={politician} />
        </>
      )}
    </>
  );
}
