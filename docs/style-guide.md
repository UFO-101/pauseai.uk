# PauseAI UK — Design Style Guide

How the site looks, and where that lives in the code.

## Start with the gallery

The component gallery shows every component and its variants as the site
renders them: `/gallery` on a fixture build (`DATA_FIXTURES=1`; with it in
`.env.local`, http://localhost:3000/gallery under `npm run dev`). It is the
reference for what exists. Before designing or building something, look
there: the piece may already be there, or need only a variant.
`docs/testing.md` ("The component gallery") says how to add to it and
picture it.

The look lives in the components, not in this file. Each one owns its
styles in a CSS module beside it, and the only global CSS is
`styles/tokens.css` (every colour, font, width, space, type size and
corner as a variable, and the compact density) and
`styles/base.css` (element defaults and `.container`). The rules for
writing styles are in `docs/code-structure.md` ("Styling"). Where this
guide and the code differ, the code is what visitors see; fix whichever is
wrong.

## Design Philosophy: "Warm Authority"

The old site used a dark, techy look (black backgrounds, orange accents) that read more like a startup than a citizens' movement. This design is **warm, light and human-centred**, and communicates both **gravitas** (we are serious, credible, and organised) and **friendliness** (we are open, hopeful, and welcoming).

Inspired by the brand image — a white dove against a warm terracotta sky with bold black typography — the design evokes **hope, peace, and determined action**.

### Core Principles

1. **Warmth over darkness** — Light backgrounds with warm undertones replace the all-black palette. This feels inviting, not exclusionary.
2. **Bold clarity** — Strong typographic hierarchy creates authority. Headlines hit hard; body text breathes.
3. **Generous space** — Ample whitespace signals competence and calm confidence. No visual clutter.
4. **Subtle depth** — Soft shadows, warm gradients, and gentle layering create dimension without flashiness.
5. **Human first** — Photography, rounded shapes, and warm colours keep the focus on people, not technology.

---

## Colour Palette

Every colour is a variable in `styles/tokens.css`, drawn on the
gallery's tokens page (`/gallery/tokens`). Stylelint refuses a hex,
`rgb()` with numbers or a named colour anywhere else, so a new colour is a
new token there. An alpha uses a token's `-rgb` channels:
`rgb(var(--white-rgb) / 0.1)`.

### Main Colours

| Token              | Hex       | Usage                                  |
| ------------------ | --------- | -------------------------------------- |
| `--bg`             | `#FDF8F3` | Page background — warm cream/parchment |
| `--surface`        | `#FFFFFF` | Cards, elevated surfaces               |
| `--surface-2`      | `#F5EDE4` | Muted sections, alternate backgrounds  |
| `--text`           | `#1A1612` | Primary text — warm near-black         |
| `--text-secondary` | `#5C544A` | Secondary/body text — warm dark grey   |
| `--muted`          | `#8A7F73` | Captions, meta text — warm medium grey |

### Accent Colours

| Token                        | Hex       | Usage                               |
| ---------------------------- | --------- | ----------------------------------- |
| `--accent`, `--pause-orange` | `#E57226` | The PauseAI orange: links, buttons  |
| `--accent-strong`            | `#E57226` | Hover states (the same orange now)  |
| `--accent-light`             | `#F0D4BC` | Light accent fills, tag backgrounds |
| `--accent-bg`                | `#FFFFFF` | Accent sections                     |

### Utility Colours

| Token             | Hex                      | Usage                  |
| ----------------- | ------------------------ | ---------------------- |
| `--border`        | `#E8DDD1`                | Card borders, dividers |
| `--border-strong` | `#D4C4B0`                | Emphasised borders     |
| `--shadow`        | `rgba(26, 22, 18, 0.08)` | Soft card shadows      |
| `--shadow-strong` | `rgba(26, 22, 18, 0.14)` | Hover/elevated shadows |

`styles/tokens.css` also has the header and footer's dark colours
(`--charcoal`, `--on-dark`), warm tints, form greys and status colours
(`--danger`, `--status-green` and the rest). Use one of those before
adding another.

### Rationale

The palette draws directly from the brand image: the terracotta sky becomes our accent, the dove's white becomes our surfaces, and the bold black typography becomes our text colour. Everything is warm-toned — no blue-greys or cool neutrals.

---

## Typography

### Fonts

```
Headings (h1, h2): Lato, weight 900 (700 for the page hero's title), via --font-display
Body and the rest: Inter, weight 400/500, self-hosted (public/fonts)
Accent labels:     Inter, weight 600, uppercase, tracked
```

- **Lato** — bold and plain, with a commanding presence at heavy weights.
- **Inter** — clean and highly legible, excellent at small sizes for body text, strong enough for subheadings.

### Type Scale

Set in the components that use them; these are the main ones.

| Element         | Where             | Size                       | Weight |
| --------------- | ----------------- | -------------------------- | ------ |
| Page title      | `PageHero`        | `clamp(44px, 6.5vw, 84px)` | 700    |
| Section heading | `SectionHeader`   | `clamp(28px, 4vw, 44px)`   | 900    |
| Body            | `styles/base.css` | `16px` (`17px` in prose)   | 400    |
| Small / caption | each component    | `14px`                     | 500    |

### Line Heights

- Headings: tight, around `1.1`
- Body text: `1.65` (`styles/base.css`)

---

## Spacing, type sizes and corners

All three are tokens in `styles/tokens.css`, and the gallery's tokens
page (`/gallery/tokens`) draws them.

- **Spacing** is an 8px grid, `--space-1` (4px) to `--space-9` (80px),
  with 4px and 12px for the tight places.
- **Type sizes** for interface text (labels, fields, notes, tables, tags)
  are `--text-xs` (12px) to `--text-lg` (18px). Headings and prose set
  their own in their components (the type scale above).
- **Corners** are `--radius-sm` (4px), `--radius-md` (8px: buttons,
  fields), `--radius-lg` (12px: cards), `--radius-xl` (16px: hero images)
  and `--radius-pill`.

In `components/ui/`, Stylelint refuses a raw `px` or `rem` in a margin,
padding, gap, font size or corner: they're tokens there. The kit's files
whose sizes aren't tokens yet are listed in `stylelint.config.mjs`, to be
converted, not added to. Elsewhere, use the tokens where they fit.

### Using the spacing

Pick the step by how closely the things belong together: the closer they
belong, the smaller the step. A group's own items are always closer to each
other than the group is to what's around it.

| Step                     | For                                                                               |
| ------------------------ | --------------------------------------------------------------------------------- |
| `--space-1` (4px)        | Inside a small thing: a tag's padding, a note after a label, an icon and its word |
| `--space-2` (8px)        | Items of one kind side by side: a row of tags, a hint under its field             |
| `--space-3` (12px)       | A row of buttons or filters, a compact box's padding                              |
| `--space-4` (16px)       | A box's padding, a form above or below the list it filters                        |
| `--space-5` (24px)       | A card's padding, cards in a grid, one field to the next                          |
| `--space-6` (32px)       | Parts of a section: a heading to what's under it, one group to the next           |
| `--space-7`, `--space-8` | Big blocks of a page, and its top and bottom (48px, 64px)                         |
| `--space-9` (80px)       | A `Section` band's top and bottom                                                 |

- **Fields, tables and tags use the density's tokens, not `--space-*`**:
  `--field-gap` between a label and its control, `--form-gap` between
  fields, `--table-cell-padding`, `--tag-padding`. Then compact works
  without anything else changing ("Density", below).
- **Space things with the container's `gap`, not their margins.** A
  component sets its own padding, and the gaps between its own children,
  but not a margin round itself: where it sits is its container's job,
  through `gap` or a `className` for its place in a layout
  (`docs/code-structure.md`, "Styling"). The exceptions are the few that
  always come after something and bring the space above them: `Hint` and
  `FieldError` (a `--field-gap` under their field), `ButtonRow` and
  `SmallPrint`.
- **Smaller on a phone by whole steps.** At a breakpoint, drop a step or
  two (`--space-6` to `--space-5`), rather than finding a value in between.

### When a value isn't a token

Spacing, type sizes and corners are tokens; most other sizes aren't, and
take whatever value they need:

- **Sizes that aren't spacing**: widths and heights (an avatar, a swatch,
  `--measure-page`), borders and outlines (`1px`, `3px`), line heights,
  shadows and offsets.
