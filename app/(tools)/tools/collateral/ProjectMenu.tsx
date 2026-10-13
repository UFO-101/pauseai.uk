"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  /** What a saved file is called here: "project" or "pack". */
  noun: string;
  onSave: () => void;
  onOpen: (file: File | undefined) => void;
  onReset: () => void;
  saveDisabled?: boolean;
}

/**
 * Save, open and start again, tucked behind a small ⋯ button beside Download. Work autosaves in the browser, so
 * these are only for moving a design to another device or volunteer, or starting over.
 */
export default function ProjectMenu({ noun, onSave, onOpen, onReset, saveDisabled }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Closes on a click elsewhere or Escape, like other menus.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div ref={rootRef} className="collateral-menu">
      <button type="button" className="btn ghost large collateral-menu-button" aria-label="More options" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        ⋯
      </button>
      {open && (
        <div className="collateral-menu-list">
          <button type="button" onClick={() => run(onSave)} disabled={saveDisabled}>
            Save {noun} file
          </button>
          <button type="button" onClick={() => run(() => fileRef.current?.click())}>
            Open {noun} file
          </button>
          <button type="button" onClick={() => run(onReset)}>
            Start again
          </button>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        hidden
        aria-label={`Open a saved ${noun}`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          onOpen(file);
        }}
      />
    </div>
  );
}
