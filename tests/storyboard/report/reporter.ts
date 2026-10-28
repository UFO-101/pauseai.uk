import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import type { Reporter, TestCase, TestResult } from "@playwright/test/reporter";
import { carryRuns, type FlowRun, type RunManifest } from "./frames.ts";

// Collects the frames (tests/storyboard/frame.ts) of every flow into
// STORYBOARD_DIR/<side>/: their pictures, and `frames.json`, which
// board.ts pairs with the other side's. scripts/storyboard.mjs sets
// STORYBOARD_DIR (the run's folder), STORYBOARD_SIDE ("branch", or
// "main-run") and STORYBOARD_RUN_AT; the gate sets none, and this reporter
// then does nothing.
//
// A partial run's branch folder starts as hard links to the last run's, so
// the flows it doesn't run are carried. Every file is removed before it's
// written: writing into a hard link would change the last run's too.

export default class StoryboardReporter implements Reporter {
  private dir = process.env.STORYBOARD_DIR;
  private side = process.env.STORYBOARD_SIDE ?? "branch";
  private shotAt = process.env.STORYBOARD_RUN_AT;
  private runs: FlowRun[] = [];

  onTestEnd(test: TestCase, result: TestResult) {
    if (!this.dir || result.status === "skipped") return;
    const section = basename(test.location.file).replace(/\.spec\.ts$/, "");
    const viewport = test.parent.project()?.name ?? "";
    // The frames' pictures, attached as bytes (frame.ts). A carried flow's folder goes first.
    const folder = join(
      this.dir,
      this.side,
      "frames",
      `${section}-${viewport}-${test.title}`.replace(/[^\w.-]+/g, "-"),
    );
    rmSync(folder, { recursive: true, force: true });
    const pngs = new Map<string, string>();
    for (const a of result.attachments) {
      if (!a.name.startsWith("frame ") || !a.body) continue;
      const file = join(folder, `${a.name.split(":")[0].replace(" ", "-")}.png`);
      mkdirSync(folder, { recursive: true });
      writeFileSync(file, a.body);
      pngs.set(a.name.split(":")[0], relative(this.dir, file));
    }
    this.runs.push({
      section,
      flow: test.title,
      viewport,
      line: test.location.line,
      status: result.status,
      error: result.error?.message?.split("\n")[0],
      frames: test.annotations
        .filter((a) => a.type === "frame")
        .map((a, i) => ({ caption: a.description ?? "", png: pngs.get(`frame ${i + 1}`) })),
      shotAt: this.shotAt,
    });
  }

  onEnd() {
    if (!this.dir) return;
    const sideDir = join(this.dir, this.side);
    mkdirSync(sideDir, { recursive: true });
    const file = join(sideDir, "frames.json");
    const fresh: RunManifest = { frames: this.runs };
    // Only the branch's side carries: main-run holds what this run shot of main, and nothing else.
    const manifest =
      this.side === "branch" && existsSync(file) ? carryRuns(JSON.parse(readFileSync(file, "utf8")), fresh) : fresh;
    rmSync(file, { force: true });
    writeFileSync(file, JSON.stringify(manifest, null, 2));
  }
}
