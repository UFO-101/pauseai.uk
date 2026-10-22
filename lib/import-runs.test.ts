import { expect, it } from "vitest";
import { asList, IMPORT_JOBS, importPath, isImportJob, jobBySlug, runTone } from "./import-runs";
import {
  exampleAppliedSync,
  exampleFailedRun,
  exampleHeldSync,
  exampleLumaResult,
  exampleRun,
} from "@/app/(staff)/staff/_components/RunList.examples";

it("knows the jobs", () => {
  expect(isImportJob("sync-mps")).toBe(true);
  expect(isImportJob("")).toBe(false);
  expect(isImportJob("sync-peers")).toBe(false);
});

it("lists a job's newest run, or none", () => {
  expect(asList("run")).toEqual(["run"]);
  expect(asList(undefined)).toEqual([]);
});

it("gives each job a page of its own, and finds the job from its page's slug", () => {
  expect(importPath("check-mps")).toBe("/staff/import-data/mp-check");
  for (const job of IMPORT_JOBS) expect(jobBySlug(importPath(job).split("/").pop()!)).toBe(job);
  expect(jobBySlug("history")).toBeUndefined();
});

it("colours a run by how it ended: green done or applied, amber held or stopped short, red failed, none otherwise", () => {
  expect(runTone(exampleRun("check-mps", { problems: [] }))).toBe("green");
  expect(runTone(exampleAppliedSync)).toBe("green");
  expect(runTone(exampleHeldSync)).toBe("amber");
  expect(runTone(exampleRun("import-luma", { ...exampleLumaResult, stoppedBy: "time" }))).toBe("amber");
  expect(runTone(exampleRun("import-luma", exampleLumaResult))).toBe("green");
  expect(runTone(exampleFailedRun("check-mps", "boom", {}))).toBe("red");
  expect(runTone(exampleRun("import-luma", exampleLumaResult, { status: "unchanged" }))).toBeUndefined();
  expect(runTone(undefined)).toBeUndefined();
});
