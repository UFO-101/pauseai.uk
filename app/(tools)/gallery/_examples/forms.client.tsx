"use client";

// The forms group's examples that need state or callbacks: client
// components with no props, so the server-rendered gallery can place them.
import { Checkbox, Segmented } from "@/components/ui/Controls";
import { Label } from "@/components/ui/Field";
import LinkButton from "@/components/ui/LinkButton";
import StatusMessage from "@/components/ui/StatusMessage";
import { Controlled, Logged } from "../_components/wiring";

export function CheckboxExample() {
  return (
    <Controlled initial={true}>
      {(checked, set) => (
        <div style={{ display: "grid", gap: "var(--space-3)" }}>
          <Checkbox checked={checked} onChange={set}>
            An example option
          </Checkbox>
          <Checkbox checked={!checked} onChange={(value) => set(!value)}>
            An example option with a long label, which runs on to a second line on a phone and lines up under the first.
          </Checkbox>
        </div>
      )}
    </Controlled>
  );
}

const SIZES = [
  { value: "s", label: "Small" },
  { value: "m", label: "Medium" },
  { value: "l", label: "Large" },
];

export function SegmentedExample() {
  return (
    <Controlled initial="m">
      {(value, set) => (
        <>
          <Label>Example size</Label>
          <Segmented label="Example size" options={SIZES} value={value} onChange={set} />
        </>
      )}
    </Controlled>
  );
}

export function LinkButtonExample() {
  return (
    <Logged>
      {(log) => (
        <p>
          example-photo.jpg
          <LinkButton onClick={log("onClick")}>Remove</LinkButton>
        </p>
      )}
    </Logged>
  );
}

export function StatusMessageUndoExample() {
  return (
    <Logged>{(log) => <StatusMessage onUndo={log("onUndo")}>An example of what just happened.</StatusMessage>}</Logged>
  );
}
