import { describe, expect, it } from "vitest";
import {
  cacheKey,
  carryable,
  carryFlows,
  flowKey,
  listedFlows,
  mergeRun,
  missingFlows,
  picturedFlows,
  runFolder,
  selectFlows,
} from "./storyboard-main.mjs";

const run = (flow: string, extra: Partial<{ viewport: string; status: string; png: string; spec: string }> = {}) => ({
  section: "staff",
  spec: extra.spec ?? "s1",
  flow,
  viewport: extra.viewport ?? "desktop",
  line: 1,
  status: (extra.status ?? "passed") as "passed",
  frames: [{ caption: "a", png: extra.png ?? `main-run/frames/${flow}/frame-1.png` }],
});

describe("listedFlows", () => {
  it("keys every test Playwright lists, in nested describes too, by viewport, section and title, with its test-list line", () => {
    const list = {
      suites: [
        {
          specs: [
            {
              title: "log in",
              file: "staff.spec.ts",
              tests: [{ projectName: "desktop" }, { projectName: "phone" }],
            },
          ],
          suites: [
            {
              title: "mobile nav",
              specs: [{ title: "a menu", file: "mobile-nav.spec.ts", tests: [{ projectName: "phone" }] }],
            },
          ],
        },
        {},
      ],
    };
    expect([...listedFlows(list)]).toEqual([
      ["desktop|staff|log in", "[desktop] › staff.spec.ts › log in"],
      ["phone|staff|log in", "[phone] › staff.spec.ts › log in"],
      ["phone|mobile-nav|a menu", "[phone] › mobile-nav.spec.ts › mobile nav › a menu"],
    ]);
    expect(listedFlows({}).size).toBe(0);
  });
});

describe("cacheKey", () => {
  it("is main's commit and the suite's files, in any order", () => {
    const a = cacheKey("0123456789abcdef", [
      ["tests/a.ts", "1"],
      ["tests/b.ts", "2"],
    ]);
    expect(a).toMatch(/^0123456789ab-[0-9a-f]{12}$/);
    expect(
      cacheKey("0123456789abcdef", [
        ["tests/b.ts", "2"],
        ["tests/a.ts", "1"],
      ]),
    ).toBe(a);
  });

  it("changes with main's commit, a file's contents, or which files there are", () => {
    const files: [string, string][] = [["tests/a.ts", "1"]];
    const key = cacheKey("aaaaaaaaaaaa", files);
    expect(cacheKey("bbbbbbbbbbbb", files)).not.toBe(key);
    expect(cacheKey("aaaaaaaaaaaa", [["tests/a.ts", "2"]])).not.toBe(key);
    expect(cacheKey("aaaaaaaaaaaa", [["tests/b.ts", "1"]])).not.toBe(key);
  });
});

describe("missingFlows and selectFlows", () => {
  const cached = { frames: [run("log in"), run("letters")] };

  it("finds what a run wants that the cache doesn't have", () => {
    expect(missingFlows(cached, new Set(["desktop|staff|log in"]), { staff: "s1" })).toEqual([]);
    expect(missingFlows(cached, new Set(["desktop|staff|log in", "phone|staff|log in"]), { staff: "s1" })).toEqual([
      "phone|staff|log in",
    ]);
  });

  it("finds what the cache has from another version of its spec file", () => {
    expect(missingFlows(cached, new Set(["desktop|staff|log in"]), { staff: "s2" })).toEqual(["desktop|staff|log in"]);
    expect(missingFlows(cached, new Set(["desktop|staff|log in"]), {})).toEqual(["desktop|staff|log in"]);
  });

  it("keeps only the flows a run selected", () => {
    expect(selectFlows(cached, new Set([flowKey(run("letters"))])).frames.map((r) => r.flow)).toEqual(["letters"]);
  });

  it("points their pictures at the cache from the run's folder", () => {
    const blank = { ...run("blank"), frames: [{ caption: "none" }] };
    const selected = selectFlows(
      { frames: [run("letters", { png: "frames/l.png" }), blank] },
      new Set([flowKey(run("letters")), flowKey(blank)]),
      "../../cache/",
    );
    expect(selected.frames.map((r) => r.frames[0].png)).toEqual(["../../cache/frames/l.png", undefined]);
  });
});

