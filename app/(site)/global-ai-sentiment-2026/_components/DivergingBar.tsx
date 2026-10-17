"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AXIS_MAX_PCT,
  RESPONSE_OPTIONS,
  type CountryRow,
  type DemographicRow,
  type ResponseOption,
} from "@/lib/content/aiSentiment2026";
import styles from "./sentiment.module.css";

// Which way the tooltip leans from its segment.
const TOOLTIP_ALIGN = {
  start: styles.barTooltipStart,
  center: styles.barTooltipCenter,
  end: styles.barTooltipEnd,
};

type Row = CountryRow | DemographicRow;

type DivergingBarProps = {
  label: string;
  row: Row;
  meta?: ReactNode;
  rank?: number;
  showNotSure?: boolean;
};

type SegmentTooltip = {
  option: ResponseOption;
  value: number;
  x: number;
  y: number;
  align: "start" | "center" | "end";
};

// Rough half-width of the tooltip bubble, used to decide when to clamp it
// to the left/right edge instead of centering on the cursor. Kept in sync
// with the CSS max-width on .gas-bar-tooltip.
const TOOLTIP_HALF_WIDTH = 85;

function optionFor(key: ResponseOption["key"]) {
  return RESPONSE_OPTIONS.find((o) => o.key === key)!;
}

const STOP = optionFor("stop_permanently_pct");
const PAUSE = optionFor("pause_until_safe_pct");
const OVERSIGHT = optionFor("continue_oversight_pct");
const RAPID = optionFor("continue_rapidly_pct");
const NOT_SURE = optionFor("not_sure_pct");

// The axis is fixed: every row's "against" total (stop + pause) grows left
// from a shared zero-point and every row's "for" total (rapid alone) grows
// right from it, both on the same 0-100 scale, so bars are visually
// comparable across rows. Oversight counts as "against" here: wanting any
// restriction on pace is grouped with wanting it slowed/paused/stopped,
// leaving "as quickly as possible" as the only true unrestricted-pace view.
// "Not sure" straddles the zero-point itself. Empty space at the outer
// edges is real - it means that side of opinion didn't reach 100%, not a
// rendering gap.
export default function DivergingBar({ label, row, meta, rank, showNotSure = true }: DivergingBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<SegmentTooltip | null>(null);

  const stop = row[STOP.key];
  const pause = row[PAUSE.key];
  const oversight = row[OVERSIGHT.key];
  const rapid = row[RAPID.key];
  const notSure = showNotSure ? row[NOT_SURE.key] : 0;

  const against = stop + pause + oversight;
  const forDev = rapid;
  const spacerLeft = Math.max(0, AXIS_MAX_PCT - against - notSure / 2);
  const spacerRight = Math.max(0, AXIS_MAX_PCT - forDev - notSure / 2);

  const segments: { option: ResponseOption; value: number }[] = [
    { option: STOP, value: stop },
    { option: PAUSE, value: pause },
    { option: OVERSIGHT, value: oversight },
    ...(notSure > 0 ? [{ option: NOT_SURE, value: notSure }] : []),
    { option: RAPID, value: rapid },
  ];

  function showTooltip(segment: HTMLElement, option: ResponseOption, value: number) {
    // Only called from the bar's own segments, so the track is mounted.
    const wrapRect = trackRef.current!.getBoundingClientRect();
    const segRect = segment.getBoundingClientRect();
    const x = segRect.left + segRect.width / 2 - wrapRect.left;
    const y = segRect.top - wrapRect.top;
    const align = x < TOOLTIP_HALF_WIDTH ? "start" : x > wrapRect.width - TOOLTIP_HALF_WIDTH ? "end" : "center";
    setTooltip({ option, value, x, y, align });
  }

  // Tapping a segment on touch devices doesn't fire mouseleave when the
  // user taps elsewhere, so close the tooltip on the next tap outside it.
  useEffect(() => {
    if (!tooltip) return;
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (!trackRef.current!.contains(e.target as Node)) {
        setTooltip(null);
      }
    }
    document.addEventListener("touchstart", handleOutside);
    return () => document.removeEventListener("touchstart", handleOutside);
  }, [tooltip]);

  return (
    <div className={styles.barRow} data-testid="bar-row">
      <div className={styles.barLabel}>
        {rank !== undefined && (
          <span className={styles.barRank} data-testid="bar-rank">
            #{rank}
          </span>
        )}
        <span className={styles.barName} data-testid="bar-name">
          {label}
        </span>
        {meta && (
          <span className={styles.barMeta} data-testid="bar-meta">
            {meta}
          </span>
        )}
      </div>
      <div className={styles.barTrackWrap} data-testid="bar-track" ref={trackRef} onMouseLeave={() => setTooltip(null)}>
        <div
          className={styles.barTrack}
          role="img"
          aria-label={`${label}: ${[...segments].map((s) => `${s.option.shortLabel} ${Math.round(s.value)}%`).join(", ")}`}
        >
          <div className={styles.barSpacer} style={{ flex: spacerLeft }} aria-hidden="true" />
          {segments.map(({ option, value }) => (
            <div
              key={option.key}
              className={styles.barSegment}
              data-testid="bar-segment"
              style={{ flex: value, background: option.light }}
              onMouseEnter={(e) => showTooltip(e.currentTarget, option, value)}
              onClick={(e) => showTooltip(e.currentTarget, option, value)}
            >
              {value > 0 && (
                <span className={styles.barSegmentValue} data-testid="bar-segment-value">
                  {Math.round(value)}
                </span>
              )}
            </div>
          ))}
          <div className={styles.barSpacer} style={{ flex: spacerRight }} aria-hidden="true" />
        </div>
        <div className={styles.barCenterline} aria-hidden="true" />
        {tooltip && (
          <div
            className={`${styles.barTooltip} ${TOOLTIP_ALIGN[tooltip.align]}`}
            data-testid="bar-tooltip"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <span className={styles.barTooltipDot} style={{ background: tooltip.option.light }} />
            <span>
              {tooltip.option.shortLabel}: <strong>{Math.round(tooltip.value)}%</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function BarAxisLabels() {
  return (
    <div className={styles.barAxis} aria-hidden="true">
      <span>&larr; Against development</span>
      <span>For development &rarr;</span>
    </div>
  );
}
