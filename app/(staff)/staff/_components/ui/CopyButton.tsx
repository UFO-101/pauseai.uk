"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

/** How long the button says it copied, in milliseconds. */
const SAYS_COPIED = 1500;

/**
 * A small button that copies `text` to the clipboard and says `copied` for
 * a moment, as a screen reader hears it too. If the browser refuses the
 * clipboard it stays as it was.
 */
export default function CopyButton({ text, label, copied }: { text: string; label: string; copied: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setDone(true);
    setTimeout(() => setDone(false), SAYS_COPIED);
  }
  return (
    <Button variant="ghost" size="small" fit type="button" onClick={copy}>
      <span aria-live="polite">{done ? copied : label}</span>
    </Button>
  );
}
