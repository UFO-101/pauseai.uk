import { describe, expect, it } from "vitest";
import {
  exampleFailedRun,
  exampleGmailResult,
  exampleLumaResult,
  exampleMembersResult,
  exampleRun,
} from "@/app/(staff)/staff/_components/RunList.examples";
import { exampleOldLettersResult } from "@/app/(staff)/staff/_components/CampaignPages.examples";
import type { AnyImportRun } from "./import-runs";
import { runLog, runShape } from "./run-log";

const AT = "2026-11-03T12:00:00Z";
const routine = { ...exampleOldLettersResult, finished: false, unmatched: [], unreadable: [], formTexts: 0 };
const letters = (id: number, extra = {}, at = AT) =>
  exampleRun("import-old-letters", { ...routine, ...extra }, { id, at });
const quietLuma = (id: number, at = AT) =>
  exampleRun("import-luma", exampleLumaResult, { id, at, status: "unchanged" });
const shapes = (entries: ReturnType<typeof runLog>) => entries.map((e) => [e.shape, e.runs.length]);

describe("how a run shows", () => {
  it("is whole for a job that runs rarely, whatever it did", () => {
    const check = exampleRun("check-mps", { problems: [] }, { status: "unchanged" });
    expect(runShape(check)).toBe("run");
    expect(runShape(exampleFailedRun("import-web-form-letters", "boom", {}))).toBe("run");
  });

  it("is a line when a frequent or hourly job found nothing, unless it stopped short", () => {
    expect(runShape(quietLuma(1))).toBe("quiet");
    expect(runShape(exampleRun("import-members", exampleMembersResult, { status: "unchanged" }))).toBe("quiet");
    const stopped = exampleRun(
      "import-luma",
      { ...exampleLumaResult, stoppedBy: "time" as const },
      { status: "unchanged" },
    );
    expect(runShape(stopped)).toBe("run");
  });

  it("is whole for a failure, and for an hourly job that found something", () => {
    expect(runShape(exampleFailedRun("import-luma", "boom", {}))).toBe("run");
    expect(runShape(exampleRun("import-members", exampleMembersResult, {}))).toBe("run");
  });

  it("is a row for the routine run of the import of old letters, and whole for one with something to read", () => {
    expect(runShape(letters(1))).toBe("rows");
    for (const extra of [
      { finished: true },
      { stoppedBy: "gmail" },
      { unmatched: [{ from: "a", subject: "b" }] },
      { unreadable: ["1"] },
      { formTexts: 3 },
    ]) {
      expect(runShape(letters(1, extra))).toBe("run");
    }
  });

  it("is a row for Luma's ordinary run, and whole for one that stopped short", () => {
    expect(runShape(exampleRun("import-luma", exampleLumaResult, {}))).toBe("rows");
    expect(runShape(exampleRun("import-luma", { ...exampleLumaResult, stoppedBy: "time" as const }, {}))).toBe("run");
  });

  it("is a row for an ordinary read of Gmail, and whole for one with problems or that searched again", () => {
    const read = (a: object) =>
      exampleRun("read-gmail", { accounts: [{ ...exampleGmailResult.accounts[0], ...a }] }, {});
    expect(runShape(read({ error: undefined, notUnderstood: undefined }))).toBe("rows");
    // An account it couldn't read is a problem of the run, which shows whole.
    expect(runShape(read({ error: "403" }))).toBe("rows");
    expect(
      runShape(exampleRun("read-gmail", { accounts: [] }, { problems: [{ what: "al@pauseai.uk couldn't be read" }] })),
    ).toBe("run");
    expect(runShape(read({ error: undefined, restarted: true }))).toBe("run");
  });
});

describe("a job's page", () => {
  it("has the newest whole and tinted, then rows and lines gathered, each new day headed", () => {
    const entries = runLog(
      [letters(5), letters(4), letters(3), quietLuma(2), quietLuma(1, "2026-11-02T12:00:00Z")],
      false,
    );
    expect(shapes(entries)).toEqual([
      ["run", 1],
      ["rows", 2],
      ["quiet", 1],
      ["quiet", 1],
    ]);
    expect(entries.map((e) => e.day)).toEqual(["3 Nov 2026", undefined, undefined, "2 Nov 2026"]);
    expect(entries[0]).toMatchObject({ tone: "amber", open: true });
  });

  it("keeps a frequent job's problems tinted further down, but not a rare job's or a good one", () => {
    const runs: AnyImportRun[] = [
      letters(4),
      letters(3, { stoppedBy: "gmail" }),
      exampleFailedRun("read-gmail", "boom", { id: 2 }),
      letters(1, { finished: true }),
    ];
    expect(runLog(runs, false).map((e) => e.tone)).toEqual(["amber", "amber", "red", undefined]);
    const rare = [exampleRun("check-mps", { problems: [] }, {}), exampleFailedRun("check-mps", "boom", { id: 2 })];
    expect(runLog(rare, false).map((e) => e.tone)).toEqual(["green", undefined]);
  });

  it("treats the newest as an older one while a press runs", () => {
    const [first, second] = runLog([letters(2, { stoppedBy: "gmail" }), letters(1)], true);
    expect(first).toMatchObject({ shape: "run", tone: undefined, open: undefined });
    expect(second.shape).toBe("rows");
  });

  it("folds whole runs past the newest few, and rows past the most recent", () => {
    const whole = [1, 2, 3, 4, 5, 6].map((id) => exampleRun("check-mps", { problems: [] }, { id }));
    expect(runLog(whole, false).map((e) => e.open)).toEqual([true, undefined, undefined, undefined, undefined, false]);
    const rows = Array.from({ length: 20 }, (_, id) => letters(id));
    const entries = runLog(rows, false);
    expect(shapes(entries)).toEqual([
      ["run", 1],
      ["rows", 12],
      ["rows", 7],
    ]);
    expect(entries.map((e) => e.folded)).toEqual([undefined, false, true]);
  });

  it("doesn't gather rows across a run shown whole, or of different jobs", () => {
    const luma = exampleRun("import-luma", exampleLumaResult, { id: 9 });
    const entries = runLog([letters(5), letters(4), letters(3, { finished: true }), letters(2), luma], false);
    expect(shapes(entries)).toEqual([
      ["run", 1],
      ["rows", 1],
      ["run", 1],
      ["rows", 1],
      ["rows", 1],
    ]);
  });
});
