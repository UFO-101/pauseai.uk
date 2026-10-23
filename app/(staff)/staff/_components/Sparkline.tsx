"use client";

import { type PointerEvent, useState } from "react";
import styles from "./Sparkline.module.css";

type Props = {
  /** The counts, oldest first. */
  values: number[];
  /** What to say about each point when it's pointed at, in the same order. */
  labels: string[];
  /** The chart's name for screen readers. */
  name: string;
  /** The dates under its two ends: when the first point's period begins, and when the last ends. */
  from: string;
  to: string;
};

/** The drawing's size in its own units; the browser stretches it to the tile's width and the chart's fixed height. */
const WIDTH = 100;
const HEIGHT = 32;
const PAD = 3;

/**
 * A thin line of counts under a tile's label, the last point marked, over a
 * faint baseline that is zero: the bottom is always zero, so a line near it
 * is near none. Under its ends, the dates it runs between. Pointing at it
 * marks the nearest point and says its period and count.
 */
export default function Sparkline({ values, labels, name, from, to }: Props) {
  const [pointed, setPointed] = useState<number | null>(null);
  const last = values.length - 1;
  const max = Math.max(...values) || 1;
  const x = (i: number) => PAD + (i * (WIDTH - 2 * PAD)) / (last || 1);
  const y = (value: number) => HEIGHT - PAD - (value / max) * (HEIGHT - 2 * PAD);
  const point = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const share = (event.clientX - box.left) / box.width;
    setPointed(Math.max(0, Math.min(last, Math.round(share * last))));
  };
  return (
    <span className={styles.chart}>
      <span className={styles.plot}>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={name}
          onPointerMove={point}
          onPointerDown={point}
          onPointerLeave={() => setPointed(null)}
        >
          <line className={styles.zero} x1={0} x2={WIDTH} y1={y(0)} y2={y(0)} />
          <polyline fill="none" points={values.map((value, i) => `${x(i)},${y(value)}`).join(" ")} />
          {/* Each point a line of no length with a round cap, which stays a circle however the drawing is stretched. */}
          {values.map((value, i) => (
            <line
              key={i}
              x1={x(i)}
              x2={x(i)}
              y1={y(value)}
              y2={y(value)}
              className={i === last || i === pointed ? styles.marked : styles.point}
            />
          ))}
        </svg>
        {pointed !== null && (
          <span
            className={styles.label}
            role="status"
            style={{ left: `${x(pointed)}%`, top: `${(y(values[pointed]) / HEIGHT) * 100}%` }}
          >
            {labels[pointed]}
          </span>
        )}
      </span>
      <span className={styles.ends} aria-hidden="true">
        <span>{from}</span>
        <span>{to}</span>
      </span>
    </span>
  );
}
