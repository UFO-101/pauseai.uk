# PauseAI UK — Design Style Guide

## Design Philosophy: "Warm Authority"

The current site uses a dark, techy aesthetic (black backgrounds, orange accents) that reads more like a startup than a citizens' movement. The new design shifts to a **warm, light, human-centered** look that communicates both **gravitas** (we are serious, credible, and organised) and **friendliness** (we are open, hopeful, and welcoming).

Inspired by the brand image — a white dove against a warm terracotta sky with bold black typography — the design evokes **hope, peace, and determined action**.

### Core Principles

1. **Warmth over darkness** — Light backgrounds with warm undertones replace the all-black palette. This feels inviting, not exclusionary.
2. **Bold clarity** — Strong typographic hierarchy creates authority. Headlines hit hard; body text breathes.
3. **Generous space** — Ample whitespace signals competence and calm confidence. No visual clutter.
4. **Subtle depth** — Soft shadows, warm gradients, and gentle layering create dimension without flashiness.
5. **Human first** — Photography, rounded shapes, and warm colours keep the focus on people, not technology.

---

## Colour Palette

### Primary Colours

| Token              | Hex       | Usage                                    |
|---------------------|-----------|------------------------------------------|
| `--bg`              | `#FDF8F3` | Page background — warm cream/parchment   |
| `--surface`         | `#FFFFFF` | Cards, elevated surfaces                 |
| `--surface-2`       | `#F5EDE4` | Muted sections, alternate backgrounds    |
| `--text`            | `#1A1612` | Primary text — warm near-black           |
| `--text-secondary`  | `#5C544A` | Secondary/body text — warm dark gray     |
| `--muted`           | `#8A7F73` | Captions, meta text — warm medium gray   |

### Accent Colours

| Token              | Hex       | Usage                                    |
|---------------------|-----------|------------------------------------------|
| `--accent`          | `#C8652A` | Primary accent — burnt terracotta/amber  |
| `--accent-strong`   | `#A84E1A` | Hover states, emphasis                   |
| `--accent-light`    | `#F0D4BC` | Light accent fills, tag backgrounds      |
| `--accent-bg`       | `#FFF5EC` | Subtle accent sections                   |

### Utility Colours

| Token              | Hex       | Usage                                    |
|---------------------|-----------|------------------------------------------|
| `--border`          | `#E8DDD1` | Card borders, dividers                   |
| `--border-strong`   | `#D4C4B0` | Emphasized borders                       |
| `--shadow`          | `rgba(26, 22, 18, 0.08)` | Soft card shadows          |
| `--shadow-strong`   | `rgba(26, 22, 18, 0.14)` | Hover/elevated shadows     |

### Rationale

The palette draws directly from the brand image: the terracotta sky becomes our accent, the dove's white becomes our surfaces, and the bold black typography becomes our text colour. Everything is warm-toned — no blue-grays or cool neutrals.

---

## Typography

### Font Stack

```
Primary headings:  "DM Serif Display", Georgia, serif
Secondary headings: "Inter", system-ui, sans-serif (weight 700)
Body text:          "Inter", system-ui, sans-serif (weight 400/500)
Accent labels:      "Inter", system-ui, sans-serif (weight 600, uppercase, tracked)
```

### Why These Fonts

- **DM Serif Display** — A high-contrast serif with commanding presence. It reads as authoritative and editorial, like a broadsheet headline. This replaces Montserrat Black, which felt more tech-startup.
- **Inter** — A clean, highly legible sans-serif. Friendly and modern without being trendy. Excellent at small sizes for body text, strong enough for subheadings.

### Type Scale

| Element           | Font                | Size                          | Weight | Tracking     |
|--------------------|---------------------|-------------------------------|--------|--------------|
| h1 (hero)         | DM Serif Display    | `clamp(40px, 6vw, 64px)`     | 400    | `-0.02em`    |
| h2 (section)      | DM Serif Display    | `clamp(28px, 4vw, 44px)`     | 400    | `-0.01em`    |
| h3 (card)         | Inter               | `20px`                        | 700    | `0`          |
| Body              | Inter               | `16px` / `17px`               | 400    | `0`          |
| Lede              | Inter               | `18px` / `19px`               | 400    | `0`          |
| Eyebrow           | Inter               | `13px`                        | 600    | `0.12em`     |
| Small / caption   | Inter               | `14px`                        | 500    | `0.01em`     |

### Line Heights

- Headings: `1.15` — tight, bold, impactful
- Body text: `1.65` — generous, easy to read
- Lede/intro: `1.55` — slightly tighter than body

