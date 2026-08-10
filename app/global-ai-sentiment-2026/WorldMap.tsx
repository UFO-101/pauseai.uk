"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import type { Topology } from "topojson-specification";
import { COUNTRIES, RESPONSE_OPTIONS, slowOrStopPct, type ResponseKey, type CountryRow } from "@/lib/data/aiSentiment2026";

const WIDTH = 960;
const HEIGHT = 500;

// Single-hue sequential ramp (terracotta), light -> dark, monotone lightness.
// Used for map magnitude only. This is a sequential (not categorical) scale,
// so it is exempt from the categorical CVD validator per the dataviz skill.
const RAMP_STOPS: [number, number, number][] = [
  [251, 234, 217], // #FBEAD9
  [243, 205, 166], // #F3CDA6
  [233, 173, 121], // #E9AD79
  [219, 137, 82], // #DB8952
  [200, 101, 42], // #C8652A (site accent)
  [168, 78, 26], // #A84E1A (site accent-strong)
  [122, 54, 16], // #7A3610
];

function rampColor(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const segments = RAMP_STOPS.length - 1;
  const pos = clamped * segments;
  const i = Math.min(Math.floor(pos), segments - 1);
  const localT = pos - i;
  const [r1, g1, b1] = RAMP_STOPS[i];
  const [r2, g2, b2] = RAMP_STOPS[i + 1];
  const r = Math.round(r1 + (r2 - r1) * localT);
  const g = Math.round(g1 + (g2 - g1) * localT);
  const b = Math.round(b1 + (b2 - b1) * localT);
  return `rgb(${r}, ${g}, ${b})`;
}

const COUNTRY_LOOKUP = new Map<string, CountryRow>(COUNTRIES.map((c) => [c.country, c]));

// A synthetic metric ("opposed_combined") alongside the five real response
// keys, standing for the combined share who want development stopped,
// paused, or placed under strict oversight (see slowOrStopPct).
type MapMetric = ResponseKey | "opposed_combined";
type MetricOption = { key: MapMetric; label: string; shortLabel: string; light: string };

const OPPOSED_COMBINED_OPTION: MetricOption = {
  key: "opposed_combined",
  label: "All opposed development (combined)",
  shortLabel: "All opposed (combined)",
  light: "var(--accent-strong)",
};

function optionFor(key: ResponseKey): MetricOption {
  return RESPONSE_OPTIONS.find((o) => o.key === key)!;
}

function metricValue(row: CountryRow, metric: MapMetric): number {
  return metric === "opposed_combined" ? slowOrStopPct(row) : row[metric];
}

// The metric picker is organised the same way the source report frames the
// results: three options that mean "slow down or stop" development grouped
// under "opposed" (plus their combined total), one that means "go faster"
// under "in favour", with "not sure" left standalone since it isn't really
// on that spectrum.
const METRIC_GROUPS: { label: string; options: MetricOption[] }[] = [
  {
    label: "Opposed to rapid development",
    options: [OPPOSED_COMBINED_OPTION, optionFor("stop_permanently_pct"), optionFor("pause_until_safe_pct"), optionFor("continue_oversight_pct")],
  },
  { label: "In favour of rapid development", options: [optionFor("continue_rapidly_pct")] },
  { label: "Other", options: [optionFor("not_sure_pct")] },
];

const ALL_METRIC_OPTIONS = METRIC_GROUPS.flatMap((g) => g.options);

// A single shared domain across the five real metrics, rather than each
// tab rescaling to its own min/max, so colour intensity means the same
// thing (and is directly comparable) when switching between tabs. The
// combined "all opposed" metric sums three of those, so it's a different
// quantity on a different scale and gets its own domain.
const ALL_VALUES = COUNTRIES.flatMap((c) => RESPONSE_OPTIONS.map((o) => c[o.key]));
const DOMAIN_MIN = Math.min(...ALL_VALUES);
const DOMAIN_MAX = Math.max(...ALL_VALUES);