- **Space that grows with the text**: in `em`, such as a checkbox lined up
  with its label's first line (`Controls.module.css`). Stylelint allows
  `em`, since it isn't a fixed size.
- **Optical nudges**: a pixel or two to line an icon up with its text. Say
  in a comment what it lines up.
- **A size measured from something else**: the nav's height in
  `scroll-padding-top`, the heights reserved for the signup form while it
  loads (`OnboardingFormEmbed.module.css`). Say in a comment where the
  number comes from.

Outside `components/ui/`, an off-scale space or type size is allowed when
nothing on the scale looks right, with a comment saying why. Inside it,
Stylelint refuses one; for one of the cases above, use
`/* stylelint-disable-next-line declaration-property-value-disallowed-list -- why */`.
Don't add a token for a one-off: a new token is for a value two or more
components share, and it goes in `styles/tokens.css` with what it's for.
The files listed in `stylelint.config.mjs` aren't exceptions to copy: they're
waiting to be converted.

A page's band is `Section`, with 80px above and below, less on a phone.
Widths are tokens too: `.container` is 1140px, a page's reading column
`--measure-page` (880px), a page of cards `--measure-wide` (1080px). A
component narrows the containers inside it by setting `--container-width`
on its own root.

---

## Forms

Every field is the kit's, in `components/ui/`.
`tests/checks/form-controls.test.ts` fails on an `<input>`, `<select>` or
`<textarea>` written anywhere else; the few exceptions are listed there,
with why.

