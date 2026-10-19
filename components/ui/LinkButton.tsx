import type { ReactNode } from "react";
import styles from "./LinkButton.module.css";

/** A button that reads as a link, after the text it acts on, e.g. Remove or Undo. */
export default function LinkButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={styles.link} onClick={onClick}>
      {children}
    </button>
  );
}
