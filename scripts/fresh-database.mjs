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
import { createCipheriv, randomBytes } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { userInfo } from "node:os";

// From the repo root, where every script and test runs. (Not import.meta:
// Playwright's loader, which the storyboard's fixtures import this through,
// compiles to CommonJS.)
const MIGRATIONS = join(process.cwd(), "netlify", "database", "migrations");
const TEST_MPS = JSON.parse(readFileSync(join(process.cwd(), "lib", "test-mps.json"), "utf8"));
const FIXTURE_DATA = join(process.cwd(), "tests", "fixtures", "staff-data.sql");

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
export function databaseUrl(name) {
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

/** Runs psql against `url`, and returns what it printed. */
function psql(url, ...args) {
  return execFileSync("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", url, ...args], {
    stdio: ["ignore", "pipe", "inherit"],
    encoding: "utf8",
    env: { ...process.env, PGOPTIONS: "-c client_min_messages=warning" },
  });
}

function checkName(name) {
  if (!/^[a-z0-9_]+$/.test(name)) throw new Error(`Bad database name: ${name}`);
  return name;
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
  psql(databaseUrl("postgres"), "-c", `DROP DATABASE IF EXISTS "${checkName(name)}" WITH (FORCE)`);
}

/**
 * Makes database `name` as a copy of `template`, on the same server. Postgres
 * copies the files, so it takes tens of milliseconds, however many
 * migrations there are; nothing may be connected to the template.
 */
export function copyDatabase(name, template) {
  psql(databaseUrl("postgres"), "-c", `CREATE DATABASE "${checkName(name)}" TEMPLATE "${checkName(template)}"`);
}

/** Runs `sql` in database `name`, and returns the rows it printed, one per line, tab-separated. */
export function runSql(name, sql) {
  return psql(databaseUrl(checkName(name)), "-At", "-F", "\t", "-c", sql)
    .split("\n")
    .filter((line) => line !== "");
}

/** The names of the databases on the server that start with `prefix`. */
export function databaseNames(prefix) {
  return runSql("postgres", `SELECT datname FROM pg_database WHERE datname LIKE '${checkName(prefix)}%' ORDER BY 1`);
}

/**
 * How production's database sorts and compares text: Postgres's builtin
 * C.UTF-8, by code point, capitals before lowercase and accented letters
 * after z (docs/development.md, "Collation"). Every database made here has
 * it, whatever the server's own default, so a sort in a test, the
 * storyboard or dev comes out as it does live. From template0, as a
 * database with a locale of its own must be.
 */
const PRODUCTION_LOCALE =
  "TEMPLATE template0 ENCODING 'UTF8' LOCALE_PROVIDER builtin BUILTIN_LOCALE 'C.UTF-8' LOCALE 'C.UTF-8'";

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
  const name = checkName(decodeURIComponent(target.pathname.slice(1)));
  // The same server, its "postgres" database, to drop and create from.
  const server = new URL(url);
  server.pathname = "/postgres";
  psql(server.toString(), "-c", `DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  psql(server.toString(), "-c", `CREATE DATABASE "${name}" ${PRODUCTION_LOCALE}`);
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
    `WITH person AS (INSERT INTO notable_people (kind, name, salutation, email) VALUES ('politician', ${[mp.name, mp.salutation].map(literal).join(", ")}, ${mp.noEmail ? "NULL" : literal(mp.email ?? email)}) RETURNING id)
     INSERT INTO politicians (id, house, constituency, is_test, test_postcode) SELECT id, 'commons', ${literal(mp.constituency)}, true, ${literal(mp.postcode)} FROM person;`,
    ...Object.entries(mp.statuses).map(
      ([ask, status]) =>
        `INSERT INTO ask_statuses (notable_person_id, ask, ask_kind, status, updated_by) SELECT p.id, a.slug, a.kind, ${literal(status)}, 'sync' FROM politicians p, asks a WHERE p.test_postcode = ${literal(mp.postcode)} AND a.slug = ${literal(ask)};`,
    ),
  ]).flat();
  psql(url, "-c", sql.join("\n"));
}

/**
 * Gives the migrations' admin account the supporters permission too, so a
 * local database opens every staff page to it. Live databases keep the
 * migration's admin alone.
 */
export function giveAdminSupporters(url) {
  psql(url, "-c", "UPDATE staff_accounts SET permissions = '{admin,supporters}' WHERE email = 'admin@pauseai.uk'");
}

/**
 * Adds the fake supporters (tests/fixtures/staff-data.sql): Luma guests and
 * contacts, letters to the test MPs, an opt-out. For a development database
 * with DATA_FIXTURES=1, after addTestMps.
 */
export function addFixtureData(url) {
  psql(url, "-1", "-f", FIXTURE_DATA);
}

/**
 * Connects the fake Gmail of `email`, the letters inbox of a fixture build
 * (LETTERS_INBOX), as someone logged in as it would on /staff/me: a staff
 * account holding the fixture's refresh token for it, encrypted with `key`
 * (GMAIL_TOKEN_KEY) as lib/server/gmail-tokens.ts does, read from the fake
 * mailbox's first history ID.
 */
export function connectLettersInbox(url, email, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "base64"), iv);
  const sealed = Buffer.concat([cipher.update(`fixture-refresh:${email}`, "utf8"), cipher.final()]);
  const token = Buffer.concat([iv, sealed, cipher.getAuthTag()]).toString("hex");
  psql(
    url,
    "-c",
    `INSERT INTO staff_accounts (email, added_by, gmail_token, gmail_connected_at, gmail_history_id, gmail_name)
     VALUES ('${email}', 'migration', '\\x${token}', now(), '1000', 'Letters')`,
  );
}

//   node scripts/fresh-database.mjs <name> [--test-mp <email>]
if (basename(process.argv[1] ?? "") === "fresh-database.mjs") {
  const url = freshDatabase(process.argv[2] ?? "pauseai_dev");
  const testMp = process.argv.indexOf("--test-mp");
  if (testMp !== -1) addTestMps(url, process.argv[testMp + 1]);
  console.log(url);
}
