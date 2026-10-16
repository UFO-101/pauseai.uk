# Component gallery plan

Written 2026-10-16. Status: not started.

## Scope

One page that renders every component, and each of its major variants,
on fixture data. The storyboard review (`npm run storyboard`) then pictures
every component on both viewports against main, so a branch's visual change
to any component shows up, even one no flow happens to reach.

The page exists only in fixture builds (`DATA_FIXTURES=1`). Production
returns 404 for it.

Not Storybook, or any second build or toolchain. The storyboard already
builds, screenshots and compares; the gallery is just one more page for it.

## The page: `app/(tools)/gallery/page.tsx`

- Calls `notFound()` first unless `process.env.DATA_FIXTURES === "1"`, the
  same switch `lib/server/outside-fetch.ts` and `lib/server/postmark.ts`
  use. A production build has no gallery.
- Lives under `(tools)`: it gets that group's Nav and no analytics, and stays
  out of the sitemap (added to the excluded list in `app/sitemap.ts`, next to
  `/tools`). `pageMetadata()` with noindex as well, in case.
- Renders each component in a `<section id="<name>">`, headed by its name,
  and each variant under a subheading with its own anchor
  (`#Button-secondary`). Minimal styling of its own, in
  `gallery.module.css`, so the components look as they do on the site.

## The examples: `app/(tools)/gallery/_examples.tsx`

- A list of `{ name, variants: [{ label, render }] }`, one entry per
  component in `components/**` and `app/**/_components/*` (about 135 today).
  Every entry has at least one variant.
- **A major variant** is a prop that changes how the component looks: a
  `variant` or `size`, a card with and without an image, compact and full
  layouts, a list of one and of many. States that come from someone using
  the page (open, submitted, error, loading) aren't variants. They stay in
  the storyboard's flows, which show how you get there.
- **Variant props with a union type** are typed as
  `Record<ButtonProps["variant"], …>`, so a new value in the union is a type
  error until the gallery shows it.
- **Props:** the 54 `*.browser.test.tsx` files already build props for many
  components. Move those into shared example objects next to each
  component, imported by the tests and the gallery, rather than writing them
  twice. Write new ones for the rest.
- **Server components that load data** render as on their pages: in a
  fixture build the outside services answer from `tests/fixtures`.
- **Context and route params** (the consent provider, form state, `params`)
  get small wrappers, in this file only.
- **Forms** render live. In a fixture build a submit writes to the flow's
  own database and emails go to the fixture outbox, so nothing reaches
  anyone.
- **Callbacks do something when pressed.** About 30 props today, mostly in
  the collateral tool's controls (`grep -rE "^\s+on[A-Z]\w*\??:"`). Two
  kinds:
  - **Controlled inputs** (`value` plus `onChange`: `Dropdown`, `Slider`,
    `TitleSizeControl`, `CropControls`, the kit's `Fields` and `Choices`,
    `LetterEditor`) render inside a `<Controlled initial={…}>` wrapper that
    holds the value in `useState`, so dragging a slider moves it and picking
    an option selects it. The current value shows next to the component.
  - **Actions** (`onClose`, `onSave`, `onOpen`, `onReset`, `onSelect`,
    `onResult`, `onIssues`, ...) are given `log("onSave")`, which appends the
    call and its arguments to an event log under that component: "onSave()",
    "onOpen(File poster.json)". Where a callback would change what the
    component shows (`Lightbox`'s `onNext` and `onClose`), the example holds
    that state too, so pressing next moves to the next photo and close
    hides it, with a button to show it again.
  - Components that own their state (menus, forms, the nav's burger) need
    nothing: they already work.
- **Every callback prop gets one of these.** Typing each example's props in
  full, rather than as `Partial`, makes a missing callback a type error.
- **Copy:** example props are test data, not copy visitors read, so they use
  obviously fake names and text, as the browser tests do.

## Storyboard section: `tests/storyboard/gallery.spec.ts`

- Loads the page and takes `frame(page, "<name>: <variant>")` for each
  variant, scrolled to its anchor: every component on both viewports, beside
  main's.
- Several flows, by folder (layout, ui, blog, campaigns, ...), to stay near
  ten frames each and fail independently.
- A line in `docs/testing.md`, "What the storyboard covers", which
  `tests/storyboard/coverage.test.ts` checks for.
- `tests/routes.ts` discovers `/gallery` from the filesystem, so the public
  pages section also loads it and takes one frame of its top.
- No frames for pressing things: those are the flows' job, and pressing
  every control would make the gallery a second storyboard. One flow does
  press a single action and a single controlled input, with a frame of each
  result, to show the wrappers work.
- In the first PR main has no gallery, so main's side is a 404. Expected; it
  settles once merged.

## Checks

- **Completeness:** `tests/checks/gallery.test.ts` globs the component
  files and fails if an exported component has no entry. Which variants
  matter is judged in review; no test can.
- **The page's coverage:** a browser test for both sides of the
  `DATA_FIXTURES` check (`vi.stubEnv`, as `lib/shuffle.test.ts` does) and
  for the loop. Rendering every example there also catches one that throws.
- **The wrappers:** browser tests that `Controlled` updates its value and
  `log` appends each call, with and without arguments, for the 100% gate.

## Knip

The gallery imports every component, so Knip would see them all as used and
stop finding dead ones. Exclude `app/(tools)/gallery/**` in
`knip.config.ts`. The completeness check covers the other direction: every
component has an entry, and Knip still flags one nothing on the site uses.

## Out of scope

- Interaction states (empty, error, loading, submitted): the storyboard's
  flows.
- A public URL. If designers or volunteers need one later, that's a separate
  decision: forms would have to be inert and example content kept off
  anything indexable.

## Effort

About a day for the page, the storyboard section and the checks. Then two
or three days of mechanical work writing examples, folder by folder, in
batches. Variants add roughly a day more, since most components have one
look; count the components with variant props first to firm that up.
Callbacks add half a day: the two wrappers, then wiring about 30 props.
