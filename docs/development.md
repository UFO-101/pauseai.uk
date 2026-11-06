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
git clone https://github.com/PauseAI-UK/pauseai.uk.git
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
  page's dashboard a number in each tile: the fixture services' people,
  events and politicians under their own IDs, so an import writes the same
  rows rather than doubling them, plus made-up supporters, letters in every
  state with their replies and bounces, statuses, every job's runs, and
  staff accounts beside the migration's admin: jo@pauseai.uk (supporters,
  with a kept session), samuel.whitlock@pauseai.uk and policy@pauseai.uk
  (none). The file's own comments say what each part is for. Dates are
  relative to when it runs. Without `TEST_MP_EMAIL`, the test MPs still go
  in, with `test-mp@parliament.example`, since the letters go to the
  fixture outbox anyway. The storyboard's flows start from an empty
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

### Collation

How Postgres sorts and compares text is the database's collation, fixed
when the database is made. Production's (Netlify's `netlifydb`) is the
builtin `C.UTF-8`: by code point, so every capital before every lowercase
letter, and accented letters after z (`apple` sorts after `Zack`, `Émile`
last). The Postgres Docker image's default is `en_US.utf8`, dictionary
order, and a server you install may have another. So every database the
repo makes has production's, whatever its server's default:
`scripts/fresh-database.mjs` creates them with it (`PRODUCTION_LOCALE`),
the dev database from `npm run db:reset` included, and CI's Postgres is
started with it too (`POSTGRES_INITDB_ARGS` in `.github/workflows/ci.yml`).
A database made before this keeps its own until `npm run db:reset`.

So a test that sorts text gets what production gets. Nothing in the queries
names a collation yet, so a list sorted by name is in code-point order live,
not dictionary order.

To see a database's: `select datlocprovider, datcollate, datlocale from
pg_database where datname = current_database();` gives `b`, `C.UTF-8`,
`C.UTF-8` for production's.

### Looking inside

```bash
psql postgresql://postgres:postgres@localhost:5432/pauseai_dev   # your NETLIFY_DB_URL
```

```sql
select name, constituency, email from politicians where is_test;
select l.id, l.status, f.email, l.created_at from letters l join letters_from_supporters s using (id) join form_entries f on f.id = s.entry_id order by l.id desc;
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

| Service                  | What the fixture does                                                                                                                                                                                                                                                                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Luma                     | A few made-up events and guests, and every event's guest counts (1,234 going)                                                                                                                                                                                                                                                                        |
| postcodes.io             | Knows only SW1A 1AA (Cities of London and Westminster); every other postcode is "not found". The test postcodes never ask it.                                                                                                                                                                                                                        |
| Airtable                 | A politician of each body, one retired and one who left, with their statuses; PauseAI's emails to them; the old form's letters; Go to Parliament's meetings                                                                                                                                                                                          |
| Parliament's Members API | The same two MPs, with an office email each. Polly Placeholder's differs from Airtable's, so the MP check has something to show.                                                                                                                                                                                                                     |
| Turnstile                | Accepts every token                                                                                                                                                                                                                                                                                                                                  |
| Postmark                 | Accepts every email, without needing a token, and writes each one to a mail file (`.eml`) in `OUTBOX_DIR`, or `tmp/outbox/` in the dev server.                                                                                                                                                                                                       |
| Google (Gmail)           | Connects any account with no consent screen, naming it from its address (policy@ is "Policy"); sends nothing, writing each email to the outbox as Postmark's fake does; reads an empty mailbox, but for the letters inbox (`LETTERS_INBOX`), which keeps what it sends, and mail written to `LETTERS_INBOX_DIR` (`tests/fixtures/letters-inbox.ts`). |

#### Send a letter to the test MP

1. Open http://localhost:3000/campaigns.
2. Enter any name, and postcode `ZZ99ZZ`. The page for writing the letter
   opens, to Testy McTestface MP.
3. Fill in an email and an address, then go to the preview, and send it
   from there. Without its keys, Turnstile isn't needed.
4. The letter is sent: it's the newest `.eml` file in `tmp/outbox/`, with its PDFs
   attached. Open it in a mail app or a text editor.

`/staff/campaigns` shows it, on its campaign's page, once you've logged in with the `supporters`
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
`db:reset` gives the supporters permission as well as admin; and the fake
data's jo@pauseai.uk, samuel.whitlock@pauseai.uk and policy@pauseai.uk)
and one for nobody@pauseai.uk, which has no account, each signing you in
at once, with no email.
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
  PauseAI's emails to them, then check the MPs against Parliament
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
  emails" and Go to Parliament tables, and to the members' base.
  They're for the politician and Emails syncs, the members import and the
  two one-off imports at `/staff/import-data`.

### The march sign-up and Luma

