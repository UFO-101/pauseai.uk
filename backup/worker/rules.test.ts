import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { backUp } from "../container/backup.ts";
import { testDatabase } from "../container/test-database.ts";
import { RULES, timestampColumns } from "./checks.ts";

// The rules name tables and columns in the site's schema: back up a database
// made from it, and check every rule finds what it names.
it("names tables and columns that exist in the site's schema", async () => {
  const schema = await readFile(join(import.meta.dirname, "../../netlify/database/schema.sql"), "utf8");
  const db = await testDatabase(schema);
  const dir = await mkdtemp(join(tmpdir(), "backup-rules-test-"));
  try {
    const report = await backUp(db.url, join(dir, "schema.dump"), timestampColumns(RULES));
    for (const [table, rule] of Object.entries(RULES)) {
      expect(report.tables[table], table).toBeDefined();
      if (rule.timestamp) expect(report.tables[table].newest, table).toBeNull();
    }
  } finally {
    await db.drop();
    await rm(dir, { recursive: true, force: true });
  }
});
