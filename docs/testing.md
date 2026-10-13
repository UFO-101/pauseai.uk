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

## Email

Emails go through Postmark's HTTP API, from `lib/server/postmark.ts` only,
through `outsideFetch` like any other outside service.

- **No Postmark library.** The `postmark` npm package makes its own HTTP
  requests, which would bypass the fixtures in Playwright builds.
- **Vitest checks what we sent.** The Postmark fixture just returns a
  `MessageID`. Tests read the request MSW received and check From,
  Reply-To, the text, the attachments and the confirmation link
  (`lib/server/mp-letters.test.ts`).
- **Playwright reads an outbox.** With `DATA_FIXTURES=1`, `outsideFetch` also
  writes each outgoing email to a file in `OUTBOX_DIR`
  (`tests/fixtures/outbox.ts`). The flow test takes the confirmation link
  from the newest email to the sender. This is test-only plumbing, with no
  production route or table.
- **Webhooks are posted directly.** Tests post bounce, spam complaint and
  inbound payloads, in Postmark's format, straight to our routes with test
  basic auth credentials, and check that wrong or missing credentials are
  refused, and that a reply is forwarded and not stored.
- **No Mailpit or other mail catcher.** We send through Postmark's API, not
  SMTP, so a mail catcher would test a different path from production.
- **Checking real sending by hand.** On previews and the live site, use the
  test MP (postcode ZZ99ZZ). Postmark's test token `POSTMARK_API_TEST`
  accepts messages without delivering them. Its addresses at
  `bounce-testing.postmarkapp.com`, such as `hardbounce@` and `softbounce@`,
  produce real bounce webhooks. Neither is used in CI.

## The database

Code that reads or writes the database is tested against a real Postgres,
not a mock.

- **Each test file gets its own database.** Wrap the tests in
  `describeWithDatabase` and call `useTestDatabase()` (`tests/database.ts`).
  It makes a fresh database, applies the migrations with `psql`
  (`scripts/fresh-database.mjs`, the same way Netlify does), empties the
  tables before each test, and drops the database afterwards.
  `addTestPolitician()` and `addTestMp()` add rows.
- **Where Postgres is.** The usual `PG*` variables; without `PGHOST`, the
  Unix socket in `/var/run/postgresql`. See the README for setting it up
  locally. CI runs a Postgres service.
- **Netlify's build has no Postgres**, so `npm run build` skips these tests
  there (`NETLIFY=true`). CI runs them.
- **Playwright** builds against its own database, `pauseai_behaviour`, made
  fresh by the `webServer` command. Behaviour tests that need MPs call
  `syncFixtureMps()` (`tests/behaviour/setup.ts`), which runs the nightly
  sync's route against the Parliament fixture.
- **Staff screens** are tested by logging in through the fixture Google
  (`tests/behaviour/staff.spec.ts`). The fixture's ID tokens were signed once
  for the client `fixture-client-id`, and the key that signed them wasn't
  kept. There's no login bypass.
- **`next/headers`** can't run outside a request, so Node tests of code
  that calls `requireStaff()` use `vi.mock("next/headers", () =>
  import("@/tests/next-headers"))` and put the session cookie in
  `requestCookies`.

## Rules for new code

- A new component ships with its `*.browser.test.tsx` in the same PR.
- New logic in `lib/` ships with its `*.test.ts`.
- A new staff page, route handler or Server Action file under
  `app/(staff)/` must call `requireStaff()`, or `npm run check:staff-auth`
  fails.
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
- The visual diff also follows the Email your MP form on both hosts: ZZ99ZZ,
  the drafted letter, and the confirm box, never sending
  (`tests/visual/email-your-mp.spec.ts`). Its local build gets a database
  with only the test MP in it. Live needs the MP sync run and
  `TEST_MP_EMAIL` set.
- Run one Playwright file with `npm run test:behaviour -- <name>`, or point at
  another host with `LOCAL_URL=https://pauseai.uk`.
- Browser tests need Chromium: `npx playwright install chromium`.
