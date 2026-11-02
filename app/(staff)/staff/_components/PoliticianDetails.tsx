import StaffLink from "./ui/StaffLink";
import type { ReactNode } from "react";
import { staffCopy } from "@/lib/content/staff-interface";
import { asksDone } from "@/lib/asks";
import { answeredByHand, trackedAsks } from "@/lib/email-your-mp";
import type { Ask } from "@/lib/server/asks";
import { AskTitle } from "./AskLine";
import AskRow, { AskRows, OtherAsks } from "./AskRow";
import CampaignName from "./CampaignName";
import { FieldChanges } from "./AuditDetail";
import type { FieldChange } from "@/lib/field-changes";
import { importPath } from "@/lib/import-runs";
import type { EmailBlock } from "@/lib/server/email";
import type { LetterSummary, PauseaiLetter, PoliticianLetters, UnsignedLetter } from "@/lib/server/letters";
import type { Politician, PoliticianChange } from "@/lib/server/politicians";
import { staffDate, staffTime } from "@/lib/staff-time";
import styles from "./Details.module.css";
import Band, { BandFact } from "./ui/Band";
import Counts from "./ui/Counts";
import Grid, { Card, Column } from "./ui/Grid";
import Strip from "./ui/Strip";
import { NationShape, Rosette, StatusDot } from "./PoliticianIcons";
import UnblockForm from "./UnblockForm";
import NoteHistory from "./NoteHistory";
import { NoteEntry, NoteText, type NotesProps } from "./Notes";
import Tag from "@/components/ui/Tag";
import { Muted } from "@/components/ui/Text";

const copy = staffCopy.politician;

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
        <StaffLink href={`/staff/supporters/${letter.supporterId}`}>{letter.senderName}</StaffLink>
      )}
      <Muted>
        {" · "}
        <CampaignName slug={letter.campaign} title={letter.campaignTitle} url={letter.campaignUrl} />
      </Muted>
    </>
  );
}

/** A letter without its sender: its campaign, and how it ended, as words, not a link to the letter. */
function Unsigned({ letter, status }: { letter: UnsignedLetter; status: boolean }) {
  return (
    <Muted>
      {" · "}
      <CampaignName slug={letter.campaign} title={letter.campaignTitle} url={letter.campaignUrl} />
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
          <StaffLink href={`/staff/letters/${letter.id}`}>
            {staffCopy.letters.status[letter.status] ?? letter.status}
          </StaffLink>
        </Muted>
      </>,
      <>
        {copy.history["letter-replied"]} <Sender letter={letter} />
      </>,
    ),
  );
}

/**
 * PauseAI's letters, each a line: the mailing, whether it was personalised,
 * and how it stands, leading to the letter's page under its mailing.
 */
