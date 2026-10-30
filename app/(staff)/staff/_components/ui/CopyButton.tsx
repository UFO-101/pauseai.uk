"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import styles from "./CopyButton.module.css";

/** How long the button says it copied, in milliseconds; the note stays. */
const SAYS_COPIED = 4000;

/**
 * A small button that copies `text` to the clipboard, then for a few
 * seconds says `copied` in place of its label, with a tick, popping in;
 * and a moment later `note`, what to do with it, opens in the page under
 * it, lit as it opens, so the eye goes from one to the other. The note
 * stays, as it may take a while to act on, till its × closes it, and
 * opens afresh at each copy; a screen reader hears it too. `close` names
 * the ×. If the browser refuses the clipboard,
 * nothing changes.
 */
export default function CopyButton({
  text,
  label,
  copied,
  note,
  close,
}: {
  text: string;
  label: string;
  copied: string;
  note?: ReactNode;
  close: string;
}) {
  const [done, setDone] = useState(false);
  // How many times it has copied: the note's key, so it opens afresh each time.
  const [copies, setCopies] = useState(0);
  const [open, setOpen] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setDone(true);
    setCopies((n) => n + 1);
    setOpen(true);
    setTimeout(() => setDone(false), SAYS_COPIED);
  }
  return (
    <span className={styles.copy}>
      <Button variant="ghost" size="small" fit type="button" onClick={copy}>
        {done ? (
          <span className={styles.done}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {copied}
          </span>
        ) : (
          label
        )}
      </Button>
      <span role="status" className={styles.status}>
        {open && note && (
          <span key={copies} className={styles.note}>
            {note}
            <IconButton
              look="outline"
              size={22}
              className={styles.close}
              aria-label={close}
              onClick={() => setOpen(false)}
            >
              ×
            </IconButton>
          </span>
        )}
      </span>
    </span>
  );
}
