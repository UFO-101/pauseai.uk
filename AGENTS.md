# Agent notes

## Next.js version may be beyond your knowledge cutoff

This project pins a Next.js version in `package.json` that may be newer than your training data (e.g. Next.js 16+). Do **not** assume APIs, defaults, or best practices from an older version you remember. When working with Next.js here:

- Check the pinned version in `package.json` first.
- Verify framework APIs against the installed version (`node_modules/next`) or official docs rather than memory.
- Match the conventions already used in `app/` rather than introducing patterns from an earlier major version.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
