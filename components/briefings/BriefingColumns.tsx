import type { ReactNode } from "react";
import styles from "./BriefingColumns.module.css";

/**
 * How a briefing sets things side by side, in one column on a phone:
 * - "aside": text, and a narrower column beside it, such as a pull quote;
 * - "figure": text, and a chart beside it, the two centred on each other;
 * - "even": two equal columns, such as two quotes;
 * - "pair": two boxes in a row, as tall as each other, the second a little wider.
 */
export type ColumnsLayout = "aside" | "figure" | "even" | "pair";

export default function BriefingColumns({ layout, children }: { layout: ColumnsLayout; children: ReactNode }) {
  return <div className={`${styles.columns} ${styles[layout]}`}>{children}</div>;
}
