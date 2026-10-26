import { expect, it } from "vitest";
import { asList, IMPORT_JOBS, importPath, isImportJob, jobBySlug, runStatus, runTone } from "./import-runs";
import {
  exampleAppliedSync,
  exampleEmailsResult,
  exampleFailedRun,
  exampleHeldSync,
  exampleLumaResult,
  exampleRun,
} from "@/app/(staff)/staff/_components/RunList.examples";

it("knows the jobs", () => {
  expect(isImportJob("sync-politicians")).toBe(true);
  expect(isImportJob("sync-mps")).toBe(false);
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

it("says a Luma import that left work for later is incomplete, in place of done or unchanged, but not failed", () => {
  expect(runStatus(exampleRun("import-luma", { ...exampleLumaResult, stoppedBy: "time" }))).toBe("incomplete");
  expect(
    runStatus(exampleRun("import-luma", { ...exampleLumaResult, contactsPassGoing: true }, { status: "unchanged" })),
  ).toBe("incomplete");
  expect(runStatus(exampleRun("import-luma", exampleLumaResult))).toBe("ok");
  expect(runStatus(exampleFailedRun("import-luma", "boom", {}))).toBe("failed");
  expect(runStatus(exampleHeldSync)).toBe("held");
});

it("says an Emails sync that held emails back is incomplete, but not one that held none, or failed", () => {
  expect(runStatus(exampleRun("sync-emails", exampleEmailsResult))).toBe("incomplete");
  expect(runStatus(exampleRun("sync-emails", { ...exampleEmailsResult, unplaced: [] }))).toBe("ok");
  expect(runStatus(exampleFailedRun("sync-emails", "boom", {}))).toBe("failed");
});

it("colours a run by how it ended: green done or applied, amber held or stopped short, red failed, none otherwise", () => {
  expect(runTone(exampleRun("check-mps", { problems: [] }))).toBe("green");
  expect(runTone(exampleAppliedSync)).toBe("green");
  expect(runTone(exampleHeldSync)).toBe("amber");
  expect(runTone(exampleRun("import-luma", { ...exampleLumaResult, stoppedBy: "time" }))).toBe("amber");
  expect(runTone(exampleRun("import-luma", exampleLumaResult))).toBe("green");
  // The contacts still being read leaves work for later too.
  expect(runTone(exampleRun("import-luma", { ...exampleLumaResult, contactsPassGoing: true }))).toBe("amber");
  expect(runTone(exampleFailedRun("check-mps", "boom", {}))).toBe("red");
  expect(runTone(exampleRun("import-luma", exampleLumaResult, { status: "unchanged" }))).toBeUndefined();
  expect(runTone(undefined)).toBeUndefined();
});
