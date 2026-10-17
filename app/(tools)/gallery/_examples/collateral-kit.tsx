// The collateral maker's kit (app/(tools)/tools/collateral/_components/kit/), which the QR tool shares.
import {
  FieldError,
  FieldLabel,
  FileInput,
  FormButton,
  Select,
  TextArea,
  TextInput,
} from "@/app/(tools)/tools/collateral/_components/kit/Fields";
import { Hint, Message } from "@/app/(tools)/tools/collateral/_components/kit/Notes";
import { ControlsColumn, ControlsSection, Loading } from "@/app/(tools)/tools/collateral/_components/kit/Studio";
import ToolPage from "@/app/(tools)/tools/collateral/_components/kit/ToolPage";
import type { ReactNode } from "react";
import type { Group } from "../_components/types";
import {
  CheckboxChoicesExample,
  DownloadButtonExample,
  LinkButtonExample,
  MessageUndoExample,
  PhotoLibraryExample,
  PreviewCanvasLoadingExample,
  PreviewCanvasReadyExample,
  RadioChoicesExample,
  SegmentedExample,
  StudioPackExample,
  StudioPinnedExample,
  StudioUnpinnedExample,
  ToggleExample,
} from "./collateral-kit.client";

/** A form-width column, as the studios' controls are. */
const narrow = (node: ReactNode) => (
  <div className="container" style={{ maxWidth: 420 }}>
    {node}
  </div>
);

