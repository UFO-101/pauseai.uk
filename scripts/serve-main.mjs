#!/usr/bin/env node
// Builds and serves another branch of the site (main, by default) on fixture
// data, for the fixtures-vs-main screenshot comparison
// (tests/fixtures-vs-main/). Local only.
//
//   node scripts/serve-main.mjs [--ref main] [--port 3001]
//
// It keeps a git worktree of the branch outside the repo, updated to the
// branch's latest commit each time, installs that branch's own dependencies
// when its package-lock.json changes, gives it a fresh database if that
// branch has one, builds it with the same fixture settings as this branch's
// test build, and serves it until stopped.
import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fixtureEnv, MAIN_OUTBOX_DIR } from "../tests/fixture-env.mjs";

function option(name, fallback) {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? fallback : process.argv[at + 1];
}

const ref = option("ref", "main");
const port = option("port", "3001");
const dir = join(tmpdir(), `pauseai-${ref.replace(/[^\w-]/g, "-")}-worktree`);

const run = (command, args, options = {}) => execFileSync(command, args, { stdio: "inherit", ...options });

// The ref's latest commit, in a worktree kept between runs so its
// node_modules can stay inside it.
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
// A fresh database, if this version of the site has one.
const freshDatabase = join(dir, "scripts", "fresh-database.mjs");
if (existsSync(freshDatabase)) {
  env.NETLIFY_DB_URL = execFileSync("node", [freshDatabase, "pauseai_fixtures_main", "--test-mp", env.TEST_MP_EMAIL], {
    cwd: dir,
    encoding: "utf8",
  }).trim();
}

// next build directly, not npm run build, which runs the unit tests first.
run("npx", ["next", "build"], { cwd: dir, env });
const server = spawn("npx", ["next", "start", "--port", port], { cwd: dir, env, stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal));
server.on("exit", (code) => process.exit(code ?? 0));