The march sign-up adds each person who registers to a Luma event as a
guest, and shows how many Luma has approved beside the hero's button and in
the form's corner. It needs `LUMA_API_KEY`, from the calendar that owns the
event (Luma Plus). The event
is `MARCH_EVENT_ID` in `lib/server/march-event.ts`, its API ID (`evt-…`): on
Luma, open the event's manage page, and it's in the address
(`luma.com/event/manage/evt-…`). Other deploys register people for the test
event beside it, but every deploy counts the march's own. When registering
fails, the server logs a `[march]` line saying why. The
count is Luma's, cached for a minute: the page is rendered with it, and an
open page asks `/api/march/signups` again each minute. When Luma can't say,
the page shows no count.

To try it end to end, register with a real address. Luma drops addresses
at throwaway mail services without saying so: it answers that none were
skipped, but never adds them (mail.tm and Guerrilla Mail, tried in
October 2026).

## 5. Things that run on a schedule, or from outside

None of these run under `npm run dev` by themselves. Call them by hand.

**The scheduled jobs.** On Netlify, scheduled functions in `netlify/functions/`
call these routes. Locally, with `CRON_SECRET=dev` in `.env.local`:

```bash
curl -X POST -H "Authorization: Bearer dev" localhost:3000/api/cron/sync-politicians   # the politician sync, then the Emails sync
curl -X POST -H "Authorization: Bearer dev" localhost:3000/api/cron/check-mps           # the MPs against Parliament
curl -X POST -H "Authorization: Bearer dev" localhost:3000/api/cron/import-controlai    # ControlAI's letter's signatories
curl -X POST -H "Authorization: Bearer dev" localhost:3000/api/cron/import-luma         # the Luma import; with fixtures, the fixture calendar
curl -X POST -H "Authorization: Bearer dev" localhost:3000/api/cron/import-members      # the members import; with fixtures, the fixture members
curl -X POST -H "Authorization: Bearer dev" localhost:3000/api/cron/import-old-letters  # one run of the import of old letters
curl -X POST -H "Authorization: Bearer dev" localhost:3000/api/cron/tidy-logs           # deletes what the import and audit logs no longer keep, and empty drafts
curl -X POST -H "Authorization: Bearer dev" localhost:3000/api/cron/send-mailings       # sends what the letters inbox has queued, then starts the mailings due and sends for a few seconds
curl -X POST -H "Authorization: Bearer dev" localhost:3000/api/cron/read-gmail          # reads the connected Gmail accounts for replies and bounces, and relays the letters inbox's
```

What each does, and when it runs on Netlify, is in "Deploying" below.

**Postmark's webhooks.** Set `POSTMARK_WEBHOOK_USER=postmark` and
`POSTMARK_WEBHOOK_PASSWORD=secret`, then post payloads in Postmark's
format:

```bash
# A hard bounce. Use a message_id from the email_sends table, and its address.
curl -u postmark:secret -H 'Content-Type: application/json' localhost:3000/api/postmark/bounce \
  -d '{"RecordType":"Bounce","MessageID":"<id>","Email":"<address>","Type":"HardBounce","Description":"Unknown user","Inactive":true,"CanActivate":true}'

# A reply to a letter sent before the letters inbox. Send it to the letter's address: its postmark_mailbox in
# letters_from_supporters, @letters.pauseai.uk.
curl -u postmark:secret -H 'Content-Type: application/json' localhost:3000/api/postmark/inbound \
  -d '{"FromFull":{"Email":"test-mp@parliament.example","Name":"Testy"},"ToFull":[{"Email":"<postmark_mailbox>@letters.pauseai.uk"}],"CcFull":[],"Subject":"Re: hello","TextBody":"Thanks."}'
```

With `POLICY_INBOX` set, the reply is forwarded there too. With fixtures,
both copies land in the outbox.

