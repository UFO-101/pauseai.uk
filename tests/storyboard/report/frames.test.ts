import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PNG } from "pngjs";
import { readdirSync } from "node:fs";
import { comparePngs, pairRuns, SECTION_ORDER, sortRuns, type FlowRun, type RunManifest } from "./frames";
import { renderStoryboardPage } from "./page";

const run = (flow: string, captions: string[], extra: Partial<FlowRun> = {}): FlowRun => ({
  section: "staff",
  flow,
  viewport: "desktop",
  line: 1,
  status: "passed",
  frames: captions.map((caption, i) => ({ caption, png: `${extra.viewport ?? "desktop"}/${flow}/${i + 1}.png` })),
  ...extra,
});

const same = () => ({ mismatch: 0 });

describe("pairRuns", () => {
  it("pairs frames by section, flow and caption, and counts what changed", () => {
    const branch: RunManifest = {
      frames: [run("login", ["form", "sent", "new step"]), run("letters", ["list"], { viewport: "phone", line: 2 })],
    };
    const main: RunManifest = {
      frames: [run("login", ["form", "old step", "sent"]), run("letters", ["list"], { viewport: "phone", line: 2 })],
    };
    const compared: string[] = [];
    const board = pairRuns(branch, main, (b, m, name) => {
      compared.push(name);
      return m.endsWith("1.png") ? { mismatch: 0 } : { mismatch: 0.25, diff: `diff/${name}.png` };
    });

    expect(compared).toEqual(["staff-desktop-login-1", "staff-desktop-login-2", "staff-phone-letters-1"]);
    expect(board.withMain).toBe(true);
    expect(board.frames.map((f) => [f.flow, f.index, f.caption, f.changed, f.mismatch, f.main !== undefined])).toEqual([
      ["login", 1, "form", false, 0, true],
      ["login", 2, "sent", true, 0.25, true],
      ["login", 3, "new step", true, undefined, false],
      ["login", 4, "old step", true, undefined, true],
      ["letters", 1, "list", false, 0, true],
    ]);
    expect(board.frames[1].diff).toBe("diff/staff-desktop-login-2.png");
    expect(board.frames[3].branch).toBeUndefined();
    expect(board.flows).toEqual([
      expect.objectContaining({ flow: "login", frames: 4, changed: 3, status: "passed", mainStatus: "passed" }),
      expect.objectContaining({ flow: "letters", viewport: "phone", frames: 1, changed: 0 }),
    ]);
    expect(board.summary).toEqual({ flows: 2, failed: 0, frames: 5, changed: 3 });
  });

  it("without a run of main, nothing is changed and nothing is compared", () => {
    const board = pairRuns({ frames: [run("login", ["form"])] }, undefined, () => {
      throw new Error("not called");
    });
    expect(board.withMain).toBe(false);
    expect(board.frames).toEqual([
      expect.objectContaining({ caption: "form", changed: false, branch: "desktop/login/1.png" }),
    ]);
    expect(board.flows[0].mainStatus).toBeUndefined();
  });

  it("keeps a failed flow's error, and main's status when main failed", () => {
    const branch: RunManifest = {
      frames: [run("login", ["form"], { status: "failed", error: "expected 200, got 500" })],
    };
    const main: RunManifest = { frames: [run("login", [], { status: "timedOut" })] };
    const board = pairRuns(branch, main, same);
    expect(board.flows[0]).toMatchObject({ status: "failed", error: "expected 200, got 500", mainStatus: "timedOut" });
    // Main got no frame, so this branch's is new to it.
    expect(board.frames[0]).toMatchObject({ changed: true, main: undefined, status: "failed" });
    expect(board.summary.failed).toBe(1);
  });

  it("keeps a flow only main has, as gone", () => {
    const board = pairRuns({ frames: [] }, { frames: [run("old flow", ["a", "b"])] }, same);
    expect(board.flows).toEqual([
      expect.objectContaining({ flow: "old flow", frames: 2, changed: 2, mainStatus: "passed" }),
    ]);
    expect(board.frames.map((f) => [f.index, f.caption, f.branch, f.main, f.changed])).toEqual([
      [1, "a", undefined, "desktop/old flow/1.png", true],
      [2, "b", undefined, "desktop/old flow/2.png", true],
    ]);
  });

  it("pairs a repeated caption with the next one of the same name", () => {
    const board = pairRuns({ frames: [run("f", ["x", "x"])] }, { frames: [run("f", ["x", "x"])] }, (b, m) => ({
      mismatch: b === m ? 0 : 1,
    }));
    expect(board.frames.map((f) => f.mismatch)).toEqual([0, 0]);
  });

  it("skips frames without pictures, as a run without screenshots leaves them", () => {
    const branch: RunManifest = {
      frames: [{ section: "s", flow: "f", viewport: "desktop", line: 1, status: "passed", frames: [{ caption: "a" }] }],
    };
    const board = pairRuns(branch, branch, () => {
      throw new Error("not called");
    });
    expect(board.frames[0]).toMatchObject({ caption: "a", changed: false });
    expect(board.frames[0].mismatch).toBeUndefined();
  });
});

