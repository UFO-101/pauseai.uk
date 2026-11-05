import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import { gmailMessageLink } from "@/lib/letter-links";
import {
  type AnyImportRun,
  type ControlAiImport,
  type LumaImport,
  type MembersImport,
  type EmailSync,
  type GmailReading,
  type GoToParliamentImport,
  type MpCheck,
  type OldLettersImport,
  type PoliticianSync,
  type WebFormImport,
} from "@/lib/import-runs";
import type { MpProblem } from "@/lib/mp-check";
import { changeCount, type Renamed, type SyncedPolitician } from "@/lib/politician-sync";
import RunBox from "./RunBox";
import { Muted } from "@/components/ui/Text";
import Withheld from "./ui/Withheld";
import Table from "@/components/ui/Table";

/** The Server Action that applies or discards a held politician sync. */
export type Decide = (formData: FormData) => void | Promise<void>;

/**
 * Politicians a sync added, lost or changed, each by where they sit and
 * their name, in the order a person reads them. Runs from before every body was read have only MPs, without
 * a house.
 */
function Politicians({ heading, politicians }: { heading: string; politicians: Partial<SyncedPolitician>[] }) {
  if (politicians.length === 0) return null;
  const where = (p: Partial<SyncedPolitician>) => `${p.constituency ?? staffCopy.houses[p.house!]}: ${p.name}`;
  // In the order a person reads them, a number in a name as a number: Gone 2 before Gone 10.
  const sorted = [...politicians].sort((a, b) => where(a).localeCompare(where(b), "en-GB", { numeric: true }));
  return (
    <>
      <h4>
        {heading} ({politicians.length})
      </h4>
      <ul>
        {sorted.map((p) => (
          <li key={p.airtableId}>
            {where(p)}
            {p.email ? "" : ` (${staffCopy.politicians.noEmail})`}
          </li>
        ))}
      </ul>
    </>
  );
}

/** The records whose names changed, from and to. */
function RenamedList({ renamed }: { renamed: Renamed[] }) {
  if (renamed.length === 0) return null;
  return (
    <>
      <h4>
        {staffCopy.syncs.renamed} ({renamed.length})
      </h4>
      <ul>
        {renamed.map((r) => (
          <li key={r.airtableId}>
            {r.from} → {r.to}
          </li>
        ))}
      </ul>
    </>
  );
}

/** One button, in a form of its own, so the decision travels as a field. */
function Decision({ id, decision, decide }: { id: number; decision: "apply" | "discard"; decide: Decide }) {
  return (
    <form action={decide}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="decision" value={decision} />
      <SubmitButton variant={decision === "apply" ? "primary" : "ghost"} size="small">
        {staffCopy.syncs[decision]}
      </SubmitButton>
    </form>
  );
}

/**
 * A copy of the politicians from Airtable: who was added, removed and
 * changed, whose names changed, and the statuses it set. A held one can be
 * applied or discarded, given `decide`.
 */
function SyncRun({ run, decide, open }: { run: PoliticianSync; decide?: Decide; open?: boolean }) {
  if (run.status === "failed") return <RunBox run={run} summary={null} open={open} />;
  const { added, removed, changed } = run.result.changes;
  const renamed = run.result.renamed ?? [];
  const count = changeCount(run.result.changes);
  return (
    <RunBox
      run={run}
      open={open}

      lines={count}
      summary={
        <>
          {staffCopy.syncs.added} {added.length}, {staffCopy.syncs.removed} {removed.length}, {staffCopy.syncs.changed}{" "}
          {changed.length}
          {run.result.statuses && <>. {staffCopy.syncs.statuses(run.result.statuses)}</>}
        </>
      }
      actions={
        run.status === "held" &&
        decide && (
          <>
            <Decision id={run.id} decision="apply" decide={decide} />
            <Decision id={run.id} decision="discard" decide={decide} />
          </>
        )
      }
    >
      {count > 0 && (
        <>
          <RenamedList renamed={renamed} />
          <Politicians heading={staffCopy.syncs.added} politicians={added} />
          <Politicians heading={staffCopy.syncs.removed} politicians={removed} />
          <Politicians heading={staffCopy.syncs.changed} politicians={changed} />
        </>
      )}
    </RunBox>
  );
}

/** What each side says, for one problem. */
function sides(problem: MpProblem): [string, string] {
  switch (problem.kind) {
    case "missing":
      return ["", problem.parliament];
    case "extra":
    case "unofficial":
      return [problem.airtable, ""];
    case "name":
      return [problem.airtable, problem.parliament];
    case "email":
      return [`${problem.name}: ${problem.airtable ?? staffCopy.check.noEmail}`, problem.parliament.join(", ")];
  }
}

