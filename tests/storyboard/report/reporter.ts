import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import type { FullConfig, Reporter, TestCase, TestResult } from "@playwright/test/reporter";
import { comparePngs, pairRuns, type FlowRun, type RunManifest } from "./frames";
import { renderStoryboardPage } from "./page";

// Collects the frames (tests/storyboard/frame.ts) of every flow into
// `frames.json` in the run's output directory, and, for this branch's run,
// pairs them with main's and writes the storyboard: `storyboard.json` and
// `index.html` in STORYBOARD_DIR. scripts/storyboard.mjs sets STORYBOARD_DIR
// and STORYBOARD_SIDE ("main" or "branch"); the gate sets neither, and this
// reporter then does nothing.

export default class StoryboardReporter implements Reporter {
  private dir = process.env.STORYBOARD_DIR;
  private side = process.env.STORYBOARD_SIDE ?? "branch";
  private outputDir = "";
  private runs: FlowRun[] = [];
  /** Each project's device pixel ratio, by its name ("phone": 3), which the noise limits scale by. */
  private scales = new Map<string, number>();

  onBegin(config: FullConfig) {
    this.outputDir = config.projects[0]?.outputDir ?? "";
    for (const project of config.projects) this.scales.set(project.name, project.use.deviceScaleFactor ?? 1);
  }

  onTestEnd(test: TestCase, result: TestResult) {
    if (!this.dir || result.status === "skipped") return;
    const section = basename(test.location.file).replace(/\.spec\.ts$/, "");
    const viewport = test.parent.project()?.name ?? "";
    // The frames' pictures, attached as bytes (frame.ts), written under the run's output directory.
    const folder = join(this.outputDir, "frames", `${section}-${viewport}-${test.title}`.replace(/[^\w.-]+/g, "-"));
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
    });
  }

  onEnd() {
    if (!this.dir) return;
    mkdirSync(this.outputDir, { recursive: true });
    const manifest: RunManifest = { frames: this.runs };
    writeFileSync(join(this.outputDir, "frames.json"), JSON.stringify(manifest, null, 2));
    if (this.side !== "branch") return;

    const mainManifest = join(this.dir, "main", "frames.json");
    const main: RunManifest | undefined = existsSync(mainManifest)
      ? JSON.parse(readFileSync(mainManifest, "utf8"))
      : undefined;
    const diffDir = join(this.dir, "diff");
    mkdirSync(diffDir, { recursive: true });
    const storyboard = pairRuns(manifest, main, (branchPng, mainPng, name, viewport) => {
      const diffPath = join(diffDir, `${name.replace(/[^\w.-]+/g, "_")}.png`);
      const scale = this.scales.get(viewport) ?? 1;
      const result = comparePngs(join(this.dir!, branchPng), join(this.dir!, mainPng), diffPath, scale);
      return { mismatch: result.mismatch, noise: result.noise, diff: result.diff && relative(this.dir!, result.diff) };
    });
    writeFileSync(join(this.dir, "storyboard.json"), JSON.stringify(storyboard, null, 2));
    writeFileSync(join(this.dir, "index.html"), renderStoryboardPage(storyboard));
    const { summary } = storyboard;
    console.log(
      `\nStoryboard: ${summary.frames} frames in ${summary.flows} flows, ${
        main ? `${summary.changed} changed against main` : "no run of main to compare with"
      }${summary.failed ? `, ${summary.failed} failed` : ""}. ${join(this.dir, "index.html")}\n`,
    );
  }
}
