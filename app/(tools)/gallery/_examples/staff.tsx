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
import DevLogin from "@/app/(staff)/staff/_components/DevLogin";
import LoginCard from "@/app/(staff)/staff/_components/LoginCard";
import LoginForm from "@/app/(staff)/staff/_components/LoginForm";
import PoliticianFilters from "@/app/(staff)/staff/_components/PoliticianFilters";
import Alert from "@/app/(staff)/staff/_components/Alert";
import AlertIcon from "@/app/(staff)/staff/_components/AlertIcon";
import ResultBox, { OPEN_UP_TO } from "@/app/(staff)/staff/_components/ResultBox";
import Run from "@/app/(staff)/staff/_components/Run";
import RunBox from "@/app/(staff)/staff/_components/RunBox";
import { ImportOverview } from "@/app/(staff)/staff/_components/ImportJob";
import RunList from "@/app/(staff)/staff/_components/RunList";
import {
  exampleAppliedSync,
  exampleControlAiResult,
  exampleFailedRun,
  exampleLumaResult,
  exampleMembersResult,
  exampleRun,
  exampleSyncedMp,
} from "@/app/(staff)/staff/_components/RunList.examples";
import StaffNav, { type StaffPage as StaffPageName } from "@/app/(staff)/staff/_components/StaffNav";
import AccountsNotice from "@/app/(staff)/staff/_components/AccountsNotice";
import Breadcrumb from "@/app/(staff)/staff/_components/Breadcrumb";
import EraseLink from "@/app/(staff)/staff/_components/EraseLink";
import ErasedNotice from "@/app/(staff)/staff/_components/ErasedNotice";
import ImportCard, { ImportCards } from "@/app/(staff)/staff/_components/ImportCard";
import KeepSignedIn from "@/app/(staff)/staff/_components/KeepSignedIn";
import SortHeading from "@/app/(staff)/staff/_components/SortHeading";
import Table from "@/components/ui/Table";
import StaffDashboard from "@/app/(staff)/staff/_components/StaffDashboard";
import { exampleDashboard, exampleQuietDashboard } from "@/app/(staff)/staff/_components/StaffDashboard.examples";
import Sparkline from "@/app/(staff)/staff/_components/Sparkline";
import StaffHome from "@/app/(staff)/staff/_components/StaffHome";
import SupporterBadges from "@/app/(staff)/staff/_components/SupporterBadges";
import EmailPermissionTiles from "@/app/(staff)/staff/_components/EmailPermissionTiles";
import SupporterDetails from "@/app/(staff)/staff/_components/SupporterDetails";
import SupporterFilters from "@/app/(staff)/staff/_components/SupporterFilters";
import SupportersTable from "@/app/(staff)/staff/_components/SupportersTable";
import {
  exampleBlockedPermissions,
  exampleMemberDetails,
  exampleSupporter,
  exampleSupporterDetails,
} from "@/app/(staff)/staff/_components/SupportersTable.examples";
import { supportersSearch } from "@/lib/staff-search";
import StaffPage from "@/app/(staff)/staff/_components/ui/StaffPage";
import Tag from "@/components/ui/Tag";
import { campaigns } from "@/lib/content/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import type { ImportJob } from "@/lib/import-runs";
import type { Group, Variant } from "../_components/types";
import {
  EmailBlocksTableExample,
  HeldSyncExample,
  ImportJobPageExample,
  JobActionsExample,
  PoliticianDetailsExample,
  PoliticianFormExample,
  PoliticianTableEmptyExample,
  PoliticianTableExample,
  EraseFormExample,
  AddAccountFormExample,
  StaffAccountsTableExample,
  RemoveAccountFormExample,
  UnblockFormExample,
} from "./staff.client";

const [pm] = campaigns;

