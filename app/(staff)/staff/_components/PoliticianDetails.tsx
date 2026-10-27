import Link from "next/link";
import type { ReactNode } from "react";
import { staffCopy } from "@/lib/content/staff-interface";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Select, TextInput } from "@/components/ui/Controls";
import { FilterForm } from "@/components/ui/Form";
import { ASK_STATUSES } from "@/lib/asks";
import { trackedAsks } from "@/lib/email-your-mp";
import type { Ask } from "@/lib/server/asks";
import CampaignName from "./CampaignName";
import { FieldChanges } from "./AuditDetail";
import type { FieldChange } from "@/lib/field-changes";
import { importPath } from "@/lib/import-runs";
import type { EmailBlock } from "@/lib/server/email";
import type { LetterSummary, PauseaiLetter, PoliticianLetters, UnsignedLetter } from "@/lib/server/letters";
import type { Politician, PoliticianChange } from "@/lib/server/politicians";
import { staffDate, staffTime } from "@/lib/staff-time";
import styles from "./Details.module.css";
import Grid, { Card } from "./ui/Grid";
import Strip from "./ui/Strip";
import { NationShape, Rosette, StatusDot } from "./PoliticianIcons";
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

/** One line of the history: when, to the minute or, with `day`, only the day, and what, already in words. */
type Entry = { key: string; at: string; day?: boolean; what: ReactNode };

/**
 * When an entry of the audit log happened: an answer dated before it was
 * recorded, as those an import finds already there are, on that day; anything
 * else when it was logged.
 */
function whenOf(change: PoliticianChange): { at: string; day: boolean } {
  const date = change.action === "set status" && typeof change.details.date === "string" ? change.details.date : "";
  const logged = new Date(change.at).toISOString();
  return date && date < logged.slice(0, 10) ? { at: date, day: true } : { at: logged, day: false };
}

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

/** A letter without its sender: its campaign, and how it ended, as words, not a link to the letter. */
function Unsigned({ letter, status }: { letter: UnsignedLetter; status: boolean }) {
  return (
    <Muted>
      {" · "}
      <CampaignName slug={letter.campaign} />
      {status && <> · {staffCopy.letters.status[letter.status] ?? letter.status}</>}
    </Muted>
  );
}

/**
 * The letters as history: each written, and each answered, as its own
 * line. With their senders, each names who wrote it, its status linked to
 * the letter's page; without, only the campaign and the status.
 */
function letterEntries({ senders, letters }: PoliticianLetters): Entry[] {
  const lines = (letter: LetterSummary | UnsignedLetter, written: ReactNode, replied: ReactNode): Entry[] => [
    { key: `letter-${letter.id}`, at: letter.createdAt, what: written },
    ...(letter.repliedAt ? [{ key: `replied-${letter.id}`, at: letter.repliedAt, what: replied }] : []),
  ];
  if (!senders) {
    return letters.flatMap((letter) =>
      lines(
        letter,
        <>
          {copy.history.unsignedLetter}
          <Unsigned letter={letter} status />
        </>,
        <>
          {copy.history["unsigned-letter-replied"]}
          <Unsigned letter={letter} status={false} />
        </>,
      ),
    );
  }
  return letters.flatMap((letter) =>
    lines(
      letter,
      <>
        {copy.history.letter} <Sender letter={letter} />
        <Muted>
          {" · "}
          <Link href={`/staff/letters/${letter.id}`}>{staffCopy.letters.status[letter.status] ?? letter.status}</Link>
        </Muted>
      </>,
      <>
        {copy.history["letter-replied"]} <Sender letter={letter} />
      </>,
    ),
  );
}

/** PauseAI's letters, each a line: the mailing, and whether it was personalised. */
function pauseaiEntries(letters: PauseaiLetter[]): Entry[] {
  return letters.map((letter) => ({
    key: `pauseai-${letter.id}`,
    at: letter.at,
    what: (
      <>
        {copy.history["pauseai-letter"]} <Link href={`/staff/mailings/${letter.mailingId}`}>{letter.mailing}</Link>
        <Muted>{letter.personalised && ` · ${copy.personalised}`}</Muted>
      </>
    ),
  }));
}

