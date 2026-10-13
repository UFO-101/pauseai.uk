# Code organisation plan

Written 2026-10-13. Status: proposed, not started.

## Scope

Restructure what already exists so that the codebase can take a lot more
features later. This plan builds no new features. Every step is a refactor
with no visible change: the visual diff (phase 1 of `plans/test-coverage.md`) must
pass unchanged.

## Problems today

- **No shared UI components.** Buttons, cards and sections are CSS classes in
  `app/globals.css` (2,700 lines), written into JSX by hand. For example,
  `className="btn primary large"` appears about 70 times.
- **Page CSS is global, not scoped.**
  - 14 page stylesheets (5,200 lines) are plain global imports.
  - Some pages import other pages' CSS; three pages import
    `track-record.css`, for example.
  - Next doesn't unload these when you navigate, so styles can clash between
    pages (https://nextjs.org/docs/app/getting-started/css).
- **The layout is repeated.** 30 pages import and render `<Nav>` themselves,
  while `<Footer>` is in the root layout.
- **Copy-pasted pages.**
  - The six local group pages (85–140 lines each) are near-identical.
  - The two flyering trackers are 172-line copies that differ in about 24
    lines.
- **One feature split across two places.** The collateral tool's logic is in
  `lib/collateral/` (20 files), but its UI, hooks and state are in
  `app/tools/collateral/` (19 files).
- **Shared components in odd places.**
  - `app/OnboardingFormEmbed.tsx` is used by both `/` and `/campaigns`, yet
    sits loose at the top of `app/`.
  - `HeroMarqueeEffects.tsx` sits next to it, but only the home page uses it.
- **Pages are big single functions.** Content, layout and logic are all
  inline.
  - `track-record/page.tsx` is 921 lines: about 10 timeline entries,
    hand-written as repeated JSX blocks.
  - `future-of-workforce-inquiry` is 603 lines, `app/page.tsx` 346 and
    `jobs` 324.
  - Constants and helper functions sit inside page files. The trackers have
    8 each.
- **Plain JavaScript loaded from `public/`.** `track-record.js` and
  `evidence-ai-workforce.js` are loaded with `<Script>`. They're untyped,
  outside the build, and invisible to lint and to coverage.
- **Repeated metadata.** 22 pages hand-write the same `openGraph` and
  `twitter` blocks with the same default images.
- **`lib/data/` mixes two kinds of code.**
  - Static content: `people`, `blog`, `press-coverage`, `staff`, `board`.
  - Code that calls outside services: `events`, `luma-sources`.
  - `lib/airtable.ts` is separate again.
  - Nothing marks code as server-only.

## Target layout

Next.js doesn't prescribe a folder layout
(https://nextjs.org/docs/app/getting-started/project-structure). This keeps
the repo's existing "split" strategy (shared code at the root, single-route
code next to its route) and makes it consistent.

```
app/
  (site)/                 public pages; layout.tsx renders <Nav>
    page.tsx
    _components/          home-only: HeroMarqueeEffects
    donate/ people/ blog/ campaigns/ …
    global-ai-sentiment-2026/
      _components/        CountryExplorer, WorldMap, …
  (tools)/                unlisted volunteer tools; own layout
    tools/collateral/  tools/qr/  trackers/
  api/
components/
  ui/                     Button, Card, Section, … each with .module.css
  layout/                 Nav, Footer, FooterYear, CookieConsent, NoAnalytics
  events/                 EventList, LocalGroupEvents
  people/                 PersonCard, PeopleCarousel, StoryShareForm
  local-groups/           LocalGroupPage, LocalGroupsMap
  embeds/                 OnboardingFormEmbed
lib/
  server/                 `import "server-only"`: airtable, luma, events
  content/                static content: people, blog, press, staff, board, site
  collateral/             unchanged
  trackers/               shared tracker logic
styles/
  tokens.css              the CSS variables now at the top of globals.css
  base.css                reset, typography, element defaults
```

Route groups `(site)` and `(tools)` don't change URLs. `_components/` folders
are private, so they never become routes.

## Rules

- A component used by two or more routes goes in `components/<area>/`. One
  used by a single route goes in that route's `_components/`.
- Every component gets its own `.module.css`. Global CSS is limited to tokens
  and base styles. No page-level global stylesheets.
- Only `lib/server/` may call outside services. This extends the existing CI
  Airtable check to cover Luma too.
- Use the `@/` import alias everywhere.
- **Pages are thin.** A `page.tsx` should only contain:
  - its metadata (from a shared helper);
  - its data loading (by calling `lib/`);
  - the order of its sections, each one a component.

  Rough limit: about 80 lines.
  - Repeated content (timeline entries, jobs, board members) becomes data in
    `lib/content/` plus a component that renders one item.
  - One-off prose can stay as JSX inside a section component.
  - Constants and helper functions move out of page files into `lib/`, where
    they can be unit-tested.
- **No scripts in `public/`.** Browser behaviour goes in a typed
  `"use client"` component.
- **Metadata.** Use one `pageMetadata({ title, description, path, image? })`
  helper in `lib/`. Pages don't hand-write `openGraph` or `twitter` blocks.

## Phases

One PR each, in this order:

0. **Write `docs/code-structure.md`.** It describes the target layout and
   the rules above, and is linked from `README.md`. Update it as each phase
   lands.
1. **Layout groups.** Create `(site)` with a layout that renders `<Nav>`, and
   remove `<Nav>` from the 30 pages. Move the tools and trackers into
   `(tools)`.
2. **Split `globals.css`** into `styles/tokens.css` and `styles/base.css`.
   The remaining global classes stay for now.
3. **UI kit.**
   - Build `Button`, `Card` and `Section` in `components/ui/`, using CSS
     Modules.
   - Replace the `btn`, `feature-card` and `section` class uses, then delete
     those global rules.
4. **Move components** into `components/<area>/` and `_components/` as laid
   out above. These are moves only, with no changes to the code.
5. **Split `lib/`.**
   - Move the outside-service code to `lib/server/` with `server-only`.
   - Move static content to `lib/content/`.
   - Update `scripts/check-airtable-filter.mjs`.
6. **Remove the copy-paste.**
   - Local groups become data in `lib/content/local-groups.ts` plus one
     `LocalGroupPage`. Each route file becomes a few lines, and URLs stay
     the same.
   - Trackers become one shared component plus a per-event config.
7. **Thin pages.**
   - Add the `pageMetadata` helper and use it in all 22 pages.
   - Turn `public/track-record.js` and `public/evidence-ai-workforce.js` into
     client components.
   - Split the biggest pages into section components, with repeated content
     moved to data. Order: `track-record`, `future-of-workforce-inquiry`,
     home, `jobs`, `governance`.
8. **Collateral.** Move the UI, hooks and state from `app/tools/collateral/`
   into its `_components/`. Keep `lib/collateral/` as the pure logic.
   Reconsider merging them only if the boundary between them stays blurry.
9. **Page CSS to modules**, one page per PR or whenever a page is next
   touched. Once this is done, delete the cross-page CSS imports such as
   `track-record.css`.

## Open question

1. Should `/global-ai-sentiment-2026` and the trackers be treated as one-off
   campaign pages and left alone, or brought up to the same standard?
