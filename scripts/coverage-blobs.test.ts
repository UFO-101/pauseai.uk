import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse, stringify } from "flatted";
import { afterEach, describe, expect, it } from "vitest";
import { dropUnrunCopies, prepareBlobs } from "./coverage-blobs.mjs";

// A file's coverage: hit counts for its statements, functions and branches.
const coverage = (s: number[], f: number[] = [], b: number[][] = []) => ({
  s: Object.fromEntries(s.entries()),
  f: Object.fromEntries(f.entries()),
  b: Object.fromEntries(b.entries()),
});
const unrun = coverage([0, 0], [0], [[0, 0]]);

describe("dropUnrunCopies", () => {
  it("drops a part's never-run copy of a file another part ran", () => {
    const ran = coverage([1, 0]);
    expect(dropUnrunCopies([{ "a.tsx": ran }, { "a.tsx": unrun }])).toEqual([{ "a.tsx": ran }, {}]);
  });

  it("counts a file as run when only a function or a branch ran", () => {
    const fn = coverage([0], [1]);
    const branch = coverage([0], [0], [[0, 2]]);
    expect(
      dropUnrunCopies([
        { "a.ts": unrun, "b.ts": unrun },
        { "a.ts": fn, "b.ts": branch },
      ]),
    ).toEqual([{}, { "a.ts": fn, "b.ts": branch }]);
  });

  it("keeps every copy of a file that ran in more than one part", () => {
    const one = coverage([1, 0]);
    const other = coverage([0, 3]);
    expect(dropUnrunCopies([{ "a.ts": one }, { "a.ts": other }])).toEqual([{ "a.ts": one }, { "a.ts": other }]);
  });

  it("keeps a file no part ran, so it fails the gate at 0%", () => {
    expect(dropUnrunCopies([{ "a.ts": unrun }, { "a.ts": unrun }])).toEqual([{ "a.ts": unrun }, { "a.ts": unrun }]);
  });
});

describe("prepareBlobs", () => {
  let dir: string;
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const blob = (cover: unknown) => ["5.0.5", [{ name: "a.test.ts" }], [], cover, 1, {}];

  it("rewrites each blob's coverage, keeping the rest of it", () => {
    dir = mkdtempSync(join(tmpdir(), "coverage-blobs-"));
    const ran = coverage([1]);
    writeFileSync(join(dir, "blob-1.json"), stringify(blob({ "a.tsx": ran })));
    writeFileSync(join(dir, "blob-2.json"), stringify(blob({ "a.tsx": unrun })));
    prepareBlobs(dir);
    expect(parse(readFileSync(join(dir, "blob-1.json"), "utf8"))).toEqual(blob({ "a.tsx": ran }));
    expect(parse(readFileSync(join(dir, "blob-2.json"), "utf8"))).toEqual(blob({}));
  });

  it("refuses blobs from a part run without coverage", () => {
    dir = mkdtempSync(join(tmpdir(), "coverage-blobs-"));
    writeFileSync(join(dir, "blob-1.json"), stringify(blob(undefined)));
    expect(() => prepareBlobs(dir)).toThrow("run each part with --coverage");
  });
});