/** A check of Airtable's MPs against Parliament's: where they disagree. */
function CheckRun({ run, open }: { run: MpCheck; open?: boolean }) {
  if (run.status === "failed") return <RunBox run={run} summary={null} open={open} />;
  const { problems } = run.result;
  const count = problems.length;
  return (
    <RunBox
      run={run}
      open={open}

      lines={count}
      summary={count === 0 ? staffCopy.check.allGood : staffCopy.check.problems(count)}
    >
      {count > 0 && (
        <Table>
          <thead>
            <tr>
              <th>{staffCopy.check.columns.constituency}</th>
              <th>{staffCopy.check.columns.problem}</th>
              <th>{staffCopy.check.columns.airtable}</th>
              <th>{staffCopy.check.columns.parliament}</th>
            </tr>
          </thead>
          <tbody>
            {problems.map((problem) => {
              const [airtable, parliament] = sides(problem);
              return (
                <tr key={`${problem.constituency} ${problem.kind}`}>
                  <td>{problem.constituency}</td>
                  <td>{staffCopy.check.kinds[problem.kind]}</td>
                  <td>{airtable}</td>
                  <td>{parliament}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </RunBox>
  );
}

/** A copy of ControlAI's letter's signatories: what it did, and the names it couldn't place. */
function ControlAiRun({ run, open }: { run: ControlAiImport; open?: boolean }) {
  if (run.status === "failed") return <RunBox run={run} summary={null} open={open} />;
  const { result } = run;
  return (
    <RunBox run={run} summary={staffCopy.controlAi.result(result)} lines={result.problems.length} open={open}>
      {result.problems.length > 0 && (
        <Table>
          <thead>
            <tr>
              <th>{staffCopy.controlAi.columns.name}</th>
              <th>{staffCopy.controlAi.columns.problem}</th>
            </tr>
          </thead>
          <tbody>
            {result.problems.map((problem) => (
              <tr key={problem.name}>
                <td>{problem.name}</td>
                <td>
                  {staffCopy.controlAi.kinds[problem.kind]}
                  {problem.candidates.length > 0 && <Muted> {problem.candidates.join(", ")}</Muted>}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </RunBox>
  );
}

/** A copy of PauseAI's emails from Airtable: the counts, and the emails held back for a mailing nobody has added. */
function EmailsRun({ run, open }: { run: EmailSync; open?: boolean }) {
  if (run.status === "failed") return <RunBox run={run} summary={null} open={open} />;
  const { unplaced } = run.result;
  return (
    <RunBox run={run} summary={staffCopy.pauseaiEmails.result(run.result)} lines={unplaced.length} open={open}>
      {unplaced.length > 0 && (
        <>
          <h4>
            {staffCopy.pauseaiEmails.unplaced} ({unplaced.length})
          </h4>
          <ul>
            {unplaced.map((email) => (
              <li key={email.airtableId}>
                {email.airtableId}: {email.mailings.join(", ") || staffCopy.pauseaiEmails.noBoxes}
              </li>
            ))}
          </ul>
        </>
      )}
    </RunBox>
  );
}

/** The one-off copy of pauseai.info's web form letters: the counts. */
function WebFormRun({ run, open }: { run: WebFormImport; open?: boolean }) {
  return (
    <RunBox run={run} summary={run.status === "failed" ? null : staffCopy.webForm.result(run.result)} open={open} />
  );
}

/** The one-off copy of Go to Parliament's meetings: the counts. */
function GoToParliamentRun({ run, open }: { run: GoToParliamentImport; open?: boolean }) {
  return (
    <RunBox
      run={run}
      summary={run.status === "failed" ? null : staffCopy.goToParliament.result(run.result)}
      open={open}
    />
  );
}

/** A copy of the Luma calendar: the counts, the hosts changed, the places looked up, and why it stopped early if it did. */
function LumaRun({ run, open }: { run: LumaImport; open?: boolean }) {
  if (run.status === "failed") return <RunBox run={run} summary={null} open={open} />;
  const { stoppedBy, hostsChanged, contactPages, places } = run.result;
  return (
    <RunBox
      run={run}
      open={open}
      summary={
        <>
          {staffCopy.luma.result(run.result)}
          {hostsChanged !== undefined && <> {staffCopy.luma.hostsChanged(hostsChanged)}</>}
          {contactPages !== undefined && <> {staffCopy.luma.contactPages(contactPages)}</>}
          {places && <> {staffCopy.luma.places(places)}</>}
          {places?.failed && <> {staffCopy.luma.placesFailed}</>}
          {stoppedBy && <> {staffCopy.luma.stoppedBy[stoppedBy]}</>}
        </>
      }
    />
  );
}

/** A copy of the members: the counts. */
function MembersRun({ run, open }: { run: MembersImport; open?: boolean }) {
  return (
    <RunBox run={run} summary={run.status === "failed" ? null : staffCopy.members.result(run.result)} open={open} />
  );
}

/**
 * A read of Gmail: the totals, then each account's, with whether it
 * couldn't be read, or was disconnected; for the letters inbox, what it
 * relayed, and each message it couldn't account for, with a link to it in
 * Gmail.
 */
function GmailRun({ run, open }: { run: GmailReading; open?: boolean }) {
  if (run.status === "failed") return <RunBox run={run} summary={null} open={open} />;
  const words = staffCopy.gmailReading;
  const inbox = staffCopy.lettersInbox;
  const { accounts } = run.result;
  const lines = accounts.reduce((n, a) => n + 1 + (a.notUnderstood?.length ?? 0), 0);
  return (
    <RunBox run={run} summary={words.result(accounts)} lines={lines} open={open}>
      <ul>
        {accounts.map((a) => (
          <li key={a.account}>
            {words.account(a)}
            {a.relayed !== undefined &&
              ` ${inbox.result({ relayed: a.relayed, spam: a.spam!, uncertain: a.uncertain! })}`}
            {!!a.oneOffs && ` ${words.oneOffs(a.oneOffs)}`}
            {a.restarted && ` ${words.restarted}`}
            {a.error && <Muted> {a.disconnected ? words.disconnected : words.failed(a.error)}</Muted>}
            {!!a.notUnderstood?.length && (
              <>
                {" "}
                {inbox.notUnderstood}
                <ul>
                  {a.notUnderstood.map((m) => (
                    <li key={m.gmailMessageId}>
                      {m.from}, &ldquo;{m.subject}&rdquo;: {inbox.reasons[m.reason]}.{" "}
                      <a href={gmailMessageLink(a.account, m.gmailMessageId)} target="_blank" rel="noreferrer">
                        {inbox.openInGmail}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </li>
        ))}
      </ul>
    </RunBox>
  );
}

/** Counts by mailing, or a form letter's campaign, as a list under its heading; nothing with none. */
function CountsByMailing({
  heading,
  counts,
  titles,
}: {
  heading: string;
  counts: Record<string, number>;
  titles?: Record<string, string>;
}) {
  const rows = Object.entries(counts).filter(([, n]) => n > 0);
  if (rows.length === 0) return null;
  return (
    <>
      <h4>{heading}</h4>
      <ul>
        {rows.map(([key, n]) => (
          <li key={key}>
            {titles?.[key] ?? key}: {n}
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * A press of the import of old letters: what it did and how much is left;
 * what it joined by mailing, and what it couldn't; and the mail that matched
 * nothing, by sender and subject, only to staff who see supporters, as its
 * senders are people.
 */
function OldLettersRun({ run, open, people }: { run: OldLettersImport; open?: boolean; people?: boolean }) {
  if (run.status === "failed") return <RunBox run={run} summary={null} open={open} />;
  const words = staffCopy.oldLetters;
  const { result } = run;
  const lines =
    Object.keys(result.joined).length +
    Object.keys(result.added).length +
    Object.keys(result.notJoined).length +
    result.unmatched.length;
  return (
    <RunBox
      run={run}
      open={open}
      lines={lines}
      summary={
        <>
          {words.result(result)}
          {result.stoppedBy === "gmail" && <> {words.stoppedByGmail}</>}
          {result.unreadable.length > 0 && <> {words.unreadable(result.unreadable.length)}</>}
        </>
      }
    >
      <CountsByMailing heading={words.joined} counts={result.joined} titles={result.titles} />
      <CountsByMailing heading={words.added} counts={result.added} titles={result.titles} />
      <CountsByMailing heading={words.notJoined} counts={result.notJoined} titles={result.titles} />
      {result.unmatched.length > 0 &&
        (people ? (
          <>
            <h4>{words.unmatched}</h4>
            <ul>
              {result.unmatched.map((mail, i) => (
                <li key={i}>
                  {mail.from}: {mail.subject}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>
            {words.matchedNothing(result.unmatched.length)} <Withheld>{words.onlyWithSupporters}</Withheld>
          </p>
        ))}
    </RunBox>
  );
}

/** One run from the import log, as its job's page shows it; `open` starts its detail unfolded, however long. `people`: who mail that matched nothing is from may show. */
export default function Run({
  run,
  decide,
  open,
  people,
}: {
  run: AnyImportRun;
  decide?: Decide;
  open?: boolean;
  people?: boolean;
}) {
  switch (run.job) {
    case "sync-politicians":
      return <SyncRun run={run} decide={decide} open={open} />;
    case "sync-emails":
      return <EmailsRun run={run} open={open} />;
    case "import-web-form-letters":
      return <WebFormRun run={run} open={open} />;
    case "import-go-to-parliament":
      return <GoToParliamentRun run={run} open={open} />;
    case "check-mps":
      return <CheckRun run={run} open={open} />;
    case "import-controlai":
      return <ControlAiRun run={run} open={open} />;
    case "import-luma":
      return <LumaRun run={run} open={open} />;
    case "import-members":
      return <MembersRun run={run} open={open} />;
    case "read-gmail":
      return <GmailRun run={run} open={open} />;
    case "import-old-letters":
      return <OldLettersRun run={run} open={open} people={people} />;
  }
}
