import SentEmails from "@/app/(staff)/staff/_components/SentEmails";
import { exampleOldLettersResult, exampleSentEmails } from "@/app/(staff)/staff/_components/CampaignPages.examples";
// The staff interface's dashboard, imports, audit log, accounts, login and
// Gmail, on fake runs and changes.
// Their links go to /staff pages, which send anyone without a session to the
// login page.
import { Button } from "@/components/ui/Button";
import ChangesTable from "@/app/(staff)/staff/_components/ChangesTable";
import { exampleChanges } from "@/app/(staff)/staff/_components/ChangesTable.examples";
import AuditDetail, { FieldChanges } from "@/app/(staff)/staff/_components/AuditDetail";
import { DotParts, LoggedJson } from "@/app/(staff)/staff/_components/Logged";
import DevLogin from "@/app/(staff)/staff/_components/DevLogin";
import LoginCard from "@/app/(staff)/staff/_components/LoginCard";
import LoginForm from "@/app/(staff)/staff/_components/LoginForm";
import ResultBox, { OPEN_UP_TO } from "@/app/(staff)/staff/_components/ResultBox";
import Run from "@/app/(staff)/staff/_components/Run";
import RunBox from "@/app/(staff)/staff/_components/RunBox";
import { ImportOverview } from "@/app/(staff)/staff/_components/ImportJob";
import CountsByMailing from "@/app/(staff)/staff/_components/CountsByMailing";
import OldLettersProgressBar from "@/app/(staff)/staff/_components/OldLettersProgressBar";
import RunList from "@/app/(staff)/staff/_components/RunList";
import RunRows from "@/app/(staff)/staff/_components/RunRows";
import {
  exampleAppliedSync,
  exampleControlAiResult,
  exampleEmailsResult,
  exampleFailedRun,
  exampleGoToParliamentResult,
  exampleLumaResult,
  exampleDisconnectedGmail,
  exampleGmailResult,
  exampleLettersInboxRead,
  exampleMembersResult,
  exampleRun,
  exampleSendingResult,
  exampleSyncedMp,
  exampleTidyingResult,
  exampleWebFormResult,
} from "@/app/(staff)/staff/_components/RunList.examples";
import AccountsNotice from "@/app/(staff)/staff/_components/AccountsNotice";
import ImportCard, { ImportCards } from "@/app/(staff)/staff/_components/ImportCard";
import ImportIcon from "@/app/(staff)/staff/_components/ImportIcon";
import KeepSignedIn from "@/app/(staff)/staff/_components/KeepSignedIn";
import StaffDashboard from "@/app/(staff)/staff/_components/StaffDashboard";
import StaffHome from "@/app/(staff)/staff/_components/StaffHome";
import StaffSessions from "@/app/(staff)/staff/_components/StaffSessions";
import { exampleDashboard, exampleQuietDashboard } from "@/app/(staff)/staff/_components/StaffDashboard.examples";
import Sparkline from "@/app/(staff)/staff/_components/Sparkline";
import PermissionTiles from "@/app/(staff)/staff/_components/PermissionTiles";
import {
  exampleBlockedPermissions,
  exampleMemberDetails,
  exampleSupporterDetails,
} from "@/app/(staff)/staff/_components/SupportersTable.examples";
import StaffPage from "@/app/(staff)/staff/_components/ui/StaffPage";
import Tag from "@/components/ui/Tag";
import { GmailConnect, GmailOutcome, SentToday } from "@/app/(staff)/staff/_components/GmailConnect";
import AccountTitle from "@/app/(staff)/staff/_components/AccountTitle";
import { staffCopy } from "@/lib/content/staff-interface";
import type { ImportJob } from "@/lib/import-runs";
import type { Group, Variant } from "../_components/types";
import {
  HeldSyncExample,
  ImportJobPageExample,
  JobActionsExample,
  StaffAccountsTableExample,
  AddStaffExample,
  MyGmailExample,
} from "./staff.client";

