# PauseAI UK website

The [pauseai.uk](https://pauseai.uk) website: Next.js 16 and React 19, deployed to Netlify.

## Run it locally

### 1. Install Node and Postgres

- **Node 22.**
- **Postgres 18**, the version the live site runs, including its command-line tool `psql`. Postgres holds Email your MP's data, and some unit tests use it.
  - **Mac:** install [Postgres.app](https://postgresapp.com). Open it and click **Initialize**. Then run this, and open a new terminal:
    ```bash
    sudo mkdir -p /etc/paths.d && echo /Applications/Postgres.app/Contents/Versions/latest/bin | sudo tee /etc/paths.d/postgresapp
    ```
  - **Debian or Ubuntu:** `sudo apt install postgresql`, then `sudo -u postgres createuser --superuser "$(whoami)"`. If your release's package is older than 18, add [PostgreSQL's own apt repository](https://www.postgresql.org/download/linux/ubuntu/) first.

Check both:

```bash
node --version   # v22 or later
psql --version   # psql (PostgreSQL) 18.x
```

### 2. Set up and run

```bash
npm install
cp .env.example .env.local   # your local settings: edit it, see below
npm run db:reset             # makes the database NETLIFY_DB_URL names
npm run dev                  # http://localhost:3000
```

In `.env.local`:

- **`NETLIFY_DB_URL`** is your local database. The example suits Postgres.app on a Mac. On Linux, use `postgresql:///pauseai_dev?host=/var/run/postgresql`.
- **`TEST_MP_EMAIL`**: your email. Letters to the test MP go there.
- **`DATA_FIXTURES=1`** fakes every outside service, so you need no other keys. Emails are written to files in `tmp/outbox/` instead of sent.

Try Email your MP at http://localhost:3000/email-your-mp-v2 with postcode ZZ99ZZ. The confirmation link is in the newest file in `tmp/outbox/`.

`npm run db:reset` wipes the database and makes it again, with the latest migrations. It only works on a database on your own machine.

To use real services, delete `DATA_FIXTURES` and fill in the rest of `.env.local`. [.env.example](.env.example) explains each variable; Netlify needs the same ones. [docs/development.md](docs/development.md) covers the rest: what the fixtures fake, logging in as staff, the daily jobs and webhooks, and running the Playwright suites.

## Tests

```bash
npm test                 # unit tests (needs Postgres, as above)
npm run test:coverage    # unit and component tests, held at 100% coverage
npm run test:behaviour   # Playwright, on a fixture build
npm run test:visual      # Playwright, the local build against pauseai.uk
npm run lint
```

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
