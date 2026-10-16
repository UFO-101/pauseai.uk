#!/usr/bin/env node
// npm run db:migrate: applies the migrations in netlify/database/migrations/
// that the local database NETLIFY_DB_URL names hasn't had yet, in order,
// each in its own transaction. Reads NETLIFY_DB_URL from .env.local, the
// way `npm run dev` does. Netlify applies migrations itself on deploy, so
// this is only for a database on this machine, and refuses any other.
//
// Which migrations a database has had is kept in its schema_migrations
// table, which this script and db:reset keep up to date. A database made
// before that table existed has no record, so say where it's up to once:
//
//   npm run db:migrate -- --applied-up-to 0011
//
// records 0001 to 0011 as applied, then applies the rest.
import { execFileSync } from "node:child_process";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import { isLocal, migrationFiles } from "./fresh-database.mjs";

const LEDGER = "schema_migrations";

function psql(url, ...args) {
  return execFileSync("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", url, ...args], {
    stdio: ["ignore", "pipe", "inherit"],
    encoding: "utf8",
    env: { ...process.env, PGOPTIONS: "-c client_min_messages=warning" },
  });
}

/** A migration's name, as the ledger records it: "0012_controlai_imports". */
export function migrationName(file) {
  return basename(file).replace(/\.sql$/, "");
}

/**
 * The migrations still to apply, from the files in order and the names the
 * ledger has. With `appliedUpTo`, a prefix such as "0011", everything up to
 * and including it counts as applied too (the one-off for a database with
 * no ledger). A ledger name with no file is an error: the database is ahead
 * of this checkout, or a migration was renamed.
 */
export function pendingMigrations(files, applied, appliedUpTo) {
  const names = files.map(migrationName);
  for (const name of applied) {
    if (!names.includes(name))
      throw new Error(`The database has had ${name}, which isn't in netlify/database/migrations/`);
  }
  return files.filter((file) => {
    const name = migrationName(file);
    if (applied.includes(name)) return false;
    return appliedUpTo === undefined || name.slice(0, appliedUpTo.length) > appliedUpTo;
  });
}

/** Whether the database has the ledger table. */
function hasLedger(url) {
  return psql(url, "-At", "-c", `SELECT to_regclass('${LEDGER}') IS NOT NULL`).trim() === "t";
}

function makeLedger(url) {
  psql(
    url,
    "-c",
    `CREATE TABLE IF NOT EXISTS ${LEDGER} (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`,
  );
}

function appliedMigrations(url) {
  return psql(url, "-At", "-c", `SELECT name FROM ${LEDGER} ORDER BY name`).split("\n").filter(Boolean);
}

const insert = (name) => `INSERT INTO ${LEDGER} (name) VALUES ('${name}') ON CONFLICT DO NOTHING`;

/** Records `files` as applied without applying them: for a database that already has them. */
export function recordApplied(url, files) {
  makeLedger(url);
  if (files.length) psql(url, "-c", files.map((file) => insert(migrationName(file))).join("; "));
}

/**
 * Applies what the database hasn't had, each file and its ledger row in one
 * transaction, stopping at the first failure. Returns the names applied.
 */
export function migrate(url, { appliedUpTo } = {}) {
  if (!isLocal(url)) {
    throw new Error(
      `NETLIFY_DB_URL points at another machine (${new URL(url).hostname}). db:migrate only touches databases on this one.`,
    );
  }
  const files = migrationFiles();
  if (!hasLedger(url)) {
    if (appliedUpTo === undefined) {
      throw new Error(
        `This database has no record of which migrations it has had (no ${LEDGER} table). If it was made before db:migrate existed, say where it's up to, once:\n` +
          `  npm run db:migrate -- --applied-up-to ${migrationName(files.at(-2) ?? files[0]).slice(0, 4)}\n` +
          `Or make it afresh with npm run db:reset, which wipes it.`,
      );
    }
    recordApplied(
      url,
      files.filter((file) => migrationName(file).slice(0, appliedUpTo.length) <= appliedUpTo),
    );
  }
  const pending = pendingMigrations(files, appliedMigrations(url), appliedUpTo);
  for (const file of pending) {
    const name = migrationName(file);
    console.log(`Applying ${name}`);
    psql(url, "-1", "-f", file, "-c", insert(name));
  }
  return pending.map(migrationName);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const nextEnv = await import("@next/env");
  nextEnv.default.loadEnvConfig(process.cwd(), true);
  const url = process.env.NETLIFY_DB_URL;
  if (!url) {
    console.error("Set NETLIFY_DB_URL in .env.local first: copy .env.example to .env.local and edit it.");
    process.exit(1);
  }
  const at = process.argv.indexOf("--applied-up-to");
  const appliedUpTo = at >= 0 ? process.argv[at + 1] : undefined;
  if (at >= 0 && !/^\d+$/.test(appliedUpTo ?? "")) {
    console.error("--applied-up-to needs a migration number, such as 0011.");
    process.exit(1);
  }
  try {
    const applied = migrate(url, { appliedUpTo });
    console.log(
      applied.length ? `Applied ${applied.length} migration${applied.length === 1 ? "" : "s"}.` : "Nothing to apply.",
    );
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