describe("carryFlows", () => {
  it("puts a partial run's flows on top of the last run's", () => {
    const previous = { frames: [run("log in", { png: "old.png" }), run("letters")] };
    const fresh = { frames: [run("log in", { png: "new.png" }), run("history")] };
    expect(carryFlows(previous, fresh).frames.map((r) => [r.flow, r.frames[0].png])).toEqual([
      ["letters", "main-run/frames/letters/frame-1.png"],
      ["log in", "new.png"],
      ["history", "main-run/frames/history/frame-1.png"],
    ]);
  });
});

describe("carryable", () => {
  const suite = new Set(["desktop|staff|log in", "desktop|staff|letters"]);

  it("drops flows the suite no longer has", () => {
    const manifest = { frames: [run("log in"), run("renamed"), run("letters", { viewport: "phone" })] };
    expect(carryable(manifest, suite).frames.map((r) => r.flow)).toEqual(["log in"]);
  });

  it("drops flows with pictures under a foreign folder, when given one", () => {
    const manifest = { frames: [run("log in"), run("letters", { png: "main/frames/letters/frame-1.png" })] };
    expect(carryable(manifest, suite, "main-run/").frames.map((r) => r.flow)).toEqual(["letters"]);
    expect(carryable(manifest, suite).frames.map((r) => r.flow)).toEqual(["log in", "letters"]);
  });

  it("keeps a flow that has no pictures", () => {
    const manifest = { frames: [{ ...run("log in"), frames: [{ caption: "a" }] }] };
    expect(carryable(manifest, suite, "main-run/").frames).toHaveLength(1);
  });
});

describe("runFolder", () => {
  it("names a run by when it started, sortably and with nothing a path minds", () => {
    expect(runFolder("2026-10-17T08:30:12.345Z")).toBe("2026-10-17T08-30-12");
  });
});

describe("mergeRun", () => {
  it("replaces the flows a fresh run has, adds new ones, and moves their pictures into the cache", () => {
    const cached = { frames: [run("log in", { png: "../cache/frames/old.png" }), run("letters")] };
    const fresh = { frames: [run("log in"), run("history"), { ...run("blank"), frames: [{ caption: "none" }] }] };
    const merged = mergeRun(cached, fresh, "main-run/", "../cache/", { staff: "s2" });
    expect(merged.frames.map((r) => [r.flow, r.frames[0].png, r.spec])).toEqual([
      ["letters", "main-run/frames/letters/frame-1.png", "s1"],
      ["log in", "../cache/frames/log in/frame-1.png", "s2"],
      ["history", "../cache/frames/history/frame-1.png", "s2"],
      ["blank", undefined, "s2"],
    ]);
  });

  it("keeps a flow main failed, as main may not have it yet, but not one that timed out", () => {
    const fresh = { frames: [run("new flow", { status: "failed" }), run("slow", { status: "timedOut" })] };
    expect(mergeRun({ frames: [] }, fresh, "main-run/", "../cache/", {}).frames.map((r) => r.flow)).toEqual([
      "new flow",
    ]);
  });
});

describe("picturedFlows", () => {
  it("keeps the flows a run wants that took a picture on this branch", () => {
    const branch = {
      frames: [
        run("log in"),
        { ...run("redirects"), frames: [] },
        { ...run("blank"), frames: [{ caption: "none" }] },
        run("not wanted"),
      ],
    };
    const wanted = ["log in", "redirects", "blank", "absent"].map((flow) => flowKey(run(flow)));
    expect([...picturedFlows(branch, wanted)]).toEqual([flowKey(run("log in"))]);
  });
});
