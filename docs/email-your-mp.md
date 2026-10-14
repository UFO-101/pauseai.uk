# Email your MP

Version 2 of the tool, built at `/campaigns-v2` (plan:
`plans/email-your-mp-v2.md`). This page says where its code is and which
settings it needs.

## Pages

- `/campaigns-v2/<slug>`: one campaign's page, laid out like today's
  `/campaigns`, with the form where its iframe is. Each is its own
  `page.tsx`, with its own words, built from the sections in
  `app/(site)/campaigns-v2/_components/` (`CampaignHero`, `CampaignContext`,
  `CampaignDocs`, `EmailYourMpSection`, `CampaignQr`). If the MP has already done
  that campaign, the page moves on to the first one they haven't, with the
  lookup already done and a note saying why (the campaign's `movedOn`). If
  they've done them all, it stays and the letter thanks them.
- `/campaigns-v2`: redirects to the first campaign.

At the swap (stage 5 of the plan) these replace `/campaigns`:
`CAMPAIGNS_PATH` in `lib/email-your-mp.ts` says where they are.

## Code

- `lib/content/email-your-mp.ts`: the campaigns in priority order, with what
  the form and the server need (letter, subject, "already done" wording,
  attachments), and every word the tool shows. Mostly placeholders for now.
  A new campaign also needs its page, `app/(site)/campaigns-v2/<slug>/page.tsx`.
- `lib/email-your-mp.ts`: the pages' paths, which campaign to move on to,
  and drafting the letter, shared by the form and the server.
- `lib/server/find-mp.ts`: postcode to MP, from the database. A test
  MP's postcode finds them (`lib/test-mps.json`: ZZ99ZZ, and ZZ99ZS, who
  has signed the letter to the PM).
- `lib/parliament.ts`: reads the sitting MPs from Parliament's Members API,
  and compares two lists of them.
- `lib/server/mp-sync.ts`: the nightly copy of MPs into the database.
- `lib/server/politicians.ts`: politicians and their campaign statuses.
- `lib/server/staff-auth.ts`, `lib/server/google-login.ts`, `proxy.ts`: staff
  login.
- `app/(staff)/staff/`: the staff interface.
- `netlify/database/migrations/`: the database's tables.
- `lib/server/mp-letters.ts`: checks a letter from the form, and sends it.
- `lib/server/postmark.ts`: the only file that talks to Postmark.
- `lib/server/postmark-webhooks.ts`: bounces, spam complaints and replies.
- `app/(site)/campaigns-v2/`: the pages and the form.
- `app/api/email-your-mp/`: the form's lookup and send requests.

## MPs

Copied nightly from Parliament's Members API into the `politicians` table,
by the scheduled function `netlify/functions/sync-mps/`, which calls
`/api/cron/sync-mps`. Staff can also run it from `/staff/mp-sync`. If more
than 20 MPs would change at once, the sync is held there for a person to
apply or discard. MPs who leave stay in the table, marked as no longer
sitting, with their statuses. The sync also adds the test MPs, with
`TEST_MP_EMAIL` as their email, and their statuses when it first adds them.

After the first deploy with the database, run the sync once from
`/staff/mp-sync`: until then the tool finds no MPs.

Emails are the parliamentary office's where there is one, trimmed. Where
Parliament gives no salutation, one is built from the name: "Sir Iain" or
"Dame Margaret", else Mr or Ms and the surname, else the full name. Where
Parliament's salutation is the full name ("Stephen Kinnock"), it is kept.

## Settings

The environment variables are listed, with what each is for, in [.env.example](../.env.example). Two need setting up first:

- **Google login**: an "Internal" OAuth client in the pauseai.uk Workspace's Google Cloud project, with `https://pauseai.uk/staff/api/callback` as a redirect URI. Previews can't log in, since Google won't accept wildcard redirect URIs.
- **`CRON_SECRET`**: any long random string.

## Sending

1. The form posts to `/api/email-your-mp/letters`. The letter is saved and
   sent straight away through Postmark, from `"Jane Smith via PauseAI"
   <reply+<hash>@mp.pauseai.uk>`, with Reply-To the sender and that address,
   and the campaign's PDFs attached. If Postmark refuses it, nothing is
   kept, so the sender can try again. The form pushes `mp_email_sent` to
   `dataLayer` once it's sent.
2. Each sender email can send one letter per campaign. Letters to the test
   MPs don't count, so they can be tried again and again.
3. Outside production, letters go only to the test MPs.

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
