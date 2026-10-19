import type { KnipConfig } from "knip";

// Unused files, exports and dependencies (npm run lint:unused). Knip finds
// most entry points itself, from Next, Vitest, Playwright and package.json.
const config: KnipConfig = {
  // A type exported for the signature of something else exported from its
  // file is part of that file's interface, even if nothing names it yet.
  ignoreExportsUsedInFile: { interface: true, type: true },
  // The backup Worker and its container: a package of its own, with its own
  // packages, which CI's lint job doesn't install (backup/README.md).
  ignore: ["backup/**"],
  workspaces: {
    ".": {
      // scripts/storyboard.mjs starts this with spawn(), which Knip can't follow.
      entry: ["scripts/serve-main.mjs", "!app/[(]tools[)]/gallery/**"],
      // The component gallery imports every component, so it would make them all
      // look used: it's left out of the graph altogether. tests/checks/gallery.test.ts
      // checks the other direction, that every component has an example there.
      project: ["**/*.{js,mjs,cjs,ts,tsx}", "!app/[(]tools[)]/gallery/**"],
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
    },
  },
};

export default config;
