#!/usr/bin/env node
// The storyboard review (docs/testing.md): runs the suite with screenshots,
// on both viewports, against a build of main as well as this branch, and
// opens the page that pairs every frame with main's.
//
//   npm run storyboard                      # origin/main (fetched first), both viewports, open the page
//   npm run storyboard -- --no-main         # this branch alone: frames without a comparison
//   npm run storyboard -- --main=<ref>      # compare with another branch
//   npm run storyboard -- --desktop         # or --phone: one viewport
//   npm run storyboard -- --no-open         # leave the page closed (an agent reads storyboard.json)
//   npm run storyboard -- --paths           # print each frame's caption and picture, to open one directly
//   npm run storyboard -- --server=URL      # a server you started for this branch (default: Playwright builds one on 3100)
//   npm run storyboard -- --main-server=URL # a server you started for main
//   npm run storyboard -- --fresh-main      # run main again even if its frames are kept (below)
//   npm run storyboard -- staff -g login    # anything else goes to `playwright test`
//
// Each run has its own folder, test-results/storyboard/runs/<when>/, with
// every picture it shows in it (main's as hard links from the cache), so a
// page you're looking at is never changed under you. When a run finishes,
// test-results/storyboard/latest points at it, and index.html beside it
// opens its page. The newest few runs are kept.
//
// A partial run (one that selects less than the whole suite: a section, -g,
// one viewport) starts from the latest run's frames, as hard links, and
// replaces the flows it runs: the review stays whole, each flow saying when
// it was shot. Flows gone from the suite aren't carried. A full run starts
// empty.
//
// Main's frames are kept in test-results/storyboard-main/, under main's
// commit and a hash of the suite (scripts/storyboard-main.mjs): a run whose
// flows are all there doesn't build or run main.
//
// A difference never fails; only this branch's checks do, and the exit code
// is theirs.
import { execFileSync, spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  linkSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { platform } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { LOCAL_URL, MAIN_OUTBOX_DIR, MAIN_URL } from "../tests/fixture-env.mjs";
import {
  cacheKey,
  carryable,
  carryFlows,
  listedFlows,
  mergeRun,
  missingFlows,
  runFolder,
  selectFlows,
} from "./storyboard-main.mjs";

const DIR = "test-results/storyboard";
const RUNS = join(DIR, "runs");
const LATEST = join(DIR, "latest");
const RUNS_KEEP = 3;
/** Main's kept frames, one folder per cache key; the newest few are kept. */
const MAIN_CACHE = "test-results/storyboard-main";
const MAIN_CACHE_KEEP = 3;

const options = {
  main: "origin/main",
  open: true,
  paths: false,
  projects: [],
  server: LOCAL_URL,
  mainServer: undefined,
  freshMain: false,
};
const passThrough = [];
for (const arg of process.argv.slice(2)) {
  if (arg === "--no-main") options.main = undefined;
  else if (arg.startsWith("--main=")) options.main = arg.slice("--main=".length);
  else if (arg === "--no-open") options.open = false;
  else if (arg === "--paths") options.paths = true;
  else if (arg === "--desktop" || arg === "--phone") options.projects.push(`--project=${arg.slice(2)}`);
  else if (arg.startsWith("--server=")) options.server = arg.slice("--server=".length);
  else if (arg.startsWith("--main-server=")) options.mainServer = arg.slice("--main-server=".length);
  else if (arg === "--fresh-main") options.freshMain = true;
  else passThrough.push(arg);
}

const runAt = new Date().toISOString();
const runDir = join(RUNS, runFolder(runAt));

/** Runs the suite against `url`, with screenshots, its frames going to runDir/<side>. Returns the exit code. */
function runSuite(side, url, extraEnv = {}) {
  console.log(`\n▶ Storyboard: ${side} (${url})\n`);
  const result = spawnSync(
    "npx",
    ["playwright", "test", `--output=test-results/playwright-storyboard-${side}`, ...options.projects, ...passThrough],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        LOCAL_URL: url,
        STORYBOARD_SHOTS: "1",
        STORYBOARD_DIR: runDir,
        STORYBOARD_SIDE: side,
        STORYBOARD_RUN_AT: runAt,
        ...extraEnv,
      },
    },
  );
  return result.status ?? 1;
}

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const writeJson = (file, data) => {
  // Removed first: in a carried run it may be a hard link to the last run's.
  rmSync(file, { force: true });
  writeFileSync(file, JSON.stringify(data, null, 2));
};

/** Copies a folder as hard links: instant, and no extra space. */
function linkTree(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    if (entry.isDirectory()) linkTree(join(from, entry.name), join(to, entry.name));
    else linkSync(join(from, entry.name), join(to, entry.name));
  }
}

