// Main's side of the storyboard review, kept between runs (scripts/storyboard.mjs).
//
// Main's frames depend on main's code and on this branch's suite, which
// drives main's server: its fixtures, route list and each flow's spec file.
// So they're kept under a key of main's commit and the suite's shared files,
// test-results/storyboard-main/<key>/, each flow with a hash of its spec
// file. A run whose flows are all there with their spec file unchanged
// doesn't build or run main at all; one that needs others runs main for
// those alone and adds them. `--fresh-main` ignores the cache.
//
// Plain JavaScript, as scripts/storyboard.mjs imports it with Node.
import { createHash } from "node:crypto";
import { basename } from "node:path";

/** A flow's identity across runs: its viewport, section and title. */
export function flowKey({ viewport, section, flow }) {
  return `${viewport}|${section}|${flow}`;
}

/**
 * The flows `playwright test --list --reporter=json` would run, by key, each
 * with its line for a file that `playwright test --test-list` reads. Keys
 * have the test's own title, as the reporter records it; the line, its
 * describe path too.
 */
export function listedFlows(list) {
  const flows = new Map();
  const visit = (suite, describes) => {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests) {
        const section = basename(spec.file).replace(/\.spec\.ts$/, "");
        const line = [`[${test.projectName}]`, spec.file, ...describes, spec.title].join(" › ");
        flows.set(flowKey({ viewport: test.projectName, section, flow: spec.title }), line);
      }
    }
    for (const child of suite.suites ?? []) visit(child, [...describes, child.title]);
  };
  // The top level is the files, whose titles aren't in the path.
  for (const suite of list.suites ?? []) visit(suite, []);
  return flows;
}

/** The cache's key: main's commit and a hash of the suite's files, given as [path, contents] pairs. */
export function cacheKey(commit, files) {
  const hash = createHash("sha256");
  for (const [path, contents] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
    hash.update(path).update("\0").update(contents).update("\0");
  }
  return `${commit.slice(0, 12)}-${hash.digest("hex").slice(0, 12)}`;
}

/**
 * The flows `wanted` (keys) that the cached manifest doesn't have, or has
 * from a different version of their spec file: `specs` is each section's
 * hash, as mergeRun records it.
 */
export function missingFlows(cached, wanted, specs) {
  const have = new Set(cached.frames.filter((run) => run.spec === specs[run.section]).map(flowKey));
  return [...wanted].filter((key) => !have.has(key));
}

/**
 * Adds a fresh run of main to the cached manifest: each flow it ran replaces
 * the cached one, with its spec file's hash from `specs`, and its pictures'
 * paths change their `from` prefix to `to`. A flow that timed out or was
 * interrupted isn't kept, so the next run tries it again; one that failed
 * is, as main may simply not have it yet.
 */
export function mergeRun(cached, fresh, from, to, specs) {
  const kept = fresh.frames
    .filter((run) => run.status === "passed" || run.status === "failed")
    .map((run) => ({
      ...run,
      spec: specs[run.section],
      frames: run.frames.map((f) => (f.png ? { ...f, png: to + f.png.slice(from.length) } : f)),
    }));
  const replaced = new Set(kept.map(flowKey));
  return { frames: [...cached.frames.filter((run) => !replaced.has(flowKey(run))), ...kept] };
}

/**
 * The flows of `wanted` (keys) that this branch's run pictured: main is run
 * only for those, as a flow with no frames has nothing to compare.
 */
export function picturedFlows(branch, wanted) {
  const pictured = new Set(branch.frames.filter((run) => run.frames.some((f) => f.png)).map(flowKey));
  return new Set([...wanted].filter((key) => pictured.has(key)));
}

/**
 * Only the flows this run selected, so a partial run doesn't show the rest
 * as gone from the branch, their pictures' paths prefixed with `prefix`.
 */
export function selectFlows(manifest, wanted, prefix = "") {
  return {
    frames: manifest.frames
      .filter((run) => wanted.has(flowKey(run)))
      .map((run) => ({ ...run, frames: run.frames.map((f) => (f.png ? { ...f, png: prefix + f.png } : f)) })),
  };
}

/** A partial run's flows on top of the last run's, each replacing its namesake. */
export function carryFlows(previous, fresh) {
  const ran = new Set(fresh.frames.map(flowKey));
  return { frames: [...previous.frames.filter((run) => !ran.has(flowKey(run))), ...fresh.frames] };
}

/**
 * A carried manifest, less what the run can't trust: flows the suite no
 * longer has (renamed or deleted), and, when `foreign` is given, flows whose
 * pictures are under it (a --main-server run's, which may not be main).
 */
export function carryable(manifest, suite, foreign) {
  return {
    frames: manifest.frames.filter(
      (run) => suite.has(flowKey(run)) && !(foreign && run.frames.some((f) => f.png?.startsWith(foreign))),
    ),
  };
}

/** A run's folder name, from when it started: sortable, and safe in a path. */
export function runFolder(startedAt) {
  return startedAt.replace(/\.\d+Z$/, "").replace(/:/g, "-");
}