const COMBINED_VALUES = COUNTRIES.map((c) => slowOrStopPct(c));
const COMBINED_MIN = Math.min(...COMBINED_VALUES);
const COMBINED_MAX = Math.max(...COMBINED_VALUES);

type TooltipState = {
  country: CountryRow;
  x: number;
  y: number;
  flip: boolean;
};

export default function WorldMap() {
  const [features, setFeatures] = useState<FeatureCollection<Geometry, { name: string }> | null>(null);
  const [metric, setMetric] = useState<MapMetric>("stop_permanently_pct");
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/data/world-countries-50m.topo.json")
      .then((res) => res.json())
      .then((topology: Topology) => {
        if (cancelled) return;
        const geo = feature(topology, topology.objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>;
        setFeatures(geo);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const path = useMemo(() => {
    if (!features) return null;
    const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], features);
    return geoPath(projection);
  }, [features]);

  const activeOption = ALL_METRIC_OPTIONS.find((o) => o.key === metric)!;
  const [domainMin, domainMax] = metric === "opposed_combined" ? [COMBINED_MIN, COMBINED_MAX] : [DOMAIN_MIN, DOMAIN_MAX];

  function handleMove(e: React.MouseEvent, countryName: string) {
    const data = COUNTRY_LOOKUP.get(countryName);
    if (!data || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setTooltip({ country: data, x, y, flip: y < 140 });
  }

  return (
    <div className="gas-map">
      <div className="gas-map-controls" role="group" aria-label="Map metric">
        {METRIC_GROUPS.map((group) => (
          <div key={group.label} className="gas-map-metric-group">
            <span className="gas-map-metric-group-label">{group.label}</span>
            <div className="gas-map-metric-group-buttons">
              {group.options.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={`gas-map-metric-btn ${metric === option.key ? "active" : ""}`}
                  onClick={() => setMetric(option.key)}
                  style={metric === option.key ? { borderColor: option.light, color: option.light } : undefined}
                >
                  {option.shortLabel}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="gas-map-canvas" ref={containerRef} onMouseLeave={() => setTooltip(null)}>
        {!features && <div className="gas-map-loading">Loading map…</div>}
        {features && path && (
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`World map coloured by: ${activeOption.label}`}>
            {features.features.map((f) => {
              const data = COUNTRY_LOOKUP.get(f.properties.name);
              const d = path(f) || undefined;
              const fill = data ? rampColor((metricValue(data, metric) - domainMin) / (domainMax - domainMin || 1)) : "var(--border)";
              return (
                <path
                  key={f.properties.name}
                  d={d}
                  fill={fill}
                  className={data ? "gas-map-country" : "gas-map-country gas-map-country-nodata"}
                  onMouseMove={(e) => data && handleMove(e, f.properties.name)}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })}
          </svg>
        )}

        {tooltip && (
          <div
            className={`gas-map-tooltip ${tooltip.flip ? "gas-map-tooltip-flip" : ""}`}
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <div className="gas-map-tooltip-title">{tooltip.country.country}</div>
            <div className="gas-map-tooltip-region">{tooltip.country.region} &middot; n={tooltip.country.n.toLocaleString()}</div>
            <ul className="gas-map-tooltip-list">
              {RESPONSE_OPTIONS.map((option) => (
                <li key={option.key}>
                  <span className="gas-map-tooltip-dot" style={{ background: option.light }} />
                  <span className="gas-map-tooltip-label">{option.shortLabel}</span>
                  <span className="gas-map-tooltip-value">{tooltip.country[option.key]}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="gas-map-legend">
        <span className="gas-map-legend-label">{activeOption.label}</span>
        <div className="gas-map-legend-scale">
          <span>{domainMin}%</span>
          <div
            className="gas-map-legend-gradient"
            style={{ background: `linear-gradient(90deg, ${rampColor(0)}, ${rampColor(1)})` }}
          />
          <span>{domainMax}%</span>
        </div>
        <span className="gas-map-legend-nodata"><i /> No data</span>
      </div>
    </div>
  );
}
