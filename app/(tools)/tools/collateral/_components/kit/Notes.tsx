import type { ReactNode } from "react";
import styles from "./Notes.module.css";

/**
 * A note under a control, in small grey type. Its top margin is
 * `--hint-margin-top` (10px), for a container that wants its hints closer.
 */
export function Hint({ children }: { children: ReactNode }) {
  return <p className={styles.hint}>{children}</p>;
}

/**
 * A button that reads as a link, after the text it acts on, e.g. Remove. In
 * the form it has the form's focus ring; `plainFocus` keeps the browser's,
 * for one under the preview.
 */
export function LinkButton({
  onClick,
  plainFocus,
  children,
}: {
  onClick: () => void;
  plainFocus?: boolean;
  children: ReactNode;
}) {
  return (
    <button type="button" className={plainFocus ? styles.link : `${styles.link} ${styles.ring}`} onClick={onClick}>
      {children}
    </button>
  );
}

/**
 * What just happened, read out as it changes, on a row of its own among the
 * buttons it follows. `onUndo` adds an Undo after it.
 */
export function Message({ onUndo, children }: { onUndo?: (() => void) | null; children: ReactNode }) {
  return (
    <p className={styles.message} role="status">
      {children}
      {onUndo && (
        <LinkButton onClick={onUndo} plainFocus>
          Undo
        </LinkButton>
      )}
    </p>
  );
}
