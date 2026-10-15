#!/usr/bin/env node
// Writes netlify/database/schema.sql: the whole database schema as the
// migrations leave it, for reading and for reviewing changes. A PR adding a
// migration then shows both the migration and what it does to the schema.
// netlify/database/schema.test.ts fails while the file is out of date.
//
//   npm run db:schema
//
// It applies every migration to a throwaway database (on TEST_DATABASE_URL's
// server, or the local one), dumps its schema with pg_dump, and drops it.
// Use pg_dump 18, as production and CI do: other versions word it slightly
// differently.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dropDatabase, freshDatabase } from "./fresh-database.mjs";

export const SCHEMA_FILE = fileURLToPath(new URL("../netlify/database/schema.sql", import.meta.url));

/** What schema.sql says about itself, at the top. */
export const HEADER = `-- The database schema, as the migrations in netlify/database/migrations/
-- leave it. Generated, for reference only: nothing runs this file, and
-- Netlify applies only the migrations.
--
-- Don't edit it by hand. To change the schema, add a migration, then run
--   npm run db:schema
-- and commit this file with the migration, so the PR shows both. That
-- applies every migration to a throwaway database and dumps its schema with
-- pg_dump 18. netlify/database/schema.test.ts fails while this file is out
-- of date.
`;

/** The pg_dump major version that writes schema.sql. */
export const PG_DUMP_MAJOR = 18;

/** The installed pg_dump's major version, or undefined if there's none. */
export function pgDumpMajor() {
  try {
    return Number(execFileSync("pg_dump", ["--version"], { encoding: "utf8" }).match(/(\d+)\.\d+/)?.[1]);
  } catch {
    return undefined;
  }
}

/**
 * pg_dump's output without what changes from run to run or machine to
 * machine: the version comments, and the \restrict lines with their random
 * key. Its own "PostgreSQL database dump" banner gives way to HEADER, and
 * blank lines are squeezed to keep the file tidy.
 */
export function normaliseSchema(dump) {
  return `${HEADER}\n${dump
    .replace(/^--\n-- PostgreSQL database dump\n--\n/, "")
    .split("\n")
    .filter((line) => !/^-- Dumped (from|by) /.test(line) && !/^\\(un)?restrict /.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()}\n`;
}

/** The schema every migration produces, as schema.sql holds it. */
export function currentSchema() {
  const name = `schema_${process.pid}`;
  try {
    const url = freshDatabase(name);
    return normaliseSchema(
      execFileSync("pg_dump", ["--schema-only", "--no-owner", "--no-privileges", "-d", url], { encoding: "utf8" }),
    );
  } finally {
    dropDatabase(name);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const major = pgDumpMajor();
  if (major !== PG_DUMP_MAJOR) {
    console.error(`pg_dump ${PG_DUMP_MAJOR} is needed, to match production; this is ${major ?? "not installed"}.`);
    process.exit(1);
  }
  writeFileSync(SCHEMA_FILE, currentSchema());
  console.log(`Wrote ${SCHEMA_FILE}`);
}
