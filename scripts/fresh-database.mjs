#!/usr/bin/env node
// Makes a fresh, empty Postgres database and applies the migrations in
// netlify/database/migrations/ in order, with psql, the way Netlify does.
// For tests and local development only: Netlify applies them in production.
//
//   node scripts/fresh-database.mjs <name>   prints the new database's URL
//   ... --test-mp <email>                    and adds the test MP, with that inbox
//
// Connects with the usual PG* variables. Without PGHOST it finds the local
// server's Unix socket: /var/run/postgresql on Debian and Ubuntu, /tmp on a
// Mac (Postgres.app, Homebrew), else it tries localhost.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { userInfo } from "node:os";
import { fileURLToPath } from "node:url";

const MIGRATIONS = fileURLToPath(new URL("../netlify/database/migrations/", import.meta.url));

/** Whether a database URL points at this machine: localhost, or a Unix socket. */
export function isLocal(url) {
  const { hostname, searchParams } = new URL(url);
  const host = searchParams.get("host") ?? hostname;
  return host === "" || host.startsWith("/") || ["localhost", "127.0.0.1", "[::1]", "::1"].includes(host);
}

/** Where a local server listens when PGHOST doesn't say. */
export function defaultHost(port = process.env.PGPORT ?? "5432", places = ["/var/run/postgresql", "/tmp"]) {
  return places.find((dir) => existsSync(join(dir, `.s.PGSQL.${port}`))) ?? "localhost";
}

/** The URL of database `name` on the configured server. */
export function databaseUrl(name) {
  const user = process.env.PGUSER ?? userInfo().username;
  const password = process.env.PGPASSWORD ? `:${encodeURIComponent(process.env.PGPASSWORD)}` : "";
  const host = process.env.PGHOST ?? defaultHost();
  const port = process.env.PGPORT ?? "5432";
  return `postgresql://${encodeURIComponent(user)}${password}@localhost/${name}?host=${encodeURIComponent(host)}&port=${port}`;
}

function psql(url, ...args) {
  execFileSync("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", url, ...args], {
    stdio: ["ignore", "ignore", "inherit"],
    env: { ...process.env, PGOPTIONS: "-c client_min_messages=warning" },
  });
}

/**
 * Migration files in the order Netlify applies them: sorted as text, so
 * numbers must be zero-padded (0001, 0002, ...).
 */
export function migrationFiles() {
  return readdirSync(MIGRATIONS)
    .filter((file) => /^\d+_[a-z0-9_-]+\.sql$/.test(file))
    .sort()
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
  return resetDatabase(databaseUrl(name), { singleTransaction });
}

/**
 * Drops and recreates the database `url` names, on the server it names, and
 * applies the migrations. Returns `url`.
 */
export function resetDatabase(url, { singleTransaction = false } = {}) {
  const target = new URL(url);
  const name = decodeURIComponent(target.pathname.slice(1));
  if (!/^[a-z0-9_]+$/.test(name)) throw new Error(`Bad database name: ${name}`);
  // The same server, its "postgres" database, to drop and create from.
  const server = new URL(url);
  server.pathname = "/postgres";
  psql(server.toString(), "-c", `DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  psql(server.toString(), "-c", `CREATE DATABASE "${name}"`);
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
