#!/usr/bin/env node
// Builds and serves another branch of the site (origin/main, by default) on
// fixture data, for the storyboard's comparison (scripts/storyboard.mjs).
// Local only.
//
//   node scripts/serve-main.mjs [--ref origin/main] [--port 3001]
//
// It keeps a git worktree of the branch outside the repo, updated to the
// branch's latest commit each time, installs that branch's own dependencies
// when its package-lock.json changes, gives it a fresh database if that
// branch has one, builds it with the same fixture settings as this branch's
// test build, and serves it until stopped.
import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fixtureEnv, MAIN_OUTBOX_DIR } from "../tests/fixture-env.mjs";
import { testServerUrl } from "./fresh-database.mjs";

function option(name, fallback) {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? fallback : process.argv[at + 1];
}

const ref = option("ref", "origin/main");
const port = option("port", "3001");
const run = (command, args, options = {}) => execFileSync(command, args, { stdio: "inherit", ...options });

// A remote ref is fetched first, so the comparison is with what's there
// now, not what was last fetched. Offline, the last fetch will do.
if (ref.startsWith("origin/")) {
  try {
    run("git", ["fetch", "--quiet", "origin"]);
  } catch {
    console.warn(`Couldn't fetch origin: comparing with the last fetched ${ref}.`);
  }
}
const dir = join(tmpdir(), `pauseai-${ref.replace(/[^\w-]/g, "-")}-worktree`);

// The ref's latest commit, in a worktree kept between runs so its
// node_modules can stay inside it. One the repo no longer knows (pruned, or
// the repo moved) is made again from scratch.
if (existsSync(join(dir, ".git"))) {
  try {
    execFileSync("git", ["rev-parse", "--git-dir"], { cwd: dir, stdio: "ignore" });
  } catch {
    console.log(`${dir} is no longer a worktree of this repo: making it again.`);
    rmSync(dir, { recursive: true, force: true });
    run("git", ["worktree", "prune"]);
  }
}
if (existsSync(join(dir, ".git"))) {
  run("git", ["checkout", "--detach", "--force", ref], { cwd: dir });
  run("git", ["clean", "-fdx", "-e", "node_modules"], { cwd: dir });
} else {
  run("git", ["worktree", "add", "--detach", "--force", dir, ref]);
}

// Its own dependencies, reinstalled only when its lockfile changes.
const lock = readFileSync(join(dir, "package-lock.json"), "utf8");
const stamp = join(dir, "node_modules", ".installed-lock");
if (!existsSync(stamp) || readFileSync(stamp, "utf8") !== lock) {
  run("npm", ["ci", "--no-audit", "--no-fund"], { cwd: dir });
  writeFileSync(stamp, lock);
}

const env = { ...process.env, ...fixtureEnv({ outboxDir: MAIN_OUTBOX_DIR }) };
// The same test Postgres as this branch's (`db-test`, say), which the
// worktree's own copy of the database script can't find in our .env.local.
const testServer = testServerUrl();
if (testServer) env.TEST_DATABASE_URL = testServer;
// A fresh database, if this version of the site has one.
const freshDatabase = join(dir, "scripts", "fresh-database.mjs");
if (existsSync(freshDatabase)) {
  env.NETLIFY_DB_URL = execFileSync(
    "node",
    [freshDatabase, "pauseai_storyboard_main", "--test-mp", env.TEST_MP_EMAIL],
    {
      cwd: dir,
      encoding: "utf8",
    },
  ).trim();
}

// next build directly, not npm run build, which runs the unit tests first.
run("npx", ["next", "build"], { cwd: dir, env });
// In its own process group, so stopping this script stops the server too:
// a signal to `next` alone leaves the server it starts running on the port,
// and the next review's run of main then hits a stale build.
const server = spawn(join(dir, "node_modules", ".bin", "next"), ["start", "--port", port], {
  cwd: dir,
  env,
  stdio: "inherit",
  detached: true,
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => process.kill(-server.pid, signal));
server.on("exit", (code) => process.exit(code ?? 0));
