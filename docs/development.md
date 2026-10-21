# Local development

How to set up and run everything on your own machine: the site, the
database, Email your MP, the staff interface, and the tests. The README has
the short version, and `.env.example` lists the environment variables.

## 1. What you need

- **Node 24**, the version in `.nvmrc`, which Netlify and CI use too, at
  24.22.1 or later. `npm install` refuses anything else (`engines` in
  `package.json`, with `engine-strict` in `.npmrc`).
- **Docker**, to run Postgres 18 from `docker-compose.yml`, matching
  production: Netlify Database runs PostgreSQL 18.6, and CI uses 18 too. Or
  a Postgres 18 installed natively (below).
- **`psql`**, Postgres's command-line tool, on your path. The scripts use it
  to make databases and apply migrations.
- **Chromium for Playwright**, for the browser tests:
  `npx playwright install chromium`.

You don't need the Netlify CLI. The site runs with plain `npm run dev`.

## 2. Install

```bash
git clone https://github.com/UFO-101/pauseai.uk.git
cd pauseai.uk
npm install
```

Optionally, `npm run hooks:install` sets up a Git hook (with
[prek](https://prek.j178.dev/)) that runs Prettier, ESLint and Stylelint
on the files you commit, in a couple of seconds, and stops the commit if
they fail. Prettier formats the files itself, so after it stops a commit,
`git add` them and commit again. The hooks are in `.pre-commit-config.yaml`.
CI runs all of them and more either way.

## 3. Postgres

Email your MP, the staff interface and the signatories list on `/campaigns`
read and write a Postgres database. So do some unit tests. Every other page
works without one.

### Start it

**With Docker (the default):**

```bash
docker compose up -d
```

That starts two Postgres 18 servers, from `docker-compose.yml`:

| Service   | Port | For                                | Kept                                          |
| --------- | ---- | ---------------------------------- | --------------------------------------------- |
| `db`      | 5432 | the dev server's database          | in a Docker volume, between restarts          |
| `db-test` | 5433 | the throwaway databases tests make | in memory only, with durability off for speed |

You still need `psql` on your machine: `brew install libpq && brew link
--force libpq` on a Mac, `sudo apt install postgresql-client` on Debian or
Ubuntu. `docker compose down` stops them; `docker compose down -v` also
deletes the dev data.

**Natively, instead:**

- **Mac:** install [Postgres.app](https://postgresapp.com). Open it, click
  **Initialize**, then put its tools on your path and open a new terminal:
  ```bash
  sudo mkdir -p /etc/paths.d && echo /Applications/Postgres.app/Contents/Versions/latest/bin | sudo tee /etc/paths.d/postgresapp
  ```
- **Debian or Ubuntu:** `sudo apt install postgresql`, then
  `sudo -u postgres createuser --superuser "$(whoami)"`.

### Tell the site and the tests where it is

Your local settings live in `.env.local`, which git ignores. Start from the
example:

```bash
cp .env.example .env.local
```

Two settings in it say where Postgres is:

| Setting             | What it is                               | Docker (the example's)                                      | Postgres.app                         | apt                                                  |
| ------------------- | ---------------------------------------- | ----------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------- |
| `NETLIFY_DB_URL`    | the dev server's database                | `postgresql://postgres:postgres@localhost:5432/pauseai_dev` | `postgresql://localhost/pauseai_dev` | `postgresql:///pauseai_dev?host=/var/run/postgresql` |
| `TEST_DATABASE_URL` | the server tests make their databases on | `postgresql://postgres:postgres@localhost:5433/postgres`    | delete it                            | delete it                                            |

Without `TEST_DATABASE_URL`, tests use the usual `PG*` variables, or find a
local server's socket by themselves: in `/var/run/postgresql` (Linux) or
`/tmp` (Mac). Tests read only that one line of `.env.local`, so its other
settings never reach them. The Postgres user needs to be able to create
databases: every test file makes its own.

### Make a database for the dev server

Set `TEST_MP_EMAIL` in `.env.local` to your email, and keep the example's
`DATA_FIXTURES=1` for fake supporters to look at. Then:

```bash
npm run db:reset
```

This:

- drops the database `NETLIFY_DB_URL` names, if it exists, and creates it
  empty;
- applies every migration in `netlify/database/migrations/`, in order, as
  Netlify does;
- adds the test MPs, whose letters go to `TEST_MP_EMAIL`: Testy McTestface
  MP, found by postcode ZZ99ZZ, and Signy McTestface MP (ZZ99ZS), who has
  already signed the letter to the PM. Nomail McTestface MP (ZZ99ZN) has no
  email, to see what the form says then. Backy McTestface MP (ZZ99ZB) signed
  ControlAI's letter backing the Sobel bill, so the bill's letter thanks
  them. Bouncy McTestface MP (ZZ99ZH) always has `no-such-mailbox@pauseai.uk`,
  which doesn't exist, so letters to them bounce. They're listed in
  `lib/test-mps.json`.
- with `DATA_FIXTURES=1`, adds fake data (`tests/fixtures/staff-data.sql`)
  to every table, so every staff page has something on it and the home
  page's dashboard has a number in each tile for the last week and the week
  before: the Luma fixtures' people and events and Airtable's two MPs under
  their own IDs (so an import writes the same rows rather than doubling
  them) plus made-up people, events, registrations of every status and an
  erased person; twenty letters to the test MPs in every state, with
  replies, an out-of-office, bounces that blocked Bouncy's address, a soft
  bounce and a spam complaint; unsubscribes, one undone; a peer added by
  staff and an MP who has left; statuses set this week and last; every
  job's runs in every state, including a sync held for a decision; staff
  accounts for jo@pauseai.uk (supporters, with a kept session) and
  sam@pauseai.uk (none) beside the migration's admin; and an audit log of
  all that. Dates are relative to when it runs. Without `TEST_MP_EMAIL`,
  the test MPs still go in, with `test-mp@example.org`, since the letters go
  to the fixture outbox anyway. The storyboard's flows start from an empty
  database, without this.

Run it again whenever you want a clean database. It wipes everything. It
refuses a URL that isn't on your own machine, so it can't touch the live
database.

### Keeping it up to date

After pulling a branch with a new migration, apply what your database
hasn't had, keeping its data:

```bash
npm run db:migrate
```

It applies each pending file in `netlify/database/migrations/` in order,
each in its own transaction, and records it in the database's
`schema_migrations` table, which `db:reset` fills too. That table is only
for local databases: Netlify keeps its own record of what it has applied
on deploy. Like `db:reset`, it refuses a database on another machine.

The dev server checks the table when it first connects, and says in its
terminal when the database is behind. Only `next dev` does: production and
previews run on databases Netlify has migrated.

A database made before `db:migrate` existed has no `schema_migrations`
table, so the first time, say which migration it's up to:

```bash
npm run db:migrate -- --applied-up-to 0011
```

That records 0001 to 0011 as applied, then applies the rest.

### Adding a migration

1. Add a file to `netlify/database/migrations/`, numbered after the last:
   `0003_what_it_does.sql`. It must be backward compatible (expand, then
   contract), and work with or without a transaction around it
   (`docs/code-structure.md`).
2. `npm run db:schema` rewrites `netlify/database/schema.sql`, the whole
   schema as the migrations leave it. It needs `pg_dump` 18.
3. `npm run db:migrate` applies it to your dev database.
4. Commit the migration and `schema.sql` together. The PR then shows both
   the migration and what it does to the schema. A unit test fails while
   `schema.sql` is out of date.

### Looking inside

```bash
psql postgresql://postgres:postgres@localhost:5432/pauseai_dev   # your NETLIFY_DB_URL
```

```sql
select name, constituency, email from politicians where is_test;
select id, status, sender_email, created_at from letters order by id desc;
select * from letter_events order by id desc limit 20;
```

## 4. Run the site

There are two ways to run it: with fake outside services, or with real ones.

### With fake outside services (start here)

```bash
npm run dev
```

The example `.env.local` sets `DATA_FIXTURES=1`. With it, every call to an outside service gets a canned
answer from `tests/fixtures/outside-services.ts` instead. Nothing leaves
your machine. You need no keys:

| Service                  | What the fixture does                                                                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Luma                     | A few made-up events and guests. Adding a guest to the march works, except for `luma-fails@…`, which errors, and `luma-skips@…`, which Luma skips.          |
| postcodes.io             | Knows only SW1A 1AA (Cities of London and Westminster); every other postcode is "not found". The test postcodes never ask it.                               |
| Airtable                 | A politician of each body, one retired and one who left, with their statuses; PauseAI's emails to them; the old form's letters; Go to Parliament's meetings |
| Parliament's Members API | The same two MPs, with an office email each. Polly Placeholder's differs from Airtable's, so the MP check has something to show.                            |
| Turnstile                | Accepts every token                                                                                                                                         |
| Postmark                 | Accepts every email, without needing a token, and writes each one to a mail file (`.eml`) in `OUTBOX_DIR`, or `tmp/outbox/` in the dev server.              |

#### Send a letter to the test MP

1. Open http://localhost:3000/campaigns.
2. Enter any name, and postcode `ZZ99ZZ`. The page for writing the letter
   opens, to Testy McTestface MP.
3. Fill in an email and an address, then go to the preview, and send it
   from there. Without its keys, Turnstile isn't needed.
4. The letter is sent: it's the newest `.eml` file in `tmp/outbox/`, with its PDFs
   attached. Open it in a mail app or a text editor.

`/staff/letters` shows it, once you've logged in with the `supporters`
permission.

To see a campaign's page move on to the next, look up ZZ99ZS instead: that
MP has already signed, so the letter to the PM moves on to the bill. ZZ99ZN
finds an MP with no email, so there's no letter to write. ZZ99ZB, on the
bill's page, finds an MP who signed ControlAI's letter backing it. Outside
production, the form lists the test postcodes under it.

#### Write to a real MP

Outside production, letters can only go to the test MP. That's checked
both when the form is sent and when the letter is, so locally you can look
real MPs up but not send to them. That's on purpose.

To look them up with fixtures, add the fixture politicians first (with
PauseAI's fixture emails to them):

```bash
# With CRON_SECRET=dev in .env.local (restart the dev server after editing it):
curl -X POST -H "Authorization: Bearer dev" localhost:3000/api/cron/sync-politicians
```

Then postcode `SW1A 1AA` finds Polly Placeholder.

#### Log in to the staff interface

Open http://localhost:3000/staff/login. In a fixture build the login card
has a hatched purple box under it, the dev login: a button per account
(admin@pauseai.uk, which every database starts with, and which
`db:reset` gives the supporters permission as well as admin; and the
seed's jo@pauseai.uk and sam@pauseai.uk) and one for nobody@pauseai.uk, which has
no account, each signing you in at once, with no email.
It exists only with `DATA_FIXTURES=1`; its route is a 404 anywhere else.

To go through the real login instead:

1. Type an address at pauseai.uk in the card. Any such address can log in,
   but one without an account sees only a note saying whom to ask until an
   admin adds it on `/staff/accounts`.
2. The login email is the newest file in `tmp/outbox/`. Open the
   `/staff/api/callback?token=…` link in it, in the same browser.

You're at `/staff`, logged in for a day, or for 30 days with "Keep me signed
in" ticked. Only Postmark is a fixture.

#### See every component

http://localhost:3000/gallery is the component gallery: every component and
its variants, a page per group, on fixture data. It's there only with
`DATA_FIXTURES=1`. See `docs/testing.md`, "The component gallery".

### With real outside services

Delete `DATA_FIXTURES` from `.env.local`, and fill in the keys you need. Each is explained there. Things to know:

- **Politicians.** The database starts with only the test MPs. With
  `AIRTABLE_TOKEN` set, copy the real politicians from Airtable, and
  PauseAI's 2026 emails to them, then check the MPs against Parliament
  (about 650 lookups, which takes a minute):

  ```bash
  # With CRON_SECRET=dev in .env.local:
  curl -X POST -H "Authorization: Bearer dev" localhost:3000/api/cron/sync-politicians
  curl -X POST -H "Authorization: Bearer dev" localhost:3000/api/cron/check-mps
  ```

  Then any real postcode finds its MP.

- **Turnstile.** You can leave both keys out, and the check is skipped,
  in any build. Set just one, and every letter is refused. To see the widget, use Cloudflare's test keys, which
  always pass: site key `1x00000000000000000000AA`, secret
  `1x0000000000000000000000000000000AA`. A production build refuses the
  test secret.
- **Postmark.** Use the test token `POSTMARK_API_TEST`, which accepts emails
  without sending them. A real server token sends real emails, so only use
  one with the test MP and an inbox you own.
- **Staff login.** The link is emailed through Postmark, so with the test
  token it never arrives. Use fixtures to log in, or a real server token and
  your own pauseai.uk address.
- **Airtable.** `AIRTABLE_TOKEN` needs read access to the UK
  Parliamentarians base's "UK Parliamentarians", "Emails", "Web form
  emails" and "Go to Parliament Oct 2026" tables, and to the members' base.
  They're for the politician and Emails syncs and the two one-off imports at
  `/staff/import-data`.

### The march sign-up and Luma

`/march` adds each person who registers to a Luma event as a guest, with
Luma's add-guests call (`addLumaGuest` in
`lib/server/outside-services/luma-guests.ts`), and Luma emails them its
confirmation. Two settings, both server-only:

- `LUMA_API_KEY`: the key the rest of the site uses, from the calendar
  that owns the event (Luma Plus).
- `LUMA_MARCH_EVENT_ID`: the event to add them to, `evt-…`. Not secret. It's
  the event's API ID: on Luma, open the event's manage page, and it's in the
  address (`luma.com/event/manage/evt-…`). Point it at a test event until
  the sign-up has been checked end to end, then at the march's.

Without either, registering fails, as it does when Luma errors, takes
longer than 5 seconds or skips the guest (someone who unsubscribed from the
calendar, or was removed or blocked there): the form says it didn't go
through and links to the march's Luma page instead. The server logs a
`[march]` line saying why, without the email address.

To try it against a test event:

1. On the PauseAI UK calendar, make a private event and copy its `evt-…` ID.
2. In `.env.local`, delete `DATA_FIXTURES`, set `LUMA_API_KEY` and set
   `LUMA_MARCH_EVENT_ID` to the test event's ID. Restart `npm run dev`.
3. Register at http://localhost:3000/march with an address you can read.
   The form should turn into the share card, you should show up as a guest of the test event,
   get Luma's email, and see no `[march]` line in the server's log.
4. On Netlify, set `LUMA_MARCH_EVENT_ID` for the deploy previews (the
   environment variable's "Deploy Previews" context) to the test event, and
   try a preview the same way. Set it for production to the march's event
   once that works.

## 5. Things that run on a schedule, or from outside

None of these run under `npm run dev` by themselves. Call them by hand.

**The scheduled jobs.** On Netlify, scheduled functions in `netlify/functions/`
call these routes. Locally, with `CRON_SECRET=dev` in `.env.local`:

```bash
curl -X POST -H "Authorization: Bearer dev" localhost:3000/api/cron/sync-politicians
curl -X POST -H "Authorization: Bearer dev" localhost:3000/api/cron/check-mps
curl -X POST -H "Authorization: Bearer dev" localhost:3000/api/cron/import-luma   # the hourly Luma import; with fixtures, the fixture calendar
curl -X POST -H "Authorization: Bearer dev" localhost:3000/api/cron/import-members   # the hourly members import; with fixtures, the fixture members
```

**Postmark's webhooks.** Set `POSTMARK_WEBHOOK_USER=postmark` and
`POSTMARK_WEBHOOK_PASSWORD=secret`, then post payloads in Postmark's
format:

```bash
# A hard bounce. Use a message_id from the email_sends table, and its address.
curl -u postmark:secret -H 'Content-Type: application/json' localhost:3000/api/postmark/bounce \
  -d '{"RecordType":"Bounce","MessageID":"<id>","Email":"<address>","Type":"HardBounce","Description":"Unknown user","Inactive":true,"CanActivate":true}'

# A reply. Send it to a letter's address: its reply_hash in the letters table, @letters.pauseai.uk.
curl -u postmark:secret -H 'Content-Type: application/json' localhost:3000/api/postmark/inbound \
  -d '{"FromFull":{"Email":"test-mp@example.org","Name":"Testy"},"ToFull":[{"Email":"<reply_hash>@letters.pauseai.uk"}],"CcFull":[],"Subject":"Re: hello","TextBody":"Thanks."}'
```

With `REPLIES_INBOX` set, the reply is forwarded there too. With fixtures,
both copies land in the outbox.

**Luma's webhook.** Set `LUMA_WEBHOOK_SECRET=whsec_dev`, then post a
payload in Luma's format, signed as Luma signs it: the `Webhook-Signature`
header is `t=<unix seconds>,v1=<hex>`, the HMAC-SHA256 of `<t>.<body>` with
the secret, and `Webhook-Id` is the delivery's ID, which stops a redelivery
counting twice. A timestamp over five minutes old is refused.

```bash
BODY='{"type":"calendar.person.unsubscribed","data":{"id":"usr-1","email":"someone@example.com"}}'
T=$(date +%s)
SIG=$(printf '%s.%s' "$T" "$BODY" | openssl dgst -sha256 -hmac whsec_dev | sed 's/.* //')
curl -H 'Content-Type: application/json' -H "Webhook-Id: msg_1" -H "Webhook-Signature: t=$T,v1=$SIG" \
  localhost:3000/api/luma/webhook -d "$BODY"
```

The address gets an open row in `opt_outs`; a `calendar.person.subscribed`
payload for it closes the row.

**Centring a person's photo.** The People page crops each photo to a
square. `imageStyle` in `lib/content/people.ts` sets which part shows, as a
`background-position`. A script can find the face and set it for you:

```bash
npm run data:story-image-detect-faces -- --dry-run Jane-Doe-Stories.jpg  # prints the position
npm run data:story-image-detect-faces -- Jane-Doe-Stories.jpg            # writes it to people.ts
```

The file is one in `public/images/people/`, matching the person's `imageSrc`.
Always name it. With no file, the script resets every person's position,
including ones set by hand. It centres the face, so you may still want to
tweak the result by hand to show more of the head. It runs Google's
BlazeFace model with TensorFlow.js, which are dev dependencies only.

## 6. Tests

```bash
npm test                 # both, held at 100% per file, as CI runs it
npm run test:node        # Vitest, Node: logic, routes, database code
npm run test:browser     # Vitest, real Chromium: components
npm run test:storyboard  # Playwright: every page and every flow, on a fixture build (the gate)
npm run storyboard       # Playwright: the same with screenshots, against main, then the page (testing.md)
npm run lint                    # ESLint, failing on warnings too
npm run lint:css                # Stylelint
npm run lint:unused             # Knip: unused files, exports and dependencies
npm run format                  # Prettier, on everything but plans/ (format:check only checks)
```

- **Database tests** need Postgres reachable with your `PG*` variables.
  Each test file makes its own database and drops it afterwards.
- **While any copy is a placeholder**, `tests/checks/placeholder-copy.test.ts` fails, and
  so does `npm run build`, which runs the unit tests first. That's on
  purpose: placeholders can't be deployed (AGENTS.md).
- **The storyboard** builds and starts the site itself on port 3100, unless
  a server is already running there. Your dev server, on 3000, is left
  alone. To skip rebuilding each run, start one yourself, with the same
  settings `playwright.config.ts` uses for its `webServer`
  (`fixtureEnv()` in `tests/fixture-env.mjs`):

  ```bash
  export NETLIFY_DB_URL=$(node scripts/fresh-database.mjs pauseai_storyboard --test-mp test-mp@example.org)
  DATA_FIXTURES=1 FIXTURE_NOW=2026-10-16T12:00:00.000Z ANALYTICS=1 LUMA_API_KEY=fixture LUMA_MARCH_EVENT_ID=evt-fixture AIRTABLE_TOKEN=fixture STRIPE_WALL_OF_THANKS_KEY=fixture \
    TURNSTILE_SECRET_KEY=fixture NEXT_PUBLIC_TURNSTILE_SITE_KEY=fixture TEST_MP_EMAIL=test-mp@example.org \
    CRON_SECRET=fixture-cron-secret LUMA_WEBHOOK_SECRET=fixture-luma-webhook-secret \
    POSTMARK_SERVER_TOKEN=fixture POSTMARK_WEBHOOK_USER=postmark POSTMARK_WEBHOOK_PASSWORD=fixture-webhook-password \
    REPLIES_INBOX=replies@example.org OUTBOX_DIR=/tmp/pauseai-storyboard-outbox \
    npx next build
  # ...then the same variables with `npx next start --port 3100`, and in another terminal:
  npm run test:storyboard
  ```

  The storyboard's flows each get their own database, copied from a
  template on the test server (`TEST_DATABASE_URL`, or your local Postgres),
  so the build's own database is only for requests that carry no flow's
  cookie.

See [testing.md](testing.md) for the rules.

## 7. When something goes wrong

| Problem                                                   | Fix                                                                                                                                                                                                                                                                                |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NETLIFY_DB_URL is not set`                               | Copy `.env.example` to `.env.local` (section 3).                                                                                                                                                                                                                                   |
| `psql: command not found`                                 | Install the Postgres client, and make sure it's on your path.                                                                                                                                                                                                                      |
| `connection to server ... failed` or `Connection refused` | Postgres isn't running (`docker compose up -d`), or `NETLIFY_DB_URL`, `TEST_DATABASE_URL` or `PGHOST` points to the wrong place (section 3).                                                                                                                                       |
| `role "..." does not exist`                               | Create a superuser for yourself (`createuser --superuser`), or set `PGUSER`.                                                                                                                                                                                                       |
| `permission denied to create database`                    | Your Postgres user needs `CREATEDB`: `alter user <you> createdb;`.                                                                                                                                                                                                                 |
| `relation "letters" does not exist`                       | The database is older than a migration: `npm run db:migrate` (section 3).                                                                                                                                                                                                          |
| ZZ99ZZ says no MP found                                   | The database has no test MP. Set `TEST_MP_EMAIL` and run `npm run db:reset`, or run the politician sync.                                                                                                                                                                           |
| The test MP shows "no email listed"                       | The test MP was added without an email. Set `TEST_MP_EMAIL` and run `npm run db:reset`.                                                                                                                                                                                            |
| Sending says it failed                                    | Without `DATA_FIXTURES`, check `POSTMARK_SERVER_TOKEN`.                                                                                                                                                                                                                            |
| An email didn't arrive                                    | The server log says what happened to each email: sent through Postmark, with its MessageID, or written to which outbox file. The dev server doesn't send without a real token: with none, or Postmark's test token `POSTMARK_API_TEST`, it writes the email to the outbox instead. |
| Letters to a real MP are refused                          | Expected: outside production, only the test MP.                                                                                                                                                                                                                                    |
| `Executable doesn't exist` from Playwright                | `npx playwright install chromium`.                                                                                                                                                                                                                                                 |

## 8. Deploying

Netlify, configured in `netlify.toml`. Pushing to `main` deploys the live
site, and pull requests get previews. Netlify applies the migrations in
`netlify/database/migrations/` on deploy. The database is backed up every
night to Cloudflare by a Worker in `backup/`, deployed on its own
(`backup/README.md`).

Set up outside the code:

- **Settings:** every environment variable is in [.env.example](../.env.example), with what it's for. Netlify needs the same ones.
- **Postmark:** a server, and two sending domains, each with DKIM, Return-Path and DMARC. `letters.pauseai.uk` sends letters to representatives and is the inbound domain, with its MX pointing at `inbound.postmarkapp.com`. `notify.pauseai.uk` sends everything else, such as forwarded replies and staff emails. Its webhooks carry basic auth in the URL, e.g. `https://postmark:<password>@pauseai.uk/api/postmark/bounce`: Bounce and Spam complaint go to `/api/postmark/bounce`, Inbound to `/api/postmark/inbound`.
- **Luma's webhook:** in Luma, the PauseAI UK calendar, Settings → Developer → Webhooks: a webhook for `https://pauseai.uk/api/luma/webhook` with the event types Calendar Person Unsubscribed and Calendar Person Subscribed. Its secret (`whsec_…`) goes into Netlify as `LUMA_WEBHOOK_SECRET`. Luma retries a delivery that isn't answered 2xx three more times, after 1, 2 and 4 minutes, and only sends unsubscribes that happen after the webhook exists. To check it works: unsubscribe a staff address from the calendar's emails and look for its row in `opt_outs`; follow the calendar again, and the next full pass over the contacts sets the row's `resubscribed_at`, as Luma's webhook doesn't say when someone comes back ([domain concepts](domain-concepts.md#opt-outs)).
- **Daily jobs:** the politician sync, then the Emails sync, runs at 06:21 UTC, the check against Parliament at 06:23 and the ControlAI import at 06:25, just after the day's first imports. The database sleeps after five minutes without a query and is billed while it's awake, so every scheduled job starts within a few minutes of the Luma import, sharing one wake an hour, and none runs from midnight to six UTC. The check makes about 650 requests to Parliament, which took 12–18 seconds from a laptop on 14 Oct 2026. A Netlify scheduled function gets 30 seconds, so a daily check that starts timing out has outgrown it.
- **The Luma import** runs at 17 minutes past every hour from 06:17 to 23:17 UTC, with `LUMA_API_KEY`. Each run fetches for about 20 seconds, then stops and records how many events are still waiting, so the first copy of the calendar (about 430 requests on 21 Oct 2026) takes a few runs; after that a run is a handful of requests. It leaves 50 of Luma's 200 requests a minute for the site's own fetches, and stops early if Luma answers 429. Run it by hand from `/staff/import-data` to see where it's got to.
- **The members import** runs at 19 minutes past every hour from 06:19 to 23:19 UTC, with `AIRTABLE_TOKEN`, which needs read access to Stichting PauseAI's "Members & Actions" base (`appWPTGqZmUcs3NWu`) as well as the MPs' base; the global team grant it. A run reads every UK member we may hold, about 15 requests, which counts against the global team's Airtable plan's monthly API calls. Run it by hand from `/staff/import-data`.
- **A new database:** run the politician sync from `/staff/import-data`, and apply it, then the Emails sync and the two one-off imports (the web form letters and Go to Parliament). Until the sync has run, Email your MP finds no MPs.
- **Staff accounts:** every database starts with one account, `admin@pauseai.uk`, with the admin permission. Log in as it and add everyone else on `/staff/accounts`: an account alone opens the ordinary pages; the supporters permission opens the supporter pages, admin the accounts page and the audit log. Give admin to at least one other person; the last admin can't be removed. The hourly Luma import fills the supporter pages over its first few runs, and links every letter already written; run it from `/staff/import-data` to watch it. An erasure request is handled as `docs/data-protection.md` says.