---

## Spacing System

Use an 8px base grid:

| Token    | Value  | Usage                        |
|----------|--------|------------------------------|
| `--s-1`  | `4px`  | Tight gaps                   |
| `--s-2`  | `8px`  | Inline spacing               |
| `--s-3`  | `12px` | Small component gaps         |
| `--s-4`  | `16px` | Card padding, standard gap   |
| `--s-5`  | `24px` | Section padding, grid gaps   |
| `--s-6`  | `32px` | Major spacing                |
| `--s-7`  | `48px` | Section vertical padding     |
| `--s-8`  | `64px` | Large section breaks         |
| `--s-9`  | `96px` | Hero-level spacing           |

---

## Borders & Radii

| Element          | Radius   | Notes                            |
|-------------------|----------|----------------------------------|
| Buttons           | `8px`    | Softly rounded, not pill-shaped  |
| Cards             | `12px`   | Welcoming but structured         |
| Images in cards   | `0`      | Full bleed within card frame     |
| Avatars           | `50%`    | Circular for people              |
| Tags/pills        | `6px`    | Subtle rounding                  |
| Hero image        | `16px`   | Prominent, softened              |

### Border Style

Cards use a `1px solid var(--border)` border. On hover, borders shift to `var(--border-strong)`. No heavy/coloured borders except for active/focus states.

---

## Shadows

| Level     | Value                                              | Usage                  |
|-----------|-----------------------------------------------------|------------------------|
| Subtle    | `0 1px 3px var(--shadow)`                           | Default cards          |
| Medium    | `0 4px 16px var(--shadow)`                          | Hovered cards          |
| Elevated  | `0 8px 32px var(--shadow-strong)`                   | Hero image, modals     |

Shadows are warm-toned (brown-black, not blue-black) to maintain palette consistency.

---

## Buttons

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

### Pill (nav CTA)
- Border: `1.5px solid var(--accent)`
- Text: `var(--accent)`
- Border-radius: `999px`
- Hover: filled `var(--accent)` background, white text

---

## Cards

### Standard Card (activity, chapter)
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

- Background: `rgba(253, 248, 243, 0.9)` with `backdrop-filter: blur(12px)`
- Sticky, subtle bottom border: `1px solid var(--border)`
- Nav links: `var(--text-secondary)`, hover to `var(--accent)`
- Clean and minimal — no heavy chrome

---

## Section Styling

### Default Section
- Background: `var(--bg)` (warm cream)
- Padding: `80px 0`

### Muted/Alternate Section
- Background: `var(--surface-2)` (slightly darker warm cream)
- No gradient — solid colour for clean separation

### Callout Section
- Background: `var(--accent-bg)` (very light amber wash)
- Top/bottom border: `1px solid var(--accent-light)`

---

## Links

- Default: `var(--accent)` with no underline
- Hover: `var(--accent-strong)` with underline
- In-body links: underlined by default for accessibility
- Footer links: `var(--muted)`, hover to `var(--accent)`

---

## Imagery Guidelines

- Photography should feel **documentary, not stock** — real people at real events
- Warm colour grading preferred (slightly desaturated, amber-shifted)
- Images should feel hopeful and energetic, not grim
- Brand overlay: subtle warm gradient overlay on hero images

---

## Responsive Behaviour

- Container: `max-width: 1140px` (slightly narrower for better line lengths)
- Grid breakpoints: cards snap from multi-column to single-column below `720px`
- Typography: fluid via `clamp()` — no hard breakpoint font changes
- Navigation: collapses to hidden below `720px` (hamburger to be added later)
- Spacing reduces proportionally on mobile

---

## Summary of Key Changes from Current Design

| Aspect            | Current (Dark)                     | New (Warm Authority)                  |
|--------------------|-------------------------------------|---------------------------------------|
| Background         | Pure black `#000`                  | Warm cream `#FDF8F3`                  |
| Text               | White `#f7f7f7`                    | Warm near-black `#1A1612`             |
| Accent             | Bright orange `#ff9416`            | Burnt terracotta `#C8652A`            |
| Headings font      | Montserrat Black (sans-serif)      | DM Serif Display (serif)              |
| Body font          | Roboto Slab (slab serif)           | Inter (sans-serif)                    |
| Overall feel       | Tech startup, cold, exclusive      | Citizens' movement, warm, welcoming   |
| Cards              | Dark surface, heavy shadows        | White, soft shadows, warm borders     |
| Gradients          | Orange-to-transparent overlays     | Minimal, warm ambient tones           |
