"use client";

// The forms group's examples that need state or callbacks: client
// components with no props, so the server-rendered gallery can place them.
import { EditorContent, useEditor } from "@tiptap/react";
import { Checkbox, Segmented } from "@/components/ui/Controls";
import { Label } from "@/components/ui/Field";
import LinkBar from "@/components/ui/LinkBar";
import LinkButton from "@/components/ui/LinkButton";
import { letterExtensions } from "@/lib/letter-extensions";
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

/** A letter editor's link bar, open on a link: as the editors show it under their toolbar. */
export function LinkBarExample() {
  const editor = useEditor({
    extensions: letterExtensions,
    content: '<p>Join us at <a href="https://pauseai.uk/join">pauseai.uk/join</a>.</p>',
    immediatelyRender: false,
    // The cursor in the link, so the bar shows its address.
    onCreate: ({ editor }) => void editor.commands.setTextSelection(15),
  });
  if (!editor) return null;
  return (
    <div style={{ border: "1px solid var(--border-strong)", borderRadius: "var(--radius-md)" }}>
      <LinkBar
        editor={editor}
        words={{
          address: "Example address",
          save: "Save",
          remove: "Remove",
          cancel: "Cancel",
          invalid: "Not an address",
        }}
        onClose={() => {}}
      />
      <div style={{ padding: "var(--space-3)" }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
