// Source: Nira Data, "AI Sentiment 2026" (Spring 2026 World Omnibus).
// 377,458 respondents across 104 countries, fieldwork 19 Mar - 21 Apr 2026,
// weighted to national benchmarks. See /data/ai_sentiment_2026_*.csv and the
// full PDF report at /reports/ai-sentiment-2026.pdf.
//
// COUNTRIES and DEMOGRAPHICS below are generated from the CSVs in /data by
// scripts/generate-ai-sentiment-data.mjs. Edit the CSVs and re-run the
// script rather than editing the JSON directly.

import countriesData from "@/data/ai_sentiment_2026_countries.json";
import demographicsData from "@/data/ai_sentiment_2026_demographics.json";

export type ResponseKey =
  | "stop_permanently_pct"
  | "pause_until_safe_pct"
  | "continue_oversight_pct"
  | "continue_rapidly_pct"
  | "not_sure_pct";

export type ResponseOption = {
  key: ResponseKey;
  label: string;
  shortLabel: string;
  light: string;
  dark: string;
};

// Categorical palette validated with the dataviz skill's contrast/CVD checker
// (adjacent-pair mode, since these only ever sit next to each other in a
// stacked bar or a legend row): all four opinion colours pass every gate in
// both light and dark mode. "Not sure" is a deliberate neutral, always
// paired with a direct % label rather than relying on hue alone.
//
// "Pause until safe" is the exact brand hue (--pause-orange, #e57226), the
// midpoint of a deliberate 3-step warm gradient across the "slow or stop"
// cluster (see slowOrStopPct): dark red -> brand orange -> bright gold,
// stepping up in lightness on both sides of the brand color rather than
// just rotating hue at matching lightness — sRGB can't hold a saturated
// gold as vivid as a saturated red at the same lightness pause sits at, so
// a same-lightness gold reads muddy and sits too close to the orange for
// CVD separation. "Continue rapidly" stays cool blue, opposite the warm
// cluster, but deliberately desaturated/flat rather than a vivid, inviting
// sky blue.
export const RESPONSE_OPTIONS: ResponseOption[] = [
  {
    key: "stop_permanently_pct",
    label: "Stop development permanently",
    shortLabel: "Stop permanently",
    light: "#c1272d",
    dark: "#e2585a",
  },
  {
    key: "pause_until_safe_pct",
    label: "Pause development until it is proven safe",
    shortLabel: "Pause until safe",
    light: "#e57226",
    dark: "#f0955c",
  },
  {
    key: "continue_oversight_pct",
    label: "Continue development with strict oversight",
    shortLabel: "Strict oversight",
    light: "#ccb501",
    dark: "#e0c400",
  },
  {
    key: "continue_rapidly_pct",
    label: "Continue development as quickly as possible",
    shortLabel: "As quickly as possible",
    // Deliberately flatter/duller than a bright "friendly tech" blue —
    // desaturated steel tone, right at the chroma floor so it still reads
    // as a color rather than gray.
    light: "#1868a0",
    dark: "#4a8fc4",
  },
  {
    key: "not_sure_pct",
    label: "Not sure",
    shortLabel: "Not sure",
    light: "#9c9086",
    dark: "#b5aa9c",
  },
];

export const QUESTION_TEXT =
  "Some companies are working on developing superintelligent AI (artificial intelligence) that can outperform humans in all tasks. Which comes closest to your view?";

export type CountryRow = {
  country: string;
  region: string;
  stop_permanently_pct: number;
  pause_until_safe_pct: number;
  continue_oversight_pct: number;
  continue_rapidly_pct: number;
  not_sure_pct: number;
  n: number;
  moe_pp: number;
};

export type DemographicRow = {
  section: string;
  group: string;
  stop_permanently_pct: number;
  pause_until_safe_pct: number;
  continue_oversight_pct: number;
  continue_rapidly_pct: number;
  not_sure_pct: number;
};

export const COUNTRIES: CountryRow[] = countriesData;

export const DEMOGRAPHICS: DemographicRow[] = demographicsData;

export const GLOBAL_AVERAGE = DEMOGRAPHICS.find(
  (d) => d.section === "global_topline",
)!;
export const REGION_AVERAGES = DEMOGRAPHICS.filter(
  (d) => d.section === "region_average",
);

// Total respondents, derived by summing the per-country sample sizes
// (matches the 377,458 the report states for the full survey).
export const GLOBAL_N = COUNTRIES.reduce((sum, c) => sum + c.n, 0);

// Worst-case margin of error at 95% confidence (p = 0.5), the standard
// pollster approximation. The per-country moe_pp column in the source CSV
// isn't reproducible from n alone (it reflects each country's weighting),
// so this is a labelled approximation rather than a sourced figure.
export function approxMoePp(n: number): number {
  return Math.round(1.96 * Math.sqrt(0.25 / n) * 100 * 10) / 10;
}

export const GLOBAL_MOE_PP = approxMoePp(GLOBAL_N);

// Shared axis scale for the diverging opinion bars (DivergingBar.tsx). Both
// sides of the axis use the same max so a given percentage-point length
// means the same thing on the left and right - only the actual furthest
// bar (across every country and demographic cut, "against" = stop + pause
// + oversight, "for" = rapid, each plus half of "not sure") should reach
// the edge, with a little padding so its label isn't flush against it.
function axisExtent(row: { stop_permanently_pct: number; pause_until_safe_pct: number; continue_oversight_pct: number; continue_rapidly_pct: number; not_sure_pct: number }) {
  const against = row.stop_permanently_pct + row.pause_until_safe_pct + row.continue_oversight_pct;
  const forDev = row.continue_rapidly_pct;
  const half = row.not_sure_pct / 2;
  return Math.max(against + half, forDev + half);
}

const MAX_AXIS_EXTENT = Math.max(...COUNTRIES.map(axisExtent), ...DEMOGRAPHICS.map(axisExtent));

export const AXIS_MAX_PCT = Math.ceil(MAX_AXIS_EXTENT);

export const REGIONS = [...new Set(COUNTRIES.map((c) => c.region))].sort();

const REGION_FULL_NAMES: Record<string, string> = {
  MENA: "Middle East & North Africa",
};

export function regionLabel(region: string): string {
  return REGION_FULL_NAMES[region] ?? region;
}

export function netOpinion(row: {
  stop_permanently_pct: number;
  pause_until_safe_pct: number;
  continue_oversight_pct: number;
  continue_rapidly_pct: number;
}): number {
  return (
    row.continue_rapidly_pct -
    (row.stop_permanently_pct +
      row.pause_until_safe_pct +
      row.continue_oversight_pct)
  );
}

export function slowOrStopPct(row: {
  stop_permanently_pct: number;
  pause_until_safe_pct: number;
  continue_oversight_pct: number;
}): number {
  return (
    row.stop_permanently_pct +
    row.pause_until_safe_pct +
    row.continue_oversight_pct
  );
}

export const SURVEY_META = {
  respondents: 377458,
  countries: 104,
  fieldwork: "19 Mar to 21 Apr 2026",
  publisher: "Nira Data",
  reportUrl: "https://www.niradata.com/ai-sentiment",
};
