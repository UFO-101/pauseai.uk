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
//   npm run storyboard -- --server=URL      # a server you started for this branch (default: Playwright builds one on 3100)
//   npm run storyboard -- --main-server=URL # a server you started for main
//   npm run storyboard -- staff -g login    # anything else goes to `playwright test`
//
// The page is test-results/storyboard/index.html, its data storyboard.json.
// A difference never fails; only this branch's checks do, and the exit code
// is theirs.
import { spawn, spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { platform } from "node:os";
import { join, resolve } from "node:path";
import { LOCAL_URL, MAIN_OUTBOX_DIR, MAIN_URL } from "../tests/fixture-env.mjs";

const DIR = "test-results/storyboard";

const options = { main: "origin/main", open: true, projects: [], server: LOCAL_URL, mainServer: undefined };
const passThrough = [];
for (const arg of process.argv.slice(2)) {
  if (arg === "--no-main") options.main = undefined;
  else if (arg.startsWith("--main=")) options.main = arg.slice("--main=".length);
  else if (arg === "--no-open") options.open = false;
  else if (arg === "--desktop" || arg === "--phone") options.projects.push(`--project=${arg.slice(2)}`);
  else if (arg.startsWith("--server=")) options.server = arg.slice("--server=".length);
  else if (arg.startsWith("--main-server=")) options.mainServer = arg.slice("--main-server=".length);
  else passThrough.push(arg);
}

/** Runs the suite against `url`, with screenshots, writing to DIR/<side>. Returns the exit code. */
function runSuite(side, url, extraEnv = {}) {
  console.log(`\n▶ Storyboard: ${side} (${url})\n`);
  const result = spawnSync(
    "npx",
    ["playwright", "test", `--output=${DIR}/${side}`, ...options.projects, ...passThrough],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        LOCAL_URL: url,
        STORYBOARD_SHOTS: "1",
        STORYBOARD_DIR: DIR,
        STORYBOARD_SIDE: side,
        ...extraEnv,
      },
    },
  );
  return result.status ?? 1;
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

rmSync(DIR, { recursive: true, force: true });

if (options.main !== undefined) {
  let mainServer;
  let mainUrl = options.mainServer;
  if (!mainUrl) {
    mainUrl = MAIN_URL;
    const port = new URL(mainUrl).port || "80";
    mainServer = spawn("node", ["scripts/serve-main.mjs", "--ref", options.main, "--port", port], { stdio: "inherit" });
    // The first run installs main's dependencies as well as building it.
    await waitFor(mainUrl, mainServer, 900_000);
  }
  // Main may lack a flow, or a step of one: its failures are missing frames, not ours.
  runSuite("main", mainUrl, { OUTBOX_DIR: MAIN_OUTBOX_DIR });
  if (mainServer) {
    mainServer.kill("SIGTERM");
    await new Promise((done) => mainServer.on("exit", done));
  }
}

const code = runSuite("branch", options.server);

const page = resolve(join(DIR, "index.html"));
if (options.open) {
  const opener = platform() === "darwin" ? "open" : platform() === "win32" ? "start" : "xdg-open";
  spawn(opener, [page], { stdio: "ignore", detached: true, shell: platform() === "win32" }).unref();
}
process.exit(code);
