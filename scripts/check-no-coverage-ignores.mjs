#!/usr/bin/env node
// The coverage gate allows no exceptions (docs/testing.md): code that can't
// run in Node is tested in the browser project instead of being skipped. This
// fails on any coverage-ignore comment in source or tests, so an exception
// can't slip in quietly.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["app", "components", "lib", "tests", "scripts"];
const FILES = ["next.config.ts", "vitest.config.mts"];
const PATTERN = /\b(?:v8|c8|istanbul)\s+ignore\b/;
const SELF = join("scripts", "check-no-coverage-ignores.mjs");

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return /\.(?:[cm]?[jt]sx?)$/.test(name) ? [path] : [];
  });
}

const files = [...ROOTS.flatMap(walk), ...FILES].filter((f) => f !== SELF);
const hits = files.flatMap((file) =>
  readFileSync(file, "utf8")
    .split("\n")
    .flatMap((line, i) => (PATTERN.test(line) ? [`${file}:${i + 1}  ${line.trim()}`] : [])),
);

if (hits.length > 0) {
  console.error(hits.join("\n"));
  console.error(`\n${hits.length} coverage-ignore comment(s) found. Test the code instead (docs/testing.md).`);
  process.exit(1);
}

console.log("OK: no coverage-ignore comments");
