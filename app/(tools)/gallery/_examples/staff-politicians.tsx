// The staff interface's politicians and asks: the list, its filters and
// icons, a politician's page, and the asks, on fake politicians.
// Their links go to /staff pages, which send anyone without a session to the
// login page.
import { NationShape, Rosette, StatusDot } from "@/app/(staff)/staff/_components/PoliticianIcons";
import PoliticianFilters from "@/app/(staff)/staff/_components/PoliticianFilters";
import { HouseTabs } from "@/app/(staff)/staff/_components/PoliticiansList";
import StaffPage from "@/app/(staff)/staff/_components/ui/StaffPage";
import {
  exampleAsks,
  exampleAsksWithCounts,
  examplePolitician,
  examplePoliticiansPage,
} from "@/app/(staff)/staff/_components/PoliticianTable.examples";
import AsksTable from "@/app/(staff)/staff/_components/AsksTable";
import { AskLead, AskPreview, AskTitle } from "@/app/(staff)/staff/_components/AskLine";
import type { Group } from "../_components/types";
import {
  ChoosingHeadExample,
  ChoosingListExample,
  PasteFormExample,
  PickBoxExample,
  PoliticiansListExample,
  AskRowExample,
  PoliticianDetailsExample,
  PoliticianTableEmptyExample,
  PoliticianTableExample,
  DeletePoliticianExample,
  AskFormExample,
} from "./staff.client";

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
  tab: "",
  pasted: [] as string[],
};

export const staffPoliticians: Group = {
  id: "staff-politicians",
  title: "The staff interface: politicians and asks",
  examples: [
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
        {
          label: "Choosing who a mailing is for: the ticked tab, last, chosen",
          render: () => (
            <StaffPage as="div">
              <HouseTabs
                search={{ ...EMPTY_POLITICIAN_FILTERS, mailing: "12", tab: "ticked" }}
                choosing={{ id: 12, title: "Edinburgh thank-you", blank: false, ticked: [1, 2, 3] }}
              />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "ChoosingHead",
      file: "app/(staff)/staff/_components/PoliticiansList.tsx",
      variants: [
        {
          label: "Choosing who a new mailing is for: what to do, with Cancel, over the title",
          render: () => (
            <StaffPage as="div">
              <ChoosingHeadExample blank />
            </StaffPage>
          ),
        },
        {
          label: "Choosing who a draft goes to, named, with the way back to it",
          render: () => (
            <StaffPage as="div">
              <ChoosingHeadExample blank={false} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "PasteForm",
      file: "app/(staff)/staff/_components/PasteForm.tsx",
      variants: [
        {
          label: "The box for names, one a line, and Find these",
          render: () => (
            <StaffPage as="div">
              <PasteFormExample />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "PickBox",
      file: "app/(staff)/staff/_components/PickBox.tsx",
      variants: [
        {
          label: "Ticked, not ticked, and part ticked",
          render: () => (
            <StaffPage as="div">
              <PickBoxExample />
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
          label: "Choosing who a draft goes to: a tick box on each row and over them, Paste names, the bar at the foot",
          // The bar is fixed to the window's foot; a transform makes this example its window, so it sits at the example's foot.
          render: () => (
            <div style={{ transform: "translateZ(0)" }}>
              <StaffPage as="div">
                <ChoosingListExample />
              </StaffPage>
            </div>
          ),
        },
        {
          label: "After a paste: a row for each person the lines found, and why",
          render: () => (
            <div style={{ transform: "translateZ(0)" }}>
              <StaffPage as="div">
                <ChoosingListExample pasted />
              </StaffPage>
            </div>
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
      name: "AskRow",
      file: "app/(staff)/staff/_components/AskRow.tsx",
      variants: [
        { label: "An answer from Airtable, and an ask staff record with none yet", render: () => <AskRowExample /> },
        { label: "A letter they declined, crossed", render: () => <AskRowExample declined /> },
      ],
    },
    {
      name: "AskRows",
      file: "app/(staff)/staff/_components/AskRow.tsx",
      variants: [{ label: "Rows of asks, their answers lined up in a column", render: () => <AskRowExample /> }],
    },
    {
      name: "PoliticianAsks",
      file: "app/(staff)/staff/_components/AskRow.tsx",
      variants: [
        {
          label: "A politician's asks: those answered, in order, and the button for another",
          render: () => <AskRowExample others />,
        },
      ],
    },
    {
      name: "PoliticianDetails",
      file: "app/(staff)/staff/_components/PoliticianDetails.tsx",
      variants: [
        {
          label: "A signer the team added, staff's notes in the history",
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
      name: "AskPreview",
      file: "app/(staff)/staff/_components/AskLine.tsx",
      variants: [
        {
          label: "An event, with a date and a link, before it's answered",
          render: () => (
            <StaffPage as="div">
              <AskPreview ask={exampleAsks[0]} />
            </StaffPage>
          ),
        },
        {
          label: "A letter with no link",
          render: () => (
            <StaffPage as="div">
              <AskPreview ask={{ ...exampleAsks[2], url: null, date: null }} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "AskLead",
      file: "app/(staff)/staff/_components/AskLine.tsx",
      variants: [
        {
          label: "Who asked them to do what, and when, leading into the ask's title",
          render: () => (
            <StaffPage as="div">
              <AskLead ask={exampleAsks[0]} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "AskTitle",
      file: "app/(staff)/staff/_components/AskLine.tsx",
      variants: [
        {
          label: "Linked to another site, to a page of ours, and not linked",
          render: () => (
            <StaffPage as="div">
              <p>
                <AskTitle ask={exampleAsks[0]} />
              </p>
              <p>
                <AskTitle ask={{ ...exampleAsks[2], url: "/campaigns/dear-sir-demis-2025" }} />
              </p>
              <p>
                <AskTitle ask={exampleAsks[1]} />
              </p>
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
  ],
};