**The letters inbox.** With fixtures, `npm run db:reset` connects the fake
letters inbox (`LETTERS_INBOX`, with `GMAIL_TOKEN_KEY` set), so letters go
from it and land in the outbox. Mail to it is kept by the dev server's fake
Gmail in memory (`tests/fixtures/letters-inbox.ts`): a file in
`LETTERS_INBOX_DIR`, if set, is delivered to it the next time it's read, so
to answer a letter as its MP, write the reply there as a mail file, to the
supporter's proxy, with an `Authentication-Results: mx.google.com;
dmarc=pass` header, then run `read-gmail` above.

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

The commands, and the rules for new code, are in [testing.md](testing.md).
What they need from your machine:

- **Database tests** need Postgres reachable: `TEST_DATABASE_URL`, or your
  `PG*` variables, or the local socket (section 3). Each test file copies
  its own database from a migrated template, made once for the run, and
  drops it afterwards.
- **The storyboard** builds and starts the site itself on port 3100, unless
  a server is already running there. Your dev server, on 3000, is left
  alone. To skip rebuilding each run, start one yourself, as
  `playwright.config.ts` does for its `webServer`, and leave it running:

  ```bash
  node scripts/serve-fixture.mjs --port 3100
  # ...and in another terminal:
  npm run test:storyboard
  ```

  The storyboard's flows each get their own database, copied from a
  template on the test server (`TEST_DATABASE_URL`, or your local Postgres),
  so the build's own database is only for requests that carry no flow's
  cookie.

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
- **Gmail:** the PauseAI UK Google Cloud project, under the organisation of PauseAI's Google Workspace. That Workspace's primary domain is pauseai.info and pauseai.uk is in it too, and a Workspace has only one organisation (https://cloud.google.com/resource-manager/docs/creating-managing-organization). The project has the Gmail API turned on; the Internal user type, under Google Auth Platform → Audience, so any account in the Workspace can grant access and Google doesn't review the app (https://support.google.com/cloud/answer/15549945); the app asks for the `gmail.send`, `gmail.readonly` and `userinfo.profile` scopes when an account connects (the last for the account's name, when its address sends as none of its own); and a web application OAuth client whose redirect URI is `https://pauseai.uk/staff/api/gmail/callback`. Its ID and secret go into Netlify as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, and `GMAIL_TOKEN_KEY` is 32 random bytes in base64. Previews have other addresses, so Gmail can be connected only on the live site. The replies read from Gmail are kept in Netlify Blobs, in the `letter-replies` store, which needs no setting; the backup Worker copies them with `BACKUP_SECRET`, which goes into Netlify and, as `SITE_BACKUP_SECRET`, the Worker (`backup/README.md`).
- **The letters inbox:** a Gmail account of PauseAI UK's Workspace at pauseai.uk, used for nothing else, which supporters' letters to MPs go from (`docs/domain-concepts.md`, "Letters through the letters inbox"). Its address goes into Netlify as `LETTERS_INBOX`, and nowhere in the repo, which is public. It needs a staff account (`/staff/accounts`); someone logged in as it connects its Gmail on `/staff/me`, where it also asks for `gmail.modify`, to label and trash its mail. Until it's connected, letters are kept and wait in the queue.
- **The notification inbox:** `NOTIFICATION_INBOX`, `notification@pauseai.uk` on the live site, where the site emails when something needs a person (`docs/domain-concepts.md`, "Email"). Unset, nothing is sent.
- **Staff accounts:** every database starts with one account, `admin@pauseai.uk`, with the admin permission. Log in as it and add everyone else on `/staff/accounts`: an account alone opens the ordinary pages; the supporters permission opens the supporter pages, admin the accounts page and the audit log. Give admin to at least one other person; the last admin can't be removed. An erasure request is handled as `docs/data-protection.md` says.
- **A new database:** run the politician sync from `/staff/import-data`, and apply it, then the Emails sync and the two one-off imports (the web form letters and Go to Parliament). Until the sync has run, Email your MP finds no MPs. The Luma import fills the supporter pages over its first few runs, and links every letter already written; run it from `/staff/import-data` to watch it.

### The scheduled jobs

Each is a Netlify scheduled function in `netlify/functions/` that calls its route under `/api/cron/` (`docs/code-structure.md`, "Scheduled jobs"), and each has a page under `/staff/import-data` with its runs and a button (`docs/domain-concepts.md`, "Imports"). Times are UTC.

| Job                                          | When                                  | Needs                                                                                                                                                                                                                                                                                              |
| -------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sync-politicians`, then the Emails sync     | 06:21 daily                           | `AIRTABLE_TOKEN`                                                                                                                                                                                                                                                                                   |
| `check-mps`, the MPs against Parliament      | 06:23 daily                           | Nothing. About 650 requests to Parliament's Members API, which take some seconds; a scheduled function gets 30, so a check that starts timing out has outgrown it.                                                                                                                                 |
| `import-controlai`, the letter's signatories | 06:25 daily                           | Nothing                                                                                                                                                                                                                                                                                            |
| `tidy-logs`                                  | 06:27 daily                           | Nothing                                                                                                                                                                                                                                                                                            |
| `import-luma`                                | every 5 minutes, from 2 past the hour | `LUMA_API_KEY`. Its background function does the work. The first copy of the calendar takes a few runs; after that each run reads what's changed ("Supporters" in `docs/domain-concepts.md`).                                                                                                      |
| `import-old-letters`                         | every 5 minutes, from 3 past the hour | The policy team's Gmail connected. Its background function does the work, and once a pass has finished the schedule does nothing more.                                                                                                                                                             |
| `read-gmail`                                 | every 5 minutes                       | The connected Gmail accounts                                                                                                                                                                                                                                                                       |
| `send-mailings`                              | 18 past every hour                    | The connected Gmail accounts. Its background function sends what one call can't (`send-mailings-background`), which credit-based plans have (https://docs.netlify.com/build/functions/background-functions/). It starts no mailing between midnight and 06:18, so one due overnight goes at 06:18. |
| `import-members`                             | 19 past every hour                    | `AIRTABLE_TOKEN`, with read access to Stichting PauseAI's "Members & Actions" base (`appWPTGqZmUcs3NWu`), which the global team grant. A run reads every UK member we may hold, which counts against the global team's Airtable plan's monthly API calls.                                          |

The database sleeps after five minutes without a query and is billed while it's awake, about 10 credits an hour at its smallest; the 5-minute jobs keep it awake all day.
