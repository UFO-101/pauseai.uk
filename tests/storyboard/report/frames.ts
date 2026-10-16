// The storyboard's data: the frames one run of the suite recorded, and how
// they pair up with another run's (main's), for the page (page.ts) and for an
// agent (storyboard.json).
import { readFileSync, writeFileSync } from "node:fs";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

export type FlowStatus = "passed" | "failed" | "timedOut" | "interrupted";

/**
 * The sections in the order the page shows them: what a visitor sees first,
 * then what they do, then the staff's screens, then the mechanics. A section
 * not listed here goes after these, alphabetically, so a new spec file still
 * appears; frames.test.ts checks every spec file is listed, so it's placed
 * on purpose.
 */
export const SECTION_ORDER = [
  "public-pages",
  "campaigns",
  "staff",
  "collateral",
  "consent",
  "mobile-nav",
  "onboarding-embed",
  "scroll",
  "redirects",
];

/** A test as one run of the suite saw it, with its frames in order. */
export type FlowRun = {
  section: string;
  flow: string;
  viewport: string;
  /** The line the test starts on, so flows keep their spec file's order whatever order they ran in. */
  line: number;
  status: FlowStatus;
  /** The failure's first line, if it failed. */
  error?: string;
  frames: { caption: string; png?: string }[];
};

/** What one run of the suite wrote: `frames.json` in its output directory. */
export type RunManifest = { frames: FlowRun[] };

/** One frame of the storyboard, with this branch's picture and main's, paired by section, flow and caption. */
export type Frame = {
  section: string;
  flow: string;
  viewport: string;
  /** Its place in the flow, from 1. */
  index: number;
  caption: string;
  /** PNG paths, relative to the storyboard directory. */
  branch?: string;
  main?: string;
  diff?: string;
  /** The fraction of pixels that differ, 0 for identical; absent when one side has no picture. */
  mismatch?: number;
  /** Whether a person should look: differs, new on this branch, or gone from it. */
  changed: boolean;
  status: FlowStatus;
};

export type Flow = {
  section: string;
  flow: string;
  viewport: string;
  status: FlowStatus;
  error?: string;
  /** Main's status, when main ran the flow. */
  mainStatus?: FlowStatus;
  frames: number;
  changed: number;
};

export type Storyboard = {
  generatedAt: string;
  /** Whether there was a run of main to compare with. */
  withMain: boolean;
  summary: { flows: number; failed: number; frames: number; changed: number };
  flows: Flow[];
  frames: Frame[];
};

const key = (run: Pick<FlowRun, "section" | "flow" | "viewport">) =>
  `${run.section}\u0000${run.flow}\u0000${run.viewport}`;

const sectionRank = (section: string) => {
  const at = SECTION_ORDER.indexOf(section);
  return at === -1 ? SECTION_ORDER.length : at;
};

/** Section order, then the spec file's order, then the viewport: the workers finish flows in any order. */
export function sortRuns<T extends Pick<FlowRun, "section" | "line" | "flow" | "viewport">>(runs: T[]): T[] {
  return [...runs].sort(
    (a, b) =>
      sectionRank(a.section) - sectionRank(b.section) ||
      a.section.localeCompare(b.section) ||
      a.line - b.line ||
      a.flow.localeCompare(b.flow) ||
      a.viewport.localeCompare(b.viewport),
  );
}

/**
 * Pairs each frame of this branch's run with main's, by section, flow and
 * caption (the n-th frame with that caption, if a flow repeats one), and
 * compares the pictures with `compare`. Frames only main has are kept, as
 * gone from this branch.
 */
