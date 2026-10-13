#!/usr/bin/env node
// Makes a fresh, empty Postgres database and applies the migrations in
// netlify/database/migrations/ in order, with psql, the way Netlify does.
// For tests and local development only: Netlify applies them in production.
//
//   node scripts/fresh-database.mjs <name>   prints the new database's URL
//   ... --test-mp <email>                    and adds the test MP, with that inbox
//
// Connects with the usual PG* variables. Without PGHOST it uses the Unix
// socket at /var/run/postgresql (Debian and Ubuntu's default).
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { userInfo } from "node:os";
import { fileURLToPath } from "node:url";

const MIGRATIONS = fileURLToPath(new URL("../netlify/database/migrations/", import.meta.url));

/** The URL of database `name` on the configured server. */
export function databaseUrl(name) {
  const user = process.env.PGUSER ?? userInfo().username;
  const password = process.env.PGPASSWORD ? `:${encodeURIComponent(process.env.PGPASSWORD)}` : "";
  const host = process.env.PGHOST ?? "/var/run/postgresql";
  const port = process.env.PGPORT ?? "5432";
  return `postgresql://${encodeURIComponent(user)}${password}@localhost/${name}?host=${encodeURIComponent(host)}&port=${port}`;
}

function psql(url, ...args) {
  execFileSync("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", url, ...args], {
    stdio: ["ignore", "ignore", "inherit"],
    env: { ...process.env, PGOPTIONS: "-c client_min_messages=warning" },
  });
}

/** Migration files in the order Netlify applies them: by their number. */
export function migrationFiles() {
  return readdirSync(MIGRATIONS)
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
    .map((file) => join(MIGRATIONS, file));
}

export function dropDatabase(name) {
  psql(databaseUrl("postgres"), "-c", `DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
}

/**
 * `singleTransaction` wraps each file in a transaction, as Netlify may: the
 * migrations must work either way.
 */
export function freshDatabase(name, { singleTransaction = false } = {}) {
  if (!/^[a-z0-9_]+$/.test(name)) throw new Error(`Bad database name: ${name}`);
  dropDatabase(name);
  psql(databaseUrl("postgres"), "-c", `CREATE DATABASE "${name}"`);
  const url = databaseUrl(name);
  for (const file of migrationFiles()) psql(url, ...(singleTransaction ? ["-1"] : []), "-f", file);
  return url;
}

/**
 * Adds just Testy McTestface MP (postcode ZZ99ZZ), as the nightly sync
 * would, for a database that needs no real MPs.
 */
export function addTestMp(url, email) {
  // A SQL string literal: psql -c doesn't substitute variables.
  const literal = `'${String(email).replace(/'/g, "''")}'`;
  psql(url, "-c",
    `INSERT INTO politicians (house, name, salutation, constituency, email, is_test) VALUES ('commons', 'Testy McTestface MP', 'Mr McTestface', 'Testshire', ${literal}, true)`);
}

//   node scripts/fresh-database.mjs <name> [--test-mp <email>]
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const url = freshDatabase(process.argv[2] ?? "pauseai_dev");
  const testMp = process.argv.indexOf("--test-mp");
  if (testMp !== -1) addTestMp(url, process.argv[testMp + 1]);
  console.log(url);
}