describe("sortRuns", () => {
  const at = (section: string, line: number, flow = "f", viewport = "desktop") => ({ section, line, flow, viewport });

  it("puts the sections in SECTION_ORDER, unknown ones after, alphabetically", () => {
    const sorted = sortRuns([at("zz-new", 1), at("staff", 1), at("aa-new", 1), at("public-pages", 1)]);
    expect(sorted.map((r) => r.section)).toEqual(["public-pages", "staff", "aa-new", "zz-new"]);
  });

  it("within a section keeps the spec file's order, then the flow's name, then the viewport", () => {
    const sorted = sortRuns([
      at("staff", 9, "b", "phone"),
      at("staff", 9, "b", "desktop"),
      at("staff", 9, "a"),
      at("staff", 2, "z"),
    ]);
    expect(sorted.map((r) => [r.line, r.flow, r.viewport])).toEqual([
      [2, "z", "desktop"],
      [9, "a", "desktop"],
      [9, "b", "desktop"],
      [9, "b", "phone"],
    ]);
  });

  it("lists every section, so each spec file is placed on purpose", () => {
    const specs = readdirSync(join(__dirname, ".."))
      .filter((f) => f.endsWith(".spec.ts"))
      .map((f) => f.replace(/\.spec\.ts$/, ""));
    expect([...SECTION_ORDER].sort()).toEqual(specs.sort());
    expect(SECTION_ORDER[0]).toBe("public-pages");
  });

  it("orders the flows of both runs, whatever order they finished in", () => {
    const board = pairRuns(
      { frames: [run("second", ["a"], { line: 20 }), run("first", ["a"], { line: 10, section: "public-pages" })] },
      { frames: [run("gone", ["a"], { line: 30 }), run("second", ["a"], { line: 20 })] },
      same,
    );
    expect(board.flows.map((f) => f.flow)).toEqual(["first", "second", "gone"]);
  });
});

describe("comparePngs", () => {
  let dir = "";
  beforeEach(() => (dir = mkdtempSync(join(tmpdir(), "storyboard-"))));
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  function png(name: string, width: number, height: number, paint: (x: number, y: number) => number): string {
    const image = new PNG({ width, height });
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const v = paint(x, y);
        image.data.set([v, v, v, 255], (y * width + x) * 4);
      }
    }
    const path = join(dir, name);
    writeFileSync(path, PNG.sync.write(image));
    return path;
  }

  it("says identical pictures match, and writes no diff", () => {
    const a = png("a.png", 10, 10, () => 200);
    const b = png("b.png", 10, 10, () => 200);
    expect(comparePngs(a, b, join(dir, "diff.png"))).toEqual({ mismatch: 0 });
    expect(() => readFileSync(join(dir, "diff.png"))).toThrow();
  });

  it("measures the fraction of pixels that differ, padding a taller picture", () => {
    const a = png("a.png", 10, 10, () => 255);
    // The same, but ten rows longer, all black: the padding is white, so every extra pixel differs.
    const b = png("b.png", 10, 20, (x, y) => (y < 10 ? 255 : 0));
    const result = comparePngs(a, b, join(dir, "diff.png"));
    expect(result.diff).toBe(join(dir, "diff.png"));
    expect(result.mismatch).toBeCloseTo(0.5, 2);
    expect(PNG.sync.read(readFileSync(join(dir, "diff.png"))).height).toBe(20);
  });
});

describe("renderStoryboardPage", () => {
  it("embeds the data, with nothing that could close the script", () => {
    const board = pairRuns({ frames: [run("</script><b>", ["a"])] }, undefined, same);
    const html = renderStoryboardPage(board);
    expect(html).toContain("<title>Storyboard</title>");
    expect(html).toContain('<script id="data" type="application/json">');
    expect(html).not.toContain("</script><b>");
    expect(JSON.parse(html.match(/type="application\/json">([\s\S]*?)<\/script>/)![1])).toEqual(board);
  });
});
