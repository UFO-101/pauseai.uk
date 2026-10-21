#!/usr/bin/env node
// npm run db:reset: makes the local database that NETLIFY_DB_URL names, from
// scratch, with the migrations applied. If TEST_MP_EMAIL is set, it also adds
// the test MPs (lib/test-mps.ts) with that inbox. With DATA_FIXTURES set, it
// adds the fake supporters too (tests/fixtures/staff-data.sql), and the test
// MPs whatever TEST_MP_EMAIL says, since their letters go to the fixture
// outbox anyway. Reads all three from .env.local, the way `npm run dev` does.
//
// It wipes the database if it already exists, so it only works on a
// database on this machine: never on Netlify's.
import nextEnv from "@next/env";
import { addFixtureData, addTestMps, isLocal, resetDatabase, migrationFiles } from "./fresh-database.mjs";
import { recordApplied } from "./db-migrate.mjs";

nextEnv.loadEnvConfig(process.cwd(), true);

const url = process.env.NETLIFY_DB_URL;
if (!url) {
  console.error("Set NETLIFY_DB_URL in .env.local first: copy .env.example to .env.local and edit it.");
  process.exit(1);
}
if (!isLocal(url)) {
  console.error(
    `NETLIFY_DB_URL points at another machine (${new URL(url).hostname}). db:reset only wipes databases on this one.`,
  );
  process.exit(1);
}

resetDatabase(url);
// Made with every migration, so db:migrate knows there's nothing to apply.
recordApplied(url, migrationFiles());
const fixtures = Boolean(process.env.DATA_FIXTURES);
const email = process.env.TEST_MP_EMAIL?.trim() || (fixtures ? "test-mp@example.org" : undefined);
if (email) addTestMps(url, email);
if (fixtures) addFixtureData(url);
const mps = email ? `, with the test MPs (${email})` : ", without the test MPs: set TEST_MP_EMAIL to add them";
console.log(`Made ${new URL(url).pathname.slice(1)}${mps}${fixtures ? " and the fake supporters" : ""}.`);