export const collateralKit: Group = {
  id: "collateral-kit",
  title: "The collateral maker's kit",
  examples: [
    {
      name: "ToolPage",
      file: "app/(tools)/tools/collateral/_components/kit/ToolPage.tsx",
      variants: [
        {
          label: "A title, a lede and the tool",
          render: () => (
            <ToolPage title="Example Tool" lede="A line about the tool.">
              <p>The tool goes here.</p>
            </ToolPage>
          ),
        },
      ],
    },
    {
      name: "Studio",
      file: "app/(tools)/tools/collateral/_components/kit/Studio.tsx",
      variants: [
        {
          label: "Pinned: the preview beside the form",
          render: () => (
            <div className="container">
              <StudioPinnedExample />
            </div>
          ),
        },
        {
          label: "Not pinned, as the QR tool has it",
          render: () => (
            <div className="container">
              <StudioUnpinnedExample />
            </div>
          ),
        },
      ],
    },
    {
      name: "PreviewColumn",
      file: "app/(tools)/tools/collateral/_components/kit/Studio.tsx",
      variants: [
        {
          label: "The campaign pack's, scrolling on its own",
          render: () => (
            <div className="container">
              <StudioPackExample />
            </div>
          ),
        },
      ],
    },
    {
      name: "PreviewPin",
      file: "app/(tools)/tools/collateral/_components/kit/Studio.tsx",
      variants: [
        {
          label: "Holding the preview, pinned on a phone",
          render: () => (
            <div className="container">
              <StudioPinnedExample />
            </div>
          ),
        },
      ],
    },
    {
      name: "PreviewMeta",
      file: "app/(tools)/tools/collateral/_components/kit/Studio.tsx",
      variants: [
        {
          label: "Under the preview",
          render: () => (
            <div className="container">
              <StudioUnpinnedExample />
            </div>
          ),
        },
      ],
    },
    {
      name: "PreviewActions",
      file: "app/(tools)/tools/collateral/_components/kit/Studio.tsx",
      variants: [
        {
          label: "Download under the preview",
          render: () => (
            <div className="container">
              <StudioUnpinnedExample />
            </div>
          ),
        },
      ],
    },
    {
      name: "ControlsColumn",
      file: "app/(tools)/tools/collateral/_components/kit/Studio.tsx",
      variants: [
        {
          label: "Sections spaced apart",
          render: () =>
            narrow(
              <ControlsColumn>
                <ControlsSection heading="1. An example section">
                  <Hint>A note about it.</Hint>
                </ControlsSection>
                <ControlsSection heading="2. Another section">
                  <Hint>A note about it.</Hint>
                </ControlsSection>
              </ControlsColumn>,
            ),
        },
      ],
    },
    {
      name: "ControlsSection",
      file: "app/(tools)/tools/collateral/_components/kit/Studio.tsx",
      variants: [
        {
          label: "With a heading, and without",
          render: () =>
            narrow(
              <ControlsColumn>
                <ControlsSection heading="1. An example section">
                  <Hint>Under a heading.</Hint>
                </ControlsSection>
                <ControlsSection>
                  <Hint>No heading.</Hint>
                </ControlsSection>
              </ControlsColumn>,
            ),
        },
      ],
    },
    {
      name: "PreviewCanvas",
      file: "app/(tools)/tools/collateral/_components/kit/Studio.tsx",
      variants: [
        {
          label: "Drawn",
          render: () => (
            <div className="container">
              <PreviewCanvasReadyExample />
            </div>
          ),
        },
        {
          label: "Loading",
          render: () => (
            <div className="container">
              <PreviewCanvasLoadingExample />
            </div>
          ),
        },
      ],
    },
    {
      name: "Loading",
      file: "app/(tools)/tools/collateral/_components/kit/Studio.tsx",
      variants: [{ label: "In place of a preview", render: () => narrow(<Loading>Loading…</Loading>) }],
    },
    {
      name: "DownloadButton",
      file: "app/(tools)/tools/collateral/_components/kit/Studio.tsx",
      variants: [{ label: "Enabled and disabled", render: () => narrow(<DownloadButtonExample />) }],
    },
    {
      name: "ChoiceGrid",
      file: "app/(tools)/tools/collateral/_components/kit/Choices.tsx",
      variants: [
        { label: "A radio group", render: () => narrow(<RadioChoicesExample />) },
        { label: "A group of checkboxes", render: () => narrow(<CheckboxChoicesExample />) },
      ],
    },
    {
      name: "Choice",
      file: "app/(tools)/tools/collateral/_components/kit/Choices.tsx",
      variants: [{ label: "Picked and not", render: () => narrow(<RadioChoicesExample />) }],
    },
    {
      name: "CheckboxChoice",
      file: "app/(tools)/tools/collateral/_components/kit/Choices.tsx",
      variants: [{ label: "Ticked and not", render: () => narrow(<CheckboxChoicesExample />) }],
    },
    {
      name: "PhotoLibrary",
      file: "app/(tools)/tools/collateral/_components/kit/Choices.tsx",
      variants: [{ label: "Every library photo, one picked", render: () => narrow(<PhotoLibraryExample />) }],
    },
    {
      name: "FieldLabel",
      file: "app/(tools)/tools/collateral/_components/kit/Fields.tsx",
      variants: [
        {
          label: "For a field, with a note",
          render: () =>
            narrow(
              <>
                <FieldLabel htmlFor="gallery-field-label" note="(optional)">
                  An example field
                </FieldLabel>
                <TextInput id="gallery-field-label" defaultValue="Some text" />
              </>,
            ),
        },
        {
          label: "Over a group of buttons",
          render: () => narrow(<FieldLabel>An example group</FieldLabel>),
        },
      ],
    },
    {
      name: "TextInput",
      file: "app/(tools)/tools/collateral/_components/kit/Fields.tsx",
      variants: [
        {
          label: "Text, a date and a time",
          render: () =>
            narrow(
              <div style={{ display: "grid", gap: 12 }}>
                <TextInput aria-label="Example text" defaultValue="Some text" />
                <TextInput aria-label="Example date" type="date" defaultValue="2026-01-01" />
                <TextInput aria-label="Example time" type="time" defaultValue="18:30" />
              </div>,
            ),
        },
      ],
    },
    {
      name: "Select",
      file: "app/(tools)/tools/collateral/_components/kit/Fields.tsx",
      variants: [
        {
          label: "A few options",
          render: () =>
            narrow(
              <Select aria-label="Example select" defaultValue="two">
                <option value="one">Option one</option>
                <option value="two">Option two</option>
              </Select>,
            ),
        },
      ],
    },
    {
      name: "TextArea",
      file: "app/(tools)/tools/collateral/_components/kit/Fields.tsx",
      variants: [
        {
          label: "A few lines",
          render: () =>
            narrow(<TextArea aria-label="Example text area" defaultValue={"A first line.\nA second line."} />),
        },
      ],
    },
    {
      name: "FileInput",
      file: "app/(tools)/tools/collateral/_components/kit/Fields.tsx",
      variants: [
        { label: "For an image", render: () => narrow(<FileInput aria-label="Example file" accept="image/*" />) },
      ],
    },
    {
      name: "Toggle",
      file: "app/(tools)/tools/collateral/_components/kit/Fields.tsx",
      variants: [{ label: "A checkbox and its label", render: () => narrow(<ToggleExample />) }],
    },
    {
      name: "Segmented",
      file: "app/(tools)/tools/collateral/_components/kit/Fields.tsx",
      variants: [{ label: "Three options, one picked", render: () => narrow(<SegmentedExample />) }],
    },
    {
      name: "FieldError",
      file: "app/(tools)/tools/collateral/_components/kit/Fields.tsx",
      variants: [
        {
          label: "Under a field",
          render: () => narrow(<FieldError status>An example of what&rsquo;s wrong with the field.</FieldError>),
        },
      ],
    },
    {
      name: "FormButton",
      file: "app/(tools)/tools/collateral/_components/kit/Fields.tsx",
      variants: [
        {
          label: "Ghost and primary",
          render: () =>
            narrow(
              <div style={{ display: "flex", gap: 12 }}>
                <FormButton type="button" variant="ghost" fit>
                  An example
                </FormButton>
                <FormButton type="button" variant="primary" fit>
                  Another
                </FormButton>
              </div>,
            ),
        },
      ],
    },
    {
      name: "Hint",
      file: "app/(tools)/tools/collateral/_components/kit/Notes.tsx",
      variants: [
        { label: "A note under a control", render: () => narrow(<Hint>An example note about a control.</Hint>) },
      ],
    },
    {
      name: "LinkButton",
      file: "app/(tools)/tools/collateral/_components/kit/Notes.tsx",
      variants: [
        { label: "With the form's focus ring, and with the browser's", render: () => narrow(<LinkButtonExample />) },
      ],
    },
    {
      name: "Message",
      file: "app/(tools)/tools/collateral/_components/kit/Notes.tsx",
      variants: [
        { label: "Alone", render: () => narrow(<Message>An example of what just happened.</Message>) },
        { label: "With Undo", render: () => narrow(<MessageUndoExample />) },
      ],
    },
  ],
};
