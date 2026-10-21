import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Agents never write final copy (AGENTS.md). Where code needs words that a
// person hasn't written yet, they put in a draft placeholder starting with this
// mark. This test fails while any placeholder is left, so none can ship.
const MARK = "\u2042"; // the asterism, written as an escape so this file doesn't match itself

// The rule itself has to mention the mark.
const ALLOWED = new Set(["AGENTS.md"]);

// Generated, installed or local-only: never part of what ships. .netlify is
// the Next.js runtime plugin's bundled functions, which copy the whole repo
// (AGENTS.md included) into the serverless handler; Netlify's build cache can
// leave one on disk from an earlier build before this one regenerates it.
const SKIP_DIRS = new Set([
  ".git",
  ".netlify",
  ".next",
  ".vitest",
  "node_modules",
  "coverage",
  "playwright-report",
  "test-results",
  "blob-report",
  "tmp",
]);

// Text files only. Images and PDFs are skipped: their bytes could contain
// the mark's UTF-8 encoding by chance.
const TEXT_FILE = /\.(tsx?|mjs|cjs|js|json|md|mdx|css|html|txt|svg|ya?ml|csv|toml)$/;

function filesContainingMark(dir: string, root = dir): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    const relative = path.slice(root.length + 1);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) found.push(...filesContainingMark(path, root));
    } else if (entry.isFile() && TEXT_FILE.test(entry.name) && !ALLOWED.has(relative)) {
      if (readFileSync(path, "utf8").includes(MARK)) found.push(relative);
    }
  }
  return found;
}

describe("placeholder copy", () => {
  it(`no file contains the ${MARK} placeholder mark`, () => {
    expect(filesContainingMark(process.cwd())).toEqual([]);
  });
});
