# Database backup

Every night at 03:00 UTC, a Cloudflare Worker backs up the live database to
an R2 bucket on Cloudflare, and checks that the backup is good. It's a copy
outside Netlify, which keeps its own backups too (Data & Storage > Database

> Backups, for 3 to 30 days depending on the plan:
> https://docs.netlify.com/build/data-and-storage/netlify-database/backup-and-recovery/).

It's a package of its own, apart from the site: it runs on Cloudflare, not
Netlify, and has its own dependencies and tests.

## How it works

The cron trigger in `wrangler.jsonc` starts the Worker (`worker/index.ts`),
which starts a container (`Dockerfile`, `container/`) with Postgres 18's
tools and asks it for a backup. The container:

1. dumps the database with `pg_dump`, in its custom format. It leaves out
   the `netlify` schema, Netlify's record of applied migrations, which the
   read-only user can't read. The site's data is all in `public`.
2. reads the dump's table of contents with `pg_restore --list`, which fails
   on a corrupt or truncated file
3. restores the dump into a scratch Postgres of its own, and counts the rows
   in every table, and the newest row in some

So every backup is proved to restore, and the counts describe what's in
the backup, not the live database.

The Worker stores the dump in R2, where R2 checks its SHA-256, and then a
manifest beside it: the dump's size and hash, and the counts. Then it
checks the manifest against the rules in `worker/checks.ts`, and against
the backup before:

- the dump hasn't shrunk by more than 20%
- tables that only grow (letters, letter events, the audit log, import
  runs) have no fewer rows than last time
- `import_runs` has a row from the last 36 hours. The nightly MP sync records
  a run every night, even when nothing changed, so this shows the backup
  has last night's data.
- `politicians` has at least 600 rows

Any problem, or a backup that fails outright, is emailed through Postmark.
If a Healthchecks.io ping URL is set, every run pings it, so it emails when
a night's backup never runs at all.

The bucket holds:

| Key                     | What                                                         |
| ----------------------- | ------------------------------------------------------------ |
| `dumps/<time>.dump`     | the dump, kept for 90 days (an R2 lifecycle rule)            |
| `manifests/<time>.json` | its manifest, kept for good: a history of the counts         |
| `latest.json`           | the newest manifest, which the next run compares itself with |

## Set it up

It needs a Cloudflare account on the Workers Paid plan, which containers
need (https://developers.cloudflare.com/containers/pricing/), Docker running
(deploying builds the container's image), and:

- the live database's **read-only connection string**: in Netlify, the
  project's Data & Storage > Database
  (https://docs.netlify.com/build/data-and-storage/netlify-database/access-control/)
- a **Postmark server token** that can send from `ALERT_FROM` in
  `wrangler.jsonc`, and the address to send problems to
- optionally, a **Healthchecks.io** check (https://healthchecks.io/docs/):
  a period of 1 day, and a few hours' grace

Then:

```bash
cd backup
npm ci
./setup.sh
```

`setup.sh` logs in to Cloudflare, creates the bucket and its lifecycle rule,
asks for the secrets and deploys. It prints a `curl` command that runs a
backup at once and shows the report: try it, a few minutes after the first
deploy, while the container gets ready. Run `setup.sh` again to change a
secret, and `npm run deploy` to deploy changes to the code.

The Worker's logs are in Cloudflare's dashboard: Workers & Pages >
pauseai-uk-backup > Logs.

## Restore a backup

List the dumps, download one, and restore it into an empty database with
`pg_restore`:

```bash
cd backup
npx wrangler r2 object get pauseai-uk-backups/latest.json --remote --pipe   # the newest dump's key, and its counts
npx wrangler r2 object get pauseai-uk-backups/dumps/2026-10-19T03-00-00Z.dump --remote --file backup.dump
createdb restored
pg_restore --no-owner --no-privileges --dbname=restored backup.dump
```

## Tests

```bash
cd backup
npm test            # with the 100% coverage gate, as the site's
npm run typecheck
```

The container's tests dump and restore real databases, on the Postgres the
`PG*` variables or the local socket point to, as the site's tests do.
CI runs both (`.github/workflows/ci.yml`).
