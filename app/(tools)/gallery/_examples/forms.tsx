// The ui kit's forms, words and tables (components/ui/), each at both
// densities: comfortable, the public site's, and compact, the staff
// interface's.
import { Button } from "@/components/ui/Button";
import Actions from "@/components/ui/Actions";
import { DateRange, FileInput, Select, TextArea, TextInput } from "@/components/ui/Controls";
import { Field, FieldError, FieldGroup, FieldSet, Hint, Label } from "@/components/ui/Field";
import { FilterForm, FormStack } from "@/components/ui/Form";
import StatusMessage from "@/components/ui/StatusMessage";
import Table from "@/components/ui/Table";
import Tag, { type TagTone } from "@/components/ui/Tag";
import { ErrorText, Muted } from "@/components/ui/Text";
import Densities from "../_components/Densities";
import type { Group } from "../_components/types";
import { CheckboxExample, LinkButtonExample, SegmentedExample, StatusMessageUndoExample } from "./forms.client";

// Every tone, so a new one is a type error until it's here.
const TONES: Record<TagTone, string> = { red: "Red", amber: "Amber", green: "Green", blue: "Blue" };

export const forms: Group = {
  id: "forms",
  title: "Forms, words and tables",
  examples: [
    {
      name: "Field",
      file: "components/ui/Field.tsx",
      variants: [
        {
          label: "A label over its text box",
          render: () => (
            <Densities>
              {() => (
                <Field label="Example email">
                  <TextInput type="email" defaultValue="someone@example.org" />
                </Field>
              )}
            </Densities>
          ),
        },
      ],
    },
    {
      name: "FieldSet",
      file: "components/ui/Field.tsx",
      variants: [
        {
          label: "A label over a date range",
          render: () => (
            <Densities>
              {() => (
                <FieldSet label="Example dates">
                  <DateRange
                    from={{ "aria-label": "Example from", defaultValue: "2026-01-01" }}
                    to={{ "aria-label": "Example to" }}
                  />
                </FieldSet>
              )}
            </Densities>
          ),
        },
      ],
    },
    {
      name: "DateRange",
      file: "components/ui/Controls.tsx",
      variants: [
        {
          label: "From a day to another",
          render: () => (
            <Densities>
              {() => (
                <DateRange
                  from={{ "aria-label": "Example from", defaultValue: "2026-01-01" }}
                  to={{ "aria-label": "Example to", defaultValue: "2026-12-31" }}
                />
              )}
            </Densities>
          ),
        },
      ],
    },
    {
      name: "Label",
      file: "components/ui/Field.tsx",
      variants: [
        {
          label: "For a field, with a note, and over a group of buttons",
          render: () => (
            <Densities>
              {(density) => (
                <>
                  <Label htmlFor={`gallery-label-${density}`} note="(optional)">
                    An example field
                  </Label>
                  <TextInput id={`gallery-label-${density}`} defaultValue="Some text" />
                  <Label>An example group</Label>
                </>
              )}
            </Densities>
          ),
        },
      ],
    },
    {
      name: "FieldGroup",
      file: "components/ui/Field.tsx",
      variants: [
        {
          label: "A field with a hint and an error under it",
          render: () => (
            <Densities>
              {(density) => (
                <FieldGroup>
                  <Field label="Example postcode">
                    <TextInput aria-invalid aria-describedby={`gallery-group-${density}`} defaultValue="ZZ9" />
                  </Field>
                  <Hint id={`gallery-group-${density}`}>An example hint about the field.</Hint>
                  <FieldError>An example of what&rsquo;s wrong with it.</FieldError>
                </FieldGroup>
              )}
            </Densities>
          ),
        },
      ],
    },
    {
      name: "Hint",
      file: "components/ui/Field.tsx",
      variants: [
        {
          label: "A note under a control",
          render: () => <Densities>{() => <Hint>An example note about a control.</Hint>}</Densities>,
        },
      ],
    },
    {
      name: "FieldError",
      file: "components/ui/Field.tsx",
      variants: [
        {
          label: "What's wrong",
          render: () => (
            <Densities>
              {() => <FieldError announce="status">An example of what&rsquo;s wrong with the field.</FieldError>}
            </Densities>
          ),
        },
      ],
    },
    {
      name: "TextInput",
      file: "components/ui/Controls.tsx",
      variants: [
        {
          label: "Text, a search, a date and a time, and disabled",
          render: () => (
            <Densities>
              {() => (
                <div style={{ display: "grid", gap: "var(--form-gap)" }}>
                  <TextInput aria-label="Example text" defaultValue="Some text" />
                  <TextInput aria-label="Example search" type="search" placeholder="Search" />
                  <TextInput aria-label="Example date" type="date" defaultValue="2026-01-01" />
                  <TextInput aria-label="Example time" type="time" defaultValue="18:30" />
                  <TextInput aria-label="Example disabled" defaultValue="Can't change" disabled />
                </div>
              )}
            </Densities>
          ),
        },
      ],
    },
    {
      name: "Select",
      file: "components/ui/Controls.tsx",
      variants: [
        {
          label: "A few options",
          render: () => (
            <Densities>
              {() => (
                <Select aria-label="Example select" defaultValue="two">
                  <option value="one">Option one</option>
                  <option value="two">Option two</option>
                </Select>
              )}
            </Densities>
          ),
        },
      ],
    },
    {
      name: "TextArea",
      file: "components/ui/Controls.tsx",
      variants: [
        {
          label: "A few lines",
          render: () => (
            <Densities>
              {() => <TextArea aria-label="Example text area" defaultValue={"A first line.\nA second line."} />}
            </Densities>
          ),
        },
      ],
    },
    {
      name: "FileInput",
      file: "components/ui/Controls.tsx",
      variants: [
        {
          label: "For an image",
          render: () => <Densities>{() => <FileInput aria-label="Example file" accept="image/*" />}</Densities>,
        },
      ],
    },
    {
      name: "Checkbox",
      file: "components/ui/Controls.tsx",
      variants: [
        {
          label: "Ticked, and with a label that wraps",
          render: () => <Densities>{() => <CheckboxExample />}</Densities>,
        },
      ],
    },
    {
      name: "Segmented",
      file: "components/ui/Controls.tsx",
      variants: [
        { label: "Three options, one picked", render: () => <Densities>{() => <SegmentedExample />}</Densities> },
      ],
    },
    {
      name: "FormStack",
      file: "components/ui/Form.tsx",
      variants: [
        {
          label: "Fields in a column, then the button",
          render: () => (
            <Densities>
              {() => (
                <FormStack aria-label="Example form">
                  <Field label="Example name">
                    <TextInput defaultValue="Example Person" />
                  </Field>
                  <Field label="Example house">
                    <Select defaultValue="commons">
                      <option value="commons">Commons</option>
                      <option value="lords">Lords</option>
                    </Select>
                  </Field>
                  <div>
                    <Button variant="primary" size="small" type="button" fit>
                      Save
                    </Button>
                  </div>
                </FormStack>
              )}
            </Densities>
          ),
        },
      ],
    },
    {
      name: "FilterForm",
      file: "components/ui/Form.tsx",
      variants: [
        {
          label: "A select, a search box and a small button, along their bottoms",
          render: () => (
            <Densities>
              {() => (
                <FilterForm aria-label="Example filters">
                  <Field label="Example status">
                    <Select defaultValue="">
                      <option value="">Any</option>
                      <option value="sent">Sent</option>
                    </Select>
                  </Field>
                  <Field label="Example search">
                    <TextInput type="search" />
                  </Field>
                  <Button variant="primary" size="small" type="button" fit>
                    Filter
                  </Button>
                </FilterForm>
              )}
            </Densities>
          ),
        },
      ],
    },
    {
      name: "Tag",
      file: "components/ui/Tag.tsx",
      variants: [
        {
          label: "Plain and each tone, after a heading and in a list",
          render: () => (
            <Densities>
              {() => (
                <>
                  <h2>
                    An example heading <Tag>Plain</Tag>
                  </h2>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                    <Tag>Plain</Tag>
                    {(Object.keys(TONES) as TagTone[]).map((tone) => (
                      <Tag key={tone} tone={tone}>
                        {TONES[tone]}
                      </Tag>
                    ))}
                  </div>
                </>
              )}
            </Densities>
          ),
        },
      ],
    },
    {
      name: "Table",
      file: "components/ui/Table.tsx",
      variants: [
        {
          label: "A few rows, with muted and tagged cells",
          render: () => (
            <Densities>
              {() => (
                <Table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Party</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Example Person MP</td>
                      <td>Example Party</td>
                      <td>
                        <Tag tone="green">Signed</Tag>
                      </td>
                    </tr>
                    <tr>
                      <td>Another Example MP</td>
                      <td>
                        <Muted>None</Muted>
                      </td>
                      <td>
                        <Tag>Not yet</Tag>
                      </td>
                    </tr>
                  </tbody>
                </Table>
              )}
            </Densities>
          ),
        },
        {
          label: "Centred in each row, for rows with buttons",
          render: () => (
            <Densities>
              {() => (
                <Table align="middle">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Added</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>jo@example.org</td>
                      <td>2026-10-20 09:00</td>
                      <td>
                        <Button variant="ghost" size="small">
                          Remove
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                </Table>
              )}
            </Densities>
          ),
        },
      ],
    },
    {
      name: "Muted",
      file: "components/ui/Text.tsx",
      variants: [
        {
          label: "Inside a sentence",
          render: () => (
            <Densities>
              {() => (
                <p>
                  An example line, sent <Muted>16 Oct 2026</Muted>.
                </p>
              )}
            </Densities>
          ),
        },
      ],
    },
    {
      name: "ErrorText",
      file: "components/ui/Text.tsx",
      variants: [
        {
          label: "Inside a sentence",
          render: () => (
            <Densities>
              {() => (
                <p>
                  An example import: <ErrorText>it failed</ErrorText>.
                </p>
              )}
            </Densities>
          ),
        },
      ],
    },
    {
      name: "Actions",
      file: "components/ui/Actions.tsx",
      variants: [
        {
          label: "Two buttons, from the left, stacked on a phone",
          render: () => (
            <Densities>
              {() => (
                <Actions>
                  <Button variant="primary" size="small" type="button">
                    Apply
                  </Button>
                  <Button variant="ghost" size="small" type="button">
                    Discard
                  </Button>
                </Actions>
              )}
            </Densities>
          ),
        },
      ],
    },
    {
      name: "LinkButton",
      file: "components/ui/LinkButton.tsx",
      variants: [
        { label: "After the text it acts on", render: () => <Densities>{() => <LinkButtonExample />}</Densities> },
      ],
    },
    {
      name: "StatusMessage",
      file: "components/ui/StatusMessage.tsx",
      variants: [
        {
          label: "Alone",
          render: () => <Densities>{() => <StatusMessage>An example of what just happened.</StatusMessage>}</Densities>,
        },
        { label: "With Undo", render: () => <Densities>{() => <StatusMessageUndoExample />}</Densities> },
      ],
    },
  ],
};
