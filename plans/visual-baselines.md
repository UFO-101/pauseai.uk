# Visual baselines plan

Written 2026-10-13. Status: later. Not part of `plans/test-coverage.md`.

## Goal

Make appearance a CI gate. Store reference screenshots in the repo, so that
any unreviewed pixel change fails the build. This would replace the manual
diff against the live site.

## Depends on

From phase 1 of `plans/test-coverage.md`:

- `DATA_FIXTURES=1`. Pages must render identical content on every run.
- The shared route list.

## How it would work

- **Pages:**
  - `expect(page).toHaveScreenshot()` for every route, at desktop (1280)
    and mobile (390) widths.
  - Run against a `DATA_FIXTURES=1` build.
- **Stable output:**
  - Animations are disabled (`toHaveScreenshot`'s `animations: "disabled"`).
  - The clock is fixed with `page.clock`.
  - The hero photo shuffle is seeded in fixture mode.
- **Component states:** behaviour tests also screenshot the states they
  reach, for example:
  - nav menu open
  - cookie banner showing
  - form validation errors
  - each carousel position
  - each collateral template
- **Collateral canvas:** each template is rendered with `@napi-rs/canvas` and
  compared with PNG baselines, in Vitest.
- **Updating baselines:**
  - Baselines are generated only in CI's Linux image, because font
    rendering differs between operating systems.
  - An "update snapshots" workflow commits them to the PR. Reviewers see the
    image changes in the diff.
- **The live diff** stays as an optional pre-deploy check
  (`npm run test:visual:live`).

## Costs

- **Repo size.** About 30 routes × 2 sizes, plus state and canvas images.
  That's roughly 100+ PNGs, rewritten whenever the design changes. Git LFS
  may be worth it.
- **Churn.** Every intended visual change needs a baseline update, plus a
  review of the images.
- **CI time.** It adds a full screenshot pass to every PR.
