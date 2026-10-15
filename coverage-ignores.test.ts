import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The coverage gate allows no exceptions (docs/testing.md): code that can't
// run in Node is tested in the browser project instead of being skipped. This
// fails on any coverage-ignore comment in code or tests, so an exception
// can't slip in quietly.
const PATTERN = /\b(?:v8|c8|istanbul)\s+ignore\b/;

// Generated, installed or local-only.
const SKIP_DIRS = new Set([
  ".git",
  ".next",
  ".vitest",
  "node_modules",
  "coverage",
  "playwright-report",
  "test-results",
  "blob-report",
  "tmp",
]);

const CODE_FILE = /\.[cm]?[jt]sx?$/;

function coverageIgnores(dir: string, root = dir): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return SKIP_DIRS.has(entry.name) ? [] : coverageIgnores(path, root);
    if (!CODE_FILE.test(entry.name)) return [];
    return readFileSync(path, "utf8")
      .split("\n")
      .flatMap((line, i) => (PATTERN.test(line) ? [`${path.slice(root.length + 1)}:${i + 1}  ${line.trim()}`] : []));
  });
}

describe("coverage ignores", () => {
  it("no code has a coverage-ignore comment", () => {
    expect(coverageIgnores(process.cwd())).toEqual([]);
  });

  // Each example is split, so this file doesn't match itself.
  it("would spot one", () => {
    expect(PATTERN.test("/* v8 " + "ignore next */")).toBe(true);
    expect(PATTERN.test("// istanbul  " + "ignore else")).toBe(true);
    expect(PATTERN.test("the v8 engine")).toBe(false);
  });
});
