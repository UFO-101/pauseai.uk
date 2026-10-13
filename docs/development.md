# Local development

How to set up and run everything on your own machine: the site, the
database, Email your MP, the staff interface, and the tests. The README has
the short version, and `.env.example` lists the environment variables.

## 1. What you need

- **Node 22**, as Netlify uses (`netlify.toml`). Newer versions also work.
- **Postgres 18**, with `psql` on your path, to match production: Netlify
  Database runs PostgreSQL 18.6, and CI uses 18 too. (The scripts need at
  least 13, but use 18 so nothing works locally that fails live.)
- **Chromium for Playwright**, for the browser tests:
  `npx playwright install chromium`.

You don't need the Netlify CLI. The site runs with plain `npm run dev`.

## 2. Install

```bash
git clone https://github.com/UFO-101/pauseai.uk.git
cd pauseai.uk
npm install
```

## 3. Postgres

Email your MP, the staff interface and the signatories list on `/campaigns`
read and write a Postgres database. So do some unit tests. Every other page
works without one.

### Install and start it

**macOS:** install [Postgres.app](https://postgresapp.com). Move it to
Applications, open it, and click **Initialize**. Then put its tools on your
path, with the command from its site, and open a new terminal:

```bash
sudo mkdir -p /etc/paths.d && echo /Applications/Postgres.app/Contents/Versions/latest/bin | sudo tee /etc/paths.d/postgresapp
```

It makes a superuser named after your login. (Homebrew's
`postgresql@18` works too, but you have to add it to your path yourself.)

**Debian or Ubuntu:**

```bash
sudo apt install postgresql
sudo -u postgres createuser --superuser "$(whoami)"
```

The socket is in `/var/run/postgresql`, which the scripts use by default.

**Docker:**

```bash
docker run -d --name pauseai-postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:18
```

You still need `psql` on your machine (`brew install libpq`, or
`apt install postgresql-client`).

### Tell the scripts where it is

Usually you don't need to. The scripts and tests find a local server's
socket by themselves: in `/var/run/postgresql` (Linux) or `/tmp` (Mac).
Otherwise they use the usual `PG*` variables. For Docker, set:

```bash
export PGHOST=localhost PGUSER=postgres PGPASSWORD=postgres
```

Check it works:

```bash
psql -d postgres -c 'select version()'
```

The user needs to be able to create databases: every test file makes its
own.

### Make a database for the dev server

Your local settings live in `.env.local`, which git ignores. Start from the
example, and set the database URL:

```bash
cp .env.example .env.local
```

In `.env.local`, `NETLIFY_DB_URL` names the database to use:

| Postgres from | `NETLIFY_DB_URL` |
| --- | --- |
| Postgres.app (Mac) | `postgresql://localhost/pauseai_dev` (the example's) |
| apt (Linux) | `postgresql:///pauseai_dev?host=/var/run/postgresql` |
| Docker | `postgresql://postgres:postgres@localhost/pauseai_dev` |

Set `TEST_MP_EMAIL` to your email too. Then make the database:

```bash
npm run db:reset
```

This:

- drops the database `NETLIFY_DB_URL` names, if it exists, and creates it
  empty;
- applies every migration in `netlify/database/migrations/`, in order, as
  Netlify does;
- adds the test MP, Testy McTestface MP, found by postcode ZZ99ZZ, whose
  letters go to `TEST_MP_EMAIL`.

Run it again whenever you want a clean database, or after pulling a new
migration. It wipes everything. It refuses a URL that isn't on your own
machine, so it can't touch the live database.

### Looking inside

```bash
psql postgresql://localhost/pauseai_dev   # your NETLIFY_DB_URL
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

| Service | What the fixture does |
| --- | --- |
| Luma | A few made-up events and guests |
| postcodes.io | Knows only SW1A 1AA (Cities of London and Westminster); every other postcode is "not found". ZZ99ZZ never asks it. |
| Parliament's Members API | Two MPs: Diane Abbott and Rachel Blake |
| Turnstile | Accepts every token |
| Postmark | Accepts every email, without needing a token. With `OUTBOX_DIR`, writes each one to a JSON file there. |
| Google login | Accepts the codes `fixture-staff` (staff@pauseai.uk) and `fixture-outsider` (a Gmail account) |
| Airtable | Two made-up signatories |

#### Send a letter to the test MP

1. Open http://localhost:3000/email-your-mp-v2.
2. Enter any name, and postcode `ZZ99ZZ`. Testy McTestface MP appears, with
   the letter.
3. Fill in an email and an address, then Send, then Confirm. Under
   `npm run dev`, Turnstile isn't needed.
4. The confirmation email is the newest file in `tmp/outbox/`. Copy the
   `/email-your-mp-v2/confirm#…` link out of its `TextBody` and open it.
5. The letter is sent: the newest outbox file is now the letter itself,
   with its PDFs base64-encoded.

`/staff/letters` shows it, once you've logged in.

#### Write to a real MP

Outside production, letters can only go to the test MP. That's checked
both when the form is sent and when the letter is, so locally you can look
real MPs up but not send to them. That's on purpose.

To look them up with fixtures, add the two fixture MPs first:

```bash
# With CRON_SECRET=dev in .env.local (restart the dev server after editing it):
curl -X POST -H "Authorization: Bearer dev" localhost:3000/api/cron/sync-mps
```

Then postcode `SW1A 1AA` finds Rachel Blake.

#### Log in to the staff interface

The fixture Google can log you in as staff@pauseai.uk. Set these in
`.env.local`, and restart the dev server:

```bash
GOOGLE_CLIENT_ID=fixture-client-id
GOOGLE_CLIENT_SECRET=fixture
```

Then:

1. Open http://localhost:3000/staff/api/login. You'll land on a Google
   error page, because the client isn't real, but the login has started.
2. Copy the `state=` value from that Google URL.
3. Open `http://localhost:3000/staff/api/callback?code=fixture-staff&state=<the state>`.

You're at `/staff`, logged in for 12 hours. This goes through the real
login code: only the answers from Google are fixtures.

### With real outside services

Delete `DATA_FIXTURES` from `.env.local`, and fill in the keys you need. Each is explained there. Things to know:

- **MPs.** The database starts with only the test MP. Copy the real MPs from
  Parliament (about 650, which takes a minute):

  ```bash
  # With CRON_SECRET=dev in .env.local:
  curl -X POST -H "Authorization: Bearer dev" localhost:3000/api/cron/sync-mps
  ```

  Then any real postcode finds its MP.
- **Turnstile.** Under `npm run dev` you can leave both keys out, and the
  check is skipped. To see the widget, use Cloudflare's test keys, which
  always pass: site key `1x00000000000000000000AA`, secret
  `1x0000000000000000000000000000000AA`. A production build refuses the
  test secret.
- **Postmark.** Use the test token `POSTMARK_API_TEST`, which accepts emails
  without sending them. A real server token sends real emails, so only use
  one with the test MP and an inbox you own.
- **Staff login.** Make your own OAuth client in a Google Cloud project
  (type "Web application"), with `http://localhost:3000/staff/api/callback`
  as an authorised redirect URI. Only pauseai.uk accounts can log in.
- **Airtable.** `AIRTABLE_TOKEN` is only for the one-off signatory import at
  `/staff/import`.

## 5. Things that run on a schedule, or from outside

None of these run under `npm run dev` by themselves. Call them by hand.

**The daily jobs.** On Netlify, scheduled functions in `netlify/functions/`
call these routes. Locally, with `CRON_SECRET=dev` in `.env.local`:

```bash
curl -X POST -H "Authorization: Bearer dev" localhost:3000/api/cron/sync-mps
curl -X POST -H "Authorization: Bearer dev" localhost:3000/api/cron/delete-unconfirmed-letters
```

**Postmark's webhooks.** Set `POSTMARK_WEBHOOK_USER=postmark` and
`POSTMARK_WEBHOOK_PASSWORD=secret`, then post payloads in Postmark's
format:

```bash
# A bounce. Use a postmark_message_id from the letters table.
curl -u postmark:secret -H 'Content-Type: application/json' localhost:3000/api/postmark/bounce \
  -d '{"RecordType":"Bounce","MessageID":"<id>","Type":"HardBounce","Description":"Unknown user"}'

# A reply. Use a reply_hash from the letters table.
curl -u postmark:secret -H 'Content-Type: application/json' localhost:3000/api/postmark/inbound \
  -d '{"MailboxHash":"<hash>","FromFull":{"Email":"test-mp@example.org","Name":"Testy"},"ToFull":[],"CcFull":[],"Subject":"Re: hello","TextBody":"Thanks."}'
```

With `REPLIES_INBOX` set, the reply is forwarded there too. With fixtures,
both copies land in the outbox.

## 6. Tests

```bash
npm test                 # Vitest, Node: logic, routes, database code
npm run test:browser     # Vitest, real Chromium: components
npm run test:coverage    # both, held at 100% per file, as CI runs it
npm run test:behaviour   # Playwright: every page and the main flows
npm run test:public-vs-live   # Playwright: public pages, the local build against pauseai.uk
npm run test:fixtures-vs-main # Playwright: screenshots of this branch against main (testing.md)
npm run lint
npm run check:airtable-filter   # outside services and the database in their one file
npm run check:staff-auth        # every staff page, route and action calls requireStaff()
```

- **Database tests** need Postgres reachable with your `PG*` variables.
  Each test file makes its own database and drops it afterwards.
- **While the copy is placeholder**, `placeholder-copy.test.ts` fails, and
  so does `npm run build`, which runs the unit tests first. That's on
  purpose: placeholders can't be deployed (AGENTS.md).
- **The Playwright suites** build and start the site themselves, unless a
  server is already running on port 3000. While the build is blocked by
  placeholders, start one yourself, with the same settings
  `playwright.config.ts` uses for its `webServer`:

  ```bash
  export NETLIFY_DB_URL=$(node scripts/fresh-database.mjs pauseai_behaviour)
  DATA_FIXTURES=1 LUMA_API_KEY=fixture AIRTABLE_TOKEN=fixture TURNSTILE_SECRET_KEY=fixture \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=fixture TEST_MP_EMAIL=test-mp@example.org \
    GOOGLE_CLIENT_ID=fixture-client-id GOOGLE_CLIENT_SECRET=fixture CRON_SECRET=fixture-cron-secret \
    POSTMARK_SERVER_TOKEN=fixture POSTMARK_WEBHOOK_USER=postmark POSTMARK_WEBHOOK_PASSWORD=fixture-webhook-password \
    REPLIES_INBOX=replies@example.org OUTBOX_DIR=/tmp/pauseai-behaviour-outbox \
    npx next build
  # ...then the same variables with `npx next start`, and in another terminal:
  npm run test:behaviour
  ```

  For the visual suite, build without `DATA_FIXTURES` against a database
  made with `node scripts/fresh-database.mjs pauseai_visual --test-mp test-mp@example.org`.
  Stop any running server when switching between the two.

See [testing.md](testing.md) for the rules.

## 7. When something goes wrong

| Problem | Fix |
| --- | --- |
| `NETLIFY_DB_URL is not set` | Copy `.env.example` to `.env.local` (section 3). |
| `psql: command not found` | Install the Postgres client, and make sure it's on your path. |
| `connection to server on socket ... failed` | Postgres isn't running, or `PGHOST` points to the wrong place (section 3). |
| `role "..." does not exist` | Create a superuser for yourself (`createuser --superuser`), or set `PGUSER`. |
| `permission denied to create database` | Your Postgres user needs `CREATEDB`: `alter user <you> createdb;`. |
| `relation "letters" does not exist` | The database is older than a migration. Make a fresh one (section 3). |
| ZZ99ZZ says no MP found | The database has no test MP. Set `TEST_MP_EMAIL` and run `npm run db:reset`, or run the MP sync. |
| The test MP shows "no email listed" | The test MP was added without an email. Set `TEST_MP_EMAIL` and run `npm run db:reset`. |
| Sending says it failed | Without `DATA_FIXTURES`, check `POSTMARK_SERVER_TOKEN`. |
| Letters to a real MP are refused | Expected: outside production, only the test MP. |
| `Executable doesn't exist` from Playwright | `npx playwright install chromium`. |
