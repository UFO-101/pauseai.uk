# PauseAI UK website

The [pauseai.uk](https://pauseai.uk) website: Next.js 16 and React 19, deployed to Netlify.

## Features

- **Public site:** who we are, people's stories, local groups, blog, press, jobs, governance, donations, research.
- **Events:** from our Luma calendar, on `/events`, the home page and local group pages.
- **March sign-up:** `/march`, a sub-site in its own poster style for the March Against AI Extinction. Registering adds the person to the march's Luma event, then asks them to share it (`/march/share`).
- **Email your MP:** `/campaigns`. Postcode to MP, edit and send a campaign letter; replies come back to the sender and the policy team.
- **Volunteer tools:** collateral maker and QR codes (`/tools`); live results of activity days (`/trackers`).
- **Staff interface:** `/staff`. Politicians and what they've signed, letters and replies, nightly imports, blocked email addresses, audit log.
- **Component gallery:** `/gallery`, fixture builds only.

How they're built is in [docs/domain-concepts.md](docs/domain-concepts.md).

## Run it locally

With Node 22, Docker and `psql`:

```bash
npm install
docker compose up -d         # Postgres for the site and the tests
cp .env.example .env.local   # set TEST_MP_EMAIL to your email
npm run db:reset             # makes the database, with the test MPs and plenty of fake data to look at
npm run dev                  # http://localhost:3000, with every outside service faked
```

Try Email your MP with postcode ZZ99ZZ; the letter lands in `tmp/outbox/`. The rest, including tests and real services, is in [docs/development.md](docs/development.md).

## Docs

- [docs/domain-concepts.md](docs/domain-concepts.md): the concepts the features are built from, and how to extend them
- [docs/development.md](docs/development.md): setting up local development in full
- [docs/code-structure.md](docs/code-structure.md): where code lives, and the rules for it, including comments
- [docs/testing.md](docs/testing.md): how it's tested
- [docs/data-protection.md](docs/data-protection.md): what personal data the site holds, why, and how it's erased
- [docs/style-guide.md](docs/style-guide.md): design, and where to find every component
- [scripts/README.md](scripts/README.md): what each script does
- [backup/README.md](backup/README.md): the nightly database backup to Cloudflare, and restoring one
- [plans/](plans/): plans for work in progress, deleted when done
- [AGENTS.md](AGENTS.md): notes for coding agents

## Deployment

Netlify: pushing to `main` deploys the live site, and pull requests get previews. The database is backed up nightly to Cloudflare ([backup/README.md](backup/README.md)). What has to be set up outside the code is in [docs/development.md](docs/development.md), "Deploying".
