"use client";

// The staff screens' examples whose Server Actions are props: client
// components with no props, each action logged rather than sent.
import type { EmailBlock } from "@/lib/server/email";
import type { Politician } from "@/lib/server/politicians";
import EmailBlocksTable from "@/app/(staff)/staff/_components/EmailBlocksTable";
import {
  exampleBlock,
  exampleComplaint,
  exampleGmailBlock,
} from "@/app/(staff)/staff/_components/EmailBlocksTable.examples";
import { ImportJobPage } from "@/app/(staff)/staff/_components/ImportJob";
import JobActions from "@/app/(staff)/staff/_components/JobActions";
import PoliticianDetails from "@/app/(staff)/staff/_components/PoliticianDetails";
import PoliticianTable from "@/app/(staff)/staff/_components/PoliticianTable";
import {
  emptyPoliticiansSearch,
  exampleAsks,
  exampleChoosing,
  examplePasted,
  examplePoliticiansPage,
  examplePolitician,
  examplePoliticianHistory,
} from "@/app/(staff)/staff/_components/PoliticianTable.examples";
import {
  exampleLetter,
  examplePauseaiLetterDetails,
  exampleSupporterLetterDetails,
} from "@/app/(staff)/staff/_components/LettersTable.examples";
import Run from "@/app/(staff)/staff/_components/Run";
import AskRow, { AskRows, PoliticianAsks } from "@/app/(staff)/staff/_components/AskRow";
import EraseForm from "@/app/(staff)/staff/_components/EraseForm";
import DeletePolitician from "@/app/(staff)/staff/_components/DeletePolitician";
import StaffAccountsTable, { AddStaff } from "@/app/(staff)/staff/_components/StaffAccountsTable";
import type { StaffAccount } from "@/lib/server/staff-accounts";
import UnblockForm from "@/app/(staff)/staff/_components/UnblockForm";
import NoteChanges from "@/app/(staff)/staff/_components/NoteChanges";
import NoteForm from "@/app/(staff)/staff/_components/NoteForm";
import NoteHistory from "@/app/(staff)/staff/_components/NoteHistory";
import Notes, { NoteEntry, NoteText } from "@/app/(staff)/staff/_components/Notes";
import {
  exampleNoteAdmin,
  exampleNotes,
  exampleNotesAt,
  exampleNoteWriter,
} from "@/app/(staff)/staff/_components/Notes.examples";
import { exampleFailedRun, exampleHeldSync, exampleRun } from "@/app/(staff)/staff/_components/RunList.examples";
import type { JSONContent } from "@tiptap/react";
import { useId, useState } from "react";
import MailingEditor from "@/app/(staff)/staff/_components/MailingEditor";
import { Button } from "@/components/ui/Button";
import ButtonRow from "@/components/ui/ButtonRow";
import { staffCopy } from "@/lib/content/staff-interface";
import { ChangeTimeForm, DueTimeFields } from "@/app/(staff)/staff/_components/DueTime";
import { DeleteDraft, StopMailing } from "@/app/(staff)/staff/_components/MailingButtons";
import { DeleteTwice } from "@/app/(staff)/staff/_components/DeleteTwice";
import AskForm from "@/app/(staff)/staff/_components/AskForm";
import MyGmail from "@/app/(staff)/staff/_components/MyGmail";
import {
  exampleEditableAsk,
  exampleGmailAccount,
  exampleThread,
} from "@/app/(staff)/staff/_components/LetterThread.examples";
import MailingFiles from "@/app/(staff)/staff/_components/MailingFiles";
import MailingFor from "@/app/(staff)/staff/_components/MailingFor";
import { FilterPills } from "@/app/(staff)/staff/_components/MailingParts";
import MailingView from "@/app/(staff)/staff/_components/MailingView";
import MailingWriter from "@/app/(staff)/staff/_components/MailingWriter";
import {
  exampleFreshMailing,
  examplePickedList,
  exampleWriterData,
  exampleWrittenMailing,
} from "@/app/(staff)/staff/_components/MailingWriter.examples";
import MailingsOverview from "@/app/(staff)/staff/_components/MailingsOverview";
import Notice from "@/app/(staff)/staff/_components/ui/Notice";
import EventsTable from "@/app/(staff)/staff/_components/EventsTable";
import { exampleEventsNow, exampleEventsTab, exampleStaff } from "@/app/(staff)/staff/_components/EventsTable.examples";
import LetterView from "@/app/(staff)/staff/_components/LetterView";
import FindInGmail from "@/app/(staff)/staff/_components/FindInGmail";
import LetterThread, { SupporterLetterThread } from "@/app/(staff)/staff/_components/LetterThread";
import { mailingGroups } from "@/lib/mailing-groups";
import {
  exampleDraft,
  exampleMailing,
  exampleMailings,
  exampleScheduled,
  exampleSending,
} from "@/app/(staff)/staff/_components/MailingsTable.examples";
import PasteForm from "@/app/(staff)/staff/_components/PasteForm";
import PickBox from "@/app/(staff)/staff/_components/PickBox";
import PoliticiansList, { ChoosingHead, type ChoosingActions } from "@/app/(staff)/staff/_components/PoliticiansList";
import { Controlled, Logged } from "../_components/wiring";

