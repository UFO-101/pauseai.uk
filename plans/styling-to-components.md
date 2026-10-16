# Styling into components plan

Written 2026-10-16. Status: not started; starts once the branches in
flight (`sobel-bill-support`, Email your MP v2) have merged, so the one
branch this needs doesn't fight them. Follows on from
`plans/code-organisation.md`, phase 9 ("Page CSS to modules") and the
`Section` component left over from its phase 3.

## Scope

Move every style into the component it styles, as a CSS module next to that
component, making new components where the same markup is repeated. At the
end, the only global CSS is `styles/tokens.css` and `styles/base.css`.

Every step is a refactor with no visible change. The storyboard review
(`npm run storyboard`) pictures every page on both viewports against main,
so each commit is checked by looking at every frame and expecting no
difference. A frame that differs is a bug in the commit unless its message
says why.

Building no new features; changing no copy.

## Today

- **`app/globals.css` is 2,901 lines** and holds the header, nav, burger
  menu, event banners, the home page's hero marquee, sections, local-group
  cards and map, the news marquee, people carousel, shop banner, callout,
  footer, QR dialog, cookie banner, march banner, and the whole donate and
  privacy pages. It also still has a few dead classes (`amount-custom`,
  `amount-help`, `amount-input-wrap`, `amount-other`, `amount-suffix`,
  `currency-prefix`, `luma-events-footer`, `news-logo-text*`,
  `person-meta`, `person-avatar-pause-icon`: nothing in `app/` or
  `components/` uses them). The donate form still uses `amount-selector`,
  `amount-grid` and `amount-option`.
- **14 page stylesheets, about 5,100 lines, are plain global imports.**
  `app/(site)/track-record/track-record.css` (577 lines) is imported by
  twelve other routes: blog, blog/[slug], events, future-of-workforce-inquiry,
  global-ai-sentiment-2026, governance, jobs, people, people/[slug], press,
  theory-of-change and what-is-pauseai-uk. Each wraps its page in
  `<main className="track-record …">` to get the hero (`.tr-hero`,
  `.tr-hero-inner`, `.tr-hero-title`, `.tr-hero-lede`, `.tr-hero-swirl`,
  `.tr-title-accent`), and some the foreword, closing and lightbox styles
  too. Seven of them then override the hero in their own stylesheet
  (padding, lede links, a title size) or copy its 880px inner width so the
  body lines up with it.
- Likewise `app/(tools)/tools/qr` imports the collateral tool's 1,045-line
  stylesheet, `trackers/page.tsx` imports `tools.css`, and `campaigns-v2`'s
  layout imports `campaigns.css`.
- **Four CSS modules exist**: `Button`, `FeatureCard`, the staff interface's
  one `staff.module.css` (329 lines, shared by 11 components and 7 pages) and
  `EmailYourMp.module.css` (481 lines, shared by 11 components).
