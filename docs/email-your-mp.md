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
- `lib/server/airtable.ts`: the only file that talks to Airtable. Reads the
  MPs, and the signatories for their import.
- `lib/mps.ts`, `lib/server/mp-sync.ts`: the nightly copy of MPs from
  Airtable into the database.
- `lib/parliament.ts`, `lib/mp-check.ts`, `lib/server/mp-check.ts`: the
  nightly check of those MPs against Parliament's Members API.
- `lib/server/politicians.ts`: politicians and their campaign statuses.
- `lib/server/staff-auth.ts`, `lib/server/staff-login.ts`, `proxy.ts`: staff
  login.
- `app/(staff)/staff/`: the staff interface.
- `netlify/database/migrations/`: the database's tables.
- `lib/server/mp-letters.ts`: checks a letter from the form, and sends it.
- `lib/letter-format.ts`: what a letter may hold (paragraphs, bold, italic,
  bullet lists), checked on the server, which writes the letter's HTML and
  plain text itself. The form's editor is Tiptap
  (`app/(site)/campaigns-v2/_components/LetterEditor.tsx`), limited to the
  same. Campaign letters are written with a little markup: `**bold**`,
  `_italic_`, and lines starting `- ` for bullets.
- `lib/server/postmark.ts`: the only file that talks to Postmark.
- `lib/server/postmark-webhooks.ts`: bounces, spam complaints and replies.
- `app/(site)/campaigns-v2/`: the pages and the form.
- `app/api/email-your-mp/`: the form's lookup and send requests.

## MPs

Airtable's "UK Parliamentarians" table is the source of truth for who the
MPs are and their emails; the policy team keeps it up to date. Its rows
whose Body is "House of Commons", except those ticked "No longer in
office", are copied nightly into the `politicians` table, keyed by
Airtable's record ID, by the scheduled function `netlify/functions/sync-mps/`,
which calls `/api/cron/sync-mps`. Staff can also run it from
`/staff/mp-sync`. If more than 20 MPs would change at once, the sync is held
there for a person to apply or discard. MPs who leave stay in the table,
marked as no longer sitting, with their statuses. The sync also adds the
test MPs, with `TEST_MP_EMAIL` as their email, and their statuses when it
first adds them. Who has signed or supports lives only in our database.

After the first deploy with the database, run the sync once from
`/staff/mp-sync`: until then the tool finds no MPs.

### The check against Parliament

Nightly, `netlify/functions/check-mps/` calls `/api/cron/check-mps`, which
compares the sitting MPs with Parliament's Members API and keeps what it
finds. `/staff/mp-check` shows the newest check, and can run one. It lists
constituencies only one side has, names that differ (not counting titles
such as Dr or Sir), and emails Parliament doesn't list. Where Parliament
lists no email, Airtable's is taken as right. Nothing is changed: fix
problems in Airtable, and the next sync copies the fix.

The check asks Parliament for each MP's contacts, about 650 requests, ten at
a time. Tried from a laptop on 14 Oct 2026, that took 12–18 seconds. A
Netlify scheduled function gets 30 seconds, and it waits for the route, so
if the nightly check starts failing with a timeout, that's why.

## Settings

The environment variables are listed, with what each is for, in [.env.example](../.env.example). `CRON_SECRET` needs setting up first: any long random string.

## Sending

1. The form posts to `/api/email-your-mp/letters`. The letter is saved and
   sent straight away through Postmark, as HTML and as plain text, from `"Jane Smith via PauseAI"
   <reply+<hash>@letters.pauseai.uk>`, with Reply-To the sender and that address,
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
- **Inbound** (the `letters.pauseai.uk` inbound domain): `/api/postmark/inbound`.
  The reply is forwarded, from `noreply@notify.pauseai.uk`, to `REPLIES_INBOX`, and to the sender unless their
  address was already in its To or Cc. The letter gets a "replied" event,
  with who it came from but not its text, and `/staff/letters` shows when
  the first reply from anyone but the sender came.

### Records

Every letter is kept in the `letters` table: sender, email, address,
contact consent, campaign, MP, the letter as sent, and each change of
status in `letter_events`. Sent letters are kept indefinitely for now. Staff
see them, with contact consent, at `/staff/letters`.

## Staff interface

`/staff`, for anyone with a pauseai.uk email address. They type it at
`/staff/login` and are emailed a link, which works once, for 15 minutes; at
most 5 are sent an hour to one address. The link opens a page whose button
logs them in, so a mail scanner that follows it logs nobody in. Its address
is this deploy's own, from Netlify at build time (`SITE_ORIGIN` in
`next.config.ts`), never the request's, so a forged Host header can't send
the token elsewhere. Logins work on previews too. Edit each politician's status for
each campaign (including the test MP's), add signers from outside the
Commons, check held MP syncs, import the signatories from Airtable once, and
see who changed what.

## Things to set up outside the code

- After the first deploy with the database: run the MP sync from
  `/staff/mp-sync`, then the import from `/staff/import`, then check the
  signatories list.

- Postmark: a server, two sending domains (DKIM, Return-Path, DMARC), and
  the webhooks above. `letters.pauseai.uk` is for letters to representatives,
  and is also the inbound domain (MX to `inbound.postmarkapp.com`).
  `notify.pauseai.uk` is for the site's other email, such as forwarded replies.
- After stage 4 is live, turn off the Airtable 8am automation.