/** The table of politicians: one function for both examples. */
function LoggedPoliticianTable({ politicians }: { politicians: Politician[] }) {
  return <PoliticianTable politicians={politicians} asks={exampleAsks} />;
}

/** An MP who signed the letter to the PM, and a test peer, retired, whose address is blocked, who signed ControlAI's letter. */
export function PoliticianTableExample() {
  return (
    <LoggedPoliticianTable
      politicians={[
        examplePolitician,
        {
          ...examplePolitician,
          id: 8,
          name: "Testy McTestface MP",
          isTest: true,
          status: "retired",
          emailBlocked: true,
          house: "lords",
          constituency: null,
          statuses: {
            "controlai-letter": { ...examplePolitician.statuses["frontier-ai-letter"], updatedBy: "controlai" },
          },
        },
      ]}
    />
  );
}

/** No politician matches the filter. */
export function PoliticianTableEmptyExample() {
  return <LoggedPoliticianTable politicians={[]} />;
}

/** An MP sync held for a decision: apply and discard log what they'd send. */
export function HeldSyncExample() {
  return <Logged>{(log) => <Run run={exampleHeldSync} decide={log("decide")} />}</Logged>;
}

/**
 * A politician's page for a signer the policy team added, its saves logged;
 * or one of Airtable's MPs, not editable here, whose address may be blocked.
 */
/**
 * The asks card's rows: one answered from Airtable, one staff record with
 * no answer yet, or, with `declined`, a letter they declined; then, with
 * `others`, the button whose menu adds another.
 */
export function AskRowExample({ others = false, declined = false }: { others?: boolean; declined?: boolean }) {
  const decline = { ...examplePolitician.statuses["frontier-ai-letter"]!, status: "declined" as const };
  const politician = {
    ...examplePolitician,
    airtableId: null,
    statuses: declined
      ? { ...examplePolitician.statuses, [exampleAsks[4]!.slug]: decline }
      : examplePolitician.statuses,
  };
  return (
    <Logged>
      {(log) =>
        others ? (
          <PoliticianAsks politician={politician} asks={exampleAsks} setStatus={log("setStatus")} />
        ) : (
          <AskRows>
            <AskRow politician={politician} ask={exampleAsks[0]!} setStatus={log("setStatus")} />
            <AskRow politician={politician} ask={exampleAsks[4]!} setStatus={log("setStatus")} />
          </AskRows>
        )
      }
    </Logged>
  );
}

