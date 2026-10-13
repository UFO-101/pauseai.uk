# Agent notes

Read `README.md` first. It links the docs in `docs/`, including the code structure (`docs/code-structure.md`) and test policy (`docs/testing.md`). Plans are in `plans/`.

## Scratch files

Put throwaway scripts, logs and screenshots in `tmp/` at the repo root. It's gitignored, and scripts there can import the project's `node_modules` (e.g. `@playwright/test`, `sharp`). Long-running checks, such as probing the site in Chromium, Firefox and WebKit, can run in the background and write their output there.

## Next.js version may be beyond your knowledge cutoff

This project pins a Next.js version in `package.json` that may be newer than your training data (e.g. Next.js 16+). Do **not** assume APIs, defaults, or best practices from an older version you remember. When working with Next.js here:

- Check the pinned version in `package.json` first.
- Verify framework APIs against the installed version (`node_modules/next`) or official docs rather than memory.
- Match the conventions already used in `app/` rather than introducing patterns from an earlier major version.

## Never write final copy

People write the words visitors and recipients read: page text, letters, emails, form labels and messages. When code needs copy that doesn't exist yet, write a placeholder. Start it with ⁂ and write it in Latin, e.g. "⁂ Lorem ipsum dolor sit amet", so it can't be mistaken for the real thing.

`placeholder-copy.test.ts` fails while ⁂ appears anywhere in the repo outside this file. So placeholders can't be merged by accident.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
