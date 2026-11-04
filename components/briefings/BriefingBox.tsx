import type { ReactNode } from "react";
import { toneStyle, type BriefingTone } from "./tone";
import styles from "./BriefingBox.module.css";

/**
 * A part of a briefing, such as "Budget Breakdown": a box ruled in its topic's
 * colour, its heading on a tab across the top edge. What's inside is drawn in
 * the same colour (--tone): list markers, quote rules, headings' accents.
 * A box in a row of boxes (BriefingColumns' "pair") is as tall as the row.
 */
export default function BriefingBox({
  title,
  tone,
  children,
}: {
  title: string;
  tone: BriefingTone;
  children: ReactNode;
}) {
  return (
    <section className={styles.box} data-tone={tone} style={toneStyle(tone)}>
      <h2 className={styles.tab}>{title}</h2>
      {children}
    </section>
  );
}
