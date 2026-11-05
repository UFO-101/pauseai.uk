import { afterEach, expect, it, vi } from "vitest";
import { jobTitles, staffCopy } from "@/lib/content/staff-interface";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { notifications } from "@/tests/notifications";
import { query } from "./db";
import { problem } from "./problems";
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

  it("emails the notification inbox when a job fails, once, until a run of it has worked", async () => {
    const sent = notifications();
    const fail = (why: string) =>
      keepingFailure("import-luma", "nightly", async () => {
        throw new Error(why);
      }).catch(() => {});
    await fail("Luma is down");
    await fail("Luma is still down");
    await keepingFailure("import-luma", "nightly", () => recordRun("import-luma", "nightly", "unchanged", {}));
    await fail("Luma is down again");
    const words = staffCopy.notifications.importFailed;
    const luma = jobTitles["import-luma"];
    expect(sent.map((email) => [email.Subject, email.TextBody])).toEqual([
      [words.subject(luma), words.body(luma, "Luma is down", "https://pauseai.uk/staff/import-data/luma")],
      [words.subject(luma), words.body(luma, "Luma is down again", "https://pauseai.uk/staff/import-data/luma")],
    ]);
  });

  it("keeps what a run reports as problems on it, and emails once for each new one, not for the same again", async () => {
    const sent = notifications();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const run = (whats: string[], after: string[] = []) =>
      keepingFailure("import-luma", "nightly", async () => {
        for (const what of whats) problem(what, new Error("503"));
        const id = await recordRun("import-luma", "nightly", "ok", { events: 1 });
        // Reported after the run was kept, as a job's last steps may.
        for (const what of after) problem(what);
        return id;
      });
    await keepingFailure("import-luma", "nightly", async () => {
      // One with an alert of its own: kept, but not emailed about again.
      problem("Google disconnected an account", undefined, { told: true });
      await recordRun("import-luma", "nightly", "ok", {});
    });
    const first = await run(["An event wouldn't load"], ["Postcodes.io failed"]);
    await run(["An event wouldn't load", "Postcodes.io failed"]);
    await run(["An event wouldn't load", "A host wouldn't load"]);
    await run([]);
    await run(["An event wouldn't load"]);
    expect(await listRuns("import-luma")).toMatchObject([
      { problems: [{ what: "An event wouldn't load", error: "503" }] },
      { problems: [] },
      { problems: [{ what: "An event wouldn't load" }, { what: "A host wouldn't load" }] },
      { problems: [{ what: "An event wouldn't load" }, { what: "Postcodes.io failed" }] },
      { id: first, problems: [{ what: "An event wouldn't load", error: "503" }, { what: "Postcodes.io failed" }] },
      { problems: [{ what: "Google disconnected an account", told: true }] },
    ]);
    expect(await latestRun("import-luma")).toMatchObject({
      status: "ok",
      problems: [{ what: "An event wouldn't load" }],
    });
    const words = staffCopy.notifications.importProblems;
    const luma = jobTitles["import-luma"];
    const link = "https://pauseai.uk/staff/import-data/luma";
    expect(sent.map((email) => [email.Subject, email.TextBody])).toEqual([
      [words.subject(luma), words.body(luma, ["- An event wouldn't load: 503", "- Postcodes.io failed"], link)],
      [words.subject(luma), words.body(luma, ["- An event wouldn't load: 503", "- A host wouldn't load: 503"], link)],
      [words.subject(luma), words.body(luma, ["- An event wouldn't load: 503"], link)],
    ]);
  });

  it("emails about a failure after a run with problems, and about problems after a failure, as each is new", async () => {
    const sent = notifications();
    vi.spyOn(console, "error").mockImplementation(() => {});
    await keepingFailure("check-mps", "nightly", async () => {
      problem("Parliament was slow");
      await recordRun("check-mps", "nightly", "ok", { problems: [] });
    });
    await keepingFailure("check-mps", "nightly", async () => {
      problem("Parliament was slow");
      throw new Error("then it went away");
    }).catch(() => {});
    await keepingFailure("check-mps", "nightly", async () => {
      problem("Parliament was slow");
      await recordRun("check-mps", "nightly", "ok", { problems: [] });
    });
    expect(await listRuns("check-mps")).toMatchObject([
      { status: "ok", problems: [{ what: "Parliament was slow" }] },
      { status: "failed", error: "then it went away", problems: [{ what: "Parliament was slow" }] },
      { status: "ok", problems: [{ what: "Parliament was slow" }] },
    ]);
    expect(sent.map((email) => email.Subject)).toEqual([
      staffCopy.notifications.importProblems.subject(jobTitles["check-mps"]),
      staffCopy.notifications.importFailed.subject(jobTitles["check-mps"]),
      staffCopy.notifications.importProblems.subject(jobTitles["check-mps"]),
    ]);
  });

  it("records nothing, and emails nobody, for work that keeps no run", async () => {
    const sent = notifications();
    expect(await keepingFailure("check-mps", "nightly", async () => 42)).toBe(42);
    expect(await listRuns("check-mps")).toEqual([]);
    expect(sent).toEqual([]);
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
    await expect(
      keepingFailure("check-mps", "nightly", async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(await listRuns("check-mps")).toMatchObject([{ status: "failed", error: "boom", problems: [] }]);
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
