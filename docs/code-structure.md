# Code structure

Where code lives in this repo, and the rules for adding more. The plan
behind it is `plans/code-organisation.md`. The test rules are in
`docs/testing.md`.

Next.js doesn't prescribe a layout
(https://nextjs.org/docs/app/getting-started/project-structure). This repo
uses the "split" strategy: shared code at the root, code used by a single
route next to that route.

## Layout

```
app/
  layout.tsx              root: fonts, metadata, footer, cookie consent
  not-found.tsx
  (site)/                 public pages; layout.tsx renders <Nav>
  (tools)/                unlisted volunteer tools and trackers; layout.tsx
                          renders <Nav> and turns analytics off
  (staff)/staff/          the staff interface, behind email login; no <Nav>,
                          no analytics, noindex
  api/                    route handlers, only for things that need a URL
  sitemap.ts, robots.ts
components/               React components used by more than one route
  layout/                 Nav, Footer, CookieConsent and the rest of the chrome
  ui/                     Button, FeatureCard, CopyLinkButton: small building blocks
  events/                 EventList, LocalGroupEvents
  people/                 PersonCard, StoryShareForm
  local-groups/           LocalGroupPage, which renders every group's page
lib/                      logic and data, no React state
  server/                 calls to outside services and the database;
                          `import "server-only"`
  content/                the site's content as typed data (people, blog, ...)
  collateral/             the collateral tool's drawing engine
  events.ts, trackers.ts  pure helpers for one feature each
  metadata.ts             pageMetadata()
styles/                   global CSS: tokens and base styles
netlify/                  database migrations, scheduled functions
proxy.ts                  turns away /staff requests without a session cookie
tests/                    Playwright suites, the route list, fixtures
docs/, plans/
```

Route groups like `(site)` don't appear in URLs. Folders starting with `_`
(e.g. `_components/`) are private: Next never turns them into routes.

## Rules

- **Where a component goes.** One used by two or more routes goes in
  `components/`. One used by a single route goes in that route's
  `_components/`.
- **Pages are thin.** A `page.tsx` holds its metadata, its data loading
  (calling `lib/`) and the order of its sections. Content and markup belong
  in components, and helper functions in `lib/`, where they can be tested.
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
- **Outside services** (Luma, Airtable) are only called from `lib/server/`,
  through `outsideFetch` (`lib/server/outside-fetch.ts`), so tests can swap in
  fixtures. ESLint rules (`npm run lint`) fail on
  their API hosts anywhere else, and lock Airtable to
  `lib/server/airtable.ts`. Files there import `server-only`, so they can't
  end up in a browser bundle.
- **The database** is only reached through `lib/server/db.ts`, which is the
  only file that may import `pg` or read `NETLIFY_DB_URL` (an ESLint rule,
  in `npm run lint`). Queries are plain SQL; no ORM.
  Schema changes are new files in `netlify/database/migrations/`, which
  Netlify applies before each production publish and to each preview's copy
  of the database. They must be backward compatible (expand, then contract)
  and work with or without a transaction around the file. With each one,
  run `npm run db:schema` and commit `netlify/database/schema.sql`, the
  whole schema as the migrations leave it, so the PR shows what changed. A
  test fails while it's out of date.
- **Staff pages** each call `requireStaff()` (`lib/server/staff-auth.ts`)
  first, as does every staff route handler and Server Action
  (`staff-auth.test.ts`). `proxy.ts` only checks the cookie exists.
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
  not written yet are placeholders: Latin, starting with the asterism
  (U+2042), so they can't be mistaken for real copy.
  `placeholder-copy.test.ts` fails while any are left, which stops them
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
- **Imports** use the `@/` alias for anything outside the current folder.
- **Tests** sit next to the code they test (`*.test.ts`,
  `*.browser.test.tsx`); see `docs/testing.md`.

## Styling

- `styles/tokens.css` (fonts and CSS variables) and `styles/base.css`
  (reset, element defaults, `.container`) load first, from the root layout.
- UI kit components (`components/ui/`) have CSS modules, imported by the
  root layout before `app/globals.css`. To restyle one in context, target
  its data attribute (`[data-button][data-variant="ghost"]`,
  `[data-card]`), which keeps the same specificity as the old global class.
- `app/globals.css` still holds the rest of the site's shared styles, and
  some pages import plain global stylesheets (`track-record.css` is shared
  by several). New components get a `.module.css`; move a page's styles to
  modules when you next work on it, rather than adding to the global files.

## Still to do

From `plans/code-organisation.md`, not done yet:

- A `Section` component for the repeated `section` / `section-header` /
  `section-lede` markup.
- Page stylesheets to CSS modules, page by page (see Styling).
