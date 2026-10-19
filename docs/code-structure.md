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
  layout.tsx              root: fonts, metadata, footer, cookie consent
  not-found.tsx
  (site)/                 public pages; layout.tsx renders <Nav>
  (tools)/                unlisted volunteer tools and trackers; layout.tsx
                          renders <Nav> and turns analytics off
    gallery/              the component gallery: every component on fixture
                          data, fixture builds only (docs/testing.md)
  (staff)/staff/          the staff interface, behind email login; no <Nav>,
                          no analytics, noindex
  api/                    route handlers, only for things that need a URL
  sitemap.ts, robots.ts
components/               React components used by more than one route
  layout/                 Nav, Footer, CookieConsent and the rest of the chrome
  ui/                     the design system: Button, fields, tables, tags, cards
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

- **Where a component goes.** One used by two or more routes goes in
  `components/`. One used by a single route goes in that route's
  `_components/`.
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
  not written yet are placeholders: Latin, starting with the asterism
  (U+2042), so they can't be mistaken for real copy.
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
- **Comments describe the code as it is**: what it does and why, never
  its history (what it replaced, what changed, which plan brought it).
  History is for commit messages. Nothing references `plans/`, which is
  temporary: a plan is deleted when it's done.
- **Imports** use the `@/` alias for anything outside the current folder.
- **Tests** sit next to the code they test (`*.test.ts`,
  `*.browser.test.tsx`); see `docs/testing.md`. Tests of the whole repo,
  rather than of one file, go in `tests/checks/`.

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
  collateral maker's studio layout in its `kit/`, the staff interface's
  page frame in `app/(staff)/staff/_components/ui/`). A piece a second
  route needs moves to `components/ui/`.
- **Classes from content.** HTML that lib/ writes as strings (press logos,
  blog footnotes) keeps global class names, which the component that shows
  it selects with `:global()` inside its own root class.
