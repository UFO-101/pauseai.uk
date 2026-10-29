// The staff screens' parts (app/(staff)/staff/_components), and the page
// frame they're in, which sets the compact density, on fake
// politicians, letters, runs and changes. Their links go to /staff pages,
// which send anyone without a session to the login page.
import { Button } from "@/components/ui/Button";
import ChangesTable from "@/app/(staff)/staff/_components/ChangesTable";
import EmailBlockFilters from "@/app/(staff)/staff/_components/EmailBlockFilters";
import FilterBar from "@/app/(staff)/staff/_components/ui/FilterBar";
import Menu from "@/app/(staff)/staff/_components/ui/Menu";
import { NationShape, Rosette, StatusDot } from "@/app/(staff)/staff/_components/PoliticianIcons";
import { exampleProblems } from "@/app/(staff)/staff/_components/EmailBlocksTable.examples";
import EmailProblemsTable from "@/app/(staff)/staff/_components/EmailProblemsTable";
import { exampleChanges } from "@/app/(staff)/staff/_components/ChangesTable.examples";
import AuditDetail, { FieldChanges } from "@/app/(staff)/staff/_components/AuditDetail";
import { DotParts, LoggedJson } from "@/app/(staff)/staff/_components/Logged";
import CampaignName from "@/app/(staff)/staff/_components/CampaignName";
import LetterFilters from "@/app/(staff)/staff/_components/LetterFilters";
import LetterLink from "@/app/(staff)/staff/_components/LetterLink";
import LettersTable, { LettersList } from "@/app/(staff)/staff/_components/LettersTable";
import {
  exampleLetter,
  examplePauseaiLetterDetails,
  exampleSupporterLetterDetails,
} from "@/app/(staff)/staff/_components/LettersTable.examples";
import LetterDetails from "@/app/(staff)/staff/_components/LetterDetails";
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
  exampleEmailsResult,
  exampleFailedRun,
  exampleGoToParliamentResult,
  exampleLumaResult,
  exampleMembersResult,
  exampleRun,
  exampleSyncedMp,
  exampleWebFormResult,
} from "@/app/(staff)/staff/_components/RunList.examples";
import StaffNav, { type StaffPage as StaffPageName } from "@/app/(staff)/staff/_components/StaffNav";
import AccountsNotice from "@/app/(staff)/staff/_components/AccountsNotice";
import Breadcrumb from "@/app/(staff)/staff/_components/Breadcrumb";
import EraseLink from "@/app/(staff)/staff/_components/EraseLink";
import MailingsTable from "@/app/(staff)/staff/_components/MailingsTable";
import NotIcon from "@/app/(staff)/staff/_components/ui/NotIcon";
import { MailingLetter } from "@/app/(staff)/staff/_components/MailingLetter";
import { FilterPills, MailingCounts } from "@/app/(staff)/staff/_components/MailingParts";
import { exampleMailingLetter, exampleWriterData } from "@/app/(staff)/staff/_components/MailingWriter.examples";
import { exampleMailings } from "@/app/(staff)/staff/_components/MailingsTable.examples";
import ListFrame, { ListTable, type ListColumn } from "@/app/(staff)/staff/_components/ui/ListFrame";
import ChoiceSearch from "@/app/(staff)/staff/_components/ui/ChoiceSearch";
import NavFold from "@/app/(staff)/staff/_components/ui/NavFold";
import FormPending from "@/app/(staff)/staff/_components/ui/FormPending";
import StaffLink from "@/app/(staff)/staff/_components/ui/StaffLink";
import NavIcon from "@/app/(staff)/staff/_components/NavIcon";
import { HouseTabs } from "@/app/(staff)/staff/_components/PoliticiansList";
import ErasedNotice from "@/app/(staff)/staff/_components/ErasedNotice";
import ImportCard, { ImportCards } from "@/app/(staff)/staff/_components/ImportCard";
import KeepSignedIn from "@/app/(staff)/staff/_components/KeepSignedIn";
import SortHeading from "@/app/(staff)/staff/_components/SortHeading";
import Table from "@/components/ui/Table";
import StaffDashboard from "@/app/(staff)/staff/_components/StaffDashboard";
import StaffHome from "@/app/(staff)/staff/_components/StaffHome";
import StaffSessions from "@/app/(staff)/staff/_components/StaffSessions";
import { exampleDashboard, exampleQuietDashboard } from "@/app/(staff)/staff/_components/StaffDashboard.examples";
import Sparkline from "@/app/(staff)/staff/_components/Sparkline";
import SupporterBadges from "@/app/(staff)/staff/_components/SupporterBadges";
import SubscriptionBadges from "@/app/(staff)/staff/_components/SubscriptionBadges";
import ChannelIcon from "@/app/(staff)/staff/_components/ChannelIcon";
import PermissionTiles from "@/app/(staff)/staff/_components/PermissionTiles";
import SupporterDetails from "@/app/(staff)/staff/_components/SupporterDetails";
import SupporterFilters from "@/app/(staff)/staff/_components/SupporterFilters";
import SupportersTable from "@/app/(staff)/staff/_components/SupportersTable";
import {
  exampleBlockedPermissions,
  exampleMemberDetails,
  exampleSupporter,
  exampleSupporterRows,
  exampleSupporterDetails,
} from "@/app/(staff)/staff/_components/SupportersTable.examples";
import { supportersSearch } from "@/lib/staff-search";
import StaffPage from "@/app/(staff)/staff/_components/ui/StaffPage";
import Grid, { Card } from "@/app/(staff)/staff/_components/ui/Grid";
import Strip from "@/app/(staff)/staff/_components/ui/Strip";
import Tabs from "@/app/(staff)/staff/_components/ui/Tabs";
import Tag from "@/components/ui/Tag";
import { campaigns } from "@/lib/content/email-your-mp";
import {
  exampleAsks,
  exampleAsksWithCounts,
  examplePolitician,
  examplePoliticiansPage,
} from "@/app/(staff)/staff/_components/PoliticianTable.examples";
import AsksTable from "@/app/(staff)/staff/_components/AsksTable";
import BounceReason from "@/app/(staff)/staff/_components/BounceReason";
import { GmailConnect, GmailOutcome, SentToday } from "@/app/(staff)/staff/_components/GmailConnect";
import AccountTitle from "@/app/(staff)/staff/_components/AccountTitle";
import LetterThread from "@/app/(staff)/staff/_components/LetterThread";
import { exampleImportedThread, exampleThread } from "@/app/(staff)/staff/_components/LetterThread.examples";
import { staffCopy } from "@/lib/content/staff-interface";
import type { ImportJob } from "@/lib/import-runs";
import type { Group, Variant } from "../_components/types";
import {
  EmailBlocksTableExample,
  HeldSyncExample,
  ImportJobPageExample,
  JobActionsExample,
  MailingEditorExample,
  MailingButtonsExample,
  ChangeTimeFormExample,
  DueTimeFieldsExample,
  MailingFilesExample,
  MailingForExample,
  MailingsOverviewExample,
  MailingViewExample,
  MailingWriterExample,
  ChangeWhoListExample,
  PoliticiansListExample,
  PoliticianDetailsExample,
  PoliticianTableEmptyExample,
  PoliticianTableExample,
  DeletePoliticianExample,
  EraseFormExample,
  StaffAccountsTableExample,
  RemoveAccountFormExample,
  UnblockFormExample,
  AskFormExample,
  DeleteTwiceExample,
  MyGmailExample,
} from "./staff.client";

