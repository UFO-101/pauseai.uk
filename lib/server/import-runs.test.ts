import { expect, it } from "vitest";
import { describeWithDatabase, useDatabaseUpTo, useTestDatabase } from "@/tests/database";
import { migrate } from "@/scripts/db-migrate.mjs";
import { query } from "./db";
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

describeWithDatabase("migration 0013_import_runs", () => {
  const db = useDatabaseUpTo("0012");

  it("copies the old tables' runs into the log, keeping only a held sync's MP list, then drops them", async () => {
    const mps = JSON.stringify([{ airtableId: "rec1", name: "MP 1" }]);
    const changes = JSON.stringify({ added: [{ airtableId: "rec1", name: "MP 1" }], removed: [], changed: [] });
    await query(
      `INSERT INTO mp_syncs (at, status, changes, mps, decided_by, decided_at) VALUES
       ('2026-10-14T00:00:00Z', 'applied', $1, $2, NULL, NULL),
       ('2026-10-15T00:00:00Z', 'held', $1, $2, NULL, NULL),
       ('2026-10-13T00:00:00Z', 'discarded', $1, $2, 'jo@pauseai.uk', '2026-10-13T09:00:00Z')`,
      [changes, mps],
    );
    await query(`INSERT INTO mp_checks (at, problems) VALUES ('2026-10-14T01:00:00Z', '[{"kind":"extra"}]')`);
    await query(
      `INSERT INTO controlai_imports (at, result) VALUES
       ('2026-10-15T02:00:00Z', '{"ok":true,"pdfUrl":"u","signatories":6,"matched":5,"added":1,"removed":0,"problems":[]}'),
       ('2026-10-16T02:00:00Z', '{"ok":false,"error":"No PDF linked"}')`,
    );

    expect(migrate(db.url, { appliedUpTo: "0012" })[0]).toBe("0013_import_runs");

    expect(
      await query(
        `SELECT at, job, started_by AS "startedBy", status, error, result, decided_by AS "decidedBy", decided_at AS "decidedAt"
         FROM import_runs ORDER BY at`,
      ),
    ).toEqual([
      {
        at: new Date("2026-10-13T00:00:00Z"),
        job: "sync-politicians",
        startedBy: null,
        status: "discarded",
        error: null,
        result: { changes: JSON.parse(changes) },
        decidedBy: "jo@pauseai.uk",
        decidedAt: new Date("2026-10-13T09:00:00Z"),
      },
      expect.objectContaining({ job: "sync-politicians", status: "applied", result: { changes: JSON.parse(changes) } }),
      expect.objectContaining({ job: "check-mps", status: "ok", result: { problems: [{ kind: "extra" }] } }),
      // Held, then discarded by 0036_politician_imports, as only MPs were read.
      expect.objectContaining({
        job: "sync-politicians",
        status: "discarded",
        decidedBy: "sync",
        result: { changes: JSON.parse(changes), mps: JSON.parse(mps) },
      }),
      expect.objectContaining({
        job: "import-controlai",
        status: "ok",
        error: null,
        result: { pdfUrl: "u", signatories: 6, matched: 5, added: 1, removed: 0, problems: [] },
      }),
      expect.objectContaining({ job: "import-controlai", status: "failed", error: "No PDF linked", result: {} }),
    ]);
    expect(
      await query(
        "SELECT to_regclass('mp_syncs') AS t, to_regclass('mp_checks') AS u, to_regclass('controlai_imports') AS v",
      ),
    ).toEqual([{ t: null, u: null, v: null }]);
  });
});
