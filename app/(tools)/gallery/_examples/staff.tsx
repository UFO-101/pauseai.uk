// The staff screens' parts (app/(staff)/staff/_components), on fake
// politicians, letters, runs and changes. Their links go to /staff pages,
// which send anyone without a session to the login page.
import { Button } from "@/components/ui/Button";
import ChangesTable from "@/app/(staff)/staff/_components/ChangesTable";
import { exampleChange } from "@/app/(staff)/staff/_components/ChangesTable.examples";
import LettersTable from "@/app/(staff)/staff/_components/LettersTable";
import { exampleLetter } from "@/app/(staff)/staff/_components/LettersTable.examples";
import LoginCard from "@/app/(staff)/staff/_components/LoginCard";
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
  exampleRun,
  exampleSyncedMp,
} from "@/app/(staff)/staff/_components/RunList.examples";
import StaffHeader, { type StaffPage } from "@/app/(staff)/staff/_components/StaffHeader";
import ErrorText from "@/app/(staff)/staff/_components/ui/ErrorText";
import { StaffForm } from "@/app/(staff)/staff/_components/ui/forms";
import { campaigns } from "@/lib/content/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import type { ImportJob } from "@/lib/import-runs";
import type { Group, Variant } from "../_components/types";
import {
  HeldSyncExample,
  PoliticianFormExample,
  PoliticianTableEmptyExample,
  PoliticianTableExample,
} from "./staff.client";

const [pm] = campaigns;

// Every page the header can mark as current, so a new one is a type error until it's here.
const PAGES: Record<StaffPage, true> = { politicians: true, letters: true, import: true, history: true, changes: true };

// A run of each job, as its job's page shows it. A held MP sync, with its buttons, is in the client file.
const RUNS: Record<ImportJob, Variant> = {
  "sync-mps": {
    label: "An MP sync, held for a decision",
    render: () => (
      <div className="container">
        <HeldSyncExample />
      </div>
    ),
  },
  "check-mps": {
    label: "An MP check that found problems",
    render: () => (
      <div className="container">
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
      </div>
    ),
  },
  "import-controlai": {
    label: "A read of ControlAI's letter, with names it couldn't place",
    render: () => (
      <div className="container">
        <Run
          run={exampleRun("import-controlai", {
            ...exampleControlAiResult,
            problems: [
              { name: "Baroness Nobody", kind: "nobody", candidates: [] },
              { name: "Lord Sample", kind: "several", candidates: ["Lord Sample", "Lord Sample of Elsewhere"] },
            ],
          })}
        />
      </div>
    ),
  },
  "import-signatories": {
    label: "A signatory import someone started",
    render: () => (
      <div className="container">
        <Run
          run={exampleRun(
            "import-signatories",
            { matched: 3, added: 7, alreadySet: 0 },
            { startedBy: "jo@pauseai.uk" },
          )}
        />
      </div>
    ),
  },
};

export const staff: Group = {
  id: "staff",
  title: "The staff interface",
  examples: [
    {
      name: "StaffHeader",
      file: "app/(staff)/staff/_components/StaffHeader.tsx",
      variants: [
        { label: "On the login page: the title alone", render: () => <StaffHeader /> },
        {
          label: "Logged in, on each page",
          render: () => (
            <div style={{ display: "grid", gap: 24 }}>
              {(Object.keys(PAGES) as StaffPage[]).map((current) => (
                <StaffHeader key={current} email="jo@pauseai.uk" current={current} />
              ))}
            </div>
          ),
        },
      ],
    },
    {
      name: "LoginCard",
      file: "app/(staff)/staff/_components/LoginCard.tsx",
      variants: [
        {
          label: "The login form, after a failed link",
          render: () => (
            <div className="container">
              <LoginCard title={staffCopy.login.title}>
                <p>{staffCopy.login.intro}</p>
                <p>
                  <ErrorText>{staffCopy.login.failed}</ErrorText>
                </p>
                <StaffForm method="post" action="/staff/api/login">
                  <label>
                    {staffCopy.login.emailLabel}
                    <input name="email" type="email" autoComplete="email" required />
                  </label>
                  <div>
                    <Button variant="primary" size="small" fit type="submit">
                      {staffCopy.login.button}
                    </Button>
                  </div>
                </StaffForm>
              </LoginCard>
            </div>
          ),
        },
        {
          label: "The link sent",
          render: () => (
            <div className="container">
              <LoginCard title={staffCopy.login.title}>
                <p role="status">{staffCopy.login.sent}</p>
              </LoginCard>
            </div>
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
            <div className="container">
              <PoliticianFilters search="" house="" campaign="" />
              <PoliticianFilters search="example" house="lords" campaign={pm.slug} />
            </div>
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
            <div className="container">
              <PoliticianTableExample />
            </div>
          ),
        },
        {
          label: "Nobody matches",
          render: () => (
            <div className="container">
              <PoliticianTableEmptyExample />
            </div>
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
            <div className="container">
              <PoliticianFormExample />
            </div>
          ),
        },
      ],
    },
    {
      name: "LettersTable",
      file: "app/(staff)/staff/_components/LettersTable.tsx",
      variants: [
        {
          label: "A bounced letter to a test MP, and a replied one",
          render: () => (
            <div className="container">
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
                ]}
              />
            </div>
          ),
        },
        {
          label: "None",
          render: () => (
            <div className="container">
              <LettersTable letters={[]} />
            </div>
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
            <div className="container">
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
            </div>
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
            <div className="container">
              <ResultBox summary="An example result, in one line" />
            </div>
          ),
        },
        {
          label: "A few lines open under it, with buttons",
          render: () => (
            <div className="container">
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
            </div>
          ),
        },
        {
          label: "Many lines, folded; and an error",
          render: () => (
            <div className="container">
              <ResultBox summary="An example result with a lot of detail" lines={OPEN_UP_TO + 1}>
                <p>Folded detail</p>
              </ResultBox>
              <ResultBox summary="An example failure" error />
            </div>
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
            <div className="container">
              <Run run={exampleFailedRun("import-signatories", "An example error", { id: 4 })} />
            </div>
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
            <div className="container">
              <RunBox run={exampleAppliedSync} label="An example job" summary="an example summary" lines={1}>
                <p>Detail</p>
              </RunBox>
            </div>
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
            <div className="container">
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
            </div>
          ),
        },
        {
          label: "None",
          render: () => (
            <div className="container">
              <RunList runs={[]} none="An example line saying there are none." />
            </div>
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
            <div className="container">
              <RunFilters job="check-mps" />
            </div>
          ),
        },
      ],
    },
  ],
};