const [pm] = campaigns;
/** A list's rows, for the list frame: a name, a place and a count, the place long enough to wrap. */
type ExampleRow = { name: string; place: string; count: number };
const exampleRows: ExampleRow[] = [
  { name: "Ann Example", place: "Hackney North and Stoke Newington", count: 3 },
  { name: "Bob Sample", place: "Leeds", count: 0 },
  { name: "Cat Fixture", place: "Ceredigion Preseli", count: 12 },
  { name: "Dan Dummy", place: "Glasgow", count: 1 },
];
const exampleColumns: ListColumn<ExampleRow>[] = [
  { key: "name", label: "Name", cell: (r) => r.name },
  { key: "place", label: "Place", cell: (r) => r.place },
  { key: "count", label: "Letters", short: true, cell: (r) => r.count },
];
const nameOf = (row: ExampleRow) => row.name;

/** Luma events a filter of supporters picks from, newest first. */
const exampleEventChoices = [
  { id: "evt-1", name: "PauseAI Leicester meetup", startAt: "2026-10-20T18:00:00Z" },
  { id: "evt-2", name: "AI risk talk", startAt: "2026-10-12T18:00:00Z" },
  { id: "evt-3", name: "PauseAI London March", startAt: "2026-09-05T11:00:00Z" },
];

/** The parties a filter of politicians picks from. */
const parties = ["Conservative", "Green", "Labour", "Liberal Democrat"];

/** The politicians list's filters, none chosen. */
const EMPTY_POLITICIAN_FILTERS = {
  q: "",
  house: "",
  status: "",
  party: [] as string[],
  flag: [] as string[],
  nation: [] as string[],
  email: [] as string[],
  ask: "",
  answer: "",
  mailed: [] as string[],
  sort: "",
  dir: "",
  page: "",
  mailing: "",
};

// A blocked address list's filter, for the filter bar's examples.
const EXAMPLE_FILTERS = [
  {
    name: "kind",
    label: "Cause",
    options: [
      { value: "hard", label: "Bounced" },
      { value: "complaint", label: "Complained" },
    ],
  },
];

// A filter that repeats, so it can leave out as well as find.
const EXAMPLE_NATIONS = [
  {
    name: "nation",
    label: "Nation",
    repeat: true,
    options: [
      { value: "england", label: "England" },
      { value: "scotland", label: "Scotland" },
      { value: "wales", label: "Wales" },
    ],
  },
];