export function PoliticianDetailsExample({
  fromAirtable = false,
  blocked = false,
  senders = true,
}: {
  fromAirtable?: boolean;
  blocked?: boolean;
  /** Whether the letters say who wrote them, as for staff with the supporters permission. */
  senders?: boolean;
}) {
  const letter = { ...exampleLetter, mpName: examplePolitician.name, politicianId: examplePolitician.id };
  return (
    <Logged>
      {(log) => (
        <PoliticianDetails
          politician={
            fromAirtable ? { ...examplePolitician, emailBlocked: blocked } : { ...examplePolitician, airtableId: null }
          }
          asks={exampleAsks}
          setStatus={log("setStatus")}
          block={blocked ? { ...exampleBlock, address: examplePolitician.email! } : undefined}
          letters={
            senders
              ? { senders, letters: [letter] }
              : {
                  senders,
                  letters: [
                    {
                      id: letter.id,
                      campaign: letter.campaign,
                      campaignTitle: letter.campaignTitle,
                      status: letter.status,
                      createdAt: letter.createdAt,
                      repliedAt: letter.repliedAt,
                    },
                  ],
                }
          }
          history={examplePoliticianHistory}
          unblock={log("unblock")}
          airtableTable="https://airtable.com/appExample/tblExample"
          notes={
            fromAirtable
              ? undefined
              : {
                  notes: exampleNotes,
                  reader: exampleNoteWriter,
                  at: exampleNotesAt,
                  add: log("addNote"),
                  edit: log("editNote"),
                  remove: log("deleteNote"),
                }
          }
        />
      )}
    </Logged>
  );
}

/** Blocked addresses, a bounce and a complaint unless told otherwise, their unblocking logged. */
export function EmailBlocksTableExample({
  blocks = [exampleBlock, exampleGmailBlock, exampleComplaint],
  letterLinks = true,
}: {
  blocks?: EmailBlock[];
  letterLinks?: boolean;
}) {
  return (
    <Logged>{(log) => <EmailBlocksTable blocks={blocks} unblock={log("unblock")} letterLinks={letterLinks} />}</Logged>
  );
}

/** The unblock form for a bounce, logged, and what shows for a complaint instead. */
export function UnblockFormExample() {
  return (
    <Logged>
      {(log) => (
        <>
          <UnblockForm block={exampleBlock} action={log("unblock")} />
          <UnblockForm block={exampleComplaint} action={log("unblock")} />
        </>
      )}
    </Logged>
  );
}

/**
 * A supporter's notes, their forms logged, as Jo sees them, who can change
 * her newest; as an admin, who can delete any; or with none yet.
 */
export function NotesExample({ as = "writer" }: { as?: "writer" | "admin" | "empty" }) {
  return (
    <Logged>
      {(log) => (
        <Notes
          supporterId={1}
          notes={as === "empty" ? [] : exampleNotes}
          reader={as === "admin" ? exampleNoteAdmin : exampleNoteWriter}
          at={exampleNotesAt}
          add={log("add")}
          edit={log("edit")}
          remove={log("delete")}
        />
      )}
    </Logged>
  );
}

/** One note as a history shows it, labelled and without its time: Jo's, which she can change, or Sam's, edited, which she can't. */
export function NoteEntryExample({ own = true }: { own?: boolean }) {
  return (
    <Logged>
      {(log) => (
        <NoteEntry
          note={exampleNotes[own ? 0 : 1]}
          reader={exampleNoteWriter}
          at={exampleNotesAt}
          edit={log("edit")}
          remove={log("delete")}
          label="Note"
          dated={false}
        />
      )}
    </Logged>
  );
}

/** A note's buttons, logged: Edit, which opens Save, Cancel and Delete, for its writer; Delete alone for an admin. */
export function NoteChangesExample({ editable = true }: { editable?: boolean }) {
  return (
    <Logged>
      {(log) => (
        <NoteChanges
          note={exampleNotes[0]}
          editable={editable}
          text={<NoteText body={exampleNotes[0].body} />}
          meta="jo@pauseai.uk"
          edit={log("edit")}
          remove={log("delete")}
        />
      )}
    </Logged>
  );
}

