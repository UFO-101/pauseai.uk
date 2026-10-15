# Agent notes

Read `README.md` first. It links the docs in `docs/`, including the code structure (`docs/code-structure.md`) and test policy (`docs/testing.md`). Plans are in `plans/`.

## Scratch files

Put throwaway scripts, logs and screenshots in `tmp/` at the repo root. It's gitignored, and scripts there can import the project's `node_modules` (e.g. `@playwright/test`, `sharp`). Long-running checks, such as probing the site in Chromium, Firefox and WebKit, can run in the background and write their output there.

## Before you commit: the CI gate

Run everything CI runs (`.github/workflows/ci.yml`), and only commit when every command exits 0. Check the exit code, not a grep of the output: `npm test` can report every test passing and still fail on coverage.

```bash
npm test                          # both Vitest projects, and the 100% per-file coverage gate
npm run check:coverage-ignores
npm run check:airtable-filter
npm run check:staff-auth
npm run build
npm run test:behaviour            # Playwright, on fixture data
```

Running one Vitest project (`npm run test:node`, `npm run test:browser`) or one file doesn't check coverage, so it isn't the gate. The tests that need a database make their own in Postgres (`docs/testing.md`).

If a change could alter how any page looks (components, CSS, layout, copy, or the data a page shows), also run the visual tests and look at the diffs in the report (`npm run test:report`):

```bash
npm run test:fixtures-vs-main     # this branch against main, on fixture data
npm run test:public-vs-live       # local build against pauseai.uk
```

`fixtures-vs-main` never fails on a difference, so it proves nothing until you've looked. `public-vs-live` fails on any difference, including ones from live data (news, events), so read why it failed before deciding it's your change. Say in the commit or PR what you checked and what differed.

## Next.js version may be beyond your knowledge cutoff

This project pins a Next.js version in `package.json` that may be newer than your training data (e.g. Next.js 16+). Do **not** assume APIs, defaults, or best practices from an older version you remember. When working with Next.js here:

- Check the pinned version in `package.json` first.
- Verify framework APIs against the installed version (`node_modules/next`) or official docs rather than memory.
- Match the conventions already used in `app/` rather than introducing patterns from an earlier major version.

## Every change needs 100% test coverage

**Every file must stay at 100% coverage: branches, statements, functions and lines.** Branches matter most: every `? :`, `??`, `||`, `&&` and `if` needs a test for each way it can go. A test for the obvious path isn't enough. CI fails otherwise (`thresholds: { 100: true, perFile: true }` in `vitest.config.mts`), and coverage-ignore comments are banned.

Before you say a change is done, run `npm test`. That's both Vitest projects with the coverage gate, as CI runs it. A plain `vitest run` doesn't check coverage, so it can pass while CI fails. Write the tests along with the code, not afterwards. See `docs/testing.md`, "Coverage".

## Never write final copy

People write the words visitors and recipients read: page text, letters, emails, form labels and messages. When code needs copy that doesn't exist yet, write a placeholder. Start it with ⁂ and write it in Latin, e.g. "⁂ Lorem ipsum dolor sit amet", so it can't be mistaken for the real thing.

`placeholder-copy.test.ts` fails while ⁂ appears anywhere in the repo outside this file. So placeholders can't be merged by accident.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
