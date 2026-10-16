"use client";

import { useEffect, useMemo, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import type { Topology } from "topojson-specification";
import {
  COUNTRIES,
  RESPONSE_OPTIONS,
  slowOrStopPct,
  type ResponseKey,
  type CountryRow,
  type ResponseOption,
} from "@/lib/content/aiSentiment2026";
import {
  domainPosition,
  legendGradient,
  metricValue,
  rampColor,
  rampStopsFor,
  type MapMetric,
} from "@/lib/sentiment-map";
import DivergingBar, { BarAxisLabels } from "./DivergingBar";
import styles from "./sentiment.module.css";

// Tooltip order: the three "against" options (braced together with their
// subtotal), then "not sure" directly above "as quickly as possible" - the
// only "for" option.
const AGAINST_KEYS: ResponseKey[] = ["stop_permanently_pct", "pause_until_safe_pct", "continue_oversight_pct"];
const REST_KEYS: ResponseKey[] = ["not_sure_pct", "continue_rapidly_pct"];
const AGAINST_OPTIONS: ResponseOption[] = AGAINST_KEYS.map((key) => RESPONSE_OPTIONS.find((o) => o.key === key)!);
const REST_OPTIONS: ResponseOption[] = REST_KEYS.map((key) => RESPONSE_OPTIONS.find((o) => o.key === key)!);

const WIDTH = 960;
const HEIGHT = 500;

const COUNTRY_LOOKUP = new Map<string, CountryRow>(COUNTRIES.map((c) => [c.country, c]));

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

// The metric picker is organised the same way the source report frames the
// results: three options that mean "slow down or stop" development grouped
// under "opposed" (plus their combined total), one that means "go faster"
// under "in favour", with "not sure" left standalone since it isn't really
// on that spectrum.
const METRIC_GROUPS: { label: string; options: MetricOption[] }[] = [
  {
    label: "Opposed to rapid development",
    options: [
      OPPOSED_COMBINED_OPTION,
      optionFor("stop_permanently_pct"),
      optionFor("pause_until_safe_pct"),
      optionFor("continue_oversight_pct"),
    ],
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
        const geo = feature(topology, topology.objects.countries) as unknown as FeatureCollection<
          Geometry,
          { name: string }
        >;
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

  const path = useMemo(() => features && geoPath(geoNaturalEarth1().fitSize([WIDTH, HEIGHT], features)), [features]);

  const activeOption = ALL_METRIC_OPTIONS.find((o) => o.key === metric)!;
  const [domainMin, domainMax] =
    metric === "opposed_combined" ? [COMBINED_MIN, COMBINED_MAX] : [DOMAIN_MIN, DOMAIN_MAX];
  const stops = rampStopsFor(metric);

  // Clicking the selected country again clears the selection.
  function selectCountry(data: CountryRow) {
    setSelected((prev) => (prev?.country === data.country ? null : data));
  }

  return (
    <div className={styles.map}>
      <div className={styles.mapControls} role="group" aria-label="Map metric">
        {METRIC_GROUPS.map((group) => (
          <div key={group.label} className={styles.mapMetricGroup}>
            <span className={styles.mapMetricGroupLabel}>{group.label}</span>
            <div className={styles.mapMetricGroupButtons}>
              {group.options.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={metric === option.key ? `${styles.mapMetricBtn} ${styles.active}` : styles.mapMetricBtn}
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
      <div className={styles.mapLegend}>
        <span className={styles.mapLegendLabel}>{activeOption.label}</span>
        <div className={styles.mapLegendScale}>
          <span>{domainMin}%</span>
          <div className={styles.mapLegendGradient} style={{ background: legendGradient(stops) }} />
          <span>{domainMax}%</span>
        </div>
        <span className={styles.mapLegendNodata}>
          <i /> No data
        </span>
      </div>

      <div className={styles.mapCanvas}>
        {!features && <div className={styles.mapLoading}>Loading map…</div>}
        {features && (
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label={`World map coloured by: ${activeOption.label}`}
          >
            {features.features.map((f) => {
              const data = COUNTRY_LOOKUP.get(f.properties.name);
              const d = path!(f) || undefined;
              const fill = data
                ? rampColor(domainPosition(metricValue(data, metric), domainMin, domainMax), stops)
                : "var(--border)";
              const isSelected = data ? selected?.country === data.country : false;
              return (
                <path
                  key={f.properties.name}
                  d={d}
                  fill={fill}
                  data-testid="map-country"
                  className={data ? styles.mapCountry : `${styles.mapCountry} ${styles.mapCountryNodata}`}
                  onClick={data ? () => selectCountry(data) : undefined}
                  onKeyDown={
                    data
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            selectCountry(data);
                          }
                        }
                      : undefined
                  }
                  tabIndex={data ? 0 : undefined}
                  role={data ? "button" : undefined}
                  aria-pressed={data ? isSelected : undefined}
                  aria-label={
                    data
                      ? `${f.properties.name}: ${activeOption.label} ${Math.round(metricValue(data, metric))}%`
                      : undefined
                  }
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
                // Only countries on the map can be selected, so the feature is there.
                const selectedD =
                  path!(features.features.find((f) => f.properties.name === selected.country)!) ?? undefined;
                return (
                  <g className={styles.mapSelectionOutline} data-testid="map-selection-outline" aria-hidden="true">
                    <path d={selectedD} className={styles.mapSelectionOutlineHalo} />
                    <path d={selectedD} className={styles.mapSelectionOutlineLine} />
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
          <div className={`${styles.mapPanel} ${styles.mapPanelBar}`} data-testid="map-panel-bar">
            <button
              type="button"
              className={styles.mapPanelClose}
              onClick={() => setSelected(null)}
              aria-label="Clear selection"
            >
              ×
            </button>
            <div className={`${styles.barList} ${styles.globalBar}`}>
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
          <div className={`${styles.mapPanel} ${styles.mapPanelDetail}`} data-testid="map-panel-detail">
            <button
              type="button"
              className={styles.mapPanelClose}
              onClick={() => setSelected(null)}
              aria-label="Clear selection"
            >
              ×
            </button>
            <div className={styles.mapPanelTitle} data-testid="map-panel-title">
              {selected.country}
            </div>
            <div className={styles.mapPanelRegion}>
              {selected.region} &middot; n={selected.n.toLocaleString()} &middot; ±{selected.moe_pp}pp
            </div>
            <ul className={styles.mapPanelList}>
              <li className={styles.mapPanelGroup}>
                <ul className={styles.mapPanelGroupItems}>
                  {AGAINST_OPTIONS.map((option) => (
                    <li key={option.key}>
                      <span className={styles.mapPanelDot} style={{ background: option.light }} />
                      <span className={styles.mapPanelLabel}>{option.shortLabel}</span>
                      <span className={styles.mapPanelValue}>{selected[option.key]}%</span>
                    </li>
                  ))}
                </ul>
                <div className={styles.mapPanelBraceBox} aria-hidden="true">
                  <svg viewBox="0 0 10 100" preserveAspectRatio="none">
                    <path
                      d="M1,1 C7,1 5,45 9,50 C5,55 7,99 1,99"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                </div>
                <div className={styles.mapPanelTotal}>
                  <span className={styles.mapPanelTotalLabel}>Total against</span>
                  <span className={styles.mapPanelTotalValue} data-testid="map-panel-total-value">
                    {slowOrStopPct(selected)}%
                  </span>
                </div>
              </li>
              {REST_OPTIONS.map((option) => (
                <li key={option.key}>
                  <span className={styles.mapPanelDot} style={{ background: option.light }} />
                  <span className={styles.mapPanelLabel}>{option.shortLabel}</span>
                  <span className={styles.mapPanelValue}>{selected[option.key]}%</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <div className={`${styles.mapPanel} ${styles.mapPanelPlaceholder}`}>
          Click or tap a country to see its full breakdown.
        </div>
      )}
    </div>
  );
}
