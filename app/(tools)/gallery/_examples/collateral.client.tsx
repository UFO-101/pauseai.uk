"use client";

// The collateral maker's examples that need state or callbacks: client
// components with no props, so the server-rendered gallery can place them.
import CropControls from "@/app/(tools)/tools/collateral/_components/CropControls";
import DesignControls from "@/app/(tools)/tools/collateral/_components/DesignControls";
import { exampleEvent } from "@/app/(tools)/tools/collateral/_components/DesignControls.examples";
import { newDesign, withQrCodes, type DesignState } from "@/app/(tools)/tools/collateral/_components/designState";
import LogoCoverControls from "@/app/(tools)/tools/collateral/_components/LogoCoverControls";
import ProjectMenu from "@/app/(tools)/tools/collateral/_components/ProjectMenu";
import QrFormatNote from "@/app/(tools)/tools/collateral/_components/QrFormatNote";
import Slider from "@/app/(tools)/tools/collateral/_components/Slider";
import StylePicker from "@/app/(tools)/tools/collateral/_components/StylePicker";
import TitleSizeControl from "@/app/(tools)/tools/collateral/_components/TitleSizeControl";
import { getFormat } from "@/lib/collateral/formats";
import { LIBRARY_PHOTOS } from "@/lib/collateral/photos";
import type { PhotoView } from "@/lib/collateral/photoTransform";
import type { Drawable } from "@/lib/collateral/templates";
import { THEMES } from "@/lib/collateral/themes";
import { Controlled, Logged } from "../_components/wiring";

export function SliderExample() {
  return (
    <Controlled initial={0.5}>
      {(value, set) => <Slider label="Example" min={0} max={1} step={0.05} value={value} onChange={set} />}
    </Controlled>
  );
}

/** The crop sliders, opened: each moves its part of the view. */
export function CropControlsExample() {
  return (
    <Controlled<PhotoView> initial={{ zoom: 1.5, focalX: 0.5, focalY: 0.5 }}>
      {(view, set) => <CropControls view={view} onChange={(patch) => set({ ...view, ...patch })} />}
    </Controlled>
  );
}

function TitleSize({ flagged }: { flagged: boolean }) {
  return (
    <Controlled initial={1}>
      {(value, set) => <TitleSizeControl value={value} onChange={set} flagged={flagged} />}
    </Controlled>
  );
}

export function TitleSizeClosedExample() {
  return <TitleSize flagged={false} />;
}

export function TitleSizeFlaggedExample() {
  return <TitleSize flagged />;
}

function FormatNote({ formatId, reason }: { formatId: string; reason?: string }) {
  return (
    <Controlled initial={false}>
      {(screenQr, set) => (
        <QrFormatNote format={getFormat(formatId)} screenQr={screenQr} onScreenQr={set} reason={reason} />
      )}
    </Controlled>
  );
}

/** A format people see on the event page itself: the codes are left off. */
export function QrFormatNoteOnPageExample() {
  return <FormatNote formatId="luma-cover" />;
}

/** A social post: the codes are off unless the box is ticked, and then say why they're trimmed. */
export function QrFormatNoteScreenExample() {
  return <FormatNote formatId="ig-square" reason="An example reason the codes are trimmed." />;
}

/** A print format: only the reason, when there is one. */
export function QrFormatNotePrintExample() {
  return <FormatNote formatId="a5" reason="An example reason the codes are trimmed." />;
}

// The cover's controls only ask whether there's a photo, never draw it, so the example's needs no pixels.
const PHOTO: DesignState["photo"] = {
  drawable: { source: null, width: 1, height: 1 } as unknown as Drawable,
  name: LIBRARY_PHOTOS[0].label,
  source: { kind: "library", id: LIBRARY_PHOTOS[0].id },
};

function LogoCover({ photo }: { photo: DesignState["photo"] }) {
  return (
    <Controlled
      initial={{ ...newDesign(), photo }}
      show={(d) => JSON.stringify({ coverTitle: d.coverTitle, photoClear: d.photoClear })}
    >
      {(design, set) => <LogoCoverControls design={design} update={(fn) => set(fn(design))} />}
    </Controlled>
  );
}

export function LogoCoverNoPhotoExample() {
  return <LogoCover photo={null} />;
}

export function LogoCoverPhotoExample() {
  return <LogoCover photo={PHOTO} />;
}

export function StylePickerExample() {
  return (
    <Controlled<string> initial={THEMES[0].id}>
      {(themeId, set) => <StylePicker themeId={themeId} onTheme={set} />}
    </Controlled>
  );
}

export function ProjectMenuExample() {
  return (
    <Logged>
      {(log) => <ProjectMenu noun="project" onSave={log("onSave")} onOpen={log("onOpen")} onReset={log("onReset")} />}
    </Logged>
  );
}

/** A pack with nothing to save yet: Save is disabled in the menu. */
export function ProjectMenuSaveDisabledExample() {
  return (
    <Logged>
      {(log) => (
        <ProjectMenu noun="pack" onSave={log("onSave")} onOpen={log("onOpen")} onReset={log("onReset")} saveDisabled />
      )}
    </Logged>
  );
}

const showDesign = (d: DesignState) =>
  JSON.stringify({ templateId: d.templateId, themeId: d.themeId, values: d.valuesByTemplate, qr: d.qrCodesByTemplate });

/** A new design, with no events to start from and nothing in the studio's slots. */
export function DesignControlsNewExample() {
  return (
    <Logged>
      {(log) => (
        <Controlled initial={newDesign()} show={showDesign}>
          {(design, set) => (
            <DesignControls
              design={design}
              update={(fn) => set(fn(design))}
              events={[]}
              firstSection={1}
              onQrAdded={log("onQrAdded")}
              onMessage={log("onMessage")}
            />
          )}
        </Controlled>
      )}
    </Logged>
  );
}

/**
 * The Event layout with a QR code and an event to fill in from, and the
 * studio's slots filled as the single-image studio fills them.
 */
export function DesignControlsEventExample() {
  const initial = withQrCodes(newDesign("event"), [{ label: "Scan to RSVP", url: "pauseai.uk" }]);
  return (
    <Logged>
      {(log) => (
        <Controlled initial={initial} show={showDesign}>
          {(design, set) => (
            <DesignControls
              design={design}
              update={(fn) => set(fn(design))}
              events={[exampleEvent]}
              firstSection={2}
              headlineExtras={<TitleSizeClosedExample />}
              qrNote={<QrFormatNoteScreenExample />}
              photoExtras={<CropControlsExample />}
              onQrAdded={log("onQrAdded")}
              onMessage={log("onMessage")}
            />
          )}
        </Controlled>
      )}
    </Logged>
  );
}
