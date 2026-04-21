# Pause AI UK Website

Single-page static site deployed to GitHub Pages via a separate `gh-pages` branch.

## Structure

- `site/`: Source for the static site
  - `index.html`: Main page
  - `styles.css`: Site styles
  - `script.js`: Minimal behavior
  - `CNAME`: Custom domain configuration (`pauseai.uk`)
- `.github/workflows/deploy.yml`: Optional manual deployment workflow to publish `site/` to `gh-pages`.

## Local development

```bash
npm run dev        # starts a hot-reload server at http://localhost:8080
npm run lighthouse # run Lighthouse against the live site (pauseai.uk)
npm run lighthouse:dev # run Lighthouse against the local dev server
```

No build step is required — `site/` is served as-is.

## Fonts

Fonts are self-hosted for performance. The woff2 files in `site/fonts/` are committed to the repo, so no action is needed after cloning.

They are sourced from the [`@fontsource-variable`](https://fontsource.org) npm packages. To update to a newer font version:

```bash
npm install         # update packages
npm run fonts:update  # copy new woff2 files into site/fonts/
```

The `@font-face` declarations in `site/styles.css` reference these files directly.

## Deployment

There are two ways to publish to `gh-pages`:

1) Deploy script (recommended)

```bash
# From repo root
./scripts/deploy.sh               # safe push (no force)
./scripts/deploy.sh --force       # force push using split branch
# Options: --remote, --branch, --prefix, --allow-dirty
```

2) Manual subtree push (keeps deploy branch independent of `main`)

```bash
# From repo root
git subtree split --prefix site -b gh-pages
# Push the generated branch to origin
git push -u origin gh-pages --force
# Optional: delete local temp branch
git branch -D gh-pages
```

3) GitHub Actions (manual trigger)

Run the "Deploy to GitHub Pages" workflow from the Actions tab. It publishes `site/` to the `gh-pages` branch using the built-in `GITHUB_TOKEN`.

## GitHub Pages settings

- Set Pages source to the `gh-pages` branch (root).
- Custom domain: `pauseai.uk` (the `CNAME` file is included so it persists).
- Point your domain’s DNS to GitHub Pages (ALIAS/ANAME or A records to GitHub and CNAME for `www` if desired).
