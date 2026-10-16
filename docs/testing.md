# Testing

How this site is tested, and the rules for new code. The plan that got us
here is `plans/test-coverage.md`.

## The layers

| Layer           | Tool                                            | Tests                                                                                                                                                | Files                                      |
| --------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Logic           | Vitest, `node` project                          | `lib/`, `app/api/`, `sitemap.ts`, `next.config.ts`                                                                                                   | `*.test.ts` (or `.tsx`) next to the code   |
| Components      | Vitest, `browser` project (real Chromium)       | every component                                                                                                                                      | `*.browser.test.tsx` next to the component |
| Pages and flows | Playwright, the storyboard (`desktop`, `phone`) | every route loads cleanly; every flow a person takes, end to end on fixture data; run with screenshots, the same flows pictured against main's build | `tests/storyboard/`                        |

**Vitest Node** is for anything that doesn't need a DOM. **Vitest Browser
Mode** renders a component on its own in real Chromium, so layout, canvas,
`matchMedia` and the clipboard all behave as they do for users.

**Playwright** runs against a real production build (`npm run build && npm
run start`), so it is slower. Use it only for what Vitest can't see:

- `page.tsx` and `layout.tsx`: `tests/storyboard/public-pages.spec.ts` loads
  every route (from `tests/routes.ts`) and checks it returns 200, logs no
  console errors or hydration warnings, has one `<h1>` and has no broken
  same-site links.
- Redirects, navigation, scrolling and hash links.
- The onboarding iframe.
- Anything remembered from one page to the next.

## Coverage

`npm test` runs both Vitest projects and produces one report in
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
  banned (`coverage-ignores.test.ts` fails on one). If code is hard to
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
  only for browser requests that mustn't really happen (form submits to
  other sites). Analytics loads only on the live site (`lib/analytics.ts`);
  the fixture build turns it on so the consent flow can be driven, and the
  storyboard's fixtures block every request to Google for every flow.

Don't stub `fetch` globally, and don't mock our own modules to make a test
pass. Mocking one of our modules is fine at an edge the test can't
otherwise watch or break: the collateral tool's file downloads, an image
that fails to load, or a check result a real design can't easily produce.
Wrap the real module (`importActual`) and replace only that one function.

## Email

Emails go through Postmark's HTTP API, from `lib/server/postmark.ts` only,
through `outsideFetch` like any other outside service.

- **No Postmark library.** The `postmark` npm package makes its own HTTP
  requests, which would bypass the fixtures in Playwright builds.
- **Vitest checks what we sent.** The Postmark fixture just returns a
  `MessageID`. Tests read the request MSW received and check From,
  Reply-To, the text and the attachments (`lib/server/mp-letters.test.ts`).
- **Playwright reads an outbox.** With `DATA_FIXTURES=1`, `sendEmail` also
  writes each outgoing email to a mail file (`.eml`) in `OUTBOX_DIR`
  (`tests/fixtures/outbox.ts`). The flow test checks the letter in the
  newest email to the test MP. This is test-only plumbing, with no
  production route or table.
- **Webhooks are posted directly.** Tests post bounce, spam complaint and
  inbound payloads, in Postmark's format, straight to our routes with test
  basic auth credentials, and check that wrong or missing credentials are
  refused, and that a reply is forwarded and logged, without its text.
- **No Mailpit or other mail catcher.** We send through Postmark's API, not
  SMTP, so a mail catcher would test a different path from production.
- **Checking real sending by hand.** On previews and the live site, use the
  test MP (postcode ZZ99ZZ). Postmark's test token `POSTMARK_API_TEST`
  accepts messages without delivering them. Its addresses at
  `bounce-testing.postmarkapp.com`, such as `hardbounce@` and `softbounce@`,
  produce real bounce webhooks. Neither is used in CI.

## The storyboard

One Playwright suite, `tests/storyboard/`, drives the site's flows end to
end on a fixture build. A spec file is a **section**, a test a **flow**, and
each `await frame(page, "caption")` a **frame**: a caption and, when
screenshots are on, a full-page screenshot. The checks go between the
frames. The tests know nothing about main.

```bash
npm run test:storyboard   # the gate, here and in CI: desktop runs every flow, phone only those tagged @phone; no screenshots
npm run storyboard        # the review: both viewports, every flow, screenshots, against a build of main, then opens the page
npm run test:report       # Playwright's own report, with the trace of a failed flow
```

**The gate** is what CI runs. It fails only on a flow's checks, never on
how a page looks.

**The review** (`scripts/storyboard.mjs`) builds and serves main
(`scripts/serve-main.mjs`: a git worktree of main kept in your temp folder,
with its own `npm ci` when its lockfile changes), runs the suite against it
with screenshots (its failures are just missing frames), then against this
branch, pairs the frames by section, flow and caption, diffs them with
pixelmatch, and opens `test-results/storyboard/index.html`: the flows in
sections, each frame captioned and pictured on desktop and phone, with this
branch's picture, main's and the diff, a lightbox, a phone/desktop toggle, a
"changed only" filter, and a failed flow's message under its last frame. The
same data is in `test-results/storyboard/storyboard.json`, for an agent.
Both are local only and gitignored. A difference never fails; only this
branch's checks do, and the exit code is theirs.

Switches, after `--`: `--no-main` (this branch alone), `--main=<ref>`
(another branch), `--desktop` or `--phone`, `--no-open`, `--server=URL` and
`--main-server=URL` for servers you started. Anything else goes to
`playwright test`: a file (`staff`), `-g login`, `--headed`.

**Every flow stands alone.** It passes on its own, and run twice, in any
order, alongside the others:

