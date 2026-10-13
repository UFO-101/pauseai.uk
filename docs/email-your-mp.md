# Email your MP

Version 2 of the tool, built at `/email-your-mp-v2` (plan:
`plans/email-your-mp-v2.md`). This page says where its code is and which
settings it needs.

## Code

- `lib/content/email-your-mp.ts`: the campaigns (letter, subject, "already
  done" wording, attachments) and every word the tool shows. All
  placeholders for now.
- `lib/email-your-mp.ts`: choosing a campaign and drafting the letter, shared
  by the form and the server.
- `lib/server/find-mp.ts`: postcode to MP, from the database. ZZ99ZZ finds
  the test MP.
- `lib/parliament.ts`: reads the sitting MPs from Parliament's Members API,
  and compares two lists of them.
- `lib/server/mp-sync.ts`: the nightly copy of MPs into the database.
- `lib/server/politicians.ts`: politicians and their campaign statuses.
- `lib/server/staff-auth.ts`, `lib/server/google-login.ts`, `proxy.ts`: staff
  login.
- `app/(staff)/staff/`: the staff interface.
- `netlify/database/migrations/`: the database's tables.
- `lib/server/mp-letters.ts`: checks a letter from the form and sends it on.
- `app/(site)/email-your-mp-v2/`: the pages and the form.
- `app/api/email-your-mp/`: the form's lookup and send requests.

## MPs

Copied nightly from Parliament's Members API into the `politicians` table,
by the scheduled function `netlify/functions/sync-mps/`, which calls
`/api/cron/sync-mps`. Staff can also run it from `/staff/mp-sync`. If more
than 20 MPs would change at once, the sync is held there for a person to
apply or discard. MPs who leave stay in the table, marked as no longer
sitting, with their statuses. The sync also adds the test MP, with
`TEST_MP_EMAIL` as their email.

After the first deploy with the database, run the sync once from
`/staff/mp-sync`: until then the tool finds no MPs.

Emails are the parliamentary office's where there is one, trimmed. Where
Parliament gives no salutation, one is built from the name: "Sir Iain" or
"Dame Margaret", else Mr or Ms and the surname, else the full name. Where
Parliament's salutation is the full name ("Stephen Kinnock"), it is kept.

## Settings

Environment variables, set in Netlify.

| Variable | What it's for |
| --- | --- |
| `TEST_MP_EMAIL` | Where the test MP's letters go. Copied to the test MP at each sync. Without it, the test MP shows "no email listed". |
| `NETLIFY_DB_URL` | The database. Set by Netlify when Netlify Database is on. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Staff login: an "Internal" OAuth client in the pauseai.uk Workspace's Google Cloud project, with `https://pauseai.uk/staff/api/callback` (and `http://localhost:3000/staff/api/callback` for local development, in a separate client) as redirect URIs. |
| `CRON_SECRET` | A long random string. The scheduled functions send it to `/api/cron/*`. |
| `AIRTABLE_TOKEN` | The one-off import of signatories, and finding an MP's Airtable record for stage 1's letters (already set). |
| `AIRTABLE_WRITE_API_KEY` | Writes letters to the Emails table, for the 8am automation to send. |
| `TURNSTILE_SECRET_KEY` | Checks the anti-spam token. Without it the form refuses every letter, except in `next dev`. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Draws the anti-spam widget. Read at build time. |

## Staff interface

`/staff`, for pauseai.uk Google accounts. Edit each politician's status for
each campaign (including the test MP's), add signers from outside the
Commons, check held MP syncs, import the signatories from Airtable once, and
see who changed what.

## Things to set up outside the code

- After the first deploy with the database: run the MP sync from
  `/staff/mp-sync`, then the import from `/staff/import`, then check the
  signatories list.

- Airtable's parliamentarians table needs a record for the test MP, with
  `TEST_MP_EMAIL` as its Email, or letters to the test MP fail.
- The 8am automation should attach each campaign's PDFs according to the
  Campaign field. Letters for the bill campaign use the option "Alex Sobel
  bill", which Airtable creates the first time one is saved.
