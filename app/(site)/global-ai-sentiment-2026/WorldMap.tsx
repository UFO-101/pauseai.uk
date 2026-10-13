"use client";

import { useEffect, useMemo, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import type { Topology } from "topojson-specification";
import { COUNTRIES, RESPONSE_OPTIONS, slowOrStopPct, type ResponseKey, type CountryRow, type ResponseOption } from "@/lib/data/aiSentiment2026";
import DivergingBar, { BarAxisLabels } from "./DivergingBar";

// Tooltip order: the three "against" options (braced together with their
// subtotal), then "not sure" directly above "as quickly as possible" - the
// only "for" option.
const AGAINST_KEYS: ResponseKey[] = ["stop_permanently_pct", "pause_until_safe_pct", "continue_oversight_pct"];
const REST_KEYS: ResponseKey[] = ["not_sure_pct", "continue_rapidly_pct"];
const AGAINST_OPTIONS: ResponseOption[] = AGAINST_KEYS.map((key) => RESPONSE_OPTIONS.find((o) => o.key === key)!);
const REST_OPTIONS: ResponseOption[] = REST_KEYS.map((key) => RESPONSE_OPTIONS.find((o) => o.key === key)!);

const WIDTH = 960;
const HEIGHT = 500;

// Sequential ramps, light -> dark, monotone lightness. Used for map
// magnitude only, so each is exempt from the categorical CVD validator per
// the dataviz skill. Three hue families rather than one: every "opposed to
// rapid development" metric (including the combined total) shares the
// terracotta ramp, since dark consistently means "more opposed" across all
// of them. "Continue rapidly" is the one metric on the opposite side of the
// question, so it gets its own blue ramp (anchored on its own categorical
// colour, #1868a0) - otherwise dark orange would appear on that tab too and
// read as "more opposed" when it actually means "more want it fast", the
// opposite of what the colour means everywhere else on the page. "Not sure"
// isn't on the spectrum at all, so it gets a neutral ramp of its own too.
const WARM_RAMP_STOPS: [number, number, number][] = [
  [251, 234, 217], // #FBEAD9
  [243, 205, 166], // #F3CDA6
  [233, 173, 121], // #E9AD79
  [219, 137, 82], // #DB8952
  [229, 114, 38], // #e57226 (site accent)
  [168, 78, 26], // #A84E1A (site accent-strong)
  [122, 54, 16], // #7A3610
];

const BLUE_RAMP_STOPS: [number, number, number][] = [
  [230, 240, 247], // #E6F0F7
  [196, 219, 235], // #C4DBEB
  [148, 189, 216], // #94BDD8
  [88, 152, 191], // #5898BF
  [24, 104, 160], // #1868A0 (continue_rapidly categorical colour)
  [14, 68, 107], // #0E446B
];

const GRAY_RAMP_STOPS: [number, number, number][] = [
  [247, 244, 240], // #F7F4F0
  [225, 217, 206], // #E1D9CE
  [198, 187, 172], // #C6BBAC
  [172, 158, 141], // #AC9E8D
  [156, 144, 134], // #9C9086 (not_sure categorical colour)
  [110, 99, 88], // #6E6358
];

function rampStopsFor(metric: MapMetric): [number, number, number][] {
  if (metric === "continue_rapidly_pct") return BLUE_RAMP_STOPS;
  if (metric === "not_sure_pct") return GRAY_RAMP_STOPS;
  return WARM_RAMP_STOPS;
}

function rampColor(t: number, stops: [number, number, number][]): string {
  const clamped = Math.max(0, Math.min(1, t));
  const segments = stops.length - 1;
  const pos = clamped * segments;
  const i = Math.min(Math.floor(pos), segments - 1);
  const localT = pos - i;
  const [r1, g1, b1] = stops[i];
  const [r2, g2, b2] = stops[i + 1];
  const r = Math.round(r1 + (r2 - r1) * localT);
  const g = Math.round(g1 + (g2 - g1) * localT);
  const b = Math.round(b1 + (b2 - b1) * localT);
  return `rgb(${r}, ${g}, ${b})`;
}

// Matches rampColor's own stops so the legend gradient is the same
// non-linear ramp used to fill the countries, not a straight 2-stop blend.
function legendGradient(stops: [number, number, number][]): string {
  return `linear-gradient(90deg, ${stops.map(([r, g, b], i) => `rgb(${r}, ${g}, ${b}) ${(i / (stops.length - 1)) * 100}%`).join(", ")})`;
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

export default function WorldMap() {
  const [features, setFeatures] = useState<FeatureCollection<Geometry, { name: string }> | null>(null);
  const [metric, setMetric] = useState<MapMetric>("stop_permanently_pct");
  const [selected, setSelected] = useState<CountryRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/data/world-countries-50m.topo.json")
      .then((res) => res.json())
      .then((topology: Topology) => {
        if (cancelled) return;
        const geo = feature(topology, topology.objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>;
        setFeatures(geo);
      })
      .catch(() => {
        // Leave features null — the "Loading map…" placeholder stays put
        // instead of an unhandled rejection.
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
  const stops = rampStopsFor(metric);

  function selectCountry(countryName: string) {
    const data = COUNTRY_LOOKUP.get(countryName);
    if (!data) return;
    setSelected((prev) => (prev?.country === data.country ? null : data));
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

      {/* Key to reading the map, placed right above it rather than after
          the panel below - it decodes what's already on screen, so it
          belongs next to the thing it explains, not trailing content the
          reader has to scroll back up past. */}
      <div className="gas-map-legend">
        <span className="gas-map-legend-label">{activeOption.label}</span>
        <div className="gas-map-legend-scale">
          <span>{domainMin}%</span>
          <div className="gas-map-legend-gradient" style={{ background: legendGradient(stops) }} />
          <span>{domainMax}%</span>
        </div>
        <span className="gas-map-legend-nodata"><i /> No data</span>
      </div>

      <div className="gas-map-canvas">
        {!features && <div className="gas-map-loading">Loading map…</div>}
        {features && path && (
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`World map coloured by: ${activeOption.label}`}>
            {features.features.map((f) => {
              const data = COUNTRY_LOOKUP.get(f.properties.name);
              const d = path(f) || undefined;
              const fill = data ? rampColor((metricValue(data, metric) - domainMin) / (domainMax - domainMin || 1), stops) : "var(--border)";
              const isSelected = data ? selected?.country === data.country : false;
              return (
                <path
                  key={f.properties.name}
                  d={d}
                  fill={fill}
                  className={`gas-map-country ${!data ? "gas-map-country-nodata" : ""}`}
                  onClick={() => data && selectCountry(f.properties.name)}
                  onKeyDown={(e) => {
                    if (data && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      selectCountry(f.properties.name);
                    }
                  }}
                  tabIndex={data ? 0 : undefined}
                  role={data ? "button" : undefined}
                  aria-pressed={data ? isSelected : undefined}
                  aria-label={data ? `${f.properties.name}: ${activeOption.label} ${Math.round(metricValue(data, metric))}%` : undefined}
                />
              );
            })}

            {/* Selection border drawn as its own overlay, on top of every
                country path rather than styled via a class on the country
                itself: a plain same-hue stroke barely shows up against an
                orange-ramp fill, and a border painted at the country's own
                stacking position can get partly painted over by whichever
                neighbour happens to come later in the feature list. A
                white halo behind the accent line keeps it legible against
                any fill colour; drawing both on top guarantees the whole
                outline stays visible regardless of paint order. */}
            {selected &&
              (() => {
                const selectedFeature = features.features.find((f) => f.properties.name === selected.country);
                const selectedD = selectedFeature ? path(selectedFeature) : null;
                if (!selectedD) return null;
                return (
                  <g className="gas-map-selection-outline" aria-hidden="true">
                    <path d={selectedD} className="gas-map-selection-outline-halo" />
                    <path d={selectedD} className="gas-map-selection-outline-line" />
                  </g>
                );
              })()}
          </svg>
        )}
      </div>

      {selected ? (
        <>
          {/* Desktop: the same diverging bar used everywhere else on the
              page, so a selected country reads the same way as the "all
              104 countries" list below. Hidden on narrow screens where a
              single skinny bar has no room to be legible - see
              .gas-map-panel-bar / .gas-map-panel-detail media rules. */}
          <div className="gas-map-panel gas-map-panel-bar">
            <button type="button" className="gas-map-panel-close" onClick={() => setSelected(null)} aria-label="Clear selection">
              ×
            </button>
            <div className="gas-bar-list gas-global-bar">
              <BarAxisLabels />
              <DivergingBar
                label={selected.country}
                row={selected}
                meta={
                  <>
                    {selected.region} &middot; n={selected.n.toLocaleString()} &middot; ±{selected.moe_pp}pp
                  </>
                }
              />
            </div>
          </div>

          {/* Mobile: the compact tooltip-style breakdown, since it fits a
              narrow viewport better than a full-width bar. */}
          <div className="gas-map-panel gas-map-panel-detail">
            <button type="button" className="gas-map-panel-close" onClick={() => setSelected(null)} aria-label="Clear selection">
              ×
            </button>
            <div className="gas-map-panel-title">{selected.country}</div>
            <div className="gas-map-panel-region">{selected.region} &middot; n={selected.n.toLocaleString()} &middot; ±{selected.moe_pp}pp</div>
            <ul className="gas-map-panel-list">
              <li className="gas-map-panel-group">
                <ul className="gas-map-panel-group-items">
                  {AGAINST_OPTIONS.map((option) => (
                    <li key={option.key}>
                      <span className="gas-map-panel-dot" style={{ background: option.light }} />
                      <span className="gas-map-panel-label">{option.shortLabel}</span>
                      <span className="gas-map-panel-value">{selected[option.key]}%</span>
                    </li>
                  ))}
                </ul>
                <div className="gas-map-panel-brace-box" aria-hidden="true">
                  <svg viewBox="0 0 10 100" preserveAspectRatio="none">
                    <path d="M1,1 C7,1 5,45 9,50 C5,55 7,99 1,99" fill="none" stroke="currentColor" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
                  </svg>
                </div>
                <div className="gas-map-panel-total">
                  <span className="gas-map-panel-total-label">Total against</span>
                  <span className="gas-map-panel-total-value">{slowOrStopPct(selected)}%</span>
                </div>
              </li>
              {REST_OPTIONS.map((option) => (
                <li key={option.key}>
                  <span className="gas-map-panel-dot" style={{ background: option.light }} />
                  <span className="gas-map-panel-label">{option.shortLabel}</span>
                  <span className="gas-map-panel-value">{selected[option.key]}%</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <div className="gas-map-panel gas-map-panel-placeholder">Click or tap a country to see its full breakdown.</div>
      )}
    </div>
  );
}
