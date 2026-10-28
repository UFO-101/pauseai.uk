// The storyboard's data: the frames one run of the suite recorded, and how
// they pair up with another run's (main's), for the page (page.ts) and for an
// agent (storyboard.json).
import { readFileSync } from "node:fs";
import sharp from "sharp";

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
  "gallery",
  "campaigns",
  "march-signup",
  "home-events",
  "staff",
  "politicians",
  "mailings",
  "supporters",
  "permissions",
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
  /** When the run that shot it started: a partial run carries the flows it didn't run from the last one. */
  shotAt?: string;
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
  /** Differs from main's, but only by noise (CHANNEL_NOISE and the limits below it): not changed. */
  noise?: boolean;
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
  /** When the run that shot it started (FlowRun's). */
  shotAt?: string;
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
 * A partial run's flows on top of the last run's: each flow it ran replaces
 * that flow, and the rest are carried as they were, so the review stays whole.
 */
export function carryRuns(previous: RunManifest, fresh: RunManifest): RunManifest {
  const ran = new Set(fresh.frames.map(key));
  return { frames: [...previous.frames.filter((run) => !ran.has(key(run))), ...fresh.frames] };
}

/**
 * Pairs each frame of this branch's run with main's, by section, flow and
 * caption (the n-th frame with that caption, if a flow repeats one), and
 * compares the pictures with `compare`, all at once. Frames only main has are
 * kept, as gone from this branch.
 */
export async function pairRuns(
  branch: RunManifest,
  main: RunManifest | undefined,
  compare: (
    branchPng: string,
    mainPng: string,
    name: string,
  ) => Promise<{ mismatch: number; noise: boolean; diff?: string }>,
): Promise<Storyboard> {
  const mainRuns = new Map(sortRuns(main?.frames ?? []).map((run) => [key(run), run]));
  const flows: { flow: Flow; frames: Frame[] }[] = [];
  const comparisons: Promise<void>[] = [];

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
        comparisons.push(
          compare(f.png, paired.png, `${run.section}-${run.viewport}-${run.flow}-${i + 1}`).then(
            ({ mismatch, noise, diff }) => {
              frame.mismatch = mismatch;
              frame.diff = diff;
              if (noise) frame.noise = true;
              frame.changed = mismatch > 0 && !noise;
            },
          ),
        );
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
    flows.push({
      flow: {
        section: run.section,
        flow: run.flow,
        viewport: run.viewport,
        status: run.status,
        error: run.error,
        mainStatus: mainRun?.status,
        frames: flowFrames.length,
        changed: 0,
        shotAt: run.shotAt,
      },
      frames: flowFrames,
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
    flows.push({
      flow: {
        section: gone.section,
        flow: gone.flow,
        viewport: gone.viewport,
        status: gone.status,
        mainStatus: gone.status,
        frames: flowFrames.length,
        changed: 0,
      },
      frames: flowFrames,
    });
  }

  await Promise.all(comparisons);
  for (const { flow, frames } of flows) flow.changed = frames.filter((f) => f.changed).length;
  const frames = flows.flatMap((f) => f.frames);
  return {
    generatedAt: new Date().toISOString(),
    withMain: main !== undefined,
    summary: {
      flows: flows.length,
      failed: flows.filter((f) => f.flow.status !== "passed").length,
      frames: frames.length,
      changed: frames.filter((f) => f.changed).length,
    },
    flows: flows.map((f) => f.flow),
    frames,
  };
}

/**
 * How two pictures may differ and still count as the same, as toucan's
 * snapshot gallery does (https://git.sr.ht/~frabcus/toucan,
 * platform/snapshots/png.ts and engine.ts). A pixel differs when a channel
 * moves by more than CHANNEL_NOISE levels. A frame has changed when its
 * differing pixels' largest channel moves add up to more than NOISE_TOTAL,
 * or more than NOISE_PIXELS pixels differ, counted in CSS pixels, as
 * every frame is pictured (tests/storyboard/frame.ts). Antialiasing on a
 * few glyphs adds up to a few thousand; a line that moves, millions. Below
 * the limits the frame is "noise": shown, with its diff, but not counted as
 * changed.
 */
const CHANNEL_NOISE = 4;
const NOISE_TOTAL = 2_000;
const NOISE_PIXELS = 1_000;

export type Comparison = {
  /** The fraction of pixels that differ, 0 for identical. */
  mismatch: number;
  /** How many pixels differ. */
  pixels: number;
  /** Differs, but within the noise limits. */
  noise: boolean;
  /** The diff picture, if they differ: the branch's picture faded, the differing pixels red. */
  diff?: string;
};

/**
 * Compares two PNG files pixel by pixel, writing the differences to
 * `diffPath` if there are any. Identical files are the same without being
 * decoded, which is most frames of most runs. Pictures of different sizes
 * are padded with white, so the extra height shows as a difference rather
 * than vanishing.
 */
export async function comparePngs(branchPath: string, mainPath: string, diffPath: string): Promise<Comparison> {
  const same: Comparison = { mismatch: 0, pixels: 0, noise: false };
  if (readFileSync(branchPath).equals(readFileSync(mainPath))) return same;
  const [a, b] = padToMatch(await rgba(branchPath), await rgba(mainPath));
  let pixels = 0;
  let total = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    const move = channelMove(a.data, b.data, i);
    if (move > CHANNEL_NOISE) {
      pixels++;
      total += move;
    }
  }
  if (pixels === 0) return same;
  const diff = Buffer.alloc(a.data.length);
  for (let i = 0; i < a.data.length; i += 4) {
    // Red where they differ; elsewhere the branch's picture, faded towards white so the red stands out.
    const grey = 255 - Math.round((255 - (a.data[i] + a.data[i + 1] + a.data[i + 2]) / 3) * 0.2);
    const red = channelMove(a.data, b.data, i) > CHANNEL_NOISE;
    diff[i] = red ? 255 : grey;
    diff[i + 1] = red ? 0 : grey;
    diff[i + 2] = red ? 0 : grey;
    diff[i + 3] = 255;
  }
  await sharp(diff, { raw: { width: a.width, height: a.height, channels: 4 } })
    .png()
    .toFile(diffPath);
  return {
    mismatch: pixels / (a.width * a.height),
    pixels,
    noise: total <= NOISE_TOTAL && pixels <= NOISE_PIXELS,
    diff: diffPath,
  };
}

/** A decoded picture: four bytes a pixel, red, green, blue and alpha. */
type Rgba = { width: number; height: number; data: Buffer };

async function rgba(path: string): Promise<Rgba> {
  const { data, info } = await sharp(path, { limitInputPixels: false })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data };
}

/** The pixel at byte `i`'s largest channel move between the two pictures. */
function channelMove(a: Buffer, b: Buffer, i: number): number {
  return Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
}

function padToMatch(a: Rgba, b: Rgba): [Rgba, Rgba] {
  const width = Math.max(a.width, b.width);
  const height = Math.max(a.height, b.height);
  const pad = (img: Rgba): Rgba => {
    if (img.width === width && img.height === height) return img;
    const data = Buffer.alloc(width * height * 4, 255);
    for (let y = 0; y < img.height; y++) {
      img.data.copy(data, y * width * 4, y * img.width * 4, (y + 1) * img.width * 4);
    }
    return { width, height, data };
  };
  return [pad(a), pad(b)];
}
