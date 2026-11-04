// The staff interface's own kit (app/(staff)/staff/_components/ui and the
// pieces every staff page shares): the page frame, which sets the compact
// density, the navigation, lists, tabs, bands, filters, menus and bubbles.
// Their links go to /staff pages, which send anyone without a session to the
// login page.
import { Button, ButtonLink } from "@/components/ui/Button";
import FilterBar from "@/app/(staff)/staff/_components/ui/FilterBar";
import Menu from "@/app/(staff)/staff/_components/ui/Menu";
import Bubble, { BubbleBox } from "@/app/(staff)/staff/_components/ui/Bubble";
import { bubbleTrigger } from "@/app/(staff)/staff/_components/ui/bubble-trigger";
import CopyButton from "@/app/(staff)/staff/_components/ui/CopyButton";
import Alert from "@/app/(staff)/staff/_components/Alert";
import AlertIcon from "@/app/(staff)/staff/_components/AlertIcon";
import StaffNav, { type StaffPage as StaffPageName } from "@/app/(staff)/staff/_components/StaffNav";
import Breadcrumb from "@/app/(staff)/staff/_components/Breadcrumb";
import NotIcon from "@/app/(staff)/staff/_components/ui/NotIcon";
import ListFrame, { ListTable, type ListColumn } from "@/app/(staff)/staff/_components/ui/ListFrame";
import ChoiceSearch from "@/app/(staff)/staff/_components/ui/ChoiceSearch";
import NavFold from "@/app/(staff)/staff/_components/ui/NavFold";
import FormPending from "@/app/(staff)/staff/_components/ui/FormPending";
import StaffLink from "@/app/(staff)/staff/_components/ui/StaffLink";
import NavIcon from "@/app/(staff)/staff/_components/NavIcon";
import SortHeading from "@/app/(staff)/staff/_components/SortHeading";
import Table from "@/components/ui/Table";
import StaffPage from "@/app/(staff)/staff/_components/ui/StaffPage";
import Band, { BandFact } from "@/app/(staff)/staff/_components/ui/Band";
import Counts from "@/app/(staff)/staff/_components/ui/Counts";
import DownloadMenu from "@/app/(staff)/staff/_components/ui/DownloadMenu";
import Grid, { Card, Column } from "@/app/(staff)/staff/_components/ui/Grid";
import Progress from "@/app/(staff)/staff/_components/ui/Progress";
import PageTitle from "@/app/(staff)/staff/_components/ui/PageTitle";
import Strip from "@/app/(staff)/staff/_components/ui/Strip";
import Tabs from "@/app/(staff)/staff/_components/ui/Tabs";
import Tag from "@/components/ui/Tag";
import type { Group } from "../_components/types";
import { NoticeExample, DeleteTwiceExample } from "./staff.client";

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
  events: true,
  supporterEmails: true,
  politicians: true,
  asks: true,
  mailings: true,
  mpEmails: true,
  import: true,
  changes: true,
  accounts: true,
};