/** Stands in for the answer in the copy's words, to put the answer's link there. */
const ANSWER = "\u0000";

/**
 * What an entry of the audit log about them says, beyond its kind: the
 * status, the note, the reason. An answer leads to everyone who gave it to
 * that ask, and the ask to the letter or event; a blocked address, to the
 * politicians' blocked emails, searched for it.
 */
function Detail({ change, asks }: { change: PoliticianChange; asks: Ask[] }) {
  const { details } = change;
  const text = (key: string) => (typeof details[key] === "string" ? (details[key] as string) : "");
  switch (change.action) {
    case "set status": {
      const ask = asks.find((a) => a.slug === details.ask);
      const label = staffCopy.statuses[text("status")] ?? text("status");
      // The answer, where the copy puts it, leads to everyone who gave it to the ask.
      const answer =
        details.ask && details.status ? (
          <Link
            href={`/staff/politicians?ask=${encodeURIComponent(text("ask"))}&answer=${encodeURIComponent(text("status"))}`}
          >
            {label}
          </Link>
        ) : (
          label
        );
      const words = details.status === null ? copy.statusCleared : copy.statusSet(ANSWER);
      const [lead, rest = ""] = words.before.split(ANSWER);
      return (
        <>
          {lead}
          {words.before.includes(ANSWER) && answer}
          {rest}
          {/* Logged by ask, or, before asks, by campaign. The ask leads where it does in the asks card. */}
          {ask ? <AskTitle ask={ask} /> : details.ask ? text("ask") : <CampaignName slug={text("campaign")} />}
          {words.after}
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
    case "unblock address": {
      const kind = staffCopy.emails.kinds[text("kind")] ?? text("kind");
      // An unblock has a note, and a block the kind of problem.
      return (
        <>
          <Link href={`/staff/politicians/blocked-emails?q=${encodeURIComponent(text("address"))}`}>
            {text("address")}
          </Link>
          <Muted> · {kind || text("note")}</Muted>
        </>
      );
    }
    default:
      return <>{text("note")}</>;
  }
}

/** The asks a politician has a row for: those staff record, then any other they have a status for, in the asks' order. */
function asksOf(politician: Politician, asks: Ask[]): Ask[] {
  return [
    ...asks.filter((ask) => trackedAsks.includes(ask.slug)),
    ...asks.filter((ask) => !trackedAsks.includes(ask.slug) && politician.statuses[ask.slug]),
  ];
}

/**
 * Setting their answer to an ask staff record, with a note: Signed, or
 * taking it away, for a letter; one of an event's answers, or none.
 */
function StatusForm({
  politician,
  ask,
  setStatus,
}: {
  politician: Politician;
  ask: Ask;
  setStatus: (form: FormData) => void | Promise<void>;
}) {
  const status = politician.statuses[ask.slug];
  const note = (
    <span className={styles.note}>
      <TextInput name="note" aria-label={copy.note} placeholder={copy.notePlaceholder} required />
    </span>
  );
  return (
    <FilterForm action={setStatus} aria-label={`${copy.setStatus}: ${ask.title}`}>
      <input type="hidden" name="politicianId" value={politician.id} />
      <input type="hidden" name="ask" value={ask.slug} />
      {ask.kind === "letter" ? (
        <>
          <input type="hidden" name="status" value={status ? "" : "signed"} />
          {note}
          <SubmitButton variant={status ? "ghost" : "primary"} size="small">
            {status ? staffCopy.politicians.unmarkSigned : staffCopy.politicians.markSigned}
          </SubmitButton>
        </>
      ) : (
        <>
          <Select name="status" defaultValue={status?.status ?? ""} aria-label={copy.status}>
            <option value="">{staffCopy.statuses.noAnswer}</option>
            {ASK_STATUSES.event.map((value) => (
              <option key={value} value={value}>
                {staffCopy.statuses[value]}
              </option>
            ))}
          </Select>
          {note}
          <SubmitButton variant="primary" size="small">
            {copy.save}
          </SubmitButton>
        </>
      )}
    </FilterForm>
  );
}

/** Answers that are a yes, ticked in green, and a no, crossed. */
const YES = ["signed", "going"];
const NO = ["declined", "declined_surgery"];

/** The ask's title, linked to the letter or the event if we know where it is; another site's in a new tab. */
function AskTitle({ ask }: { ask: Ask }) {
  if (!ask.url) return ask.title;
  return ask.url.startsWith("/") ? (
    <Link href={ask.url}>{ask.title}</Link>
  ) : (
    <a href={ask.url} target="_blank" rel="noreferrer">
      {ask.title}
    </a>
  );
}

/**
 * One ask, a row of the asks card: who asked them to do what, and when,
 * leading into the ask's title; the note and who set the answer, or which
 * import; beside it, in a column of its own, their answer and its date, a
 * yes ticked in green and a no crossed, and for an ask staff record, Edit
 * under it, which opens the form to change it in a bubble below.
 */
function AskRow({
  politician,
  ask,
  setStatus,
}: {
  politician: Politician;
  ask: Ask;
  setStatus: (form: FormData) => void | Promise<void>;
}) {
  const status = politician.statuses[ask.slug];
  const none = ask.kind === "letter" ? staffCopy.statuses.none : staffCopy.statuses.noAnswer;
  const who = new Intl.ListFormat("en-GB").format(ask.askedBy.map((asker) => staffCopy.asks.askedBy[asker]));
  const asked = [copy.askedThem(who, ask.kind), ask.date && staffDate(ask.date)].filter(Boolean).join(" · ");
  const tracked = trackedAsks.includes(ask.slug);
  const editId = `edit-${ask.slug}`;
  const tone = status && (YES.includes(status.status) ? styles.yes : NO.includes(status.status) ? styles.no : "");
  return (
    <div className={styles.ask} role="group" aria-label={ask.title}>
      <div className={styles.asked}>
        <span className={styles.askMeta}>{asked}</span>
        <AskTitle ask={ask} />
        {status && (
          <span className={styles.askMeta}>
            {status.note && `${status.note} · `}
            {copy.fromImport[status.updatedBy] ?? copy.setBy(status.updatedBy, staffDate(status.updatedAt))}
          </span>
        )}
      </div>
      <div className={`${styles.answer} ${tone || ""}`}>
        <span>{status ? staffCopy.statuses[status.status] : none}</span>
        {status?.date && <span className={styles.askMeta}>{staffDate(status.date)}</span>}
        {tracked && (
          <button
            type="button"
            className={styles.edit}
            popoverTarget={editId}
            style={{ anchorName: `--${editId}` } as React.CSSProperties}
          >
            {copy.edit}
          </button>
        )}
      </div>
      {tracked && (
        // Keyed on the answer, so a change made from it closes it and empties the note.
        <div
          key={status?.updatedAt ?? "none"}
          id={editId}
          popover="auto"
          className={styles.editPopover}
          style={{ positionAnchor: `--${editId}` } as React.CSSProperties}
        >
          <StatusForm politician={politician} ask={ask} setStatus={setStatus} />
        </div>
      )}
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
 * audit log says about them, newest first, the letters' senders only when
 * it's given them. Nothing here edits them: an Airtable MP's source links
 * to their record there.
 */
export default function PoliticianDetails({
  politician,
  asks,
  setStatus,
  block,
  unblock,
  letters,
  pauseaiLetters = [],
  history,
  airtableTable,
}: {
  politician: Politician;
  /** Every ask, by the asks table's order. */
  asks: Ask[];
  /** Sets their answer to an ask staff record: politicianId, ask, status (blank to clear), note. */
  setStatus: (form: FormData) => void | Promise<void>;
  block?: EmailBlock;
  unblock: (form: FormData) => void | Promise<void>;
  /** Their letters, with who sent each only for staff with `supporters`. */
  letters: PoliticianLetters;
  /** PauseAI's letters to them. */
  pauseaiLetters?: PauseaiLetter[];
  history: PoliticianChange[];
  /** Airtable's table of MPs, which the server knows; an MP's record there is under it. */
  airtableTable: string;
}) {
  const entries: Entry[] = [
    ...letterEntries(letters),
    ...pauseaiEntries(pauseaiLetters),
    ...history.map((change) => ({
      key: `change-${change.id}`,
      ...whenOf(change),
      what: (
        <>
          {change.action !== "set status" && <>{copy.history[change.action] ?? change.action} </>}
          <Detail change={change} asks={asks} /> <Muted>· {change.actor}</Muted>
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
          {politician.importantTarget && <Tag tone="amber">{copy.importantTarget}</Tag>}
          {politician.personalConnection && <Tag>{copy.personalConnection}</Tag>}
        </h1>
        <p>{copy.role(copy.roles[politician.house], politician.constituency, politician.status === "in_office")}</p>
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
                    <Link href={importPath("sync-politicians")}>{copy.blocked.wrong.link}</Link>
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
          <div className={styles.icons}>
            {politician.party && (
              <div className={styles.iconFact}>
                <Rosette party={politician.party} />
                <span>
                  <small>{staffCopy.fields.party}</small>
                  {politician.party}
                </span>
              </div>
            )}
            <div className={styles.iconFact}>
              <StatusDot inOffice={politician.status === "in_office"} />
              <span>
                <small>{copy.status}</small>
                {staffCopy.personStatuses[politician.status]}
              </span>
            </div>
            {politician.country && (
              <div className={styles.iconFact}>
                <NationShape country={politician.country} />
                <span>
                  <small>{copy.country}</small>
                  {staffCopy.countries[politician.country]}
                </span>
              </div>
            )}
          </div>
          <section className={styles.part}>
            <h3 className={styles.partTitle}>{copy.writing}</h3>
            <dl className={styles.facts}>
              <Fact label={staffCopy.fields.email}>
                {politician.email ? (
                  <a href={`mailto:${politician.email}`}>{politician.email}</a>
                ) : (
                  staffCopy.politicians.noEmail
                )}
              </Fact>
              <Fact label={staffCopy.fields.salutation}>{politician.salutation}</Fact>
            </dl>
          </section>
          {politician.notes && (
            <section className={styles.part}>
              <h3 className={styles.partTitle}>{copy.notes}</h3>
              <p className={styles.notes}>{politician.notes}</p>
            </section>
          )}
          <p className={styles.source}>
            {copy.source}{" "}
            {politician.airtableId ? (
              <>
                <a href={`${airtableTable}/${politician.airtableId}`} target="_blank" rel="noreferrer">
                  {source}
                </a>
                {copy.editInAirtable}
                {politician.airtableRemovedAt && (
                  <>
                    {" "}
                    <Tag tone="amber">{copy.airtableRemoved(staffDate(politician.airtableRemovedAt))}</Tag>
                  </>
                )}
              </>
            ) : (
              source
            )}
          </p>
        </Card>
        <Card span={3} look="aside" title={copy.statusesTitle} id="asks-title">
          <div className={styles.asks}>
            {asksOf(politician, asks).map((ask) => (
              <AskRow key={ask.slug} politician={politician} ask={ask} setStatus={setStatus} />
            ))}
          </div>
        </Card>
        <Card span={6} look="log" title={copy.historyTitle} id="history-title">
          {entries.length === 0 ? (
            <p className={styles.none}>{copy.noHistory}</p>
          ) : (
            <ol className={styles.history} aria-label={copy.historyTitle}>
              {entries.map((entry) => (
                <li key={entry.key}>
                  <span className={styles.when}>{entry.day ? staffDate(entry.at) : staffTime(entry.at)}</span>
                  <span>{entry.what}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </Grid>
    </>
  );
}
