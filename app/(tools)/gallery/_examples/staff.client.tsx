"use client";

// The staff screens' examples whose Server Actions are props: client
// components with no props, each action logged rather than sent.
import type { EmailBlock } from "@/lib/server/email";
import type { Politician } from "@/lib/server/politicians";
import EmailBlocksTable from "@/app/(staff)/staff/_components/EmailBlocksTable";
import { exampleBlock, exampleComplaint } from "@/app/(staff)/staff/_components/EmailBlocksTable.examples";
import { ImportJobPage } from "@/app/(staff)/staff/_components/ImportJob";
import JobActions from "@/app/(staff)/staff/_components/JobActions";
import PoliticianDetails from "@/app/(staff)/staff/_components/PoliticianDetails";
import PoliticianTable from "@/app/(staff)/staff/_components/PoliticianTable";
import {
  exampleAsks,
  examplePolitician,
  examplePoliticianHistory,
} from "@/app/(staff)/staff/_components/PoliticianTable.examples";
import { exampleLetter } from "@/app/(staff)/staff/_components/LettersTable.examples";
import Run from "@/app/(staff)/staff/_components/Run";
import EraseForm from "@/app/(staff)/staff/_components/EraseForm";
import DeletePolitician from "@/app/(staff)/staff/_components/DeletePolitician";
import RemoveAccountForm from "@/app/(staff)/staff/_components/RemoveAccountForm";
import StaffAccountsTable from "@/app/(staff)/staff/_components/StaffAccountsTable";
import UnblockForm from "@/app/(staff)/staff/_components/UnblockForm";
import { exampleFailedRun, exampleHeldSync, exampleRun } from "@/app/(staff)/staff/_components/RunList.examples";
import { Logged } from "../_components/wiring";

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
  blocks = [exampleBlock, exampleComplaint],
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
              email: "sam@pauseai.uk",
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
  return <Logged>{(log) => <RemoveAccountForm email="sam@pauseai.uk" remove={log("removeStaffAccount")} />}</Logged>;
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
