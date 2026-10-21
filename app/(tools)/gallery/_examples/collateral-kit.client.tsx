"use client";

// The collateral kit's examples that need state or callbacks: client
// components with no props, so the server-rendered gallery can place them.
import { useEffect, useRef } from "react";
import { CheckboxChoice, Choice, ChoiceGrid, PhotoLibrary } from "@/components/tools/kit/Choices";
import {
  ControlsColumn,
  ControlsSection,
  DownloadButton,
  PreviewActions,
  PreviewCanvas,
  PreviewColumn,
  PreviewMeta,
  PreviewPin,
  Studio,
} from "@/components/tools/kit/Studio";
import { LIBRARY_PHOTOS } from "@/lib/collateral/photos";
import { Controlled, Logged } from "../_components/wiring";
import { Checkbox } from "@/components/ui/Controls";
import { Hint } from "@/components/ui/Field";

const OPTIONS = ["one", "two", "three"] as const;
type Option = (typeof OPTIONS)[number];

/** Three cards in a radio group, one picked. */
export function RadioChoicesExample() {
  return (
    <Controlled<Option> initial="one">
      {(value, set) => (
        <ChoiceGrid role="radiogroup" label="Example choices">
          {OPTIONS.map((option) => (
            <Choice
              key={option}
              checked={value === option}
              onClick={() => set(option)}
              title={`Option ${option}`}
              description="A line about this option."
            />
          ))}
        </ChoiceGrid>
      )}
    </Controlled>
  );
}

/** Three cards with checkboxes, one ticked. */
export function CheckboxChoicesExample() {
  return (
    <Controlled<Option[]> initial={["one"]}>
      {(ticked, set) => (
        <ChoiceGrid role="group" label="Example options">
          {OPTIONS.map((option) => (
            <CheckboxChoice
              key={option}
              checked={ticked.includes(option)}
              onChange={() => set(ticked.includes(option) ? ticked.filter((o) => o !== option) : [...ticked, option])}
              title={`Option ${option}`}
              note="A line about this option."
            />
          ))}
        </ChoiceGrid>
      )}
    </Controlled>
  );
}

/** The library's photos, the first one picked. */
export function PhotoLibraryExample() {
  return (
    <Controlled initial={LIBRARY_PHOTOS[0].id}>
      {(id, set) => <PhotoLibrary current={{ kind: "library", id }} onPick={(item) => set(item.id)} />}
    </Controlled>
  );
}

export function DownloadButtonExample() {
  return (
    <Logged>
      {(log) => (
        <div style={{ display: "flex", gap: 12 }}>
          <DownloadButton onClick={log("onClick")} disabled={false}>
            Download PNG
          </DownloadButton>
          <DownloadButton onClick={log("onClick")} disabled>
            Download PDF
          </DownloadButton>
        </div>
      )}
    </Logged>
  );
}

const NO_GESTURES = { onPointerDown() {}, onPointerMove() {}, onPointerUp() {}, onPointerCancel() {} };

/** A canvas with a block of colour drawn in it, as a studio draws its design. */
function Canvas({ ready, draggable }: { ready: boolean; draggable: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    canvas.width = 400;
    canvas.height = 500;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#ff9416";
    context.fillRect(0, 0, 400, 500);
    context.fillStyle = "#1a1a1a";
    context.fillRect(40, 60, 320, 80);
  }, []);
  return (
    <PreviewCanvas
      canvasRef={ref}
      label="An example preview"
      ready={ready}
      draggable={draggable}
      gestures={NO_GESTURES}
    />
  );
}

/** Drawn, its photo draggable. */
export function PreviewCanvasReadyExample() {
  return <Canvas ready draggable />;
}

/** Waiting for the logo and fonts. */
export function PreviewCanvasLoadingExample() {
  return <Canvas ready={false} draggable={false} />;
}

/** A studio's parts together: the preview, its line and actions, then the form. */
function StudioLayout({ pinned, pack }: { pinned: boolean; pack: boolean }) {
  return (
    <Logged>
      {(log) => (
        <Studio pinned={pinned}>
          <PreviewColumn pack={pack}>
            <PreviewPin>
              <Canvas ready draggable={false} />
            </PreviewPin>
            <PreviewMeta>Example format · 400 × 500 px</PreviewMeta>
            <PreviewActions>
              <DownloadButton onClick={log("onClick")} disabled={false}>
                Download PNG
              </DownloadButton>
            </PreviewActions>
          </PreviewColumn>
          <ControlsColumn>
            <ControlsSection heading="1. An example section">
              <Hint>A note about the first section.</Hint>
            </ControlsSection>
            <ControlsSection heading="2. Another section">
              <Controlled initial={true}>
                {(checked, set) => (
                  <Checkbox checked={checked} onChange={set}>
                    An example option
                  </Checkbox>
                )}
              </Controlled>
            </ControlsSection>
          </ControlsColumn>
        </Studio>
      )}
    </Logged>
  );
}

export function StudioPinnedExample() {
  return <StudioLayout pinned pack={false} />;
}

/** As the QR tool lays it out. */
export function StudioUnpinnedExample() {
  return <StudioLayout pinned={false} pack={false} />;
}

/** The campaign pack's preview column, which scrolls on its own. */
export function StudioPackExample() {
  return <StudioLayout pinned pack />;
}
