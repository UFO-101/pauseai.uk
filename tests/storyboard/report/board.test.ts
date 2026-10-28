import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeStoryboard } from "./board.ts";
import type { FlowRun } from "./frames.ts";

describe("writeStoryboard", () => {
  let dir = "";
  beforeEach(() => (dir = mkdtempSync(join(tmpdir(), "storyboard-board-"))));
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  /** A 4×4 picture of one grey, at `path` in the run's folder. */
  async function picture(path: string, grey: number): Promise<string> {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    await sharp(Buffer.alloc(4 * 4 * 4, grey), { raw: { width: 4, height: 4, channels: 4 } }).toFile(join(dir, path));
    return path;
  }

  function manifest(side: string, runs: FlowRun[]) {
    mkdirSync(join(dir, side), { recursive: true });
    writeFileSync(join(dir, side, "frames.json"), JSON.stringify({ frames: runs }));
  }

  const flow = (name: string, pngs: string[]): FlowRun => ({
    section: "staff",
    flow: name,
    viewport: "desktop",
    line: 1,
    status: "passed",
    frames: pngs.map((png, i) => ({ caption: `frame ${i + 1}`, png })),
  });

  it("pairs the two sides, compares every pair, and writes the board and its page", async () => {
    // More pairs that differ than are compared at once, and one the same.
    const names = ["a", "b", "c", "d", "e", "f"];
    const branch = await Promise.all(names.map((n) => picture(`branch/${n}.png`, 0)));
    const main = await Promise.all(names.map((n) => picture(`main/${n}.png`, 255)));
    manifest("branch", [flow("login", branch), flow("same", [await picture("branch/same.png", 9)])]);
    manifest("main", [flow("login", main), flow("same", [await picture("main/same.png", 9)])]);

    const board = await writeStoryboard(dir);

    expect(board.withMain).toBe(true);
    expect(board.summary).toEqual({ flows: 2, failed: 0, frames: 7, changed: 6 });
    expect(board.frames[0]).toMatchObject({ mismatch: 1, diff: "diff/staff-desktop-login-1.png" });
    expect(existsSync(join(dir, "diff", "staff-desktop-login-6.png"))).toBe(true);
    expect(JSON.parse(readFileSync(join(dir, "storyboard.json"), "utf8"))).toEqual(board);
    expect(readFileSync(join(dir, "index.html"), "utf8")).toContain("<title>Storyboard</title>");
  });

  it("without main's side, shows this branch's frames alone", async () => {
    manifest("branch", [flow("login", [await picture("branch/a.png", 0)])]);
    const board = await writeStoryboard(dir);
    expect(board.withMain).toBe(false);
    expect(board.summary).toEqual({ flows: 1, failed: 0, frames: 1, changed: 0 });
  });

  it("with no frames written at all, is an empty board", async () => {
    expect((await writeStoryboard(dir)).summary).toEqual({ flows: 0, failed: 0, frames: 0, changed: 0 });
  });
});
