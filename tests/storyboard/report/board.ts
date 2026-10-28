// The storyboard of a review run: this branch's frames (branch/frames.json in
// the run's folder) paired with main's (main/frames.json), written as
// storyboard.json and index.html beside them. scripts/storyboard.mjs calls it
// once both sides have run, so it imports with their extensions, as Node
// runs TypeScript.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { comparePngs, pairRuns, type RunManifest, type Storyboard } from "./frames.ts";
import { renderStoryboardPage } from "./page.ts";

/** Pictures compared at once. Each pair that differs is decoded whole: a tall page is hundreds of megabytes. */
const AT_ONCE = 4;

export async function writeStoryboard(dir: string): Promise<Storyboard> {
  const manifest = (side: string): RunManifest | undefined => {
    const file = join(dir, side, "frames.json");
    return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : undefined;
  };
  const diffDir = join(dir, "diff");
  mkdirSync(diffDir, { recursive: true });
  const compare = limited(AT_ONCE, async (branchPng: string, mainPng: string, name: string) => {
    const diffPath = join(diffDir, `${name.replace(/[^\w.-]+/g, "_")}.png`);
    const result = await comparePngs(join(dir, branchPng), join(dir, mainPng), diffPath);
    return { mismatch: result.mismatch, noise: result.noise, diff: result.diff && relative(dir, result.diff) };
  });
  const storyboard = await pairRuns(manifest("branch") ?? { frames: [] }, manifest("main"), compare);
  writeFileSync(join(dir, "storyboard.json"), JSON.stringify(storyboard, null, 2));
  writeFileSync(join(dir, "index.html"), renderStoryboardPage(storyboard));
  return storyboard;
}

/** `run`, with no more than `max` calls under way at a time; the rest wait their turn. */
function limited<A extends unknown[], R>(max: number, run: (...args: A) => Promise<R>): (...args: A) => Promise<R> {
  let running = 0;
  const waiting: (() => void)[] = [];
  return async (...args) => {
    if (running >= max) await new Promise<void>((go) => waiting.push(go));
    running++;
    try {
      return await run(...args);
    } finally {
      running--;
      waiting.shift()?.();
    }
  };
}