/** A politician's history card, its Write a note logged: two lines, or none; or without Write a note. */
export function NoteHistoryExample({ lines = true, writable = true }: { lines?: boolean; writable?: boolean }) {
  const rows = [
    { at: "2 Nov 2026, 11:00", what: "Email from PauseAI: Example Mailing" },
    { at: "1 Nov 2026, 09:30", what: "Signed 'Example Letter to the PM'" },
  ];
  return (
    <Logged>
      {(log) => (
        <NoteHistory
          title="History"
          id="example-history"
          empty="Nothing yet."
          politicianId={7}
          writer={exampleNoteWriter.email}
          at={exampleNotesAt}
          add={writable ? log("add") : undefined}
        >
          {(lines ? rows : []).map((row) => (
            <li key={row.at}>
              <span>{row.at}</span>
              <div>{row.what}</div>
            </li>
          ))}
        </NoteHistory>
      )}
    </Logged>
  );
}

/** The form to add a note, logged: closed, or opened, on a supporter, with what a note should be, or on a politician. */
export function NoteFormExample({
  on = "supporterId",
  opened = false,
}: {
  on?: "supporterId" | "politicianId";
  opened?: boolean;
}) {
  return <Logged>{(log) => <NoteForm target={{ name: on, value: 1 }} add={log("add")} opened={opened} />}</Logged>;
}

/** A note's text, its addresses links, and its lines kept. */
export function NoteTextExample() {
  return <NoteText body={exampleNotes[0].body + "\n" + exampleNotes[1].body} />;
}

/** A job's page, its button and any held sync's buttons logged: the MP check with three runs, or the web form import, never run. */
export function ImportJobPageExample({ never = false }: { never?: boolean }) {
  return (
    <Logged>
      {(log) =>
        never ? (
          <ImportJobPage
            job="import-web-form-letters"
            runs={[]}
            run={log("run")}
            decide={log("decide")}
            airtableTable="https://airtable.com/"
          />
        ) : (
          <ImportJobPage
            job="check-mps"
            runs={[
              exampleRun("check-mps", { problems: [] }, { id: 7, at: "2026-11-03T01:00:00Z" }),
              exampleFailedRun("check-mps", "Parliament answered 500", { id: 6, at: "2026-11-02T01:00:00Z" }),
              exampleRun("check-mps", { problems: [] }, { id: 5, at: "2026-11-01T01:00:00Z" }),
            ]}
            run={log("run")}
            decide={log("decide")}
            airtableTable="https://airtable.com/"
          />
        )
      }
    </Logged>
  );
}

/** An import's button, its runs logged. */
export function JobActionsExample() {
  return <Logged>{(log) => <JobActions action={log("action")} label="Check now" />}</Logged>;
}

/** Add staff, at the accounts page's top right: its box adds someone, logged; jo@pauseai.uk is there already. */
export function AddStaffExample() {
  return (
    <Logged>
      {(log) => <AddStaff accounts={[{ email: "jo@pauseai.uk" } as StaffAccount]} add={log("saveStaffAccount")} />}
    </Logged>
  );
}

/** The seeded admin, never logged in; an admin looking, logged in twice; and someone their first login added; each row's forms logged. */
export function StaffAccountsTableExample() {
  return (
    <Logged>
      {(log) => (
        <StaffAccountsTable
          save={log("saveStaffAccount")}
          remove={log("removeStaffAccount")}
          endSessions={log("endStaffSessions")}
          you="jo@pauseai.uk"
          accounts={[
            {
              email: "admin@pauseai.uk",
              permissions: ["admin"],
              addedBy: "migration",
              addedAt: "2026-10-16T12:00:00Z",
              lastLoginAt: null,
              lastSeenAt: null,
              sessions: 0,
            },
            {
              email: "jo@pauseai.uk",
              permissions: ["admin"],
              addedBy: "admin@pauseai.uk",
              addedAt: "2026-10-20T09:00:00Z",
              lastLoginAt: "2026-10-22T08:00:00Z",
              lastSeenAt: "2026-10-22T09:15:00Z",
              sessions: 2,
            },
            {
              email: "samuel.whitlock@pauseai.uk",
              permissions: [],
              addedBy: "login",
              addedAt: "2026-10-21T10:30:00Z",
              lastLoginAt: "2026-10-21T10:30:00Z",
              lastSeenAt: "2026-10-21T11:00:00Z",
              sessions: 1,
            },
          ]}
        />
      )}
    </Logged>
  );
}

