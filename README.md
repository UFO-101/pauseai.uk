# PauseAI UK website

The [pauseai.uk](https://pauseai.uk) website: Next.js 16 and React 19, deployed to Netlify.

## Run it locally

You need Node 22 and Postgres 18, with `psql` on your path. On a Mac, install [Postgres.app](https://postgresapp.com) and follow its setup steps. Postgres holds Email your MP's data, and some unit tests use it.

```bash
npm install

# A fresh database, with the test MP. Running it again wipes the database.
export NETLIFY_DB_URL=$(node scripts/fresh-database.mjs pauseai_dev --test-mp you@example.com)

# Dev server at http://localhost:3000, with outside services faked.
# Emails are written to tmp/outbox/ instead of sent.
DATA_FIXTURES=1 OUTBOX_DIR=tmp/outbox POSTMARK_SERVER_TOKEN=fixture npm run dev
```

Try Email your MP at http://localhost:3000/email-your-mp-v2 with postcode ZZ99ZZ. The confirmation link is in the newest file in `tmp/outbox/`.

For real data, leave out `DATA_FIXTURES`, then `cp .env.example .env.local` and fill it in: [.env.example](.env.example) lists every environment variable, and Netlify needs the same ones. [docs/development.md](docs/development.md) covers the rest: installing Postgres, what the fixtures fake, logging in as staff, the daily jobs and webhooks, and running the Playwright suites.

## Tests

```bash
npm test                 # unit tests (needs Postgres, as above)
npm run test:coverage    # unit and component tests, held at 100% coverage
npm run test:behaviour   # Playwright, on a fixture build
npm run test:visual      # Playwright, the local build against pauseai.uk
npm run lint
```

`npm run build` runs the unit tests first, so a failing test blocks a deploy. See [docs/testing.md](docs/testing.md).

## Docs

- [docs/development.md](docs/development.md): setting up local development in full
- [docs/code-structure.md](docs/code-structure.md): where code lives
- [docs/testing.md](docs/testing.md): how it's tested
- [docs/email-your-mp.md](docs/email-your-mp.md): the Email your MP tool and staff interface
- [docs/style-guide.md](docs/style-guide.md): design
- [plans/](plans/): work planned or in progress
- [AGENTS.md](AGENTS.md): notes for coding agents

## Deployment

Netlify, configured in `netlify.toml`. Pushing to `main` deploys the live site; pull requests get previews. Database migrations in `netlify/database/migrations/` are applied by Netlify on deploy.
