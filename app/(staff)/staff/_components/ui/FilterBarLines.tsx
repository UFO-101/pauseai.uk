"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A filter bar's row, which knows whether what's in it all fits on one line.
 * If not, it's marked `data-stacked`, for its last child, the chips, to start
 * a line of their own, whatever else then has room. CSS alone can't say so: a
 * flex row fills each line with what it can. The last child counts as its own
 * children side by side, as it's as wide as the row once stacked.
 */
export default function FilterBarLines({ className, children }: { className: string; children: ReactNode }) {
  const row = useRef<HTMLDivElement>(null);
  const [stacked, setStacked] = useState(false);
  useEffect(() => {
    const bar = row.current!;
    const side = (parent: Element, widths: number[]) =>
      widths.reduce((sum, width) => sum + width, 0) +
      Math.max(widths.length - 1, 0) * parseFloat(getComputedStyle(parent).columnGap);
    const widthOf = (element: Element) => element.getBoundingClientRect().width;
    const measure = () => {
      const kids = [...bar.children];
      const chips = kids.pop()!;
      // A chip's menu, beside it in the markup, opens over the page and takes no room in the row.
      const inRow = [...chips.children].filter((chip) => !chip.hasAttribute("popover"));
      const needed = side(bar, [...kids.map(widthOf), side(chips, inRow.map(widthOf))]);
      setStacked(needed > bar.clientWidth);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    for (const element of bar.querySelectorAll(":scope > *, :scope > :last-child > *")) observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={row} className={className} data-stacked={stacked || undefined}>
      {children}
    </div>
  );
}
