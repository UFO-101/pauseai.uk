"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { RESPONSE_OPTIONS, type CountryRow, type DemographicRow, type ResponseOption } from "@/lib/data/aiSentiment2026";

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

export default function DivergingBar({ label, row, meta, rank, showNotSure = true }: DivergingBarProps) {
  const options = showNotSure ? RESPONSE_OPTIONS : RESPONSE_OPTIONS.filter((o) => o.key !== "not_sure_pct");
  // When "not sure" is hidden, rescale the remaining segments so they fill
  // the bar (i.e. show opinion share among those with a view).
  const scale = showNotSure ? 1 : 100 / (100 - row.not_sure_pct || 1);
  const trackRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<SegmentTooltip | null>(null);

  function showTooltip(segment: HTMLElement, option: ResponseOption, value: number) {
    const wrapRect = trackRef.current?.getBoundingClientRect();
    const segRect = segment.getBoundingClientRect();
    if (!wrapRect) return;
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
      if (trackRef.current && !trackRef.current.contains(e.target as Node)) {
        setTooltip(null);
      }
    }
    document.addEventListener("touchstart", handleOutside);
    return () => document.removeEventListener("touchstart", handleOutside);
  }, [tooltip]);

  return (
    <div className="gas-bar-row">
      <div className="gas-bar-label">
        {rank !== undefined && <span className="gas-bar-rank">#{rank}</span>}
        <span className="gas-bar-name">{label}</span>
        {meta && <span className="gas-bar-meta">{meta}</span>}
      </div>
      <div className="gas-bar-track-wrap" ref={trackRef} onMouseLeave={() => setTooltip(null)}>
        <div
          className="gas-bar-track"
          role="img"
          aria-label={`${label}: ${options.map((o) => `${o.shortLabel} ${Math.round(row[o.key] * scale)}%`).join(", ")}`}
        >
          {options.map((option) => {
            const value = row[option.key];
            if (value <= 0) return null;
            const width = value * scale;
            const displayValue = Math.round(width);
            return (
              <div
                key={option.key}
                className="gas-bar-segment"
                style={{ width: `${width}%`, background: option.light }}
                onMouseEnter={(e) => showTooltip(e.currentTarget, option, value)}
                onClick={(e) => showTooltip(e.currentTarget, option, value)}
              >
                {width >= 4 && <span className="gas-bar-segment-value">{displayValue}</span>}
              </div>
            );
          })}
        </div>
        {tooltip && (
          <div className={`gas-bar-tooltip gas-bar-tooltip-${tooltip.align}`} style={{ left: tooltip.x, top: tooltip.y }}>
            <span className="gas-bar-tooltip-dot" style={{ background: tooltip.option.light }} />
            <span>
              {tooltip.option.shortLabel}: <strong>{tooltip.value}%</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
