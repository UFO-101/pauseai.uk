# Watchdog integration — design notes

This directory is the foundation of merging the standalone
[PauseAI Watchdog](https://github.com/ylevtov/ai-integrity-watch) into
pauseai.uk. **Draft PR / not yet wired into any route.**

## What "Watchdog" is

A public, editor-curated record of integrity incidents at frontier AI labs —
broken safety commitments, safetywashing, deceptive advocacy, etc. — with
sourced reports, filterable by company and incident type, and a public form
for the community to submit stories. Originally lived at
https://ai-integrity-watch.vercel.app.

## What this PR adds (foundation only)

- **Sanity v3 CMS dependency** (`@sanity/client`, `next-sanity`, `sanity`,
  `@sanity/vision`, `@sanity/image-url`, `styled-components`). Adds editor
  self-service for the Watchdog content; pauseai.uk's other pages remain
  static (untouched).
- **`lib/sanity/schemas/`** — four document types:
  - `incident` — the core: title, slug, date, summary, optional body,
    pull quote (text + attribution + portrait), severity, refs to
    `company`/`category`, sources[], `featured` flag.
  - `company` — name, slug, swatch, blurb.
  - `category` — name, slug, description.
  - `submission` — inbound from the public form, with a `status`
    field (new/reviewing/accepted/rejected) so editors triage before
    creating a real `incident`.
- **`lib/sanity/messagingValidation.ts`** — drop-in field validator that
  surfaces brand-spelling errors and discouraged-term warnings inline in
  Studio as editors type. Backed by the shared
  **`lib/messagingRules.ts`** module.
- **`lib/sanity-client.ts`** / **`lib/sanity-write.ts`** — read + server-only
  write clients.
- **`lib/queries.ts`** / **`lib/types.ts`** — GROQ queries and the matching
  TypeScript types for the Next.js pages to consume.
- **`lib/companyLogos.ts`** / **`lib/categoryMeta.ts`** — small map helpers
  (slug → favicon domain, slug → category description) for the UI layer.
- **`sanity.config.ts`** + **`app/studio/[[...tool]]/`** — the embedded
  Studio at `/studio` so editors don't need a separate deploy.
- **`.env.example`** — the three Sanity vars the deploy needs.

## What's still TODO (next pieces of the PR / follow-ups)

UI surface — deferred to a follow-up commit so the architectural decision
(adopt Sanity yes/no) can be reviewed independently:

- [ ] `app/watchdog/page.tsx` — main feed (incident list, filters)
- [ ] `app/watchdog/[slug]/page.tsx` — incident detail
- [ ] `app/watchdog/submit/page.tsx` — submission form
- [ ] `app/watchdog/about/page.tsx` — credits + AI Lab Watch attribution
- [ ] `components/watchdog/*` — IncidentCard, IncidentFeed,
      CompanyFilter, CategoryFilter, SubmitForm
- [ ] `app/api/submit/route.ts` — validates + writes a `submission` doc
- [ ] `app/api/revalidate/route.ts` — Sanity webhook target for ISR refresh
- [ ] `app/watchdog/watchdog.css` — scoped CSS using the existing
      pauseai.uk design tokens (`--bg`, `--accent`, `--surface`, …);
      the standalone Watchdog uses Tailwind, so the UI port is a
      mechanical Tailwind → vanilla-CSS translation, not a redesign
- [ ] `components/Nav.tsx` — add the "Watchdog" link
- [ ] Optional: lift across the messaging-rule pre-commit hook
      (`scripts/check-messaging.ts` + `.githooks/pre-commit`) from the
      standalone repo

## Decisions for the maintainer

1. **Adopt Sanity as a dependency?** This PR's question. The other
   content (events, news, people, stories) stays static — only the
   Watchdog routes use Sanity. Reversible: dropping Sanity later means
   migrating ~10–20 incidents to `lib/data/incidents.ts`, losing
   editor self-service and the submission form, but it's not destructive.
2. **Mount point.** Currently planned at `/watchdog/`. The existing
   `/track-record/` is a personal one-year retrospective, so they don't
   collide. Could also be `/integrity-incidents/` if you'd prefer.
3. **Studio location.** Currently at `/studio` (same domain). Alternative:
   a separate subdomain like `watchdog-admin.pauseai.uk` if you'd prefer
   to keep the public site free of any admin tier.

## Deploy / env work needed when this lands

- Add `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`,
  `NEXT_PUBLIC_SANITY_API_VERSION`, `SANITY_WRITE_TOKEN`,
  `SANITY_REVALIDATE_SECRET` to Netlify env vars.
- Add `https://pauseai.uk` (and any preview domains) to the Sanity CORS
  allowlist, with **Allow credentials** checked.
- Invite editors at sanity.io/manage → project → Members.

## Original Watchdog repo (for context / lifted content)

`ylevtov/ai-integrity-watch` — live at
https://ai-integrity-watch.vercel.app. Code here is adapted from there
to fit pauseai.uk's conventions (vanilla CSS w/ design tokens instead of
Tailwind, `lib/`/`app/`/`components/` at the root, etc.).
