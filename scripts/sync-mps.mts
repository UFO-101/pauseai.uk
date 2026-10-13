#!/usr/bin/env node
// Copies the sitting MPs from Parliament's Members API into data/mps.json,
// which the Email your MP tool reads. Run with `npm run data:mps`, check
// the diff, and commit it.
//
// If more than MAX_UNCHECKED_CHANGES MPs change, it stops and lists them,
// so a person can check: pass --force to write them anyway.
import { readFileSync, writeFileSync } from "node:fs";
import { changeCount, compareMps, fetchCurrentMps, MAX_UNCHECKED_CHANGES, type SyncedMp } from "../lib/parliament.ts";

const FILE = new URL("../data/mps.json", import.meta.url);

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.json();
}

let before: SyncedMp[] = [];
try {
  before = JSON.parse(readFileSync(FILE, "utf8"));
} catch {
  // No file yet: everyone is new.
}

const after = await fetchCurrentMps(getJson);
const changes = compareMps(before, after);
const count = changeCount(changes);

for (const mp of changes.added) console.log(`+ ${mp.constituency}: ${mp.name}`);
for (const mp of changes.removed) console.log(`- ${mp.constituency}: ${mp.name}`);
for (const mp of changes.changed) console.log(`~ ${mp.constituency}: ${mp.name}`);
console.log(`${after.length} MPs, ${count} changed, ${after.filter((mp) => !mp.email).length} without an email`);

if (count > MAX_UNCHECKED_CHANGES && before.length > 0 && !process.argv.includes("--force")) {
  console.error(`More than ${MAX_UNCHECKED_CHANGES} changes. Check them, then run again with --force.`);
  process.exit(1);
}

writeFileSync(FILE, JSON.stringify(after, null, 2) + "\n");
