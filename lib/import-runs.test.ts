import { expect, it } from "vitest";
import { isImportJob } from "./import-runs";

it("knows the jobs", () => {
  expect(isImportJob("sync-mps")).toBe(true);
  expect(isImportJob("")).toBe(false);
  expect(isImportJob("sync-peers")).toBe(false);
});