export function DeletePoliticianExample() {
  return <Logged>{(log) => <DeletePolitician politician={{ id: 7 }} action={log("deletePoliticianNow")} />}</Logged>;
}

export function EraseFormExample() {
  return (
    <Logged>
      {(log) => <EraseForm supporter={{ id: 7, name: "Jane Example" }} action={log("eraseSupporterNow")} />}
    </Logged>
  );
}

/** The merge fields and who a part can be for, as a mailing to politicians offers them: two lords have no constituency. */
const mailingFields = [
  { id: "salutation", label: "salutation", lacking: 0 },
  { id: "name", label: "name", lacking: 0 },
  { id: "constituency", label: "constituency", lacking: 2 },
];
const mailingConditions = [
  {
    id: "frontier-ai-letter:signed",
    label: "signed the Frontier AI letter",
    covers: 12,
    group: "Frontier AI letter",
    option: "Signed",
  },
  {
    id: "edinburgh-conference-2026:going",
    label: "are going to the Edinburgh conference",
    covers: 3,
    group: "Edinburgh conference",
    option: "Going",
  },
  {
    id: "edinburgh-conference-2026:declined",
    label: "declined the Edinburgh conference",
    covers: 5,
    group: "Edinburgh conference",
    option: "Declined",
  },
];

/** An invitation with a salutation, and a thank-you only for those who signed. */
const mailingLetter: JSONContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Dear " },
        { type: "field", attrs: { field: "salutation" } },
        { type: "text", text: "," },
      ],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "I'm writing to invite you to our conference on AI safety in Edinburgh." }],
    },
    {
      type: "onlyFor",
      attrs: { condition: "frontier-ai-letter:signed" },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Thank you again for signing our open letter to the Prime Minister." }],
        },
      ],
    },
    { type: "paragraph", content: [{ type: "text", text: "Yours sincerely," }] },
  ],
};

export function MailingEditorExample() {
  const label = useId();
  return (
    <Controlled initial={mailingLetter} show={(doc) => JSON.stringify(doc)}>
      {(value, set) => (
        <>
          <p id={label}>Letter</p>
          <MailingEditor
            initial={value}
            onChange={set}
            fields={mailingFields}
            conditions={mailingConditions}
            labelledBy={label}
          />
        </>
      )}
    </Controlled>
  );
}

/** The mailing pages' actions, each logged; saves go through, as a draft's would. */
function mailingActions(log: (name: string) => (...args: unknown[]) => void) {
  let version = 3;
  const logged =
    <T,>(name: string, answer: T) =>
    async (...args: unknown[]) => {
      log(name)(...args);
      return answer;
    };
  return {
    save: async (...args: unknown[]) => {
      log("saveMailing")(...args);
      return { saved: true as const, version: ++version };
    },
    attach: logged("attachToMailing", {
      saved: true as const,
      version: 4,
      attachments: exampleWrittenMailing.attachments,
    }),
    detach: logged("detachFromMailing", { saved: true as const, version: 4, attachments: [] }),
    sendTest: logged("sendMailingTest", { sent: true as const, id: "example", to: "jo@pauseai.uk" }),
    schedule: logged("scheduleMailingNow", { scheduled: true as const }),
    deleteDraft: logged("deleteMailingDraft", undefined),
    stop: logged("stopMailingNow", undefined),
    reschedule: logged("rescheduleMailingNow", undefined),
  };
}

