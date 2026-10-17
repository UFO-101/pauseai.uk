import type { ReactNode, Ref } from "react";
import styles from "./StoryBody.module.css";

/**
 * A story's text: its paragraphs and lists (lib/storyRender's renderBody).
 * `clamped` holds it to a card's fixed height; `measure` hides it off
 * screen, for measuring how much text fits.
 */
export default function StoryBody({
  clamped = false,
  measure = false,
  ref,
  children,
}: {
  clamped?: boolean;
  measure?: boolean;
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}) {
  const className = [styles.body, clamped && styles.clamped, measure && styles.measure].filter(Boolean).join(" ");
  return (
    <div className={className} ref={ref} aria-hidden={measure || undefined}>
      {children}
    </div>
  );
}
