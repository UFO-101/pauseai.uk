import { expect, it } from "vitest";
import { asList, isImportJob } from "./import-runs";

it("knows the jobs", () => {
  expect(isImportJob("sync-mps")).toBe(true);
  expect(isImportJob("")).toBe(false);
  expect(isImportJob("sync-peers")).toBe(false);
});

it("lists a job's newest run, or none", () => {
  expect(asList("run")).toEqual(["run"]);
  expect(asList(undefined)).toEqual([]);
});
