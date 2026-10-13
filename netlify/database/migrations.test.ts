import { describe, expect, it } from "vitest";
import { dropDatabase, freshDatabase, migrationFiles } from "@/scripts/fresh-database.mjs";
import { describeWithDatabase } from "@/tests/database";

describe("migrations", () => {
  it("are numbered once each", () => {
    const numbers = migrationFiles().map((file) => parseInt(file.split("/").pop()!, 10));
    expect(new Set(numbers).size).toBe(numbers.length);
    expect(numbers.length).toBeGreaterThan(0);
  });

  it("never create an index concurrently, which can't run in a transaction", async () => {
    const { readFileSync } = await import("node:fs");
    for (const file of migrationFiles()) expect(readFileSync(file, "utf8"), file).not.toMatch(/CONCURRENTLY/i);
  });
});

describeWithDatabase("migrations, applied", () => {
  it("work with and without a transaction around each file", () => {
    const name = `test_migrations_${process.pid}`;
    try {
      expect(() => freshDatabase(name)).not.toThrow();
      expect(() => freshDatabase(name, { singleTransaction: true })).not.toThrow();
    } finally {
      dropDatabase(name);
    }
  });
});
