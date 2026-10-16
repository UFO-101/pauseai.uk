import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  copyDatabase,
  databaseNames,
  defaultHost,
  dropDatabase,
  freshDatabase,
  isLocal,
  runSql,
  testServerUrl,
} from "./fresh-database.mjs";

describe("isLocal", () => {
  it("accepts databases on this machine, and nothing else", () => {
    for (const url of [
      "postgresql://localhost/a",
      "postgresql://127.0.0.1:5433/a",
      "postgresql://[::1]/a",
      "postgresql:///a?host=/tmp",
      "postgresql://x@localhost/a?host=%2Fvar%2Frun%2Fpostgresql",
    ]) {
      expect(isLocal(url), url).toBe(true);
    }
    for (const url of [
      "postgresql://u:p@ep-cool.eu-central-1.aws.neon.tech/neondb",
      "postgresql://localhost/a?host=db.example.org",
    ]) {
      expect(isLocal(url), url).toBe(false);
    }
  });
});

describe("defaultHost", () => {
  it("finds the first directory with the server's socket, or falls back to localhost", () => {
    const linux = mkdtempSync(join(tmpdir(), "pg-"));
    const mac = mkdtempSync(join(tmpdir(), "pg-"));
    try {
      writeFileSync(join(mac, ".s.PGSQL.5432"), "");
      expect(defaultHost("5432", [linux, mac])).toBe(mac);
      expect(defaultHost("5433", [linux, mac])).toBe("localhost");
    } finally {
      rmSync(linux, { recursive: true });
      rmSync(mac, { recursive: true });
    }
  });
});

describe("testServerUrl", () => {
  it("prefers the environment, then .env.local, reading only that line", () => {
    const dir = mkdtempSync(join(tmpdir(), "env-"));
    const file = join(dir, ".env.local");
    try {
      writeFileSync(
        file,
        'DATA_FIXTURES=1\n# TEST_DATABASE_URL=commented\n TEST_DATABASE_URL = "postgresql://postgres:postgres@localhost:5433/postgres" \n',
      );
      expect(testServerUrl({ TEST_DATABASE_URL: "postgresql://env/x" }, file)).toBe("postgresql://env/x");
      expect(testServerUrl({}, file)).toBe("postgresql://postgres:postgres@localhost:5433/postgres");
      writeFileSync(file, "DATA_FIXTURES=1\n");
      expect(testServerUrl({}, file)).toBeUndefined();
      expect(testServerUrl({}, join(dir, "missing"))).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});

describe.skipIf(process.env.NETLIFY === "true")("copying a database", () => {
  const template = `test_${process.pid}_template`;
  const copy = `test_${process.pid}_copy`;

  it("copies a template, runs SQL in the copy, lists and drops them, and refuses bad names", () => {
    try {
      freshDatabase(template);
      runSql(template, "INSERT INTO audit_log (actor, action) VALUES ('a', 'kept')");
      copyDatabase(copy, template);
      expect(runSql(copy, "SELECT actor, action FROM audit_log")).toEqual(["a\tkept"]);
      expect(runSql(copy, "SELECT 1 WHERE false")).toEqual([]);
      expect(databaseNames(`test_${process.pid}_`)).toEqual([copy, template]);
      expect(() => copyDatabase("bad name", template)).toThrow("Bad database name: bad name");
      expect(() => runSql("x;drop", "SELECT 1")).toThrow("Bad database name");
      expect(() => databaseNames("x'")).toThrow("Bad database name");
    } finally {
      dropDatabase(copy);
      dropDatabase(template);
    }
    expect(databaseNames(`test_${process.pid}_`)).toEqual([]);
  });
});
