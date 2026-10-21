// The collateral maker's kit (components/tools/kit/), which the QR tool shares.
import { ControlsColumn, ControlsSection, Loading } from "@/components/tools/kit/Studio";
import ToolPage from "@/components/tools/kit/ToolPage";
import type { ReactNode } from "react";
import type { Group } from "../_components/types";
import {
  CheckboxChoicesExample,
  DownloadButtonExample,
  PhotoLibraryExample,
  PreviewCanvasLoadingExample,
  PreviewCanvasReadyExample,
  RadioChoicesExample,
  StudioPackExample,
  StudioPinnedExample,
  StudioUnpinnedExample,
} from "./collateral-kit.client";
import { Hint } from "@/components/ui/Field";

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
      file: "components/tools/kit/ToolPage.tsx",
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
      file: "components/tools/kit/Studio.tsx",
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
      file: "components/tools/kit/Studio.tsx",
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
      file: "components/tools/kit/Studio.tsx",
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
      file: "components/tools/kit/Studio.tsx",
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
      file: "components/tools/kit/Studio.tsx",
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
      file: "components/tools/kit/Studio.tsx",
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
      file: "components/tools/kit/Studio.tsx",
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
      file: "components/tools/kit/Studio.tsx",
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
      file: "components/tools/kit/Studio.tsx",
      variants: [{ label: "In place of a preview", render: () => narrow(<Loading>Loading…</Loading>) }],
    },
    {
      name: "DownloadButton",
      file: "components/tools/kit/Studio.tsx",
      variants: [{ label: "Enabled and disabled", render: () => narrow(<DownloadButtonExample />) }],
    },
    {
      name: "ChoiceGrid",
      file: "components/tools/kit/Choices.tsx",
      variants: [
        { label: "A radio group", render: () => narrow(<RadioChoicesExample />) },
        { label: "A group of checkboxes", render: () => narrow(<CheckboxChoicesExample />) },
      ],
    },
    {
      name: "Choice",
      file: "components/tools/kit/Choices.tsx",
      variants: [{ label: "Picked and not", render: () => narrow(<RadioChoicesExample />) }],
    },
    {
      name: "CheckboxChoice",
      file: "components/tools/kit/Choices.tsx",
      variants: [{ label: "Ticked and not", render: () => narrow(<CheckboxChoicesExample />) }],
    },
    {
      name: "PhotoLibrary",
      file: "components/tools/kit/Choices.tsx",
      variants: [{ label: "Every library photo, one picked", render: () => narrow(<PhotoLibraryExample />) }],
    },
  ],
};
