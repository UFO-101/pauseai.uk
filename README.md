# Pause AI UK Website

The [pauseai.uk](https://pauseai.uk) website — a [Next.js](https://nextjs.org) (App Router) app deployed to Netlify.

## Stack

- **Next.js 16** (App Router) with **React 19** and **TypeScript**
- Self-hosted Inter (`next/font/local` + `@font-face`) and Google-hosted Lato (`next/font/google`)
- Deployed to **Netlify** via `@netlify/plugin-nextjs`

## Layout

See [docs/code-structure.md](docs/code-structure.md). In short: `app/` holds routes (public pages in `app/(site)/`, unlisted tools in `app/(tools)/`), `components/` shared React components, `lib/` logic and data (shared config such as social links, emails and external URLs is in `lib/data/site.ts`), and `public/` static assets.

## Local development

```bash
npm install
npm run dev    # Next dev server (Turbopack) at http://localhost:3000
npm run build  # Production build
npm run lint   # ESLint
```

See `package.json` for the full script list, including the `lighthouse*` scripts.

## Testing

See [docs/testing.md](docs/testing.md) for the test policy, coverage gate, mocking rules and commands. In short: `npm test` runs the Vitest unit tests (also part of `npm run build`, so a failing test blocks deploy), `npm run test:coverage` runs unit and component tests with the coverage gate, and `npm run test:behaviour` / `npm run test:visual` run the Playwright suites.

**Airtable access is locked to `lib/airtable.ts`**: an ESLint rule (`no-restricted-syntax` in `eslint.config.mjs`) bans any other file from referencing `api.airtable.com`, so the signed-only filter and field whitelist there can't be bypassed by a new call site. `npm run check:airtable-filter` runs just that rule, isolated from the rest of ESLint, and is also part of `npm run build` — a bypass fails the build the same way a failing test does.

## Docs

- [docs/code-structure.md](docs/code-structure.md): where code lives, and the rules for adding more
- [docs/testing.md](docs/testing.md): test policy, coverage gate, mocking, commands
- [docs/style-guide.md](docs/style-guide.md): design style guide
- [docs/google-ads/stakeholder-summary.md](docs/google-ads/stakeholder-summary.md): Google Ads conversion tracking, for stakeholders
- [docs/google-ads/request-signup-conversion-event.md](docs/google-ads/request-signup-conversion-event.md): request to pauseai.info for a signup event
- [docs/google-ads/request-mp-email-conversion-event.md](docs/google-ads/request-mp-email-conversion-event.md): request to pauseai.info for an MP email event
- [plans/test-coverage.md](plans/test-coverage.md): plan for 100% test coverage
- [plans/code-organisation.md](plans/code-organisation.md): plan for reorganising the code
- [plans/visual-baselines.md](plans/visual-baselines.md): later plan for committed visual baselines
- [AGENTS.md](AGENTS.md): notes for coding agents (`CLAUDE.md` links to it)

## Things that aren't obvious from the code

- **Events** are fetched at request time from the Luma calendar API (`lib/data/events.ts`), not hardcoded.
- **Donations** use prebuilt Stripe payment links hardcoded in `components/DonateForm.tsx` — there is no payment backend.
- **Fonts** are committed as woff2 in `public/fonts/`, so there is no font download/build step after cloning.
- **`public/CNAME`** is a leftover from the old GitHub Pages setup. Netlify ignores it; the domain is managed in the Netlify dashboard.

## Deployment

Netlify, configured in `netlify.toml` (build `npm run build`, publish `.next`, Node 22). Pushes to the default branch deploy to production; pull requests get deploy previews automatically.
