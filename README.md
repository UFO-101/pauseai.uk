# PauseAI UK website

The [pauseai.uk](https://pauseai.uk) website: Next.js 16 and React 19, deployed to Netlify.

## Run it locally

You need Node 22 and Postgres (with `psql`). Postgres holds Email your MP's data, and some unit tests use it.

```bash
npm install

# Where Postgres is (here, Homebrew's socket). Add PGPASSWORD if you need one.
export PGHOST=/tmp PGUSER=$(whoami)

# A fresh database, with the test MP. Running it again wipes the database.
export NETLIFY_DB_URL=$(node scripts/fresh-database.mjs pauseai_dev --test-mp you@example.com)

# Dev server at http://localhost:3000, with outside services faked.
# Emails are written to tmp/outbox/ instead of sent.
DATA_FIXTURES=1 OUTBOX_DIR=tmp/outbox POSTMARK_SERVER_TOKEN=fixture npm run dev
```

Try Email your MP at http://localhost:3000/email-your-mp-v2 with postcode ZZ99ZZ. The confirmation link is in the newest file in `tmp/outbox/`.

For real data, leave out `DATA_FIXTURES` and set the variables below in `.env.local`.

## Environment variables

Set in Netlify for the live site. None are needed for `DATA_FIXTURES=1` except those above.

| Variable | What it's for | If it's missing |
| --- | --- | --- |
| `LUMA_API_KEY` | Registrations on the flyering trackers | The trackers can't load registrations |
| `NETLIFY_DB_URL` | The Postgres database. Netlify sets it when Netlify Database is on | Email your MP, staff pages and the signatories list fail |
| `TURNSTILE_SECRET_KEY` | Checks the anti-spam token on the Email your MP form | Every letter is refused (except in `npm run dev`) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Draws the anti-spam widget. Read at build time | Every letter is refused |
| `POSTMARK_SERVER_TOKEN` | Sends letters, confirmation emails and forwarded replies | No letters can be sent |
| `POSTMARK_WEBHOOK_USER`, `POSTMARK_WEBHOOK_PASSWORD` | The basic auth on Postmark's bounce and inbound webhooks | Bounces and replies are refused |
| `REPLIES_INBOX` | The PauseAI inbox that gets a copy of every MP's reply | Replies go only to the sender |
| `TEST_MP_EMAIL` | The test MP's inbox (postcode ZZ99ZZ) | The test MP has no email, so no form |
| `MP_MAIL_DOMAIN` | The domain letters come from and replies go to | `mp.pauseai.uk` |
| `CONFIRMATION_FROM` | The confirmation email's From | `PauseAI UK <confirm@mp.pauseai.uk>` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Staff login at `/staff`, with a pauseai.uk Google account | Staff can't log in |
| `CRON_SECRET` | Lets the daily jobs (MP sync, deleting unconfirmed letters) call the site | The daily jobs fail |
| `AIRTABLE_TOKEN` | The one-off import of signatories from Airtable | The import page says it isn't set up |

Netlify sets `URL` and `CONTEXT` itself. Only a `CONTEXT` of `production` can send letters to real MPs; everywhere else, only to the test MP.

For staff login locally, make your own Google OAuth client with `http://localhost:3000/staff/api/callback` as a redirect URI. For real MPs locally, run the dev server with `CRON_SECRET=dev`, then:

```bash
curl -X POST -H "Authorization: Bearer dev" localhost:3000/api/cron/sync-mps
```

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

- [docs/code-structure.md](docs/code-structure.md): where code lives
- [docs/testing.md](docs/testing.md): how it's tested
- [docs/email-your-mp.md](docs/email-your-mp.md): the Email your MP tool and staff interface
- [docs/style-guide.md](docs/style-guide.md): design
- [plans/](plans/): work planned or in progress
- [AGENTS.md](AGENTS.md): notes for coding agents

## Deployment

Netlify, configured in `netlify.toml`. Pushing to `main` deploys the live site; pull requests get previews. Database migrations in `netlify/database/migrations/` are applied by Netlify on deploy.