// A run of each job, as its job's page shows it. A held politician sync, with its buttons, is in the client file.
const RUNS: Record<ImportJob, Variant> = {
  "sync-politicians": {
    label: "A politician sync, held for a decision",
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
    label: "A Luma import cut short by its time, and one that changed hosts and looked up places",
    render: () => (
      <StaffPage as="div">
        <Run run={exampleRun("import-luma", { ...exampleLumaResult, eventsLeft: 4, stoppedBy: "time" })} />
        <Run
          run={exampleRun(
            "import-luma",
            {
              ...exampleLumaResult,
              hostsChanged: 1,
              contactPages: 10,
              places: { postcodes: 12, towns: 3, failed: false },
            },
            { id: 2 },
          )}
        />
      </StaffPage>
    ),
  },
  "import-members": {
    label: "A members import that found new members",
    render: () => (
      <StaffPage as="div">
        <Run run={exampleRun("import-members", exampleMembersResult)} />
      </StaffPage>
    ),
  },
  "read-gmail": {
    label:
      "A read of Gmail, one account unread; one that disconnected an account; one with mail in the letters inbox not understood",
    render: () => (
      <StaffPage as="div">
        <Run run={exampleRun("read-gmail", exampleGmailResult)} open />
        <Run run={exampleRun("read-gmail", { accounts: [exampleLettersInboxRead] }, { id: 4 })} open />
        <Run
          run={exampleRun(
            "read-gmail",
            { accounts: [exampleGmailResult.accounts[0], exampleDisconnectedGmail] },
            { id: 3 },
          )}
          open
        />
        <Run
          run={exampleRun(
            "read-gmail",
            { accounts: [{ ...exampleGmailResult.accounts[0], restarted: true }] },
            { id: 2, startedBy: "jo@pauseai.uk" },
          )}
        />
      </StaffPage>
    ),
  },
  "import-web-form-letters": {
    label: "The web form letters, imported by someone",
    render: () => (
      <StaffPage as="div">
        <Run run={exampleRun("import-web-form-letters", exampleWebFormResult, { startedBy: "jo@pauseai.uk" })} />
      </StaffPage>
    ),
  },
  "import-go-to-parliament": {
    label: "Go to Parliament's meetings, imported by someone",
    render: () => (
      <StaffPage as="div">
        <Run run={exampleRun("import-go-to-parliament", exampleGoToParliamentResult, { startedBy: "jo@pauseai.uk" })} />
      </StaffPage>
    ),
  },
  "send-mailings": {
    label: "An hour's sending",
    render: () => (
      <StaffPage as="div">
        <Run run={exampleRun("send-mailings", exampleSendingResult)} open />
      </StaffPage>
    ),
  },
  "tidy-logs": {
    label: "A night's tidying",
    render: () => (
      <StaffPage as="div">
        <Run run={exampleRun("tidy-logs", exampleTidyingResult)} open />
      </StaffPage>
    ),
  },
  "import-old-letters": {
    label: "A press of the import of old letters, with more to read; one that Gmail stopped; hiding who mail is from",
    render: () => (
      <StaffPage as="div">
        <Run
          run={exampleRun("import-old-letters", exampleOldLettersResult, { startedBy: "jo@pauseai.uk" })}
          open
          people
        />
        <Run
          run={exampleRun(
            "import-old-letters",
            {
              ...exampleOldLettersResult,
              stoppedBy: "gmail",
              stoppedWhy: "Gmail answered 403 for /messages/1a2b: Too many",
            },
            { id: 2, startedBy: "jo@pauseai.uk" },
          )}
          open
        />
      </StaffPage>
    ),
  },
  "sync-emails": {
    label: "PauseAI's emails, some held back",
    render: () => (
      <StaffPage as="div">
        <Run run={exampleRun("sync-emails", exampleEmailsResult)} />
      </StaffPage>
    ),
  },
};

