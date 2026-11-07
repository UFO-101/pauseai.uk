"use client";

import { type PointerEvent, useState } from "react";
import styles from "./StackedBars.module.css";

type Part = { key: string; label: string };
type Bar = { title: string; counts: Record<string, number | undefined> };

type Props = {
  /** What a bar is split into, bottom up: each has its colour by its place here. */
  parts: Part[];
  /** The bars, oldest first, each with its heading when it's pointed at. */
  bars: Bar[];
  /** The chart's name for screen readers. */
  name: string;
  /** The dates under its two ends: when the first bar's period begins, and when the last ends. */
  from: string;
  to: string;
};

const total = (bar: Bar) => Object.values(bar.counts).reduce<number>((sum, count) => sum + (count ?? 0), 0);

/**
 * Bars of counts, each split into coloured parts, over a line that is zero:
 * the bottom is always zero and the tallest fills the height. Under its ends,
 * the dates it runs between; under those, the legend: the parts the last bar
 * has, with its count of each. Pointing at a bar says what it holds, a line a
 * part, in a box that may be wider than the chart.
 */
export default function StackedBars({ parts, bars, name, from, to }: Props) {
  const [pointed, setPointed] = useState<number | null>(null);
  const last = bars.length - 1;
  const tallest = Math.max(...bars.map(total)) || 1;
  const point = (event: PointerEvent<HTMLElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const share = (event.clientX - box.left) / box.width;
    setPointed(Math.max(0, Math.min(last, Math.floor(share * bars.length))));
  };
  return (
    <span className={styles.chart}>
      <span className={styles.plot}>
        <span
          className={styles.bars}
          role="img"
          aria-label={name}
          onPointerMove={point}
          onPointerDown={point}
          onPointerLeave={() => setPointed(null)}
        >
          {bars.map((bar, i) => (
            <span key={i} className={styles.bar} style={{ height: `${(total(bar) / tallest) * 100}%` }}>
              {parts.map((part, place) => (
                <span
                  key={part.key}
                  className={styles.part}
                  data-part={place}
                  style={{ flexGrow: bar.counts[part.key] ?? 0 }}
                />
              ))}
            </span>
          ))}
        </span>
        {pointed !== null && (
          // Slid along by its bar's place, so it hangs inward from the chart's edge at either end.
          <span
            className={styles.label}
            role="status"
            style={{
              left: `${(pointed / (last || 1)) * 100}%`,
              transform: `translate(-${(pointed / (last || 1)) * 100}%, -100%)`,
            }}
          >
            <strong className={styles.title}>{bars[pointed].title}</strong>
            {parts.map(
              (part, place) =>
                Boolean(bars[pointed].counts[part.key]) && (
                  <span key={part.key} className={styles.line}>
                    <span>
                      <span className={styles.swatch} data-part={place} aria-hidden="true" /> {part.label}
                    </span>
                    <span>{bars[pointed].counts[part.key]}</span>
                  </span>
                ),
            )}
          </span>
        )}
      </span>
      <span className={styles.ends} aria-hidden="true">
        <span>{from}</span>
        <span>{to}</span>
      </span>
      <span className={styles.legend}>
        {parts.map(
          (part, place) =>
            Boolean(bars[last].counts[part.key]) && (
              <span key={part.key}>
                <span className={styles.swatch} data-part={place} aria-hidden="true" /> {part.label} ·{" "}
                {bars[last].counts[part.key]}
              </span>
            ),
        )}
      </span>
    </span>
  );
}
