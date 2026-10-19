"use client";

// The staff screens' examples whose Server Actions are props: client
// components with no props, each action logged rather than sent.
import { campaigns } from "@/lib/content/email-your-mp";
import type { Politician } from "@/lib/server/politicians";
import EmailBlocksTable from "@/app/(staff)/staff/_components/EmailBlocksTable";
import { exampleBlock, exampleComplaint } from "@/app/(staff)/staff/_components/EmailBlocksTable.examples";
import JobActions from "@/app/(staff)/staff/_components/JobActions";
import PoliticianDetails from "@/app/(staff)/staff/_components/PoliticianDetails";
import PoliticianForm from "@/app/(staff)/staff/_components/PoliticianForm";
import PoliticianTable from "@/app/(staff)/staff/_components/PoliticianTable";
import { examplePolitician } from "@/app/(staff)/staff/_components/PoliticianTable.examples";
import Run from "@/app/(staff)/staff/_components/Run";
import UnblockForm from "@/app/(staff)/staff/_components/UnblockForm";
import { exampleHeldSync } from "@/app/(staff)/staff/_components/RunList.examples";
import { Logged } from "../_components/wiring";

const [pm, bill] = campaigns;

/** The form for a peer added by an import: no constituency, no email. */
export function PoliticianFormExample() {
  return (
    <Logged>
      {(log) => (
        <PoliticianForm
          action={log("action")}
          politician={{
            ...examplePolitician,
            id: 9,
            airtableId: null,
            house: "lords",
            name: "Lord Example",
            salutation: "Lord Example",
            constituency: null,
            party: "Crossbench",
            email: null,
          }}
        />
      )}
    </Logged>
  );
}

/** The table of politicians, its marks as signed logged: one function for both examples, so pressing one covers it. */
function LoggedPoliticianTable({ politicians }: { politicians: Politician[] }) {
  return <Logged>{(log) => <PoliticianTable politicians={politicians} markSigned={log("markSigned")} />}</Logged>;
}

/** An MP who signed the letter to the PM, and a test peer, no longer sitting, whose address is blocked, who signed ControlAI's letter. */
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
          sitting: false,
          emailBlocked: true,
          house: "lords",
          constituency: null,
          statuses: { [bill.slug]: { ...examplePolitician.statuses[pm.slug], updatedBy: "controlai" } },
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
}: {
  fromAirtable?: boolean;
  blocked?: boolean;
}) {
  return (
    <Logged>
      {(log) => (
        <PoliticianDetails
          politician={
            fromAirtable ? { ...examplePolitician, emailBlocked: blocked } : { ...examplePolitician, airtableId: null }
          }
          action={log("action")}
          block={blocked ? { ...exampleBlock, address: examplePolitician.email! } : undefined}
          unblock={log("unblock")}
        />
      )}
    </Logged>
  );
}

/** The blocked addresses, a bounce and a complaint, their unblocking logged. */
export function EmailBlocksTableExample() {
  return (
    <Logged>{(log) => <EmailBlocksTable blocks={[exampleBlock, exampleComplaint]} unblock={log("unblock")} />}</Logged>
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

/** An import's button, its runs logged, and the link to its history. */
export function JobActionsExample() {
  return <Logged>{(log) => <JobActions action={log("action")} label="Check now" job="check-mps" />}</Logged>;
}