/** A draft just made, four ticked and nothing written, or Jo's draft of the mailing, with its actions logged. */
export function MailingWriterExample({ draft }: { draft: boolean }) {
  const data = draft ? exampleWriterData : examplePickedList;
  return (
    <Logged>
      {(log) => (
        <MailingWriter
          data={data}
          draft={draft ? exampleWrittenMailing : exampleFreshMailing}
          who={<FilterPills data={data} />}
          actions={mailingActions(log)}
        />
      )}
    </Logged>
  );
}

/** A mailing's page in each state but draft, or one imported from Airtable, with none. */
export function MailingViewExample({ state }: { state: "scheduled" | "sending" | "sent" | "imported" }) {
  return (
    <Logged>
      {(log) => (
        <MailingView
          mailing={state === "imported" ? exampleMailing : { ...exampleMailing, ...exampleMailings[0] }}
          written={state === "imported" ? undefined : { ...exampleWrittenMailing, state }}
          who={<FilterPills data={exampleWriterData} />}
          asks={exampleAsks}
          stop={log("stopMailingNow")}
          reschedule={log("rescheduleMailingNow")}
        />
      )}
    </Logged>
  );
}

/** The list of mailings, in its groups as of 30 October 2026: one sending, one scheduled, two drafts, and those sent; or none. */
export function MailingsOverviewExample({ empty = false }: { empty?: boolean }) {
  const now = "2026-10-30T12:00:00Z";
  const groups = empty
    ? []
    : mailingGroups(
        {
          drafts: [exampleDraft, { ...exampleDraft, id: 7, title: "" }],
          comingUp: [exampleScheduled, exampleSending],
          sent: [...exampleMailings, { ...exampleMailings[1], id: 9, sentAt: "2025-07-09T10:00:00Z" }],
        },
        new Date(now),
      );
  return <MailingsOverview groups={groups} now={now} />;
}

/**
 * The events page's table, on a tab, with a search or filters as typed,
 * (`params`), and its hosts, but without `hosts`, as staff who don't see
 * supporters have it; saving an event's edit form is logged, and with
 * `emailed`, says it emailed the owner chosen and Joseph, the owner before.
 */
export function EventsTableExample({
  params = {},
  emailed = false,
  hosts = true,
}: {
  params?: Parameters<typeof exampleEventsTab>[0];
  emailed?: boolean;
  hosts?: boolean;
}) {
  const { search, found } = exampleEventsTab(params);
  return (
    <Logged>
      {(log) => (
        <EventsTable
          found={found}
          search={search}
          staff={exampleStaff}
          now={exampleEventsNow}
          hosts={hosts}
          save={async (form) => {
            log("save")(form);
            const chosen = String(form.get("owner"));
            return emailed ? { emailed: [chosen, "joseph@pauseai.uk"], owner: chosen } : { emailed: [], owner: null };
          }}
        />
      )}
    </Logged>
  );
}

/** A note, open, that its × closes, and opens again. */
export function NoticeExample() {
  const [open, setOpen] = useState(true);
  return (
    <span role="status">
      {open ? (
        <Notice close="Close" onClose={() => setOpen(false)}>
          Emailed sean@pauseai.uk and joseph@pauseai.uk to let them know sean@pauseai.uk now owns this event.
        </Notice>
      ) : (
        <Button variant="ghost" size="small" fit onClick={() => setOpen(true)}>
          Open it again
        </Button>
      )}
    </span>
  );
}

/** One of a mailing's letters, with a reply, to the politician whose answer to its ask is set from it. */
export function MailingLetterViewExample() {
  return (
    <Logged>
      {(log) => (
        <LetterView
          letter={{ ...examplePauseaiLetterDetails, mailingAsk: exampleAsks[0]!.slug }}
          politician={{ ...examplePolitician, airtableId: null }}
          asks={exampleAsks}
          setStatus={log("setStatus")}
        >
          <LetterThread thread={exampleThread} link={<a href="#">Open in Gmail</a>} />
        </LetterView>
      )}
    </Logged>
  );
}

