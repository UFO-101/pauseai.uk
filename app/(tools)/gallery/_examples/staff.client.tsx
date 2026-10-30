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
  examplePoliticiansPage,
  examplePolitician,
  examplePoliticianHistory,
} from "@/app/(staff)/staff/_components/PoliticianTable.examples";
import { exampleLetter, examplePauseaiLetterDetails } from "@/app/(staff)/staff/_components/LettersTable.examples";
import Run from "@/app/(staff)/staff/_components/Run";
import AskRow, { OtherAsks } from "@/app/(staff)/staff/_components/AskRow";
import detailsStyles from "@/app/(staff)/staff/_components/Details.module.css";
import EraseForm from "@/app/(staff)/staff/_components/EraseForm";
import DeletePolitician from "@/app/(staff)/staff/_components/DeletePolitician";
import RemoveAccountForm from "@/app/(staff)/staff/_components/RemoveAccountForm";
import StaffAccountsTable from "@/app/(staff)/staff/_components/StaffAccountsTable";
import UnblockForm from "@/app/(staff)/staff/_components/UnblockForm";
import { exampleFailedRun, exampleHeldSync, exampleRun } from "@/app/(staff)/staff/_components/RunList.examples";
import type { JSONContent } from "@tiptap/react";
import { useId, useState } from "react";
import MailingEditor from "@/app/(staff)/staff/_components/MailingEditor";
import ButtonRow from "@/components/ui/ButtonRow";
import { staffCopy } from "@/lib/content/staff-interface";
import { ChangeTimeForm, DueTimeFields } from "@/app/(staff)/staff/_components/DueTime";
import { DeleteDraft, DeleteTwice, StopMailing } from "@/app/(staff)/staff/_components/MailingButtons";
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
import { exampleWriterData, exampleWrittenMailing } from "@/app/(staff)/staff/_components/MailingWriter.examples";
import MailingsOverview from "@/app/(staff)/staff/_components/MailingsOverview";
import MailingLetterView from "@/app/(staff)/staff/_components/MailingLetterView";
import LetterThread from "@/app/(staff)/staff/_components/LetterThread";
import { mailingGroups } from "@/lib/mailing-groups";
import {
  exampleDraft,
  exampleMailing,
  exampleMailings,
  exampleScheduled,
  exampleSending,
} from "@/app/(staff)/staff/_components/MailingsTable.examples";
import PoliticiansList from "@/app/(staff)/staff/_components/PoliticiansList";
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
 * no answer yet; then, with `others`, the button whose menu adds another.
 */
export function AskRowExample({ others = false }: { others?: boolean }) {
  const politician = { ...examplePolitician, airtableId: null };
  return (
    <Logged>
      {(log) => (
        <div className={detailsStyles.asks}>
          <AskRow politician={politician} ask={exampleAsks[0]!} setStatus={log("setStatus")} />
          <AskRow politician={politician} ask={exampleAsks[4]!} setStatus={log("setStatus")} />
          {others && <OtherAsks politician={politician} asks={exampleAsks.slice(3)} setStatus={log("setStatus")} />}
        </div>
      )}
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
                      campaignUrl: letter.campaignUrl,
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

export function RemoveAccountFormExample() {
  return (
    <Logged>
      {(log) => <RemoveAccountForm email="samuel.whitlock@pauseai.uk" remove={log("removeStaffAccount")} />}
    </Logged>
  );
}

export function DeletePoliticianExample() {
  return (
    <Logged>
      {(log) => (
        <DeletePolitician politician={{ id: 7, name: "Polly Placeholder" }} action={log("deletePoliticianNow")} />
      )}
    </Logged>
  );
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
    start: logged("startMailing", { id: 12, version: 1 }),
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

/** A new mailing, or Jo's draft of it, with its actions logged. */
export function MailingWriterExample({ draft }: { draft: boolean }) {
  return (
    <Logged>
      {(log) => (
        <MailingWriter
          data={exampleWriterData}
          draft={draft ? exampleWrittenMailing : null}
          who={<FilterPills data={exampleWriterData} />}
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

/** One of a mailing's letters, with a reply, to the politician whose answer to its ask is set from it. */
export function MailingLetterViewExample() {
  return (
    <Logged>
      {(log) => (
        <MailingLetterView
          letter={{ ...examplePauseaiLetterDetails, mailingAsk: exampleAsks[0]!.slug }}
          politician={{ ...examplePolitician, airtableId: null }}
          asks={exampleAsks}
          setStatus={log("setStatus")}
        >
          <LetterThread thread={exampleThread} link={<a href="#">Open in Gmail</a>} />
        </MailingLetterView>
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
                }
          }
          actions={mailingActions(log)}
        />
      )}
    </Logged>
  );
}

/** The politicians list, its Change who logged. */
export function PoliticiansListExample(props: Omit<Parameters<typeof PoliticiansList>[0], "changeWho">) {
  return (
    <Logged>
      {(log) => <PoliticiansList {...props} changeWho={log("changeMailingWho") as (form: FormData) => Promise<void>} />}
    </Logged>
  );
}

/** The politicians list after a draft's Change who: its button makes the draft go to these. */
export function ChangeWhoListExample() {
  return (
    <PoliticiansListExample
      list={examplePoliticiansPage}
      search={{ ...emptyPoliticiansSearch, house: "commons", mailing: "12" }}
      asks={exampleAsks}
    />
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
