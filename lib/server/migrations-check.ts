import "server-only";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { Queryable } from "./db";

// Whether a local database has had every migration in
// netlify/database/migrations/, going by the schema_migrations table that
// scripts/db-migrate.mjs and db:reset keep. Only the dev server asks
// (lib/server/db.ts): Netlify migrates its own databases on deploy, and
// keeps its own record.

const MIGRATIONS = join(process.cwd(), "netlify", "database", "migrations");

/** The migration names in the order they're applied: "0001_politicians_and_staff", ... */
export function migrationNames(dir = MIGRATIONS): string[] {
  // Not traced into the deployed server: only the dev server reads the folder, and a path Turbopack can't
  // follow would otherwise have it include the whole project.
  return readdirSync(/* turbopackIgnore: true */ dir)
    .filter((file) => /^\d+_[a-z0-9_-]+\.sql$/.test(file))
    .sort()
    .map((file) => file.replace(/\.sql$/, ""));
}

/** What to tell the developer if the database is behind, or nothing if it isn't. */
export async function migrationsBehindMessage(db: Queryable, names = migrationNames()): Promise<string | undefined> {
  const {
    rows: [{ ledger }],
  } = await db.query<{ ledger: boolean }>("SELECT to_regclass('schema_migrations') IS NOT NULL AS ledger");
  if (!ledger) {
    const last = names.at(-1)?.slice(0, 4) ?? "0001";
    return `This database has no record of which migrations it has had. Run: npm run db:migrate -- --applied-up-to ${last}  (or npm run db:reset, which wipes it)`;
  }
  const { rows } = await db.query<{ name: string }>("SELECT name FROM schema_migrations");
  const applied = new Set(rows.map((row) => row.name));
  const pending = names.filter((name) => !applied.has(name));
  if (pending.length === 0) return undefined;
  return `This database hasn't had ${pending.join(", ")}. Run: npm run db:migrate`;
}
