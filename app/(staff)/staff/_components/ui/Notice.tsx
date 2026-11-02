import type { ReactNode } from "react";
import IconButton from "@/components/ui/IconButton";
import styles from "./Notice.module.css";

/**
 * A note that draws the eye to what just happened, or what to do next: a
 * strip that opens down, lit in the accent colour, fading to plain, with
 * a × at its top right, named `close`, that closes it. It stays till
 * then. Put it in a live region (role="status"), there before it opens,
 * for a screen reader to hear it; give it a new `key` to open it afresh.
 */
export default function Notice({
  close,
  onClose,
  children,
}: {
  close: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <span className={styles.notice}>
      {children}
      <IconButton look="outline" size={22} className={styles.close} aria-label={close} onClick={onClose}>
        ×
      </IconButton>
    </span>
  );
}
