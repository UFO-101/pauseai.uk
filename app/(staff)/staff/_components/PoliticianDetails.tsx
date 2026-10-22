import Link from "next/link";
import type { ReactNode } from "react";
import { staffCopy } from "@/lib/content/staff-interface";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { SOBEL_BILL_CAMPAIGN } from "@/lib/controlai-letter";
import { campaignBySlug, campaignPath, trackedCampaigns } from "@/lib/email-your-mp";
import CampaignName from "./CampaignName";
import { FieldChanges } from "./AuditDetail";
import type { FieldChange } from "@/lib/field-changes";
import { importPath } from "@/lib/import-runs";
import type { EmailBlock } from "@/lib/server/email";
import type { LetterSummary } from "@/lib/server/letters";
import type { Politician, PoliticianChange } from "@/lib/server/politicians";
import { staffDate, staffTime } from "@/lib/staff-time";
import styles from "./Details.module.css";
import PoliticianForm from "./PoliticianForm";
import Grid, { Card } from "./ui/Grid";
import Strip from "./ui/Strip";
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
      <Muted>
        {" · "}
        <CampaignName slug={letter.campaign} />
      </Muted>
    </>
  );
}

/**
 * The letters as history: each written, with its status linked to the
 * letter's page, and each answered, as its own line.
 */
