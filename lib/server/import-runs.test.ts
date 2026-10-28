import { expect, it } from "vitest";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { keepingFailure, latestRun, listRuns, recordFailure, recordRun } from "./import-runs";

describeWithDatabase("the import log", () => {
  useTestDatabase();

  it("keeps each run with who started it and what it found, newest first, a job at a time", async () => {
    const id = await recordRun("check-mps", "nightly", "ok", { problems: [] });
    await recordRun("sync-politicians", "jo@pauseai.uk", "unchanged", { changes: {} });
    await recordFailure("sync-politicians", "nightly", new Error("Airtable request failed with status 422"));
    await recordFailure("sync-politicians", "nightly", "not an Error");

    expect(await listRuns("sync-politicians")).toMatchObject([
      {
        job: "sync-politicians",
        status: "failed",
        startedBy: "nightly",
        error: "not an Error",
        result: {},
        decidedBy: null,
      },
      { status: "failed", startedBy: "nightly", error: "Airtable request failed with status 422", result: {} },
      { status: "unchanged", startedBy: "jo@pauseai.uk", error: null, result: { changes: {} } },
    ]);
    expect(await listRuns("check-mps")).toMatchObject([{ id, status: "ok", result: { problems: [] } }]);
    expect(await latestRun("check-mps")).toMatchObject({ id });
    expect(await latestRun("sync-politicians")).toMatchObject({ error: "not an Error" });
    expect(await latestRun("import-controlai")).toBeUndefined();
  });

  it("keepingFailure keeps a failure and throws it on, and leaves success to the work", async () => {
    expect(await keepingFailure("check-mps", "nightly", async () => 42)).toBe(42);
    expect(await listRuns("check-mps")).toEqual([]);
    await expect(
      keepingFailure("check-mps", "nightly", async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(await listRuns("check-mps")).toMatchObject([{ status: "failed", error: "boom" }]);
  });
});
