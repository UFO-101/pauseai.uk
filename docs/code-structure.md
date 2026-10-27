# Code structure

Where code lives in this repo, and the rules for adding more. The test
rules are in `docs/testing.md`.

Next.js doesn't prescribe a layout
(https://nextjs.org/docs/app/getting-started/project-structure). This repo
uses the "split" strategy: shared code at the root, code used by a single
route next to that route.

## Layout

```
app/
  layout.tsx              root: fonts, metadata, cookie consent
  not-found.tsx
  (site)/                 public pages; layout.tsx renders <Nav> and <Footer>
  (tools)/                unlisted volunteer tools and trackers; layout.tsx
                          renders <Nav> and turns analytics off
    gallery/              the component gallery: every component on fixture
                          data, fixture builds only (docs/testing.md)
  (staff)/staff/          the staff interface, behind email login; no <Nav>,
                          no analytics, noindex
  (march)/protests/march-against-ai-extinction-nov-26/
                          the march's sign-up, in its own style (Styling,
                          below)
  api/                    route handlers, only for things that need a URL
  sitemap.ts, robots.ts
components/               React components used by more than one route
  layout/                 Nav, Footer, CookieConsent and the rest of the chrome
  ui/                     the design system: Button, fields, tables, tags, cards
  events/                 EventList, LocalGroupEvents
  people/                 PersonCard, StoryShareForm
  local-groups/           LocalGroupPage, which renders every group's page
  tools/                  the tools index's cards, and the kit the
                          collateral maker and QR tool share
lib/                      logic and data, no React state
  server/                 server-side logic and the database;
                          `import "server-only"`
    outside-services/     one binding per outside service, the only
                          code that calls one (outsideFetch)
  content/                the site's content as typed data (people, blog, ...)
  collateral/             the collateral tool's drawing engine
  events.ts, trackers.ts  pure helpers for one feature each
  metadata.ts             pageMetadata()
styles/                   global CSS: tokens and base styles
netlify/                  database migrations, scheduled functions
backup/                   the nightly database backup: a Cloudflare Worker and
                          container, a package of its own (backup/README.md)
proxy.ts                  turns away /staff requests without a session cookie
tests/                    Playwright suites, the route list, fixtures,
                          Vitest setup
  checks/                 tests that scan the whole repo (placeholders,
                          coverage ignores, assets, staff auth)
scripts/                  database, storyboard and data scripts
                          (scripts/README.md)
docs/
plans/                    plans for work in progress, deleted when done;
                          nothing references them
```

Route groups like `(site)` don't appear in URLs. Folders starting with `_`
(e.g. `_components/`) are private: Next never turns them into routes.

## Rules

A rule about which code may import or call what is enforced by an ESLint
rule in `eslint.config.mjs`, not left to review: a new rule of that kind
gets its ESLint rule in the same change, and the rule's message says where
the code should go instead. The rules below say which ones are enforced.

- **Where a component goes.** One used by two or more routes goes in
  `components/`. One used by a single route goes in that route's
  `_components/`.
- **Which folders import which.** A route imports `components/`, `lib/`
  and the `_components/` folders above it, by a relative path, but never
  another route's folder or anything by `@/app/`. `components/` doesn't
  import routes, and `lib/` imports neither routes nor components, except
  the content in `lib/content/`, which is partly JSX. Tests and the
  component gallery may reach across. An ESLint rule enforces it (`LAYERS`
  in `eslint.config.mjs`).
- **Redirects are in `next.config.ts`.** A path that only sends people
  elsewhere is an entry in its `redirects()`, never a page that calls
  `redirect()`: on a click within the site, a page that redirects while
  rendering shows the layout's header and footer with nothing between them
  for a moment. A `page.tsx` may not import `redirect` or
  `permanentRedirect` (`PAGE_REDIRECT` in `eslint.config.mjs`).
- **Pages are thin.** A `page.tsx` holds its metadata, its data loading
  (calling `lib/`) and the order of its sections. Content and markup belong
  in components, and helper functions in `lib/`, where they can be tested.
  Pages and layouts are outside the coverage gate, so they have no
  branches at all: no `if`, `? :`, `&&`, `||`, `??`, `?.`, loop or default
  value (`tests/checks/thin-pages.test.ts`). A page that 404s on a missing
  record calls `found(findPost(slug))` (`lib/found.ts`); one that reads a
  filter from its URL calls a parser (`lib/staff-search.ts`); one whose
  markup depends on state renders a component that takes it as props
  (`LoginForm`, `PoliticianDetails`).
  Repeated markup becomes a component for one item (`TimelineEntry`,
  `JobRole`); one-off prose can stay as JSX inside a section component.
- **Metadata** comes from `pageMetadata()` (`lib/metadata.ts`), which fills in
  the social preview images, the "PauseAI UK | <title>" social title and the
  canonical path.
- **No scripts in `public/`.** Browser behaviour goes in a typed
  `"use client"` component, like the track record's `Gallery`.
- **Components render their state.** What a component shows comes from
  React state or props, not from an effect that finds elements and edits
  them (`querySelector`, `classList`, `setAttribute`, `innerHTML`). That
  splits the page's state between React and the DOM, and React can render
  over the change. Hold it in `useState`, pass it down or through a
  context, and use a ref only for an element an effect has to measure or
  observe (the header's height, the timeline's entries). An ESLint rule
  (`npm run lint`) fails on the DOM calls in `app/` and `components/`; the
  files written before it are listed there, to be converted, not added to.
  A genuine exception gets an `eslint-disable-next-line` with the reason.
- **Browsers.** The site is built for browsers up to about a year old. In
  older ones it may look a bit off (the mobile menu's scroll lock needs
  `:has()`, Firefox 121+), but it must still work: every page readable,
  every link and form usable. Use a feature that new without asking; flag
  one that would break an older browser.
- **Layouts own the chrome.** Pages don't render `<Nav>`; their route
  group's layout does.
- **Outside services** (Airtable, Luma, Postmark, postcodes.io, Stripe,
  Turnstile, Parliament, ControlAI's letter) are each called from one binding in
  `lib/server/outside-services/`, through `outsideFetch`
  (`outside-fetch.ts` there), so tests and fixture builds can answer
  instead. The rest of the code calls the binding's functions. A new
  service gets a new binding there, and its canned answers in
  `tests/fixtures/outside-services.ts` (`docs/testing.md`, "Mocking").
  ESLint rules (`npm run lint`) fail on, in the site's code:
  - importing `outsideFetch` outside that folder, or calling `fetch()` in
    server code (`lib/server/`, route handlers, Server Actions);
  - importing Node's network modules, an HTTP client or a service's SDK
    (`NETWORK_IMPORTS`), which make requests the fixtures can't answer;
  - naming a service's API host outside its binding (`SERVICES` in
    `eslint.config.mjs`, where a new binding's host goes). Parliament's and
    ControlAI's are left out, as pages link to them too.

  Files there import `server-only`, so they can't end up in a browser
  bundle.

- **Email** goes out only through `send()` (`lib/server/email.ts`), which
  skips blocked addresses and records each send (`docs/domain-concepts.md`).
  Only it may import `sendEmail` or `unsuppress` from Postmark's binding,
  `lib/server/outside-services/postmark.ts` (an ESLint rule).
- **The database** is only reached through `lib/server/db.ts`, which is the
  only file that may import `pg` or read `NETLIFY_DB_URL` (an ESLint rule,
  in `npm run lint`). Queries are plain SQL; no ORM.
  Schema changes are new files in `netlify/database/migrations/`, which
  Netlify applies before each production publish and to each preview's copy
  of the database. They must be backward compatible (expand, then contract)
  and work with or without a transaction around the file. Once pushed, a
  migration is never edited: a preview's database may have applied it, and
  Netlify refuses a migration changed since, so a change is a new file. With each one,
  run `npm run db:schema` and commit `netlify/database/schema.sql`, the
  whole schema as the migrations leave it, so the PR shows what changed. A
  test fails while it's out of date. Tables follow the SQL rules below.
- **Links to the site** in emails and redirects are built with
  `siteUrl(path, request)` (`lib/site-url.ts`), on the deploy's own address
  (`SITE_ORIGIN`, set in `next.config.ts` from Netlify's settings):
  `https://pauseai.uk` in production. On Netlify a request's own URL has the
  `main--pauseaiuk.netlify.app` host, and anyone can set its Host, so the
  site's code never reads a request's URL, origin or Host header, or
  `SITE_ORIGIN` itself (an ESLint rule, in `npm run lint`). Links in pages
  are relative.
- **Staff pages** each call `requireStaff()` (`lib/server/staff-auth.ts`)
  first, as does every staff route handler and Server Action
  (`tests/checks/staff-auth.test.ts`). `proxy.ts` only checks the cookie exists.
- **Scheduled jobs** are Netlify scheduled functions, each in its own folder
  in `netlify/functions/`, that POST to a route under `app/api/cron/` with
  `CRON_SECRET`. The work itself stays in the Next app.
- **Write it once.** Pages that share a shape share a component: each local
  group page is `LocalGroupPage` plus its content in
  `lib/content/local-group-pages.tsx`, and each flyering tracker is
  `FlyeringTracker` plus a short config.
- **Content vs logic.** Data the site displays (people, posts, press, board)
  goes in `lib/content/`. Logic goes next to the feature it serves
  (`lib/events.ts`, `lib/collateral/`).
- **Where the words go.** A page's own text is written in the page. A
  tool's words (labels, messages, errors, the emails it sends) go in one
  copy object in `lib/content/<feature>.ts`, such as `copy` in
  `lib/content/email-your-mp.ts` and `staffCopy` in
  `lib/content/staff-interface.ts`. So the wording can be changed in one
  file without touching the code, and components and tests refer to it by
  name (`staffCopy.syncs.syncNow`), so changing it breaks nothing. Words
  not written yet are placeholders: a draft in English, starting with the
  asterism (U+2042), so they can't be mistaken for real copy.
  `tests/checks/placeholder-copy.test.ts` fails while any are left, which stops them
  being deployed (AGENTS.md).
- **Names say which one.** There will be many campaigns, letters, imports
  and statuses, so an exported name for one of them names it:
  `SOBEL_BILL_CAMPAIGN`, not `BILL_CAMPAIGN`; `CONTROLAI_LETTER_PAGE`, not
  `LETTER_PAGE`; `ControlAiImportResult`, not `ImportResult`. Generic
  names (`Signatory`, `Problem`, `ImportResult`) are for the one thing
  shared by all of them, and two exports in the repo shouldn't share a
  name. Pass the data (an MP's statuses) rather than unpicking one case of
  it at the call site (`signedControlAiLetter`), so the next campaign
  doesn't widen the call site too.
- **Personal data changes the privacy record.** A change that adds,
  copies or uses data about a person, or a new processor, updates
  `docs/data-protection.md` and the privacy policy in the same change,
  and a plan for one says what it does to both and to erasure first.
- **Comments describe the code as it is**: what it does and why, never
  its history (what it replaced, what changed, which plan brought it).
  History is for commit messages. Nothing references `plans/`, which is
  temporary: a plan is deleted when it's done. The rest of the rules are
  under "Comments" below.
- **Imports** use the `@/` alias for anything outside the current folder.
- **Tests** sit next to the code they test (`*.test.ts`,
  `*.browser.test.tsx`); see `docs/testing.md`. Tests of the whole repo,
  rather than of one file, go in `tests/checks/`.

## Comments

A comment describes the code as it stands, to someone reading it for the
first time. It doesn't tell the code's history (above). Beyond that:

- **No measurement that goes out of date.** "A fifth of the MPs", "1790 of
  1880 tests" or "about 40 constituencies" is wrong after the next import
  or run, and nothing in the gate checks it. Write the lasting claim ("most
  MPs have no reply yet") and put the figure in the commit message, which
  has a date. A number the code fixes is fine: a threshold the next line
  compares against, or a cap the config sets.
- **Explain once, where the thing is defined.** The same explanation at
  every call site is one more copy to keep true each time, and the copies
  drift apart. Elsewhere, one line that names the thing is enough.
- **Tests comment the fact a fixture pins, not the fixture.** Write "two
  MPs share a surname, so the match has to use the constituency", not "an
  MP list with a second Smith in it so that matching on surname alone
  picks the wrong one". The reader wants to know which property of the
  data the test depends on, so they keep it when they change the fixture.
- **A comment about code somewhere else has to be checked from both
  sides.** One that describes another file, a route, a service or what the
  page shows is a claim about that other place, and whichever side moves
  can break it. If they no longer match, the comment has the bug: fix it
  in the same change as the code, or delete it.

Keep comments short. Readers skip a long comment whole, including the part
that mattered, so cut until only what a reader couldn't work out from the
code remains. Do give the reason for anything a reader might simplify away,
such as an ordering that isn't obvious or a workaround for a quirk in
Next.js or a browser. "Rather than" is fine when it contrasts two options a
reader could pick today ("a fixed height, not max-height, so a small photo
still scales up"), never the code with what it used to be.

## SQL

Every rule that can be stated in the schema is stated there, so nothing has
to clean up after bad rows.

- **Constrain everything.** Every reference to another row is a foreign key
  with the `ON DELETE` rule that fits. A fixed set of values is `text` with
  a `CHECK (… IN (…))` list, not an enum type. A rule between columns is a
  `CHECK` too: `(status = 'failed') = (error IS NOT NULL)`. A row that
  points at one of several tables has a nullable foreign key column for
  each and `CHECK (num_nonnulls(…) = 1)`, not a `(source, source_id)` pair
  of text. A `CHECK` depends only on the row's own columns, never `now()`
  or another table.
- **Addresses are lowercased in the row** (`CHECK (address =
lower(address))`) when our own code writes them, so equality is plain `=`.
- **History tables are insert-only** (`audit_log`, `email_problems`,
  `letter_events`). The current state is derived from them, or kept in a
  second table written in the same transaction (`email_blocks`).

### How fast a query has to be

Most tables here stay small (staff accounts, import state, a few hundred
MPs), and most queries look rows up by a key that's already indexed. Those
need no thought. Two kinds of query do, and get it when they're written:

- **One a page runs on every view, over a table that keeps growing**
  (`audit_log`, `letters`, `luma_guests`, `supporters`, `import_runs`). It
  reads only the rows it shows: an index on what it filters by, or a
  `LIMIT`. A field inside `jsonb` details gets an expression index, partial
  to the rows it applies to, written exactly as the query writes it, casts
  included, or Postgres won't use it (`audit_log_status_sets`, for a
  politician's history).
- **One that builds a row for each of many things from several sources**
  (a list of supporters, each with their name, emails, counts and latest
  activity). It groups each source once and joins the results, rather than
  running a subquery per column for every row (`supporters_summary`).
  Subqueries over views of views, once per row, are what the planner prices
  highest. A list sorted or filtered by what that works out can't use an
  index on it, so keep it (a materialized view, as `supporters_list`) and
  read the kept rows; and take the page's rows before building their
  columns, or they're built for every row the sort reads.

For either, check it before calling it done: fill a throwaway database to
about the size the real data will reach in a year (`scripts/fresh-database.mjs`
with the fixtures, then `generate_series` for the bulk), and run
`EXPLAIN (ANALYZE)` on the query as the code builds it. It should read an
index rather than scan the whole table, and take milliseconds. Also look at
the planner's cost on a fresh, never-analysed database, as the tests' are:
above 100,000 (`jit_above_cost`), Postgres compiles the query first where it
has JIT, as CI's image does, which can take seconds
for a query that runs in milliseconds. This container's Postgres has no JIT
(`pg_jit_available()` is false), so a query too costly for CI still passes
here; the cost is the only warning.

Beyond that, no speculative indexes: one costs every write to its table and
is easy to add later, when a query that's actually used turns out slow.

## Styling

The component gallery (`/gallery` on a fixture build; `docs/testing.md`,
"The component gallery") shows every component and its variants. Look
there before writing a new one or new CSS: the piece may exist, or need
only a variant. The look itself (colours, type, buttons, cards) is in
`docs/style-guide.md`.

- **Global CSS is two files.** `styles/tokens.css` (fonts, and every colour,
  width, shadow, space, type size and corner as a variable, and the
  compact density) and `styles/base.css` (the reset, element
  defaults, scrolling, `.container` and `.inline-link`), imported by the root
  layout and nothing else. There is no other global stylesheet.
- **A component owns its styles**, in a `.module.css` beside it. A page has
  no stylesheet: it is thin, and its sections are components.
- **No reaching in.** A stylesheet never selects another component's
  elements, by class, data attribute or tag. To make a component look
  different in a context, give it a prop or a variant (`Button`'s `light`,
  `Section`'s `tone`). Where a container needs to size or space its
  children, the child reads a documented custom property that the container
  sets on itself: `--container-width` (`.container`'s width),
  `--button-padding` / `--button-font-size` / `--button-font-weight`
  (`Button`), `--icon-button-size` (`IconButton`). A `className` passed into
  a component is for its place in a layout (margins, position), never for a
  property the component sets itself. Two modules never set the same
  property on the same element: which wins would depend on which stylesheet
  the page loaded last, which Next doesn't promise.
- **`.container` sets only its sides** (its width, side margins and side
  padding), so a module class on the same element can set its top and
  bottom.
- **Every colour is a token.** No hex, `rgb()`/`hsl()` with numbers, or
  named colour outside `styles/tokens.css`; Stylelint refuses them. An alpha
  uses the `-rgb` channels: `rgb(var(--white-rgb) / 0.1)`.
- **In `components/ui/`, sizes are tokens too.** Margins, padding, gaps,
  font sizes and corners are `--space-*`, `--text-*`, `--radius-*` or the
  density's tokens; Stylelint refuses a raw `px` or `rem` there. Which
  step to use, and when a value needn't be a token, is in
  `docs/style-guide.md` ("Using the spacing", "When a value isn't a
  token"). The
  kit's files whose sizes aren't tokens yet are listed in
  `stylelint.config.mjs`, to be converted, not added to.
- **Density is a container's.** A screen of tables and filters (the staff
  interface, through `StaffPage`) sets `data-density="compact"` on itself,
  and the kit's fields, tables and tags inside it are tighter. Components
  take no density prop (`docs/style-guide.md`, "Density").
- **Fields are the kit's.** Every `<input>`, `<select>` and `<textarea>` is
  `components/ui/Controls.tsx`'s, labelled with `Field.tsx`'s pieces and laid
  out with `Form.tsx`'s (`tests/checks/form-controls.test.ts`).
- **Class names in a module are short and local** (`.hero`, `.title`), one
  class deep where the markup allows. State a script or a test needs to
  read is an attribute (`data-active`, `aria-pressed`, `aria-expanded`), not
  a class.
- **Shared pieces are components.** Used by two or more routes, in
  `components/`: `components/ui/` has the site's kit (`Button`,
  `IconButton`, `LinkButton`, `PageHero`, `Section`, `Foreword`, `Closing`,
  `Callout`, `ButtonRow`, `Actions`, `PhotoCard`, `FeatureCard`, `Lightbox`,
  `ProsePage`, `SmallPrint`; the forms' `Field`, `Controls` and `Form`;
  `Tag`, `Table`, `Text` and `StatusMessage`); `components/layout/` the header, footer and banners;
  `components/events/`, `components/people/` and `components/tools/` the
  pieces of those areas. Used by one route, in its `_components/`, with a
  small kit there where several of its components share a shape (the
  staff interface's page frame in `app/(staff)/staff/_components/ui/`). A
  piece a second route needs moves to `components/`: the collateral
  maker's studio layout, which the QR tool shares, is in
  `components/tools/kit/`.
- **Classes from content.** HTML that lib/ writes as strings (press logos,
  blog footnotes) keeps global class names, which the component that shows
  it selects with `:global()` inside its own root class.

### The march sign-up

`/protests/march-against-ai-extinction-nov-26` (`app/(march)/protests/march-against-ai-extinction-nov-26/`)
is a sub-site in its
own poster style, deliberately unlike the rest of the site: ink and paper,
a hotter orange, Anton for headings, square corners and hard shadows. It
follows the rules above, with these exceptions:

- **One stylesheet for the sub-site.** Its components share
  `_components/march.module.css`, in the order its rules cascade, and take
  their classes through `m()` (`_components/classes.ts`). Its element
  styles sit inside `:where(.frame)`, the frame every page of it is in
  (`MarchSignupFrame`), so they reach nothing outside it. Its colours are
  the `--march-*` tokens in `styles/tokens.css`, and Anton is self-hosted
  there.
- **Its own fields.** The form's controls are its own, in its style, not
  the kit's (`tests/checks/form-controls.test.ts`).
- **Its own header.** Its layout renders `SignupHeader`, not `<Nav>`, and no
  march banner; the site's footer comes from the root layout as everywhere.
