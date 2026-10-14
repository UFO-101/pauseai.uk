#!/usr/bin/env node
// Fails if a staff page, route handler or Server Action file under
// app/(staff)/ doesn't call requireStaff(). proxy.ts only checks that a
// cookie exists; this is what makes every staff entry point check the
// session in the database (plans/email-your-mp-v2.md, "Staff interface").
//
// Components (_components/) and the layout only render what a page hands
// them, so they're not entry points. The login page, the page the emailed
// link opens, and the two login routes are how staff get a session, so they
// can't require one.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "app/(staff)";
const OPEN = new Set(["staff/login/page.tsx", "staff/login/confirm/page.tsx", "staff/api/login/route.ts", "staff/api/callback/route.ts"]);

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name.startsWith("_") ? [] : files(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

export function entryPoints(root = ROOT) {
  return files(root)
    .map((path) => ({ path, name: relative(root, path).split("\\").join("/"), source: readFileSync(path, "utf8") }))
    .filter(({ name, source }) => /(^|\/)(page|route)\.tsx?$/.test(name) || /^\s*["']use server["']/m.test(source));
}

export function unprotected(root = ROOT) {
  return entryPoints(root)
    .filter(({ name, source }) => !OPEN.has(name) && !/\brequireStaff\(\)/.test(source))
    .map(({ path }) => path);
}

const missing = unprotected();
if (missing.length) {
  for (const path of missing) console.error(`${path}: doesn't call requireStaff()`);
  process.exit(1);
}
console.log(`OK: every staff page, route and Server Action calls requireStaff() (${entryPoints().length} files)`);
