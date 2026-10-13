import { describe, expect, it } from "vitest";
import { COUNTRIES, slowOrStopPct } from "@/lib/content/aiSentiment2026";
import {
  BLUE_RAMP_STOPS,
  GRAY_RAMP_STOPS,
  WARM_RAMP_STOPS,
  domainPosition,
  legendGradient,
  metricValue,
  rampColor,
  rampStopsFor,
} from "./sentiment-map";

describe("map colours", () => {
  it("uses blue for going faster, grey for not sure, and terracotta for everything opposed", () => {
    expect(rampStopsFor("continue_rapidly_pct")).toBe(BLUE_RAMP_STOPS);
    expect(rampStopsFor("not_sure_pct")).toBe(GRAY_RAMP_STOPS);
    expect(rampStopsFor("stop_permanently_pct")).toBe(WARM_RAMP_STOPS);
    expect(rampStopsFor("opposed_combined")).toBe(WARM_RAMP_STOPS);
  });

  it("interpolates along the ramp, clamping outside 0 to 1", () => {
    const stops: [number, number, number][] = [
      [0, 0, 0],
      [100, 100, 100],
      [200, 200, 200],
    ];
    expect(rampColor(0, stops)).toBe("rgb(0, 0, 0)");
    expect(rampColor(0.25, stops)).toBe("rgb(50, 50, 50)");
    expect(rampColor(1, stops)).toBe("rgb(200, 200, 200)");
    expect(rampColor(-1, stops)).toBe("rgb(0, 0, 0)");
    expect(rampColor(2, stops)).toBe("rgb(200, 200, 200)");
  });

  it("draws the legend through the same stops", () => {
    expect(legendGradient([[0, 0, 0], [255, 255, 255]])).toBe("linear-gradient(90deg, rgb(0, 0, 0) 0%, rgb(255, 255, 255) 100%)");
  });
});

describe("metric values", () => {
  it("reads one response, or sums everyone opposed", () => {
    const row = COUNTRIES[0];
    expect(metricValue(row, "pause_until_safe_pct")).toBe(row.pause_until_safe_pct);
    expect(metricValue(row, "opposed_combined")).toBe(slowOrStopPct(row));
  });

  it("places a value in its domain, coping with a domain of one value", () => {
    expect(domainPosition(15, 10, 20)).toBe(0.5);
    expect(domainPosition(10, 10, 10)).toBe(0);
  });
});
