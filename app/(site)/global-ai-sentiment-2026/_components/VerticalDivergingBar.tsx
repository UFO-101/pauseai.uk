"use client";

import type { ReactNode } from "react";
import {
  RESPONSE_OPTIONS,
  type CountryRow,
  type DemographicRow,
  type ResponseOption,
} from "@/lib/content/aiSentiment2026";
import styles from "./sentiment.module.css";

type Row = CountryRow | DemographicRow;

type VerticalDivergingBarProps = {
  row: Row;
  meta?: ReactNode;
};

function optionFor(key: ResponseOption["key"]) {
  return RESPONSE_OPTIONS.find((o) => o.key === key)!;
}

const STOP = optionFor("stop_permanently_pct");
const PAUSE = optionFor("pause_until_safe_pct");
const OVERSIGHT = optionFor("continue_oversight_pct");
const RAPID = optionFor("continue_rapidly_pct");
const NOT_SURE = optionFor("not_sure_pct");

// A plain stacked column, not a diverging/zero-centred one: each segment's
// share of the fixed-height track is just its own value over the sum of
// all of them, filling the full 0-100% height top to bottom. Order still
// opens on "against" (stop, most extreme) and closes on "for" (rapid), with
// a small visual gap marking the boundary between the "slow or stop"
// cluster, "not sure", and "as quickly as possible" - see slowOrStopPct.
export default function VerticalDivergingBar({ row, meta }: VerticalDivergingBarProps) {
  const stop = row[STOP.key];
  const pause = row[PAUSE.key];
  const oversight = row[OVERSIGHT.key];
  const rapid = row[RAPID.key];
  const notSure = row[NOT_SURE.key];

  const segments: { option: ResponseOption; value: number; gapBefore?: boolean }[] = [
    { option: STOP, value: stop },
    { option: PAUSE, value: pause },
    { option: OVERSIGHT, value: oversight },
    { option: NOT_SURE, value: notSure, gapBefore: true },
    { option: RAPID, value: rapid, gapBefore: true },
  ];

  const total = segments.reduce((sum, s) => sum + s.value, 0);
  let cumulative = 0;
  const positionedLabels = segments
    .map(({ option, value }) => {
      const topPct = total > 0 ? ((cumulative + value / 2) / total) * 100 : 50;
      cumulative += value;
      return { option, value, topPct };
    })
    .filter((s) => s.value > 0);

  // The "slow or stop" cluster (stop + pause + oversight) braced together
  // with its combined total, same visual language as the map's tooltip
  // panel (see WorldMap.tsx) for the same three-option grouping.
  const against = stop + pause + oversight;
  const againstEndPct = total > 0 ? (against / total) * 100 : 0;

  return (
    <div className={styles.vbar}>
      <span className={styles.vbarAxisLabel}>&uarr; Against development</span>

      <div className={styles.vbarBody}>
        <div className={styles.vbarTrackWrap}>
          <div
            className={styles.vbarTrack}
            role="img"
            aria-label={`Global average: ${segments.map((s) => `${s.option.shortLabel} ${Math.round(s.value)}%`).join(", ")}`}
          >
            {segments.map(({ option, value, gapBefore }) => (
              <div
                key={option.key}
                className={gapBefore ? `${styles.vbarSegment} ${styles.vbarSegmentGapBefore}` : styles.vbarSegment}
                style={{ flex: value, background: option.light }}
              >
                {value > 0 && <span className={styles.vbarSegmentValue}>{Math.round(value)}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* A flexible sibling column, not a fixed-width overlay: label
            positions are % offsets against its own (flex-stretched, so
            track-height-matching) box, and label/brace widths are also %
            of that box, so the whole right-hand layout scales down to fit
            a phone screen instead of needing a separate mobile layout. */}
        <div className={styles.vbarLabels} aria-hidden="true">
          {positionedLabels.map(({ option, value, topPct }) => (
            <div
              key={option.key}
              className={styles.vbarLabelItem}
              data-testid="vbar-label"
              style={{ top: `${topPct}%` }}
            >
              <span className={styles.vbarLabelTick} style={{ background: option.light }} />
              <span className={styles.vbarLabelText}>
                {option.shortLabel} <strong>{Math.round(value)}%</strong>
              </span>
            </div>
          ))}

          {against > 0 && (
            <div className={styles.vbarBrace} data-testid="vbar-brace" style={{ top: 0, height: `${againstEndPct}%` }}>
              <div className={styles.vbarBraceSvgBox} aria-hidden="true">
                <svg viewBox="0 0 10 100" preserveAspectRatio="none">
                  <path
                    d="M1,1 C7,1 5,45 9,50 C5,55 7,99 1,99"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </div>
              <span className={styles.vbarBraceTotal}>
                Total against <strong>{Math.round(against)}%</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      <span className={styles.vbarAxisLabel}>For development &darr;</span>

      {meta && (
        <div className={styles.vbarMeta} data-testid="vbar-meta">
          {meta}
        </div>
      )}
    </div>
  );
}