/** The flows Playwright would run with `args`, listed without building anything. */
function listFlows(args) {
  const result = spawnSync("npx", ["playwright", "test", "--list", "--reporter=json", ...args], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, STORYBOARD_SHOTS: "1" },
  });
  if (result.status !== 0) throw new Error(`Couldn't list the flows:\n${result.stderr}`);
  return listedFlows(JSON.parse(result.stdout));
}

/**
 * Where main's frames for this run are kept: main's commit (fetched first,
 * as serve-main.mjs does) and everything of this branch's that decides what
 * the suite does against it. The pages' paths count, not their code: the
 * route list comes from them.
 */
function mainCacheDir(ref) {
  if (ref.startsWith("origin/")) {
    try {
      git("fetch", "--quiet", "origin");
    } catch {
      console.warn(`Couldn't fetch origin: using the last fetched ${ref}.`);
    }
  }
  const files = git(
    "ls-files",
    "-co",
    "--exclude-standard",
    "--",
    "tests",
    "playwright.config.ts",
    "lib/content",
    // Each flow's database, from this branch's migrations, and main's server.
    "scripts/fresh-database.mjs",
    "scripts/serve-main.mjs",
    "netlify/database/migrations",
    // The route list.
    "app/sitemap.ts",
  )
    .split("\n")
    .filter((path) => path && existsSync(path))
    .map((path) => [path, readFileSync(path, "utf8")]);
  const pages = git("ls-files", "-co", "--exclude-standard", "--", "app/**/page.tsx")
    .split("\n")
    .map((path) => [path, ""]);
  const playwright = ["@playwright/test", readJson("node_modules/@playwright/test/package.json").version];
  return join(MAIN_CACHE, cacheKey(git("rev-parse", ref), [...files, ...pages, playwright]));
}

/** Drops all but the newest `keep` folders in `dir`, never `current`. */
function prune(dir, keep, current) {
  const folders = readdirSync(dir)
    .map((name) => join(dir, name))
    .filter((path) => path !== current)
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  for (const folder of folders.slice(keep - 1)) rmSync(folder, { recursive: true, force: true });
}

/** Moves a fresh run of main (runDir/main-run) into the cache, replacing the flows it ran. */
function keepMainRun(cacheDir, cached) {
  const run = join(runDir, "main-run");
  const fresh = readJson(join(run, "frames.json"));
  mkdirSync(join(cacheDir, "frames"), { recursive: true });
  if (existsSync(join(run, "frames"))) {
    for (const folder of readdirSync(join(run, "frames"))) {
      const target = join(cacheDir, "frames", folder);
      rmSync(target, { recursive: true, force: true });
      renameSync(join(run, "frames", folder), target);
    }
  }
  rmSync(run, { recursive: true, force: true });
  // In the cache, pictures' paths are relative to its folder.
  const merged = mergeRun(cached, fresh, "main-run/", "");
  writeJson(join(cacheDir, "frames.json"), merged);
  return merged;
}

/** Polls `url` until it answers, or `timeoutMs` has passed. */
async function waitFor(url, child, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child?.exitCode !== null && child?.exitCode !== undefined)
      throw new Error(`The server for ${url} exited with ${child.exitCode}`);
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status < 500) return;
    } catch {
      // Not up yet.
    }
    await new Promise((done) => setTimeout(done, 1000));
  }
  throw new Error(`${url} didn't answer within ${timeoutMs / 1000}s`);
}

// The layout before runs had folders: one review, straight in DIR.
for (const old of ["branch", "main", "main-run", "diff", "storyboard.json"]) {
  rmSync(join(DIR, old), { recursive: true, force: true });
}

// The whole suite, and what this run selects: a run is partial when it leaves
// some of the suite out, whatever the arguments that did it.
const suite = listFlows([]);
const wanted = listFlows([...options.projects, ...passThrough]);
const partial = [...suite].some((key) => !wanted.has(key));
// A server someone started for main may not be the ref's commit: no cache then.
const usesCache = options.main !== undefined && !options.mainServer;

mkdirSync(runDir, { recursive: true });
const carried = partial && existsSync(join(LATEST, "branch")) ? LATEST : undefined;
if (carried) {
  console.log(`\n▶ Storyboard: a partial run; the other flows are carried from the latest run.\n`);
  linkTree(join(carried, "branch"), join(runDir, "branch"));
  if (existsSync(join(carried, "main"))) linkTree(join(carried, "main"), join(runDir, "main"));
  // Main's pictures, when a --main-server run kept them in the run. Not into a run that uses the
  // cache: they may not be the ref's, and everything in main-run/ is moved into the cache.
  if (!usesCache && existsSync(join(carried, "main-run")))
    linkTree(join(carried, "main-run"), join(runDir, "main-run"));
  // Flows gone from the suite go from the review, and a run using the cache drops main frames it didn't link.
  for (const [side, foreign] of [
    ["branch", undefined],
    ["main", usesCache ? "main-run/" : undefined],
  ]) {
    const file = join(runDir, side, "frames.json");
    if (existsSync(file)) writeJson(file, carryable(readJson(file), suite, foreign));
  }
}

