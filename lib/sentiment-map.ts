import { slowOrStopPct, type CountryRow, type ResponseKey } from "@/lib/content/aiSentiment2026";

/** What the world map colours countries by: one response, or everyone opposed combined. */
export type MapMetric = ResponseKey | "opposed_combined";

export type Rgb = [number, number, number];

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
export const WARM_RAMP_STOPS: Rgb[] = [
  [251, 234, 217], // #FBEAD9
  [243, 205, 166], // #F3CDA6
  [233, 173, 121], // #E9AD79
  [219, 137, 82], // #DB8952
  [229, 114, 38], // #e57226 (site accent)
  [168, 78, 26], // #A84E1A (site accent-strong)
  [122, 54, 16], // #7A3610
];

export const BLUE_RAMP_STOPS: Rgb[] = [
  [230, 240, 247], // #E6F0F7
  [196, 219, 235], // #C4DBEB
  [148, 189, 216], // #94BDD8
  [88, 152, 191], // #5898BF
  [24, 104, 160], // #1868A0 (continue_rapidly categorical colour)
  [14, 68, 107], // #0E446B
];

export const GRAY_RAMP_STOPS: Rgb[] = [
  [247, 244, 240], // #F7F4F0
  [225, 217, 206], // #E1D9CE
  [198, 187, 172], // #C6BBAC
  [172, 158, 141], // #AC9E8D
  [156, 144, 134], // #9C9086 (not_sure categorical colour)
  [110, 99, 88], // #6E6358
];

export function rampStopsFor(metric: MapMetric): Rgb[] {
  if (metric === "continue_rapidly_pct") return BLUE_RAMP_STOPS;
  if (metric === "not_sure_pct") return GRAY_RAMP_STOPS;
  return WARM_RAMP_STOPS;
}

/** The colour at `t` (0 to 1, clamped) along a ramp. */
export function rampColor(t: number, stops: Rgb[]): string {
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

/**
 * The legend's gradient, through the same stops as rampColor, so it is the
 * same non-linear ramp used to fill the countries, not a straight 2-stop blend.
 */
export function legendGradient(stops: Rgb[]): string {
  return `linear-gradient(90deg, ${stops.map(([r, g, b], i) => `rgb(${r}, ${g}, ${b}) ${(i / (stops.length - 1)) * 100}%`).join(", ")})`;
}

export function metricValue(row: CountryRow, metric: MapMetric): number {
  return metric === "opposed_combined" ? slowOrStopPct(row) : row[metric];
}

/** Where `value` sits between min and max, 0 to 1. A domain with no width puts everything at 0. */
export function domainPosition(value: number, min: number, max: number): number {
  return (value - min) / (max - min || 1);
}
