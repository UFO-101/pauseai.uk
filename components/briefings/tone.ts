import type { CSSProperties } from "react";

/**
 * A briefing's topic colours (the --briefing-* tokens): a box's, and a bar's
 * or a calendar event's, so each thing is the colour of its topic.
 */
export type BriefingTone = "headline" | "parliament" | "industry" | "international" | "risk" | "good" | "diary";

/**
 * Sets --tone, the custom property the briefing's pieces draw in: a box's
 * border, tab, list markers and quote rules, and a bar's or a dot's colour.
 */
export function toneStyle(tone: BriefingTone): CSSProperties {
  return { "--tone": `var(--briefing-${tone})` } as CSSProperties;
}
