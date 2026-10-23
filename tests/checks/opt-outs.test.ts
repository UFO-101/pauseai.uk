import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Whether we'd email someone is decided in one place, the email_permissions
// view (docs/domain-concepts.md, "Whether we'd email someone"). This fails
// on code that reads opt_outs itself, so nothing works out its own answer:
// only the code that records opt-outs, and erasure, which keeps them.
const PATTERN = /\bopt_outs\b/;

const ALLOWED = new Set(["lib/server/opt-outs.ts", "lib/server/erasure.ts"]);

// The site's code; tests and fixtures write opt-outs to set up what they check.
const CODE_DIRS = ["app", "components", "lib", "netlify"];
const CODE_FILE = /\.[cm]?[jt]sx?$/;
const TEST_FILE = /\.test\.[cm]?[jt]sx?$/;

function readers(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return readers(path);
    if (!CODE_FILE.test(entry.name) || TEST_FILE.test(entry.name) || ALLOWED.has(path)) return [];
    return PATTERN.test(readFileSync(path, "utf8")) ? [path] : [];
  });
}

describe("opt-outs", () => {
  it("only the code that records them reads opt_outs", () => {
    expect(CODE_DIRS.flatMap((dir) => readers(dir))).toEqual([]);
  });

  it("would spot a reader", () => {
    expect(PATTERN.test("SELECT 1 FROM opt_outs o")).toBe(true);
    expect(PATTERN.test("opt_outs_open")).toBe(false);
  });
});
