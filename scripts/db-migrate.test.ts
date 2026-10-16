import { describe, expect, it } from "vitest";
import { migrationName, pendingMigrations } from "./db-migrate.mjs";

const files = ["/m/0001_first.sql", "/m/0002_second.sql", "/m/0003_third.sql"];

describe("pendingMigrations", () => {
  it("is the files the ledger doesn't have, in order", () => {
    expect(pendingMigrations(files, [])).toEqual(files);
    expect(pendingMigrations(files, ["0001_first"])).toEqual(files.slice(1));
    expect(pendingMigrations(files, ["0001_first", "0002_second", "0003_third"])).toEqual([]);
  });

  it("counts everything up to --applied-up-to as applied, for a database with no ledger", () => {
    expect(pendingMigrations(files, [], "0002")).toEqual([files[2]]);
    expect(pendingMigrations(files, [], "0003")).toEqual([]);
    expect(pendingMigrations(files, [], "0000")).toEqual(files);
  });

  it("refuses a ledger naming a migration this checkout doesn't have", () => {
    expect(() => pendingMigrations(files, ["0004_fourth"])).toThrow("0004_fourth");
  });

  it("names a migration by its file", () => {
    expect(migrationName("/m/0012_controlai_imports.sql")).toBe("0012_controlai_imports");
  });
});
