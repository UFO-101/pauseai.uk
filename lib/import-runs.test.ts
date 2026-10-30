import { expect, it } from "vitest";
import { asList, IMPORT_JOBS, importPath, isImportJob, jobBySlug, runStatus, runTone } from "./import-runs";
import {
  exampleAppliedSync,
  exampleEmailsResult,
  exampleFailedRun,
  exampleDisconnectedGmail,
  exampleGmailResult,
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
  const placesFailed = { postcodes: 0, towns: 0, failed: true };
  expect(runStatus(exampleRun("import-luma", { ...exampleLumaResult, places: placesFailed }))).toBe("incomplete");
  expect(
    runStatus(exampleRun("import-luma", { ...exampleLumaResult, places: { ...placesFailed, failed: false } })),
  ).toBe("ok");
  expect(runStatus(exampleRun("import-luma", exampleLumaResult))).toBe("ok");
  expect(runStatus(exampleFailedRun("import-luma", "boom", {}))).toBe("failed");
  expect(runStatus(exampleHeldSync)).toBe("held");
});

it("says an Emails sync that held emails back is incomplete, but not one that held none, or failed", () => {
  expect(runStatus(exampleRun("sync-emails", exampleEmailsResult))).toBe("incomplete");
  expect(runStatus(exampleRun("sync-emails", { ...exampleEmailsResult, unplaced: [] }))).toBe("ok");
  expect(runStatus(exampleFailedRun("sync-emails", "boom", {}))).toBe("failed");
});

it("says a Gmail read that couldn't read an account is incomplete, but not one that read them all, or failed", () => {
  expect(runStatus(exampleRun("read-gmail", exampleGmailResult))).toBe("incomplete");
  // One it had to disconnect isn't read again, so the read failed, whatever else it read.
  const disconnected = { accounts: [...exampleGmailResult.accounts, exampleDisconnectedGmail] };
  expect(runStatus(exampleRun("read-gmail", disconnected))).toBe("failed");
  expect(runTone(exampleRun("read-gmail", disconnected))).toBe("red");
  expect(runTone(exampleRun("read-gmail", exampleGmailResult))).toBe("amber");
  expect(runStatus(exampleRun("read-gmail", { accounts: exampleGmailResult.accounts.slice(0, 1) }))).toBe("ok");
  expect(runStatus(exampleFailedRun("read-gmail", "boom", {}))).toBe("failed");
});

it("colours a run by how it ended: green done, applied or unchanged, amber held or stopped short, red failed, none otherwise", () => {
  expect(runTone(exampleRun("check-mps", { problems: [] }))).toBe("green");
  expect(runTone(exampleAppliedSync)).toBe("green");
  expect(runTone(exampleHeldSync)).toBe("amber");
  expect(runTone(exampleRun("import-luma", { ...exampleLumaResult, stoppedBy: "time" }))).toBe("amber");
  expect(runTone(exampleRun("import-luma", exampleLumaResult))).toBe("green");
  // postcodes.io failing leaves work for later too.
  expect(
    runTone(exampleRun("import-luma", { ...exampleLumaResult, places: { postcodes: 0, towns: 0, failed: true } })),
  ).toBe("amber");
  expect(runTone(exampleFailedRun("check-mps", "boom", {}))).toBe("red");
  expect(runTone(exampleRun("import-luma", exampleLumaResult, { status: "unchanged" }))).toBe("green");
  expect(runTone(exampleRun("check-mps", { problems: [] }, { status: "discarded" }))).toBeUndefined();
  expect(runTone(undefined)).toBeUndefined();
});
