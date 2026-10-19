# Testing

How this site is tested, and the rules for new code.

## The layers

| Layer           | Tool                                            | Tests                                                                                                                                                       | Files                                      |
| --------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Logic           | Vitest, `node` project                          | `lib/`, `app/api/`, `sitemap.ts`, `next.config.ts`                                                                                                          | `*.test.ts` (or `.tsx`) next to the code   |
| Components      | Vitest, `browser` project (real Chromium)       | every component                                                                                                                                             | `*.browser.test.tsx` next to the component |
| Pages and flows | Playwright, the storyboard (`desktop`, `phone`) | every route loads cleanly; every flow a person takes, end to end on fixture data; run with screenshots, the same flows pictured against origin/main's build | `tests/storyboard/`                        |

**Vitest Node** is for anything that doesn't need a DOM. **Vitest Browser
Mode** renders a component on its own in real Chromium, so layout, canvas,
`matchMedia` and the clipboard all behave as they do for users.

**Playwright** runs against a real production build (`next build && next
start`), so it is slower. Use it only for what Vitest can't see:

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
  banned (`tests/checks/coverage-ignores.test.ts` fails on one). If code is hard to
  reach, test it in the browser project, or restructure it so it can be
  tested.
- **The one scope rule:** `page.tsx` and `layout.tsx` are outside the
  report. Async server components can't render in Vitest, and `layout.tsx`
  needs `next/font`. That's safe only because they have no branches:
  `tests/checks/thin-pages.test.ts` parses every one and fails on `if`,
  `? :`, `&&`, `||`, `??`, `?.`, `switch`, a loop, `try` or a default
  value. A choice a page would make goes in a component or a `lib/`
  helper, where the gate covers each way it can go: `found()`
  (`lib/found.ts`) for the post, person or record a URL names, or a 404;
  the staff pages' URL filters in `lib/staff-search.ts`; the login page's
  states in `LoginForm`. The route smoke test then only has to show each
  page renders.

## Mocking

Mock only where the site calls an outside service. All such calls go
through `outsideFetch` (`lib/server/outside-fetch.ts`), and the canned responses
live in one place: `tests/fixtures/outside-services.ts`.

- **Vitest Node:** MSW (`tests/fixtures/msw.ts`) answers every outside
  request from the fixtures. A request with no fixture fails the test. To
  test a different response, use `server.use(http.get(...))` in the test.
- **Vitest Browser:** components receive data as props, so pass fixture data
  in. `next/navigation` is mocked in `tests/vitest.setup.browser.tsx`, since there
  is no Next router.
- **Playwright:** the build runs with `DATA_FIXTURES=1`, so `outsideFetch`
  returns the fixtures instead of calling Luma or Airtable. Use `page.route`
  only for browser requests that mustn't really happen (form submits to
  other sites). Analytics loads only on the live site (`lib/analytics.ts`);
  the fixture build turns it on so the consent flow can be driven, and the
  storyboard's fixtures block every request to Google for every flow. The
  two embeds from other sites have stand-ins (`tests/storyboard/fixtures.ts`),
  since what they drew, and when, varied between runs: pauseai.info's
  signup form is a fixed-height box, and Tally's story form on /people
  doesn't load.

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
- **The storyboard pictures the emails.** `emailFrame(page, email,
caption)` (`tests/storyboard/frame.ts`) shows an email from the outbox in
  a plain mail app's layout (`tests/fixtures/email-view.ts`): its headers,
  its body (the HTML if it has one) and its attachments, as a frame. Every
  email the site sends has one: the letter, the forwarded reply and the
  staff login link. It's what was sent, not how Gmail or Outlook draw it.
  So the frames compare, the fixture build fills in what would be random:
  the `Date` header is the fixed clock's, and a login link's token and a
  letter's reply address come from a seed (`randomId` in
  `lib/server/random-id.ts`).