function pauseaiEntries(letters: PauseaiLetter[]): Entry[] {
  return letters.map((letter) => ({
    key: `pauseai-${letter.id}`,
    at: letter.at,
    what: (
      <>
        {copy.history["pauseai-letter"]}{" "}
        <StaffLink href={`/staff/mailings/${letter.mailingId}`}>{letter.mailing}</StaffLink>
        <Muted>
          {letter.personalised && ` · ${copy.personalised}`}
          {" · "}
          <StaffLink href={`/staff/mailings/${letter.mailingId}/letters/${letter.id}`}>
            {staffCopy.letters.status[letter.status] ?? letter.status}
          </StaffLink>
        </Muted>
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
          <StaffLink
            href={`/staff/politicians?ask=${encodeURIComponent(text("ask"))}&answer=${encodeURIComponent(text("status"))}`}
          >
            {label}
          </StaffLink>
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
          <StaffLink href={`/staff/politicians/blocked-emails?q=${encodeURIComponent(text("address"))}`}>
            {text("address")}
          </StaffLink>
          <Muted> · {kind || text("note")}</Muted>
        </>
      );
    }
    default:
      return <>{text("note")}</>;
  }
}

/** The asks a politician has a row for: the campaigns' that staff record, then any other they have a status for, in the asks' order. */
function asksOf(politician: Politician, asks: Ask[]): Ask[] {
  return [
    ...asks.filter((ask) => trackedAsks.includes(ask.slug)),
    ...asks.filter((ask) => !trackedAsks.includes(ask.slug) && politician.statuses[ask.slug]),
  ];
}

/**
 * The band at the top of their page: their name and tags, with whether
 * their record has gone from Airtable, and under it what they are; at its
 * top right, quietly, where their record came from, an Airtable MP's linked
 * to it there; then their party, whether they're in office, their nation
 * and how to write to them; and how many asks they did (asksDone),
 * leading to the asks, and letters supporters wrote them, to the history.
 */
function PoliticianBand({
  politician,
  letters,
  airtableTable,
}: {
  politician: Politician;
  letters: number;
  airtableTable: string;
}) {
  const inOffice = politician.status === "in_office";
  const source = politician.isTest
    ? copy.sources.test
    : politician.airtableId
      ? copy.sources.airtable
      : copy.sources.staff;
  return (
    <Band
      className={styles.band}
      title={politician.name}
      subtitle={copy.role(copy.roles[politician.house], politician.constituency, inOffice)}
      tag={
        <>
          {politician.isTest && <Tag>{staffCopy.politicians.flags.test}</Tag>}
          {politician.importantTarget && <Tag tone="amber">{copy.importantTarget}</Tag>}
          {politician.personalConnection && <Tag>{copy.personalConnection}</Tag>}
          {politician.airtableRemovedAt && (
            <Tag tone="amber">{copy.airtableRemoved(staffDate(politician.airtableRemovedAt))}</Tag>
          )}
        </>
      }
      corner={
        <>
          {copy.source}{" "}
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
        </>
      }
      aside={
        <Counts
          counts={[
            {
              key: "asks",
              n: asksDone(politician.statuses),
              label: copy.band.asksDone(asksDone(politician.statuses)),
            },
            { key: "letters", n: letters, label: copy.band.lettersCounted(letters) },
          ]}
        />
      }
    >
      <BandFact label={staffCopy.fields.party}>
        {politician.party && (
          <span className={styles.withIcon}>
            <Rosette party={politician.party} />
            {politician.party}
          </span>
        )}
      </BandFact>
      <BandFact label={copy.status}>
        <span className={styles.withIcon}>
          <StatusDot inOffice={inOffice} />
          {staffCopy.personStatuses[politician.status]}
        </span>
      </BandFact>
      <BandFact label={copy.country}>
        {politician.country && (
          <span className={styles.withIcon}>
            <NationShape country={politician.country} />
            {staffCopy.countries[politician.country]}
          </span>
        )}
      </BandFact>
      <BandFact label={staffCopy.fields.email} detail={politician.salutation}>
        {politician.email ? (
          <a href={`mailto:${politician.email}`}>{politician.email}</a>
        ) : (
          staffCopy.politicians.noEmail
        )}
      </BandFact>
    </Band>
  );
}

/**
 * A politician's page, laid out like a supporter's: the band of who they
 * are (PoliticianBand); if their address is blocked, why, and a way to
 * unblock it; then their history, newest first: the letters written to
 * them, the replies, PauseAI's emails, staff's notes, and everything the
 * audit log says about them, the letters' senders only when it's given
 * them, with Write a note at its top right, which drafts one at the top
 * (NoteHistory); and beside it the card of
 * their answer to each ask, with the button to change one staff record,
 * and under that Airtable's notes on them, which are changed there.
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
  notes,
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
  /** Staff's notes on them, in the history, and what adding and changing them needs. */
  notes?: NotesProps;
}) {
  const entries: Entry[] = [
    ...letterEntries(letters),
    ...pauseaiEntries(pauseaiLetters),
    ...(notes?.notes ?? []).map((note) => ({
      key: `note-${note.id}`,
      at: note.createdAt,
      what: <NoteEntry note={note} {...notes!} label={copy.history.note} dated={false} />,
    })),
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
  const rows = asksOf(politician, asks);
  const others = asks.filter((ask) => answeredByHand(ask.slug) && !rows.includes(ask));
  return (
    <>
      <PoliticianBand politician={politician} letters={letters.letters.length} airtableTable={airtableTable} />
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
                    <StaffLink href={importPath("sync-politicians")}>{copy.blocked.wrong.link}</StaffLink>
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
        <NoteHistory
          title={copy.historyTitle}
          id="history-title"
          empty={copy.noHistory}
          politicianId={politician.id}
          writer={notes?.reader.email ?? ""}
          at={notes?.at ?? ""}
          add={notes?.add}
        >
          {entries.map((entry) => (
            <li key={entry.key}>
              <span className={styles.when}>{entry.day ? staffDate(entry.at) : staffTime(entry.at)}</span>
              <div>{entry.what}</div>
            </li>
          ))}
        </NoteHistory>
        <Column span={3}>
          <Card look="aside" title={copy.statusesTitle} id="asks-title">
            <AskRows>
              {rows.map((ask) => (
                <AskRow key={ask.slug} politician={politician} ask={ask} setStatus={setStatus} />
              ))}
              <OtherAsks politician={politician} asks={others} setStatus={setStatus} />
            </AskRows>
          </Card>
          {politician.notes && (
            <Card look="aside" title={copy.notes} id="airtable-notes-title">
              <NoteText body={politician.notes} className={styles.notes} />
            </Card>
          )}
        </Column>
      </Grid>
    </>
  );
}
