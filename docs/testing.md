# Testing

How this site is tested, and the rules for new code. The plan that got us
here is `plans/test-coverage.md`.

## The layers

| Layer | Tool | Tests | Files |
| --- | --- | --- | --- |
| Logic | Vitest, `node` project | `lib/`, `app/api/`, `sitemap.ts`, `next.config.ts` | `*.test.ts` (or `.tsx`) next to the code |
| Components | Vitest, `browser` project (real Chromium) | every component | `*.browser.test.tsx` next to the component |
| Pages and flows | Playwright, `behaviour` project | every route loads cleanly; things that span pages | `tests/behaviour/` |
| Appearance | Playwright, `visual` projects | the local build against the live site, every route, desktop and mobile | `tests/visual/` |

**Vitest Node** is for anything that doesn't need a DOM. **Vitest Browser
Mode** renders a component on its own in real Chromium, so layout, canvas,
`matchMedia` and the clipboard all behave as they do for users.

**Playwright** runs against a real production build (`npm run build && npm
run start`), so it is slower. Use it only for what Vitest can't see:
- `page.tsx` and `layout.tsx`: `tests/behaviour/pages.spec.ts` loads every
  route (from `tests/routes.ts`) and checks it returns 200, logs no console
  errors or hydration warnings, has one `<h1>` and has no broken same-site
  links.
- Redirects, navigation, scrolling and hash links.
- The onboarding iframe.
- Anything remembered from one page to the next.

## Coverage

`npm run test:coverage` runs both Vitest projects and produces one report in
`coverage/`. CI fails if it drops below the thresholds in
`vitest.config.mts`.

- **Every file is held at 100%**: statements, branches, functions and
  lines, each file on its own (`perFile: true`).
- **Code that needs a browser is tested in the browser project**, even when
  it isn't a component: the collateral tool's canvas drawing, its PDF and
  zip exports, and its font embedding all have `*.browser.test.ts` files.
- **Defensive data checks are functions.** A module-level guard over static
  data (`checkPeople`, `checkPostAuthors`, `assertOutletsValid`) can't fail
  in a test, so it lives in an exported function that tests call with bad
  input.
- **Every source file is in the report**, including files no test imports
  (they show as 0%). So an untested component fails the gate rather than
  going unnoticed.
- **No ignore comments.** `v8 ignore`, `c8 ignore` and `istanbul ignore` are
  banned (`npm run check:coverage-ignores`, run in CI). If code is hard to
  reach, test it in the browser project, or restructure it so it can be
  tested.
- **The one scope rule:** `page.tsx` and `layout.tsx` are outside the
  report. Async server components can't render in Vitest, and `layout.tsx`
  needs `next/font`. Keep them thin (see `docs/code-structure.md`); the route
  smoke test is their gate.

## Mocking

Mock only where the site calls an outside service. All such calls go
through `outsideFetch` (`lib/server/outside-fetch.ts`), and the canned responses
live in one place: `tests/fixtures/outside-services.ts`.

- **Vitest Node:** MSW (`tests/fixtures/msw.ts`) answers every outside
  request from the fixtures. A request with no fixture fails the test. To
  test a different response, use `server.use(http.get(...))` in the test.
- **Vitest Browser:** components receive data as props, so pass fixture data
  in. `next/navigation` is mocked in `vitest.setup.browser.tsx`, since there
  is no Next router.
- **Playwright:** the build runs with `DATA_FIXTURES=1`, so `outsideFetch`
  returns the fixtures instead of calling Luma or Airtable. Use `page.route`
  only for browser requests that mustn't really happen (analytics, form
  submits to other sites).

Don't stub `fetch` globally, and don't mock our own modules to make a test
pass. Mocking one of our modules is fine at an edge the test can't
otherwise watch or break: the collateral tool's file downloads, an image
that fails to load, or a check result a real design can't easily produce.
Wrap the real module (`importActual`) and replace only that one function.

## Rules for new code

- A new component ships with its `*.browser.test.tsx` in the same PR.
- New logic in `lib/` ships with its `*.test.ts`.
- A new page needs nothing extra: the route list picks it up. A new dynamic
  route (`[slug]`) needs an example in `tests/routes.ts`, or
  `tests/routes.test.ts` fails.
- Run the visual diff on any PR that changes layout or CSS.

## Commands

```bash
npm test                  # Vitest node project (also runs in npm run build)
npm run test:browser      # Vitest browser project
npm run test:coverage     # both, with the coverage gate (what CI runs)
npm run test:watch        # Vitest in watch mode
npm run test:behaviour    # Playwright behaviour tests, on fixture data
npm run test:visual       # Playwright visual diff against pauseai.uk
npm run test:visual:report
```

- `npm run build` runs only the Node project, because Netlify's build has no
  browser.
- The Playwright suites build and start the site themselves, or reuse a
  server already on port 3000 (except in CI). The visual diff needs a build
  with live data (`DATA_FIXTURES=0`), and the behaviour suite needs one with
  fixtures, so stop any running server when switching between them.
- Run one Playwright file with `npm run test:behaviour -- <name>`, or point at
  another host with `LOCAL_URL=https://pauseai.uk`.
- Browser tests need Chromium: `npx playwright install chromium`.