- **Gmail and Outlook are checked from the HTML.** `lib/letter-format.test.ts`
  runs the letter's HTML through doiuse-email
  (`@jsx-email/doiuse-email`, the Can I email tables,
  https://www.caniemail.com) for every Gmail and Outlook app, and fails on
  anything they don't support. Paying a service to picture the real apps
  (Litmus, Email on Acid) gives pictures that vary run to run, so it isn't
  in CI.
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
screenshots are on, a screenshot. The checks go between the frames. The
tests know nothing about main.

A frame pictures the whole page when the page is at the top, so its layout
can be looked over, and only the window once a person, or a step, has
scrolled: where they are is then the point, and a full-page picture of a
scrolled page puts the sticky header wherever the scroll was. A flow with
no frames (the redirects, a scroll position, a header) says so on the page:
"Passed. No frames: this flow only checks."

```bash
npm run test:storyboard   # the gate, here and in CI: desktop runs every flow, phone only those tagged @phone; no screenshots
npm run storyboard        # the review: both viewports, every flow, screenshots, against a build of origin/main, then opens the page
npm run test:report       # Playwright's own report, with the trace of a failed flow
```

**The gate** is what CI runs. It fails only on a flow's checks, never on
how a page looks.

**The review** (`scripts/storyboard.mjs`) builds and serves main
(`scripts/serve-main.mjs`: a git worktree of origin/main, fetched first, kept in your temp folder,
with its own `npm ci` when its lockfile changes), runs the suite against it
with screenshots (its failures are just missing frames), then against this
branch, pairs the frames by section, flow and caption, diffs them pixel by
pixel, and opens `test-results/storyboard/index.html`, which goes to the
newest run's page: the flows in
sections, each frame captioned and pictured on desktop and phone, with this
branch's picture, main's and the diff, a lightbox, a phone/desktop toggle
that stays on the flow being looked at, a "changed only" filter, and a
failed flow's message under its last frame. The sections come in the order
of `SECTION_ORDER` (`tests/storyboard/report/frames.ts`): the public pages
first, then what a visitor does, the staff screens, then the mechanics; the
flows in each keep their spec file's order. The sidebar marks the section
in view; its lists open and close only when clicked, and the "changed only"
filter is kept on a reload. The same data is in
`test-results/storyboard/latest/storyboard.json`, for an agent.
Both are local only and gitignored. A difference never fails; only this
branch's checks do, and the exit code is theirs.

**Runs.** Each run has its own folder,
`test-results/storyboard/runs/<when>/`, with every picture its page shows,
so a page you have open is never changed by the next run. `latest` points
at the newest that finished, and `index.html` beside it opens that run's
page by name. The newest three runs are kept.

A partial run (one that selects less than the whole suite: a section, `-g`,
`--desktop` or `--phone`) starts from the latest run's frames, as hard
links, and replaces only the flows it runs, so the review stays whole. Each
carried flow says when it was shot, and the summary line counts them. A flow
that's gone from the suite, renamed or deleted, isn't carried, and a full
run starts empty.

**Main is run once.** Main's frames are kept in
`test-results/storyboard-main/`, under main's commit and a hash of this
branch's suite (`tests/`, `playwright.config.ts`, `lib/content/`, the
pages' paths, `app/sitemap.ts`, the migrations, `scripts/fresh-database.mjs`,
`scripts/serve-main.mjs` and Playwright's version: the suite drives main's
server, so a change to it changes main's frames). A run lists its flows first (`playwright test --list`,
which builds nothing); if main's are all kept, it doesn't build or run main
at all. Otherwise it runs main for its selection and keeps the result. So
after one full review, every partial run against the same main is fast.
`--fresh-main` runs main again regardless; with `--main-server` nothing is
kept, as that server may not be the ref's commit.

