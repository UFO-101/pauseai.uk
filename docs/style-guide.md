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

**Where buttons that add go.** Where a button sits says what it adds
to, so there are four places, one for each kind of adding:

- **A new thing of the page's kind: at the top right** (`ui/PageTitle`).
  A page where people make new things of its kind (Mailings, Asks) has
  one button for it, at the right of the page's title. It's the first
  thing seen, and it stays in the same place however long the list under
  it grows. It's the page's one primary button. Its words are the title
  of the page it starts, "New mailing" or "New ask", so the button and
  the page it leads to say the same thing. It has no "+": "New" already
  says it.
- **More to what a list shows: in the filter bar.** "+ Filter" ends the
  row of chips, and what it adds is a chip among them (`ui/FilterBar`).
- **A part of the thing being written: in the section it belongs to.**
  "Add files" is in the attachments' box, where the files then show. The
  letter's "+ Only for those who…" is beside the letter, with the fields,
  the other things put into it.
- **A row of a short table kept in place: under its last row.** Staff
  accounts' add row is a form in the table: type the address, press
  Add, and the row is there, with no page to go to.

"+" marks a small control that adds to something already on the screen,
a filter or a part of the letter, never a button that makes a new thing.

Buttons that act on what a list's filters found ("Mail these",
Download) aren't adding. They sit over the table, in the list frame's
count row.

**Choosing something for another part of the pages.** Sometimes one
part needs a set of things chosen with another part's full tools: who a
mailing goes to is chosen with the politicians list's tabs, search and
filters. It doesn't get a lighter copy of those tools. The person is sent
to the list itself, in a choosing mode, and comes back with what they
chose. The mode is in the address (`mailing=new`, or a draft's ID, on the
politicians list), so the tabs, filters and pages all keep it. The page
is as it always is, but for two bars:

- **At the top, held there as the page scrolls** (`ChoosingHead`): a
  plain strip saying what's being chosen and what for ("New mailing:
  who's it for?", or naming the draft), a line on how, and at its right
  the way back without choosing (Cancel, or Back to the mailing). The
  page's title sits under it, held there too.
- **At the foot of the window, held there**: a dark bar with how many
  are chosen ("5 politicians, for the mailing") and, at its right, the
  one orange button that takes them back ("Write to these 5", "Use these
  5 for the draft").

The page's own button for the same thing ("Mail these") goes while it's
choosing, so there's one way on. The person chooses with tools they
already know. The top always says what they're doing and how to stop,
and the foot always shows the result and the way on, however far they've
scrolled. A new choosing mode, such as supporters for a message, uses
these two bars, not a design of its own. Both live with the politicians
list now (`_components/PoliticiansList.tsx`); a second user moves them to
`ui/`.

**The grid** (`ui/Grid`). Six columns when it's at least 1,000px wide;
below that, two. Everything boxed is an item of a grid and says how much
of the row it takes: a sixth, a third, a half, two-thirds or all (`span`
1, 2, 3, 4 or 6). On two columns, a sixth takes one and anything wider takes the row, so a phone has two of the dashboard's tiles a row and one card. Items are as
tall as what's in them; a grid of things of one kind side by side (the
dashboard's tiles, the import jobs) is `even`, each as tall as its row.
On a page laid out on the grid, the content is never wider than 88rem, so
the columns don't stretch on a big monitor. A page with no grid, a list,
takes the whole width, its filters as wide as its table.

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
the icon (`icon={false}`). After something a person did, a strip says how
it went: green when it worked, amber a warning, red an error, the amber
and red with their icon.

**Tables** (`components/ui/Table`). White, every other row tinted
(`--table-stripe`), so the eye keeps to a row across. A cell's content sits at its top, so
the lines of text in a row start level, however many lines each cell
wraps to. A table whose rows hold buttons, checkboxes or fields is
`align="middle"`: a control is taller than a line of text, so at the top
the text beside it sits higher than the button's label and the row looks
uneven. Centred, the text lines up with the control's middle (the
accounts table, your sessions).

**Lists** (`ui/ListFrame`). Every list is one frame, so no list designs
its own table. A list says its columns once, as data (`ListColumn`): the
heading, the cell, and the value in a download. The frame draws:

