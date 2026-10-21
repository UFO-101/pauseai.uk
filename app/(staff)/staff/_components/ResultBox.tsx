import type { ReactNode } from "react";
import styles from "./ResultBox.module.css";
import { ErrorText } from "@/components/ui/Text";
import Actions from "@/components/ui/Actions";

/** A result with more lines than this starts folded, so one big run doesn't fill the page. */
export const OPEN_UP_TO = 5;

/** How a result went wrong, if it did: the box is tinted and bordered to match. */
export type ResultTone = "failed" | "incomplete";

type Props = {
  /** The one line always shown: status, time, counts. The fold's handle when there's detail. */
  summary: ReactNode;
  /** How many lines the detail has: more than OPEN_UP_TO starts folded. */
  lines?: number;
  /** Buttons that stay outside the fold, such as apply and discard. */
  actions?: ReactNode;
  /** The detail: lists or a table. None, and there's nothing to fold. */
  children?: ReactNode;
  /** Colours the box: red for a run that failed, amber for one that stopped before it finished. */
  tone?: ResultTone;
  "aria-label"?: string;
};

/**
 * The box every import's and check's result is shown in: a summary line,
 * and under it, folded with the browser's arrow, the detail.
 */
export default function ResultBox({ summary, lines = 0, actions, children, tone, ...rest }: Props) {
  const line = tone === "failed" ? <ErrorText>{summary}</ErrorText> : <span>{summary}</span>;
  return (
    <section className={tone ? `${styles.sync} ${styles[tone]}` : styles.sync} aria-label={rest["aria-label"]}>
      {children ? (
        <details open={lines <= OPEN_UP_TO}>
          <summary>{line}</summary>
          {children}
        </details>
      ) : (
        <p role="status">{line}</p>
      )}
      {actions && <Actions>{actions}</Actions>}
    </section>
  );
}
