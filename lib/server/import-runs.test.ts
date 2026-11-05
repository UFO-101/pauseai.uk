import { afterEach, expect, it, vi } from "vitest";
import { jobTitles, staffCopy } from "@/lib/content/staff-interface";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { notifications } from "@/tests/notifications";
import { query } from "./db";
import {
  currentPress,
  endPress,
  keepingFailure,
  latestRun,
  listRuns,
  recordFailure,
  recordRun,
  takePress,
} from "./import-runs";

describeWithDatabase("the import log", () => {
  useTestDatabase();
  afterEach(() => vi.unstubAllEnvs());

  it("emails the notification inbox when a job fails, once, until a run of it hasn't", async () => {
    const sent = notifications();
    await recordFailure("import-luma", "nightly", new Error("Luma is down"));
    await recordFailure("import-luma", "nightly", new Error("Luma is down"));
    await recordRun("import-luma", "nightly", "unchanged", {});
    await recordFailure("import-luma", "nightly", new Error("Luma is down again"));
    const words = staffCopy.notifications.importFailed;
    const luma = jobTitles["import-luma"];
    expect(sent.map((email) => [email.Subject, email.TextBody])).toEqual([
      [words.subject(luma), words.body(luma, "Luma is down", "https://pauseai.uk/staff/import-data/luma")],
      [words.subject(luma), words.body(luma, "Luma is down again", "https://pauseai.uk/staff/import-data/luma")],
    ]);
  });

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

  it("lets one press of a job run at a time, until it ends or is older than any can run", async () => {
    expect(await currentPress("sync-emails")).toBeUndefined();
    expect(await takePress("sync-emails", "jo@pauseai.uk")).toBe(true);
    expect(await currentPress("sync-emails")).toMatchObject({ startedBy: "jo@pauseai.uk" });
    expect(await takePress("sync-emails", "sam@pauseai.uk")).toBe(false);
    expect(await takePress("check-mps", "sam@pauseai.uk")).toBe(true);
    await endPress("sync-emails");
    expect(await takePress("sync-emails", "sam@pauseai.uk")).toBe(true);
    await query("UPDATE job_presses SET started_at = now() - interval '17 minutes' WHERE job = 'sync-emails'");
    expect(await currentPress("sync-emails")).toBeUndefined();
    expect(await takePress("sync-emails", "jo@pauseai.uk")).toBe(true);
  });
});