- over the table, ruled off: how many, "250 politicians", and which this
  page shows, "· showing 101–200"; at the right, Download, whose menu has
  CSV and JSON of every page the filters find, and vCard for a list of
  people (each name starting "PauseAI <code> - ", the code one per file,
  for finding a download's contacts on a phone);
- the striped table. A short column (a house, a date, a count) never
  wraps, so the long ones take the room. The frame is as wide as the
  page's column, past the grid's 88rem on a page with one, so a list wraps less on a big
  screen;
- under it, with more than one page: "101–200 of 250", then Previous, the
  first and last pages and two either side of this one, and Next; on a
  phone, "Page 6 of 50" in place of the numbers.

A downloaded file is named for the list, its filters and when, in lower
case with underscores: `politicians_party_labour_2026_10_27_1430.csv`.
Downloads of supporters, their letters and their blocked addresses go in
the audit log. A table that isn't a whole list, inside a card, is a
`ListTable`, or a plain `Table`: striped, with no count or downloads.

Columns go in the same order in every list: who it is, then how it
stands, then counts, then when. The times that date a status, such as a
letter's sent and replied, can sit beside it instead, read with it. Where a row has a page of its own, the
first column leads to it, so there's one place to click to open it: a
supporter's or politician's name. A row with no name, such as a letter,
starts with what leads to it instead, its status, before who it's from
and to. A log, read by time, newest first, starts with when instead: the
audit log, an import's runs, a history.

**Filters** (`ui/FilterBar`). Every list's filters are the same bar
above it, and a list's own filters component only says what its filters
are:

- The search box comes first, the fields it searches in it until
  something's typed ("Name, email or phone"), which is its accessible name
  too, and its button, Search, beside it. A search waits for the button, or Enter, so the list
  doesn't change while someone types. While there's a search, an × in the
  box empties it.
- Only the filters that are on show, each as a chip: the filter's name
  and its choice, "Party: Labour". A chip opens its choices, one column,
  a long list scrolling, and Remove.
  A filter that isn't at its default is on, so a glance at the chips says
  what the list is filtered by.
- "+ Filter" lists every other filter, a row each, its choices opening
  under it, one at a time; a choice applies at once. A filter has the
  name of the column it filters, and they come in the columns' order. Not
  every column gets one, only those someone will filter by. A filter with
  no column of its own goes beside the column it's about: Near and MP by
  Place, Event by Luma events.
- A filter that makes sense more than once (`repeat`: a party, a nation,
  an event) can be chosen again, a chip each, and finds what has any of
  them; different filters must all match. An ask's answer doesn't repeat.
- A filter that repeats can leave out, too. "+ Filter" is cut in two,
  "+ Filter | Except", and Except lists those filters to choose one to
  leave out. A chip that leaves out sits among the others, white with a
  dashed edge and a struck-through circle, and its words say "not". The
  list has none of what's left out and any of what's chosen. Each chip's
  menu, beside Remove, turns its choice the other way: "Except this
  instead", or "Only this instead". In the URL a choice left out is the
  same parameter, its value marked `!`: `event=!evt-2`.
- A filter with too many choices to read (`searchable`: the events) has a
  box over them, and shows none until something's typed.
- A place filter (`place`: Near) is a small form, words and how far, and
  its chip says what it found: "Near: Leeds, 10 miles".
- A filter can come after another (`after`): once that one is on, the
  two are one chip in two halves, each opening its own choices, and it
  goes when that one does. An ask's chip is "Edinburgh conference |
  Declined", "Any answer" in the second half until one is chosen. On its
  own, as from a link, it's an ordinary chip, "Answer: Signed".
- A filter that repeats can have choices in two parts (an option's
  `seconds`): "+ Filter" and Except offer the first, and its chip is in
  two halves, the second choosing among the first's. A choice list can
  have headings (an option's `group`, its icon once) and a quiet `detail`
  after a choice. The Contact filter's topics come under Email and Phone;
  chosen, a topic is those we can contact about it, "Contact: PauseAI UK |
  Can email", and its second half turns it to Not sure or Can't email.
  The first half changes the topic, and turns it the other way or removes
  it. Its value is one parameter: `contact=email:site-forms:yes`.
- Clear filters, last, while anything is on, empties the search and every
  filter, and the sort. A tab over the list, such as the politicians'
  houses, isn't a filter: Clear filters keeps it.
- Every choice is a link, so the URL holds the filters; a new filter
  starts from the first page. A chip's menu is a popover (`ui/Menu`).

**Tabs** (`ui/Tabs`). Views of one list, side by side over it, the chosen
one underlined: the politicians' houses. A list has at most one row of
tabs, for the one choice people make most.

**Popovers, not modals.** Anything a button opens, a menu, a small form or
a "?"'s few words, is a bubble hung from that button (`ui/Menu`, or a
popover anchored to its button the same way), so it opens where the person
is looking and the page stays in view around it. Never a box in the middle
of the window: it takes them away from what they were doing, and hides
what they'd want to check against. A browser too old to anchor one shows
it in the middle as a fallback; that's the only place it goes there. A
choice that needs confirming is confirmed in place, as Delete draft is
pressed twice.

**JSON from the database is shown in words** (`Logged.tsx`). A column of
details stored as JSON, as the audit log's and a letter's history are,
is never shown raw. Each field gets its label in bold from the copy, then
its value in words: a status by its name, a date as a date, someone
linked to their page. The fields go between middle dots (`DotParts`). A
field with no label in the copy shows its key as stored, so nothing
logged is hidden. Beside it, a {} button (`LoggedJson`) opens the JSON
exactly as stored, in a bubble by the button. That's the fallback, for
checking exactly what was recorded or a field the words don't cover yet.

**The sidebar** (`StaffNav`). Each page has its icon (`NavIcon`) beside
its name. Fold, at its foot, folds it to a rail of the icons on wider
screens, the sections a rule apart, each name showing beside its icon on
hover or focus; the browser remembers it (`lib/staff-nav.ts`).

**Columns the filters fix** are left out: a house tab, one party found,
one status (the politicians table). It's the filters that decide, never
the rows on the page, which may agree by chance; a choice left out fixes
nothing.

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

### Which button

- **Primary, orange** (`variant="primary"`): the one thing a form or a
  page is for: Save, Schedule, Connect Gmail, Add an ask. One to an area,
  so it's plain what to press.
- **Secondary, no colour** (`variant="ghost"`): anything else beside it:
  Change the time, Disconnect Gmail, a row's Edit, and the first press of
  Delete.
- **Danger, red** (`variant="danger"`): only the press that destroys
  something for good, the second press of Delete.
- **Size.** A form's own buttons are the default size; a secondary one
  beside its primary, such as Delete beside Save, is `small`. Buttons in
  a table's row, a strip or a bar of filters are `small` too.
- **A link, not a button,** for going to read or look at something,
  where nothing changes and it isn't what the page is for: a row's name,
  to its own page; a count, to the list it counts; back to the list; a
  section of the page. Anything that does something, or opens a form to
  do it, is a button, even when it goes to another page: Edit and Add an
  ask are `ButtonLink`s, not links. `LinkButton` is the one exception, a
  button that reads as a link for a small step in a line of text that's
  easily undone (Remove, Undo).

### Deleting, pressed twice

Delete is a ghost button naming what it deletes ("Delete ask"). Pressed
once, it turns into a red "Delete it", which takes the focus; pressed
again, it deletes. It goes back to how it was after a few seconds, or as
soon as the focus leaves it, so a stray click deletes nothing
(`DeleteTwice`, in `MailingButtons.tsx`). There's no dialog.

Delete is offered only when the thing can be deleted. While something
refers to it (an ask politicians have answered, a mailing that's been
sent), there's no button, and a `Hint` says why in its place.

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
- **Dates as people say them**: "23 Oct 2026", and with a time, "23 Oct 2026, 10:34", never "2026-10-23". The staff pages' are in UTC (`staffDate` and `staffTime` in `lib/staff-time.ts`). A download keeps the ISO form, for a spreadsheet to read.

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
