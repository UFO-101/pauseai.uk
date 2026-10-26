import { describe, expect, it } from "vitest";
import { dashboardWindow, isCampaignMetric, isSeriesMetric, signedHref } from "./staff-dashboard";

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
  const byCampaign = { lettersSent: {}, mpsSigned: {} };

  it("leads to the one politician who signed, or those who signed the campaign most did, or everyone", () => {
    expect(signedHref({ signedMp: 7, byCampaign })).toBe("/staff/politicians/7");
    expect(
      signedHref({
        signedMp: null,
        byCampaign: { ...byCampaign, mpsSigned: { "regulate-letter-pm": 1, "support-sobel-bill": 4 } },
      }),
    ).toBe("/staff/politicians?campaign=support-sobel-bill&sort=support-sobel-bill");
    expect(signedHref({ signedMp: null, byCampaign })).toBe("/staff/politicians");
  });
});
