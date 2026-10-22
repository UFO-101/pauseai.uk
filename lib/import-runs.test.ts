import { expect, it } from "vitest";
import { asList, IMPORT_JOBS, importPath, isImportJob, jobBySlug } from "./import-runs";

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
