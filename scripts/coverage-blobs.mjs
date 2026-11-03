#!/usr/bin/env node
// Readies the blob reports of a test run split across machines for
// `vitest --merge-reports --coverage`, so the merged coverage is exactly
// what one unsplit `npm test` reports.
//
//   npx vitest run --coverage --shard=1/2 --reporter=blob   (and 2/2, elsewhere)
//   node scripts/coverage-blobs.mjs .vitest-reports          rewrites the blobs in place
//   npx vitest --merge-reports --coverage
//
// Each part reports every file in coverage.include, at 0% where none of its
// tests ran it. It maps those files' statements from Vite's server-side
// transform, which ends a call with no arguments to an imported function,
// such as `useId()`, at a different column from the browser's transform. A
// file only the other part's browser tests run then has each such statement
// twice in the merge, under two locations, one of them never run. So for any
// file one part ran, this drops the other parts' never-run copies of it. A
// file no part ran keeps its copies, at 0%, and fails the gate as it should.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { parse, stringify } from "flatted";

/** Whether any statement, function or branch of a file's coverage ran. */
function ran(file) {
  return (
    Object.values(file.s).some((n) => n > 0) ||
    Object.values(file.f).some((n) => n > 0) ||
    Object.values(file.b).some((counts) => counts.some((n) => n > 0))
  );
}

/**
 * The parts' coverage maps (file path to Istanbul file coverage), without a
 * part's copy of a file it never ran when another part ran it.
 */
export function dropUnrunCopies(coverages) {
  const runSomewhere = new Set(
    coverages.flatMap((coverage) => Object.keys(coverage).filter((path) => ran(coverage[path]))),
  );
  return coverages.map((coverage) =>
    Object.fromEntries(Object.entries(coverage).filter(([path, file]) => ran(file) || !runSomewhere.has(path))),
  );
}

// A blob is Vitest's flatted array [version, files, errors, coverage, executionTime, modules].
const COVERAGE = 3;

/** Rewrites every blob in `dir` with dropUnrunCopies applied across them. */
export function prepareBlobs(dir) {
  const paths = readdirSync(dir).map((name) => join(dir, name));
  const blobs = paths.map((path) => parse(readFileSync(path, "utf8")));
  if (blobs.some((blob) => !blob[COVERAGE]))
    throw new Error(`Every blob in ${dir} needs coverage: run each part with --coverage`);
  const coverages = dropUnrunCopies(blobs.map((blob) => blob[COVERAGE]));
  blobs.forEach((blob, i) => {
    blob[COVERAGE] = coverages[i];
    writeFileSync(paths[i], stringify(blob));
  });
}

//   node scripts/coverage-blobs.mjs <blob directory>
if (basename(process.argv[1] ?? "") === "coverage-blobs.mjs") prepareBlobs(process.argv[2] ?? ".vitest-reports");
