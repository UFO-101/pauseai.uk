import { expect, it } from "vitest";
import { addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query } from "./db";
import { ONE_OFF_RUNS, tidyLogs } from "./log-retention";

/** Adds a run of `job`, `age` ago, ok unless `status` says. Returns its ID. */
async function run(job: string, age: string, status = "ok"): Promise<number> {
  const [row] = await query<{ id: number }>(
    `INSERT INTO import_runs (job, at, status) VALUES ($1, now() - $2::interval, $3) RETURNING id::int AS id`,
    [job, age, status],
  );
  return row.id;
}

/** Adds an audit log entry, `age` ago. Returns its ID. */
async function entry(action: string, details: object, age: string): Promise<number> {
  const [row] = await query<{ id: number }>(
    `INSERT INTO audit_log (actor, action, details, at) VALUES ('jo@pauseai.uk', $1, $2, now() - $3::interval) RETURNING id::int AS id`,
    [action, details, age],
  );
  return row.id;
}

const ids = async (table: string) =>
  (await query<{ id: number }>(`SELECT id::int AS id FROM ${table} ORDER BY id`)).map((r) => r.id);

describeWithDatabase("tidying the logs", () => {
  useTestDatabase();

  it("keeps an hourly job's runs a week, a nightly job's a month, and a one-off job's last 50", async () => {
    await query("DELETE FROM import_runs");
    await run("import-luma", "8 days");
    const hourlyNew = await run("import-luma", "6 days");
    await run("check-mps", "32 days");
    const nightlyNew = await run("check-mps", "20 days");
    const oneOff = [];
    for (let i = ONE_OFF_RUNS; i >= 0; i--) oneOff.push(await run("import-web-form-letters", `${i} days`));
    expect(await tidyLogs()).toEqual({ importRuns: 3, auditEntries: 0 });
    expect(await ids("import_runs")).toEqual([hourlyNew, nightlyNew, ...oneOff.slice(1)]);
  });

  it("keeps each job's newest run however old, and a held sync until it's decided", async () => {
    await query("DELETE FROM import_runs");
    const held = await run("sync-politicians", "60 days", "held");
    await run("sync-politicians", "50 days", "applied");
    const newest = await run("sync-politicians", "40 days", "unchanged");
    const onlyRun = await run("import-members", "90 days");
    expect(await tidyLogs()).toEqual({ importRuns: 1, auditEntries: 0 });
    expect(await ids("import_runs")).toEqual([held, newest, onlyRun]);
  });

  it("keeps the audit log a month, but a politician's history while they're here", async () => {
    const polly = await addTestPolitician();
    const [{ email }] = await query<{ email: string }>(
      "SELECT lower(email) AS email FROM notable_people WHERE id = $1",
      [polly],
    );
    await query("DELETE FROM audit_log");
    const kept = [
      await entry("view supporter", { id: 1 }, "20 days"),
      await entry("add politician", { id: polly }, "90 days"),
      await entry("edit politician", { id: polly }, "90 days"),
      await entry("set status", { politicianId: polly }, "90 days"),
      await entry("block address", { address: email }, "90 days"),
      await entry("unblock address", { address: email, note: "Fixed" }, "90 days"),
    ];
    await entry("view supporter", { id: 1 }, "40 days");
    await entry("erase supporter", { id: 1 }, "40 days");
    await entry("block address", { address: "jane@example.com" }, "40 days");
    await entry("remove politician", { id: 999 }, "40 days");
    await entry("set status", { politicianId: 999 }, "40 days");
    expect(await tidyLogs()).toEqual({ importRuns: 0, auditEntries: 5 });
    expect(await ids("audit_log")).toEqual(kept);
  });
});
