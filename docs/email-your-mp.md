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
- `lib/server/mp-letters.ts`: checks a letter from the form, saves it
  unconfirmed, emails the sender a link, and sends the letter when they
  click it. Also deletes letters never confirmed.
- `lib/server/postmark.ts`: the only file that talks to Postmark.
- `lib/server/postmark-webhooks.ts`: bounces, spam complaints and replies.
- `lib/server/civicrm.ts`: logs each sent letter in CiviCRM.
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
| `AIRTABLE_TOKEN` | The one-off import of signatories (already set). |
| `POSTMARK_SERVER_TOKEN` | Sends letters, confirmation emails and forwarded replies. |
| `POSTMARK_WEBHOOK_USER`, `POSTMARK_WEBHOOK_PASSWORD` | The basic auth credentials in the webhook URLs set in Postmark. Without them, every webhook request is refused. |
| `MP_MAIL_DOMAIN` | The domain letters come from and replies go to. Defaults to `mp.pauseai.uk`. |
| `CONFIRMATION_FROM` | The confirmation email's From. Defaults to `PauseAI UK <confirm@mp.pauseai.uk>`. |
| `REPLIES_INBOX` | The shared PauseAI inbox that gets a copy of every reply. |
| `CIVICRM_URL`, `CIVICRM_API_KEY`, `CIVICRM_ACTIVITY_TYPE` | Logging each sent letter in CiviCRM. All three, or nothing is logged. |
| `DEPLOY_CONTEXT` | Set at build time from Netlify's `CONTEXT` (`next.config.ts`); don't set it by hand. Only `production` may write to real MPs. |
| `TURNSTILE_SECRET_KEY` | Checks the anti-spam token. Without it the form refuses every letter, except in `next dev`. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Draws the anti-spam widget. Read at build time. |

## Sending

1. The form posts to `/api/email-your-mp/letters`. The letter is saved
   unconfirmed, and the sender is emailed a link,
   `/email-your-mp-v2/confirm#<token>`. At most 5 such emails a day go to
   one address. The form pushes `mp_email_sent` to `dataLayer` when the
   server accepts it.
2. The confirm page's script posts the token to `/api/email-your-mp/confirm`
   (a link scanner that only fetches the page sends nothing). The letter is
   sent through Postmark from `"Jane Smith via PauseAI"
   <reply+<hash>@mp.pauseai.uk>`, with Reply-To the sender and that address,
   and the campaign's PDFs attached. The token then stops working. It's
   logged in CiviCRM.
3. Outside production, letters go only to the test MP, checked both when the
   form is sent and when the letter is.
4. Unconfirmed letters are deleted after 7 days, by
   `netlify/functions/delete-unconfirmed-letters/`.

Postmark's webhooks, each with the basic auth credentials in the URL, e.g.
`https://postmark:<password>@pauseai.uk/api/postmark/bounce`:

- **Bounce** and **Spam complaint**: `/api/postmark/bounce`. The letter's
  status changes, shown in `/staff/letters`.
- **Inbound** (the `mp.pauseai.uk` inbound domain): `/api/postmark/inbound`.
  The reply is forwarded to `REPLIES_INBOX`, and to the sender unless their
  address was already in its To or Cc. Nothing about it is stored.

### Assumed about CiviCRM

Its URL, API version and activity types aren't known yet, so this assumes
the standard APIv4 REST interface: `POST <CIVICRM_URL>/civicrm/ajax/api4/
<Entity>/<action>` with `params=<JSON>`, and an API key sent as
`X-Civi-Auth: Bearer <key>`. Each sent letter finds the sender's contact by
email (or makes one), and adds a Completed activity of type
`CIVICRM_ACTIVITY_TYPE`. Contact consent is noted in the activity's
details, not as a CiviCRM opt-in. A failure here is logged and never stops
a letter.

## Staff interface

`/staff`, for pauseai.uk Google accounts. Edit each politician's status for
each campaign (including the test MP's), add signers from outside the
Commons, check held MP syncs, import the signatories from Airtable once, and
see who changed what.

## Things to set up outside the code

- After the first deploy with the database: run the MP sync from
  `/staff/mp-sync`, then the import from `/staff/import`, then check the
  signatories list.

- Postmark: a server, the `mp.pauseai.uk` sending domain (DKIM, Return-Path,
  DMARC) and inbound domain (MX to `inbound.postmarkapp.com`), and the
  webhooks above.
- After stage 4 is live, turn off the Airtable 8am automation.