export const staffKit: Group = {
  id: "staff-kit",
  title: "The staff interface: its kit",
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
      name: "Column",
      file: "app/(staff)/staff/_components/ui/Grid.tsx",
      variants: [
        {
          label: "Two cards, one under the other, beside a record two-thirds wide",
          render: () => (
            <StaffPage as="div">
              <Grid>
                <Card span={4}>The record, two-thirds wide.</Card>
                <Column span={2}>
                  <Card look="aside" title="Asks" id="column-asks">
                    An aside
                  </Card>
                  <Card look="log" title="History" id="column-history">
                    A history under it
                  </Card>
                </Column>
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
      name: "PageTitle",
      file: "app/(staff)/staff/_components/ui/PageTitle.tsx",
      variants: [
        {
          label: "The title, with the page's main button at the right",
          render: () => (
            <StaffPage as="div">
              <PageTitle
                action={
                  <ButtonLink variant="primary" fit href="#">
                    New mailing
                  </ButtonLink>
                }
              >
                Mailings
              </PageTitle>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "DownloadMenu",
      file: "app/(staff)/staff/_components/ui/DownloadMenu.tsx",
      variants: [
        {
          label: "Download, opening the formats of every row: CSV and JSON",
          render: () => (
            <StaffPage as="div">
              <DownloadMenu download={(format) => `#${format}`} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "Band",
      file: "app/(staff)/staff/_components/ui/Band.tsx",
      variants: [
        {
          label: "A title with a tag, three facts, two with a line under them, and counts at the right",
          render: () => (
            <StaffPage as="div">
              <Band
                title="Please make the Millennium Dome into a giant pause button"
                tag={<Tag>Sent</Tag>}
                aside={
                  <Counts
                    counts={[
                      { key: "sent", n: 84, label: "sent" },
                      { key: "failed", n: 3, label: "failed", tone: "red" },
                    ]}
                  />
                }
              >
                <BandFact label="Sent" detail="by francis@pauseai.uk">
                  29 Oct 2026, 14:18
                </BandFact>
                <BandFact label="From" detail="Francis, PauseAI UK">
                  policy@pauseai.uk
                </BandFact>
                <BandFact label="Ask">
                  <a href="#">Giant pause button funding request</a>
                </BandFact>
              </Band>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "BandFact",
      file: "app/(staff)/staff/_components/ui/Band.tsx",
      variants: [
        {
          label: "A fact in a band, and one with no value, which shows nothing",
          render: () => (
            <StaffPage as="div">
              <Band title="A supporter">
                <BandFact label="Place" detail="from their postcode, M1 1AE">
                  Manchester, England
                </BandFact>
                <BandFact label="Their MP">{null}</BandFact>
              </Band>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "Counts",
      file: "app/(staff)/staff/_components/ui/Counts.tsx",
      variants: [
        {
          label: "Each leading to its list, the failed one chosen; a 0 and a count that doesn't apply, grey",
          render: () => (
            <StaffPage as="div">
              <Counts
                counts={[
                  { key: "sent", n: 84, label: "sent", href: "#sent" },
                  { key: "failed", n: 3, label: "failed", tone: "red", href: "#failed", current: true },
                  { key: "replied", n: 0, label: "replied", href: "#replied" },
                  { key: "answered", n: null, label: "answers" },
                ]}
              />
            </StaffPage>
          ),
        },
        {
          label: "Small, in a list's row, the whole box one link; answers in green",
          render: () => (
            <StaffPage as="div">
              <Counts
                small
                href="#mailing"
                label="How the mailing went"
                counts={[
                  { key: "sent", n: 129, label: "sent" },
                  { key: "failed", n: 2, label: "failed", tone: "red" },
                  { key: "replied", n: 11, label: "replied" },
                  { key: "answered", n: 14, label: "answers", tone: "green" },
                ]}
              />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "Progress",
      file: "app/(staff)/staff/_components/ui/Progress.tsx",
      variants: [
        {
          label: "Sending, in a list's row, and big, on a page; answers, in green",
          render: () => (
            <StaffPage as="div">
              <div style={{ display: "grid", gap: "24px", maxWidth: "40rem" }}>
                <Progress value={212} max={650} tone="blue" label="Sent">
                  Sending: 212 of 650 sent
                </Progress>
                <Progress value={40} max={86} tone="blue" label="Sent" big>
                  Sending: 40 of 86 sent
                </Progress>
                <Progress value={14} max={127} tone="green" label="Answered the ask" big>
                  Sent: ✓ 14 of 127 answered the ask
                </Progress>
              </div>
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
          label: "Each tone: plain, green, amber, red and dark, with an action at the right",
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
                <Strip tone="dark" action={<a href="#">Cancel</a>}>
                  <span>New mailing: tick who it&apos;s for</span>
                  <span>Tick each person it&apos;s for.</span>
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
      name: "Notice",
      file: "app/(staff)/staff/_components/ui/Notice.tsx",
      variants: [{ label: "Open, lit as it opens; its × closes it", render: () => <NoticeExample /> }],
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
      name: "DeleteTwice",
      file: "app/(staff)/staff/_components/DeleteTwice.tsx",
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
      name: "CopyButton",
      file: "app/(staff)/staff/_components/ui/CopyButton.tsx",
      variants: [
        {
          label: "Copies its text, then says so, with a note in a bubble",
          render: () => (
            <StaffPage as="div">
              <CopyButton
                text="rfc822msgid:4f1c@pauseai.uk"
                label="Copy"
                copied="Copied!"
                note="Paste it in"
                close="Close"
              />
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
      name: "Bubble",
      file: "app/(staff)/staff/_components/ui/Bubble.tsx",
      variants: [
        {
          label: "A button that opens a form or a few words, pointing to it",
          render: () => (
            <StaffPage as="div">
              <Bubble id="example-bubble" label="Edit">
                <p>A small form</p>
              </Bubble>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "BubbleBox",
      file: "app/(staff)/staff/_components/ui/Bubble.tsx",
      variants: [
        {
          label: "The bubble alone, for a button of its own look",
          render: () => (
            <StaffPage as="div">
              <button type="button" {...bubbleTrigger("example-bubble-box")}>
                ?
              </button>
              <BubbleBox id="example-bubble-box">
                <p>A few words</p>
              </BubbleBox>
            </StaffPage>
          ),
        },
      ],
    },
  ],
};
