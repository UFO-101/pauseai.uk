// The collateral maker (app/(tools)/tools/collateral/_components, its kit aside).
import CharCount from "@/app/(tools)/tools/collateral/_components/CharCount";
import Checks from "@/app/(tools)/tools/collateral/_components/Checks";
import CollateralApp from "@/app/(tools)/tools/collateral/_components/CollateralApp";
import CollateralStudio from "@/app/(tools)/tools/collateral/_components/CollateralStudio";
import { exampleEvent } from "@/app/(tools)/tools/collateral/_components/DesignControls.examples";
import GalleryStudio from "@/app/(tools)/tools/collateral/_components/GalleryStudio";
import PackStudio from "@/app/(tools)/tools/collateral/_components/PackStudio";
import type { Group } from "../_components/types";
import {
  CropControlsExample,
  DesignControlsEventExample,
  DesignControlsNewExample,
  LogoCoverNoPhotoExample,
  LogoCoverPhotoExample,
  ProjectMenuExample,
  ProjectMenuSaveDisabledExample,
  QrFormatNoteOnPageExample,
  QrFormatNotePrintExample,
  QrFormatNoteScreenExample,
  SliderExample,
  StylePickerExample,
  TitleSizeClosedExample,
  TitleSizeFlaggedExample,
} from "./collateral.client";

// The studios get the page's upcoming events, here one example.
const EVENTS = [exampleEvent];

export const collateral: Group = {
  id: "collateral",
  title: "The collateral maker",
  examples: [
    {
      name: "CollateralApp",
      file: "app/(tools)/tools/collateral/_components/CollateralApp.tsx",
      variants: [
        {
          label: "As the tool's page shows it, on a single image",
          render: () => (
            <div className="container">
              <CollateralApp events={EVENTS} />
            </div>
          ),
        },
      ],
    },
    {
      name: "CollateralStudio",
      file: "app/(tools)/tools/collateral/_components/CollateralStudio.tsx",
      variants: [
        {
          label: "A new single image",
          render: () => (
            <div className="container">
              <CollateralStudio events={EVENTS} />
            </div>
          ),
        },
      ],
    },
    {
      name: "PackStudio",
      file: "app/(tools)/tools/collateral/_components/PackStudio.tsx",
      variants: [
        {
          label: "A new campaign pack",
          render: () => (
            <div className="container">
              <PackStudio events={EVENTS} />
            </div>
          ),
        },
      ],
    },
    {
      name: "GalleryStudio",
      file: "app/(tools)/tools/collateral/_components/GalleryStudio.tsx",
      variants: [
        {
          label: "A new gallery",
          render: () => (
            <div className="container">
              <GalleryStudio />
            </div>
          ),
        },
      ],
    },
    {
      name: "DesignControls",
      file: "app/(tools)/tools/collateral/_components/DesignControls.tsx",
      variants: [
        {
          label: "A new design, no events to start from",
          render: () => (
            <div className="container" style={{ maxWidth: 420 }}>
              <DesignControlsNewExample />
            </div>
          ),
        },
        {
          label: "The Event layout, an event to start from, a QR code and the studio's extras",
          render: () => (
            <div className="container" style={{ maxWidth: 420 }}>
              <DesignControlsEventExample />
            </div>
          ),
        },
      ],
    },
    {
      name: "StylePicker",
      file: "app/(tools)/tools/collateral/_components/StylePicker.tsx",
      variants: [
        {
          label: "Every style",
          render: () => (
            <div className="container" style={{ maxWidth: 420 }}>
              <StylePickerExample />
            </div>
          ),
        },
      ],
    },
    {
      name: "TitleSizeControl",
      file: "app/(tools)/tools/collateral/_components/TitleSizeControl.tsx",
      variants: [
        {
          label: "Closed, sizing automatically",
          render: () => (
            <div className="container" style={{ maxWidth: 420 }}>
              <TitleSizeClosedExample />
            </div>
          ),
        },
        {
          label: "Opened, the checks having flagged the title",
          render: () => (
            <div className="container" style={{ maxWidth: 420 }}>
              <TitleSizeFlaggedExample />
            </div>
          ),
        },
      ],
    },
    {
      name: "CropControls",
      file: "app/(tools)/tools/collateral/_components/CropControls.tsx",
      variants: [
        {
          label: "Closed, opening to three sliders",
          render: () => (
            <div className="container" style={{ maxWidth: 420 }}>
              <CropControlsExample />
            </div>
          ),
        },
      ],
    },
    {
      name: "Slider",
      file: "app/(tools)/tools/collateral/_components/Slider.tsx",
      variants: [
        {
          label: "A label over a range",
          render: () => (
            <div className="container" style={{ maxWidth: 420 }}>
              <SliderExample />
            </div>
          ),
        },
      ],
    },
    {
      name: "LogoCoverControls",
      file: "app/(tools)/tools/collateral/_components/LogoCoverControls.tsx",
      variants: [
        {
          label: "Without a photo",
          render: () => (
            <div className="container" style={{ maxWidth: 420 }}>
              <LogoCoverNoPhotoExample />
            </div>
          ),
        },
        {
          label: "With a photo, to tint or not",
          render: () => (
            <div className="container" style={{ maxWidth: 420 }}>
              <LogoCoverPhotoExample />
            </div>
          ),
        },
      ],
    },
    {
      name: "QrFormatNote",
      file: "app/(tools)/tools/collateral/_components/QrFormatNote.tsx",
      variants: [
        {
          label: "On the event page itself",
          render: () => (
            <div className="container" style={{ maxWidth: 420 }}>
              <QrFormatNoteOnPageExample />
            </div>
          ),
        },
        {
          label: "On a social post: off unless ticked",
          render: () => (
            <div className="container" style={{ maxWidth: 420 }}>
              <QrFormatNoteScreenExample />
            </div>
          ),
        },
        {
          label: "In print: why the codes are trimmed",
          render: () => (
            <div className="container" style={{ maxWidth: 420 }}>
              <QrFormatNotePrintExample />
            </div>
          ),
        },
      ],
    },
    {
      name: "ProjectMenu",
      file: "app/(tools)/tools/collateral/_components/ProjectMenu.tsx",
      variants: [
        {
          label: "A project's ⋯ menu",
          render: () => (
            <div className="container">
              <ProjectMenuExample />
            </div>
          ),
        },
        {
          label: "A pack's, with nothing to save yet",
          render: () => (
            <div className="container">
              <ProjectMenuSaveDisabledExample />
            </div>
          ),
        },
      ],
    },
    {
      name: "Checks",
      file: "app/(tools)/tools/collateral/_components/Checks.tsx",
      variants: [
        {
          label: "No problems",
          render: () => (
            <div className="container" style={{ maxWidth: 420 }}>
              <Checks issues={[]} />
            </div>
          ),
        },
        {
          label: "A warning and a note, under a title of its own",
          render: () => (
            <div className="container" style={{ maxWidth: 420 }}>
              <Checks
                title="Example checks"
                issues={[
                  { id: "a", level: "warn", message: "An example warning." },
                  { id: "b", level: "info", message: "An example note." },
                ]}
              />
            </div>
          ),
        },
      ],
    },
    {
      name: "CharCount",
      file: "app/(tools)/tools/collateral/_components/CharCount.tsx",
      variants: [
        {
          label: "Nearly full, and full",
          render: () => (
            <div className="container" style={{ display: "flex", gap: 24 }}>
              <CharCount value="An example." max={12} />
              <CharCount value="An example, full" max={16} />
            </div>
          ),
        },
      ],
    },
  ],
};