- **Buttons.** `components/ui/Button` has `primary` and `ghost` in `small`
  and `large`. Eight places then reach into it from outside with
  `[data-button]` selectors (the home hero's marquee, the donate button,
  the cookie banner, the press contact, the collateral tool's action rows),
  which is why the root layout has to import `Button.module.css` before
  `globals.css`. Other things that are buttons are styled on their own:
  `.story-share-btn` (also reused by the track record's copy-link button),
  `.people-carousel-btn`, the lightbox's `.lb-prev/.lb-next/.lb-close`, the
  footer's QR button, `.gas-map-metric-btn`, `.collateral-menu-button`.
- **Colours are written out by hand.** About 150 raw colour values sit
  outside `tokens.css`: 29 `#fff`, 7 `#000`, around 40 white and black
  alphas for overlays and photo text, `#f7f7f7`, `#b00020` (an error red
  in two places), shadows in `rgba(20, 14, 8, …)` and `rgba(26, 22, 18, …)`
  that are the text colour at an alpha, and `rgba(229, 114, 38, …)`, which
  is `--pause-orange` written out when `--pause-orange-rgb` exists for
  exactly that. Nothing stops more being added.
- The `section` / `section-header` / `section-lede` markup appears 63
  times, still by hand.
- **Tests find elements by global class name.** 29 test files do it
  (`querySelector(".march-when")`, the sentiment report's `.gas-vbar-*`),
  including the storyboard's `scroll`, `mobile-nav` and `onboarding-embed`
  specs and `settle.ts`. A module's class names are hashed, so each of
  these breaks when its component moves.
- **Comments name `globals.css`**, in components and in the storyboard
  specs (the `body:has()` rule in `mobile-nav`, the `scroll-padding-top`
  in `scroll`). They go stale as the rules move.

## Target

```
styles/
  tokens.css              every colour, including white, overlays, shadows, danger
  base.css                reset, element defaults, .container (unchanged)
components/
  ui/                     Button, IconButton, Section, PageHero, Foreword,
                          Closing, FeatureCard, Lightbox: each X.tsx + X.module.css
  layout/                 Nav, Footer, FooterQr, CookieConsent, MarchBanner,
                          NextEventBanner: each with its module
app/(site)/<page>/_components/   each component with its own module;
                                 no <page>.css
app/(staff)/staff/_components/   the staff interface's own small kit and
                                 components, each with its module (see
                                 "The staff interface")
```

No `app/globals.css`. No page stylesheet. No stylesheet imported by a route
other than the one it's for. The root layout imports `tokens.css` and
`base.css` only.

## Rules

- **A component owns its styles.** Every component's CSS is in its own
  `.module.css`, next to it. A page has no stylesheet: it's thin, and its
  sections are components.
- **No reaching in.** A stylesheet never selects another component's
  elements, by data attribute or by class. To make a button look different
  in a context, give `Button` a variant (or an `IconButton` its own
  component). Where a container genuinely needs to size or space a child,
  the child declares a CSS custom property on its root
  (`--button-min-width`) and documents it; the container sets that.
  This is what makes the import-order trick in `app/layout.tsx` go away,
  and what keeps pages right when Next loads modules in a different order
  between navigations.
- **Every colour is a token.** No `#…`, `rgb()`, `rgba()`, `hsl()` or named
  colour outside `styles/tokens.css`. Stylelint enforces it, with an
  override that exempts `tokens.css`: `color-no-hex`, `color-named:
  "never"`, and `declaration-property-value-disallowed-list` with a
  pattern for `rgb()`, `rgba()`, `hsl()` and `hsla()` whose first argument
  is a number. Banning the functions outright
  (`function-disallowed-list`) would also ban the pattern below, so it
  can't be used. `transparent`, `currentColor` and `inherit` stay allowed.
  Alphas use `rgb(var(--x-rgb) / a)` with an `-rgb` token, or an
  `--overlay-*` token when the same alpha is used in several places.
- **Module class names are short and local**: `.hero`, `.title`, `.lede`,
  not `.tr-hero-title`. Selectors are one class deep where they can be. When
  a rule moves from `.press .press-section h2` to a module, its specificity
  drops, so check nothing from `base.css` now wins: compare the frames.
- **Shared widths are tokens**, not copied numbers. The hero's 880px inner
  width, which five pages copy so their body lines up, becomes
  `--measure-page` in `tokens.css`, used by `PageHero` and by
  `Section`'s narrow variant.
- **Two kits on one foundation.** Tokens, base styles, `Button` and
  `IconButton` are shared by the whole site. Above them, the
  public pages' editorial pieces (`PageHero`, `Section`, `FeatureCard`,
  marquees, galleries) live in `components/ui/` and are expected to vary
  page by page; the staff interface's data-dense pieces (tables, filters,
  fold boxes, lozenges) live in its own kit and never vary. Neither kit
  uses the other's pieces.
- **Form controls stay with their form.** No shared `Field`. The inputs,
  selects and textareas of donate, Email your MP, the collateral tool and
  the staff forms each keep their own look, styled in that form's
  component or the page's `_components`. Unifying them would be a visible
  change, and this plan makes none.
- **Tests find elements the way a person does**: by role and accessible
  name, label or text (`getByRole`, `getByLabelText`). Where there's
  nothing semantic to find, such as a chart's parts, use `data-testid`.
  Never import a module's class names into a test. A test's selectors
  change in the same commit as its component's styles.
- **Repeated markup is a component** (`PageHero`, `Section`, `Foreword`,
  `Closing`). A component in two or more routes goes in `components/`;
  in one route, that route's `_components/`.
- **Delete as you go.** When a page's last use of a global rule moves to a
  module, the global rule goes in the same commit. No rule is left in
  `globals.css` "for later".

## Phases

In this order, on one branch merged as a single PR. A phase is one commit,
except where it lists separate steps: phase 3's two parts are a commit
each, and phase 7 is a commit per page. Each commit passes the CI gate and the storyboard review on both viewports, and
its message says "no visible change" or lists the frames that differ and
why. Keeping each phase to one commit means a frame that changes can be
traced to the move that changed it.

0. **Colour tokens and the lint.** Add to `tokens.css`: `--white` (and
   `--white-rgb`), `--black-rgb`, `--on-accent` (text on orange),
   `--surface-dim` (`#f7f7f7`), `--danger` (`#b00020`), `--text-rgb` for
   the brown-black shadows, and `--overlay-light-*` / `--overlay-dark-*`
   for the handful of white-on-photo and scrim alphas that recur. Replace
   every raw value with a token, `rgba(229, 114, 38, …)` with
   `rgb(var(--pause-orange-rgb) / …)`. Add the Stylelint rules (see
   "Every colour is a token") so
   `npm run lint:css` fails on the next one. Delete the dead classes
   listed under "Today". Zero visible change.
1. **`PageHero`.** `components/ui/PageHero.tsx` with its module: props
   `title`, `lede` (a node, so the blog's lede can hold a link), `accent`
   (the `.tr-title-accent` span), `swirl` (the track record's and theory of
   change's SVG, moved in from `track-record/_components/HeroSwirl.tsx`),
   and `children` for the people and blog headers' extra markup. The per-page
   overrides become props or go: `what-is-pauseai-uk` and `jobs` set
   padding, the person page sets a title size, blog styles a lede link. Add
   `--measure-page` to `tokens.css`. Convert the thirteen routes, delete the
   hero block from `track-record.css`, and drop `HeroSwirl`.
2. **`Foreword`, `Closing`, `Lightbox` get modules.** `Foreword` (two
   copies today, in theory of change and the workforce inquiry, styled by
   the track record's `.foreword` rules) and `Closing` (a component in
   theory of change; written inline in the track record) move to `components/ui/` with modules;
   `components/ui/Lightbox.tsx` (used by the track record's gallery and
   the campaigns page's QR share) gets its own module, with the
   `.lb-prev/.lb-next/.lb-close` controls as the first `IconButton`s.
   Then the twelve cross-page imports of `track-record.css` go, and
   `<main className="track-record …">` becomes a plain `<main>` everywhere
   but the track record itself, whose stylesheet becomes
   `_components/Timeline.module.css` and friends.
3. **`Section` and the button variants**, a commit each.
   - `components/ui/Section.tsx` for `section` / `section-header` /
     `section-lede`, with `narrow` (`--measure-page`) and the other widths
     the pages use. Replace the 63 uses; delete the global rules.
   - Audit the eight `[data-button]` reach-ins and the six home-made
     buttons. Add the variants they need (likely `inverse` for buttons on
     photos, `block` for full-width, a `danger` for staff) and an
     `IconButton` (carousel arrows, lightbox controls, the footer's QR
     button, share and copy-link buttons). Remove every `[data-button]`
     selector outside `Button.module.css`, and the `Button.module.css` and
     `FeatureCard.module.css` imports from the root layout.
4. **The chrome.** `Nav` (header, dropdowns, pills, burger menu and the
   responsive block, lines 1–212 and 2020–2278 of `globals.css`),
   `NextEventBanner`, `Footer`, `FooterQr` and its dialog, `CookieConsent`,
   `MarchBanner`: each gets its module. The staff header's comment about
   `globals.css` styling every bare `nav` stops being true, so its
   workaround goes too.
5. **The home page.** Each of the thirteen `app/(site)/_components` gets its
   module: `HomeHero` and the marquee, `UpcomingEvents` (the Luma strip),
   `LocalGroupsSection` and `LocalGroupsMap`, `PressMarquee`, `PeopleSection`
   and `PeopleCarousel`, `ShopBanner`, the callout, `OnboardingFormEmbed`,
   `GetInvolved`, `JoinSection`, `StaffSection`. `EventList`, `PersonCard`
   and `StoryShareForm` in `components/` take their rules at the same
   time.
6. **Donate and privacy**, the two pages whose styles live in `globals.css`,
   move to their `_components`. After this `globals.css` is empty: delete
   it.
7. **Page stylesheets to modules**, one commit per page, smallest first so the
   pattern settles before the big ones: march, what-is-pauseai-uk, tools
   (and the trackers index that imports it), people, trackers,
   theory-of-change, press, jobs, governance, future-of-workforce-inquiry,
   campaigns (and the `campaigns-v2` layout's import of it), blog, events.
   Then collateral, whose stylesheet the QR tool and three browser tests
   also import: split it between the collateral and QR components, and
   point the tests at the modules they render. `global-ai-sentiment-2026`
   (1,162 lines, nine components) last, or not at all (see open questions).
8. **The staff interface.** Split `staff.module.css` by component:
   `StaffHeader`, the login card, the tables (`PoliticianTable`,
   `LettersTable`, `ChangesTable` share a `StaffTable`), the filters, the
   fold boxes (`RunBox`, `ResultBox`), the lozenge. These stay under
   `app/(staff)/staff/_components/`, with their own small kit in
   `app/(staff)/staff/_components/ui/` where two of them share a shape: the
   staff interface is dense, tabular and never seen by the public, so its
   pieces don't belong in `components/ui/`. It builds on the shared
   foundation from phase 3, `Button`, `IconButton` and the tokens, so it
   stays the same site. Its input rules move into its forms' components
   (the login card, the politician form). Its density comes from the staff
   layout, which sets a few tokens on its wrapper (base font size, line
   height, the spacing unit), at today's values, that the shared
   components read. No second palette, no second button.
9. **Docs.** Rewrite the "Styling" section of `docs/code-structure.md` to
   the rules above, add the rule on how tests find elements to
   `docs/testing.md`, strike the two items under "Still to do", and note in
   `plans/code-organisation.md` that its phase 9 is done here.

## How each move is done

1. List the rules the page or component uses: its own stylesheet's, and
   grep each class name it renders against `globals.css` and `base.css`.
2. Create the module next to the component and move the rules in, renaming
   classes to short local ones and replacing compound selectors with
   single classes where the markup allows.
3. Swap the `className` strings for `styles.x`. A class that two
   components share means one of them is missing a component or a prop.
4. Delete the moved rules from the global file in the same change.
   Grep for comments that name the old file or classes (`globals.css`,
   `track-record.css`, the class itself), in code, tests and the
   storyboard specs, and update them.
5. Change any test that finds the moved elements by class name to find
   them by role, label, text or `data-testid` (see the rules).
6. `npm test` (the component's browser test covers any new branch, such
   as a prop that adds a class), the rest of the CI gate, then
   `npm run storyboard` and look at every frame of every affected route
   on both viewports.

Until the last phase, modules and global stylesheets style the same pages.
A rule moved to a single module class can lose to a global rule that's
still there with a longer selector (`.press .press-section h2`), as well
as to `base.css`. The frames show it; the fix is to move or delete that
global rule too, not to raise the module's specificity.

Before phase 1, read Next's CSS guide in `node_modules/next/dist/docs/` for
how this version orders CSS modules across routes, and confirm that the
"no reaching in" rule is enough to make order irrelevant.

## Sizes

| Phase | Lines moved or deleted, roughly |
| ----- | ------------------------------- |
| 0     | 150 values, 50 dead lines       |
| 1–2   | 577 (`track-record.css`), 13 pages touched |
| 3     | 100 global, 8 reach-ins, 6 buttons |
| 4     | 700 of `globals.css`            |
| 5     | 1,300 of `globals.css`          |
| 6     | 480 of `globals.css`            |
| 7     | 4,500 across 14 stylesheets     |
| 8     | 329 (`staff.module.css`)        |

## Open questions

1. `global-ai-sentiment-2026` is a one-off report with its own look and
   1,162 lines of CSS. The code-organisation plan asked whether to leave it
   alone. Suggestion: give it the colour tokens and `PageHero` (phases 0–1,
   which touch it anyway), and leave the rest as one `_components` module
   imported by its page, rather than splitting it nine ways.
2. Should the staff interface get its own `Button` variants (`danger`,
   `block`) in `components/ui/Button`, or its own button in its kit? The
   plan says variants, so there is one button on the site; change it if
   the variants turn out staff-only. Form controls are decided: no shared
   `Field`, each form keeps its own.
3. The campaigns page and `campaigns-v2` share `campaigns.css` while both
   exist. Once `campaigns-v2` replaces campaigns
   (`plans/email-your-mp-v2.md`), the old page's module can go with it, so
   phase 7 should do `campaigns-v2`'s components first and leave the old
   page's stylesheet until the swap.
