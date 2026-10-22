import { describe, expect, it } from "vitest";
import {
  exampleAppliedSync,
  exampleFailedRun,
  exampleHeldSync,
  exampleLumaResult,
  exampleRun,
} from "@/app/(staff)/staff/_components/RunList.examples";
import { dashboardWindow, importTone, isCampaignMetric, isSeriesMetric } from "./staff-dashboard";

describe("dashboardWindow", () => {
  it("is the window the URL asks for, or the default", () => {
    expect(dashboardWindow("30")).toBe(30);
    expect(dashboardWindow("90")).toBe(90);
    expect(dashboardWindow("7")).toBe(7);
    expect(dashboardWindow(undefined)).toBe(7);
    expect(dashboardWindow("14")).toBe(7);
  });
});

describe("importTone", () => {
  it("is green for a run that ended well, amber held or stopped short, red failed, none never run", () => {
    expect(importTone(exampleAppliedSync)).toBe("green");
    expect(importTone(exampleRun("import-luma", exampleLumaResult))).toBe("green");
    expect(importTone(exampleRun("import-luma", { ...exampleLumaResult, stoppedBy: "time" }))).toBe("amber");
    expect(importTone(exampleHeldSync)).toBe("amber");
    expect(importTone(exampleFailedRun("check-mps", "Parliament answered 500", {}))).toBe("red");
    expect(importTone(undefined)).toBe("none");
  });
});

it("knows which metrics have a bar by campaign, and which a sparkline", () => {
  expect(isCampaignMetric("lettersSent")).toBe(true);
  expect(isCampaignMetric("eventsHeld")).toBe(false);
  expect(isSeriesMetric("supportersAdded")).toBe(true);
  expect(isSeriesMetric("lettersSent")).toBe(false);
});
