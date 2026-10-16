#!/usr/bin/env node
// Makes a fresh, empty Postgres database and applies the migrations in
// netlify/database/migrations/ in order, with psql, the way Netlify does.
// For tests and local development only: Netlify applies them in production.
//
//   node scripts/fresh-database.mjs <name>   prints the new database's URL
//   ... --test-mp <email>                    and adds the test MPs, with that inbox
//
// Makes them on the server TEST_DATABASE_URL names, from the environment or
// .env.local: `db-test` in docker-compose.yml, say. Without it, it connects
// with the usual PG* variables, and without PGHOST it finds the local
// server's Unix socket: /var/run/postgresql on Debian and Ubuntu, /tmp on a
// Mac (Postgres.app, Homebrew), else it tries localhost.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { userInfo } from "node:os";
import { fileURLToPath } from "node:url";
import TEST_MPS from "../lib/test-mps.json" with { type: "json" };

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

/**
 * TEST_DATABASE_URL, from the environment or else from `envFile`. Only that
 * one line is read: the rest of .env.local (DATA_FIXTURES, say) is for the
 * dev server, not the tests.
 */
export function testServerUrl(env = process.env, envFile = ".env.local") {
  if (env.TEST_DATABASE_URL) return env.TEST_DATABASE_URL;
  if (!existsSync(envFile)) return undefined;
  const line = readFileSync(envFile, "utf8").match(/^\s*TEST_DATABASE_URL\s*=\s*(.+?)\s*$/m);
  return line?.[1].replace(/^(["'])(.*)\1$/, "$2") || undefined;
}

/** The URL of database `name` on the configured server. */
function databaseUrl(name) {
  const server = testServerUrl();
  if (server) {
    const url = new URL(server);
    url.pathname = `/${name}`;
    return url.toString();
  }
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
export function freshDatabase(name, { singleTransaction = false, upTo } = {}) {
  return resetDatabase(databaseUrl(name), { singleTransaction, upTo });
}

/**
 * Drops and recreates the database `url` names, on the server it names, and
 * applies the migrations: all of them, or with `upTo` ("0012"), only those
 * up to that number, for a test of what the next one does to a database
 * that's been in use. Returns `url`.
 */
export function resetDatabase(url, { singleTransaction = false, upTo } = {}) {
  const target = new URL(url);
  const name = decodeURIComponent(target.pathname.slice(1));
  if (!/^[a-z0-9_]+$/.test(name)) throw new Error(`Bad database name: ${name}`);
  // The same server, its "postgres" database, to drop and create from.
  const server = new URL(url);
  server.pathname = "/postgres";
  psql(server.toString(), "-c", `DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  psql(server.toString(), "-c", `CREATE DATABASE "${name}"`);
  for (const file of migrationFiles()) {
    if (upTo !== undefined && basename(file).slice(0, upTo.length) > upTo) break;
    psql(url, ...(singleTransaction ? ["-1"] : []), "-f", file);
  }
  return url;
}

/**
 * Adds just the test MPs (lib/test-mps.json), with their statuses, as the
 * nightly sync would, for a database that needs no real MPs.
 */
export function addTestMps(url, email) {
  // SQL string literals: psql -c doesn't substitute variables.
  const literal = (value) => `'${String(value).replace(/'/g, "''")}'`;
  const sql = TEST_MPS.map((mp) => [
    `INSERT INTO politicians (house, name, salutation, constituency, email, is_test, test_postcode) VALUES ('commons', ${[mp.name, mp.salutation, mp.constituency].map(literal).join(", ")}, ${mp.noEmail ? "NULL" : literal(email)}, true, ${literal(mp.postcode)});`,
    ...Object.entries(mp.statuses).map(
      ([campaign, status]) =>
        `INSERT INTO campaign_statuses (politician_id, campaign, status, updated_by) SELECT id, ${literal(campaign)}, ${literal(status)}, 'sync' FROM politicians WHERE test_postcode = ${literal(mp.postcode)};`,
    ),
  ]).flat();
  psql(url, "-c", sql.join("\n"));
}

//   node scripts/fresh-database.mjs <name> [--test-mp <email>]
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const url = freshDatabase(process.argv[2] ?? "pauseai_dev");
  const testMp = process.argv.indexOf("--test-mp");
  if (testMp !== -1) addTestMps(url, process.argv[testMp + 1]);
  console.log(url);
}
