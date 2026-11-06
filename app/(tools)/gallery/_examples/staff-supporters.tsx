// The staff interface's supporter pages: the list and its filters, a
// supporter's details, notes and erasure, on fake supporters.
// Their links go to /staff pages, which send anyone without a session to the
// login page.
import EraseLink from "@/app/(staff)/staff/_components/EraseLink";
import ErasedNotice from "@/app/(staff)/staff/_components/ErasedNotice";
import SupporterBadges from "@/app/(staff)/staff/_components/SupporterBadges";
import SubscriptionBadges from "@/app/(staff)/staff/_components/SubscriptionBadges";
import ChannelIcon from "@/app/(staff)/staff/_components/ChannelIcon";
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
import type { Group } from "../_components/types";
import {
  EraseFormExample,
  NotesExample,
  NoteChangesExample,
  NoteEntryExample,
  NoteFormExample,
  NoteHistoryExample,
  NoteTextExample,
} from "./staff.client";

/** Luma events a filter of supporters picks from, newest first. */
const exampleEventChoices = [
  { id: "evt-1", name: "PauseAI Leicester meetup", startAt: "2026-10-20T18:00:00Z" },
  { id: "evt-2", name: "AI risk talk", startAt: "2026-10-12T18:00:00Z" },
  { id: "evt-3", name: "PauseAI London March", startAt: "2026-09-05T11:00:00Z" },
];

export const staffSupporters: Group = {
  id: "staff-supporters",
  title: "The staff interface: supporters",
  examples: [
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
        {
          label: "Erased, but something couldn't be cleared",
          render: () => (
            <StaffPage as="div">
              <ErasedNotice erased="partly" why="mail,oneOffs" />
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
      name: "Notes",
      file: "app/(staff)/staff/_components/Notes.tsx",
      variants: [
        {
          label: "A supporter's notes, as their writer sees them: her newest she can still change",
          render: () => (
            <StaffPage as="div">
              <NotesExample />
            </StaffPage>
          ),
        },
        {
          label: "As an admin, who can delete any",
          render: () => (
            <StaffPage as="div">
              <NotesExample as="admin" />
            </StaffPage>
          ),
        },
        {
          label: "None yet",
          render: () => (
            <StaffPage as="div">
              <NotesExample as="empty" />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "NoteEntry",
      file: "app/(staff)/staff/_components/Notes.tsx",
      variants: [
        { label: "In a history: her own, which she can change", render: () => <NoteEntryExample /> },
        { label: "Someone else's, edited", render: () => <NoteEntryExample own={false} /> },
      ],
    },
    {
      name: "NoteChanges",
      file: "app/(staff)/staff/_components/NoteChanges.tsx",
      variants: [
        { label: "Its writer's: Edit, which opens Save, Cancel and Delete", render: () => <NoteChangesExample /> },
        { label: "An admin's, on someone else's: Delete alone", render: () => <NoteChangesExample editable={false} /> },
      ],
    },
    {
      name: "NoteHistory",
      file: "app/(staff)/staff/_components/NoteHistory.tsx",
      variants: [
        {
          label: "With Write a note, which drafts one at the top",
          render: () => (
            <StaffPage as="div">
              <NoteHistoryExample />
            </StaffPage>
          ),
        },
        {
          label: "Nothing yet",
          render: () => (
            <StaffPage as="div">
              <NoteHistoryExample lines={false} />
            </StaffPage>
          ),
        },
        {
          label: "Without Write a note",
          render: () => (
            <StaffPage as="div">
              <NoteHistoryExample writable={false} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "NoteForm",
      file: "app/(staff)/staff/_components/NoteForm.tsx",
      variants: [
        { label: "Closed: the button that opens it", render: () => <NoteFormExample /> },
        { label: "Opened, on a supporter, with what a note should be", render: () => <NoteFormExample opened /> },
        { label: "Opened, on a politician", render: () => <NoteFormExample on="politicianId" opened /> },
      ],
    },
    {
      name: "NoteText",
      file: "app/(staff)/staff/_components/Notes.tsx",
      variants: [{ label: "With addresses, as links, on two lines", render: () => <NoteTextExample /> }],
    },
  ],
};
