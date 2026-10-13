# Test coverage plan

Written 2026-10-13. Status: proposed, not started.

## Goal

- 100% coverage per file, in one Vitest report, with no ignore comments.
  - Vitest Node tests logic (`lib/`, `app/api/`).
  - Vitest Browser Mode (real Chromium) tests every component.
- `page.tsx` and `layout.tsx` are kept thin, and a Playwright smoke test on
  every route covers them.
- Playwright also covers behaviour that spans pages: redirects, navigation,
  the iframes, consent.
- Mock only the three outside-service files (`lib/airtable.ts`,
  `lib/data/luma-sources.ts`, `lib/data/events.ts`): MSW in Vitest,
  `DATA_FIXTURES=1` in Playwright.

Today: 27% of lines overall. Pages and components are at 0%.

## Phase 1: foundations (before `plans/code-organisation.md`)

- Move the root docs into `docs/` with lowercase names, and add
  `docs/testing.md`.
- `README.md` links every doc, and `AGENTS.md` points to `README.md`.
- Upgrade Vitest, and set up the Node and Browser projects with coverage, in
  CI. Thresholds start at today's levels and can only go up.
- Add a CI check that fails on ignore comments.
- Add MSW fixtures and `DATA_FIXTURES`.
- Build one route list from `app/sitemap.ts`. Use it for:
  - a smoke test on every route (200, no console errors, links work);
  - the visual diff against the live site, at desktop and mobile sizes.

## Phase 2: logic (alongside the reorganisation)

- Bring `lib/` to 100%. The biggest gap is the collateral canvas code, which
  runs in Browser Mode.

## Phase 3: components (after the reorganisation)

- Browser Mode tests for every component, to 100% per file.
- Split `LocalGroupEvents`, which is async, into a loader plus a component.
- Keep Playwright only for flows across pages.
- Raise the global threshold to 100%.

Committed visual baselines are a separate, later plan:
`plans/visual-baselines.md`.
