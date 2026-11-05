import type { ReactNode } from "react";
import styles from "./ResultBox.module.css";
import Actions from "@/components/ui/Actions";

/** A result with more lines than this starts folded, so one big run doesn't fill the page. */
export const OPEN_UP_TO = 5;

type Props = {
  /** The one line always shown: status, time, counts. The fold's handle when there's detail. */
  summary: ReactNode;
  /** How many lines the detail has: more than OPEN_UP_TO starts folded. */
  lines?: number;
  /** Whether it starts unfolded, whatever the detail's length; left out, it goes by `lines`. */
  open?: boolean;
  /** What went wrong, shown under the line whether or not the detail is folded. */
  problems?: ReactNode;
  /** Buttons that stay outside the fold, such as apply and discard. */
  actions?: ReactNode;
  /** The detail: lists or a table. None, and there's nothing to fold. */
  children?: ReactNode;
  "aria-label"?: string;
};

/**
 * The box every import's and check's result is shown in: a summary line,
 * and under it, folded with the browser's arrow, the detail.
 */
export default function ResultBox({ summary, lines = 0, open, problems, actions, children, ...rest }: Props) {
  const line = <span>{summary}</span>;
  return (
    <section className={styles.sync} aria-label={rest["aria-label"]}>
      {children ? (
        <details open={open ?? lines <= OPEN_UP_TO}>
          <summary>{line}</summary>
          {children}
        </details>
      ) : (
        <p role="status">{line}</p>
      )}
      {problems}
      {actions && <Actions>{actions}</Actions>}
    </section>
  );
}
