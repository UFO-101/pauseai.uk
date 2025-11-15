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

Open `site/index.html` in a browser (no build step required).

## Deployment

There are two ways to publish to `gh-pages`:

1) Manual subtree push (keeps deploy branch independent of `main`)

```bash
# From repo root
git subtree split --prefix site -b gh-pages
# Push the generated branch to origin
git push -u origin gh-pages --force
# Optional: delete local temp branch
git branch -D gh-pages
```

2) GitHub Actions (manual trigger)

Run the "Deploy to GitHub Pages" workflow from the Actions tab. It publishes `site/` to the `gh-pages` branch using the built-in `GITHUB_TOKEN`.

## GitHub Pages settings

- Set Pages source to the `gh-pages` branch (root).
- Custom domain: `pauseai.uk` (the `CNAME` file is included so it persists).
- Point your domain’s DNS to GitHub Pages (ALIAS/ANAME or A records to GitHub and CNAME for `www` if desired).
