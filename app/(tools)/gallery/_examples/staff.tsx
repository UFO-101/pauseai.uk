// The staff screens' parts (app/(staff)/staff/_components), and the page
// frame they're in, which sets the compact density, on fake
// politicians, letters, runs and changes. Their links go to /staff pages,
// which send anyone without a session to the login page.
import { Button } from "@/components/ui/Button";
import ChangesTable from "@/app/(staff)/staff/_components/ChangesTable";
import EmailBlockFilters from "@/app/(staff)/staff/_components/EmailBlockFilters";
import { exampleProblems } from "@/app/(staff)/staff/_components/EmailBlocksTable.examples";
import EmailProblemsTable from "@/app/(staff)/staff/_components/EmailProblemsTable";
import { exampleChange } from "@/app/(staff)/staff/_components/ChangesTable.examples";
import LetterFilters from "@/app/(staff)/staff/_components/LetterFilters";
import LettersTable from "@/app/(staff)/staff/_components/LettersTable";
import { exampleLetter } from "@/app/(staff)/staff/_components/LettersTable.examples";
import LoginCard from "@/app/(staff)/staff/_components/LoginCard";
import LoginForm from "@/app/(staff)/staff/_components/LoginForm";
import PoliticianFilters from "@/app/(staff)/staff/_components/PoliticianFilters";
import ResultBox, { OPEN_UP_TO } from "@/app/(staff)/staff/_components/ResultBox";
import Run from "@/app/(staff)/staff/_components/Run";
import RunBox from "@/app/(staff)/staff/_components/RunBox";
import RunFilters from "@/app/(staff)/staff/_components/RunFilters";
import RunList from "@/app/(staff)/staff/_components/RunList";
import {
  exampleAppliedSync,
  exampleControlAiResult,
  exampleFailedRun,
  exampleLumaResult,
  exampleRun,
  exampleSyncedMp,
} from "@/app/(staff)/staff/_components/RunList.examples";
import StaffHeader, { type StaffPage as StaffPageName } from "@/app/(staff)/staff/_components/StaffHeader";
import StaffPage from "@/app/(staff)/staff/_components/ui/StaffPage";
import { campaigns } from "@/lib/content/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import type { ImportJob } from "@/lib/import-runs";
import type { Group, Variant } from "../_components/types";
import {
  EmailBlocksTableExample,
  HeldSyncExample,
  JobActionsExample,
  PoliticianDetailsExample,
  PoliticianFormExample,
  PoliticianTableEmptyExample,
  PoliticianTableExample,
  UnblockFormExample,
} from "./staff.client";

const [pm] = campaigns;

// Every page the header can mark as current, so a new one is a type error until it's here.
const PAGES: Record<StaffPageName, true> = {
  politicians: true,
  letters: true,
  emails: true,
  import: true,
  history: true,
  changes: true,
};

// A run of each job, as its job's page shows it. A held MP sync, with its buttons, is in the client file.
const RUNS: Record<ImportJob, Variant> = {
  "sync-mps": {
    label: "An MP sync, held for a decision",
    render: () => (
      <StaffPage as="div">
        <HeldSyncExample />
      </StaffPage>
    ),
  },
  "check-mps": {
    label: "An MP check that found problems",
    render: () => (
      <StaffPage as="div">
        <Run
          run={exampleRun("check-mps", {
            problems: [
              { kind: "missing", constituency: "Seat 1", parliament: "MP 1" },
              { kind: "name", constituency: "Seat 2", airtable: "MP Two", parliament: "MP 2" },
              {
                kind: "email",
                constituency: "Seat 3",
                name: "MP 3",
                airtable: null,
                parliament: ["mp3@example.org"],
              },
            ],
          })}
        />
      </StaffPage>
    ),
  },
  "import-controlai": {
    label: "A read of ControlAI's letter, with names it couldn't place",
    render: () => (
      <StaffPage as="div">
        <Run
          run={exampleRun("import-controlai", {
            ...exampleControlAiResult,
            problems: [
              { name: "Baroness Nobody", kind: "nobody", candidates: [] },
              { name: "Lord Sample", kind: "several", candidates: ["Lord Sample", "Lord Sample of Elsewhere"] },
            ],
          })}
        />
      </StaffPage>
    ),
  },
  "import-luma": {
    label: "A Luma import cut short by its time",
    render: () => (
      <StaffPage as="div">
        <Run run={exampleRun("import-luma", { ...exampleLumaResult, eventsLeft: 4, stoppedBy: "time" })} />
      </StaffPage>
    ),
  },
  "import-signatories": {
    label: "A signatory import someone started",
    render: () => (
      <StaffPage as="div">
        <Run
          run={exampleRun(
            "import-signatories",
            { matched: 3, added: 7, alreadySet: 0 },
            { startedBy: "jo@pauseai.uk" },
          )}
        />
      </StaffPage>
    ),
  },
};

