# Pause AI UK Website

The [pauseai.uk](https://pauseai.uk) website — a [Next.js](https://nextjs.org) (App Router) app deployed to Netlify.

## Stack

- **Next.js 16** (App Router) with **React 19** and **TypeScript**
- Self-hosted Inter (`next/font/local` + `@font-face`) and Google-hosted Lato (`next/font/google`)
- Deployed to **Netlify** via `@netlify/plugin-nextjs`

## Layout

- `app/` — routes, layouts, and per-route CSS (App Router)
- `components/` — shared React components
- `lib/data/` — typed content modules; shared config (social links, emails, GA ID, external URLs) is in `lib/data/site.ts`
- `public/` — static assets (`fonts/`, `images/`, `pdfs/`, favicons)

## Local development

```bash
npm install
npm run dev    # Next dev server (Turbopack) at http://localhost:3000
npm run build  # Production build
npm run lint   # ESLint
```

See `package.json` for the full script list, including the `lighthouse*` scripts.

## Testing

- **Unit tests** (`npm test`, Vitest) cover `lib/` and `app/api/`. They run automatically as part of `npm run build`, so a failing test blocks deploy.
- **Airtable access is locked to `lib/airtable.ts`**: an ESLint rule (`no-restricted-syntax` in `eslint.config.mjs`) bans any other file from referencing `api.airtable.com`, so the signed-only filter and field whitelist there can't be bypassed by a new call site. `npm run check:airtable-filter` runs just that rule, isolated from the rest of ESLint, and is also part of `npm run build` — a bypass fails the build the same way a failing test does.
- **Visual regression** (`npm run test:visual`, Playwright) screenshots every page on the live site and this local build side by side and pixel-diffs them — no stored baseline to keep up to date, since site content (news, events, stories) changes too often for one to stay meaningful. `npm run test:visual:report` opens the HTML report with live/local/diff images per page. See `tests/visual/pages.spec.ts`.

## Things that aren't obvious from the code

- **Events** are fetched at request time from the Luma calendar API (`lib/data/events.ts`), not hardcoded.
- **Donations** use prebuilt Stripe payment links hardcoded in `components/DonateForm.tsx` — there is no payment backend.
- **Fonts** are committed as woff2 in `public/fonts/`, so there is no font download/build step after cloning.
- **`public/CNAME`** is a leftover from the old GitHub Pages setup. Netlify ignores it; the domain is managed in the Netlify dashboard.

## Deployment

Netlify, configured in `netlify.toml` (build `npm run build`, publish `.next`, Node 22). Pushes to the default branch deploy to production; pull requests get deploy previews automatically.