if (options.main !== undefined) {
  const cacheDir = usesCache ? mainCacheDir(options.main) : undefined;
  const cacheFile = cacheDir && join(cacheDir, "frames.json");
  let cached = !options.freshMain && cacheFile && existsSync(cacheFile) ? readJson(cacheFile) : { frames: [] };
  const missing = missingFlows(cached, wanted);

  if (cacheDir && missing.length === 0) {
    console.log(`\n▶ Storyboard: main's ${wanted.size} flows are kept in ${cacheDir}; not running main.\n`);
  } else {
    if (cacheDir) console.log(`\n▶ Storyboard: running main for ${missing.length} flows it hasn't kept.\n`);
    let mainServer;
    let mainUrl = options.mainServer;
    if (!mainUrl) {
      mainUrl = MAIN_URL;
      const port = new URL(mainUrl).port || "80";
      mainServer = spawn("node", ["scripts/serve-main.mjs", "--ref", options.main, "--port", port], {
        stdio: "inherit",
      });
      // The first run installs main's dependencies as well as building it.
      await waitFor(mainUrl, mainServer, 900_000);
    }
    // Main may lack a flow, or a step of one: its failures are missing frames, not ours.
    runSuite("main-run", mainUrl, { OUTBOX_DIR: MAIN_OUTBOX_DIR });
    if (mainServer) {
      mainServer.kill("SIGTERM");
      await new Promise((done) => mainServer.on("exit", done));
    }
    if (cacheDir) {
      cached = keepMainRun(cacheDir, cached);
      prune(MAIN_CACHE, MAIN_CACHE_KEEP, cacheDir);
    } else {
      // No cache: the pictures stay in this run's folder, where the reporter put them.
      cached = readJson(join(runDir, "main-run", "frames.json"));
    }
  }
  // What the branch's reporter pairs with: this run's flows, and a carried run's main frames for the rest.
  // Main's pictures are linked into the run, so every path stays inside its folder: latest/ works, and
  // pruning the cache never breaks a run.
  const selected = selectFlows(cached, wanted, cacheDir ? "main/" : "");
  if (cacheDir) {
    for (const run of selected.frames) {
      for (const { png } of run.frames) {
        if (!png) continue;
        const to = join(runDir, png);
        mkdirSync(dirname(to), { recursive: true });
        rmSync(to, { force: true });
        linkSync(join(cacheDir, png.slice("main/".length)), to);
      }
    }
  }
  const carriedMain = carried && join(carried, "main", "frames.json");
  mkdirSync(join(runDir, "main"), { recursive: true });
  writeJson(
    join(runDir, "main", "frames.json"),
    carriedMain && existsSync(carriedMain) ? carryFlows(readJson(carriedMain), selected) : selected,
  );
}

const code = runSuite("branch", options.server);

const page = join(runDir, "index.html");
if (existsSync(page)) {
  // The run is whole: it becomes the latest, and the oldest go.
  const link = `${LATEST}.new`;
  rmSync(link, { force: true });
  symlinkSync(relative(DIR, runDir), link);
  renameSync(link, LATEST);
  // Opens this run's page by name, not through latest/, so a later run never changes it.
  writeFileSync(
    join(DIR, "index.html"),
    `<!doctype html><meta charset="utf-8"><title>Storyboard</title><meta http-equiv="refresh" content="0; url=${relative(DIR, page)}">`,
  );
  prune(RUNS, RUNS_KEEP, runDir);
}

if (options.paths) {
  try {
    const { frames } = readJson(join(runDir, "storyboard.json"));
    for (const f of frames) {
      if (!f.branch) continue;
      console.log(`${f.viewport} › ${f.section} › ${f.flow} › ${f.index}. ${f.caption}`);
      console.log(`  ${resolve(runDir, f.branch)}${f.diff ? `\n  diff: ${resolve(runDir, f.diff)}` : ""}`);
    }
  } catch {
    console.log("No storyboard.json: the run wrote no frames.");
  }
}

if (options.open && existsSync(page)) {
  const opener = platform() === "darwin" ? "open" : platform() === "win32" ? "start" : "xdg-open";
  spawn(opener, [resolve(page)], { stdio: "ignore", detached: true, shell: platform() === "win32" }).unref();
}
process.exit(code);