**Noise.** A frame that differs from main's only by antialiasing isn't
counted as changed, by the rule toucan's snapshot gallery uses
(https://git.sr.ht/~frabcus/toucan, `platform/snapshots/png.ts`). A pixel
differs when a colour channel moves by more than 4 levels. A frame has
changed when its differing pixels' moves add up to more than 2,000, or more
than 1,000 pixels differ, both per CSS pixel, so nine times that on the
phone's 3× screen. Antialiasing on a few glyphs comes to a few thousand; a
line that moves by a pixel, millions. A frame under the limits reads "same
as main, but for noise" and still shows its diff, so you can see what fell
under them. The limits are `CHANNEL_NOISE`, `NOISE_TOTAL` and
`NOISE_PIXELS` in `tests/storyboard/report/frames.ts`.

Switches, after `--`: `--no-main` (this branch alone), `--main=<ref>`
(another branch), `--desktop` or `--phone`, `--no-open`, `--paths` (print
each frame's caption and picture), `--server=URL` and `--main-server=URL`
for servers you started. Anything else goes to `playwright test`: a file
(`staff`), `-g login`, `--headed`.

So the review is also the way to get a screenshot while working: one page
is `npm run storyboard -- --no-main --no-open --paths public-pages -g
'/donate$'`, a few seconds on a warm build. `public-pages` names each test
by its route. A narrow run carries the rest of the latest review, so it
doesn't lose your last full one.

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
- **Seeded emails.** In a fixture build, a login link's token and a
  letter's reply address are made from a seed, and an email's `Date` is
  the fixed clock's, so the pictures of the emails are compared too
  ("Email", above).
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
  build, is fixed at once, in the branch that finds it, even when the
  branch has nothing to do with it. Never retried, skipped or masked.
  `retries` stays 0.
- No fixed waits. A flow waits for the thing it's waiting for:
  `tests/storyboard/settle.ts` has `hydrated` (mounted, fonts in, console
  quiet), `scrollSettled` (a smooth scroll at rest), `layoutSettled`
  (images in, nothing moving) and `wholePage` (back at the top, and
  staying there, for a frame after a click, typing or going back has left
  the window somewhere that varies between runs). Playwright's own output (traces) is in
  `test-results/playwright` (`test-results/playwright-storyboard-*` for a
  review), emptied every run; the reviews beside it in
  `test-results/storyboard` are kept, the newest three.
- No stored baselines, and no gate on pixels. Main is the reference.

### What the storyboard covers

Every page is loaded: `public-pages.spec.ts` opens each route in
`tests/routes.ts` (one example per dynamic route), except a campaign's
write and preview pages, which show nothing without a postcode and a letter
and are pictured by the `campaigns` flows instead, and the component
gallery's, which `gallery.spec.ts` pictures; and `staff.spec.ts`
checks every staff page turns a visitor without a session away, then opens
them logged in. The flows below drive the rest. `tests/storyboard/coverage.test.ts`
fails if a spec file or a route handler (`route.ts`) is missing from this
table, so a new one is placed here on purpose, with the flow that drives it
or why nothing does.

| Route or section                                    | Driven by                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public-pages.spec.ts`                              | Every public route: 200, one `<h1>`, no console errors or hydration warnings, no broken same-site links, fixture text where a page shows data.                                                                                                                                                                                                                                                                                |
| `campaigns.spec.ts`                                 | Email your MP, end to end: postcode, letter, preview, sent, the letter and a forwarded reply as emailed; the editor's toolbar and a paste, as sent; the draft kept through Edit, back and reload; going back; a refused letter; the pages opened out of order; each campaign, and the nav's links to them; the campaign pages in search and the sitemap, and the old `/campaigns-v2` links redirecting; the special test MPs. |
| `staff.spec.ts`                                     | Login by emailed link (the email pictured; once, in one browser), the politicians list and a politician's page, setting a status, the audit log, imports and the MP check, a held MP import discarded and applied, the letters list, a bounced letter, log out, noindex.                                                                                                                                                      |
| `collateral.spec.ts`                                | The collateral maker, one flow per studio: a single image from a calendar event, a campaign pack, a gallery; each to its downloads.                                                                                                                                                                                                                                                                                           |
| `consent.spec.ts`                                   | Cookie consent remembered across pages, analytics switched off and on, never on the tools.                                                                                                                                                                                                                                                                                                                                    |
| `mobile-nav.spec.ts`                                | The burger menu on a phone: open, close, dropdowns, navigating, scroll lock released.                                                                                                                                                                                                                                                                                                                                         |
| `onboarding-embed.spec.ts`                          | The home page's signup iframe: shows after slow hydration, ignores other origins.                                                                                                                                                                                                                                                                                                                                             |
| `scroll.spec.ts`                                    | Anchor links, deep links, the back button, keyboard focus, reduced motion, the footer's cookie link, the embed not scrolling the page.                                                                                                                                                                                                                                                                                        |
| `gallery.spec.ts`                                   | The component gallery ("The component gallery", below): its index and a flow per group, one full-page frame of its page, each checked for noindex and console errors; one flow presses an action and a control to show the examples respond.                                                                                                                                                                                  |
| `redirects.spec.ts`                                 | Every redirect in `next.config.ts`, over HTTP, and that each destination resolves.                                                                                                                                                                                                                                                                                                                                            |
| `/api/email-your-mp/lookup`                         | `campaigns`: the postcode form (`lookUpTestMp` in `tests/steps.ts`).                                                                                                                                                                                                                                                                                                                                                          |
| `/api/email-your-mp/letters`                        | `campaigns`: sending the letter (`sendLetter`).                                                                                                                                                                                                                                                                                                                                                                               |
| `/api/postmark/bounce`, `/api/postmark/inbound`     | `campaigns` and `staff`: the webhook flows post Postmark's payloads, with and without credentials; a bounce for a sent letter.                                                                                                                                                                                                                                                                                                |
| `/api/signatories`                                  | `staff`: setting a status, then reading the public list.                                                                                                                                                                                                                                                                                                                                                                      |
| `/api/cron/sync-mps`                                | `syncMps()` in `tests/steps.ts`, at the start of the `staff` and `campaigns` flows that need MPs.                                                                                                                                                                                                                                                                                                                             |
| `/api/cron/check-mps`, `/api/cron/import-controlai` | Not driven. The `staff` import page runs the same check and import through Server Actions; the nightly routes themselves are Vitest-tested.                                                                                                                                                                                                                                                                                   |
| `/api/csp-report`                                   | Not driven: a browser posts to it only on a CSP violation. Vitest-tested.                                                                                                                                                                                                                                                                                                                                                     |
| `/staff/api/login`, `/staff/api/callback`           | `staff`: asking for a login link and opening it (`logInAsStaff` in `tests/steps.ts`).                                                                                                                                                                                                                                                                                                                                         |
| `/staff/api/logout`                                 | `staff`: logging out, and the request without a session.                                                                                                                                                                                                                                                                                                                                                                      |

**Not compared:** the live site. The old diff of the public pages against
pauseai.uk failed on every run on live data (events, news, caches, the
clock), so it went. Bugs only real data shows, and configuration drift on
Netlify, aren't caught here; check previews by hand.

## The component gallery

Every component, and each of its major variants, rendered on fixture data,
a page per group: `/gallery` lists the groups (the UI kit, the header and
footer, each area of the site, the tools, the staff interface), and
`/gallery/<group>` (`/gallery/ui`, `/gallery/staff`) shows that group's
components, with a link to each at the top. It exists only in fixture
builds (`DATA_FIXTURES=1`); production answers 404, and the pages are
noindex.

- **Look there first.** Before making a component, find out whether one
  already does the job, and how the site's pieces look side by side. With
  `DATA_FIXTURES=1` in `.env.local`, `npm run dev` serves it at
  http://localhost:3000/gallery.
- **Where examples go:** `app/(tools)/gallery/_examples/<group>.tsx`, one
  entry per component, `{ name, file, variants: [{ label, render }] }`. One
  that needs state or callbacks goes in the `.client.tsx` beside it.
  `tests/checks/gallery.test.ts` fails if an exported component has none.
- **A major variant** is a prop that changes how the component looks (a
  `variant`, a size, with and without an image). States someone reaches by
  using a page (open, submitted, an error) belong in the storyboard's
  flows, not here.
- **Callbacks do something.** A controlled input sits in `<Controlled>`,
  which holds its value and shows it; an action gets `log("onSave")` from
  `<Logged>`, which lists each call and its arguments under the component
  (`_components/wiring.tsx`).
- **Example data is test data:** obviously fake names, addresses and
  text, as in the browser tests, not copy.
- **To check a component by eye**, picture its group on both viewports and
  open the PNGs (`--paths` prints them; an agent opens them with its file
  reader):

  ```bash
  npm run storyboard -- --no-main --no-open --paths gallery -g 'gallery: ui$'
  ```

  Drop `--no-main` to see main's beside it. The full review pictures every
  group anyway, so a change to a shared component shows wherever it's used.

- Knip leaves the gallery out (`knip.config.ts`): it imports every
  component, so they'd all look used.

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

- **A flaky test is fixed at once**, Vitest or Playwright, by whoever
  finds it, in the branch they're on, even when that branch has nothing
  to do with it. A test that sometimes fails, or a frame that sometimes
  differs, teaches everyone to ignore it, and then it hides a real
  failure. Never retry, skip or loosen it to get past it; find why it
  varies.
- A new component ships with its `*.browser.test.tsx` in the same PR.
- **A new component gets an example in the component gallery**
  (`app/(tools)/gallery/_examples/`, one per major variant), or
  `tests/checks/gallery.test.ts` fails. Look at it there on both viewports
  before calling it done ("The component gallery", above); the storyboard
  then pictures it in every review.
- **A page has no branches** (`tests/checks/thin-pages.test.ts`). Put the
  choice in a component or a `lib/` helper with its own tests.
- **Tests find elements the way a person does**: by role and accessible
  name, label or text (`getByRole`, `getByLabelText`, `getByText`), or by
  the attributes the markup has for its state (`aria-expanded`,
  `aria-pressed`, `data-active`). Where there's nothing semantic to find,
  such as a chart's parts, use a `data-testid`. Never select by a CSS
  module's class (its name is hashed) or import one into a test; to check
  something visual, read its computed style, since a component's module
  loads with it.
- New logic in `lib/` ships with its `*.test.ts`.
- A new staff page, route handler or Server Action under `app/(staff)/`
  must call `requireStaff()` as its first statement, or `tests/checks/staff-auth.test.ts`
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
