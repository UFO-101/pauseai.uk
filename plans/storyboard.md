# Storyboard plan

Written 2026-10-16. Status: done 2026-10-16, on branch `storyboard`.
Replaced `plans/visual-baselines.md`: main is the reference, not stored
images.

## Goal

One Playwright suite drives the site's flows end to end on fixture data
and is the CI gate. Run locally with screenshots, it makes a
**storyboard**: a page with the flows in sections, each frame captioned
and pictured on desktop and phone, with before / after / diff against a
build of main, filterable to what changed, plus the same data as JSON for
an agent. The public-pages diff against production goes.

## Design

### One suite, one command

`tests/behaviour/` and `tests/fixtures-vs-main/` merge into
`tests/storyboard/`, run by `npm run storyboard` (`scripts/storyboard.mjs`).
A spec file is a **section**, a test a **flow**, and each
`await frame(page, "caption")` a **frame**: a caption and, when
screenshots are on, a full-page screenshot. The checks stay between the
frames. The tests know nothing about main.

```bash
npm run test:storyboard   # the gate: desktop runs everything, phone runs only tests tagged @phone; no screenshots; same locally and in CI
npm run storyboard        # the review: both viewports, every flow, screenshots, against main, then opens the page
npm run test:report       # unchanged: Playwright's trace viewer, for a failed flow
```

Switches on the review only, after `--`: `--no-main`, `--main=branch`,
`--desktop` or `--phone`, `--no-open`, `--server=URL` and
`--main-server=URL` for servers you started; anything else goes to
Playwright (`staff`, `-g login`, `--headed`). Two Playwright projects,
`desktop` (1280×800) and `phone` (iPhone 13 in Chromium); without
screenshots the phone project is filtered to `@phone`.

With main: the script builds and serves main (`scripts/serve-main.mjs`),
runs the suite against it (failures allowed: missing frames), then
against this branch, pairs frames by section, flow and caption, diffs
with pixelmatch, generates the page, opens it. A difference never fails;
only this branch's checks do.

### Every flow stands alone

- Unique identifiers per flow; no flow depends on another; passes alone
  and run twice.
- **A database per flow.** The web server makes one migrated template
  database with the fixture MPs. A Playwright fixture copies it per flow
  (`CREATE DATABASE ... TEMPLATE`, 44 ms measured), names it in a cookie on
  the context and the `request` fixture, drops it after. In fixture mode
  only, `getPool()` in `lib/server/db.ts` reads the cookie, checks
  `pauseai_sb_\w+`, keeps one small pool per name, closed when idle.
  Otherwise `NETLIFY_DB_URL` as now. Nothing queries outside a request.
  List pages like `/staff/letters` then compare unmasked.
- **Fixed clock.** `FIXTURE_NOW` in the fixture env, read by one `now()`
  helper for the server's `new Date()` calls, and set with `page.clock` in
  every flow. Nothing date-shaped is masked.
- **Seeded hero shuffle** in fixture mode, so the home page's hero is
  compared.

### The page

`tests/storyboard/report/` generates `test-results/storyboard/index.html`
from `storyboard.json` (section, flow, index, caption, viewport, PNG paths
for branch / main / diff, mismatch, test status). Local only, gitignored.
Sidebar of sections and flows with changed/total counts; a flow is its
frames in order, each a row of caption and thumbnails opening in a
lightbox; phone/desktop toggle; "changed only" filter; summary line; a
failed test's message under its last frame. `npm run test:report` stays
for traces.

### Dropped: public pages against production

`tests/public-vs-live/` goes, with the `pauseai_visual` database, the
`DATA_FIXTURES=0` web server branch and the live-data build docs. It
failed on `/events`, `/campaigns` and the trackers every run: live data,
different caches, a clock. Accepted: bugs only real data shows, and
Netlify-only configuration drift, are no longer caught. A live smoke test
is the fallback if that bites.

### Tidying

One place for `LOCAL_URL` and `MAIN_URL`; the flow steps in
`tests/steps.ts` only; one every-route loop (the "Public pages" section).

## Rules

For `docs/testing.md`, repeated in short in `AGENTS.md`:

- Every new interactive behaviour goes in a flow, existing or new. A PR
  without it isn't done.
- Flows stay small: one thing a person does, about ten frames at most.
  Sections split past a dozen flows.
- Before saying a change is done, run `npm run storyboard` and look at
  every changed frame on both viewports; say what changed in the PR. An
  agent reads `storyboard.json`.
- A flaky test, or a frame that differs between two runs of the same
  build, is fixed at once, never retried, skipped or masked. `retries`
  stays 0.
- No stored baselines, no gate on pixels.

## Stages

One branch, merged at once. Each stage ends with the CI gate green and
its "done when".

1. **One suite, one command.** Rename; delete the two visual suites and
   their config; `scripts/storyboard.mjs`; `package.json`; CI; tidying.
   Done when the gate passes locally and in CI.
2. **Every flow stands alone.** Database per flow, fixed clock, seeded
   hero, with unit tests. Done when each flow passes alone and twice, and
   the gate passes eight times running.
3. **Frames and the phone.** `frame()`, the manifest, frames through every
   flow, the phone project. Done when `--no-main` writes a frame for every
   step on both viewports and they look right by eye; costs noted here.
   Costs, measured 2026-10-16 on a warm server: the gate (93 flows, no
   screenshots) runs in about 26 s; the review's branch run (168 flows on
   both viewports, 176 frames) in about 55 s; a full review with main,
   building main included, in a few minutes. `test-results/storyboard/`
   is about 460 MB with main (full-page PNGs of both sides and the diffs).
4. **Main and the page.** Main's run, pairing, pixelmatch, the generator.
   Done when one deliberate CSS change shows up alone on both viewports,
   an unchanged branch shows nothing, and eight full runs are identical
   frame for frame.
5. **Docs.** `docs/testing.md`, `docs/development.md`, `README.md`,
   `AGENTS.md`; delete `plans/visual-baselines.md`. Done when a fresh
   agent can run the storyboard from the docs alone.