export function pairRuns(
  branch: RunManifest,
  main: RunManifest | undefined,
  compare: (branchPng: string, mainPng: string, name: string) => { mismatch: number; diff?: string },
): Storyboard {
  const mainRuns = new Map(sortRuns(main?.frames ?? []).map((run) => [key(run), run]));
  const flows: Flow[] = [];
  const frames: Frame[] = [];

  for (const run of sortRuns(branch.frames)) {
    const mainRun = mainRuns.get(key(run));
    mainRuns.delete(key(run));
    const mainFrames = [...(mainRun?.frames ?? [])];
    const flowFrames: Frame[] = run.frames.map((f, i) => {
      const at = mainFrames.findIndex((m) => m.caption === f.caption);
      const [paired] = at === -1 ? [] : mainFrames.splice(at, 1);
      const frame: Frame = {
        section: run.section,
        flow: run.flow,
        viewport: run.viewport,
        index: i + 1,
        caption: f.caption,
        branch: f.png,
        main: paired?.png,
        changed: false,
        status: run.status,
      };
      if (f.png && paired?.png) {
        const { mismatch, diff } = compare(f.png, paired.png, `${run.section}-${run.viewport}-${run.flow}-${i + 1}`);
        frame.mismatch = mismatch;
        frame.diff = diff;
        frame.changed = mismatch > 0;
      } else if (main && (f.png || paired?.png)) {
        // New on this branch, or main's run of the flow didn't get this far.
        frame.changed = true;
      }
      return frame;
    });
    // Frames main took that this branch no longer does.
    for (const gone of mainFrames) {
      flowFrames.push({
        section: run.section,
        flow: run.flow,
        viewport: run.viewport,
        index: flowFrames.length + 1,
        caption: gone.caption,
        main: gone.png,
        changed: true,
        status: run.status,
      });
    }
    frames.push(...flowFrames);
    flows.push({
      section: run.section,
      flow: run.flow,
      viewport: run.viewport,
      status: run.status,
      error: run.error,
      mainStatus: mainRun?.status,
      frames: flowFrames.length,
      changed: flowFrames.filter((f) => f.changed).length,
    });
  }

  // Flows main ran that this branch doesn't have at all.
  for (const gone of mainRuns.values()) {
    const flowFrames = gone.frames.map((f, i): Frame => ({
      section: gone.section,
      flow: gone.flow,
      viewport: gone.viewport,
      index: i + 1,
      caption: f.caption,
      main: f.png,
      changed: true,
      status: gone.status,
    }));
    frames.push(...flowFrames);
    flows.push({
      section: gone.section,
      flow: gone.flow,
      viewport: gone.viewport,
      status: gone.status,
      mainStatus: gone.status,
      frames: flowFrames.length,
      changed: flowFrames.length,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    withMain: main !== undefined,
    summary: {
      flows: flows.length,
      failed: flows.filter((f) => f.status !== "passed").length,
      frames: frames.length,
      changed: frames.filter((f) => f.changed).length,
    },
    flows,
    frames,
  };
}

/**
 * Compares two PNG files pixel by pixel, writing the differences to
 * `diffPath` if there are any. Pictures of different sizes are padded with
 * white, so the extra height shows as a difference rather than vanishing.
 */
export function comparePngs(
  branchPath: string,
  mainPath: string,
  diffPath: string,
): { mismatch: number; diff?: string } {
  const [a, b] = padToMatch(PNG.sync.read(readFileSync(branchPath)), PNG.sync.read(readFileSync(mainPath)));
  const diff = new PNG({ width: a.width, height: a.height });
  const mismatched = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 });
  if (mismatched === 0) return { mismatch: 0 };
  writeFileSync(diffPath, PNG.sync.write(diff));
  return { mismatch: mismatched / (a.width * a.height), diff: diffPath };
}

function padToMatch(a: PNG, b: PNG): [PNG, PNG] {
  const width = Math.max(a.width, b.width);
  const height = Math.max(a.height, b.height);
  const pad = (img: PNG) => {
    if (img.width === width && img.height === height) return img;
    const out = new PNG({ width, height });
    out.data.fill(255);
    PNG.bitblt(img, out, 0, 0, img.width, img.height, 0, 0);
    return out;
  };
  return [pad(a), pad(b)];
}
