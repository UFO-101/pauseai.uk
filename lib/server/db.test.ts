import { execFileSync } from "node:child_process";
import { Pool } from "pg";
import { afterEach, describe, expect, it, vi } from "vitest";
import { closeDb, query, transaction, verifyFullUrl } from "./db";
import { describeWithDatabase, MAKES_DATABASES, useTestDatabase, withDatabaseDown } from "@/tests/database";
import { requestCookies } from "@/tests/next-headers";
import { FLOW_DATABASE_COOKIE } from "@/tests/fixture-env.mjs";
import { dropDatabase, freshDatabase, runSql } from "@/scripts/fresh-database.mjs";

// A copy of the stand-in, so one test can make cookies() throw as it does
// outside a request.
vi.mock("next/headers", async () => ({ ...(await import("@/tests/next-headers")) }));

/** Terminates the server side of `pid`'s connection, as a dropped network would. */
function terminate(pid: number) {
  execFileSync("psql", ["-X", "-q", "-d", process.env.NETLIFY_DB_URL!, "-c", `SELECT pg_terminate_backend(${pid})`]);
}

const currentDatabase = async () => (await query<{ db: string }>("SELECT current_database() AS db"))[0].db;
const pid = async () => (await query<{ pid: number }>("SELECT pg_backend_pid() AS pid"))[0].pid;

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

  it("reports a connection dropped while idle, rather than crashing", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await closeDb();
      terminate(await pid());
      await vi.waitFor(() =>
        expect(error).toHaveBeenCalledWith(expect.stringContaining("Database connection dropped")),
      );
      expect(await query("SELECT 1 AS one")).toEqual([{ one: 1 }]);
    } finally {
      error.mockRestore();
    }
  });

  describe("in a fixture build, with the storyboard's cookie", () => {
    const flow = `pauseai_sb_unit_${process.pid}`;

    afterEach(async () => {
      requestCookies.clear();
      vi.unstubAllEnvs();
      await closeDb();
    });

    it("queries the database the cookie names, and the usual one without it", async () => {
      vi.stubEnv("DATA_FIXTURES", "1");
      freshDatabase(flow);
      try {
        const usual = await currentDatabase();
        requestCookies.set(FLOW_DATABASE_COOKIE, flow);
        expect(await currentDatabase()).toBe(flow);
        // Both at once, in a transaction too.
        await transaction((db) => query("INSERT INTO audit_log (actor, action) VALUES ('a', 'flow')", [], db));
        expect(await query("SELECT action FROM audit_log")).toEqual([{ action: "flow" }]);
        requestCookies.delete(FLOW_DATABASE_COOKIE);
        expect(await currentDatabase()).toBe(usual);
        expect(await query("SELECT action FROM audit_log")).toEqual([]);
        // The flow's pool is closed once its connections have gone idle, and remade on the next query.
        requestCookies.set(FLOW_DATABASE_COOKIE, flow);
        await Promise.all([query("SELECT pg_sleep(0.05)"), query("SELECT pg_sleep(0.1)")]);
        const connections = () => runSql("postgres", `SELECT count(*) FROM pg_stat_activity WHERE datname = '${flow}'`);
        expect(Number(connections()[0])).toBeGreaterThanOrEqual(1);
        await vi.waitFor(() => expect(connections()).toEqual(["0"]), { timeout: 5000, interval: 200 });
        expect(await currentDatabase()).toBe(flow);
      } finally {
        await closeDb();
        dropDatabase(flow);
      }
      // Longer than the 5s default: it makes a database, a psql process per
      // migration, then waits up to 5s for the pool to close. On a loaded CI
      // runner, with every database test file at once, that ran out of time.
    }, 30_000);

    it("ignores a cookie naming any other database", async () => {
      vi.stubEnv("DATA_FIXTURES", "1");
      const usual = await currentDatabase();
      for (const value of ["postgres", "pauseai_sb_", "pauseai_sb_x; drop", `other_${flow}`, ""]) {
        requestCookies.set(FLOW_DATABASE_COOKIE, value);
        expect(await currentDatabase(), value).toBe(usual);
      }
    });

    it("stays quiet when the flow's database is dropped under an idle connection", MAKES_DATABASES, async () => {
      vi.stubEnv("DATA_FIXTURES", "1");
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      // The pool reports the cut-off connection with an "error" event, however long that takes.
      const emit = vi.spyOn(Pool.prototype, "emit");
      freshDatabase(flow);
      requestCookies.set(FLOW_DATABASE_COOKIE, flow);
      try {
        // The flow pool lets an idle connection go after a second, which a
        // loaded machine can take to drop the database, leaving no connection
        // to cut off. Its idle timer is a fake, so it never fires.
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        await pid();
        dropDatabase(flow);
        vi.useRealTimers();
        await vi.waitFor(() => expect(emit).toHaveBeenCalledWith("error", expect.any(Error), expect.anything()), {
          timeout: MAKES_DATABASES.timeout,
        });
        expect(error).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
        error.mockRestore();
        emit.mockRestore();
      }
    });

    it("uses the usual database outside a request, where cookies() throws", async () => {
      vi.stubEnv("DATA_FIXTURES", "1");
      const headers = await import("next/headers");
      vi.spyOn(headers, "cookies").mockRejectedValue(new Error("cookies was called outside a request scope"));
      expect(await query("SELECT 1 AS one")).toEqual([{ one: 1 }]);
    });

    it("never looks at the cookie outside a fixture build", async () => {
      vi.stubEnv("DATA_FIXTURES", "0");
      const headers = await import("next/headers");
      const cookies = vi.spyOn(headers, "cookies");
      requestCookies.set(FLOW_DATABASE_COOKIE, flow);
      expect(await query("SELECT 1 AS one")).toEqual([{ one: 1 }]);
      expect(cookies).not.toHaveBeenCalled();
    });
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