function letterEntries(letters: LetterSummary[]): Entry[] {
  return letters.flatMap((letter) => [
    {
      key: `letter-${letter.id}`,
      at: letter.createdAt,
      what: (
        <>
          {copy.history.letter} <Sender letter={letter} />
          <Muted>
            {" · "}
            <Link href={`/staff/letters/${letter.id}`}>{staffCopy.letters.status[letter.status] ?? letter.status}</Link>
          </Muted>
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
          {details.changed ? (
            <>
              <Muted> · </Muted>
              <FieldChanges changed={details.changed as Record<string, FieldChange>} />
            </>
          ) : (
            text("email") && <Muted> · {text("email")}</Muted>
          )}
        </>
      );
    case "block address":
      return <>{staffCopy.emails.kinds[text("kind")] ?? text("kind")}</>;
    default:
      return <>{text("note")}</>;
  }
}

/** The campaigns a politician has a card for: those staff record, the bill, then any other they have a status for. */
function campaignsOf(politician: Politician): string[] {
  return [
    ...new Set([...trackedCampaigns.map((c) => c.slug), SOBEL_BILL_CAMPAIGN, ...Object.keys(politician.statuses)]),
  ];
}

/**
 * One campaign, a row of the campaigns card: its name and a link to its
 * page; then their status as a strip, green once they've signed, with
 * when, the note and who set it, and for a campaign staff record, the
 * button to mark them signed or remove it. The bill's status comes
 * from the nightly ControlAI import alone, so its strip says so in place
 * of a button.
 */
function CampaignRow({
  politician,
  slug,
  markSigned,
}: {
  politician: Politician;
  slug: string;
  markSigned: (form: FormData) => void | Promise<void>;
}) {
  const status = politician.statuses[slug];
  const campaign = campaignBySlug(slug);
  const tracked = trackedCampaigns.some((c) => c.slug === slug);
  const button = tracked && (
    <form action={markSigned}>
      <input type="hidden" name="politicianId" value={politician.id} />
      <input type="hidden" name="campaign" value={slug} />
      <input type="hidden" name="signed" value={status ? "" : "1"} />
      <SubmitButton variant={status ? "ghost" : "primary"} size="small">
        {status ? staffCopy.politicians.unmarkSigned : staffCopy.politicians.markSigned}
      </SubmitButton>
    </form>
  );
  return (
    <div className={styles.campaign} role="group" aria-label={campaign?.title ?? slug}>
      <span>
        <strong>{campaign?.title ?? slug}</strong>
        {campaign && (
          <>
            {" · "}
            <Link className={styles.campaignMeta} href={campaignPath(campaign)}>
              {copy.campaignPage}
            </Link>
          </>
        )}
      </span>
      <Strip tone={status ? "green" : "plain"} action={button}>
        <span>
          {status
            ? `${staffCopy.statuses[status.status] ?? status.status}${status.date ? `, ${staffDate(status.date)}` : ""}`
            : staffCopy.statuses.none}
        </span>
        {status && (
          <span className={styles.campaignMeta}>
            {status.note && `${status.note} · `}
            {copy.setBy(status.updatedBy, staffDate(status.updatedAt))}
          </span>
        )}
        {slug === SOBEL_BILL_CAMPAIGN && <span className={styles.campaignMeta}>{copy.fromControlAi}</span>}
      </Strip>
    </div>
  );
}

/**
 * A politician's page, laid out like a supporter's: their name and tags,
 * and under it what they are;
 * one card of what we hold, with where they came from, and beside it a
 * card of their status for each campaign, with the button to change it
 * for one staff record (ui/Grid); if their address is blocked, why, and a way to unblock it; one
 * history of the letters written to them, the replies, and everything the
 * audit log says about them, newest first; and at the foot, the form to
 * edit a signer the policy team added. Airtable's MPs are edited there, their
 * source linking to their record, and the test MPs not at all.
 */
export default function PoliticianDetails({
  politician,
  action,
  markSigned,
  block,
  unblock,
  letters,
  history,
  airtableTable,
}: {
  politician: Politician;
  action: (form: FormData) => void | Promise<void>;
  /** Marks them as signed, or not, for a campaign staff record: politicianId, campaign, signed. */
  markSigned: (form: FormData) => void | Promise<void>;
  block?: EmailBlock;
  unblock: (form: FormData) => void | Promise<void>;
  letters: LetterSummary[];
  history: PoliticianChange[];
  /** Airtable's table of MPs, which the server knows; an MP's record there is under it. */
  airtableTable: string;
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
      <header className={styles.heading}>
        <h1>
          {politician.name}
          {politician.isTest && <Tag>{staffCopy.politicians.testMp}</Tag>}
        </h1>
        <p>{copy.role(copy.roles[politician.house], politician.constituency, politician.sitting)}</p>
      </header>
      {block && (
        <section className={styles.blocked} aria-labelledby="blocked-title">
          <Strip tone="red">
            <h2 id="blocked-title">{copy.blocked.title}</h2>
            <p>
              {copy.blocked.why.before}
              <strong>{block.address}</strong>
              {copy.blocked.why.after(block.reason, staffTime(block.since))}
            </p>
            <div className={styles.fixes}>
              {block.canReset && (
                <div>
                  <h3>{copy.blocked.wrong.title}</h3>
                  <p>
                    {copy.blocked.wrong.before}
                    <a
                      href={politician.airtableId ? `${airtableTable}/${politician.airtableId}` : airtableTable}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {copy.blocked.wrong.airtable}
                    </a>
                    {copy.blocked.wrong.middle}
                    <Link href={importPath("sync-mps")}>{copy.blocked.wrong.link}</Link>
                    {copy.blocked.wrong.after}
                  </p>
                </div>
              )}
              <div>
                <h3>{copy.blocked.right.title}</h3>
                {block.canReset && <p>{copy.blocked.right.text}</p>}
                <UnblockForm block={block} action={unblock} />
              </div>
            </div>
          </Strip>
        </section>
      )}

      <Grid>
        <Card span={3} as="div">
          <dl className={styles.facts}>
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
          </dl>
        </Card>
        <Card span={3} look="aside" title={copy.statusesTitle} id="campaigns-title">
          {campaignsOf(politician).map((slug) => (
            <CampaignRow key={slug} politician={politician} slug={slug} markSigned={markSigned} />
          ))}
        </Card>
        <Card span={6} look="log" title={copy.historyTitle} id="history-title">
          {entries.length === 0 ? (
            <p className={styles.none}>{copy.noHistory}</p>
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
        </Card>
      </Grid>

      {editable && (
        <>
          <h2>{copy.detailsTitle}</h2>
          <PoliticianForm action={action} politician={politician} />
        </>
      )}
    </>
  );
}
