# Local development

How to set up and run everything on your own machine: the site, the
database, Email your MP, the staff interface, and the tests. The README has
the short version, and `.env.example` lists the environment variables.

## 1. What you need

- **Node 22**, as Netlify uses (`netlify.toml`). Newer versions also work.
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

Set `TEST_MP_EMAIL` in `.env.local` to your email. Then:

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

| Service                  | What the fixture does                                                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Luma                     | A few made-up events and guests. Adding a guest to the march works, except for `luma-fails@…`, which errors, and `luma-skips@…`, which Luma skips. |
| postcodes.io             | Knows only SW1A 1AA (Cities of London and Westminster); every other postcode is "not found". The test postcodes never ask it.                      |
| Airtable                 | Two MPs, Dora Dummy and Polly Placeholder, and two made-up signatories                                                                             |
| Parliament's Members API | The same two MPs, with an office email each. Polly Placeholder's differs from Airtable's, so the MP check has something to show.                   |
| Turnstile                | Accepts every token                                                                                                                                |
| Postmark                 | Accepts every email, without needing a token, and writes each one to a mail file (`.eml`) in `OUTBOX_DIR`, or `tmp/outbox/` in the dev server.     |

#### Send a letter to the test MP

1. Open http://localhost:3000/campaigns.
2. Enter any name, and postcode `ZZ99ZZ`. The page for writing the letter
   opens, to Testy McTestface MP.
3. Fill in an email and an address, then go to the preview, and send it
   from there. Without its keys, Turnstile isn't needed.
4. The letter is sent: it's the newest `.eml` file in `tmp/outbox/`, with its PDFs
   attached. Open it in a mail app or a text editor.

`/staff/letters` shows it, once you've logged in.

To see a campaign's page move on to the next, look up ZZ99ZS instead: that
MP has already signed, so the letter to the PM moves on to the bill. ZZ99ZN
finds an MP with no email, so there's no letter to write. ZZ99ZB, on the
bill's page, finds an MP who signed ControlAI's letter backing it. Outside
production, the form lists the test postcodes under it.

#### Write to a real MP

Outside production, letters can only go to the test MP. That's checked
both when the form is sent and when the letter is, so locally you can look
real MPs up but not send to them. That's on purpose.

To look them up with fixtures, add the two fixture MPs first:

```bash
# With CRON_SECRET=dev in .env.local (restart the dev server after editing it):
curl -X POST -H "Authorization: Bearer dev" localhost:3000/api/cron/sync-mps
```

Then postcode `SW1A 1AA` finds Polly Placeholder.

#### Log in to the staff interface

1. Open http://localhost:3000/staff/login, and type any address at
   pauseai.uk, such as staff@pauseai.uk.
2. The login email is the newest file in `tmp/outbox/`. Open the
   `/staff/api/callback?token=…` link in it, in the same browser.

You're at `/staff`, logged in for 12 hours. This goes through the real
login code: only Postmark is a fixture.

#### See every component

http://localhost:3000/gallery is the component gallery: every component and
its variants, a page per group, on fixture data. It's there only with
`DATA_FIXTURES=1`. See `docs/testing.md`, "The component gallery".

### With real outside services

Delete `DATA_FIXTURES` from `.env.local`, and fill in the keys you need. Each is explained there. Things to know:

- **MPs.** The database starts with only the test MP. With `AIRTABLE_TOKEN`
  set, copy the real MPs from Airtable, then check them against Parliament
  (about 650 lookups, which takes a minute):

  ```bash
  # With CRON_SECRET=dev in .env.local:
  curl -X POST -H "Authorization: Bearer dev" localhost:3000/api/cron/sync-mps
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
- **Airtable.** `AIRTABLE_TOKEN` needs only read access to the "UK
  Parliamentarians" table. It's for the MP sync and the one-off signatory
  import at `/staff/import-data`.

### The march sign-up and Luma

`/march` adds each person who registers to a Luma event as a guest, with
Luma's add-guests call (`addLumaGuest` in
`lib/server/outside-services/luma-guests.ts`), and Luma emails them its
confirmation. It needs `LUMA_API_KEY`, the key the rest of the site uses,
from the calendar that owns the event (Luma Plus).

The event is `MARCH_EVENT_ID` in `app/api/march/register/route.ts`, its API ID
(`evt-…`): on Luma, open the event's manage page, and it's in the address
(`luma.com/event/manage/evt-…`). It's a test event,
[Luma API Testing](https://luma.com/qry332td), on every deploy, until the
sign-up has been checked end to end and it's the march's.

Without the key, registering fails, as it does when Luma errors, takes
longer than 5 seconds or skips the guest (someone who unsubscribed from the
calendar, or was removed or blocked there): the form says it didn't go
through and links to the march's Luma page instead. The server logs a
`[march]` line saying why, without the email address.

To try it against the test event:

1. In `.env.local`, delete `DATA_FIXTURES` and set `LUMA_API_KEY`. Restart
   `npm run dev`.
2. Register at http://localhost:3000/march with an address you can read.
   The form should turn into the share card, you should show up as a guest of the test event,
   get Luma's email, and see no `[march]` line in the server's log.
3. Try a deploy preview the same way; its `LUMA_API_KEY` is Netlify's. Once
   that works, set `MARCH_EVENT_ID` to the march's event.

## 5. Things that run on a schedule, or from outside

None of these run under `npm run dev` by themselves. Call them by hand.

**The daily jobs.** On Netlify, scheduled functions in `netlify/functions/`
call these routes. Locally, with `CRON_SECRET=dev` in `.env.local`:

```bash
curl -X POST -H "Authorization: Bearer dev" localhost:3000/api/cron/sync-mps
curl -X POST -H "Authorization: Bearer dev" localhost:3000/api/cron/check-mps
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
  DATA_FIXTURES=1 FIXTURE_NOW=2026-10-16T12:00:00.000Z ANALYTICS=1 LUMA_API_KEY=fixture AIRTABLE_TOKEN=fixture \
    TURNSTILE_SECRET_KEY=fixture NEXT_PUBLIC_TURNSTILE_SITE_KEY=fixture TEST_MP_EMAIL=test-mp@example.org \
    CRON_SECRET=fixture-cron-secret \
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
| ZZ99ZZ says no MP found                                   | The database has no test MP. Set `TEST_MP_EMAIL` and run `npm run db:reset`, or run the MP sync.                                                                                                                                                                                   |
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
- **Nightly jobs:** the MP sync runs at midnight UTC, the check against Parliament at 01:00 and the ControlAI import at 02:00. The check makes about 650 requests to Parliament, which took 12–18 seconds from a laptop on 14 Oct 2026. A Netlify scheduled function gets 30 seconds, so a nightly check that starts timing out has outgrown it.
- **A new database:** run the MP sync, then the signatory import, both from `/staff/import-data`, and check the signatories. Until the sync has run, Email your MP finds no MPs.