// Every page the navigation can mark as current, so a new one is a type error until it's here.
const PAGES: Record<StaffPageName, true> = {
  home: true,
  supporters: true,
  politicians: true,
  letters: true,
  emails: true,
  import: true,
  changes: true,
  accounts: true,
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
    label: "A Luma import cut short by its time, and one still reading every contact",
    render: () => (
      <StaffPage as="div">
        <Run run={exampleRun("import-luma", { ...exampleLumaResult, eventsLeft: 4, stoppedBy: "time" })} />
        <Run
          run={exampleRun(
            "import-luma",
            { ...exampleLumaResult, contactPages: 10, contactsPassGoing: true },
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
        {
          label: "With the navigation beside it",
          render: () => (
            <StaffPage
              as="div"
              nav={<StaffNav email="jo@pauseai.uk" account permissions={["admin"]} current="letters" />}
            >
              <h1>Letters</h1>
              <p>The page takes the width beside the sidebar.</p>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "StaffNav",
      file: "app/(staff)/staff/_components/StaffNav.tsx",
      variants: [
        {
          label: "On the login page: the title alone",
          render: () => (
            <StaffPage as="div">
              <StaffNav />
            </StaffPage>
          ),
        },
        {
          label: "For someone with no account: who they are and the way out",
          render: () => (
            <StaffPage as="div">
              <StaffNav email="jo@pauseai.uk" current="home" />
            </StaffPage>
          ),
        },
        {
          label: "For someone without the admin permission: the open groups",
          render: () => (
            <StaffPage as="div">
              <StaffNav email="jo@pauseai.uk" account permissions={[]} current="politicians" />
            </StaffPage>
          ),
        },
        {
          label: "For an admin, on each page",
          render: () => (
            <StaffPage as="div">
              <div style={{ display: "grid", gap: 24 }}>
                {(Object.keys(PAGES) as StaffPageName[]).map((current) => (
                  <StaffNav
                    key={current}
                    email="jo@pauseai.uk"
                    permissions={["admin", "supporters"]}
                    current={current}
                  />
                ))}
              </div>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "SupporterFilters",
      file: "app/(staff)/staff/_components/SupporterFilters.tsx",
      variants: [
        {
          label: "The list's filters, with a search typed and a box ticked",
          render: () => (
            <StaffPage as="div">
              <SupporterFilters search={supportersSearch({ q: "jane", registered: "1", sort: "name" })} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "SupportersTable",
      file: "app/(staff)/staff/_components/SupportersTable.tsx",
      variants: [
        {
          label: "Two supporters, one page of three",
          render: () => (
            <StaffPage as="div">
              <SupportersTable
                search={supportersSearch({ page: "2" })}
                page={{
                  supporters: [
                    exampleSupporter,
                    {
                      ...exampleSupporter,
                      id: 8,
                      name: null,
                      emails: ["sam@example.com"],
                      phone: null,
                      postcode: null,
                      sources: ["letter"],
                      lumaContact: false,
                      events: 0,
                      optedOut: [],
                    },
                  ],
                  total: 120,
                  pages: 3,
                }}
              />
            </StaffPage>
          ),
        },
        {
          label: "Nobody found",
          render: () => (
            <StaffPage as="div">
              <SupportersTable search={supportersSearch({})} page={{ supporters: [], total: 0, pages: 1 }} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "SupporterBadges",
      file: "app/(staff)/staff/_components/SupporterBadges.tsx",
      variants: [
        {
          label: "A calendar contact who registered twice and wrote to their MP",
          render: () => (
            <StaffPage as="div">
              <SupporterBadges supporter={exampleSupporter} />
            </StaffPage>
          ),
        },
        {
          label: "A member",
          render: () => (
            <StaffPage as="div">
              <SupporterBadges supporter={exampleMemberDetails.summary} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "EmailPermissionTiles",
      file: "app/(staff)/staff/_components/EmailPermissionTiles.tsx",
      variants: [
        {
          label: "Will and won't email, by topic",
          render: () => (
            <StaffPage as="div">
              <EmailPermissionTiles permissions={exampleSupporterDetails.permissions} />
            </StaffPage>
          ),
        },
        {
          label: "Following the calendar since its webhook, and don't know of the updates",
          render: () => (
            <StaffPage as="div">
              <EmailPermissionTiles
                permissions={[
                  {
                    topic: "luma-calendar",
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
          label: "A blocked address",
          render: () => (
            <StaffPage as="div">
              <EmailPermissionTiles permissions={exampleBlockedPermissions} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "SupporterDetails",
      file: "app/(staff)/staff/_components/SupporterDetails.tsx",
      variants: [
        {
          label: "A supporter known from Luma and a letter, opted out on one address",
          render: () => (
            <StaffPage as="div">
              <SupporterDetails supporter={exampleSupporterDetails} />
            </StaffPage>
          ),
        },
        {
          label: "A member who opted out of the updates on joining, then asked for them on re-joining",
          render: () => (
            <StaffPage as="div">
              <SupporterDetails supporter={exampleMemberDetails} />
            </StaffPage>
          ),
        },
        {
          label: "A supporter with no name, nothing given and no activity",
          render: () => (
            <StaffPage as="div">
              <SupporterDetails
                supporter={{
                  summary: {
                    ...exampleSupporter,
                    name: null,
                    emails: ["x@example.com"],
                    events: 0,
                    letters: 0,
                    lumaContact: false,
                    optedOut: [],
                  },
                  identities: [{ source: "luma", email: "x@example.com", name: "", seenAt: null }],
                  contacts: [],
                  links: [],
                  activity: [],
                  permissions: [],
                }}
              />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "EraseForm",
      file: "app/(staff)/staff/_components/EraseForm.tsx",
      variants: [
        {
          label: "The erase page's form",
          render: () => (
            <StaffPage as="div">
              <EraseFormExample />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "ErasedNotice",
      file: "app/(staff)/staff/_components/ErasedNotice.tsx",
      variants: [
        {
          label: "Done",
          render: () => (
            <StaffPage as="div">
              <ErasedNotice erased="1" />
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
              <div style={{ maxWidth: "16rem" }}>
                <Sparkline
                  name="Event registrations, the last eight weeks"
                  values={exampleDashboard.series.eventRegistrations.map((point) => point.count)}
                  labels={exampleDashboard.series.eventRegistrations.map(
                    (point) => `From ${point.from.slice(0, 10)}: ${point.count}`,
                  )}
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
              <StaffHome
                account
                permissions={["admin", "supporters"]}
                admins={["admin@pauseai.uk"]}
                dashboard={exampleDashboard}
              />
            </StaffPage>
          ),
        },
        {
          label: "For someone with no permissions: the dashboard, its supporter tiles not links",
          render: () => (
            <StaffPage as="div">
              <StaffHome
                account
                permissions={[]}
                admins={["admin@pauseai.uk", "jo@pauseai.uk"]}
                dashboard={exampleDashboard}
              />
            </StaffPage>
          ),
        },
        {
          label: "For someone with no account: whom to ask",
          render: () => (
            <StaffPage as="div">
              <StaffHome account={false} permissions={[]} admins={["admin@pauseai.uk"]} />
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
          label: "Three accounts, and the form for someone new",
          render: () => (
            <StaffPage as="div">
              <StaffAccountsTableExample />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "AddAccountForm",
      file: "app/(staff)/staff/_components/AddAccountForm.tsx",
      variants: [
        {
          label: "Their address and Add",
          render: () => (
            <StaffPage as="div">
              <AddAccountFormExample />
            </StaffPage>
          ),
        },
        {
          label: "Off while the table above has changes not saved",
          render: () => (
            <StaffPage as="div">
              <AddAccountFormExample waiting />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "RemoveAccountForm",
      file: "app/(staff)/staff/_components/RemoveAccountForm.tsx",
      variants: [
        {
          label: "The button at the right of a row",
          render: () => (
            <StaffPage as="div">
              <RemoveAccountFormExample />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "Alert",
      file: "app/(staff)/staff/_components/Alert.tsx",
      variants: [
        {
          label: "An error, and something waiting",
          render: () => (
            <StaffPage as="div">
              <Alert>An example of something that went wrong.</Alert>
              <Alert tone="amber">An example of something waiting for a person.</Alert>
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
      name: "Breadcrumb",
      file: "app/(staff)/staff/_components/Breadcrumb.tsx",
      variants: [
        {
          label: "Above a supporter's name: the way back to the list",
          render: () => (
            <StaffPage as="div">
              <Breadcrumb href="/staff/supporters">Supporters</Breadcrumb>
              <h1>Jane Example</h1>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "EraseLink",
      file: "app/(staff)/staff/_components/EraseLink.tsx",
      variants: [
        {
          label: "At the foot of a supporter's page",
          render: () => (
            <StaffPage as="div">
              <EraseLink supporterId={7} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "SortHeading",
      file: "app/(staff)/staff/_components/SortHeading.tsx",
      variants: [
        {
          label: "Three headings: sorted by the first, ascending",
          render: () => (
            <StaffPage as="div">
              <Table>
                <thead>
                  <tr>
                    <SortHeading sortKey="name" current={{ key: "name", dir: "asc" }} href="?sort=name&dir=desc">
                      Name
                    </SortHeading>
                    <SortHeading sortKey="party" current={{ key: "name", dir: "asc" }} href="?sort=party&dir=asc">
                      Party
                    </SortHeading>
                    <th>Not sortable</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Polly Placeholder</td>
                    <td>Labour</td>
                    <td>…</td>
                  </tr>
                </tbody>
              </Table>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "AlertIcon",
      file: "app/(staff)/staff/_components/AlertIcon.tsx",
      variants: [
        {
          label: "Waiting, and broken",
          render: () => (
            <StaffPage as="div">
              <AlertIcon tone="amber" /> <AlertIcon tone="red" />
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
                  tags={<Tag tone="blue">Nightly</Tag>}
                  intro="What it copies, and from where."
                >
                  <p>
                    <Tag tone="green">Done</Tag> 2026-10-15 02:00
                  </p>
                </ImportCard>
                <ImportCard title="Another" href="/staff/import-data/luma" tags={null} intro="Never run.">
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
              <ImportCard title="An import" href="/staff/import-data/luma" tags={null} intro="What it copies.">
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
          label: "Every job: one stopped short, one held, one failed, one never run",
          render: () => (
            <StaffPage as="div">
              <ImportOverview
                newest={[
                  exampleRun(
                    "import-luma",
                    { ...exampleLumaResult, stoppedBy: "time" },
                    { at: "2026-10-21T11:17:00Z" },
                  ),
                  exampleRun("import-members", exampleMembersResult, { at: "2026-10-21T11:47:00Z" }),
                  exampleRun(
                    "sync-mps",
                    { changes: { added: [], removed: [exampleSyncedMp(2)], changed: [] }, mps: [] },
                    { at: "2026-10-21T00:00:00Z", status: "held" },
                  ),
                  exampleRun("check-mps", { problems: [] }, { at: "2026-10-21T01:00:00Z" }),
                  exampleFailedRun("import-controlai", "No PDF linked", { at: "2026-10-21T02:00:00Z" }),
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
                  { email: "sam@pauseai.uk", description: staffCopy.devLogin.noPermissions },
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
                showSenders
              />
            </StaffPage>
          ),
        },
        {
          label: "For staff who may not see supporters: no sender or consent",
          render: () => (
            <StaffPage as="div">
              <LettersTable letters={[exampleLetter]} showSenders={false} />
            </StaffPage>
          ),
        },
        {
          label: "None",
          render: () => (
            <StaffPage as="div">
              <LettersTable letters={[]} showSenders />
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
              <RunBox run={exampleAppliedSync} summary="an example summary" incomplete />
              <RunBox run={exampleFailedRun("sync-mps", "An example error", { id: 5 })} summary={null} />
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
          label: "A job's page: each day headed",
          render: () => (
            <StaffPage as="div">
              <RunList
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
              <LetterFilters search={{ status: "bounced", q: "", answered: "", supporter: "" }} />
            </StaffPage>
          ),
        },
      ],
    },
  ],
};
