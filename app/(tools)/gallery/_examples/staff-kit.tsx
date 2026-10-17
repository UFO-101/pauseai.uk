// The staff interface's kit (app/(staff)/staff/_components/ui/), as the staff screens use it.
import { Button } from "@/components/ui/Button";
import Actions from "@/app/(staff)/staff/_components/ui/Actions";
import ErrorText from "@/app/(staff)/staff/_components/ui/ErrorText";
import { Filters, StaffForm } from "@/app/(staff)/staff/_components/ui/forms";
import Muted from "@/app/(staff)/staff/_components/ui/Muted";
import StaffPage from "@/app/(staff)/staff/_components/ui/StaffPage";
import StaffTable from "@/app/(staff)/staff/_components/ui/StaffTable";
import Tag, { type TagKind } from "@/app/(staff)/staff/_components/ui/Tag";
import type { Group } from "../_components/types";

// Every kind of tag, and plain, so a new kind is a type error until it's here.
const KINDS: Record<TagKind | "plain", TagKind | undefined> = {
  plain: undefined,
  airtable: "airtable",
  web: "web",
  nightly: "nightly",
};

const ROWS = [
  { name: "Example Person", seat: "Seat 1", email: "person@example.org" },
  { name: "Another Example", seat: "Seat 2", email: null },
  { name: "A Third Example", seat: "Seat 3", email: "third@example.org" },
];

export const staffKit: Group = {
  id: "staff-kit",
  title: "The staff interface's kit",
  examples: [
    {
      name: "StaffPage",
      file: "app/(staff)/staff/_components/ui/StaffPage.tsx",
      variants: [
        {
          label: "A page's frame, with a heading and a line",
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
      name: "StaffTable",
      file: "app/(staff)/staff/_components/ui/StaffTable.tsx",
      variants: [
        {
          label: "A few rows",
          render: () => (
            <StaffPage as="div">
              <StaffTable>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Seat</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row) => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      <td>{row.seat}</td>
                      <td>{row.email ?? <Muted>none</Muted>}</td>
                    </tr>
                  ))}
                </tbody>
              </StaffTable>
            </StaffPage>
          ),
        },
        {
          label: "Wider than a phone, scrolling sideways",
          render: () => (
            <StaffPage as="div">
              <StaffTable>
                <thead>
                  <tr>
                    {Array.from({ length: 8 }, (_, i) => (
                      <th key={i}>Column {i + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row) => (
                    <tr key={row.name}>
                      {Array.from({ length: 8 }, (_, i) => (
                        <td key={i}>
                          {row.name}, cell {i + 1}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </StaffTable>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "Tag",
      file: "app/(staff)/staff/_components/ui/Tag.tsx",
      variants: (Object.keys(KINDS) as (keyof typeof KINDS)[]).map((kind) => ({
        label: `${kind[0].toUpperCase()}${kind.slice(1)}, after a heading and beside a name`,
        render: () => (
          <StaffPage as="div">
            <h2>
              An example heading <Tag kind={KINDS[kind]}>{kind}</Tag>
            </h2>
            <p>
              Example Person <Tag kind={KINDS[kind]}>{kind}</Tag>
            </p>
          </StaffPage>
        ),
      })),
    },
    {
      name: "Muted",
      file: "app/(staff)/staff/_components/ui/Muted.tsx",
      variants: [
        {
          label: "An email under a name, a date after a status",
          render: () => (
            <StaffPage as="div">
              <p>
                Example Person
                <br />
                <Muted>person@example.org</Muted>
              </p>
              <p>
                Signed <Muted>2026-10-01</Muted>
              </p>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "ErrorText",
      file: "app/(staff)/staff/_components/ui/ErrorText.tsx",
      variants: [
        {
          label: "In a line of text",
          render: () => (
            <StaffPage as="div">
              <p>
                Plain text, then <ErrorText>an example of something going wrong</ErrorText>.
              </p>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "Actions",
      file: "app/(staff)/staff/_components/ui/Actions.tsx",
      variants: [
        {
          label: "Two buttons, side by side, stacked on a phone",
          render: () => (
            <StaffPage as="div">
              <Actions>
                <Button variant="primary" size="small">
                  One
                </Button>
                <Button variant="ghost" size="small">
                  Two
                </Button>
              </Actions>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "Filters",
      file: "app/(staff)/staff/_components/ui/forms.tsx",
      variants: [
        {
          label: "A select, a search and a button, in a row",
          render: () => (
            <StaffPage as="div">
              <Filters method="get" action="/staff/letters">
                <label>
                  Status
                  <select name="status" defaultValue="">
                    <option value="">Any</option>
                    <option value="sent">Sent</option>
                  </select>
                </label>
                <label>
                  Search
                  <input type="search" name="q" />
                </label>
                <Button variant="primary" size="small" type="submit">
                  Filter
                </Button>
              </Filters>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "StaffForm",
      file: "app/(staff)/staff/_components/ui/forms.tsx",
      variants: [
        {
          label: "Fields in a column, and a button",
          render: () => (
            <StaffPage as="div">
              <StaffForm>
                <label>
                  Name
                  <input name="name" defaultValue="Example Person" />
                </label>
                <label>
                  Email
                  <input name="email" type="email" />
                </label>
                <label>
                  Note
                  <textarea name="note" rows={3} />
                </label>
                <div>
                  <Button variant="primary" size="small" fit type="submit">
                    Save
                  </Button>
                </div>
              </StaffForm>
            </StaffPage>
          ),
        },
      ],
    },
  ],
};