export const staffAdmin: Group = {
  id: "staff-admin",
  title: "The staff interface: admin and accounts",
  examples: [
    {
      name: "SentEmails",
      file: "app/(staff)/staff/_components/SentEmails.tsx",
      variants: [
        {
          label: "A letter, one bounced, an imported mailing and a sign-in",
          render: () => (
            <StaffPage as="div">
              <SentEmails
                emails={exampleSentEmails}
                total={4}
                pages={1}
                page={1}
                pageSize={100}
                search={{ q: "", purpose: [], outcome: [], backend: [], link: [], sort: "", dir: "", page: "" }}
              />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "PermissionTiles",
      file: "app/(staff)/staff/_components/PermissionTiles.tsx",
      variants: [
        {
          label: "Will and won't email, by topic, and a phone number we may not use",
          render: () => (
            <StaffPage as="div">
              <PermissionTiles permissions={exampleSupporterDetails.permissions} />
            </StaffPage>
          ),
        },
        {
          label: "A contact of the calendar since its webhook, and don't know of the updates",
          render: () => (
            <StaffPage as="div">
              <PermissionTiles
                permissions={[
                  {
                    topic: "luma-calendar",
                    channel: "email",
                    address: "nia@example.com",
                    send: "yes",
                    reason: "following",
                    at: "2026-10-23T09:00:00Z",
                    source: "luma",
                  },
                  ...exampleMemberDetails.permissions.slice(1).map((p) => ({ ...p, address: "nia@example.com" })),
                ]}
              />
            </StaffPage>
          ),
        },
        {
          label: "A volunteer's phone number",
          render: () => (
            <StaffPage as="div">
              <PermissionTiles permissions={exampleMemberDetails.permissions.slice(2)} />
            </StaffPage>
          ),
        },
        {
          label: "A blocked address",
          render: () => (
            <StaffPage as="div">
              <PermissionTiles permissions={exampleBlockedPermissions} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "StaffDashboard",
      file: "app/(staff)/staff/_components/StaffDashboard.tsx",
      variants: [
        {
          label: "A busy week with something waiting of each kind, for someone who may see supporters",
          render: () => (
            <StaffPage as="div">
              <StaffDashboard dashboard={exampleDashboard} permissions={["supporters"]} />
            </StaffPage>
          ),
        },
        {
          label: "For someone who may not: the supporter tiles aren't links",
          render: () => (
            <StaffPage as="div">
              <StaffDashboard dashboard={exampleDashboard} permissions={[]} />
            </StaffPage>
          ),
        },
        {
          label: "A quiet month: nothing waiting, nothing counted",
          render: () => (
            <StaffPage as="div">
              <StaffDashboard dashboard={exampleQuietDashboard} permissions={["supporters"]} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "Sparkline",
      file: "app/(staff)/staff/_components/Sparkline.tsx",
      variants: [
        {
          label: "Eight weeks of registrations: point at it for a week's count",
          render: () => (
            <StaffPage as="div">
              <div style={{ maxWidth: "24rem" }}>
                <Sparkline
                  name="Event registrations, the last eight weeks"
                  values={exampleDashboard.series.eventRegistrations.map((point) => point.count)}
                  labels={exampleDashboard.series.eventRegistrations.map(
                    (point) => `From ${point.from.slice(0, 10)}: ${point.count}`,
                  )}
                  from={exampleDashboard.series.eventRegistrations[0].from.slice(0, 10)}
                  to={exampleDashboard.asOf.slice(0, 10)}
                />
              </div>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "StaffHome",
      file: "app/(staff)/staff/_components/StaffHome.tsx",
      variants: [
        {
          label: "For an admin: the dashboard",
          render: () => (
            <StaffPage as="div">
              <StaffHome permissions={["admin", "supporters"]} dashboard={exampleDashboard} />
            </StaffPage>
          ),
        },
        {
          label: "For someone with no permissions: the dashboard, its supporter tiles not links",
          render: () => (
            <StaffPage as="div">
              <StaffHome permissions={[]} dashboard={exampleDashboard} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "AccountTitle",
      file: "app/(staff)/staff/_components/AccountTitle.tsx",
      variants: [
        {
          label: "Your own page's title, and your address",
          render: () => (
            <StaffPage as="div">
              <AccountTitle email="jo@pauseai.uk" />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "MyGmail",
      file: "app/(staff)/staff/_components/MyGmail.tsx",
      variants: [
        {
          label: "Not connected: what connecting means, and the button",
          render: () => (
            <StaffPage as="div">
              <MyGmailExample connected={false} />
            </StaffPage>
          ),
        },
        {
          label: "Just connected, with today's sends, and Disconnect",
          render: () => (
            <StaffPage as="div">
              <MyGmailExample connected outcome="connected" />
            </StaffPage>
          ),
        },
        {
          label: "Connecting failed: the error, then what connecting means again",
          render: () => (
            <StaffPage as="div">
              <MyGmailExample connected={false} outcome="failed" />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "GmailConnect",
      file: "app/(staff)/staff/_components/GmailConnect.tsx",
      variants: [
        {
          label: "What connecting means, said before going to Google",
          render: () => (
            <StaffPage as="div">
              <GmailConnect back="/staff/mailings/12" />
            </StaffPage>
          ),
        },
        {
          label: "The same for the letters inbox: what it does with supporters' letters, and its own limit",
          render: () => (
            <StaffPage as="div">
              <GmailConnect back="/staff/me" lettersInbox />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "SentToday",
      file: "app/(staff)/staff/_components/GmailConnect.tsx",
      variants: [
        {
          label: "An account's sends against today's limit",
          render: () => (
            <StaffPage as="div">
              <SentToday sent={120} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "GmailOutcome",
      file: "app/(staff)/staff/_components/GmailConnect.tsx",
      variants: (["connected", "other-account", "refused", "failed"] as const).map((outcome) => ({
        label: `Back from Google: ${outcome}`,
        render: () => (
          <StaffPage as="div">
            <GmailOutcome outcome={outcome} me="jo@pauseai.uk" />
          </StaffPage>
        ),
      })),
    },
    {
      name: "StaffSessions",
      file: "app/(staff)/staff/_components/StaffSessions.tsx",
      variants: [
        {
          label: "Three sessions: this browser's, a kept one on a phone, and one from a browser we can't name",
          render: () => (
            <StaffPage as="div">
              <StaffSessions
                sessions={[
                  {
                    id: "session-1",
                    userAgent:
                      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",

                    startedAt: "2026-10-22T09:00:00Z",
                    expiresAt: "2026-10-23T09:00:00Z",
                    remember: false,
                    current: true,
                  },
                  {
                    id: "session-2",
                    userAgent:
                      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1",

                    startedAt: "2026-10-20T08:00:00Z",
                    expiresAt: "2026-11-21T08:00:00Z",
                    remember: true,
                    current: false,
                  },
                  {
                    id: "session-3",
                    userAgent: null,

                    startedAt: "2026-10-19T18:30:00Z",
                    expiresAt: "2026-10-20T18:30:00Z",
                    remember: false,
                    current: false,
                  },
                ]}
              />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "StaffAccountsTable",
      file: "app/(staff)/staff/_components/StaffAccountsTable.tsx",
      variants: [
        {
          label: "Three accounts, each's permissions by name with Edit, Remove pressed twice, and what removing does",
          render: () => (
            <StaffPage as="div">
              <StaffAccountsTableExample />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "AddStaff",
      file: "app/(staff)/staff/_components/StaffAccountsTable.tsx",
      variants: [
        {
          label: "At the page's top right: press it for the box to add someone",
          render: () => (
            <StaffPage as="div">
              <AddStaffExample />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "AccountsNotice",
      file: "app/(staff)/staff/_components/AccountsNotice.tsx",
      variants: [
        {
          label: "A change refused: the last admin",
          render: () => (
            <StaffPage as="div">
              <AccountsNotice notice="last-admin" />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "KeepSignedIn",
      file: "app/(staff)/staff/_components/KeepSignedIn.tsx",
      variants: [
        {
          label: "The login form's box, unticked",
          render: () => (
            <StaffPage as="div">
              <KeepSignedIn />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "ImportIcon",
      file: "app/(staff)/staff/_components/ImportIcon.tsx",
      variants: [
        {
          label: "Each source",
          render: () => (
            <StaffPage as="div">
              <div style={{ display: "flex", gap: "var(--space-3)" }}>
                {(["airtable", "luma", "gmail", "web", "database"] as const).map((source) => (
                  <ImportIcon key={source} source={source} />
                ))}
              </div>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "ImportCards",
      file: "app/(staff)/staff/_components/ImportCard.tsx",
      variants: [
        {
          label: "Two cards in the grid",
          render: () => (
            <StaffPage as="div">
              <ImportCards>
                <ImportCard
                  title="An import"
                  href="/staff/import-data/signatories"
                  icon={<ImportIcon source="web" />}
                  tags={<Tag>Check only</Tag>}
                  intro="What it copies, and from where."
                >
                  <p>
                    <Tag tone="green">Done</Tag> 2026-10-15 02:00
                  </p>
                </ImportCard>
                <ImportCard
                  title="Another"
                  href="/staff/import-data/luma"
                  icon={<ImportIcon source="luma" />}
                  intro="Never run."
                >
                  <p>Not imported yet.</p>
                </ImportCard>
              </ImportCards>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "ImportCard",
      file: "app/(staff)/staff/_components/ImportCard.tsx",
      variants: [
        {
          label: "One card on its own",
          render: () => (
            <StaffPage as="div">
              <ImportCard
                title="An import"
                href="/staff/import-data/luma"
                icon={<ImportIcon source="airtable" />}
                intro="What it copies."
              >
                <p>Not imported yet.</p>
              </ImportCard>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "ImportOverview",
      file: "app/(staff)/staff/_components/ImportJob.tsx",
      variants: [
        {
          label: "Every job: one stopped short, one running, one held, one failed, one never run",
          render: () => (
            <StaffPage as="div">
              <ImportOverview
                presses={[undefined, { startedBy: "jo@pauseai.uk", startedAt: "2026-10-21T11:47:00Z" }]}
                newest={[
                  exampleRun(
                    "import-luma",
                    { ...exampleLumaResult, stoppedBy: "time" },
                    { at: "2026-10-21T11:17:00Z" },
                  ),
                  exampleRun("import-members", exampleMembersResult, { at: "2026-10-21T11:47:00Z" }),
                  exampleRun("read-gmail", exampleGmailResult, { at: "2026-10-21T11:20:00Z" }),
                  exampleRun(
                    "sync-politicians",
                    { changes: { added: [], removed: [exampleSyncedMp(2)], changed: [] }, records: [] },
                    { at: "2026-10-21T00:00:00Z", status: "held" },
                  ),
                  exampleRun("sync-emails", exampleEmailsResult, { at: "2026-10-21T00:01:00Z" }),
                  exampleRun("check-mps", { problems: [] }, { at: "2026-10-21T01:00:00Z" }),
                  exampleFailedRun("import-controlai", "No PDF linked", { at: "2026-10-21T02:00:00Z" }),
                  exampleRun("import-web-form-letters", exampleWebFormResult, { at: "2026-10-20T09:00:00Z" }),
                  undefined,
                ]}
                airtableTable="https://airtable.com/"
              />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "ImportJobPage",
      file: "app/(staff)/staff/_components/ImportJob.tsx",
      variants: [
        {
          label: "The MP check's page: its button and every run, by day",
          render: () => (
            <StaffPage as="div">
              <ImportJobPageExample />
            </StaffPage>
          ),
        },
        {
          label: "A job that has never run",
          render: () => (
            <StaffPage as="div">
              <ImportJobPageExample never />
            </StaffPage>
          ),
        },
        {
          label: "A press still running: the earlier runs plain",
          render: () => (
            <StaffPage as="div">
              <ImportJobPageExample running />
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
      name: "DevLogin",
      file: "app/(staff)/staff/_components/DevLogin.tsx",
      variants: [
        {
          label: "Under the login card, in a fixture build only",
          render: () => (
            <StaffPage as="div">
              <LoginCard title={staffCopy.login.title}>
                <LoginForm />
              </LoginCard>
              <DevLogin
                accounts={[
                  { email: "admin@pauseai.uk", description: staffCopy.devLogin.permissions("Admin") },
                  { email: "jo@pauseai.uk", description: staffCopy.devLogin.permissions("Supporters") },
                  { email: "samuel.whitlock@pauseai.uk", description: staffCopy.devLogin.noPermissions },
                  { email: "nobody@pauseai.uk", description: staffCopy.devLogin.noAccount },
                ]}
              />
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
      name: "JobActions",
      file: "app/(staff)/staff/_components/JobActions.tsx",
      variants: [
        {
          label: "A job's button",
          render: () => (
            <StaffPage as="div">
              <JobActionsExample />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "AuditDetail",
      file: "app/(staff)/staff/_components/AuditDetail.tsx",
      variants: [
        {
          label: "An MP's status set, in words, linked to their page and the campaign's",
          render: () => (
            <StaffPage as="div">
              <AuditDetail change={exampleChanges[0]} airtableTable="https://airtable.com/app/tbl" />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "FieldChanges",
      file: "app/(staff)/staff/_components/AuditDetail.tsx",
      variants: [
        {
          label: "What an edit changed, each field before and after",
          render: () => (
            <StaffPage as="div">
              <FieldChanges changed={{ party: ["Labour", "Independent"], email: [null, "polly@example.org"] }} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "DotParts",
      file: "app/(staff)/staff/_components/Logged.tsx",
      variants: [
        {
          label: "Parts of a line, between middle dots",
          render: () => (
            <StaffPage as="div">
              <DotParts>{["Bounced", "Type HardBounce", "Address jo.mp@parliament.uk"]}</DotParts>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "LoggedJson",
      file: "app/(staff)/staff/_components/Logged.tsx",
      variants: [
        {
          label: "The {} button, which opens what was logged as JSON",
          render: () => (
            <StaffPage as="div">
              <LoggedJson id="gallery-logged-json" details={{ type: "HardBounce", description: "No such address" }} />
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
          label: "One of each kind of entry, in words, and one of a kind it doesn't know",
          render: () => (
            <StaffPage as="div">
              <ChangesTable
                log={{ changes: exampleChanges, total: exampleChanges.length, pages: 1, pageSize: 100 }}
                page={1}
                airtableTable="https://airtable.com/app/tbl"
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
          label: "Many lines, folded",
          render: () => (
            <StaffPage as="div">
              <ResultBox summary="An example result with a lot of detail" lines={OPEN_UP_TO + 1}>
                <p>Folded detail</p>
              </ResultBox>
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
              <Run run={exampleFailedRun("import-web-form-letters", "An example error", { id: 4 })} />
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
          label: "A run, with detail",
          render: () => (
            <StaffPage as="div">
              <RunBox run={exampleAppliedSync} summary="an example summary" lines={1}>
                <p>Detail</p>
              </RunBox>
            </StaffPage>
          ),
        },
        {
          label: "A run that stopped before it finished, and one that failed",
          render: () => (
            <StaffPage as="div">
              <RunBox
                run={exampleRun("import-luma", { ...exampleLumaResult, stoppedBy: "time" })}
                summary="an example summary"
              />
              <RunBox run={exampleFailedRun("sync-politicians", "An example error", { id: 5 })} summary={null} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "CountsByMailing",
      file: "app/(staff)/staff/_components/CountsByMailing.tsx",
      variants: [
        {
          label: "What the import of old letters joined",
          render: () => (
            <StaffPage as="div">
              <CountsByMailing
                heading="An example heading"
                counts={exampleOldLettersResult.joined}
                titles={exampleOldLettersResult.titles}
              />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "OldLettersProgressBar",
      file: "app/(staff)/staff/_components/OldLettersProgressBar.tsx",
      variants: [
        {
          label: "Partway",
          render: () => (
            <StaffPage as="div">
              <OldLettersProgressBar
                progress={{
                  read: 2842,
                  left: 6120,
                  joined: 2510,
                  replies: 212,
                  autoReplies: 24,
                  oneOffs: 96,
                  refusals: 1,
                  byMailing: { "deepmind-30-june": 2100, "deepmind-25": 410 },
                  titles: exampleOldLettersResult.titles!,
                }}
              />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "RunRows",
      file: "app/(staff)/staff/_components/RunRows.tsx",
      variants: [
        {
          label: "The import of old letters",
          render: () => (
            <StaffPage as="div">
              <RunRows runs={[exampleRun("import-old-letters", exampleOldLettersResult, { id: 21 })]} />
            </StaffPage>
          ),
        },
        {
          label: "Luma",
          render: () => (
            <StaffPage as="div">
              <RunRows runs={[exampleRun("import-luma", exampleLumaResult, { id: 22 })]} />
            </StaffPage>
          ),
        },
        {
          label: "Gmail",
          render: () => (
            <StaffPage as="div">
              <RunRows runs={[exampleRun("read-gmail", exampleGmailResult, { id: 23 })]} />
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
          label: "A job that runs often: the newest whole, then rows and a line for runs that found nothing",
          render: () => (
            <StaffPage as="div">
              <RunList
                none="None"
                runs={[
                  exampleRun("import-luma", exampleLumaResult, { id: 31 }),
                  exampleRun("import-luma", exampleLumaResult, { id: 32 }),
                  exampleRun("import-luma", exampleLumaResult, { id: 33, status: "unchanged" }),
                  exampleRun("import-luma", exampleLumaResult, { id: 34, status: "unchanged" }),
                  exampleRun("import-luma", { ...exampleLumaResult, stoppedBy: "time" }, { id: 35 }),
                ]}
              />
            </StaffPage>
          ),
        },
        {
          label: "A job's page: each day headed",
          render: () => (
            <StaffPage as="div">
              <RunList
                none="None"
                runs={[
                  exampleRun("check-mps", { problems: [] }, { id: 7, at: "2026-11-03T01:00:00Z" }),
                  exampleRun("import-controlai", exampleControlAiResult, { id: 8, at: "2026-11-02T02:00:00Z" }),
                  exampleRun(
                    "sync-politicians",
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
  ],
};
