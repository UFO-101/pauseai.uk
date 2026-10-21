import Link from "next/link";
import { staffCopy } from "@/lib/content/staff-interface";
import { campaignBySlug } from "@/lib/email-your-mp";
import type { EmailBlock } from "@/lib/server/email";
import type { LetterSummary } from "@/lib/server/letters";
import type { Politician, PoliticianChange } from "@/lib/server/politicians";
import { staffDate, staffTime } from "@/lib/staff-time";
import styles from "./Details.module.css";
import LettersTable from "./LettersTable";
import PoliticianForm from "./PoliticianForm";
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

/** What an entry of the audit log about them says, beyond its kind: the status, the note, the reason. */
function Detail({ change }: { change: PoliticianChange }) {
  const { details } = change;
  const text = (key: string) => (typeof details[key] === "string" ? (details[key] as string) : "");
  switch (change.action) {
    case "set status": {
      const campaign = campaignBySlug(text("campaign"))?.title ?? text("campaign");
      const status =
        details.status === null ? staffCopy.statuses.none : (staffCopy.statuses[text("status")] ?? text("status"));
      return (
        <>
          {campaign}: {status}
          {text("date") && `, ${text("date")}`}
          {text("note") && <Muted> · {text("note")}</Muted>}
        </>
      );
    }
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
 * status; if their address is blocked, why, and a way to unblock it; the
 * letters written to them; everything the audit log says about them,
 * newest first; and at the foot, the form to edit a signer the policy team
 * added. Airtable's MPs are edited there, and the test MPs not at all.
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
        {block && <Tag tone="amber">{staffCopy.politicians.emailBlocked}</Tag>}
      </h1>

      <dl className={styles.facts}>
        <Fact label={staffCopy.fields.house}>{staffCopy.houses[politician.house]}</Fact>
        <Fact label={staffCopy.fields.constituency}>{politician.constituency}</Fact>
        <Fact label={staffCopy.fields.party}>{politician.party}</Fact>
        <Fact label={staffCopy.fields.email}>
          {politician.email ?? staffCopy.politicians.noEmail}
          {block && (
            <>
              {" "}
              <Link href="/staff/blocked-emails">{copy.blocked(block.reason, staffTime(block.since))}</Link>
            </>
          )}
        </Fact>
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
      {block && <UnblockForm block={block} action={unblock} />}

      <h2>{copy.lettersTitle}</h2>
      <LettersTable letters={letters} to={false} />

      <h2>{copy.historyTitle}</h2>
      {history.length === 0 ? (
        <p>{copy.noHistory}</p>
      ) : (
        <ol className={styles.history} aria-label={copy.historyTitle}>
          {history.map((change) => (
            <li key={change.id}>
              <span className={styles.when}>{staffTime(change.at)}</span>
              <span>
                {copy.history[change.action] ?? change.action} <Detail change={change} />{" "}
                <Muted>· {change.actor}</Muted>
              </span>
            </li>
          ))}
        </ol>
      )}

      <h2>{copy.detailsTitle}</h2>
      {editable ? <PoliticianForm action={action} politician={politician} /> : <p>{copy.fromAirtable}</p>}
    </>
  );
}
