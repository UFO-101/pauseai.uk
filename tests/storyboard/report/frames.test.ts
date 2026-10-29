import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import { readdirSync } from "node:fs";
import { carryRuns, comparePngs, pairRuns, SECTION_ORDER, sortRuns, type FlowRun, type RunManifest } from "./frames.ts";
import { renderStoryboardPage } from "./page.ts";

const run = (flow: string, captions: string[], extra: Partial<FlowRun> = {}): FlowRun => ({
  section: "staff",
  flow,
  viewport: "desktop",
  line: 1,
  status: "passed",
  frames: captions.map((caption, i) => ({ caption, png: `${extra.viewport ?? "desktop"}/${flow}/${i + 1}.png` })),
  ...extra,
});

const same = async () => ({ mismatch: 0, noise: false });

describe("pairRuns", () => {
  it("pairs frames by section, flow and caption, and counts what changed", async () => {
    const branch: RunManifest = {
      frames: [run("login", ["form", "sent", "new step"]), run("letters", ["list"], { viewport: "phone", line: 2 })],
    };
    const main: RunManifest = {
      frames: [run("login", ["form", "old step", "sent"]), run("letters", ["list"], { viewport: "phone", line: 2 })],
    };
    const compared: string[] = [];
    const board = await pairRuns(branch, main, async (b, m, name) => {
      compared.push(name);
      return m.endsWith("1.png")
        ? { mismatch: 0, noise: false }
        : { mismatch: 0.25, noise: false, diff: `diff/${name}.png` };
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

  it("without a run of main, nothing is changed and nothing is compared", async () => {
    const board = await pairRuns({ frames: [run("login", ["form"])] }, undefined, async () => {
      throw new Error("not called");
    });
    expect(board.withMain).toBe(false);
    expect(board.frames).toEqual([
      expect.objectContaining({ caption: "form", changed: false, branch: "desktop/login/1.png" }),
    ]);
    expect(board.flows[0].mainStatus).toBeUndefined();
  });

  it("keeps a failed flow's error, and main's status when main failed", async () => {
    const branch: RunManifest = {
      frames: [run("login", ["form"], { status: "failed", error: "expected 200, got 500" })],
    };
    const main: RunManifest = { frames: [run("login", [], { status: "timedOut" })] };
    const board = await pairRuns(branch, main, same);
    expect(board.flows[0]).toMatchObject({ status: "failed", error: "expected 200, got 500", mainStatus: "timedOut" });
    // Main got no frame, so this branch's is new to it.
    expect(board.frames[0]).toMatchObject({ changed: true, main: undefined, status: "failed" });
    expect(board.summary.failed).toBe(1);
  });

  it("keeps a flow only main has, as gone", async () => {
    const board = await pairRuns({ frames: [] }, { frames: [run("old flow", ["a", "b"])] }, same);
    expect(board.flows).toEqual([
      expect.objectContaining({ flow: "old flow", frames: 2, changed: 2, mainStatus: "passed" }),
    ]);
    expect(board.frames.map((f) => [f.index, f.caption, f.branch, f.main, f.changed])).toEqual([
      [1, "a", undefined, "desktop/old flow/1.png", true],
      [2, "b", undefined, "desktop/old flow/2.png", true],
    ]);
  });

  it("keeps a frame that differs only by noise as unchanged, marked noise", async () => {
    const board = await pairRuns(
      { frames: [run("login", ["form"])] },
      { frames: [run("login", ["form"])] },
      async () => ({
        mismatch: 0.001,
        noise: true,
        diff: "diff/x.png",
      }),
    );
    expect(board.frames[0]).toMatchObject({ changed: false, noise: true, mismatch: 0.001, diff: "diff/x.png" });
    expect(board.summary.changed).toBe(0);
  });

  it("pairs a repeated caption with the next one of the same name", async () => {
    const board = await pairRuns(
      { frames: [run("f", ["x", "x"])] },
      { frames: [run("f", ["x", "x"])] },
      async (b, m) => ({
        mismatch: b === m ? 0 : 1,
        noise: false,
      }),
    );
    expect(board.frames.map((f) => f.mismatch)).toEqual([0, 0]);
  });

  it("skips frames without pictures, as a run without screenshots leaves them", async () => {
    const branch: RunManifest = {
      frames: [{ section: "s", flow: "f", viewport: "desktop", line: 1, status: "passed", frames: [{ caption: "a" }] }],
    };
    const board = await pairRuns(branch, branch, async () => {
      throw new Error("not called");
    });
    expect(board.frames[0]).toMatchObject({ caption: "a", changed: false });
    expect(board.frames[0].mismatch).toBeUndefined();
  });
});

describe("sortRuns", () => {
  const at = (section: string, line: number, flow = "f", viewport = "desktop") => ({ section, line, flow, viewport });

  it("puts the sections in SECTION_ORDER, unknown ones after, alphabetically", async () => {
    const sorted = sortRuns([at("zz-new", 1), at("staff", 1), at("aa-new", 1), at("public-pages", 1)]);
    expect(sorted.map((r) => r.section)).toEqual(["public-pages", "staff", "aa-new", "zz-new"]);
  });

  it("within a section keeps the spec file's order, then the flow's name, then the viewport", async () => {
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

  it("lists every section, so each spec file is placed on purpose", async () => {
    const specs = readdirSync(join(__dirname, ".."))
      .filter((f) => f.endsWith(".spec.ts"))
      .map((f) => f.replace(/\.spec\.ts$/, ""));
    expect([...SECTION_ORDER].sort()).toEqual(specs.sort());
    expect(SECTION_ORDER[0]).toBe("public-pages");
    expect(SECTION_ORDER.at(-1)).toBe("gallery");
  });

  it("orders the flows of both runs, whatever order they finished in", async () => {
    const board = await pairRuns(
      { frames: [run("second", ["a"], { line: 20 }), run("first", ["a"], { line: 10, section: "public-pages" })] },
      { frames: [run("gone", ["a"], { line: 30 }), run("second", ["a"], { line: 20 })] },
      same,
    );
    expect(board.flows.map((f) => f.flow)).toEqual(["first", "second", "gone"]);
  });
});

describe("carryRuns", () => {
  it("puts a partial run's flows on top of the last run's, each replacing its namesake", async () => {
    const previous = {
      frames: [
        { ...run("login", ["form"]), shotAt: "1" },
        { ...run("letters", ["list"]), shotAt: "1" },
      ],
    };
    const fresh = { frames: [{ ...run("login", ["form", "sent"]), shotAt: "2" }] };
    expect(carryRuns(previous, fresh).frames.map((r) => [r.flow, r.frames.length, r.shotAt])).toEqual([
      ["letters", 1, "1"],
      ["login", 2, "2"],
    ]);
  });

  it("keeps the flows pairRuns tells apart by viewport", async () => {
    const previous = { frames: [run("login", ["form"], { viewport: "phone" })] };
    const fresh = { frames: [run("login", ["form"])] };
    expect(carryRuns(previous, fresh).frames.map((r) => r.viewport)).toEqual(["phone", "desktop"]);
  });
});

describe("pairRuns and when flows were shot", () => {
  it("passes each flow's shot time on to the page", async () => {
    const board = await pairRuns(
      { frames: [{ ...run("login", ["form"]), shotAt: "2026-10-17T08:00:00.000Z" }] },
      undefined,
      same,
    );
    expect(board.flows[0].shotAt).toBe("2026-10-17T08:00:00.000Z");
  });
});

describe("comparePngs", () => {
  let dir = "";
  beforeEach(() => (dir = mkdtempSync(join(tmpdir(), "storyboard-"))));
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  async function png(
    name: string,
    width: number,
    height: number,
    paint: (x: number, y: number) => number,
    compressionLevel = 6,
  ): Promise<string> {
    const data = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const v = paint(x, y);
        data.set([v, v, v, 255], (y * width + x) * 4);
      }
    }
    const path = join(dir, name);
    await sharp(data, { raw: { width, height, channels: 4 } })
      .png({ compressionLevel })
      .toFile(path);
    return path;
  }

  const pixels = async (path: string) => sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  it("says identical pictures match, and writes no diff", async () => {
    const a = await png("a.png", 10, 10, () => 200);
    const b = await png("b.png", 10, 10, () => 200);
    expect(await comparePngs(a, b, join(dir, "diff.png"))).toEqual({ mismatch: 0, pixels: 0, noise: false });
    expect(() => readFileSync(join(dir, "diff.png"))).toThrow();
  });

  it("says the same pixels match when the files differ", async () => {
    const a = await png("a.png", 10, 10, (x) => x * 20, 0);
    const b = await png("b.png", 10, 10, (x) => x * 20, 9);
    expect(readFileSync(a).equals(readFileSync(b))).toBe(false);
    expect(await comparePngs(a, b, join(dir, "diff.png"))).toEqual({ mismatch: 0, pixels: 0, noise: false });
  });

  it("measures the fraction of pixels that differ, padding a taller picture", async () => {
    const a = await png("a.png", 10, 10, () => 255);
    // The same, but ten rows longer, all black: the padding is white, so every extra pixel differs.
    const b = await png("b.png", 10, 20, (x, y) => (y < 10 ? 255 : 0));
    const result = await comparePngs(a, b, join(dir, "diff.png"));
    expect(result.diff).toBe(join(dir, "diff.png"));
    expect(result.mismatch).toBeCloseTo(0.5, 2);
    expect((await pixels(join(dir, "diff.png"))).info.height).toBe(20);
    expect(result.noise).toBe(false);
  });

  it("pads a wider picture too", async () => {
    const a = await png("a.png", 20, 10, () => 255);
    const b = await png("b.png", 10, 10, () => 255);
    expect(await comparePngs(a, b, join(dir, "diff.png"))).toEqual({ mismatch: 0, pixels: 0, noise: false });
  });

  it("doesn't count a channel moving by 4 levels or less", async () => {
    const a = await png("a.png", 10, 10, () => 200);
    const b = await png("b.png", 10, 10, () => 204);
    expect(await comparePngs(a, b, join(dir, "diff.png"))).toEqual({ mismatch: 0, pixels: 0, noise: false });
  });

  it("calls antialiasing-sized differences noise, and marks them red in the diff", async () => {
    const a = await png("a.png", 100, 100, () => 255);
    // Ten pixels a little darker: a total of 10 × 60, well under the limit.
    const b = await png("b.png", 100, 100, (x, y) => (y === 0 && x < 10 ? 195 : 255));
    const result = await comparePngs(a, b, join(dir, "diff.png"));
    expect(result).toMatchObject({ pixels: 10, noise: true });
    const { data } = await pixels(result.diff!);
    expect([...data.subarray(0, 4)]).toEqual([255, 0, 0, 255]);
    expect([...data.subarray(40, 44)]).toEqual([255, 255, 255, 255]);
  });

  it("counts a difference past either limit as a change", async () => {
    const a = await png("a.png", 100, 100, () => 255);
    // 40 pixels moving 255 levels: a total of 10,200, past 2,000.
    const total = await png("total.png", 100, 100, (x, y) => (y === 0 && x < 40 ? 0 : 255));
    expect((await comparePngs(a, total, join(dir, "1.png"))).noise).toBe(false);
    // 1,100 pixels moving 1 level past the floor each: a small total, but too many pixels.
    const wide = await png("wide.png", 100, 100, (x, y) => (y < 11 ? 250 : 255));
    expect((await comparePngs(a, wide, join(dir, "2.png"))).noise).toBe(false);
  });
});

describe("renderStoryboardPage", () => {
  it("embeds the data, with nothing that could close the script", async () => {
    const board = await pairRuns({ frames: [run("</script><b>", ["a"])] }, undefined, same);
    const html = renderStoryboardPage(board);
    expect(html).toContain("<title>Storyboard</title>");
    expect(html).toContain('<script id="data" type="application/json">');
    expect(html).toContain(
      '<script id="sections" type="application/json">[{"id":"public-pages","name":"Every public page"',
    );
    expect(html).not.toContain("</script><b>");
    expect(JSON.parse(html.match(/type="application\/json">([\s\S]*?)<\/script>/)![1])).toEqual(board);
  });

  it("titles itself with the run's time, and reads which run is newest, to link to it", async () => {
    const html = renderStoryboardPage(await pairRuns({ frames: [run("flow", ["a"])] }, undefined, same));
    expect(html).toContain('<script src="../../latest.js"></script>');
    expect(html).toContain('<a id="newer" href="../../index.html" hidden></a>');
    expect(html).toContain('"Storyboard " + isoLocal(new Date(data.generatedAt))');
    // The page's own script parses.
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    for (const script of scripts) expect(() => new Function(script)).not.toThrow();
  });
});
