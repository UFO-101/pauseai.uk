import { afterEach, describe, expect, it, vi } from "vitest";
import { closeDb, query, transaction, verifyFullUrl } from "./db";
import { describeWithDatabase, useTestDatabase, withDatabaseDown } from "@/tests/database";

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

  it("warns the dev server, once, when the database is behind on migrations", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      vi.stubEnv("NODE_ENV", "development");
      // The test database has no ledger, so it's behind.
      await closeDb();
      await query("SELECT 1");
      await vi.waitFor(() => expect(error).toHaveBeenCalledOnce());
      expect(error.mock.calls[0][0]).toContain("npm run db:migrate");
      await query("SELECT 1");
      expect(error).toHaveBeenCalledOnce();

      // Up to date: nothing to say.
      await query("CREATE TABLE schema_migrations (name text PRIMARY KEY)");
      await query("INSERT INTO schema_migrations SELECT unnest($1::text[])", [
        (await import("./migrations-check")).migrationNames(),
      ]);
      await closeDb();
      await query("SELECT 1");
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(error).toHaveBeenCalledOnce();

      // Unreachable: the check keeps quiet, and the query itself reports it.
      await withDatabaseDown(() => expect(query("SELECT 1")).rejects.toThrow());
      expect(error).toHaveBeenCalledOnce();

      // Not the dev server: no check.
      vi.stubEnv("NODE_ENV", "production");
      await query("DROP TABLE schema_migrations");
      await closeDb();
      await query("SELECT 1");
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(error).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllEnvs();
      error.mockRestore();
    }
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

describe("verifyFullUrl", () => {
  it("upgrades the modes pg 9 would weaken", () => {
    expect(verifyFullUrl("postgresql://u:p@h/db?sslmode=require")).toBe("postgresql://u:p@h/db?sslmode=verify-full");
    expect(verifyFullUrl("postgresql://h/db?a=1&sslmode=prefer&b=2")).toBe(
      "postgresql://h/db?a=1&sslmode=verify-full&b=2",
    );
    expect(verifyFullUrl("postgresql://h/db?sslmode=verify-ca")).toBe("postgresql://h/db?sslmode=verify-full");
  });

  it("leaves other URLs alone", () => {
    for (const url of [
      "postgresql://vscode@localhost/db?host=/var/run/postgresql",
      "postgresql://h/db?sslmode=disable",
      "postgresql://h/db?sslmode=verify-full",
      "postgresql://h/db?sslmode=requires",
    ]) {
      expect(verifyFullUrl(url)).toBe(url);
    }
  });
});
