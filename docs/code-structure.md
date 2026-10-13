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
  api/                    route handlers, only for things that need a URL
  sitemap.ts, robots.ts
components/               React components used by more than one route
  layout/                 Nav, Footer, CookieConsent and the rest of the chrome
  ui/                     Button, CopyLinkButton: small building blocks
  events/                 EventList, LocalGroupEvents
  people/                 PersonCard, StoryShareForm
lib/                      logic and data, no React state
  server/                 calls to outside services; `import "server-only"`
  content/                the site's content as typed data (people, blog, ...)
  collateral/             the collateral tool's drawing engine
  events.ts, trackers.ts  pure helpers for one feature each
styles/                   global CSS: tokens and base styles
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
- **Layouts own the chrome.** Pages don't render `<Nav>`; their route
  group's layout does.
- **Outside services** (Luma, Airtable) are only called from `lib/server/`,
  through `outsideFetch` (`lib/server/outside-fetch.ts`), so tests can swap in
  fixtures. ESLint rules (run by `npm run check:airtable-filter`) fail on
  their API hosts anywhere else, and lock Airtable to
  `lib/server/airtable.ts`. Files there import `server-only`, so they can't
  end up in a browser bundle.
- **Content vs logic.** Data the site displays (people, posts, press, board)
  goes in `lib/content/`. Logic goes next to the feature it serves
  (`lib/events.ts`, `lib/collateral/`).
- **Imports** use the `@/` alias for anything outside the current folder.
- **Tests** sit next to the code they test (`*.test.ts`,
  `*.browser.test.tsx`); see `docs/testing.md`.
