import { describe, expect, it, vi } from "vitest";
import {
  dashboardWindow,
  isCampaignMetric,
  isSeriesMetric,
  listWindow,
  METRIC_LINKS,
  agreedHref,
  windowStart,
  WINDOW_OPTIONS,
} from "./staff-dashboard";

describe("dashboardWindow", () => {
  it("is the window the URL asks for, or the default", () => {
    expect(dashboardWindow("30")).toBe(30);
    expect(dashboardWindow("90")).toBe(90);
    expect(dashboardWindow("7")).toBe(7);
    expect(dashboardWindow(undefined)).toBe(7);
    expect(dashboardWindow("14")).toBe(7);
  });
});

it("knows which metrics have a bar by campaign, and which a sparkline", () => {
  expect(isCampaignMetric("lettersSent")).toBe(true);
  expect(isCampaignMetric("eventsHeld")).toBe(false);
  expect(isSeriesMetric("eventRegistrations")).toBe(true);
  expect(isSeriesMetric("lettersSent")).toBe(false);
});

describe("agreedHref", () => {
  it("leads to the one politician who agreed, or to the list of those who did in the window", () => {
    expect(agreedHref({ agreedMp: 7, days: 7 })).toBe("/staff/politicians/7");
    expect(agreedHref({ agreedMp: null, days: 30 })).toBe("/staff/politicians?agreed=30&status=any&sort=asks");
  });
});

describe("a list's date filter", () => {
  it("takes the windows, and nothing else", () => {
    expect(listWindow("30")).toBe(30);
    expect(listWindow("31")).toBeUndefined();
    expect(listWindow("")).toBeUndefined();
  });

  it("starts that many days before now", () => {
    vi.stubEnv("FIXTURE_NOW", "2026-10-21T12:00:00.000Z");
    expect(windowStart(7)).toBe("2026-10-14T12:00:00.000Z");
    vi.unstubAllEnvs();
  });

  it("offers each window", () => {
    expect(WINDOW_OPTIONS.map((option) => option.value)).toEqual(["7", "30", "90"]);
  });

  it("gives every tile a list for its window", () => {
    for (const { href } of Object.values(METRIC_LINKS)) expect(href(30)).toContain("30");
  });
});
