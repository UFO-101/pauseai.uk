import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query } from "./db";
import { migrationNames, migrationsBehindMessage } from "./migrations-check";

describe("migrationNames", () => {
  it("lists the migration files in order, by name, ignoring anything else", () => {
    const dir = mkdtempSync(join(tmpdir(), "migrations-"));
    try {
      for (const file of ["0002_b.sql", "0001_a.sql", "notes.md", "draft_c.sql"]) writeFileSync(join(dir, file), "");
      expect(migrationNames(dir)).toEqual(["0001_a", "0002_b"]);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it("reads the repo's migrations by default", () => {
    expect(migrationNames()[0]).toBe("0001_politicians_and_staff");
  });
});

describeWithDatabase("migrationsBehindMessage", () => {
  useTestDatabase();
  const db = { query: (text: string) => query(text).then((rows) => ({ rows })) } as never;

  it("says to record where the database is up to when it has no ledger", async () => {
    expect(await migrationsBehindMessage(db, ["0001_a", "0012_b"])).toContain("--applied-up-to 0012");
    expect(await migrationsBehindMessage(db, [])).toContain("--applied-up-to 0001");
  });

  it("names the migrations the ledger lacks, or nothing when it has them all", async () => {
    await query(
      "CREATE TABLE schema_migrations (name text PRIMARY KEY); INSERT INTO schema_migrations VALUES ('0001_a')",
    );
    expect(await migrationsBehindMessage(db, ["0001_a", "0002_b", "0003_c"])).toBe(
      "This database hasn't had 0002_b, 0003_c. Run: npm run db:migrate",
    );
    expect(await migrationsBehindMessage(db, ["0001_a"])).toBeUndefined();
  });
});