- **A database per flow.** `tests/storyboard/global-setup.ts` makes one
  migrated template database with the test MPs; the `flowDatabase` fixture
  (`tests/storyboard/fixtures.ts`) copies it for each flow
  (`CREATE DATABASE … TEMPLATE`, tens of milliseconds), names it in a cookie
  on the browser context and the `request` fixture, and drops it afterwards.
  In a fixture build only, `lib/server/db.ts` reads that cookie and queries
  the database it names, through one small pool per database, closed when
  idle. Otherwise `NETLIFY_DB_URL`, as ever. Flows that need the fixture MPs
  sync them in with `syncMps()` (`tests/steps.ts`). So the staff pages that
  list what's happened, like `/staff/letters`, are compared unmasked.
- **A fixed clock.** `FIXTURE_NOW` (`tests/fixture-env.mjs`) is read by
  `now()` in `lib/now.ts`, which the server uses instead of `new Date()`;
  the database's `now()`, and the columns that default to it, are fixed to
  the same moment in each flow's database; and every page's clock is set to
  it with `page.clock`. Nothing date-shaped is masked.
- **A seeded hero.** `lib/shuffle.ts` shuffles the same way every time in a
  fixture build, so the home page's hero is compared too.
- **Unique identifiers.** A flow's sender or login address includes its test
  ID, so two flows never share a letter or a link.

**Rules:**

- Every new interactive behaviour goes in a flow, existing or new, with a
  frame after each thing a person would see. A PR without it isn't done.
- Flows stay small: one thing a person does, about ten frames at most.
  Sections split past a dozen flows.
- Tag a flow `@phone` to run it on the phone in the gate too; `@phone-only`
  for one that only makes sense there (the mobile nav), `@desktop-only` for
  the reverse. The review runs every other flow on both viewports.
- Before saying a change is done, run `npm run storyboard` and look at
  every changed frame on both viewports; say what changed in the PR. An
  agent reads `storyboard.json`.
- A flaky flow, or a frame that differs between two runs of the same
  build, is fixed at once, never retried, skipped or masked. `retries`
  stays 0.
- No stored baselines, and no gate on pixels. Main is the reference.

**Not compared:** the live site. The old diff of the public pages against
pauseai.uk failed on every run on live data (events, news, caches, the
clock), so it went. Bugs only real data shows, and configuration drift on
Netlify, aren't caught here; check previews by hand.

## The database

Code that reads or writes the database is tested against a real Postgres,
not a mock.

- **Each test file gets its own database.** Wrap the tests in
  `describeWithDatabase` and call `useTestDatabase()` (`tests/database.ts`).
  It makes a fresh database, applies the migrations with `psql`
  (`scripts/fresh-database.mjs`, the same way Netlify does), empties the
  tables before each test, and drops the database afterwards.
  `addTestPolitician()` and `addTestMp()` add rows.
- **Where Postgres is.** `TEST_DATABASE_URL` (from the environment, or
  that one line of `.env.local`): `db-test` in `docker-compose.yml`, say.
  Without it, the usual `PG*` variables; without `PGHOST`, the local
  server's socket in `/var/run/postgresql` or `/tmp`, else localhost. CI
  runs a Postgres service.
- **Netlify's build has no Postgres**, so `npm run build` skips these tests
  there (`NETLIFY=true`). CI runs them.
- **The storyboard** builds against its own database, `pauseai_storyboard`,
  made fresh by the `webServer` command, and gives each flow a copy of a
  template database (above). Flows that need MPs call `syncMps()`
  (`tests/steps.ts`), which runs the nightly sync's route against the
  Parliament fixture.
- **Staff screens** are tested by logging in as staff do: asking for a
  link, taking it from the build's outbox and opening it in the same
  browser (`logInAsStaff` in `tests/steps.ts`). There's no login bypass.
- **`next/headers`** can't run outside a request, so Node tests of code
  that calls `requireStaff()` use `vi.mock("next/headers", () =>
import("@/tests/next-headers"))` and put the session cookie in
  `requestCookies`.

## Rules for new code

- A new component ships with its `*.browser.test.tsx` in the same PR.
- New logic in `lib/` ships with its `*.test.ts`.
- A new staff page, route handler or Server Action under `app/(staff)/`
  must call `requireStaff()` as its first statement, or `staff-auth.test.ts`
  fails. Each exported function is checked on its own, so every action in
  a `"use server"` file needs its own call.
- A new page needs nothing extra: the route list picks it up. A new dynamic
  route (`[slug]`) needs an example in `tests/routes.ts`, or
  `tests/routes.test.ts` fails.
- Run `npm run storyboard` on any PR, and look over every changed frame on
  both viewports (above).

## Commands

```bash
npm test                  # both Vitest projects, with the coverage gate (what CI runs)
npm run test:node         # Vitest node project (also runs in npm run build)
npm run lint              # ESLint, failing on warnings too (also runs in npm run build)
npm run lint:css          # Stylelint (also runs in npm run build)
npm run lint:unused       # Knip: unused files, exports and dependencies
npm run test:browser      # Vitest browser project
npm run test:watch        # Vitest in watch mode
npm run test:storyboard   # Playwright: the storyboard's gate, on a fixture build
npm run storyboard        # Playwright: the storyboard with screenshots, against main
npm run test:report       # open the last Playwright report
```

- `npm run build` runs only the Node project, because Netlify's build has no
  browser.
- The storyboard builds and starts the site itself, or reuses a server
  already on port 3100 (except in CI). That's not the dev server's port, so
  a running `npm run dev` doesn't get in the way.
- Run one section with `npm run test:storyboard -- staff`, one flow with
  `-g "login link"`, or point at another fixture build with `LOCAL_URL`.
- Browser tests need Chromium: `npx playwright install chromium`.