/**
 * A supporter's letter to a test MP, which bounced, as an email with Find
 * it in Gmail, beside its campaign's ask, which `ask` says whether it makes.
 */
export function SupporterLetterViewExample({ ask }: { ask: boolean }) {
  const letter = { ...exampleSupporterLetterDetails, campaignAsk: ask ? exampleAsks[0]!.slug : null };
  return (
    <Logged>
      {(log) => (
        <LetterView
          letter={letter}
          politician={{ ...examplePolitician, airtableId: null, isTest: true, statuses: {} }}
          asks={exampleAsks}
          setStatus={log("setStatus")}
        >
          <SupporterLetterThread letter={letter} link={<FindInGmail find={letter.gmail} />} />
        </LetterView>
      )}
    </Logged>
  );
}

/** Delete draft and Stop, for draft `id`, each page's own, so two on a page don't share a box. */
export function MailingButtonsExample({ id }: { id: number }) {
  return (
    <Logged>
      {(log) => (
        <ButtonRow>
          <DeleteDraft id={id} action={log("deleteMailingDraft")} />
          <StopMailing id={id} label={staffCopy.mailingPages.unschedule} action={log("stopMailingNow")} />
        </ButtonRow>
      )}
    </Logged>
  );
}

/** A mailing's day and hour, today with no hour chosen: the hours too soon can't be. */
export function DueTimeFieldsExample() {
  const [when, setWhen] = useState<{ day: string; hour: number | null }>({ day: "2026-10-16", hour: null });
  return <DueTimeFields day={when.day} hour={when.hour} onChange={(day, hour) => setWhen({ day, hour })} />;
}

/**
 * Change the time's form, for a mailing due in the new year: far enough
 * ahead that the page, rendered when the site is built, shows the same
 * day and hours as the browser does.
 */
export function ChangeTimeFormExample() {
  return (
    <Logged>
      {(log) => <ChangeTimeForm id={5} dueAt="2027-01-15T09:00:00Z" action={log("rescheduleMailingNow")} />}
    </Logged>
  );
}

/** A mailing's page as it stands: a draft, or one sent. */
export function MailingForExample({ kind }: { kind: "draft" | "written" }) {
  return (
    <Logged>
      {(log) => (
        <MailingFor
          data={
            kind === "draft"
              ? { kind, draft: exampleWrittenMailing, ...exampleWriterData }
              : {
                  kind,
                  mailing: exampleMailing,
                  written: { ...exampleWrittenMailing, state: "sent" },
                  filter: exampleWriterData.filter,
                  parties: exampleWriterData.parties,
                  asks: exampleAsks,
                  names: {},
                }
          }
          actions={mailingActions(log)}
        />
      )}
    </Logged>
  );
}

/** What choosing who a mailing is for does, each logged. */
function choosingActions(log: (name: string) => (...args: unknown[]) => void): ChoosingActions {
  const logged =
    (name: string) =>
    async (...args: unknown[]) =>
      log(name)(...args);
  return {
    pick: logged("pickPolitician"),
    pickFound: logged("pickFound"),
    paste: logged("pasteNames"),
    pickMany: logged("pickMany"),
    untickAll: logged("untickAll"),
  };
}

/** The politicians list, New mailing and the ticks logged. */
export function PoliticiansListExample(props: Omit<Parameters<typeof PoliticiansList>[0], "newMailing" | "actions">) {
  return (
    <Logged>
      {(log) => (
        <PoliticiansList
          {...props}
          newMailing={log("newMailing") as (form: FormData) => Promise<void>}
          actions={choosingActions(log)}
        />
      )}
    </Logged>
  );
}

/** The politicians list choosing who the draft "Edinburgh thank-you" goes to: Polly ticked, of the Commons. */
export function ChoosingListExample({ pasted = false }: { pasted?: boolean }) {
  return (
    <PoliticiansListExample
      list={examplePoliticiansPage}
      search={{
        ...emptyPoliticiansSearch,
        house: "commons",
        mailing: "12",
        ...(pasted && { tab: "pasted", pasted: examplePasted.map((one) => one.line) }),
      }}
      asks={exampleAsks}
      choosing={exampleChoosing}
      tickedHere={1}
      pasted={pasted ? examplePasted : []}
    />
  );
}

