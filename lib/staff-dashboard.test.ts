import { describe, expect, it } from "vitest";
import { type Dashboard, dashboardWindow, isCampaignMetric, isSeriesMetric, signedHref } from "./staff-dashboard";

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
  expect(isSeriesMetric("supportersAdded")).toBe(true);
  expect(isSeriesMetric("lettersSent")).toBe(false);
});

describe("signedHref", () => {
  const counts = (current: number) => ({ mpsSigned: { current, previous: 0 } }) as Dashboard["counts"];

  it("leads to the one politician who signed, or everyone who signed anything, or every politician", () => {
    expect(signedHref({ signedMp: 7, counts: counts(1) })).toBe("/staff/politicians/7");
    expect(signedHref({ signedMp: null, counts: counts(4) })).toBe("/staff/politicians?campaign=any&sort=signed");
    expect(signedHref({ signedMp: null, counts: counts(0) })).toBe("/staff/politicians");
  });
});
