import { afterEach, describe, expect, it, vi } from "vitest";
import { closeDb, query, transaction } from "./db";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";

describeWithDatabase("the database", () => {
  useTestDatabase();

  it("runs a query with parameters", async () => {
    expect(await query<{ sum: number }>("SELECT $1::int + $2::int AS sum", [1, 2])).toEqual([{ sum: 3 }]);
  });

  it("commits a transaction that finishes", async () => {
    await transaction((db) => query("INSERT INTO audit_log (actor, action) VALUES ('a', 'kept')", [], db));
    expect(await query("SELECT action FROM audit_log")).toEqual([{ action: "kept" }]);
  });

  it("rolls back a transaction that throws", async () => {
    await expect(
      transaction(async (db) => {
        await query("INSERT INTO audit_log (actor, action) VALUES ('a', 'lost')", [], db);
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(await query("SELECT action FROM audit_log")).toEqual([]);
  });

  it("can be closed and reopened", async () => {
    await closeDb();
    await closeDb();
    expect(await query("SELECT 1 AS one")).toEqual([{ one: 1 }]);
  });
});

describe("without NETLIFY_DB_URL", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("refuses to connect", async () => {
    await closeDb();
    vi.stubEnv("NETLIFY_DB_URL", "");
    await expect(query("SELECT 1")).rejects.toThrow("NETLIFY_DB_URL is not set");
  });
});
