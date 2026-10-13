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

The environment variables are listed in the [README](../README.md#environment-variables). Two need setting up first:

- **Google login**: an "Internal" OAuth client in the pauseai.uk Workspace's Google Cloud project, with `https://pauseai.uk/staff/api/callback` as a redirect URI. Previews can't log in, since Google won't accept wildcard redirect URIs.
- **`CRON_SECRET`**: any long random string.

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
   and the campaign's PDFs attached. The token then stops working.
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

### Records

Every letter is kept in the `letters` table: sender, email, address,
contact consent, campaign, MP, the letter as sent, and each change of
status in `letter_events`. Sent letters are kept indefinitely for now. Staff
see them, with contact consent, at `/staff/letters`.

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
