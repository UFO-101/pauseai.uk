import type { CSSProperties } from "react";

/**
 * What a button needs to open the bubble `id` (ui/Bubble's BubbleBox) and
 * have it point to it: for a button of its own look, such as an
 * IconButton. `id` must be unique on the page. Apart from Bubble.tsx, as
 * that runs in the browser, so a server component can call it.
 */
export function bubbleTrigger(id: string) {
  return { popoverTarget: id, style: { anchorName: `--${id}` } as CSSProperties };
}
