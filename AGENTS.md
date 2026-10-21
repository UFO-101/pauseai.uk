# Agent notes

Read `README.md` first. It links the docs in `docs/`, including the code structure and styling rules (`docs/code-structure.md`), test policy (`docs/testing.md`) and the style guide (`docs/style-guide.md`). Plans for work in progress are in `plans/`. They're temporary, deleted when the work is done, so nothing references them (`plans/README.md`).

## Comments describe the code as it is

A comment says what the code does and why, as it stands. It doesn't tell the code's history: not what it replaced, what changed or moved, what it used to do, or which plan or PR brought it. That belongs in the commit message. Write "Every field is the kit's", not "Fields now come from the kit instead of each form's own". The same goes for docs. The rest of the rules (no counts that go stale, explain once at the definition, what a test fixture's comment says) are in `docs/code-structure.md`, "Comments".

## Scratch files

Put throwaway scripts, logs and screenshots in `tmp/` at the repo root (to screenshot the site, see "Screenshots" below). It's gitignored, and scripts there can import the project's `node_modules` (e.g. `@playwright/test`, `sharp`). Long-running checks, such as probing the site in Chromium, Firefox and WebKit, can run in the background and write their output there.

## Commit early, then run the CI gate

Commit as soon as the fast checks pass, so there's something to open a pull request from, then run the slow ones and commit the fixes on top. Check exit codes, not a grep of the output: `npm test` can report every test passing and still fail on coverage.

The fast checks, seconds each. Run them on the files you changed, fix what they find, and commit:

```bash
npx tsc --noEmit                  # types
npx prettier --write <files>      # formatting
npx eslint --max-warnings 0 <files>
npx stylelint <css files>
```

Then everything CI runs (`.github/workflows/ci.yml`), which takes minutes. Anything it finds is fixed in a follow-on commit; the branch isn't done until every command exits 0:

```bash
npm test                          # both Vitest projects, and the 100% per-file coverage gate
npm run lint                      # ESLint, failing on warnings too
npm run lint:css                  # Stylelint
npm run lint:unused               # Knip: unused files, exports and dependencies
npm run format:check              # Prettier; `npm run format` fixes it
npm run build
npm run test:storyboard           # Playwright: the storyboard's gate, on fixture data
(cd backup && npm ci && npm test && npm run typecheck)   # the backup Worker's own package
```

If the prek Git hook is installed (`npm run hooks:install`), commits run Prettier, ESLint and Stylelint on the staged files first. Prettier rewrites them, so `git add` and commit again. That's only part of the gate.

Running one Vitest project (`npm run test:node`, `npm run test:browser`) or one file doesn't check coverage, so it isn't the gate. The tests that need a database make their own in Postgres (`docs/testing.md`).

## The storyboard

`tests/storyboard/` is one Playwright suite that drives every flow on fixture data (`docs/testing.md`, "The storyboard"). A spec file is a section, a test a flow, and each `await frame(page, "caption")` a frame: a caption and, in the review, a screenshot (the whole page at the top, the window once scrolled). `docs/testing.md`, "What the storyboard covers", lists what each section drives; a new spec file or route handler needs a line there.

- Every new interactive behaviour goes in a flow, existing or new, with a frame after each thing a person would see. A PR without it isn't done.
- Flows stay small: one thing a person does, about ten frames at most. Every flow stands alone: its own database (the `flowDatabase` fixture), a fixed clock, unique identifiers.
- Before saying a change is done, run the review and look at every changed frame on both viewports. It never fails on a difference, so it proves nothing until you've looked. Say in the commit or PR what changed.

```bash
npm run storyboard                # both viewports, screenshots, against a build of where this branch left origin/main, then opens test-results/storyboard/index.html
npm run storyboard -- --no-open   # the same; read test-results/storyboard/latest/storyboard.json instead
```

- A flaky flow, or a frame that differs between two runs of the same build, is fixed, never retried, skipped or masked. No stored baselines, no gate on pixels.
- Any flaky test, Vitest or Playwright, is fixed at once, in whatever branch finds it, even when the branch has nothing to do with it (`docs/testing.md`, "Rules for new code").

## Screenshots

To see a page or a step of a flow, use the storyboard, not a script of your own. It builds the site on fixture data and waits for each page to settle, and any flow can get you logged in, partway through a form or past a bounce. Pick a section (spec file) and a flow (`-g`, a regex on the test's title; `public-pages` titles each test with its route):

```bash
npm run storyboard -- --no-main --no-open --paths public-pages -g '/donate$'   # one page, both viewports
npm run storyboard -- --no-main --no-open --paths --phone campaigns -g ZZ99ZZ   # a flow, every frame
```

`--no-main` skips building main, which is the slow part (drop it to see main beside it), `--desktop` or `--phone` picks one viewport, and `--paths` prints each frame's caption and PNG path, to open with the Read tool. Each run gets its own folder, so the review someone has open is never changed, and a narrow run carries the rest of the latest review rather than clearing it. Main's frames are kept between runs, so after one full review a narrow one doesn't build main. Playwright reuses whatever is serving on port 3100, so check that it's this branch's fixture build, or stop it. If no flow reaches what you need, add a `frame()` to one, or a flow (see above), rather than a script in `tmp/`.

To see a component, use the component gallery (`/gallery`, fixture builds only; `docs/testing.md`, "The component gallery"). Every component has an example there, a page per group, and the gallery section pictures each group's page whole:

```bash
npm run storyboard -- --no-main --no-open --paths gallery -g 'gallery: ui$'   # the UI kit, both viewports
```

A new component gets its example in `app/(tools)/gallery/_examples/` (`tests/checks/gallery.test.ts` fails otherwise); look at it there before saying it's done. Check the gallery before writing a component or CSS, too: what you need may exist, or need only a variant (`docs/style-guide.md`).

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

`tests/checks/placeholder-copy.test.ts` fails while ⁂ appears anywhere in the repo outside this file. So placeholders can't be merged by accident.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
