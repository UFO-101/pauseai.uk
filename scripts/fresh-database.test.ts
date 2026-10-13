import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { defaultHost, isLocal } from "./fresh-database.mjs";

describe("isLocal", () => {
  it("accepts databases on this machine, and nothing else", () => {
    for (const url of ["postgresql://localhost/a", "postgresql://127.0.0.1:5433/a", "postgresql://[::1]/a", "postgresql:///a?host=/tmp", "postgresql://x@localhost/a?host=%2Fvar%2Frun%2Fpostgresql"]) {
      expect(isLocal(url), url).toBe(true);
    }
    for (const url of ["postgresql://u:p@ep-cool.eu-central-1.aws.neon.tech/neondb", "postgresql://localhost/a?host=db.example.org"]) {
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
