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
};

/** The drawing's size in its own units; the browser scales it to the tile's width. */
const WIDTH = 100;
const HEIGHT = 32;
const PAD = 3;

/**
 * A thin line of counts under a tile's label, the last point marked.
 * Pointing at it marks the nearest point and says its period and count.
 */
export default function Sparkline({ values, labels, name }: Props) {
  const [pointed, setPointed] = useState<number | null>(null);
  const last = values.length - 1;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const x = (i: number) => PAD + (i * (WIDTH - 2 * PAD)) / (last || 1);
  const y = (value: number) => HEIGHT - PAD - ((value - min) / range) * (HEIGHT - 2 * PAD);
  const point = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const share = (event.clientX - box.left) / box.width;
    setPointed(Math.max(0, Math.min(last, Math.round(share * last))));
  };
  return (
    <span className={styles.chart}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={name}
        onPointerMove={point}
        onPointerDown={point}
        onPointerLeave={() => setPointed(null)}
      >
        <polyline fill="none" points={values.map((value, i) => `${x(i)},${y(value)}`).join(" ")} />
        {values.map((value, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(value)}
            r="2.5"
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
  );
}
