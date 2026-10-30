"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import styles from "./CopyButton.module.css";

/** How long it says it copied, in milliseconds. */
const SAYS_COPIED = 4000;

/**
 * A small button that copies `text` to the clipboard, then for a few
 * seconds says `copied` in place of its label, with `note`, what to do
 * with it, in a bubble under it, which a screen reader hears too. If the
 * browser refuses the clipboard, it stays as it was.
 */
export default function CopyButton({
  text,
  label,
  copied,
  note,
}: {
  text: string;
  label: string;
  copied: string;
  note?: ReactNode;
}) {
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
    <span className={styles.copy}>
      <Button variant="ghost" size="small" fit type="button" onClick={copy}>
        {done ? copied : label}
      </Button>
      <span role="status" className={styles.bubble}>
        {done && note}
      </span>
    </span>
  );
}