/** The strip over the list while it's choosing who a mailing is for: a new one's, or a draft's; Cancel logged. */
export function ChoosingHeadExample({ blank }: { blank: boolean }) {
  return (
    <Logged>
      {(log) => (
        <ChoosingHead
          choosing={{ ...exampleChoosing, blank }}
          cancel={log("deleteMailingDraft") as (form: FormData) => Promise<void>}
        >
          <h1>Politicians</h1>
        </ChoosingHead>
      )}
    </Logged>
  );
}

/** The box for names to paste, and Find these, logged; Ctrl+Enter or Cmd+Enter sends it too. */
export function PasteFormExample() {
  return (
    <Logged>
      {(log) => (
        <PasteForm action={log("pasteNames") as (form: FormData) => void} back="/staff/politicians?mailing=12" />
      )}
    </Logged>
  );
}

/** A tick box that saves as it's clicked: ticked, not, and part ticked, the click logged. */
export function PickBoxExample() {
  return (
    <Logged>
      {(log) => (
        <div style={{ display: "flex", gap: "var(--space-4)" }}>
          <PickBox ticked label="Ticked" action={async (on) => log("pick")(on)} />
          <PickBox ticked={false} label="Not ticked" action={async (on) => log("pick")(on)} />
          <PickBox ticked={false} some label="Some ticked" action={async (on) => log("pick")(on)} />
        </div>
      )}
    </Logged>
  );
}

/**
 * A mailing's files: a PDF, an image and a file of no kind to draw; with the
 * box for more, and each to take off. There's no mailing to serve them in the
 * gallery, so each shows the sheet with its kind.
 */
export function MailingFilesExample({ editable }: { editable: boolean }) {
  return (
    <Logged>
      {(log) => (
        <MailingFiles
          files={exampleWrittenMailing.attachments}
          base="/staff/mailings/12/files"
          onAdd={editable ? log("onAdd") : undefined}
          onRemove={editable ? log("onRemove") : undefined}
        />
      )}
    </Logged>
  );
}

/** Your Gmail on your own page, connected or not, Disconnect logged. */
export function MyGmailExample({ connected, outcome = "" }: { connected: boolean; outcome?: string }) {
  return (
    <Logged>
      {(log) => (
        <MyGmail
          me="jo@pauseai.uk"
          account={connected ? exampleGmailAccount : undefined}
          outcome={outcome}
          disconnect={log("disconnect")}
        />
      )}
    </Logged>
  );
}

/** An ask's form: a new one, one staff added, one answered, or one the code names; saves and deletes logged. */
export function AskFormExample({ ask, notice = "" }: { ask: "new" | "added" | "answered" | "fixed"; notice?: string }) {
  const asks = {
    new: null,
    added: exampleEditableAsk,
    answered: { ...exampleEditableAsk, kindFixed: true, deletable: false },
    fixed: {
      ...exampleEditableAsk,
      slug: "frontier-ai-letter",
      title: "Frontier AI letter",
      fixed: true,
      deletable: false,
    },
  };
  return (
    <Logged>
      {(log) => (
        <AskForm ask={asks[ask]} back="/staff/asks" notice={notice} save={log("save")} remove={log("delete")} />
      )}
    </Logged>
  );
}

/** A delete pressed twice, logged; and one that can't be pressed. */
export function DeleteTwiceExample() {
  return (
    <Logged>
      {(log) => (
        <>
          <DeleteTwice name="slug" value="winter-reception-dec-2026" label="Delete ask" action={log("delete")} />
          <DeleteTwice name="slug" value="frontier-ai-letter" label="Delete ask" disabled action={log("delete")} />
        </>
      )}
    </Logged>
  );
}