// Every page the navigation can mark as current, so a new one is a type error until it's here.
const PAGES: Record<StaffPageName, true> = {
  home: true,
  me: true,
  supporters: true,
  letters: true,
  supporterEmails: true,
  politicians: true,
  asks: true,
  mailings: true,
  mpEmails: true,
  import: true,
  changes: true,
  accounts: true,
};

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
    label: "A Luma import cut short by its time, and one that looked up places",
    render: () => (
      <StaffPage as="div">
        <Run run={exampleRun("import-luma", { ...exampleLumaResult, eventsLeft: 4, stoppedBy: "time" })} />
        <Run
          run={exampleRun(
            "import-luma",
            { ...exampleLumaResult, contactPages: 10, places: { postcodes: 12, towns: 3, failed: false } },
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
  "sync-emails": {
    label: "PauseAI's emails, some held back",
    render: () => (
      <StaffPage as="div">
        <Run run={exampleRun("sync-emails", exampleEmailsResult)} />
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
            <StaffPage as="div" nav={<StaffNav email="jo@pauseai.uk" permissions={["admin"]} current="letters" />}>
              <h1>Letters</h1>
              <p>The page takes the width beside the sidebar.</p>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "Grid",
      file: "app/(staff)/staff/_components/ui/Grid.tsx",
      variants: [
        {
          label:
            "Six columns on a wide screen, two below: cards taking a half, two-thirds and a third, then a sixth each",
          render: () => (
            <StaffPage as="div">
              <Grid>
                <Card span={3}>A half</Card>
                <Card span={3}>A half</Card>
                <Card span={4}>Two-thirds, beside</Card>
                <Card span={2}>
                  a third, taller than it: each is as tall as what&apos;s in it, so this one is longer.
                </Card>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <Card key={n} span={1}>
                    A sixth
                  </Card>
                ))}
              </Grid>
            </StaffPage>
          ),
        },
        {
          label: "Even: things of one kind, each as tall as its row",
          render: () => (
            <StaffPage as="div">
              <Grid even>
                <Card span={2}>A third</Card>
                <Card span={2}>A third, with more in it than the others, which grow to match.</Card>
                <Card span={2}>A third</Card>
              </Grid>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "Card",
      file: "app/(staff)/staff/_components/ui/Grid.tsx",
      variants: [
        {
          label: "With a title, and a strip and a line in it",
          render: () => (
            <StaffPage as="div">
              <Grid>
                <Card span={3} title="An example card" id="example-card">
                  <Strip tone="green">
                    <span>Done</span>
                  </Strip>
                  <p>A line under it.</p>
                </Card>
              </Grid>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "StaffLink",
      file: "app/(staff)/staff/_components/ui/StaffLink.tsx",
      variants: [
        {
          label: "A link to another page or a changed list: chosen at once, the page fetched ahead once it's hovered",
          render: () => (
            <StaffPage as="div">
              <StaffLink href="/gallery/staff">Next page</StaffLink>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "FormPending",
      file: "app/(staff)/staff/_components/ui/FormPending.tsx",
      variants: [
        {
          label: "Unseen, in a list's search form: marks it pending while its search loads, for the line along the top",
          render: () => (
            <StaffPage as="div">
              <form>
                <FormPending />
              </form>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "NavFold",
      file: "app/(staff)/staff/_components/ui/NavFold.tsx",
      variants: [
        {
          label: "On the sidebar's edge, at its foot: folds it to a rail of icons, and back",
          render: () => (
            <StaffPage as="div">
              {/* A box for it to sit on the right edge of, as the navigation is. */}
              <div
                style={{ position: "relative", width: "10rem", height: "2rem", borderRight: "1px solid var(--border)" }}
              >
                <NavFold />
              </div>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "NavIcon",
      file: "app/(staff)/staff/_components/NavIcon.tsx",
      variants: [
        {
          label: "Each page's icon, and Log out's",
          render: () => (
            <StaffPage as="div">
              <p>
                {(
                  [
                    "home",
                    "supporters",
                    "letters",
                    "supporterEmails",
                    "politicians",
                    "asks",
                    "mailings",
                    "mpEmails",
                    "import",
                    "accounts",
                    "changes",
                    "logout",
                  ] as const
                ).map((id) => (
                  <NavIcon key={id} id={id} />
                ))}
              </p>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "ChoiceSearch",
      file: "app/(staff)/staff/_components/ui/ChoiceSearch.tsx",
      variants: [
        {
          label: "Over a long list of choices, which show once something's typed",
          render: () => (
            <StaffPage as="div">
              <ChoiceSearch label="Search these" />
              <ul data-search="empty">
                <li>PauseAI Leicester meetup</li>
                <li>AI risk talk</li>
              </ul>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "ListTable",
      file: "app/(staff)/staff/_components/ui/ListFrame.tsx",
      variants: [
        {
          label: "The rows alone, striped, for a table that isn't a whole list",
          render: () => (
            <StaffPage as="div">
              <ListTable columns={exampleColumns} rows={exampleRows} rowKey={nameOf} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "Tabs",
      file: "app/(staff)/staff/_components/ui/Tabs.tsx",
      variants: [
        {
          label: "A list's houses, Lords chosen",
          render: () => (
            <StaffPage as="div">
              <Tabs
                label="House"
                current="lords"
                tabs={[
                  { key: "", label: "All houses", href: "#" },
                  { key: "commons", label: "House of Commons", href: "#" },
                  { key: "lords", label: "House of Lords", href: "#" },
                  { key: "senedd", label: "Senedd", href: "#" },
                ]}
              />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "Strip",
      file: "app/(staff)/staff/_components/ui/Strip.tsx",
      variants: [
        {
          label: "Each tone: plain, green, amber and red, with an action at the right",
          render: () => (
            <StaffPage as="div">
              <div style={{ display: "grid", gap: "8px" }}>
                <Strip>
                  <span>Not signed</span>
                </Strip>
                <Strip tone="green">
                  <span>Signed, 1 Oct 2026</span>
                  <span>Set by jo@pauseai.uk</span>
                </Strip>
                <Strip
                  tone="amber"
                  action={
                    <Button variant="primary" size="small">
                      Review import
                    </Button>
                  }
                >
                  <span>MP import would change 42 MPs</span>
                  <span>Check it, and approve or decline it.</span>
                </Strip>
                <Strip
                  tone="red"
                  action={
                    <Button variant="primary" size="small">
                      Fix MP email
                    </Button>
                  }
                >
                  <span>Bouncy McTestface MP&apos;s email is bouncing</span>
                  <span>Find a working email, or unblock it.</span>
                </Strip>
              </div>
            </StaffPage>
          ),
        },
        {
          label: "An answer, not a warning: no icon",
          render: () => (
            <StaffPage as="div">
              <Strip tone="red" icon={false}>
                <span>Won&apos;t email</span>
              </Strip>
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
          label: "For someone without permissions: the pages any account opens",
          render: () => (
            <StaffPage as="div">
              <StaffNav email="jo@pauseai.uk" permissions={[]} current="politicians" />
            </StaffPage>
          ),
        },
        {
          label: "With the supporters permission",
          render: () => (
            <StaffPage as="div">
              <StaffNav email="jo@pauseai.uk" permissions={["supporters"]} current="letters" />
            </StaffPage>
          ),
        },
        {
          label: "Logged in on three devices: the faint link under Log out",
          render: () => (
            <StaffPage as="div">
              <StaffNav email="jo@pauseai.uk" permissions={[]} sessions={3} current="home" />
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
          label: "The list's filters, with a search typed, two activities, a campaign not written in, and near Leeds",
          render: () => (
            <StaffPage as="div">
              <SupporterFilters
                search={supportersSearch({
                  q: "jane",
                  activity: ["registered", "member"],
                  contact: "email:luma-calendar:unsubscribed",
                  campaign: "support-sobel-bill",
                  wrote: "no",
                  mp: "!7",
                  near: "LS1",
                  within: "25",
                  sort: "name",
                })}
                choices={{
                  events: exampleEventChoices,
                  mps: [{ id: 7, name: "Alex Sobel", constituency: "Leeds Central and Headingley" }],
                }}
                near={{ latitude: 53.8, longitude: -1.55, place: "Leeds", country: "england" }}
              />
            </StaffPage>
          ),
        },
        {
          label: "Near somewhere postcodes.io doesn't know",
          render: () => (
            <StaffPage as="div">
              <SupporterFilters
                search={supportersSearch({ near: "Atlantis" })}
                choices={{ events: [], mps: [] }}
                near={null}
              />
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
          label: "Three supporters, one page of three",
          render: () => (
            <StaffPage as="div">
              <SupportersTable
                search={supportersSearch({ page: "2" })}
                page={{
                  supporters: exampleSupporterRows,
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
      name: "SubscriptionBadges",
      file: "app/(staff)/staff/_components/SubscriptionBadges.tsx",
      variants: [
        {
          label: "Agreed on their letter, unsubscribed from the calendar's emails",
          render: () => (
            <StaffPage as="div">
              <SubscriptionBadges permissions={exampleSupporterRows[0].permissions} />
            </StaffPage>
          ),
        },
        {
          label: "On the calendar; can't be sure of the updates",
          render: () => (
            <StaffPage as="div">
              <SubscriptionBadges permissions={exampleSupporterRows[1].permissions} />
            </StaffPage>
          ),
        },
        {
          label: "Every address blocked",
          render: () => (
            <StaffPage as="div">
              <SubscriptionBadges permissions={exampleBlockedPermissions} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "ChannelIcon",
      file: "app/(staff)/staff/_components/ChannelIcon.tsx",
      variants: [
        {
          label: "Email and phone, named, and as decoration",
          render: () => (
            <StaffPage as="div">
              <p>
                <ChannelIcon channel="email" label="Email" /> <ChannelIcon channel="phone" label="Phone" />{" "}
                <ChannelIcon channel="email" /> <ChannelIcon channel="phone" />
              </p>
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
                  mp: null,
                  letters: [],
                  summary: {
                    ...exampleSupporter,
                    name: null,
                    emails: ["x@example.com"],
                    events: 0,
                    letters: 0,
                    lumaContact: false,
                  },
                  identities: [{ source: "luma", email: "x@example.com", name: "", seenAt: null }],
                  contacts: [],
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
            <GmailOutcome outcome={outcome} />
          </StaffPage>
        ),
      })),
    },
    {
      name: "LetterThread",
      file: "app/(staff)/staff/_components/LetterThread.tsx",
      variants: [
        {
          label: "Sent from Jo's Gmail, seen by Jo: an automatic reply, Polly's answer, and Jo's that can't be read",
          render: () => (
            <StaffPage as="div">
              <LetterThread thread={exampleThread} me="jo@pauseai.uk" />
            </StaffPage>
          ),
        },
        {
          label: "Seen by someone else: no Open in Gmail",
          render: () => (
            <StaffPage as="div">
              <LetterThread thread={exampleThread} me="samuel.whitlock@pauseai.uk" />
            </StaffPage>
          ),
        },
        {
          label: "Imported from Airtable, never sent: no text, no replies",
          render: () => (
            <StaffPage as="div">
              <LetterThread thread={exampleImportedThread} me="jo@pauseai.uk" />
            </StaffPage>
          ),
        },
      ],
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
          label: "Three accounts, and the field to add someone under them",
          render: () => (
            <StaffPage as="div">
              <StaffAccountsTableExample />
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
      name: "ListFrame",
      file: "app/(staff)/staff/_components/ui/ListFrame.tsx",
      variants: [
        {
          label: "Page 6 of 50: how many, the downloads, striped rows, and the pages near this one",
          render: () => (
            <StaffPage as="div">
              <ListFrame
                count="5,000 rows"
                total={5000}
                page={6}
                pages={50}
                pageSize={100}
                href={(n) => `#page-${n}`}
                download={(format) => `#download-${format}`}
                columns={exampleColumns}
                rows={exampleRows}
                rowKey={nameOf}
                empty="Nothing found."
              />
            </StaffPage>
          ),
        },
        {
          label: "One page, with no downloads",
          render: () => (
            <StaffPage as="div">
              <ListFrame
                count="4 rows"
                total={4}
                page={1}
                pages={1}
                pageSize={100}
                columns={exampleColumns}
                rows={exampleRows}
                rowKey={nameOf}
                empty="Nothing found."
              />
            </StaffPage>
          ),
        },
        {
          label: "Nothing found",
          render: () => (
            <StaffPage as="div">
              <ListFrame
                count="0 rows"
                total={0}
                page={1}
                pages={1}
                pageSize={100}
                columns={exampleColumns}
                rows={[]}
                rowKey={nameOf}
                empty="Nothing found."
              />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "HouseTabs",
      file: "app/(staff)/staff/_components/PoliticiansList.tsx",
      variants: [
        {
          label: "The Lords chosen",
          render: () => (
            <StaffPage as="div">
              <HouseTabs search={{ ...EMPTY_POLITICIAN_FILTERS, house: "lords" }} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "PoliticiansList",
      file: "app/(staff)/staff/_components/PoliticiansList.tsx",
      variants: [
        {
          label: "After a draft's Change who: the button makes the draft go to these",
          render: () => (
            <StaffPage as="div">
              <ChangeWhoListExample />
            </StaffPage>
          ),
        },
        {
          label: "A search's page of politicians, with more in other houses and out of office",
          render: () => (
            <StaffPage as="div">
              <PoliticiansListExample
                list={{ ...examplePoliticiansPage, total: 150, pages: 2, outOfOffice: 3, otherHouses: 2, tests: 1 }}
                search={{ ...EMPTY_POLITICIAN_FILTERS, q: "pol" }}
                asks={exampleAsks}
              />
            </StaffPage>
          ),
        },
        {
          label: "A search that finds no one, with the nearest names",
          render: () => (
            <StaffPage as="div">
              <PoliticiansListExample
                list={{ ...examplePoliticiansPage, politicians: [], total: 0, closest: [examplePolitician] }}
                search={{ ...EMPTY_POLITICIAN_FILTERS, q: "Polly Plaseholder" }}
                asks={exampleAsks}
              />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "MailingEditor",
      file: "app/(staff)/staff/_components/MailingEditor.tsx",
      variants: [
        {
          label: "A letter with a merge field and a part only for those who signed; type { for the fields",
          render: () => (
            <StaffPage as="div">
              <MailingEditorExample />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "MailingsTable",
      file: "app/(staff)/staff/_components/MailingsTable.tsx",
      variants: [
        {
          label: "One from Airtable, sent, with an ask; one not sent yet; and none",
          render: () => (
            <StaffPage as="div">
              <MailingsTable mailings={exampleMailings} />
              <MailingsTable mailings={[]} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "MailingFiles",
      file: "app/(staff)/staff/_components/MailingFiles.tsx",
      variants: [
        {
          label: "A draft's: a PDF, an image and a file of no kind to draw, with the box for more",
          render: () => (
            <StaffPage as="div">
              <MailingFilesExample editable />
            </StaffPage>
          ),
        },
        {
          label: "A mailing sent's, to open",
          render: () => (
            <StaffPage as="div">
              <MailingFilesExample editable={false} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "NotIcon",
      file: "app/(staff)/staff/_components/ui/NotIcon.tsx",
      variants: [
        {
          label: "Before Except, and a condition the preview shows those who don't meet",
          render: () => (
            <StaffPage as="div">
              <p>
                <NotIcon />
                Except
              </p>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "MailingsOverview",
      file: "app/(staff)/staff/_components/MailingsOverview.tsx",
      variants: [
        {
          label: "Two drafts, one coming up, and those sent",
          render: () => (
            <StaffPage as="div">
              <MailingsOverviewExample />
            </StaffPage>
          ),
        },
        {
          label: "No drafts and nothing coming up",
          render: () => (
            <StaffPage as="div">
              <MailingsOverviewExample empty />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "MailingWriter",
      file: "app/(staff)/staff/_components/MailingWriter.tsx",
      variants: [
        {
          label: "A new mailing to the Commons who aren't Labour, nothing written yet",
          render: () => (
            <StaffPage as="div">
              <MailingWriterExample draft={false} />
            </StaffPage>
          ),
        },
        {
          label: "Jo's draft of it, with a file, from Jo, on 1 December",
          render: () => (
            <StaffPage as="div">
              <MailingWriterExample draft />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "MailingView",
      file: "app/(staff)/staff/_components/MailingView.tsx",
      variants: [
        {
          label: "One imported from Airtable: who got it and how it was written, no text",
          render: () => (
            <StaffPage as="div">
              <MailingViewExample state="imported" />
            </StaffPage>
          ),
        },
        {
          label: "Scheduled, with Change the time and Stop",
          render: () => (
            <StaffPage as="div">
              <MailingViewExample state="scheduled" />
            </StaffPage>
          ),
        },
        {
          label: "Sending, with how far it's got",
          render: () => (
            <StaffPage as="div">
              <MailingViewExample state="sending" />
            </StaffPage>
          ),
        },
        {
          label: "Sent, with its counts and recipients",
          render: () => (
            <StaffPage as="div">
              <MailingViewExample state="sent" />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "MailingFor",
      file: "app/(staff)/staff/_components/MailingFor.tsx",
      variants: [
        {
          label: "A draft",
          render: () => (
            <StaffPage as="div">
              <MailingForExample kind="draft" />
            </StaffPage>
          ),
        },
        {
          label: "One sent",
          render: () => (
            <StaffPage as="div">
              <MailingForExample kind="written" />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "MailingLetter",
      file: "app/(staff)/staff/_components/MailingLetter.tsx",
      variants: [
        {
          label: "A letter with fields, a part only for some, bold, italic and a list",
          render: () => (
            <StaffPage as="div">
              <MailingLetter doc={exampleMailingLetter} fields={{ salutation: "Salutation" }} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "FilterPills",
      file: "app/(staff)/staff/_components/MailingParts.tsx",
      variants: [
        {
          label: "The Commons who aren't Labour, who answered an ask",
          render: () => (
            <StaffPage as="div">
              <FilterPills data={exampleWriterData} />
            </StaffPage>
          ),
        },
        {
          label: "Everyone in office",
          render: () => (
            <StaffPage as="div">
              <FilterPills data={{ ...exampleWriterData, filter: { list: "politicians", params: {} } }} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "MailingCounts",
      file: "app/(staff)/staff/_components/MailingParts.tsx",
      variants: [
        {
          label: "Sent, replied, bounced, skipped and answered",
          render: () => (
            <StaffPage as="div">
              <MailingCounts mailing={exampleMailings[0]} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "DueTimeFields",
      file: "app/(staff)/staff/_components/DueTime.tsx",
      variants: [
        {
          label: "Today, no hour yet: the hours too soon greyed out",
          render: () => (
            <StaffPage as="div">
              <DueTimeFieldsExample />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "ChangeTimeForm",
      file: "app/(staff)/staff/_components/DueTime.tsx",
      variants: [
        {
          label: "A time become too soon, moved on to the first it can go",
          render: () => (
            <StaffPage as="div">
              <ChangeTimeFormExample />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "DeleteDraft",
      file: "app/(staff)/staff/_components/MailingButtons.tsx",
      variants: [
        {
          label: "Delete draft, which asks to be sure, and Stop",
          render: () => (
            <StaffPage as="div">
              <MailingButtonsExample id={5} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "StopMailing",
      file: "app/(staff)/staff/_components/MailingButtons.tsx",
      variants: [
        {
          label: "Beside Delete draft",
          render: () => (
            <StaffPage as="div">
              <MailingButtonsExample id={6} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "DeletePolitician",
      file: "app/(staff)/staff/_components/DeletePolitician.tsx",
      variants: [
        {
          label: "At the foot of the page of a politician gone from Airtable",
          render: () => (
            <StaffPage as="div">
              <DeletePoliticianExample />
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
        {
          label: "Without the supporters permission: letters without who wrote them",
          render: () => (
            <StaffPage as="div">
              <PoliticianDetailsExample fromAirtable senders={false} />
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
          label: "Empty, filled in, and an ask with no answer chosen",
          render: () => (
            <StaffPage as="div">
              <PoliticianFilters search={EMPTY_POLITICIAN_FILTERS} asks={exampleAsks} parties={parties} />
              <PoliticianFilters
                search={{
                  ...EMPTY_POLITICIAN_FILTERS,
                  q: "example",
                  house: "lords",
                  status: "in_office",
                  party: ["Labour", "Green"],
                  flag: ["important"],
                  nation: ["wales"],
                  email: ["blocked"],
                  ask: "edinburgh-conference-2026",
                  answer: "declined",
                }}
                asks={exampleAsks}
                parties={parties}
              />
              <PoliticianFilters
                search={{ ...EMPTY_POLITICIAN_FILTERS, ask: "edinburgh-conference-2026" }}
                asks={exampleAsks}
                parties={parties}
              />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "AskForm",
      file: "app/(staff)/staff/_components/AskForm.tsx",
      variants: [
        {
          label: "A new ask",
          render: () => (
            <StaffPage as="div">
              <AskFormExample ask="new" />
            </StaffPage>
          ),
        },
        {
          label: "One staff added, just saved, which nobody has answered: Delete pressed twice",
          render: () => (
            <StaffPage as="div">
              <AskFormExample ask="added" notice="saved" />
            </StaffPage>
          ),
        },
        {
          label: "One politicians have answered: its kind fixed, and it can't be deleted",
          render: () => (
            <StaffPage as="div">
              <AskFormExample ask="answered" notice="in-use" />
            </StaffPage>
          ),
        },
        {
          label: "One the site's code names, which can't be changed",
          render: () => (
            <StaffPage as="div">
              <AskFormExample ask="fixed" />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "DeleteTwice",
      file: "app/(staff)/staff/_components/MailingButtons.tsx",
      variants: [
        {
          label: "Press once to arm it, twice to delete; and one that can't be pressed",
          render: () => (
            <StaffPage as="div">
              <DeleteTwiceExample />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "AsksTable",
      file: "app/(staff)/staff/_components/AsksTable.tsx",
      variants: [
        {
          label: "Every ask, with its answers",
          render: () => (
            <StaffPage as="div">
              <AsksTable asks={exampleAsksWithCounts} />
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
      name: "BounceReason",
      file: "app/(staff)/staff/_components/BounceReason.tsx",
      variants: [
        {
          label: "Postmark's, and one found in someone's Gmail",
          render: () => (
            <StaffPage as="div">
              <p>
                <BounceReason reason="Unknown user" foundInGmail={false} />
              </p>
              <p>
                <BounceReason
                  reason="550 5.1.1 The email account that you tried to reach does not exist."
                  foundInGmail
                />
              </p>
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
          label: "Without the supporters permission: the letter named, not linked",
          render: () => (
            <StaffPage as="div">
              <EmailBlocksTableExample letterLinks={false} />
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
      name: "FilterBar",
      file: "app/(staff)/staff/_components/ui/FilterBar.tsx",
      variants: [
        {
          label: "Nothing on: the search and + Filter",
          render: () => (
            <StaffPage as="div">
              <FilterBar path="#" values={{}} search={{ name: "q", label: "Address" }} filters={EXAMPLE_FILTERS} />
            </StaffPage>
          ),
        },
        {
          label: "A search and a filter on, each removable, and Clear filters",
          render: () => (
            <StaffPage as="div">
              <FilterBar
                path="#"
                values={{ q: "example.org", kind: "hard" }}
                search={{ name: "q", label: "Address" }}
                filters={EXAMPLE_FILTERS}
              />
            </StaffPage>
          ),
        },
        {
          label: "A filter that repeats: one choice found, one left out, and + Filter cut in two with Except",
          render: () => (
            <StaffPage as="div">
              <FilterBar
                path="#"
                values={{ nation: ["scotland", "!wales"] }}
                search={{ name: "q", label: "Name" }}
                filters={EXAMPLE_NATIONS}
              />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "Rosette",
      file: "app/(staff)/staff/_components/PoliticianIcons.tsx",
      variants: [
        {
          label: "Each party's colour, and grey for one we don't know",
          render: () => (
            <StaffPage as="div">
              <p style={{ display: "flex", gap: "12px" }}>
                {[
                  "Labour",
                  "Conservative",
                  "Liberal Democrats",
                  "Scottish National Party",
                  "Green",
                  "Plaid Cymru",
                  "Reform UK",
                  "DUP",
                  "Sinn Féin",
                  "Alliance",
                  "Crossbench",
                ].map((party) => (
                  <Rosette key={party} party={party} />
                ))}
              </p>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "StatusDot",
      file: "app/(staff)/staff/_components/PoliticianIcons.tsx",
      variants: [
        {
          label: "In office, and not",
          render: () => (
            <StaffPage as="div">
              <p style={{ display: "flex", gap: "12px" }}>
                <StatusDot inOffice />
                <StatusDot inOffice={false} />
              </p>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "NationShape",
      file: "app/(staff)/staff/_components/PoliticianIcons.tsx",
      variants: [
        {
          label: "The four nations",
          render: () => (
            <StaffPage as="div">
              <p style={{ display: "flex", gap: "12px" }}>
                {(["england", "scotland", "wales", "northern-ireland"] as const).map((country) => (
                  <NationShape key={country} country={country} />
                ))}
              </p>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "Menu",
      file: "app/(staff)/staff/_components/ui/Menu.tsx",
      variants: [
        {
          label: "A button that opens a box of choices",
          render: () => (
            <StaffPage as="div">
              <Menu id="example-menu" label="Choose">
                <p>One</p>
                <p>Two</p>
              </Menu>
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
          label: "All, and complaints to a search",
          render: () => (
            <StaffPage as="div">
              <EmailBlockFilters q="" kind="" action="/staff/politicians/blocked-emails" />
              <EmailBlockFilters q="example.org" kind="complaint" action="/staff/politicians/blocked-emails" />
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
              <EmailProblemsTable problems={exampleProblems} letterLinks />
            </StaffPage>
          ),
        },
        {
          label: "Without the supporters permission: the letter named, not linked",
          render: () => (
            <StaffPage as="div">
              <EmailProblemsTable problems={exampleProblems} letterLinks={false} />
            </StaffPage>
          ),
        },
        {
          label: "None",
          render: () => (
            <StaffPage as="div">
              <EmailProblemsTable problems={[]} letterLinks />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "LettersList",
      file: "app/(staff)/staff/_components/LettersTable.tsx",
      variants: [
        {
          label: "The letters page's list: how many, Download, and the pages",
          render: () => (
            <StaffPage as="div">
              <LettersList
                letters={[exampleLetter]}
                total={150}
                pages={2}
                pageSize={100}
                search={{ status: "", q: "", answered: "", campaign: "", consent: "", page: "2" }}
              />
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
      name: "LetterDetails",
      file: "app/(staff)/staff/_components/LetterDetails.tsx",
      variants: [
        {
          label: "A supporter's letter that bounced, with its copy in the policy@ group",
          render: () => (
            <StaffPage as="div">
              <LetterDetails letter={exampleSupporterLetterDetails} />
            </StaffPage>
          ),
        },
        {
          label:
            "PauseAI's letter, personalised, copied from Airtable, found by a Gmail search, nothing recorded since",
          render: () => (
            <StaffPage as="div">
              <LetterDetails letter={examplePauseaiLetterDetails} />
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
      name: "CampaignName",
      file: "app/(staff)/staff/_components/CampaignName.tsx",
      variants: [
        {
          label: "A campaign linked to its page, and one no longer run, by its slug",
          render: () => (
            <StaffPage as="div">
              <p>
                <CampaignName slug={pm.slug} /> · <CampaignName slug="old-campaign" />
              </p>
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
    {
      name: "LetterFilters",
      file: "app/(staff)/staff/_components/LetterFilters.tsx",
      variants: [
        {
          label: "One status, a campaign and consent picked",
          render: () => (
            <StaffPage as="div">
              <LetterFilters
                search={{
                  status: "bounced",
                  q: "",
                  answered: "",
                  campaign: "regulate-letter-pm",
                  consent: "yes",
                  page: "",
                }}
              />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "LetterLink",
      file: "app/(staff)/staff/_components/LetterLink.tsx",
      variants: [
        {
          label: "A letter, by whom it was to",
          render: () => (
            <StaffPage as="div">
              <LetterLink letter={{ id: 17, to: "Bouncy McTestface MP" }} linked />
            </StaffPage>
          ),
        },
        {
          label: "Not linked, for staff without the supporters permission",
          render: () => (
            <StaffPage as="div">
              <LetterLink letter={{ id: 17, to: "Bouncy McTestface MP" }} linked={false} />
            </StaffPage>
          ),
        },
      ],
    },
  ],
};
