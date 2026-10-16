import type { KnipConfig } from "knip";

// Unused files, exports and dependencies (npm run lint:unused). Knip finds
// most entry points itself, from Next, Vitest, Playwright and package.json.
const config: KnipConfig = {
  // scripts/storyboard.mjs starts this with spawn(), which Knip can't follow.
  entry: ["scripts/serve-main.mjs"],
  ignoreDependencies: [
    // Nothing imports it: having it installed is what gives Netlify deploys
    // a database.
    "@netlify/database",
    // Comes with next, at the same version. scripts/db-reset.mjs loads
    // .env.local with it, as next does.
    "@next/env",
  ],
  // Postgres's own tools, installed with Postgres rather than from npm.
  ignoreBinaries: ["pg_dump", "psql"],
  // A type exported for the signature of something else exported from its
  // file is part of that file's interface, even if nothing names it yet.
  ignoreExportsUsedInFile: { interface: true, type: true },
};

export default config;
