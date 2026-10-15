import { describe, expect, it } from "vitest";
import {
  AXIS_MAX_PCT,
  COUNTRIES,
  DEMOGRAPHICS,
  GLOBAL_AVERAGE,
  GLOBAL_MOE_PP,
  GLOBAL_N,
  QUESTION_TEXT,
  REGIONS,
  REGION_AVERAGES,
  RESPONSE_OPTIONS,
  SURVEY_META,
  approxMoePp,
  netOpinion,
  regionLabel,
  slowOrStopPct,
} from "./aiSentiment2026";

const row = {
  stop_permanently_pct: 10,
  pause_until_safe_pct: 20,
  continue_oversight_pct: 30,
  continue_rapidly_pct: 25,
  not_sure_pct: 15,
};

describe("AI sentiment 2026 data", () => {
  it("covers the survey's 104 countries and 377,458 respondents", () => {
    expect(COUNTRIES).toHaveLength(SURVEY_META.countries);
    expect(GLOBAL_N).toBe(SURVEY_META.respondents);
  });

  it("has a global topline and a row per region", () => {
    expect(GLOBAL_AVERAGE.section).toBe("global_topline");
    expect(REGION_AVERAGES.length).toBeGreaterThan(0);
    expect(DEMOGRAPHICS).toContain(GLOBAL_AVERAGE);
  });

  it("lists regions once each, sorted", () => {
    expect(REGIONS).toEqual([...new Set(REGIONS)].sort());
    expect(REGIONS.length).toBeGreaterThan(3);
  });

  it("has an option for each response column", () => {
    expect(RESPONSE_OPTIONS.map((o) => o.key)).toEqual([
      "stop_permanently_pct",
      "pause_until_safe_pct",
      "continue_oversight_pct",
      "continue_rapidly_pct",
      "not_sure_pct",
    ]);
    expect(QUESTION_TEXT).toMatch(/superintelligent AI/);
  });

  it("has an axis wide enough for every bar", () => {
    for (const r of [...COUNTRIES, ...DEMOGRAPHICS]) {
      expect(slowOrStopPct(r) + r.not_sure_pct / 2).toBeLessThanOrEqual(AXIS_MAX_PCT);
      expect(r.continue_rapidly_pct + r.not_sure_pct / 2).toBeLessThanOrEqual(AXIS_MAX_PCT);
    }
  });
});

describe("AI sentiment helpers", () => {
  it("approximates the margin of error at 95% confidence", () => {
    expect(approxMoePp(1000)).toBe(3.1);
    expect(approxMoePp(400)).toBe(4.9);
    expect(GLOBAL_MOE_PP).toBe(approxMoePp(GLOBAL_N));
  });

  it("spells out abbreviated regions, and passes others through", () => {
    expect(regionLabel("MENA")).toBe("Middle East & North Africa");
    expect(regionLabel("Europe")).toBe("Europe");
  });

  it("nets 'go fast' against everyone wanting to slow or stop", () => {
    expect(slowOrStopPct(row)).toBe(60);
    expect(netOpinion(row)).toBe(-35);
  });
});