export const staff: Group = {
  id: "staff",
  title: "The staff interface",
  examples: [
    {
      name: "StaffPage",
      file: "app/(staff)/staff/_components/ui/StaffPage.tsx",
      variants: [
        {
          label: "A page's frame, at the compact density, with a heading and a line",
          render: () => (
            <StaffPage as="div">
              <h1>An example staff page</h1>
              <p>A line of text under its heading.</p>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "StaffHeader",
      file: "app/(staff)/staff/_components/StaffHeader.tsx",
      variants: [
        {
          label: "On the login page: the title alone",
          render: () => (
            <StaffPage as="div">
              <StaffHeader />
            </StaffPage>
          ),
        },
        {
          label: "Logged in, on each page",
          render: () => (
            <StaffPage as="div">
              <div style={{ display: "grid", gap: 24 }}>
                {(Object.keys(PAGES) as StaffPageName[]).map((current) => (
                  <StaffHeader key={current} email="jo@pauseai.uk" current={current} />
                ))}
              </div>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "LoginCard",
      file: "app/(staff)/staff/_components/LoginCard.tsx",
      variants: [
        {
          label: "Around the login form",
          render: () => (
            <StaffPage as="div">
              <LoginCard title={staffCopy.login.title}>
                <LoginForm />
              </LoginCard>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "LoginForm",
      file: "app/(staff)/staff/_components/LoginForm.tsx",
      variants: [
        {
          label: "After a failed link, and one opened in another browser",
          render: () => (
            <StaffPage as="div">
              <LoginCard title={staffCopy.login.title}>
                <LoginForm failed="1" elsewhere="1" />
              </LoginCard>
            </StaffPage>
          ),
        },
        {
          label: "The link sent",
          render: () => (
            <StaffPage as="div">
              <LoginCard title={staffCopy.login.title}>
                <LoginForm sent="1" />
              </LoginCard>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "PoliticianDetails",
      file: "app/(staff)/staff/_components/PoliticianDetails.tsx",
      variants: [
        {
          label: "A signer the team added, editable",
          render: () => (
            <StaffPage as="div">
              <PoliticianDetailsExample />
            </StaffPage>
          ),
        },
        {
          label: "An MP from Airtable, not editable here",
          render: () => (
            <StaffPage as="div">
              <PoliticianDetailsExample fromAirtable />
            </StaffPage>
          ),
        },
        {
          label: "An MP whose address bounced, with the form to unblock it",
          render: () => (
            <StaffPage as="div">
              <PoliticianDetailsExample fromAirtable blocked />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "JobActions",
      file: "app/(staff)/staff/_components/JobActions.tsx",
      variants: [
        {
          label: "A job's button and its history",
          render: () => (
            <StaffPage as="div">
              <JobActionsExample />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "PoliticianFilters",
      file: "app/(staff)/staff/_components/PoliticianFilters.tsx",
      variants: [
        {
          label: "Empty, and filled in",
          render: () => (
            <StaffPage as="div">
              <PoliticianFilters search="" house="" campaign="" email="" />
              <PoliticianFilters search="example" house="lords" campaign={pm.slug} email="blocked" />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "PoliticianTable",
      file: "app/(staff)/staff/_components/PoliticianTable.tsx",
      variants: [
        {
          label: "Signed and not, a test peer no longer sitting",
          render: () => (
            <StaffPage as="div">
              <PoliticianTableExample />
            </StaffPage>
          ),
        },
        {
          label: "Nobody matches",
          render: () => (
            <StaffPage as="div">
              <PoliticianTableEmptyExample />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "PoliticianForm",
      file: "app/(staff)/staff/_components/PoliticianForm.tsx",
      variants: [
        {
          label: "A peer with no constituency or email",
          render: () => (
            <StaffPage as="div">
              <PoliticianFormExample />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "EmailBlocksTable",
      file: "app/(staff)/staff/_components/EmailBlocksTable.tsx",
      variants: [
        {
          label: "An MP's address that bounced, and one that complained",
          render: () => (
            <StaffPage as="div">
              <EmailBlocksTableExample />
            </StaffPage>
          ),
        },
        {
          label: "None",
          render: () => (
            <StaffPage as="div">
              <EmailBlocksTableExample blocks={[]} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "UnblockForm",
      file: "app/(staff)/staff/_components/UnblockForm.tsx",
      variants: [
        {
          label: "For a bounce, and for a complaint, which can't be unblocked",
          render: () => (
            <StaffPage as="div">
              <UnblockFormExample />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "EmailBlockFilters",
      file: "app/(staff)/staff/_components/EmailBlockFilters.tsx",
      variants: [
        {
          label: "All, and complaints only",
          render: () => (
            <StaffPage as="div">
              <EmailBlockFilters kind="" />
              <EmailBlockFilters kind="complaint" />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "EmailProblemsTable",
      file: "app/(staff)/staff/_components/EmailProblemsTable.tsx",
      variants: [
        {
          label: "A letter's hard bounce, a forwarded reply's soft one, and a complaint about an email we didn't log",
          render: () => (
            <StaffPage as="div">
              <EmailProblemsTable problems={exampleProblems} />
            </StaffPage>
          ),
        },
        {
          label: "None",
          render: () => (
            <StaffPage as="div">
              <EmailProblemsTable problems={[]} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "LettersTable",
      file: "app/(staff)/staff/_components/LettersTable.tsx",
      variants: [
        {
          label: "A bounced letter to a test MP, a replied one, and one not sent as the MP's address was blocked",
          render: () => (
            <StaffPage as="div">
              <LettersTable
                letters={[
                  exampleLetter,
                  {
                    ...exampleLetter,
                    id: 2,
                    status: "replied",
                    senderName: "Example Sender",
                    senderEmail: "sender@example.org",
                    contactConsent: false,
                    mpName: "Polly Placeholder",
                    isTest: false,
                    repliedAt: "2026-10-13T09:00:00Z",
                    events: [
                      { at: "2026-10-12T09:00:00Z", status: "sending", details: {} },
                      { at: "2026-10-12T09:05:00Z", status: "sent", details: {} },
                    ],
                  },
                  {
                    ...exampleLetter,
                    id: 3,
                    status: "not_sent",
                    mpName: "Bouncy McTestface MP",
                    sentAt: null,
                    events: [
                      { at: "2026-10-12T09:00:00Z", status: "sending", details: {} },
                      { at: "2026-10-12T09:00:00Z", status: "not_sent", details: {} },
                    ],
                  },
                ]}
              />
            </StaffPage>
          ),
        },
        {
          label: "None",
          render: () => (
            <StaffPage as="div">
              <LettersTable letters={[]} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "ChangesTable",
      file: "app/(staff)/staff/_components/ChangesTable.tsx",
      variants: [
        {
          label: "Who changed what",
          render: () => (
            <StaffPage as="div">
              <ChangesTable
                changes={[
                  exampleChange,
                  {
                    id: 2,
                    at: "2026-10-12T02:00:00Z",
                    actor: "sync",
                    action: "apply MP sync",
                    details: { id: 3 },
                  },
                ]}
              />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "ResultBox",
      file: "app/(staff)/staff/_components/ResultBox.tsx",
      variants: [
        {
          label: "One line",
          render: () => (
            <StaffPage as="div">
              <ResultBox summary="An example result, in one line" />
            </StaffPage>
          ),
        },
        {
          label: "A few lines open under it, with buttons",
          render: () => (
            <StaffPage as="div">
              <ResultBox
                summary="An example result with detail"
                lines={2}
                actions={
                  <>
                    <Button variant="primary" size="small" fit>
                      {staffCopy.syncs.apply}
                    </Button>
                    <Button variant="ghost" size="small" fit>
                      {staffCopy.syncs.discard}
                    </Button>
                  </>
                }
              >
                <ul>
                  <li>A line of detail</li>
                  <li>Another line</li>
                </ul>
              </ResultBox>
            </StaffPage>
          ),
        },
        {
          label: "Many lines, folded; and an error",
          render: () => (
            <StaffPage as="div">
              <ResultBox summary="An example result with a lot of detail" lines={OPEN_UP_TO + 1}>
                <p>Folded detail</p>
              </ResultBox>
              <ResultBox summary="An example failure" error />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "Run",
      file: "app/(staff)/staff/_components/Run.tsx",
      variants: [
        ...Object.values(RUNS),
        {
          label: "A run that failed",
          render: () => (
            <StaffPage as="div">
              <Run run={exampleFailedRun("import-signatories", "An example error", { id: 4 })} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "RunBox",
      file: "app/(staff)/staff/_components/RunBox.tsx",
      variants: [
        {
          label: "A run, its job named, with detail",
          render: () => (
            <StaffPage as="div">
              <RunBox run={exampleAppliedSync} label="An example job" summary="an example summary" lines={1}>
                <p>Detail</p>
              </RunBox>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "RunList",
      file: "app/(staff)/staff/_components/RunList.tsx",
      variants: [
        {
          label: "The history page: each job named, each day headed",
          render: () => (
            <StaffPage as="div">
              <RunList
                history
                none="None"
                runs={[
                  exampleRun("check-mps", { problems: [] }, { id: 7, at: "2026-11-03T01:00:00Z" }),
                  exampleRun("import-controlai", exampleControlAiResult, { id: 8, at: "2026-11-02T02:00:00Z" }),
                  exampleRun(
                    "sync-mps",
                    { changes: { added: [exampleSyncedMp(5)], removed: [], changed: [] } },
                    { id: 6, at: "2026-11-02T00:30:00Z", status: "discarded", decidedBy: "jo@pauseai.uk" },
                  ),
                  exampleAppliedSync,
                ]}
              />
            </StaffPage>
          ),
        },
        {
          label: "None",
          render: () => (
            <StaffPage as="div">
              <RunList runs={[]} none="An example line saying there are none." />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "LetterFilters",
      file: "app/(staff)/staff/_components/LetterFilters.tsx",
      variants: [
        {
          label: "One status picked",
          render: () => (
            <StaffPage as="div">
              <LetterFilters status="bounced" />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "RunFilters",
      file: "app/(staff)/staff/_components/RunFilters.tsx",
      variants: [
        {
          label: "One job picked",
          render: () => (
            <StaffPage as="div">
              <RunFilters job="check-mps" />
            </StaffPage>
          ),
        },
      ],
    },
  ],
};
