import type { ReactNode } from "react";
import LinkButton from "./LinkButton";
import styles from "./StatusMessage.module.css";

/**
 * What just happened, read out as it changes, on a row of its own among the
 * buttons it follows. `onUndo` adds an Undo after it.
 */
export default function StatusMessage({ onUndo, children }: { onUndo?: (() => void) | null; children: ReactNode }) {
  return (
    <p className={styles.message} role="status">
      {children}
      {onUndo && <LinkButton onClick={onUndo}>Undo</LinkButton>}
    </p>
  );
}