- **Fields** (`Field.tsx`): `Field` is a label's words over the control
  inside it; `Label` a label on its own, over a control elsewhere or a
  group of buttons; `Hint` a note under a control; `FieldError` what's
  wrong, in the danger colour with an orange rule beside it, read out
  with `announce="alert"` when a form has just failed. `FieldGroup` keeps
  a field and what's under it together.
- **Controls** (`Controls.tsx`): `TextInput`, `Select`, `TextArea`,
  `FileInput`, `Checkbox` (its label beside it) and `Segmented` (a row of
  choices).
- **Layout** (`Form.tsx`): `FormStack`, fields in a column; `FilterForm`,
  a row of filters over a list, lined up along their bottoms.
- **Focus**: every control and button has the same ring from the
  keyboard, `--focus-ring` (2px of orange), `--focus-offset` outside it.
- **Errors**: a field that's wrong has `aria-invalid`, which gives it a
  danger-coloured border, and a `FieldError` under it.

---

## Density

The same components come at two densities. **Comfortable** is the
public site's: 48px fields, 16px labels. **Compact** is for screens of
tables and filters that people work through, the staff interface: 36px
fields (the small button's height, so a row of filters lines up), 14px
labels and table text, tight table cells and tags. A container sets
`data-density="compact"` on itself (`StaffPage` does), and everything
inside it is compact; the components need no prop.

Density changes only sizes and spacing, never colour, behaviour, the
focus ring or the look of an error, and there are only the two. A
field's text stays 16px on a phone at either density, or iOS Safari zooms
the page when it's focused. The tokens it sets are the `--control-*`,
`--label-font-size`, `--note-font-size`, `--field-gap`, `--form-gap`,
`--table-*` and `--tag-*` ones in `styles/tokens.css`. The gallery's forms
page (`/gallery/forms`) shows every field, table and tag at both.

---

## Staff pages

Every staff page is laid out from the same few pieces, so a component added
or removed doesn't bring a width, a box or an alert of its own. A
component's look is its own; where it sits and how wide it is are the
page's.

**The grid** (`ui/Grid`). Six columns when it's at least 1,000px wide;
below that, two. Everything boxed is an item of a grid and says how much
of the row it takes: a sixth, a third, a half, two-thirds or all (`span`
1, 2, 3, 4 or 6). On two columns, a sixth takes one and anything wider
takes the row, so a phone gets two tiles a row and one card. Items are as
tall as what's in them; a grid of things of one kind side by side (the
dashboard's tiles, the import jobs) is `even`, each as tall as its row.
The content is never wider than 88rem, so the columns don't stretch on a
big monitor.

**Widths.** A component never sets its own `max-width` or `width`: the
grid gives a box its width, and anything read line by line (a form, a
short list) takes the measure, `var(--staff-measure)`.
`tests/checks/staff-widths.test.ts` fails otherwise, but for the few it
lists with their reasons (a popover, the login page's card, a field).

**Surfaces.** Each one means one thing:

| Surface                        | Look                                                       | For                                                                                          |
| ------------------------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| The page                       | the background, no box                                     | headings, prose, the history, tables                                                         |
| A record (`Card`, the default) | white                                                      | the thing a page is about, or a thing to open: an MP's or a supporter's facts, an import job |
| An aside (`Card look="aside"`) | the second tint, `--surface-2`                             | what sits beside a record: an MP's campaigns, a supporter's mailing lists                    |
| A log (`Card look="log"`)      | the palest of the accent: `--accent-light` at 30% on white | a history, each entry ruled from the next                                                    |
| A tile                         | white, bordered, an item of an `even` grid                 | sets of like things: the dashboard's numbers                                                 |
| A strip (`ui/Strip`)           | the tone's tint, no border, `--radius-md`                  | how something stands: green done or signed, amber waiting, red broken, plain neither         |

Every card has the same edge, a `1px` `--border` and `--radius-lg`; only
its fill changes, and only among those three, all warm. Colour stays for
meaning: orange for what you can press, the status colours for state.

**No box under or beside a box** but a card or tile in the same grid. A
card holds strips, rows and fields, never another card.

**Strips, not alerts.** Anything that needs a person is a red or amber
strip, with its icon at the left and its button at the right: a strip
each at the top of the home page, one at the top of an MP's page whose
address is blocked, one for an error after a form. Inside a card, a strip
is that thing's state: an import job's newest run, a campaign's status, a
mailing list's answer. A strip that's an answer, not a warning, leaves out
the icon (`icon={false}`).

The gallery's staff group shows each piece and each page built from them.

---

## Borders

Corners are the `--radius-*` tokens (above): buttons and fields
`--radius-md`, cards `--radius-lg`, tags `--radius-pill`, avatars `50%`,
images in cards none (full bleed).

### Border Style

Cards use a `1px solid var(--border)` border. On hover, borders shift to `var(--border-strong)`. No heavy/coloured borders except for active/focus states.

A box that shows a state says so with its tint: the background is the status colour's `-bg` token (`--status-red-bg`, `--status-amber-bg`, `--status-green-bg`), and the words can take the status colour. On staff pages that's a strip, with no border (above, "Staff pages"); a past run in a job's history keeps the ordinary border. Never a thick edge on one side: on a rounded corner it bends into a wedge. Only the current state is coloured. A history of past runs or events is plain, so the one thing in colour is the thing that's true now.

---

## Shadows

| Level    | Value                             | Usage              |
| -------- | --------------------------------- | ------------------ |
| Subtle   | `0 1px 3px var(--shadow)`         | Default cards      |
| Medium   | `0 4px 16px var(--shadow)`        | Hovered cards      |
| Elevated | `0 8px 32px var(--shadow-strong)` | Hero image, modals |

Shadows are warm-toned (brown-black, not blue-black) to maintain palette consistency.

---

## Buttons

Every button is `Button`, `ButtonLink` or `ButtonAnchor`
(`components/ui/Button.tsx`), `IconButton` for the round ones, or
`LinkButton` for one that reads as a link (Remove, Undo). Nothing else
styles a button's look; a container that needs its buttons a different
size sets `--button-padding` and `--button-font-size` on itself. A row of
buttons after what they act on is `Actions`; centred under a section,
`ButtonRow`.

### Primary Button

- Background: `var(--accent)` (solid, no gradient)
- Text: `#FFFFFF` (white)
- Border-radius: `8px`
- Padding: `14px 24px`
- Font: Inter, weight 600, `15px`
- Shadow: `0 2px 8px rgba(200, 101, 42, 0.25)`
- Hover: background darkens to `var(--accent-strong)`, slight lift `translateY(-1px)`

### Ghost/Secondary Button

- Background: `transparent`
- Border: `1px solid var(--border-strong)`
- Text: `var(--text)`
- Hover: border becomes `var(--accent)`, text becomes `var(--accent)`

### Light Button (on a photo)

- Background: `var(--white)`, text `var(--ink)`
- Border: `1px solid var(--pause-orange)`
- Hover: an orange ring

Sizes: `small` and `large` besides the default.

---

## Cards

The site's cards are `PhotoCard` (an image above a body) and `FeatureCard`
in `components/ui/`; areas have their own built on the same look
(`PersonCard`, the local groups' cards).

### Photo Card (activity, local group)

- Background: `var(--surface)` (white)
- Border: `1px solid var(--border)`
- Border-radius: `12px`
- Shadow: subtle level
- Overflow: hidden (for full-bleed images)
- Hover: shadow increases to medium, slight `translateY(-2px)`
- Image: full-width, `aspect-ratio: 3/2`
- Padding (content area): `20px`

### Feature Card (mission pillars)

- Background: `var(--surface)`
- Border: `1px solid var(--border)`
- Left border accent: `3px solid var(--accent)` on the left edge (replaces the dot)
- Padding: `24px`

### Person Card

- Horizontal layout (avatar + text)
- Avatar: `80px` circle with `2px solid var(--accent-light)` border
- Clean, no heavy borders on the card itself

---

## Header & Navigation

- `Nav` (`components/layout/Nav.tsx`): sticky, black, light text (`--on-dark`)
- At 1024px and below, a burger opens the menu over the page
- Clean and minimal — no heavy chrome

---

## Section Styling

A page is a run of `Section` bands (`components/ui/Section.tsx`); its
`tone` prop picks the background. A page's top is `PageHero`, and an
introduction under it `Foreword`.

### Default Section

- Background: `var(--bg)` (warm cream)
- Padding: `80px 0`

### Muted Section (`tone="muted"`)

- Background: `var(--surface-2)` (slightly darker warm cream)
- No gradient — solid colour for clean separation

### White Section (`tone="white"`)

- Background: `var(--accent-bg)` (white)

A boxed message inside a section is `Callout`.

---

## Links

- Default: `var(--accent)` (`styles/base.css`)
- A link set in text that should stand out: `.inline-link`, bold, underlined on hover
- Footer links: light on the dark footer
- A link out of the site opens in a new tab and sends no referrer:
  `target="_blank" rel="noreferrer"`, with no icon or other mark. Links
  within the site, `mailto:` and `#anchor` links open in place.

---

## Interface Text

- **Sentence case** for labels, buttons and headings: "Your name", "Find my MP", "Send email". Not "Your Name" or "Find My MP". Proper nouns keep their capitals: "MP", "PauseAI", "Airtable".
- **Full stops** on messages that are sentences: errors, notices, hints and confirmations. "Please enter your name.", "Postcode not found."
- **No full stops** on labels, buttons, headings, or a word or two of status: "Your email", "Preview", "Sending".

---

## Imagery Guidelines

- Photography should feel **documentary, not stock** — real people at real events
- Warm colour grading preferred (slightly desaturated, amber-shifted)
- Images should feel hopeful and energetic, not grim
- Brand overlay: subtle warm gradient overlay on hero images

---

## Responsive Behaviour

- Container: `max-width: 1140px`, 24px side padding
- Breakpoints: most components change at `720px` or `860px` (and `520px`
  for the smallest phones); the nav switches to its burger at `1024px`
- Typography: fluid via `clamp()` — no hard breakpoint font changes
- Spacing reduces proportionally on mobile
- Check both: the storyboard pictures every page, and the gallery every
  component, on desktop and a phone
