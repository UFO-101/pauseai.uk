#!/usr/bin/env node
// npm run db:reset: makes the local database that NETLIFY_DB_URL names, from
// scratch, with the migrations applied. If TEST_MP_EMAIL is set, it also adds
// the test MP (postcode ZZ99ZZ) with that inbox. Reads both from .env.local,
// the way `npm run dev` does.
//
// It wipes the database if it already exists, so it only works on a
// database on this machine: never on Netlify's.
import nextEnv from "@next/env";
import { addTestMp, isLocal, resetDatabase } from "./fresh-database.mjs";

nextEnv.loadEnvConfig(process.cwd(), true);

const url = process.env.NETLIFY_DB_URL;
if (!url) {
  console.error("Set NETLIFY_DB_URL in .env.local first: copy .env.example to .env.local and edit it.");
  process.exit(1);
}
if (!isLocal(url)) {
  console.error(`NETLIFY_DB_URL points at another machine (${new URL(url).hostname}). db:reset only wipes databases on this one.`);
  process.exit(1);
}

resetDatabase(url);
const email = process.env.TEST_MP_EMAIL?.trim();
if (email) addTestMp(url, email);
console.log(`Made ${new URL(url).pathname.slice(1)}${email ? `, with the test MP (${email})` : ", without the test MP: set TEST_MP_EMAIL to add it"}.`);
