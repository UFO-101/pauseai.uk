import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { backUp, run } from "./backup.ts";
import { testDatabase } from "./test-database.ts";

// A user like Netlify's read-only one: it can read the site's tables, and
// nothing in the netlify schema. Roles belong to the whole server, so it has
// a name of its own.
const READER = `backup_test_reader_${process.pid}`;

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "backup-test-"));
});
afterAll(() => rm(dir, { recursive: true, force: true }));

describe("backUp", () => {
  it("dumps the database, and counts each table in a restored copy", async () => {
    const db = await testDatabase(`
      CREATE TABLE letters (id int, created_at timestamptz);
      INSERT INTO letters VALUES (1, '2026-10-17T09:00:00Z'), (2, '2026-10-18T09:30:00Z');
      CREATE TABLE audit_log (at timestamptz);
      CREATE TABLE settings (name text);
      INSERT INTO settings VALUES ('a');
    `);
    try {
      const dumpPath = join(dir, "full.dump");
      const report = await backUp(db.url, dumpPath, { letters: "created_at", audit_log: "at", missing: "at" });
      const dump = await readFile(dumpPath);
      expect(report.bytes).toBe(dump.length);
      expect(report.sha256).toBe(createHash("sha256").update(dump).digest("hex"));
      expect(report.tables).toEqual({
        letters: { rows: 2, newest: expect.stringMatching(/^2026-10-18T/) },
        audit_log: { rows: 0, newest: null },
        settings: { rows: 1 },
      });
      expect(Date.parse(report.tables.letters.newest!)).toBe(Date.parse("2026-10-18T09:30:00Z"));
    } finally {
      await db.drop();
    }
  });

  it("reports an empty database as having no tables", async () => {
    const db = await testDatabase("SELECT 1");
    try {
      expect((await backUp(db.url, join(dir, "empty.dump"), {})).tables).toEqual({});
    } finally {
      await db.drop();
    }
  });

  it("refuses a timestamp column that isn't a plain identifier", async () => {
    await expect(backUp("postgresql:///nowhere", join(dir, "x.dump"), { letters: "at; DROP" })).rejects.toThrow(
      "Not a plain identifier: letters.at; DROP",
    );
    await expect(backUp("postgresql:///nowhere", join(dir, "x.dump"), { "a b": "at" })).rejects.toThrow(
      "Not a plain identifier",
    );
  });

  it("leaves out Netlify's own schema, which the read-only user can't read", async () => {
    const db = await testDatabase(`
      CREATE SCHEMA netlify;
      CREATE TABLE netlify.migrations (name text);
      CREATE TABLE letters (id int);
      CREATE ROLE ${READER} LOGIN;
      GRANT SELECT ON letters TO ${READER};
    `);
    try {
      const dumpPath = join(dir, "netlify.dump");
      const report = await backUp(`${db.url}?user=${READER}`, dumpPath, {});
      expect(report.tables).toEqual({ letters: { rows: 0 } });
      expect(await run("pg_restore", ["--list", dumpPath])).not.toContain("netlify");
    } finally {
      await db.drop();
      await run("psql", [db.url.replace(/\/[^/]*$/, "/postgres"), "--no-psqlrc", "--command", `DROP ROLE ${READER}`]);
    }
  });

  it("fails with pg_dump's error, without the connection string's password", async () => {
    const error = await backUp("postgresql://someone:hunter2@/no_such_database", join(dir, "x.dump"), {}).catch(
      (e: Error) => e,
    );
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/^pg_dump exited with 1: /);
    expect((error as Error).message).not.toContain("hunter2");
  });
});

describe("run", () => {
  it("resolves with the command's output", async () => {
    expect(await run("echo", ["hello"])).toBe("hello\n");
  });

  it("rejects when the command can't start", async () => {
    await expect(run("no-such-command-here", [])).rejects.toThrow(/^no-such-command-here: spawn .*ENOENT/);
  });
});
